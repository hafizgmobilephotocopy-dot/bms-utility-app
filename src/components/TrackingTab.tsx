"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
export function TrackingTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // We only search when user types at least 3 characters
  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchTransactions()
    } else {
      setTransactions([])
      setSearched(false)
    }
  }, [searchTerm])

  async function searchTransactions() {
    setLoading(true)
    setSearched(true)
    try {
      // Query the view which has customer_name, manager_email etc.
      // Search by consumer number OR customer name
      const { data, error } = await supabase
        .from('transaction_history_view')
        .select('*')
        .or(`consumer_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%`)
        .order('date_collected', { ascending: false })
        .limit(50)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error searching transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="shadow-lg border-muted/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
        <CardHeader className="bg-muted/30 border-b border-muted/50 pb-4">
          <CardTitle className="text-xl font-bold flex items-center justify-between">
            Tracking Center
            {searched && (
              <Badge variant="outline" className="font-normal bg-background">
                {transactions.length} records found
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Search across the entire database by consumer number or customer name. Includes completed and deleted records.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 bg-muted/10 border-b border-muted/50">
            <div className="max-w-2xl mx-auto">
              <Input 
                placeholder="Enter at least 3 characters of consumer number or name to search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-zinc-900 text-lg py-6"
                autoFocus
              />
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
                  <TableHead className="text-right">Total Cash</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Searching database...</TableCell>
                  </TableRow>
                ) : !searched ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Type above to begin tracking a bill.</TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No matches found for "{searchTerm}".</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id} className={`hover:bg-muted/30 transition-colors ${t.is_deleted ? 'opacity-60' : ''}`}>
                      <TableCell className="font-medium text-xs whitespace-nowrap">
                        {new Date(t.date_collected).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="max-w-[120px] overflow-hidden">
                        <div>
                          <p className="font-semibold truncate" title={t.customer_name}>{t.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{t.phone_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{t.utility_company}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{t.consumer_number}</TableCell>
                      <TableCell className="text-right font-bold text-primary whitespace-nowrap">PKR {Number(t.total_cash_collected).toFixed(0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[100px] overflow-hidden" title={t.manager_email}>{t.manager_email?.split('@')[0] || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          t.status === 'Paid' ? 'default' : 
                          t.status === 'Failed' || t.status === 'Reversed' ? 'destructive' : 
                          'outline'
                        } className="font-normal">
                          {t.status.replace(/_/g, ' ')}
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
    </>
  )
}
