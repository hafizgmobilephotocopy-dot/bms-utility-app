"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
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

export function CompletedTransactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const supabase = createClient()

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transaction_history_view')
        .select('*')
        .in('status', ['Paid', 'Refunded_To_Customer', 'Rolled_Over_To_New_Bill'])
        .eq('is_deleted', false)
        .order('date_collected', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching completed transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.consumer_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.refund_cnic && t.refund_cnic.includes(searchTerm))
    return matchesSearch
  })

  return (
    <Card className="shadow-lg border-muted/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-muted/30 border-b border-muted/50 pb-4">
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          Completed & Finalized Bills
          <Badge variant="outline" className="font-normal bg-background">
            {filteredTransactions.length} records
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          These bills have reached their final lifecycle (Paid, Refunded, or Rolled Over).
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 bg-muted/10 border-b border-muted/50">
          <Input 
            placeholder="Search by name, consumer number, or CNIC..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-white dark:bg-zinc-900"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Consumer No.</TableHead>
                <TableHead className="text-right">Total Cash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading completed transactions...</TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No completed transactions found.</TableCell>
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
                      <Badge variant="outline" className="font-normal">{t.utility_company}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{t.consumer_number}</TableCell>
                    <TableCell className="text-right font-bold text-primary whitespace-nowrap">PKR {Number(t.total_cash_collected).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        t.status === 'Paid' ? 'default' : 
                        t.status === 'Rolled_Over_To_New_Bill' ? 'secondary' : 
                        'destructive'
                      } className="font-normal">
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {t.status === 'Paid' && t.payment_source && `Via ${t.payment_source}`}
                      {t.status === 'Refunded_To_Customer' && t.refund_cnic && `CNIC: ${t.refund_cnic}`}
                      {t.status === 'Rolled_Over_To_New_Bill' && 'Combined'}
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
