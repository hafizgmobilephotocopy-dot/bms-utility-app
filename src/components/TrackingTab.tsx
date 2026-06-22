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

export function TrackingTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Update dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [updateStatus, setUpdateStatus] = useState("")
  const [updateRefId, setUpdateRefId] = useState("")
  const [updateSource, setUpdateSource] = useState("")
  const [updateCnic, setUpdateCnic] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Only search when user types at least 3 characters
  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchTransactions()
    } else {
      setTransactions([])
      setSearched(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  async function searchTransactions() {
    setLoading(true)
    setSearched(true)
    try {
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

  function openUpdateDialog(tx: any) {
    setSelectedTx(tx)
    setUpdateStatus(tx.status)
    setUpdateRefId(tx.payment_reference_id || "")
    setUpdateSource(tx.payment_source || "")
    setUpdateCnic(tx.refund_cnic || "")
    setIsDialogOpen(true)
  }

  async function handleUpdateTransaction() {
    if (!selectedTx) return
    setIsUpdating(true)

    try {
      const updates: any = { status: updateStatus }

      if (updateStatus === "Paid") {
        updates.payment_reference_id = updateRefId
        updates.payment_source = updateSource
      } else if (updateStatus === "Refunded_To_Customer") {
        updates.refund_cnic = updateCnic
      }

      const { error } = await supabase
        .from('customer_transactions')
        .update(updates)
        .eq('id', selectedTx.id)

      if (error) throw error

      setIsDialogOpen(false)
      // Re-run search to reflect changes
      searchTransactions()
    } catch (error) {
      console.error("Error updating transaction:", error)
      alert("Failed to update transaction.")
    } finally {
      setIsUpdating(false)
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
            Search across the entire database by consumer number, customer name, or phone. Includes completed and deleted records.
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
                  <TableHead>Date (PKT)</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Utility</TableHead>
                  <TableHead>Consumer No.</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total Cash</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Searching database...</TableCell>
                  </TableRow>
                ) : !searched ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Type above to begin tracking a bill.</TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No matches found for &quot;{searchTerm}&quot;.</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id} className={`hover:bg-muted/30 transition-colors ${t.is_deleted ? 'opacity-50' : ''}`}>
                      <TableCell className="font-medium text-xs whitespace-nowrap">
                        {formatPKT(t.date_collected, { month: 'short', day: 'numeric', year: 'numeric' })}
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
                      <TableCell className="text-xs whitespace-nowrap">
                        {t.due_date
                          ? <span className={new Date(t.due_date) < new Date() && t.status === 'Pending_Processing' ? "text-destructive font-semibold" : "text-muted-foreground"}>
                              {formatPKT(t.due_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary whitespace-nowrap">PKR {Number(t.total_cash_collected).toFixed(0)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[100px] overflow-hidden" title={t.manager_email}>{t.manager_email?.split('@')[0] || 'Unknown'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={
                            t.status === 'Paid' ? 'default' :
                            t.status === 'Failed' || t.status === 'Reversed' ? 'destructive' :
                            'outline'
                          } className="font-normal whitespace-nowrap">
                            {t.status.replace(/_/g, ' ')}
                          </Badge>
                          {t.is_deleted && (
                            <Badge variant="destructive" className="font-normal text-[10px] px-1 h-4">Deleted</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!t.is_deleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => openUpdateDialog(t)}
                          >
                            Update
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Transaction Status</DialogTitle>
            <DialogDescription>
              {selectedTx && `Change the status for ${selectedTx.utility_company} bill — Customer: ${selectedTx.customer_name}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Pending_Processing">Pending Processing</option>
                <option value="Processed_Successfully">Processed Successfully</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Reversed">Reversed</option>
                <option value="Refunded_To_Customer">Refunded To Customer</option>
                <option value="Rolled_Over_To_New_Bill">Rolled Over To New Bill</option>
              </select>
            </div>

            {updateStatus === "Paid" && (
              <div className="space-y-4 border p-4 rounded-lg bg-muted/30">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Payment Source (e.g. Bank Name, App, etc.)</label>
                  <Input
                    value={updateSource}
                    onChange={(e) => setUpdateSource(e.target.value)}
                    placeholder="e.g. Allied Bank, Easypaisa, Cash..."
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Payment Reference ID / TID</label>
                  <Input
                    value={updateRefId}
                    onChange={(e) => setUpdateRefId(e.target.value)}
                    placeholder="e.g. 02934812300"
                  />
                </div>
              </div>
            )}

            {updateStatus === "Refunded_To_Customer" && (
              <div className="space-y-4 border p-4 rounded-lg bg-destructive/10 border-destructive/20">
                <div className="grid gap-2">
                  <label className="text-sm font-bold text-destructive">Receiver's CNIC <span className="text-destructive">*</span></label>
                  <Input
                    value={updateCnic}
                    onChange={(e) => setUpdateCnic(e.target.value)}
                    placeholder="e.g. 42101-1234567-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Required to securely log who collected the cash refund.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTransaction}
              disabled={
                isUpdating ||
                (updateStatus === 'Paid' && (!updateSource || !updateRefId)) ||
                (updateStatus === 'Refunded_To_Customer' && (!updateCnic || updateCnic.length < 5))
              }
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
