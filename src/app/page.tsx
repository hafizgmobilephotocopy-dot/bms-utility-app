"use client"

import { useState } from "react"
import { NewTransactionForm } from "@/components/NewTransactionForm"
import { ExceptionQueue } from "@/components/ExceptionQueue"
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const [view, setView] = useState<"expenses" | "transactions">("transactions")

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-zinc-950 p-4 rounded-xl shadow-sm border">
          <h1 className="text-2xl font-black text-primary tracking-tight mb-4 md:mb-0">
            Franchise & Utility Bill Management
          </h1>
          
          <div className="flex gap-2 bg-muted p-1 rounded-lg">
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
              Customer Transactions
            </Button>
          </div>
        </header>

        {view === "transactions" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border shadow-sm">
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Today's Total Cash</p>
                <p className="text-3xl font-bold mt-2">$24,500.00</p>
              </div>
              <div className="bg-primary/10 border-primary/20 p-6 rounded-xl border shadow-sm">
                <p className="text-sm text-primary font-medium uppercase tracking-wider">Today's Service Fee Revenue</p>
                <p className="text-3xl font-bold mt-2 text-primary">$450.00</p>
              </div>
              <div className="bg-destructive/10 border-destructive/20 p-6 rounded-xl border shadow-sm">
                <p className="text-sm text-destructive font-medium uppercase tracking-wider">Exceptions Vault</p>
                <p className="text-3xl font-bold mt-2 text-destructive">$6,800.50</p>
              </div>
            </div>

            <NewTransactionForm />
            
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
      </div>
    </main>
  )
}
