"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { NewTransactionForm } from "@/components/NewTransactionForm"
import { TransactionHistory } from "@/components/TransactionHistory"
import { ExceptionQueue } from "@/components/ExceptionQueue"
import { UpcomingBills } from "@/components/UpcomingBills"
import { DeletedTransactions } from "@/components/DeletedTransactions"
import { CompletedTransactions } from "@/components/CompletedTransactions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { logout } from "./login/actions"

export default function Dashboard() {
  const [view, setView] = useState<"expenses" | "transactions" | "history" | "exceptions" | "upcoming" | "deleted" | "completed">("transactions")
  const [kpis, setKpis] = useState({
    totalCashToday: 0,
    serviceFeeToday: 0,
    exceptionsVault: 0
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const [kpiStartDate, setKpiStartDate] = useState(todayStr)
  const [kpiEndDate, setKpiEndDate] = useState(todayStr)

  useEffect(() => {
    fetchKPIs()
  }, [kpiStartDate, kpiEndDate])

  async function fetchKPIs() {
    try {
      // Get selected start and end timestamps in local time
      // Parse YYYY-MM-DD manually to avoid timezone shift quirks
      const [sYear, sMonth, sDay] = kpiStartDate.split('-')
      const startOfDay = new Date(Number(sYear), Number(sMonth) - 1, Number(sDay), 0, 0, 0, 0)
      
      const [eYear, eMonth, eDay] = kpiEndDate.split('-')
      const endOfDay = new Date(Number(eYear), Number(eMonth) - 1, Number(eDay), 23, 59, 59, 999)

      const startIso = startOfDay.toISOString()
      const endIso = endOfDay.toISOString()

      // 1. Fetch Service Fee Revenue for selected dates
      const { data: revTxs, error: errorRev } = await supabase
        .from('customer_transactions')
        .select('service_fee, status')
        .gte('date_collected', startIso)
        .lte('date_collected', endIso)
        .eq('is_deleted', false)

      if (errorRev) throw errorRev

      let totalFee = 0
      if (revTxs) {
        revTxs.forEach(tx => {
          if (tx.status !== 'Refunded_To_Customer' && tx.status !== 'Rolled_Over_To_New_Bill') {
            totalFee += Number(tx.service_fee || 0)
          }
        })
      }

      // 2. Fetch Pending Bill Cash (Global, not date filtered)
      const { data: pendingTxs, error: errorPending } = await supabase
        .from('customer_transactions')
        .select('total_cash_collected')
        .eq('status', 'Pending_Processing')
        .eq('is_deleted', false)

      if (errorPending) throw errorPending

      let totalCash = 0
      if (pendingTxs) {
        pendingTxs.forEach(tx => {
          totalCash += Number(tx.total_cash_collected || 0)
        })
      }

      // Fetch exceptions vault (sum of total_cash_collected for Failed/Reversed/Gateway_Failed)
      const { data: exceptionTxs, error: errorExceptions } = await supabase
        .from('customer_transactions')
        .select('total_cash_collected')
        .in('status', ['Gateway_Failed', 'Failed', 'Reversed'])
        .eq('is_deleted', false)

      if (errorExceptions) throw errorExceptions

      let totalExceptions = 0
      if (exceptionTxs) {
        exceptionTxs.forEach(tx => {
          totalExceptions += Number(tx.total_cash_collected || 0)
        })
      }

      setKpis({
        totalCashToday: totalCash,
        serviceFeeToday: totalFee,
        exceptionsVault: totalExceptions
      })
    } catch (error) {
      console.error("Error fetching KPIs:", error)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-sm border gap-4">
          <h1 className="text-2xl font-black text-primary tracking-tight md:mb-0">
            Franchise & Utility Bill Management
          </h1>
          
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex gap-2 flex-wrap bg-muted p-1 rounded-lg">
              <Button
                variant={view === "expenses" ? "default" : "ghost"}
                onClick={() => setView("expenses")}
                className="font-medium"
              >
                Shop Expenses
              </Button>
              <Button
                variant={view === "transactions" ? "default" : "ghost"}
                onClick={() => setView("transactions")}
                className="font-medium"
              >
                Record Transaction
              </Button>
              <Button
                variant={view === "upcoming" ? "default" : "ghost"}
                onClick={() => setView("upcoming")}
                className="font-medium"
              >
                Upcoming Bills
              </Button>
              <Button
                variant={view === "exceptions" ? "default" : "ghost"}
                onClick={() => setView("exceptions")}
                className="font-medium"
              >
                Exceptions Queue
              </Button>
              <Button
                variant={view === "history" ? "default" : "ghost"}
                onClick={() => setView("history")}
                className="font-medium"
              >
                Transaction History
              </Button>
              <Button
                variant={view === "completed" ? "default" : "ghost"}
                onClick={() => setView("completed")}
                className="font-medium text-green-700 hover:text-green-800 dark:text-green-400"
              >
                Completed Bills
              </Button>
              <Button
                variant={view === "deleted" ? "default" : "ghost"}
                onClick={() => setView("deleted")}
                className="font-medium text-destructive hover:text-destructive"
              >
                Deleted Bills
              </Button>
            </div>
            <form action={logout}>
              <Button variant="outline" type="submit" className="font-medium border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                Sign Out
              </Button>
            </form>
          </div>
        </header>

        {/* Dashboard KPIs shown on multiple relevant tabs */}
        {(view === "transactions" || view === "upcoming" || view === "exceptions") && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-zinc-950 p-4 rounded-xl border shadow-sm">
              <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Filter Revenue By Date:</span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input 
                  type="date" 
                  value={kpiStartDate} 
                  onChange={(e) => setKpiStartDate(e.target.value)}
                  className="max-w-[150px]"
                />
                <span className="text-muted-foreground">to</span>
                <Input 
                  type="date" 
                  value={kpiEndDate} 
                  onChange={(e) => setKpiEndDate(e.target.value)}
                  className="max-w-[150px]"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Pending Bill Cash</p>
                <p className="text-3xl font-bold mt-2">PKR {kpis.totalCashToday.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="bg-primary/10 border-primary/20 p-6 rounded-xl border shadow-sm">
                <p className="text-sm text-primary font-medium uppercase tracking-wider">Service Fee Revenue</p>
                <p className="text-3xl font-bold mt-2 text-primary">PKR {kpis.serviceFeeToday.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="bg-destructive/10 border-destructive/20 p-6 rounded-xl border shadow-sm flex justify-between items-center">
                <div>
                  <p className="text-sm text-destructive font-medium uppercase tracking-wider">Exceptions Vault</p>
                  <p className="text-3xl font-bold mt-2 text-destructive">PKR {kpis.exceptionsVault.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setView("exceptions")}>
                  View
                </Button>
              </div>
            </div>
          </div>
        )}

        {view === "transactions" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <NewTransactionForm onSuccess={fetchKPIs} />
          </div>
        )}

        {view === "upcoming" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <UpcomingBills />
          </div>
        )}

        {view === "exceptions" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ExceptionQueue />
          </div>
        )}

        {view === "expenses" && (
          <div className="bg-white dark:bg-zinc-950 p-12 rounded-xl border shadow-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">Shop Expenses Dashboard</h2>
            <p className="text-muted-foreground">This section will handle tracking rent, electricity, and other overheads.</p>
            <p className="text-sm mt-4 text-primary">In Development for Phase 2</p>
          </div>
        )}

        {view === "history" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TransactionHistory />
          </div>
        )}

        {view === "completed" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CompletedTransactions />
          </div>
        )}

        {view === "deleted" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DeletedTransactions />
          </div>
        )}
      </div>
    </main>
  )
}
