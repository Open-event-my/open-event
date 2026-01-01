/**
 * Ticket Purchase Component
 * Display ticket types and handle checkout
 */

import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { loadStripe } from '@stripe/stripe-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Ticket,
  Minus,
  Plus,
  CreditCard,
  CheckCircle,
  Warning,
  ShoppingCart,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TicketPurchaseProps {
  eventId: Id<'events'>
  eventTitle: string
}

interface CartItem {
  ticketTypeId: Id<'ticketTypes'>
  name: string
  price: number
  quantity: number
  maxPerOrder: number
  remaining: number | null
}

export function TicketPurchase({ eventId, eventTitle }: TicketPurchaseProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const ticketTypes = useQuery(api.ticketTypes.getAvailable, { eventId })
  const createOrder = useMutation(api.orders.create)
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession)
  const getStripeKey = useAction(api.stripe.getPublishableKey)

  // Update cart quantity
  const updateQuantity = (ticketTypeId: Id<'ticketTypes'>, delta: number) => {
    const ticketType = ticketTypes?.find((t) => t._id === ticketTypeId)
    if (!ticketType) return

    setCart((prev) => {
      const existing = prev.find((i) => i.ticketTypeId === ticketTypeId)
      if (existing) {
        const newQty = Math.max(
          0,
          Math.min(existing.quantity + delta, ticketType.maxPerOrder || 10)
        )
        if (ticketType.remaining !== null) {
          if (newQty > ticketType.remaining) return prev
        }
        if (newQty === 0) {
          return prev.filter((i) => i.ticketTypeId !== ticketTypeId)
        }
        return prev.map((i) => (i.ticketTypeId === ticketTypeId ? { ...i, quantity: newQty } : i))
      } else if (delta > 0) {
        return [
          ...prev,
          {
            ticketTypeId,
            name: ticketType.name,
            price: ticketType.price,
            quantity: 1,
            maxPerOrder: ticketType.maxPerOrder || 10,
            remaining: ticketType.remaining,
          },
        ]
      }
      return prev
    })
  }

  const getQuantity = (ticketTypeId: Id<'ticketTypes'>) => {
    return cart.find((i) => i.ticketTypeId === ticketTypeId)?.quantity || 0
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const fees = Math.round(subtotal * 0.03) // 3% platform fee
  const total = subtotal + fees
  const totalTickets = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const validateCheckout = () => {
    const newErrors: Record<string, string> = {}

    if (!buyerInfo.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!buyerInfo.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerInfo.email)) {
      newErrors.email = 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCheckout = async () => {
    if (!validateCheckout()) return

    setIsProcessing(true)
    try {
      // Create order
      const order = await createOrder({
        eventId,
        buyerEmail: buyerInfo.email.trim().toLowerCase(),
        buyerName: buyerInfo.name.trim(),
        buyerPhone: buyerInfo.phone.trim() || undefined,
        items: cart.map((item) => ({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
        })),
      })

      // Get Stripe key
      const { publishableKey } = await getStripeKey()
      const stripe = await loadStripe(publishableKey)

      if (!stripe) {
        throw new Error('Failed to load Stripe')
      }

      // Create checkout session
      const { url } = await createCheckoutSession({
        orderId: order.orderId,
        successUrl: `${window.location.origin}/tickets/success`,
        cancelUrl: `${window.location.origin}/tickets/cancel`,
      })

      // Redirect to Stripe
      window.location.href = url
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed'
      toast.error(message)
      setIsProcessing(false)
    }
  }

  if (!ticketTypes) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse text-muted-foreground">Loading tickets...</div>
      </div>
    )
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Ticket size={48} className="mx-auto mb-4 opacity-50" />
        <p>No tickets available for this event</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ticket Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Ticket size={20} />
          Select Tickets
        </h3>

        {ticketTypes.map((ticket) => (
          <div
            key={ticket._id}
            className={cn(
              'border rounded-xl p-4 transition-all',
              ticket.isSoldOut ? 'opacity-60 bg-muted' : 'hover:border-primary/50 hover:shadow-sm'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{ticket.name}</h4>
                  {ticket.isSoldOut && (
                    <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                      Sold Out
                    </span>
                  )}
                </div>
                {ticket.description && (
                  <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                )}
                {ticket.perks && ticket.perks.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {ticket.perks.map((perk, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-center gap-1.5 text-muted-foreground"
                      >
                        <CheckCircle size={12} className="text-green-600" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                )}
                {ticket.remaining !== null && ticket.remaining <= 10 && !ticket.isSoldOut && (
                  <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                    <Warning size={14} />
                    Only {ticket.remaining} left
                  </p>
                )}
              </div>

              <div className="text-right">
                <div className="text-lg font-bold">
                  {ticket.price === 0 ? 'Free' : formatPrice(ticket.price)}
                </div>

                {!ticket.isSoldOut && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(ticket._id, -1)}
                      disabled={getQuantity(ticket._id) === 0}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="w-8 text-center font-medium">{getQuantity(ticket._id)}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(ticket._id, 1)}
                      disabled={
                        getQuantity(ticket._id) >= (ticket.maxPerOrder || 10) ||
                        (ticket.remaining !== null && getQuantity(ticket._id) >= ticket.remaining)
                      }
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <ShoppingCart size={18} />
            Order Summary
          </h4>

          <div className="space-y-2 text-sm">
            {cart.map((item) => (
              <div key={item.ticketTypeId} className="flex justify-between">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between text-muted-foreground">
              <span>Service Fee</span>
              <span>{formatPrice(fees)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total ({totalTickets} tickets)</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
            <CreditCard size={18} className="mr-2" />
            Checkout
          </Button>
        </div>
      )}

      {/* Checkout Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
            <DialogDescription>
              {totalTickets} ticket{totalTickets !== 1 ? 's' : ''} for {eventTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={buyerInfo.name}
                onChange={(e) => {
                  setBuyerInfo((prev) => ({ ...prev, name: e.target.value }))
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                }}
                placeholder="John Doe"
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={buyerInfo.email}
                onChange={(e) => {
                  setBuyerInfo((prev) => ({ ...prev, email: e.target.value }))
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                }}
                placeholder="john@example.com"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={buyerInfo.phone}
                onChange={(e) => setBuyerInfo((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="bg-muted rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Service Fee</span>
                <span>{formatPrice(fees)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckout(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : `Pay ${formatPrice(total)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
