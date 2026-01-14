/**
 * Payment Audit Logging Service
 *
 * Comprehensive audit logging for all payment-related events.
 * Tracks charges, refunds, disputes, and other payment operations
 * with full details for compliance and auditing.
 *
 * Requirements: 12.6
 * Property 47: Payment Event Audit Logging
 */

import { v } from 'convex/values'
import { internalMutation, internalQuery } from '../../_generated/server'
import type { Id } from '../../_generated/dataModel'
import { logger } from '../monitoring/logger'

// ============================================================================
// Types
// ============================================================================

/**
 * Payment event types for audit logging
 */
export type PaymentEventType =
  | 'checkout_initiated'
  | 'checkout_completed'
  | 'checkout_expired'
  | 'checkout_cancelled'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_processing'
  | 'refund_initiated'
  | 'refund_completed'
  | 'refund_failed'
  | 'partial_refund_completed'
  | 'dispute_created'
  | 'dispute_updated'
  | 'dispute_won'
  | 'dispute_lost'
  | 'dispute_closed'
  | 'chargeback_created'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'invoice_paid'
  | 'invoice_failed'

/**
 * Payment audit log entry
 */
export interface PaymentAuditEntry {
  /** Type of payment event */
  eventType: PaymentEventType
  /** Order ID (internal) */
  orderId: string
  /** Human-readable order number */
  orderNumber: string
  /** Payment amount in smallest currency unit (cents) */
  amount: number
  /** Currency code (e.g., 'usd') */
  currency: string
  /** User ID who initiated the action (if applicable) */
  userId?: string
  /** Buyer email address */
  buyerEmail?: string
  /** Event ID associated with the order */
  eventId?: string
  /** Stripe event ID (from webhook) */
  stripeEventId?: string
  /** Stripe payment intent ID */
  stripePaymentIntentId?: string
  /** Stripe charge ID */
  stripeChargeId?: string
  /** Stripe refund ID */
  stripeRefundId?: string
  /** Stripe dispute ID */
  stripeDisputeId?: string
  /** Stripe session ID */
  stripeSessionId?: string
  /** Payment method type (e.g., 'card') */
  paymentMethod?: string
  /** Card brand (e.g., 'visa', 'mastercard') */
  cardBrand?: string
  /** Last 4 digits of card */
  cardLast4?: string
  /** Refund reason (for refund events) */
  refundReason?: string
  /** Dispute reason (for dispute events) */
  disputeReason?: string
  /** Error message (for failed events) */
  errorMessage?: string
  /** Error code (for failed events) */
  errorCode?: string
  /** IP address of the request */
  ipAddress?: string
  /** User agent of the request */
  userAgent?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Sanitized payment audit entry (no sensitive data)
 */
export interface SanitizedPaymentAuditEntry extends Omit<
  PaymentAuditEntry,
  'buyerEmail' | 'cardLast4'
> {
  /** Masked buyer email */
  buyerEmailMasked?: string
  /** Whether card info was present */
  hasCardInfo?: boolean
}

// ============================================================================
// Sensitive Data Patterns
// ============================================================================

/**
 * Fields that should never be logged
 */
const SENSITIVE_FIELDS = [
  'cardNumber',
  'card_number',
  'creditCard',
  'credit_card',
  'cvv',
  'cvc',
  'cvv2',
  'cvc2',
  'securityCode',
  'security_code',
  'pan',
  'expiry',
  'exp_month',
  'exp_year',
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Mask email address for logging
 * Example: john.doe@example.com -> jo***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '***@***'
  }

  const [local, domain] = email.split('@')
  if (!local || !domain) {
    return '***@***'
  }

  const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***'

  return `${maskedLocal}@${domain}`
}

/**
 * Sanitize metadata to remove sensitive fields
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(metadata)) {
    // Skip prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue
    }

    // Skip sensitive fields
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      continue
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

/**
 * Sanitize a payment audit entry for safe logging
 */
export function sanitizePaymentAuditEntry(entry: PaymentAuditEntry): SanitizedPaymentAuditEntry {
  const sanitized: SanitizedPaymentAuditEntry = {
    eventType: entry.eventType,
    orderId: entry.orderId,
    orderNumber: entry.orderNumber,
    amount: entry.amount,
    currency: entry.currency,
    userId: entry.userId,
    eventId: entry.eventId,
    stripeEventId: entry.stripeEventId,
    stripePaymentIntentId: entry.stripePaymentIntentId,
    stripeChargeId: entry.stripeChargeId,
    stripeRefundId: entry.stripeRefundId,
    stripeDisputeId: entry.stripeDisputeId,
    stripeSessionId: entry.stripeSessionId,
    paymentMethod: entry.paymentMethod,
    cardBrand: entry.cardBrand,
    refundReason: entry.refundReason,
    disputeReason: entry.disputeReason,
    errorMessage: entry.errorMessage,
    errorCode: entry.errorCode,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    metadata: sanitizeMetadata(entry.metadata),
  }

  // Mask email
  if (entry.buyerEmail) {
    sanitized.buyerEmailMasked = maskEmail(entry.buyerEmail)
  }

  // Indicate card info presence without exposing details
  if (entry.cardLast4 || entry.cardBrand) {
    sanitized.hasCardInfo = true
  }

  return sanitized
}

/**
 * Validate that a payment audit entry has required fields
 */
export function validatePaymentAuditEntry(entry: Partial<PaymentAuditEntry>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!entry.eventType) {
    errors.push('eventType is required')
  }

  if (!entry.orderId) {
    errors.push('orderId is required')
  }

  if (!entry.orderNumber) {
    errors.push('orderNumber is required')
  }

  if (entry.amount === undefined || entry.amount === null) {
    errors.push('amount is required')
  } else if (typeof entry.amount !== 'number' || entry.amount < 0) {
    errors.push('amount must be a non-negative number')
  }

  if (!entry.currency) {
    errors.push('currency is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Check if an event type is a payment event
 */
export function isPaymentEventType(eventType: string): eventType is PaymentEventType {
  const validEventTypes: PaymentEventType[] = [
    'checkout_initiated',
    'checkout_completed',
    'checkout_expired',
    'checkout_cancelled',
    'payment_succeeded',
    'payment_failed',
    'payment_processing',
    'refund_initiated',
    'refund_completed',
    'refund_failed',
    'partial_refund_completed',
    'dispute_created',
    'dispute_updated',
    'dispute_won',
    'dispute_lost',
    'dispute_closed',
    'chargeback_created',
    'subscription_created',
    'subscription_cancelled',
    'invoice_paid',
    'invoice_failed',
  ]

  return validEventTypes.includes(eventType as PaymentEventType)
}

/**
 * Get event category from event type
 */
export function getEventCategory(
  eventType: PaymentEventType
): 'checkout' | 'payment' | 'refund' | 'dispute' | 'subscription' | 'invoice' {
  if (eventType.startsWith('checkout_')) return 'checkout'
  if (eventType.startsWith('payment_')) return 'payment'
  if (eventType.startsWith('refund_') || eventType === 'partial_refund_completed') return 'refund'
  if (eventType.startsWith('dispute_') || eventType === 'chargeback_created') return 'dispute'
  if (eventType.startsWith('subscription_')) return 'subscription'
  if (eventType.startsWith('invoice_')) return 'invoice'
  return 'payment'
}

/**
 * Determine if an event type indicates a failure
 */
export function isFailureEvent(eventType: PaymentEventType): boolean {
  return [
    'payment_failed',
    'refund_failed',
    'dispute_lost',
    'invoice_failed',
    'checkout_expired',
    'checkout_cancelled',
  ].includes(eventType)
}

/**
 * Determine if an event type indicates success
 */
export function isSuccessEvent(eventType: PaymentEventType): boolean {
  return [
    'checkout_completed',
    'payment_succeeded',
    'refund_completed',
    'partial_refund_completed',
    'dispute_won',
    'invoice_paid',
  ].includes(eventType)
}

// ============================================================================
// Payment Audit Logger Class
// ============================================================================

/**
 * Context type for PaymentAuditLogger - accepts any object with runMutation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuditLogContext = { runMutation: (...args: any[]) => Promise<any> }

/**
 * PaymentAuditLogger - Service for logging payment events
 */
export class PaymentAuditLogger {
  /**
   * Log a payment event
   */
  static async log(ctx: AuditLogContext, entry: PaymentAuditEntry): Promise<void> {
    // Validate entry
    const validation = validatePaymentAuditEntry(entry)
    if (!validation.isValid) {
      logger.warn('Invalid payment audit entry', {
        errors: validation.errors,
        eventType: entry.eventType,
        orderId: entry.orderId,
      })
      // Still log but with warning
    }

    // Sanitize and log
    const sanitized = sanitizePaymentAuditEntry(entry)

    // Log to structured logger
    logger.info(`Payment event: ${entry.eventType}`, {
      ...sanitized,
      timestamp: Date.now(),
    })

    // Store in audit log database
    await ctx.runMutation(logPaymentEventInternal, {
      eventType: entry.eventType,
      orderId: entry.orderId,
      orderNumber: entry.orderNumber,
      amount: entry.amount,
      currency: entry.currency,
      userId: entry.userId,
      buyerEmail: entry.buyerEmail,
      eventId: entry.eventId,
      stripeEventId: entry.stripeEventId,
      stripePaymentIntentId: entry.stripePaymentIntentId,
      stripeChargeId: entry.stripeChargeId,
      stripeRefundId: entry.stripeRefundId,
      stripeDisputeId: entry.stripeDisputeId,
      stripeSessionId: entry.stripeSessionId,
      paymentMethod: entry.paymentMethod,
      cardBrand: entry.cardBrand,
      cardLast4: entry.cardLast4,
      refundReason: entry.refundReason,
      disputeReason: entry.disputeReason,
      errorMessage: entry.errorMessage,
      errorCode: entry.errorCode,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.metadata,
    })
  }

  /**
   * Log a checkout event
   */
  static async logCheckout(
    ctx: AuditLogContext,
    eventType:
      | 'checkout_initiated'
      | 'checkout_completed'
      | 'checkout_expired'
      | 'checkout_cancelled',
    details: Omit<PaymentAuditEntry, 'eventType'>
  ): Promise<void> {
    await PaymentAuditLogger.log(ctx, { ...details, eventType })
  }

  /**
   * Log a payment event
   */
  static async logPayment(
    ctx: AuditLogContext,
    eventType: 'payment_succeeded' | 'payment_failed' | 'payment_processing',
    details: Omit<PaymentAuditEntry, 'eventType'>
  ): Promise<void> {
    await PaymentAuditLogger.log(ctx, { ...details, eventType })
  }

  /**
   * Log a refund event
   */
  static async logRefund(
    ctx: AuditLogContext,
    eventType:
      | 'refund_initiated'
      | 'refund_completed'
      | 'refund_failed'
      | 'partial_refund_completed',
    details: Omit<PaymentAuditEntry, 'eventType'>
  ): Promise<void> {
    await PaymentAuditLogger.log(ctx, { ...details, eventType })
  }

  /**
   * Log a dispute event
   */
  static async logDispute(
    ctx: AuditLogContext,
    eventType:
      | 'dispute_created'
      | 'dispute_updated'
      | 'dispute_won'
      | 'dispute_lost'
      | 'dispute_closed'
      | 'chargeback_created',
    details: Omit<PaymentAuditEntry, 'eventType'>
  ): Promise<void> {
    await PaymentAuditLogger.log(ctx, { ...details, eventType })
  }
}

// ============================================================================
// Internal Mutations
// ============================================================================

/**
 * Internal mutation to log a payment event to the audit log
 */
export const logPaymentEventInternal = internalMutation({
  args: {
    eventType: v.string(),
    orderId: v.string(),
    orderNumber: v.string(),
    amount: v.number(),
    currency: v.string(),
    userId: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
    eventId: v.optional(v.string()),
    stripeEventId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    stripeRefundId: v.optional(v.string()),
    stripeDisputeId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    refundReason: v.optional(v.string()),
    disputeReason: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Convert userId string to Id<'users'> if valid
    let userIdTyped: Id<'users'> | undefined
    if (args.userId) {
      try {
        userIdTyped = args.userId as Id<'users'>
      } catch {
        userIdTyped = undefined
      }
    }

    // Determine status based on event type
    const status = isFailureEvent(args.eventType as PaymentEventType) ? 'failure' : 'success'

    // Insert into audit log
    await ctx.db.insert('auditLogs', {
      userId: userIdTyped,
      userEmail: args.buyerEmail ? maskEmail(args.buyerEmail) : undefined,
      action: `payment_${args.eventType}`,
      resource: 'payment',
      resourceId: args.orderId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: {
        eventType: args.eventType,
        orderNumber: args.orderNumber,
        amount: args.amount,
        currency: args.currency,
        eventId: args.eventId,
        stripeEventId: args.stripeEventId,
        stripePaymentIntentId: args.stripePaymentIntentId,
        stripeChargeId: args.stripeChargeId,
        stripeRefundId: args.stripeRefundId,
        stripeDisputeId: args.stripeDisputeId,
        stripeSessionId: args.stripeSessionId,
        paymentMethod: args.paymentMethod,
        cardBrand: args.cardBrand,
        hasCardInfo: !!args.cardLast4,
        refundReason: args.refundReason,
        disputeReason: args.disputeReason,
        errorCode: args.errorCode,
        category: getEventCategory(args.eventType as PaymentEventType),
        ...sanitizeMetadata(args.metadata),
      },
      status,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    })
  },
})

/**
 * Query payment audit logs by order
 */
export const getPaymentAuditLogsByOrder = internalQuery({
  args: {
    orderId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    const logs = await ctx.db
      .query('auditLogs')
      .withIndex('by_resource', (q) => q.eq('resource', 'payment').eq('resourceId', args.orderId))
      .order('desc')
      .take(limit)

    return logs
  },
})

/**
 * Query payment audit logs by date range
 */
export const getPaymentAuditLogsByDateRange = internalQuery({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000

    const logs = await ctx.db
      .query('auditLogs')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('createdAt'), args.startDate),
          q.lte(q.field('createdAt'), args.endDate),
          q.eq(q.field('resource'), 'payment')
        )
      )
      .order('desc')
      .take(limit)

    return logs
  },
})

/**
 * Query failed payment events
 */
export const getFailedPaymentEvents = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    const logs = await ctx.db
      .query('auditLogs')
      .withIndex('by_status', (q) => q.eq('status', 'failure'))
      .filter((q) => q.eq(q.field('resource'), 'payment'))
      .order('desc')
      .take(limit)

    return logs
  },
})
