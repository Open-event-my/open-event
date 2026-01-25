/**
 * Orders - Ticket purchase and order management
 *
 * Improvements:
 * - Added webhook idempotency tracking
 * - Added ticket reservation system to prevent overselling
 * - Enhanced sales analytics with time-series data
 * - Added promo code support
 * - Added refund tracking with Stripe sync
 * - Fixed race conditions in inventory management
 */

import { v } from 'convex/values'
import { query, mutation, internalMutation, internalQuery } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'
import { logger } from './lib/monitoring/logger'
import { withAuth } from './lib/security/queryMiddleware'
import { createOrderDTO, createOrderStatsDTO, type OrderVisibilityLevel } from './lib/security/dtos'
import { checkEventManagementPermission } from './lib/security/permissions'
import { AppError, ErrorCodes } from './lib/errors'

// Platform fee percentage
const PLATFORM_FEE_PERCENT = 0.03 // 3%

// Generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp}${random}`
}

// ============================================================================
// QUERIES
// ============================================================================

// Get orders for an event (organizer only)
export const getByEvent = query({
  args: {
    eventId: v.id('events'),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Verify event ownership
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== userId) return []

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    // Filter by status if provided
    const filtered = args.status ? orders.filter((o) => o.paymentStatus === args.status) : orders

    // Sort by date descending
    const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt)

    return args.limit ? sorted.slice(0, args.limit) : sorted
  },
})

// Get order by order number (public - for confirmation page)
export const getByOrderNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', args.orderNumber))
      .first()

    if (!order) return null

    // Get event info
    const event = await ctx.db.get(order.eventId)

    return {
      ...order,
      event: event
        ? {
            _id: event._id,
            title: event.title,
            startDate: event.startDate,
            venue: event.venueName || event.venueAddress,
          }
        : null,
    }
  },
})

// Internal query to get order by ID (for Stripe actions)
export const getById = internalQuery({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId)
  },
})

// Get orders for a buyer by email
// SECURITY: Requires authentication. Only the buyer or admin can access orders.
export const getByEmail = query({
  args: { email: v.string() },
  handler: withAuth(async (ctx, args: { email: string }) => {
    // Normalize email for comparison
    const normalizedEmail = args.email.trim().toLowerCase()

    // Authorization check: only the order owner or admin can access
    const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'superadmin'
    const isOwner = ctx.user.email?.toLowerCase() === normalizedEmail

    if (!isAdmin && !isOwner) {
      // Log unauthorized access attempt for security monitoring
      await logger.warn('Unauthorized order access attempt', {
        userId: ctx.user._id,
        requestedEmail: normalizedEmail,
        userEmail: ctx.user.email,
        action: 'orders:getByEmail',
        status: 'blocked',
      })

      throw new AppError('You can only access your own orders', ErrorCodes.FORBIDDEN, 403)
    }

    // Fetch orders
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_email', (q) => q.eq('buyerEmail', normalizedEmail))
      .collect()

    // Apply field filtering based on role
    const visibilityLevel: OrderVisibilityLevel = isAdmin ? 'admin' : 'buyer'
    return orders.map((order) => createOrderDTO(order, visibilityLevel))
  }),
})

// Get order stats for an event
// SECURITY: Requires authentication. Only event organizer, org managers, or admins can access.
export const getStats = query({
  args: { eventId: v.id('events') },
  handler: withAuth(async (ctx, args: { eventId: Id<'events'> }) => {
    // Get the event
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new AppError('Event not found', ErrorCodes.NOT_FOUND, 404)
    }

    // Authorization check
    const isAdmin = ctx.user.role === 'admin' || ctx.user.role === 'superadmin'
    const isOrganizer = event.organizerId === ctx.user._id
    let authorized = isAdmin || isOrganizer

    // Check if user has organization-level permissions
    if (!authorized && event.organizationId) {
      const permCheck = await checkEventManagementPermission(ctx, event.organizationId)
      authorized = permCheck.authorized
    }

    if (!authorized) {
      await logger.warn('Unauthorized stats access attempt', {
        userId: ctx.user._id,
        eventId: args.eventId,
        action: 'orders:getStats',
        status: 'blocked',
      })

      throw new AppError(
        'You do not have permission to view statistics for this event',
        ErrorCodes.FORBIDDEN,
        403
      )
    }

    // Fetch orders
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    // Use DTO to create aggregated stats (prevents buyer enumeration)
    const currency = event.budgetCurrency || 'usd'
    return createOrderStatsDTO(orders, currency)
  }),
})

// Get sales over time for dashboard charts
export const getSalesTimeSeries = query({
  args: {
    eventId: v.id('events'),
    period: v.optional(v.union(v.literal('day'), v.literal('week'), v.literal('month'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    // Verify event ownership
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== userId) return []

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const completed = orders.filter((o) => o.paymentStatus === 'completed' && o.paidAt)

    // Group by period
    const period = args.period || 'day'
    const grouped: Record<string, { revenue: number; orders: number; tickets: number }> = {}

    for (const order of completed) {
      const date = new Date(order.paidAt!)
      let key: string

      if (period === 'day') {
        key = date.toISOString().split('T')[0]
      } else if (period === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, orders: 0, tickets: 0 }
      }
      grouped[key].revenue += order.total
      grouped[key].orders += 1
      grouped[key].tickets += order.items.reduce((s, i) => s + i.quantity, 0)
    }

    // Convert to sorted array
    return Object.entries(grouped)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
  },
})

// Check if webhook event was already processed (idempotency)
export const getProcessedWebhook = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    // Check in a simple webhook events log
    // In production, this should be a separate table with TTL
    const existing = await ctx.db
      .query('webhookEvents')
      .withIndex('by_event_id', (q) => q.eq('eventId', args.eventId))
      .first()
    return existing
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

// Create a pending order with ticket reservation
export const create = mutation({
  args: {
    eventId: v.id('events'),
    buyerEmail: v.string(),
    buyerName: v.string(),
    buyerPhone: v.optional(v.string()),
    items: v.array(
      v.object({
        ticketTypeId: v.id('ticketTypes'),
        quantity: v.number(),
      })
    ),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(args.buyerEmail)) {
      throw new Error('Invalid email address')
    }

    // Validate items and calculate totals
    let subtotal = 0
    let currency = 'usd'
    const itemDetails = []
    const ticketReservations: { ticketTypeId: Id<'ticketTypes'>; quantity: number }[] = []

    for (const item of args.items) {
      if (item.quantity <= 0) continue

      const ticketType = await ctx.db.get(item.ticketTypeId)
      if (!ticketType) throw new Error(`Ticket type not found`)
      if (!ticketType.isActive) throw new Error(`${ticketType.name} is no longer available`)

      // Check sales window
      const now = Date.now()
      if (ticketType.salesStartAt && now < ticketType.salesStartAt) {
        throw new Error(`${ticketType.name} is not yet on sale`)
      }
      if (ticketType.salesEndAt && now > ticketType.salesEndAt) {
        throw new Error(`${ticketType.name} sales have ended`)
      }

      // Check availability with atomic reservation
      if (ticketType.quantity !== undefined) {
        const available =
          ticketType.quantity - ticketType.soldCount - (ticketType.reservedCount || 0)
        if (item.quantity > available) {
          if (available <= 0) {
            throw new Error(`${ticketType.name} is sold out`)
          }
          throw new Error(`Only ${available} ${ticketType.name} tickets available`)
        }
      }

      // Check max per order
      const maxPerOrder = ticketType.maxPerOrder || 10
      if (item.quantity > maxPerOrder) {
        throw new Error(`Maximum ${maxPerOrder} ${ticketType.name} tickets per order`)
      }

      currency = ticketType.currency
      const itemSubtotal = ticketType.price * item.quantity
      subtotal += itemSubtotal

      itemDetails.push({
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: ticketType.name,
        quantity: item.quantity,
        unitPrice: ticketType.price,
        subtotal: itemSubtotal,
      })

      ticketReservations.push({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
      })
    }

    if (itemDetails.length === 0) {
      throw new Error('Please select at least one ticket')
    }

    // Apply promo code discount if provided
    let discount = 0
    let promoCodeId: Id<'promoCodes'> | undefined = undefined
    if (args.promoCode) {
      const promo = await ctx.db
        .query('promoCodes')
        .withIndex('by_code', (q) => q.eq('code', args.promoCode!.toUpperCase()))
        .first()

      if (promo && promo.isActive && promo.eventId === args.eventId) {
        // Check usage limits
        if (promo.maxUses && promo.usedCount >= promo.maxUses) {
          throw new Error('Promo code has reached its usage limit')
        }
        // Check expiry
        if (promo.validUntil && Date.now() > promo.validUntil) {
          throw new Error('Promo code has expired')
        }

        if (promo.discountType === 'percentage') {
          discount = Math.round(subtotal * (promo.discountValue / 100))
        } else {
          discount = Math.min(promo.discountValue, subtotal)
        }
        promoCodeId = promo._id
      }
    }

    // Calculate fees on discounted amount
    const discountedSubtotal = subtotal - discount
    const fees = Math.round(discountedSubtotal * PLATFORM_FEE_PERCENT)
    const total = discountedSubtotal + fees

    // Reserve tickets (increment reservedCount)
    for (const reservation of ticketReservations) {
      const ticketType = await ctx.db.get(reservation.ticketTypeId)
      if (ticketType && 'reservedCount' in ticketType) {
        await ctx.db.patch(reservation.ticketTypeId, {
          reservedCount:
            ((ticketType.reservedCount as number | undefined) || 0) + reservation.quantity,
        })
      }
    }

    // Create the order
    const orderNumber = generateOrderNumber()
    const orderId = await ctx.db.insert('orders', {
      eventId: args.eventId,
      buyerEmail: args.buyerEmail.toLowerCase().trim(),
      buyerName: args.buyerName.trim(),
      buyerPhone: args.buyerPhone?.trim(),
      items: itemDetails,
      subtotal,
      discount,
      promoCodeId,
      fees,
      total,
      currency,
      paymentStatus: 'pending',
      orderNumber,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minute expiry
    })

    // Increment promo code usage
    if (promoCodeId) {
      const promo = await ctx.db.get(promoCodeId)
      if (promo) {
        await ctx.db.patch(promoCodeId, {
          usedCount: promo.usedCount + 1,
        })
      }
    }

    return {
      orderId,
      orderNumber,
      subtotal,
      discount,
      fees,
      total,
      currency,
    }
  },
})

// Record webhook event for idempotency
export const recordWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('webhookEvents', {
      eventId: args.eventId,
      eventType: args.eventType,
      processedAt: args.processedAt,
    })
  },
})

// Internal mutation to update order after Stripe webhook
export const updatePaymentStatus = internalMutation({
  args: {
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    orderId: v.optional(v.id('orders')),
    paymentStatus: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('refunded'),
      v.literal('cancelled')
    ),
    paymentMethod: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find order by Stripe session or intent ID
    let order = null

    if (args.orderId) {
      order = await ctx.db.get(args.orderId)
    } else if (args.stripeSessionId) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_stripe_session', (q) => q.eq('stripeSessionId', args.stripeSessionId))
        .first()
    } else if (args.stripePaymentIntentId) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_stripe_intent', (q) =>
          q.eq('stripePaymentIntentId', args.stripePaymentIntentId)
        )
        .first()
    }

    if (!order) {
      logger.error('Order not found for payment update', undefined, {
        sessionId: args.stripeSessionId,
        intentId: args.stripePaymentIntentId,
        orderId: args.orderId,
      })
      return
    }

    // Prevent duplicate completion
    if (order.paymentStatus === 'completed' && args.paymentStatus === 'completed') {
      logger.info('Order already completed, skipping duplicate', {
        orderNumber: order.orderNumber,
      })
      return
    }

    const updates: Record<string, unknown> = {
      paymentStatus: args.paymentStatus,
    }

    if (args.paymentMethod) updates.paymentMethod = args.paymentMethod
    if (args.stripeCustomerId) updates.stripeCustomerId = args.stripeCustomerId
    if (args.stripePaymentIntentId) updates.stripePaymentIntentId = args.stripePaymentIntentId

    if (args.paymentStatus === 'completed') {
      updates.paidAt = Date.now()

      // Convert reservations to sold tickets
      for (const item of order.items) {
        const ticketType = await ctx.db.get(item.ticketTypeId)
        if (ticketType) {
          await ctx.db.patch(item.ticketTypeId, {
            soldCount: ticketType.soldCount + item.quantity,
            reservedCount: Math.max(0, (ticketType.reservedCount || 0) - item.quantity),
          })
        }
      }

      // Create attendees for each ticket
      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
          await ctx.db.insert('attendees', {
            eventId: order.eventId,
            email: order.buyerEmail,
            name: order.buyerName,
            phone: order.buyerPhone,
            ticketType: item.ticketTypeName,
            ticketNumber,
            status: 'confirmed',
            registrationSource: 'ticket_purchase',
            paymentStatus: 'paid',
            paymentReference: order.orderNumber,
            registeredAt: Date.now(),
          })
        }
      }

      logger.info('Payment completed, attendees created', {
        orderNumber: order.orderNumber,
        attendeeCount: order.items.length,
      })
    }

    if (args.paymentStatus === 'refunded') {
      updates.refundedAt = Date.now()
    }

    await ctx.db.patch(order._id, updates)
  },
})

// Release ticket reservation (called when checkout expires/cancelled)
export const releaseTicketReservation = internalMutation({
  args: {
    stripeSessionId: v.optional(v.string()),
    orderId: v.optional(v.id('orders')),
  },
  handler: async (ctx, args) => {
    let order = null

    if (args.orderId) {
      order = await ctx.db.get(args.orderId)
    } else if (args.stripeSessionId) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_stripe_session', (q) => q.eq('stripeSessionId', args.stripeSessionId))
        .first()
    }

    if (!order) return

    // Only release if not already completed
    if (order.paymentStatus === 'completed') return

    // Release reserved tickets
    for (const item of order.items) {
      const ticketType = await ctx.db.get(item.ticketTypeId)
      if (ticketType && ticketType.reservedCount) {
        await ctx.db.patch(item.ticketTypeId, {
          reservedCount: Math.max(0, ticketType.reservedCount - item.quantity),
        })
      }
    }

    logger.info('Released ticket reservations', {
      orderNumber: order.orderNumber,
      itemCount: order.items.length,
    })
  },
})

// Mark order as refunded with details
export const markRefunded = internalMutation({
  args: {
    orderId: v.id('orders'),
    refundId: v.string(),
    refundAmount: v.number(),
    reason: v.optional(v.string()),
    isPartial: v.boolean(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) return

    await ctx.db.patch(args.orderId, {
      refundedAt: Date.now(),
      refundId: args.refundId,
      refundAmount: args.refundAmount,
      refundReason: args.reason,
      isPartialRefund: args.isPartial,
    })

    // If full refund, cancel attendees
    if (!args.isPartial) {
      const attendees = await ctx.db
        .query('attendees')
        .withIndex('by_event', (q) => q.eq('eventId', order.eventId))
        .filter((q) =>
          q.and(
            q.eq(q.field('email'), order.buyerEmail),
            q.eq(q.field('paymentReference'), order.orderNumber)
          )
        )
        .collect()

      for (const attendee of attendees) {
        await ctx.db.patch(attendee._id, {
          paymentStatus: 'refunded',
          status: 'cancelled',
        })
      }

      // Reduce sold count for ticket types
      for (const item of order.items) {
        const ticketType = await ctx.db.get(item.ticketTypeId)
        if (ticketType) {
          await ctx.db.patch(item.ticketTypeId, {
            soldCount: Math.max(0, ticketType.soldCount - item.quantity),
          })
        }
      }
    }
  },
})

// Set Stripe session ID on order
export const setStripeSession = mutation({
  args: {
    orderId: v.id('orders'),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, {
      stripeSessionId: args.stripeSessionId,
      paymentStatus: 'processing',
    })
  },
})

// Cancel expired pending orders and release reservations
export const cleanupExpiredOrders = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const expiredOrders = await ctx.db
      .query('orders')
      .withIndex('by_status', (q) => q.eq('paymentStatus', 'pending'))
      .collect()

    let cleanedCount = 0
    for (const order of expiredOrders) {
      if (order.expiresAt && order.expiresAt < now) {
        // Release ticket reservations
        for (const item of order.items) {
          const ticketType = await ctx.db.get(item.ticketTypeId)
          if (ticketType && ticketType.reservedCount) {
            await ctx.db.patch(item.ticketTypeId, {
              reservedCount: Math.max(0, ticketType.reservedCount - item.quantity),
            })
          }
        }

        await ctx.db.patch(order._id, {
          paymentStatus: 'cancelled',
        })
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired orders', {
        cleanedCount,
      })
    }

    return { cleanedCount }
  },
})

// Manual refund (organizer only) - triggers Stripe refund
export const refund = mutation({
  args: {
    orderId: v.id('orders'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')

    // Verify event ownership
    const event = await ctx.db.get(order.eventId)
    if (!event || event.organizerId !== userId) throw new Error('Not authorized')

    if (order.paymentStatus !== 'completed') {
      throw new Error('Can only refund completed orders')
    }

    // Note: This mutation just marks for refund
    // The actual Stripe refund should be done via stripe.createRefund action
    // This prevents the mutation from needing to call external APIs

    return {
      success: true,
      message: 'Please use the Stripe refund action to process the actual refund',
      orderId: args.orderId,
      stripePaymentIntentId: order.stripePaymentIntentId,
    }
  },
})

// Clean up old webhook events (older than 7 days)
export const cleanupOldWebhookEvents = internalMutation({
  handler: async (ctx) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    const oldEvents = await ctx.db
      .query('webhookEvents')
      .filter((q) => q.lt(q.field('processedAt'), sevenDaysAgo))
      .collect()

    let deletedCount = 0
    for (const event of oldEvents) {
      await ctx.db.delete(event._id)
      deletedCount++
    }

    if (deletedCount > 0) {
      logger.info('Cleaned up old webhook events', {
        deletedCount,
      })
    }

    return { deletedCount }
  },
})
