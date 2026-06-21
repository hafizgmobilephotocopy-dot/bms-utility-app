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
import { Checkbox } from "@/components/ui/checkbox"
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
  isAfterDueDate: z.boolean().default(false),
  dueDate: z.string().optional(),
})

export function NewTransactionForm({ onSuccess }: { onSuccess?: () => void }) {
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
      isAfterDueDate: false,
      dueDate: "",
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

  const phoneNumber = form.watch("phoneNumber")

  useEffect(() => {
    if (phoneNumber && phoneNumber.length >= 10) {
      const fetchCustomer = async () => {
        const { data } = await supabase
          .from('customers')
          .select('name')
          .eq('phone_number', phoneNumber)
          .single()
        
        if (data && data.name) {
          // Only auto-fill if they haven't manually typed a long name yet, or if it's currently empty
          // Actually, it's safer to just set it so they see the linked profile name.
          form.setValue('customerName', data.name)
        }
      }
      fetchCustomer()
    }
  }, [phoneNumber, form])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

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
          status: 'Pending_Processing',
          recorded_by: user?.id || null,
          is_after_due_date: values.isAfterDueDate,
          due_date: values.dueDate || null
        })

      if (transactionError) throw transactionError

      setMessage({ type: 'success', text: `Transaction successfully saved for ${values.customerName}. Cash to collect: PKR ${totalCashOwed.toFixed(2)}` })
      form.reset()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error("Error saving transaction:", error)
      setMessage({ type: 'error', text: "Failed to save transaction: " + error.message })
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
                    <FormLabel>Exact Bill Amount (PKR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value === 0 ? "" : field.value} onChange={e => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
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
                    <FormLabel>Service Fee (PKR)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value === 0 ? "" : field.value} onChange={e => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isAfterDueDate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Bill Received After Due Date
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check this if the customer brought the bill after its due date.
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between border">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Cash to Collect</p>
                <p className="text-3xl font-bold text-primary">PKR {totalCashOwed.toFixed(2)}</p>
              </div>
              <Button type="submit" size="lg" className="px-8 shadow-md" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Process Payment"}
              </Button>
            </div>
            {message && (
              <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                {message.text}
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
