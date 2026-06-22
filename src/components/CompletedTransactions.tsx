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

// Helper: format a date string in Pakistan Standard Time (PKT, UTC+5)
function formatPKT(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-PK", {
    ...opts,
    timeZone: "Asia/Karachi",
  })
}

type TabType = "Paid" | "Rolled_Over_To_New_Bill" | "Refunded_To_Customer"

const TABS: { key: TabType; label: string; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }[] = [
  { key: "Paid", label: "Paid Bills", color: "text-green-700 dark:text-green-400", badgeVariant: "default" },
  { key: "Rolled_Over_To_New_Bill", label: "Rolled Over", color: "text-blue-700 dark:text-blue-400", badgeVariant: "secondary" },
  { key: "Refunded_To_Customer", label: "Refunded", color: "text-orange-700 dark:text-orange-400", badgeVariant: "outline" },
]

export function CompletedTransactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<TabType>("Paid")

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
        .order('updated_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error("Error fetching completed transactions:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter by tab status, then by search
  const tabTransactions = transactions.filter(t => t.status === activeTab)

  const filteredTransactions = tabTransactions
    .filter(t => {
      const term = searchTerm.toLowerCase()
      if (!term) return true
      return (
        (t.consumer_number && t.consumer_number.toLowerCase().includes(term)) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(term)) ||
        (t.phone_number && t.phone_number.includes(term)) ||
        (t.refund_cnic && t.refund_cnic.includes(term))
      )
    })
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const countFor = (key: TabType) => transactions.filter(t => t.status === key).length

  return (
    <Card className="shadow-lg border-muted/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-muted/30 border-b border-muted/50 pb-4">
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          Completed &amp; Finalized Bills
          <Badge variant="outline" className="font-normal bg-background">
            {transactions.length} total
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Bills that have reached their final lifecycle — Paid, Refunded, or Rolled Over.
        </p>
      </CardHeader>

      {/* Tabs */}
      <div className="flex border-b bg-muted/20">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearchTerm("") }}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-2
              ${activeTab === tab.key
                ? `border-primary ${tab.color} bg-background`
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
              ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      <CardContent className="p-0">
        <div className="p-4 bg-muted/10 border-b border-muted/50">
          <Input
            placeholder="Search by name, consumer number, phone, or CNIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-white dark:bg-zinc-900"
          />
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Completed At (PKT)</TableHead>
                <TableHead>Collected On</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Consumer No.</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total Cash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading completed transactions...</TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No {TABS.find(t => t.key === activeTab)?.label.toLowerCase()} transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium whitespace-nowrap text-xs">
                      <span className="font-semibold text-foreground">
                        {formatPKT(t.updated_at, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatPKT(t.date_collected, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
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
                    <TableCell className="font-mono text-xs">{t.consumer_number}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {t.due_date
                        ? formatPKT(t.due_date, { year: 'numeric', month: 'short', day: 'numeric' })
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                      PKR {Number(t.total_cash_collected).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        t.status === 'Paid' ? 'default' :
                        t.status === 'Rolled_Over_To_New_Bill' ? 'secondary' :
                        'outline'
                      } className="font-normal">
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {t.status === 'Paid' && t.payment_source && `Via ${t.payment_source}`}
                      {t.status === 'Paid' && t.payment_reference_id && ` — Ref: ${t.payment_reference_id}`}
                      {t.status === 'Refunded_To_Customer' && t.refund_cnic && `CNIC: ${t.refund_cnic}`}
                      {t.status === 'Rolled_Over_To_New_Bill' && 'Combined into new bill'}
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
