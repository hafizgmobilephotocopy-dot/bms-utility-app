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
import { Download } from "lucide-react"
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

// Statuses that are "completed" — shown only in Completed Bills tab
const COMPLETED_STATUSES = ["Paid", "Refunded_To_Customer", "Rolled_Over_To_New_Bill"]

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterUtility, setFilterUtility] = useState("All")

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [updateStatus, setUpdateStatus] = useState("")
  const [updateRefId, setUpdateRefId] = useState("")
  const [updateSource, setUpdateSource] = useState("")
  const [updateCnic, setUpdateCnic] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('transaction_history_view')
        .select('*')
        .eq('is_deleted', false)
        .not('status', 'in', `(${COMPLETED_STATUSES.map(s => `"${s}"`).join(',')})`)
        .order('date_collected', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
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
      fetchTransactions()
    } catch (error) {
      console.error("Error updating transaction:", error)
      alert("Failed to update transaction.")
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm("Are you sure you want to delete this transaction?")
    if (confirmDelete) {
      setDeletingId(id)
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase
          .from('customer_transactions')
          .update({
            is_deleted: true,
            deleted_by: user?.id || null,
            deleted_at: new Date().toISOString()
          })
          .eq('id', id)

        if (error) throw error

        fetchTransactions()
      } catch (error) {
        console.error("Error deleting transaction:", error)
        alert("Failed to delete transaction.")
      } finally {
        setDeletingId(null)
      }
    }
  }

  // Extract unique utility companies for the filter dropdown
  const utilities = ["All", ...Array.from(new Set(transactions.map(t => t.utility_company)))]

  // Filter transactions: by utility company AND by search term
  const filteredTransactions = transactions.filter(t => {
    const matchesUtility = filterUtility === "All" || t.utility_company === filterUtility
    const term = searchTerm.toLowerCase()
    const matchesSearch = !term ||
      (t.customer_name && t.customer_name.toLowerCase().includes(term)) ||
      (t.phone_number && t.phone_number.includes(term)) ||
      (t.consumer_number && t.consumer_number.toLowerCase().includes(term)) ||
      (t.status && t.status.toLowerCase().includes(term))
    return matchesUtility && matchesSearch
  })

  function exportToCSV() {
    if (filteredTransactions.length === 0) {
      alert("No data to export.")
      return
    }

    const headers = [
      "Date (PKT)", "Customer", "Phone", "Utility", "Consumer No.",
      "Due Date", "Total Cash (PKR)", "Manager", "Status",
      "Payment Source", "Payment Ref ID"
    ]

    const rows = filteredTransactions.map(t => [
      `"${formatPKT(t.date_collected, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}"`,
      `"${(t.customer_name || '').replace(/"/g, '""')}"`,
      `"${t.phone_number || ''}"`,
      `"${t.utility_company || ''}"`,
      `"${t.consumer_number || ''}"`,
      `"${t.due_date ? formatPKT(t.due_date, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}"`,
      t.total_cash_collected,
      `"${(t.manager_email || '').replace(/"/g, '""')}"`,
      `"${t.status || ''}"`,
      `"${(t.payment_source || '').replace(/"/g, '""')}"`,
      `"${(t.payment_reference_id || '').replace(/"/g, '""')}"`
    ])

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `transactions_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <Card className="shadow-lg border-muted/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
        <CardHeader className="bg-muted/30 border-b border-muted/50 pb-4">
          <CardTitle className="text-xl font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              Transaction History
              <Badge variant="outline" className="font-normal bg-background">
                {filteredTransactions.length} records
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export as CSV
            </Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Showing active/pending transactions only. Paid, Refunded &amp; Rolled-Over bills are in <strong>Completed Bills</strong>.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row gap-3 bg-muted/10 border-b border-muted/50">
            <div className="flex-1">
              <Input
                placeholder="Search by name, phone, consumer number, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white dark:bg-zinc-900"
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

          <div className="border rounded-md">
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
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading transactions...</TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No active transactions found.</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-xs whitespace-nowrap">
                        {formatPKT(t.date_collected, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="max-w-[120px] overflow-hidden">
                        <div>
                          <p className="font-semibold truncate" title={t.customer_name}>{t.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{t.phone_number}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{t.utility_company}</Badge>
                        {t.is_after_due_date && (
                          <Badge variant="destructive" className="ml-2 font-normal text-[10px] px-1 py-0 h-4">Late</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{t.consumer_number}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {t.due_date
                          ? <span className={new Date(t.due_date) < new Date() ? "text-destructive font-semibold" : "text-muted-foreground"}>
                              {formatPKT(t.due_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => openUpdateDialog(t)}
                          >
                            Update
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                          >
                            {deletingId === t.id ? "..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Transaction Status</DialogTitle>
            <DialogDescription>
              {selectedTx && `Change the status for ${selectedTx.utility_company} bill (Customer: ${selectedTx.customer_name}).`}
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
