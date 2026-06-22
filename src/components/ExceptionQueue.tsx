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
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Helper: format a date string in Pakistan Standard Time (PKT, UTC+5)
function formatPKT(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-PK", {
    ...opts,
    timeZone: "Asia/Karachi",
  })
}

export function ExceptionQueue() {
  const [exceptions, setExceptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Refund Dialog State
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [refundCnic, setRefundCnic] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

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

  const openRefundDialog = (tx: any) => {
    setSelectedTx(tx)
    setRefundCnic("")
    setIsRefundDialogOpen(true)
  }

  const handleRefundSubmit = async () => {
    if (!selectedTx) return
    if (!refundCnic.trim() || refundCnic.length < 5) {
      alert("Please enter a valid CNIC for the receiver.")
      return
    }

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('customer_transactions')
        .update({ 
          status: 'Refunded_To_Customer',
          refund_cnic: refundCnic
        })
        .eq('id', selectedTx.id)

      if (error) throw error
      
      setExceptions(exceptions.filter((tx) => tx.id !== selectedTx.id))
      setIsRefundDialogOpen(false)
      alert(`Transaction successfully marked as Refunded.`)
    } catch (error) {
      console.error("Error refunding transaction:", error)
      alert("Failed to refund transaction.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRollOver = async (id: string, amount: number) => {
    const confirmRoll = window.confirm(`Are you sure you want to roll over PKR ${amount.toFixed(2)} to a new bill? This will clear it from the exceptions vault.`)
    if (confirmRoll) {
      setIsProcessing(true)
      try {
        const { error } = await supabase
          .from('customer_transactions')
          .update({ status: 'Rolled_Over_To_New_Bill' })
          .eq('id', id)

        if (error) throw error
        
        setExceptions(exceptions.filter((tx) => tx.id !== id))
        alert(`Transaction successfully rolled over. Please record the new combined bill manually in the Record Transaction tab.`)
      } catch (error) {
        console.error("Error rolling over transaction:", error)
        alert("Failed to roll over transaction.")
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleMoveToDormant = async (id: string) => {
    const confirmMove = window.confirm(`Move this bill to the Dormant Vault? It will be separated from your daily active exceptions.`)
    if (confirmMove) {
      setIsProcessing(true)
      try {
        const { error } = await supabase
          .from('customer_transactions')
          .update({ status: 'Held_Dormant' })
          .eq('id', id)

        if (error) throw error
        
        setExceptions(exceptions.filter((tx) => tx.id !== id))
        alert(`Transaction successfully moved to Dormant Vault.`)
      } catch (error) {
        console.error("Error moving transaction:", error)
        alert("Failed to move transaction to Dormant Vault.")
      } finally {
        setIsProcessing(false)
      }
    }
  }

  return (
    <>
    <div className="w-full max-w-5xl mx-auto mt-8 bg-white dark:bg-zinc-950 p-6 rounded-xl shadow border animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-destructive">Exceptions Queue (Cash Vault)</h2>
          <p className="text-muted-foreground mt-1">
            Bills that failed to process. You hold the physical cash for these and must take action.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-2 flex flex-col items-center justify-center min-w-[120px]">
            <span className="text-xs uppercase tracking-wider font-bold mb-1 opacity-80">Reversed</span>
            <span className="font-bold text-lg leading-none">PKR {exceptions.filter(e => e.status === 'Reversed').reduce((acc, curr) => acc + Number(curr.total_cash_collected || 0), 0).toLocaleString()}</span>
          </div>
          <div className="bg-red-600/10 border border-red-600/20 text-red-600 rounded-lg px-4 py-2 flex flex-col items-center justify-center min-w-[120px]">
            <span className="text-xs uppercase tracking-wider font-bold mb-1 opacity-80">Failed</span>
            <span className="font-bold text-lg leading-none">PKR {exceptions.filter(e => e.status === 'Failed' || e.status === 'Gateway_Failed').reduce((acc, curr) => acc + Number(curr.total_cash_collected || 0), 0).toLocaleString()}</span>
          </div>
        </div>
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
              <TableHead className="text-center sticky right-0 bg-muted/30 z-10 border-l">Action</TableHead>
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
                  <TableCell className="text-center sticky right-0 bg-white dark:bg-zinc-950 z-10 border-l shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                    <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedTx(tx)
                            setIsRefundDialogOpen(true)
                          }}
                          disabled={isProcessing}
                        >
                          Refund Cash
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRollOver(tx.id, tx.total_cash_collected)}
                          disabled={isProcessing}
                        >
                          Roll Over
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:bg-muted"
                          onClick={() => handleMoveToDormant(tx.id)}
                          disabled={isProcessing}
                        >
                          Move to Dormant
                        </Button>
                      </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>

    {/* Refund Dialog */}
    <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Process Cash Refund</DialogTitle>
          <DialogDescription>
            You are about to hand back physical cash to the customer. Please enter their CNIC for security auditing.
          </DialogDescription>
        </DialogHeader>
        
        {selectedTx && (
          <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">Customer: <span className="font-bold text-foreground">{selectedTx.customer_name}</span></p>
              <p className="text-sm font-medium">Phone: <span className="font-mono text-muted-foreground">{selectedTx.phone_number}</span></p>
              <p className="text-sm font-medium">Amount to Refund: <span className="font-bold text-destructive">PKR {Number(selectedTx.total_cash_collected).toFixed(2)}</span></p>
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-bold text-foreground">Receiver's CNIC <span className="text-destructive">*</span></label>
              <Input 
                value={refundCnic}
                onChange={(e) => setRefundCnic(e.target.value)}
                placeholder="e.g. 42101-1234567-1"
                required
              />
              <p className="text-xs text-muted-foreground">Required to log who collected the cash.</p>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsRefundDialogOpen(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRefundSubmit} disabled={isProcessing || !refundCnic}>
            {isProcessing ? "Processing..." : "Confirm & Refund Cash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
