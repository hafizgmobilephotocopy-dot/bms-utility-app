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

export function UpcomingBills() {
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState("")

  useEffect(() => {
    fetchUpcomingBills()
  }, [])

  async function fetchUpcomingBills() {
    setLoading(true)
    try {
      // Fetch bills that are Pending_Processing and have a due date
      const { data, error } = await supabase
        .from('transaction_history_view')
        .select('*')
        .eq('status', 'Pending_Processing')
        .eq('is_deleted', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })

      if (error) throw error
      setBills(data || [])
    } catch (error) {
      console.error("Error fetching upcoming bills:", error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate days until due
  const getDaysUntilDue = (dueDateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(dueDateStr)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Filter bills
  const filteredBills = bills.filter(t => {
    if (!filterDate) return true
    // Compare YYYY-MM-DD
    const txDate = new Date(t.due_date).toISOString().split('T')[0]
    return txDate === filterDate
  })

  // Split into Overdue and Upcoming
  const overdueBills = filteredBills.filter(t => getDaysUntilDue(t.due_date) < 0)
  const upcomingBills = filteredBills.filter(t => getDaysUntilDue(t.due_date) >= 0)

  const renderRow = (t: any) => {
    const daysLeft = getDaysUntilDue(t.due_date)
    return (
      <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
        <TableCell className="font-medium whitespace-nowrap">
          {new Date(t.due_date).toLocaleDateString()}
        </TableCell>
        <TableCell>
          {daysLeft < 0 ? (
            <Badge variant="destructive" className="font-normal">Overdue</Badge>
          ) : daysLeft === 0 ? (
            <Badge variant="destructive" className="font-normal">Due Today</Badge>
          ) : daysLeft <= 2 ? (
            <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50 dark:bg-orange-950">In {daysLeft} days</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">In {daysLeft} days</span>
          )}
        </TableCell>
        <TableCell>
          <p className="font-semibold">{t.customer_name}</p>
          <p className="text-xs text-muted-foreground">{t.phone_number}</p>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="font-normal">{t.utility_company}</Badge>
        </TableCell>
        <TableCell className="font-mono text-sm">{t.consumer_number}</TableCell>
        <TableCell className="text-right font-bold whitespace-nowrap text-primary">PKR {Number(t.bill_amount).toFixed(2)}</TableCell>
      </TableRow>
    )
  }

  return (
    <Card className="shadow-lg border-muted/50 rounded-2xl overflow-hidden animate-in fade-in duration-500">
      <CardHeader className="bg-muted/30 border-b border-muted/50 pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Upcoming Bills to Pay</CardTitle>
          <Badge variant="outline" className="font-normal bg-background">
            {bills.length} pending
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
          <p className="text-sm text-muted-foreground">
            Bills that customers have paid cash for, but still need to be processed to the utility company.
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by Due Date:</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="flex h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {filterDate && (
              <button onClick={() => setFilterDate("")} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Due Date</TableHead>
                <TableHead>Time Left</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Utility</TableHead>
                <TableHead>Consumer No.</TableHead>
                <TableHead className="text-right">Bill Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading upcoming bills...</TableCell>
                </TableRow>
              ) : overdueBills.length === 0 && upcomingBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No upcoming bills to process.</TableCell>
                </TableRow>
              ) : (
                <>
                  {overdueBills.length > 0 && (
                    <>
                      <TableRow className="bg-destructive/10 hover:bg-destructive/10">
                        <TableCell colSpan={6} className="font-bold text-destructive py-2 text-center uppercase tracking-wider text-xs">
                          Overdue & Urgent ({overdueBills.length})
                        </TableCell>
                      </TableRow>
                      {overdueBills.map(renderRow)}
                    </>
                  )}
                  {upcomingBills.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={6} className="font-bold py-2 text-center uppercase tracking-wider text-xs text-muted-foreground">
                          Upcoming / Remaining ({upcomingBills.length})
                        </TableCell>
                      </TableRow>
                      {upcomingBills.map(renderRow)}
                    </>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
