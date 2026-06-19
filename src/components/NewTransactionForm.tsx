"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/lib/supabase"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const formSchema = z.object({
  customerName: z.string().min(2, {
    message: "Customer name must be at least 2 characters.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Valid phone number required.",
  }),
  utilityCompany: z.string().min(2, {
    message: "Utility company name is required.",
  }),
  consumerNumber: z.string().min(1, {
    message: "Consumer number is required.",
  }),
  billAmount: z.coerce.number().positive({
    message: "Bill amount must be a positive number.",
  }),
  serviceFee: z.coerce.number().min(0, {
    message: "Service fee cannot be negative.",
  }),
})

export function NewTransactionForm() {
  const [totalCashOwed, setTotalCashOwed] = useState(0)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      utilityCompany: "",
      consumerNumber: "",
      billAmount: 0,
      serviceFee: 0,
    },
  })

  // Watch for changes in bill amount and service fee to calculate total
  const billAmount = form.watch("billAmount")
  const serviceFee = form.watch("serviceFee")

  useEffect(() => {
    const amount = Number(billAmount) || 0
    const fee = Number(serviceFee) || 0
    setTotalCashOwed(amount + fee)
  }, [billAmount, serviceFee])

  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      // 1. Upsert customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .upsert(
          { name: values.customerName, phone_number: values.phoneNumber },
          { onConflict: 'phone_number' }
        )
        .select()
        .single()

      if (customerError) throw customerError

      // 2. Insert transaction
      const { error: transactionError } = await supabase
        .from('customer_transactions')
        .insert({
          customer_id: customerData.id,
          utility_company: values.utilityCompany,
          consumer_number: values.consumerNumber,
          bill_amount: values.billAmount,
          service_fee: values.serviceFee,
          status: 'Pending_Processing'
        })

      if (transactionError) throw transactionError

      alert(`Transaction successfully saved for ${values.customerName}. Cash to collect: $${totalCashOwed.toFixed(2)}`)
      form.reset()
    } catch (error: any) {
      console.error("Error saving transaction:", error)
      alert("Failed to save transaction: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="text-2xl">New Customer Transaction</CardTitle>
        <CardDescription>
          Process a utility bill payment. Enter the exact bill amount and markup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="utilityCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utility Company</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., K-Electric, SSGC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consumerNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consumer / Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exact Bill Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Fee ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between border">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Cash to Collect</p>
                <p className="text-3xl font-bold text-primary">${totalCashOwed.toFixed(2)}</p>
              </div>
              <Button type="submit" size="lg" className="px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Process Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
