"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function ExceptionQueue() {
  const [exceptions, setExceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExceptions()
  }, [])

  async function fetchExceptions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transaction_history_view')
        .select('*')
        .in('status', ['Gateway_Failed', 'Failed', 'Reversed'])
        .eq('is_deleted', false)
        .order('date_collected', { ascending: false })

      if (error) throw error
      setExceptions(data || [])
    } catch (error) {
      console.error("Error fetching exceptions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (id: string, refundAmount: number) => {
    const confirmRefund = window.confirm(`Confirm refund of PKR ${refundAmount.toFixed(2)} to customer?`)
    if (confirmRefund) {
      try {
        const { error } = await supabase
          .from('customer_transactions')
          .update({ status: 'Refunded_To_Customer' })
          .eq('id', id)

        if (error) throw error
        
        // Remove from local state
        setExceptions(exceptions.filter((tx) => tx.id !== id))
        alert(`Transaction successfully marked as Refunded.`)
      } catch (error) {
        console.error("Error refunding transaction:", error)
        alert("Failed to refund transaction.")
      }
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 bg-white dark:bg-zinc-950 p-6 rounded-xl shadow border animate-in fade-in duration-500">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive">Exceptions Queue (Cash Vault)</h2>
          <p className="text-muted-foreground mt-1">
            Bills that failed to process. You hold the physical cash for these and must take action.
          </p>
        </div>
        <Badge variant="destructive" className="text-sm px-3 py-1">
          {exceptions.length} Action Required
        </Badge>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableCaption>Failed or reversed transactions requiring immediate attention.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Utility</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Bill Amount</TableHead>
              <TableHead className="text-right font-bold">Total Cash to Refund</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Loading exceptions...
                </TableCell>
              </TableRow>
            ) : exceptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No exceptions currently in the queue.
                </TableCell>
              </TableRow>
            ) : (
              exceptions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {tx.customer_name}
                    <div className="text-xs text-muted-foreground">{tx.consumer_number}</div>
                  </TableCell>
                  <TableCell>{tx.utility_company}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">
                      {tx.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    PKR {Number(tx.bill_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-primary">
                    PKR {Number(tx.total_cash_collected).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRefund(tx.id, tx.total_cash_collected)}
                    >
                      Refund Customer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
