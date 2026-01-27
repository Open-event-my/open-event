/**
 * Stripe Integration - Checkout sessions and webhook handling
 *
 * Improvements:
 * - Fixed API version to valid Stripe version
 * - Added idempotency checking for webhooks
 * - Added dispute handling
 * - Enhanced error logging with context
 * - Proper refund flow with Stripe API
 */

import { v } from 'convex/values'
import { action, internalMutation, internalAction } from './_generated/server'
import { api, internal } from './_generated/api'
import { makeFunctionReference } from 'convex/server'
import Stripe from 'stripe'
import { PLANS, type PlanKey } from './config/plans'
import type { Id } from './_generated/dataModel'
import { logger } from './lib/monitoring/logger'
import { PaymentAuditLogger } from './lib/payment/paymentAuditLog'
import { validateCheckoutAmounts } from './lib/payment/paymentSecurity'
import { getSafeBillingError } from './lib/security'

// Create function references for paymentIdempotency functions
// These will be properly typed after running `npx convex dev`
const paymentIdempotency = {
  checkAndCreate: makeFunctionReference<'mutation'>('paymentIdempotency:checkAndCreate'),
  complete: makeFunctionReference<'mutation'>('paymentIdempotency:complete'),
}

// Platform fee percentage (configurable) - reserved for future use
// const PLATFORM_FEE_PERCENT = 0.03 // 3%

import { STRIPE_API_VERSION } from './config/stripe'

// Initialize Stripe with correct API version
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY environment variable not set. Please add it to your Convex dashboard.'
    )
  }
  const stripeConfig: Stripe.StripeConfig = {
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    typescript: true,
  }

  return new Stripe(key, stripeConfig)
}

// Check if Stripe is configured
export const isConfigured = action({
  handler: async () => {
    const hasSecretKey = !!process.env.STRIPE_SECRET_KEY
    const hasPublishableKey = !!process.env.STRIPE_PUBLISHABLE_KEY
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET

    return {
      configured: hasSecretKey && hasPublishableKey,
      webhookConfigured: hasWebhookSecret,
      missing: [
        !hasSecretKey && 'STRIPE_SECRET_KEY',
        !hasPublishableKey && 'STRIPE_PUBLISHABLE_KEY',
        !hasWebhookSecret && 'STRIPE_WEBHOOK_SECRET',
      ].filter(Boolean),
    }
  },
})

// Create a Stripe Checkout Session
export const createCheckoutSession = action({
  args: {
    orderId: v.id('orders'),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ sessionId: string; url: string }> => {
    const stripe = getStripe()

    // Get the order using internal query
    const orderData = await ctx.runQuery(internal.orders.getById, {
      orderId: args.orderId,
    })

    if (!orderData) {
      throw new Error('Order not found')
    }

    // Prevent creating session for non-pending orders
    if (orderData.paymentStatus !== 'pending' && orderData.paymentStatus !== 'processing') {
      throw new Error(`Cannot checkout order with status: ${orderData.paymentStatus}`)
    }

    // Check idempotency - prevent duplicate checkout sessions
    const idempotencyCheck = await ctx.runMutation(paymentIdempotency.checkAndCreate, {
      orderId: args.orderId,
      operation: 'checkout',
    })

    if (idempotencyCheck.isDuplicate && idempotencyCheck.record) {
      const record = idempotencyCheck.record

      // If previous operation completed successfully, return cached result
      if (record.status === 'completed' && record.result) {
        try {
          const cachedResult = JSON.parse(record.result)
          logger.info('Returning cached checkout session result', {
            orderId: args.orderId,
            idempotencyKey: record.idempotencyKey,
          })
          return cachedResult
        } catch {
          // Invalid cached result, continue with new session
        }
      }

      // If previous operation is still pending, check if session exists
      if (record.status === 'pending' && orderData.stripeSessionId) {
        try {
          const existingSession = await stripe.checkout.sessions.retrieve(orderData.stripeSessionId)
          if (existingSession.status === 'open' && existingSession.url) {
            return {
              sessionId: existingSession.id,
              url: existingSession.url,
            }
          }
        } catch {
          // Session expired or invalid, continue with new session
        }
      }

      // If previous operation failed, allow retry
      if (record.status === 'failed') {
        logger.info('Previous checkout attempt failed, allowing retry', {
          orderId: args.orderId,
          previousError: record.errorMessage,
        })
      }
    }

    // Check if session already exists and is valid
    if (orderData.stripeSessionId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(orderData.stripeSessionId)
        if (existingSession.status === 'open' && existingSession.url) {
          return {
            sessionId: existingSession.id,
            url: existingSession.url,
          }
        }
      } catch {
        // Session expired or invalid, create new one
      }
    }

    // Get event details
    const event = await ctx.runQuery(api.events.get, {
      id: orderData.eventId,
    })

    if (!event) {
      throw new Error('Event not found')
    }

    // Build line items with proper metadata
    type OrderItem = (typeof orderData.items)[number]
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderData.items.map(
      (item: OrderItem) => ({
        price_data: {
          currency: orderData.currency,
          product_data: {
            name: `${event.title} - ${item.ticketTypeName}`,
            description: `Ticket for ${event.title}`,
            metadata: {
              ticketTypeId: item.ticketTypeId,
              eventId: orderData.eventId,
            },
          },
          unit_amount: item.unitPrice,
        },
        quantity: item.quantity,
      })
    )

    // Add platform fee as separate line item (transparent pricing)
    if (orderData.fees > 0) {
      lineItems.push({
        price_data: {
          currency: orderData.currency,
          product_data: {
            name: 'Service Fee',
            description: 'Platform and payment processing fee',
          },
          unit_amount: orderData.fees,
        },
        quantity: 1,
      })
    }

    // =========================================================================
    // SERVER-SIDE PAYMENT VALIDATION
    // Validates that amounts have not been tampered with client-side
    // =========================================================================

    // Calculate total from line items (what we're sending to Stripe)
    const lineItemsTotal = lineItems.reduce((sum, item) => {
      return sum + (item.price_data?.unit_amount || 0) * (item.quantity || 1)
    }, 0)

    // Validate checkout amounts match order total
    const paymentValidation = validateCheckoutAmounts(
      orderData.total,
      lineItemsTotal,
      orderData.currency
    )

    if (!paymentValidation.isValid) {
      logger.error('Server-side payment validation failed', undefined, {
        orderId: args.orderId,
        orderNumber: orderData.orderNumber,
        orderTotal: orderData.total,
        lineItemsTotal,
        errors: paymentValidation.errors,
      })
      throw new Error(
        'Payment validation failed: amounts do not match. ' + 'Please refresh and try again.'
      )
    }

    // Log warnings if any
    if (paymentValidation.warnings.length > 0) {
      logger.warn('Payment validation warnings', {
        orderId: args.orderId,
        orderNumber: orderData.orderNumber,
        warnings: paymentValidation.warnings,
      })
    }

    try {
      // Create checkout session with enhanced options and idempotency key
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: orderData.buyerEmail,
        client_reference_id: orderData.orderNumber,
        metadata: {
          orderId: args.orderId,
          orderNumber: orderData.orderNumber,
          eventId: orderData.eventId,
          eventTitle: event.title,
        },
        payment_intent_data: {
          metadata: {
            orderId: args.orderId,
            orderNumber: orderData.orderNumber,
          },
        },
        success_url: `${args.successUrl}?session_id={CHECKOUT_SESSION_ID}&order=${orderData.orderNumber}`,
        cancel_url: `${args.cancelUrl}?order=${orderData.orderNumber}`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
        // Enable automatic tax if configured
        // automatic_tax: { enabled: true },
      })

      // Update order with session ID
      await ctx.runMutation(api.orders.setStripeSession, {
        orderId: args.orderId,
        stripeSessionId: session.id,
      })

      const result = {
        sessionId: session.id,
        url: session.url!,
      }

      // Mark idempotency record as completed with cached result
      if (idempotencyCheck.record) {
        await ctx.runMutation(paymentIdempotency.complete, {
          idempotencyKey: idempotencyCheck.record.idempotencyKey,
          status: 'completed',
          result: JSON.stringify(result),
        })
      }

      return result
    } catch (error) {
      // Mark idempotency record as failed
      if (idempotencyCheck.record) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await ctx.runMutation(paymentIdempotency.complete, {
          idempotencyKey: idempotencyCheck.record.idempotencyKey,
          status: 'failed',
          errorMessage,
        })
      }
      throw error
    }
  },
})

// Handle Stripe webhook events with idempotency
export const handleWebhook = action({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET not configured')
      throw new Error('Webhook secret not configured')
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(args.payload, args.signature, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('Stripe webhook signature verification failed', err, { message })
      throw new Error('Webhook signature verification failed')
    }

    // Log event for debugging
    logger.info('Processing Stripe webhook event', {
      eventType: event.type,
      eventId: event.id,
    })

    // Check idempotency - prevent processing same event twice
    const existingEvent = await ctx.runQuery(internal.orders.getProcessedWebhook, {
      eventId: event.id,
    })

    if (existingEvent) {
      logger.info('Stripe webhook event already processed, skipping', {
        eventId: event.id,
      })
      return { received: true, status: 'duplicate' }
    }

    // Record this webhook event
    await ctx.runMutation(internal.orders.recordWebhookEvent, {
      eventId: event.id,
      eventType: event.type,
      processedAt: Date.now(),
    })

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session

          // Check if this is a subscription checkout
          if (session.mode === 'subscription') {
            const organizationId = session.metadata?.organizationId
            const plan = session.metadata?.plan

            if (!organizationId || !plan) {
              logger.warn('Missing metadata in subscription checkout session', {
                sessionId: session.id,
                hasOrgId: !!organizationId,
                hasPlan: !!plan,
              })
              return { received: true, status: 'skipped', reason: 'Missing metadata' }
            }

            // Get subscription details
            const subscriptionId = session.subscription as string
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)

            // Access current_period_end safely
            const currentPeriodEnd =
              typeof subscription === 'object' && 'current_period_end' in subscription
                ? (subscription as { current_period_end: number }).current_period_end
                : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

            await ctx.runMutation(internal.stripe.handleSubscriptionCheckoutComplete, {
              organizationId: organizationId as Id<'organizations'>,
              subscriptionId,
              plan,
              customerId: session.customer as string,
              currentPeriodEnd,
            })

            logger.info('Subscription checkout completed', {
              organizationId,
              plan,
              subscriptionId,
            })
          } else {
            // Standard one-time payment checkout
            logger.info('Stripe checkout completed', {
              orderNumber: session.metadata?.orderNumber,
              sessionId: session.id,
            })

            await ctx.runMutation(internal.orders.updatePaymentStatus, {
              stripeSessionId: session.id,
              paymentStatus: 'completed',
              paymentMethod: session.payment_method_types?.[0] || 'card',
              stripeCustomerId: session.customer as string | undefined,
              stripePaymentIntentId: session.payment_intent as string | undefined,
            })

            // Log payment audit event
            await PaymentAuditLogger.logCheckout(ctx, 'checkout_completed', {
              orderId: session.metadata?.orderId || '',
              orderNumber: session.metadata?.orderNumber || '',
              amount: session.amount_total || 0,
              currency: session.currency || 'usd',
              buyerEmail: session.customer_email || undefined,
              eventId: session.metadata?.eventId,
              stripeEventId: event.id,
              stripeSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as string | undefined,
              paymentMethod: session.payment_method_types?.[0] || 'card',
            })
          }
          break
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          const priceId = subscription.items.data[0]?.price.id
          const subCurrentPeriodEnd =
            typeof subscription === 'object' && 'current_period_end' in subscription
              ? (subscription as { current_period_end: number }).current_period_end
              : Math.floor(Date.now() / 1000)

          await ctx.runMutation(internal.stripe.handleSubscriptionUpdated, {
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subCurrentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            priceId,
          })

          logger.info('Subscription updated', {
            subscriptionId: subscription.id,
            status: subscription.status,
          })
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription

          await ctx.runMutation(internal.stripe.handleSubscriptionDeleted, {
            subscriptionId: subscription.id,
          })

          logger.info('Subscription deleted', {
            subscriptionId: subscription.id,
          })
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const invoiceSubscription =
            typeof invoice === 'object' && 'subscription' in invoice
              ? (invoice as { subscription: string | null }).subscription
              : null

          if (invoiceSubscription) {
            await ctx.runMutation(internal.stripe.handleSubscriptionPaymentFailed, {
              subscriptionId: invoiceSubscription,
              attemptCount: invoice.attempt_count || 1,
            })

            logger.warn('Subscription payment failed', {
              subscriptionId: invoiceSubscription,
              attemptCount: invoice.attempt_count,
            })
          }
          break
        }

        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session
          logger.info('Stripe checkout expired', {
            orderNumber: session.metadata?.orderNumber,
            sessionId: session.id,
          })

          await ctx.runMutation(internal.orders.updatePaymentStatus, {
            stripeSessionId: session.id,
            paymentStatus: 'cancelled',
          })

          // Release reserved tickets
          await ctx.runMutation(internal.orders.releaseTicketReservation, {
            stripeSessionId: session.id,
          })

          // Log payment audit event
          await PaymentAuditLogger.logCheckout(ctx, 'checkout_expired', {
            orderId: session.metadata?.orderId || '',
            orderNumber: session.metadata?.orderNumber || '',
            amount: session.amount_total || 0,
            currency: session.currency || 'usd',
            buyerEmail: session.customer_email || undefined,
            eventId: session.metadata?.eventId,
            stripeEventId: event.id,
            stripeSessionId: session.id,
          })
          break
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          logger.warn('Stripe payment failed', {
            paymentIntentId: paymentIntent.id,
          })

          await ctx.runMutation(internal.orders.updatePaymentStatus, {
            stripePaymentIntentId: paymentIntent.id,
            paymentStatus: 'failed',
          })

          // Log payment audit event
          await PaymentAuditLogger.logPayment(ctx, 'payment_failed', {
            orderId: paymentIntent.metadata?.orderId || '',
            orderNumber: paymentIntent.metadata?.orderNumber || '',
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            stripeEventId: event.id,
            stripePaymentIntentId: paymentIntent.id,
            paymentMethod: paymentIntent.payment_method_types?.[0] || 'card',
            errorMessage: paymentIntent.last_payment_error?.message,
            errorCode: paymentIntent.last_payment_error?.code,
          })
          break
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          if (charge.payment_intent) {
            logger.info('Stripe charge refunded', {
              paymentIntentId: charge.payment_intent,
              chargeId: charge.id,
            })

            await ctx.runMutation(internal.orders.updatePaymentStatus, {
              stripePaymentIntentId: charge.payment_intent as string,
              paymentStatus: 'refunded',
            })

            // Log payment audit event
            await PaymentAuditLogger.logRefund(ctx, 'refund_completed', {
              orderId: charge.metadata?.orderId || '',
              orderNumber: charge.metadata?.orderNumber || '',
              amount: charge.amount_refunded,
              currency: charge.currency,
              stripeEventId: event.id,
              stripePaymentIntentId: charge.payment_intent as string,
              stripeChargeId: charge.id,
              paymentMethod: charge.payment_method_details?.type || 'card',
              cardBrand: charge.payment_method_details?.card?.brand ?? undefined,
              cardLast4: charge.payment_method_details?.card?.last4 ?? undefined,
            })
          }
          break
        }

        case 'charge.dispute.created': {
          const dispute = event.data.object as Stripe.Dispute
          logger.warn('Stripe dispute created', {
            disputeId: dispute.id,
            chargeId: dispute.charge,
          })

          // Log payment audit event for dispute
          await PaymentAuditLogger.logDispute(ctx, 'dispute_created', {
            orderId: dispute.metadata?.orderId || '',
            orderNumber: dispute.metadata?.orderNumber || '',
            amount: dispute.amount,
            currency: dispute.currency,
            stripeEventId: event.id,
            stripeDisputeId: dispute.id,
            stripeChargeId:
              typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id,
            disputeReason: dispute.reason || undefined,
          })

          // TODO: Send alert to organizer, possibly freeze ticket
          break
        }

        case 'charge.dispute.closed': {
          const dispute = event.data.object as Stripe.Dispute
          logger.info('Stripe dispute closed', {
            disputeId: dispute.id,
            status: dispute.status,
          })

          // Determine dispute outcome
          const disputeEventType =
            dispute.status === 'won'
              ? 'dispute_won'
              : dispute.status === 'lost'
                ? 'dispute_lost'
                : 'dispute_closed'

          // Log payment audit event for dispute closure
          await PaymentAuditLogger.logDispute(ctx, disputeEventType, {
            orderId: dispute.metadata?.orderId || '',
            orderNumber: dispute.metadata?.orderNumber || '',
            amount: dispute.amount,
            currency: dispute.currency,
            stripeEventId: event.id,
            stripeDisputeId: dispute.id,
            stripeChargeId:
              typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id,
            disputeReason: dispute.reason || undefined,
            metadata: {
              status: dispute.status,
              outcome: dispute.status,
            },
          })
          break
        }

        default:
          logger.debug('Unhandled Stripe webhook event type', {
            eventType: event.type,
          })
      }

      return { received: true, status: 'processed' }
    } catch (processingError) {
      const message = processingError instanceof Error ? processingError.message : 'Unknown error'
      logger.error('Error processing Stripe webhook', processingError, {
        eventType: event.type,
        message,
      })
      throw new Error(`Webhook processing failed: ${message}`)
    }
  },
})

// Create a refund in Stripe AND update database
export const createRefund = action({
  args: {
    orderId: v.id('orders'),
    reason: v.optional(v.string()),
    amount: v.optional(v.number()), // Partial refund amount in cents
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; refundId: string; amount: number; isPartial: boolean }> => {
    const stripe = getStripe()

    // Get order to find payment intent
    const order = await ctx.runQuery(internal.orders.getById, {
      orderId: args.orderId,
    })

    if (!order) {
      throw new Error('Order not found')
    }

    if (!order.stripePaymentIntentId) {
      throw new Error('No payment intent found for this order. Was the payment completed?')
    }

    if (order.paymentStatus !== 'completed') {
      throw new Error(`Cannot refund order with status: ${order.paymentStatus}`)
    }

    // Check idempotency - prevent duplicate refunds
    const idempotencyCheck = await ctx.runMutation(paymentIdempotency.checkAndCreate, {
      orderId: args.orderId,
      operation: 'refund',
    })

    if (idempotencyCheck.isDuplicate && idempotencyCheck.record) {
      const record = idempotencyCheck.record

      // If previous refund completed successfully, return cached result
      if (record.status === 'completed' && record.result) {
        try {
          const cachedResult = JSON.parse(record.result)
          logger.info('Returning cached refund result (duplicate request)', {
            orderId: args.orderId,
            idempotencyKey: record.idempotencyKey,
          })
          return cachedResult
        } catch {
          // Invalid cached result, continue with new refund
        }
      }

      // If previous refund is still pending, throw error
      if (record.status === 'pending') {
        throw new Error('A refund operation is already in progress for this order')
      }

      // If previous refund failed, allow retry
      if (record.status === 'failed') {
        logger.info('Previous refund attempt failed, allowing retry', {
          orderId: args.orderId,
          previousError: record.errorMessage,
        })
      }
    }

    // Determine refund amount
    const refundAmount = args.amount || order.total

    try {
      // Create refund in Stripe with idempotency key
      const refund = await stripe.refunds.create(
        {
          payment_intent: order.stripePaymentIntentId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            orderId: args.orderId,
            orderNumber: order.orderNumber,
            refundReason: args.reason || 'Organizer requested refund',
          },
        },
        {
          idempotencyKey: idempotencyCheck.stripeIdempotencyKey,
        }
      )

      logger.info('Stripe refund created', {
        refundId: refund.id,
        orderNumber: order.orderNumber,
        amount: refundAmount,
        idempotencyKey: idempotencyCheck.stripeIdempotencyKey,
      })

      // Update order status in database
      const isFullRefund = refundAmount >= order.total
      await ctx.runMutation(internal.orders.updatePaymentStatus, {
        orderId: args.orderId,
        paymentStatus: isFullRefund ? 'refunded' : 'completed', // Keep completed for partial
      })

      // Mark order as refunded with details
      await ctx.runMutation(internal.orders.markRefunded, {
        orderId: args.orderId,
        refundId: refund.id,
        refundAmount,
        reason: args.reason,
        isPartial: !isFullRefund,
      })

      const result = {
        success: true,
        refundId: refund.id,
        amount: refundAmount,
        isPartial: !isFullRefund,
      }

      // Log payment audit event for refund
      await PaymentAuditLogger.logRefund(
        ctx,
        isFullRefund ? 'refund_completed' : 'partial_refund_completed',
        {
          orderId: args.orderId,
          orderNumber: order.orderNumber,
          amount: refundAmount,
          currency: order.currency,
          buyerEmail: order.buyerEmail,
          eventId: order.eventId,
          stripeRefundId: refund.id,
          stripePaymentIntentId: order.stripePaymentIntentId,
          refundReason: args.reason || 'Organizer requested refund',
        }
      )

      // Mark idempotency record as completed with cached result
      if (idempotencyCheck.record) {
        await ctx.runMutation(paymentIdempotency.complete, {
          idempotencyKey: idempotencyCheck.record.idempotencyKey,
          status: 'completed',
          result: JSON.stringify(result),
        })
      }

      return result
    } catch (stripeError) {
      const message = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error'

      // Log payment audit event for failed refund
      await PaymentAuditLogger.logRefund(ctx, 'refund_failed', {
        orderId: args.orderId,
        orderNumber: order.orderNumber,
        amount: refundAmount,
        currency: order.currency,
        buyerEmail: order.buyerEmail,
        eventId: order.eventId,
        stripePaymentIntentId: order.stripePaymentIntentId,
        refundReason: args.reason,
        errorMessage: message,
      })

      // Mark idempotency record as failed
      if (idempotencyCheck.record) {
        await ctx.runMutation(paymentIdempotency.complete, {
          idempotencyKey: idempotencyCheck.record.idempotencyKey,
          status: 'failed',
          errorMessage: message,
        })
      }

      logger.error('Stripe refund failed', stripeError, {
        orderNumber: order.orderNumber,
        message,
      })
      throw new Error(`Stripe refund failed: ${message}`)
    }
  },
})

// Get Stripe publishable key (for frontend)
export const getPublishableKey = action({
  handler: async () => {
    const key = process.env.STRIPE_PUBLISHABLE_KEY
    if (!key) {
      throw new Error('STRIPE_PUBLISHABLE_KEY environment variable not set')
    }
    return { publishableKey: key }
  },
})

// Get payment details for a completed order
export const getPaymentDetails = action({
  args: {
    orderId: v.id('orders'),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    status: string
    amount: number
    currency: string
    paymentMethod: string
    receiptUrl: string | null | undefined
    last4: string | undefined
    brand: string | undefined
  } | null> => {
    const stripe = getStripe()

    const order = await ctx.runQuery(internal.orders.getById, {
      orderId: args.orderId,
    })

    if (!order?.stripePaymentIntentId) {
      return null
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, {
        expand: ['payment_method', 'latest_charge'],
      })

      const charge = paymentIntent.latest_charge as Stripe.Charge | null

      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentMethod: paymentIntent.payment_method_types[0],
        receiptUrl: charge?.receipt_url,
        last4: (paymentIntent.payment_method as Stripe.PaymentMethod)?.card?.last4,
        brand: (paymentIntent.payment_method as Stripe.PaymentMethod)?.card?.brand,
      }
    } catch {
      return null
    }
  },
})

// ============================================================================
// SUBSCRIPTION BILLING - Organization Plan Upgrades
// ============================================================================

/**
 * Create a Stripe Checkout session for subscription upgrade
 * SECURITY: Requires user to be owner or admin of the organization
 */
export const createSubscriptionCheckout = action({
  args: {
    organizationId: v.id('organizations'),
    plan: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string | null; error?: string }> => {
    const stripe = getStripe()
    const appUrl = process.env.APP_URL || 'http://localhost:5173'

    // SECURITY: Use centralized permission check
    const permCheck = await ctx.runMutation(internal.stripe.checkBillingPermissionInternal, {
      organizationId: args.organizationId,
    })

    if (!permCheck.authorized) {
      logger.warn('Billing checkout permission denied', {
        organizationId: args.organizationId,
        reason: permCheck.reason,
      })
      return { url: null, error: permCheck.reason || getSafeBillingError() }
    }

    const org = permCheck.organization
    if (!org || !('plan' in org)) {
      return { url: null, error: 'Organization not found' }
    }

    // Get price ID for the plan from environment
    const priceIdKey = `STRIPE_${args.plan.toUpperCase()}_PRICE_ID`
    const priceId = process.env[priceIdKey]

    if (!priceId) {
      logger.warn('Stripe price ID not configured for plan', {
        plan: args.plan,
        expectedEnvVar: priceIdKey,
      })
      return {
        url: null,
        error: `Stripe price ID not configured for ${args.plan} plan. Please set ${priceIdKey} environment variable.`,
      }
    }

    try {
      // Get or create Stripe customer
      let customerId = org.stripeCustomerId

      if (!customerId) {
        // Create a new customer
        const customer = await stripe.customers.create({
          metadata: {
            organizationId: args.organizationId,
            organizationName: org.name,
          },
        })
        customerId = customer.id

        // Save customer ID to organization
        await ctx.runMutation(internal.organizations.updateStripeCustomer, {
          organizationId: args.organizationId,
          stripeCustomerId: customerId,
        })
      }

      // Create checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/dashboard/settings?tab=billing&success=true`,
        cancel_url: `${appUrl}/dashboard/settings?tab=billing&canceled=true`,
        metadata: {
          organizationId: args.organizationId,
          plan: args.plan,
        },
        subscription_data: {
          metadata: {
            organizationId: args.organizationId,
            plan: args.plan,
          },
        },
      })

      logger.info('Subscription checkout session created', {
        organizationId: args.organizationId,
        plan: args.plan,
        sessionId: session.id,
      })

      return { url: session.url }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to create subscription checkout session', error, {
        organizationId: args.organizationId,
        plan: args.plan,
        message,
      })
      return { url: null, error: message }
    }
  },
})

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 * SECURITY: Requires user to be owner or admin of the organization
 */
export const createBillingPortalSession = action({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args): Promise<{ url: string | null; error?: string }> => {
    const stripe = getStripe()
    const appUrl = process.env.APP_URL || 'http://localhost:5173'

    // SECURITY: Use centralized permission check
    const permCheck = await ctx.runMutation(internal.stripe.checkBillingPermissionInternal, {
      organizationId: args.organizationId,
    })

    if (!permCheck.authorized) {
      logger.warn('Billing portal permission denied', {
        organizationId: args.organizationId,
        reason: permCheck.reason,
      })
      return { url: null, error: permCheck.reason || getSafeBillingError() }
    }

    const org = permCheck.organization
    if (!org || !('stripeCustomerId' in org)) {
      return { url: null, error: 'Organization not found' }
    }

    if (!org.stripeCustomerId) {
      return { url: null, error: 'No billing account found. Please subscribe to a plan first.' }
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: `${appUrl}/dashboard/settings?tab=billing`,
      })

      return { url: session.url }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to create billing portal session', error, {
        organizationId: args.organizationId,
        message,
      })
      return { url: null, error: message }
    }
  },
})

/**
 * Cancel a subscription immediately (internal use only)
 * Called by downgradeToFree action to actually cancel the Stripe subscription
 */
export const cancelSubscriptionImmediately = internalAction({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (_ctx, args): Promise<{ success: boolean; status: string }> => {
    const stripe = getStripe()

    try {
      // Cancel immediately, not at period end
      const subscription = await stripe.subscriptions.cancel(args.stripeSubscriptionId)

      logger.info('Subscription cancelled immediately', {
        subscriptionId: args.stripeSubscriptionId,
        status: subscription.status,
      })

      return { success: true, status: subscription.status }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to cancel subscription immediately', error, {
        subscriptionId: args.stripeSubscriptionId,
        message,
      })
      throw new Error(`Failed to cancel Stripe subscription: ${message}`)
    }
  },
})

/**
 * Cancel an organization's subscription at period end
 * SECURITY: Requires user to be owner or admin of the organization
 */
export const cancelOrganizationSubscription = action({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const stripe = getStripe()

    // SECURITY: Use centralized permission check
    const permCheck = await ctx.runMutation(internal.stripe.checkBillingPermissionInternal, {
      organizationId: args.organizationId,
    })

    if (!permCheck.authorized) {
      logger.warn('Subscription cancellation permission denied', {
        organizationId: args.organizationId,
        reason: permCheck.reason,
      })
      return { success: false, error: permCheck.reason || getSafeBillingError() }
    }

    const org = permCheck.organization
    if (!org || !('stripeSubscriptionId' in org)) {
      return { success: false, error: 'Organization not found' }
    }

    if (!org.stripeSubscriptionId) {
      return { success: false, error: 'No active subscription found' }
    }

    try {
      // Cancel at period end (not immediately)
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      logger.info('Subscription marked for cancellation', {
        organizationId: args.organizationId,
        subscriptionId: org.stripeSubscriptionId,
      })

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to cancel subscription', error, {
        organizationId: args.organizationId,
        message,
      })
      return { success: false, error: message }
    }
  },
})

// ============================================================================
// INTERNAL MUTATIONS - Called by webhook handlers
// ============================================================================

/**
 * Handle successful subscription checkout completion
 */
export const handleSubscriptionCheckoutComplete = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    subscriptionId: v.string(),
    plan: v.string(),
    customerId: v.string(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const planConfig = PLANS[args.plan as PlanKey]
    if (!planConfig) {
      logger.error('Invalid plan in subscription checkout', { plan: args.plan })
      throw new Error(`Invalid plan: ${args.plan}`)
    }

    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.customerId,
      stripeSubscriptionId: args.subscriptionId,
      subscriptionStatus: 'active',
      currentPeriodEnd: args.currentPeriodEnd * 1000, // Convert to milliseconds
      plan: args.plan as 'free' | 'pro' | 'business' | 'enterprise',
      maxMembers: planConfig.maxMembers,
      maxEvents: planConfig.maxEvents === Infinity ? undefined : planConfig.maxEvents,
      updatedAt: Date.now(),
    })

    logger.info('Organization plan updated after checkout', {
      organizationId: args.organizationId,
      plan: args.plan,
      subscriptionId: args.subscriptionId,
    })
  },
})

/**
 * Handle subscription updates (status changes, plan changes)
 */
export const handleSubscriptionUpdated = internalMutation({
  args: {
    subscriptionId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    priceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find organization by subscription ID
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_stripe_subscription', (q) => q.eq('stripeSubscriptionId', args.subscriptionId))
      .first()

    if (!org) {
      logger.warn('Organization not found for subscription update', {
        subscriptionId: args.subscriptionId,
      })
      return
    }

    // Map Stripe status to our status type
    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      trialing: 'trialing',
      incomplete: 'incomplete',
      incomplete_expired: 'incomplete_expired',
      unpaid: 'unpaid',
    }

    const subscriptionStatus = statusMap[args.status] || 'active'

    await ctx.db.patch(org._id, {
      subscriptionStatus: subscriptionStatus as
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'trialing'
        | 'incomplete'
        | 'incomplete_expired'
        | 'unpaid',
      currentPeriodEnd: args.currentPeriodEnd * 1000,
      updatedAt: Date.now(),
    })

    logger.info('Organization subscription updated', {
      organizationId: org._id,
      subscriptionId: args.subscriptionId,
      status: subscriptionStatus,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
    })
  },
})

/**
 * Handle subscription deletion (cancellation completed)
 */
export const handleSubscriptionDeleted = internalMutation({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find organization by subscription ID
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_stripe_subscription', (q) => q.eq('stripeSubscriptionId', args.subscriptionId))
      .first()

    if (!org) {
      logger.warn('Organization not found for subscription deletion', {
        subscriptionId: args.subscriptionId,
      })
      return
    }

    // Downgrade to free plan
    const freePlan = PLANS.free

    await ctx.db.patch(org._id, {
      stripeSubscriptionId: undefined,
      subscriptionStatus: 'canceled',
      plan: 'free',
      maxMembers: freePlan.maxMembers,
      maxEvents: freePlan.maxEvents,
      updatedAt: Date.now(),
    })

    logger.info('Organization downgraded to free plan after subscription deletion', {
      organizationId: org._id,
      subscriptionId: args.subscriptionId,
    })
  },
})

/**
 * Handle failed subscription payment
 */
export const handleSubscriptionPaymentFailed = internalMutation({
  args: {
    subscriptionId: v.string(),
    attemptCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Find organization by subscription ID
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_stripe_subscription', (q) => q.eq('stripeSubscriptionId', args.subscriptionId))
      .first()

    if (!org) {
      logger.warn('Organization not found for payment failure', {
        subscriptionId: args.subscriptionId,
      })
      return
    }

    // Update status to past_due
    await ctx.db.patch(org._id, {
      subscriptionStatus: 'past_due',
      updatedAt: Date.now(),
    })

    logger.warn('Organization subscription payment failed', {
      organizationId: org._id,
      subscriptionId: args.subscriptionId,
      attemptCount: args.attemptCount,
    })

    // TODO: Send notification to organization owner about failed payment
  },
})

// ============================================================================
// INTERNAL QUERIES - For permission checks in actions
// ============================================================================

import { getCurrentUser } from './lib/auth'

/**
 * Internal mutation to check billing permission and log security events
 * Used by actions that need to verify billing access
 * Note: This is a mutation (not query) because it logs audit events
 */
export const checkBillingPermissionInternal = internalMutation({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)

    if (!user) {
      return {
        authorized: false as const,
        organization: null as null,
        reason: 'Authentication required',
      }
    }

    const organization = await ctx.db.get(args.organizationId)
    if (!organization) {
      return {
        authorized: false as const,
        organization: null as null,
        reason: 'Organization not found',
      }
    }

    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .first()

    if (!membership || membership.status !== 'active') {
      // Log the blocked access attempt
      await ctx.db.insert('auditLogs', {
        userId: user._id,
        userEmail: user.email,
        action: 'billing_access_denied',
        resource: 'billing',
        resourceId: args.organizationId,
        metadata: {
          reason: 'Not a member of organization',
          membershipStatus: membership?.status,
        },
        status: 'blocked',
        createdAt: Date.now(),
      })

      return {
        authorized: false as const,
        organization,
        reason: 'Not authorized to manage billing for this organization',
      }
    }

    const billingRoles = ['owner', 'admin']
    if (!billingRoles.includes(membership.role)) {
      // Log the blocked access attempt
      await ctx.db.insert('auditLogs', {
        userId: user._id,
        userEmail: user.email,
        action: 'billing_access_denied',
        resource: 'billing',
        resourceId: args.organizationId,
        metadata: {
          reason: 'Insufficient role',
          userRole: membership.role,
          requiredRoles: billingRoles,
        },
        status: 'blocked',
        createdAt: Date.now(),
      })

      return {
        authorized: false as const,
        organization,
        reason: 'Only owners and admins can manage billing',
      }
    }

    return {
      authorized: true as const,
      organization,
      reason: undefined,
    }
  },
})

/**
 * Internal mutation to log security events for billing operations
 * This allows actions to create audit trail entries
 */
export const logBillingSecurityEvent = internalMutation({
  args: {
    userId: v.optional(v.id('users')),
    organizationId: v.id('organizations'),
    action: v.string(),
    status: v.union(v.literal('success'), v.literal('failure'), v.literal('blocked')),
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get user email if userId is provided
    let userEmail: string | undefined
    if (args.userId) {
      const user = await ctx.db.get(args.userId)
      userEmail = user?.email
    }

    await ctx.db.insert('auditLogs', {
      userId: args.userId,
      userEmail,
      action: args.action,
      resource: 'billing',
      resourceId: args.organizationId,
      metadata: {
        organizationId: args.organizationId,
        reason: args.reason,
        ...args.metadata,
      },
      status: args.status,
      createdAt: Date.now(),
    })
  },
})
