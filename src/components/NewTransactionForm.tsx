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
  phoneNumber: z.string().optional(),
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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

  const billAmount = form.watch("billAmount")
  const serviceFee = form.watch("serviceFee")

  useEffect(() => {
    const amount = Number(billAmount) || 0
    const fee = Number(serviceFee) || 0
    setTotalCashOwed(amount + fee)
  }, [billAmount, serviceFee])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setMessage(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Always INSERT a new customer record — customer_id (UUID) is the true unique key.
      // Phone number is just an optional contact note; same phone can belong to many people.
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({ name: values.customerName, phone_number: values.phoneNumber || null })
        .select()
        .single()

      if (customerError) throw customerError

      // Insert the transaction linked to the new customer_id
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

      setMessage({ type: 'success', text: `Transaction saved for ${values.customerName}. Total cash to collect: PKR ${totalCashOwed.toFixed(2)}` })
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
          Process a utility bill payment. Enter the exact bill amount and service fee markup.
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
                    <FormLabel>Customer Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Muhammad Ali" {...field} />
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
                    <FormLabel>Phone Number <span className="text-muted-foreground text-xs font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 0321-1234567" {...field} />
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
                      <Input placeholder="e.g. LESCO, SSGC, PTCL" {...field} />
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
                      <Input placeholder="e.g. 1234567890" {...field} />
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

            {/* Total Cash Summary */}
            <div className="rounded-lg border bg-muted/30 p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Cash to Collect from Customer</p>
                <p className="text-2xl font-bold text-primary">PKR {totalCashOwed.toFixed(2)}</p>
              </div>
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? "Saving..." : "Save Transaction"}
              </Button>
            </div>

            {message && (
              <div className={`rounded-lg p-4 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                {message.text}
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
