/**
 * Payment Success Page
 * Shown after successful ticket purchase
 */

import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { CheckCircle, Ticket, Envelope, House } from '@phosphor-icons/react'

export function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const orderNumber = searchParams.get('order')
  const [mounted, setMounted] = useState(false)

  const order = useQuery(api.orders.getByOrderNumber, orderNumber ? { orderNumber } : 'skip')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount tracking
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={48} className="text-green-600" weight="fill" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground mt-2">
            Thank you for your purchase. Your tickets have been confirmed.
          </p>
        </div>

        {order && (
          <div className="bg-card border rounded-xl p-6 text-left space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Number</span>
              <span className="font-mono font-bold">{order.orderNumber}</span>
            </div>

            {order.event && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Event</span>
                <span className="font-medium">{order.event.title}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tickets</span>
              <span className="font-medium">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)} tickets
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Total Paid</span>
              <span className="font-bold text-lg">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: order.currency,
                }).format(order.total / 100)}
              </span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
          <Envelope size={20} className="text-blue-600 mt-0.5" />
          <div className="text-left text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">Confirmation email sent</p>
            <p className="text-blue-700 dark:text-blue-300">
              Check your inbox for your tickets and event details.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to="/">
              <House size={16} className="mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard/events">
              <Ticket size={16} className="mr-2" />
              View My Tickets
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
