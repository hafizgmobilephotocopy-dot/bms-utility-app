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

function formatPKT(dateStr: string, opts: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-PK", {
    ...opts,
    timeZone: "Asia/Karachi",
  })
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Paid: "default",
  Processed_Successfully: "default",
  Pending_Processing: "outline",
  Failed: "destructive",
  Reversed: "destructive",
  Gateway_Failed: "destructive",
  Rolled_Over_To_New_Bill: "secondary",
  Refunded_To_Customer: "secondary",
  Held_Dormant: "outline",
}

interface DuplicateGroup {
  consumer_number: string
  utility_company: string
  bills: any[]
}

export function DuplicateBills() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUtility, setFilterUtility] = useState("All")

  useEffect(() => {
    fetchDuplicates()
  }, [])

  async function fetchDuplicates() {
    setLoading(true)
    try {
      // Fetch all non-deleted bills
      const { data, error } = await supabase
        .from("transaction_history_view")
        .select("*")
        .eq("is_deleted", false)
        .order("date_collected", { ascending: true })

      if (error) throw error

      // Group by consumer_number + utility_company
      const map: Record<string, any[]> = {}
      for (const tx of data || []) {
        const key = `${tx.utility_company}__${tx.consumer_number}`
        if (!map[key]) map[key] = []
        map[key].push(tx)
      }

      // Keep only groups with 2+ bills
      const duplicateGroups: DuplicateGroup[] = Object.entries(map)
        .filter(([, bills]) => bills.length >= 2)
        .map(([key, bills]) => {
          const [utility_company, consumer_number] = key.split("__")
          return {
            consumer_number,
            utility_company,
            // Sort newest first within each group
            bills: bills.sort(
              (a, b) =>
                new Date(b.date_collected).getTime() -
                new Date(a.date_collected).getTime()
            ),
          }
        })
        // Sort groups: most recently active first
        .sort(
          (a, b) =>
            new Date(b.bills[0].date_collected).getTime() -
            new Date(a.bills[0].date_collected).getTime()
        )

      setGroups(duplicateGroups)
    } catch (err) {
      console.error("Error fetching duplicate bills:", err)
    } finally {
      setLoading(false)
    }
  }

  const utilities = [
    "All",
    ...Array.from(new Set(groups.map((g) => g.utility_company))),
  ]

  const filteredGroups =
    filterUtility === "All"
      ? groups
      : groups.filter((g) => g.utility_company === filterUtility)

  const totalDuplicateBills = filteredGroups.reduce(
    (sum, g) => sum + g.bills.length,
    0
  )

  return (
    <Card className="shadow-lg border-muted/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 pb-4">
        <CardTitle className="text-xl font-bold flex items-center justify-between text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            Duplicate Bills
            <Badge
              variant="outline"
              className="font-normal bg-white dark:bg-zinc-900 text-amber-700 border-amber-300"
            >
              {filteredGroups.length} consumer{filteredGroups.length !== 1 ? "s" : ""} · {totalDuplicateBills} bills
            </Badge>
          </div>
          <select
            value={filterUtility}
            onChange={(e) => setFilterUtility(e.target.value)}
            className="text-sm font-normal text-foreground flex h-9 w-48 rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {utilities.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </CardTitle>
        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
          Consumer numbers with 2 or more recorded bills. Failed bills are automatically rolled over when a new bill for the same consumer is paid.
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            Loading duplicate bills...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-lg font-medium">No duplicate bills found.</p>
            <p className="text-sm mt-1">All consumer numbers have a single bill recorded.</p>
          </div>
        ) : (
          <div className="divide-y divide-muted/50">
            {filteredGroups.map((group) => (
              <div key={`${group.utility_company}__${group.consumer_number}`} className="p-4">
                {/* Group Header */}
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="secondary" className="font-semibold text-sm px-3 py-1">
                    {group.utility_company}
                  </Badge>
                  <span className="font-mono font-bold text-sm text-foreground">
                    Consumer: {group.consumer_number}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40"
                  >
                    {group.bills.length} bills
                  </Badge>
                  {/* Show warning if any are still Failed/Reversed */}
                  {group.bills.some((b) =>
                    ["Failed", "Reversed", "Gateway_Failed"].includes(b.status)
                  ) && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      Action Required
                    </Badge>
                  )}
                </div>

                {/* Bills Table for this group */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-xs">Date Collected (PKT)</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Due Date</TableHead>
                        <TableHead className="text-xs text-right">Bill Amount</TableHead>
                        <TableHead className="text-xs text-right">Total Cash</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Manager</TableHead>
                        <TableHead className="text-xs">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.bills.map((bill, idx) => (
                        <TableRow
                          key={bill.id}
                          className={`transition-colors ${
                            idx === 0
                              ? "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              : "hover:bg-muted/20"
                          }`}
                        >
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {idx === 0 && (
                                <span className="text-[10px] bg-blue-500 text-white rounded px-1 py-0.5 font-bold">
                                  LATEST
                                </span>
                              )}
                              {formatPKT(bill.date_collected, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-sm">{bill.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{bill.phone_number}</p>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                            {bill.due_date
                              ? formatPKT(bill.due_date, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                            PKR {Number(bill.bill_amount).toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary whitespace-nowrap">
                            PKR {Number(bill.total_cash_collected).toFixed(0)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={STATUS_VARIANT[bill.status] ?? "outline"}
                              className="font-normal text-xs whitespace-nowrap"
                            >
                              {bill.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {bill.manager_email?.split("@")[0] || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                            {bill.status === "Paid" &&
                              bill.payment_source &&
                              `Via ${bill.payment_source}`}
                            {bill.status === "Paid" &&
                              bill.payment_reference_id &&
                              ` · Ref: ${bill.payment_reference_id}`}
                            {bill.status === "Refunded_To_Customer" &&
                              bill.refund_cnic &&
                              `CNIC: ${bill.refund_cnic}`}
                            {bill.status === "Rolled_Over_To_New_Bill" &&
                              "Auto-rolled over"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
