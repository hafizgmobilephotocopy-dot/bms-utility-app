"use client"

import { useState } from "react"
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

// Mock data representing the customer_transactions where status is Gateway_Failed or Reversed
const MOCK_EXCEPTIONS = [
  {
    id: "tx-1001",
    customer_name: "Ali Khan",
    utility_company: "K-Electric",
    consumer_number: "KE-992123",
    bill_amount: 5400.0,
    service_fee: 100.0,
    total_cash_collected: 5500.0,
    status: "Gateway_Failed",
    date_collected: "2023-10-24T10:30:00Z",
  },
  {
    id: "tx-1002",
    customer_name: "Sara Ahmed",
    utility_company: "SSGC",
    consumer_number: "SSGC-11029",
    bill_amount: 1250.5,
    service_fee: 50.0,
    total_cash_collected: 1300.5,
    status: "Reversed",
    date_collected: "2023-10-24T11:15:00Z",
  },
]

export function ExceptionQueue() {
  const [exceptions, setExceptions] = useState(MOCK_EXCEPTIONS)

  const handleRetry = (id: string) => {
    alert(`Retrying payment for transaction ${id}...`)
    // API Call to retry payment
  }

  const handleRefund = (id: string, refundAmount: number) => {
    const confirmRefund = window.confirm(`Confirm refund of PKR ${refundAmount.toFixed(2)} to customer?`)
    if (confirmRefund) {
      alert(`Transaction ${id} marked as Refunded_To_Customer.`)
      setExceptions(exceptions.filter((tx) => tx.id !== id))
      // API call to update status to Refunded_To_Customer
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 bg-white dark:bg-zinc-950 p-6 rounded-xl shadow border">
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
            {exceptions.length === 0 ? (
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
                      {tx.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    PKR {tx.bill_amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-primary">
                    PKR {tx.total_cash_collected.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleRetry(tx.id)}>
                      Retry
                    </Button>
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
