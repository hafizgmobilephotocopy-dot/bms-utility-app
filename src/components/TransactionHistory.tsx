"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterUtility, setFilterUtility] = useState("All")

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transaction_history_view')
        .select('*')
        .order('date_collected', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique utility companies for the filter dropdown
  const utilities = ["All", ...Array.from(new Set(transactions.map(t => t.utility_company)))]

  // Filter the transactions based on search term and utility filter
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.consumer_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesUtility = filterUtility === "All" || t.utility_company === filterUtility

    return matchesSearch && matchesUtility
  })

  return (
    <Card className="shadow-lg border-muted/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-muted/30 border-b border-muted/50 pb-4">
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          Transaction History
          <Badge variant="outline" className="font-normal bg-background">
            {filteredTransactions.length} records
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 flex flex-col sm:flex-row gap-4 bg-muted/10 border-b border-muted/50">
          <div className="flex-1">
            <Input 
              placeholder="Search by customer name or consumer number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-white dark:bg-zinc-900"
            />
          </div>
          <div>
            <select 
              value={filterUtility}
              onChange={(e) => setFilterUtility(e.target.value)}
              className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {utilities.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Consumer No.</TableHead>
                <TableHead className="text-right">Bill Amount</TableHead>
                <TableHead className="text-right">Total Cash</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading transactions...</TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions found.</TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(t.date_collected).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{t.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{t.phone_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{t.utility_company}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{t.consumer_number}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">PKR {Number(t.bill_amount).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-primary whitespace-nowrap">PKR {Number(t.total_cash_collected).toFixed(2)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.manager_email || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'Pending_Processing' ? 'outline' : 'default'} className="font-normal">
                        {t.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
