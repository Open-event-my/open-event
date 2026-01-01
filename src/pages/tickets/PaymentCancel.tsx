/**
 * Payment Cancel Page
 * Shown when user cancels checkout
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { XCircle, ArrowLeft, ShoppingCart } from '@phosphor-icons/react'

export function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
          <XCircle size={48} className="text-amber-600" weight="fill" />
        </div>

        <div>
          <h1 className="text-2xl font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground mt-2">
            Your payment was cancelled. No charges have been made.
          </p>
        </div>

        <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground">
          <p>If you experienced any issues during checkout, please try again or contact support.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard/events">
              <ShoppingCart size={16} className="mr-2" />
              Try Again
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
