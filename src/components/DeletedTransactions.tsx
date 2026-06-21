"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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

export function DeletedTransactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeletedTransactions()
  }, [])

  async function fetchDeletedTransactions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transaction_history_view')
        .select('*')
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching deleted transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-lg border-destructive/20 rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-destructive/10 border-b border-destructive/20 pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-destructive">Deleted Bills Archive</CardTitle>
          <Badge variant="destructive" className="font-normal">
            {transactions.length} records
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          These transactions have been removed from all calculations, queues, and history. They are kept here for audit purposes.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Deleted On</TableHead>
                <TableHead>Deleted By</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Consumer No.</TableHead>
                <TableHead className="text-right">Bill Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading deleted records...</TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No deleted transactions found.</TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors opacity-70">
                    <TableCell className="font-medium whitespace-nowrap text-destructive">
                      {new Date(t.deleted_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.deleted_by_email || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold">{t.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{t.phone_number}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">{t.utility_company}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{t.consumer_number}</TableCell>
                    <TableCell className="text-right font-bold whitespace-nowrap">PKR {Number(t.bill_amount).toFixed(2)}</TableCell>
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
