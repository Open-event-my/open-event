/**
 * Refund Service
 *
 * Handles refund operations including:
 * - Full refunds
 * - Partial refunds
 * - Refund validation
 * - Refund status tracking
 *
 * Requirements: 12.7
 */

import { logger } from '../monitoring/logger'

// ============================================================================
// Types
// ============================================================================

/**
 * Refund request input
 */
export interface RefundRequest {
  /** Order ID to refund */
  orderId: string
  /** Order number for display */
  orderNumber: string
  /** Total order amount in cents */
  orderTotal: number
  /** Amount to refund in cents (optional, defaults to full refund) */
  refundAmount?: number
  /** Reason for refund */
  reason?: string
  /** Currency code */
  currency: string
  /** Stripe payment intent ID */
  stripePaymentIntentId?: string
  /** Current payment status */
  paymentStatus: string
  /** User ID requesting the refund */
  requestedBy: string
}

/**
 * Refund validation result
 */
export interface RefundValidationResult {
  /** Whether the refund request is valid */
  isValid: boolean
  /** Validation errors */
  errors: string[]
  /** Validation warnings */
  warnings: string[]
  /** Calculated refund amount */
  refundAmount: number
  /** Whether this is a partial refund */
  isPartial: boolean
}

/**
 * Refund result
 */
export interface RefundResult {
  /** Whether the refund was successful */
  success: boolean
  /** Stripe refund ID */
  refundId?: string
  /** Amount refunded in cents */
  amount: number
  /** Whether this was a partial refund */
  isPartial: boolean
  /** Error message if failed */
  errorMessage?: string
  /** User-friendly message */
  userMessage: string
}

/**
 * Refund status
 */
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

/**
 * Refund record for tracking
 */
export interface RefundRecord {
  /** Order ID */
  orderId: string
  /** Order number */
  orderNumber: string
  /** Stripe refund ID */
  stripeRefundId?: string
  /** Amount refunded in cents */
  amount: number
  /** Currency */
  currency: string
  /** Refund status */
  status: RefundStatus
  /** Reason for refund */
  reason?: string
  /** Whether this is a partial refund */
  isPartial: boolean
  /** User who requested the refund */
  requestedBy: string
  /** Timestamp when refund was requested */
  requestedAt: number
  /** Timestamp when refund was completed */
  completedAt?: number
  /** Error message if failed */
  errorMessage?: string
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates a refund request
 */
export function validateRefundRequest(request: RefundRequest): RefundValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check order ID
  if (!request.orderId) {
    errors.push('Order ID is required')
  }

  // Check payment status - can only refund completed orders
  if (request.paymentStatus !== 'completed') {
    errors.push(
      `Cannot refund order with status: ${request.paymentStatus}. Only completed orders can be refunded.`
    )
  }

  // Check Stripe payment intent
  if (!request.stripePaymentIntentId) {
    errors.push('No payment intent found for this order. Was the payment completed through Stripe?')
  }

  // Validate refund amount
  const refundAmount = request.refundAmount ?? request.orderTotal

  if (refundAmount <= 0) {
    errors.push('Refund amount must be greater than zero')
  }

  if (refundAmount > request.orderTotal) {
    errors.push(
      `Refund amount (${formatCents(refundAmount)}) cannot exceed order total (${formatCents(request.orderTotal)})`
    )
  }

  // Check for very small refunds
  if (refundAmount < 50) {
    // Less than $0.50
    warnings.push('Refund amount is very small. Stripe may have minimum refund requirements.')
  }

  // Check for partial refund
  const isPartial = refundAmount < request.orderTotal
  if (isPartial) {
    warnings.push(
      `This is a partial refund of ${formatCents(refundAmount)} out of ${formatCents(request.orderTotal)}`
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    refundAmount,
    isPartial,
  }
}

/**
 * Validates that a user can perform a refund on an order
 */
export function canUserRefund(
  userId: string,
  orderOrganizerId: string,
  userRole?: string
): { canRefund: boolean; reason?: string } {
  // Superadmins can refund any order
  if (userRole === 'superadmin') {
    return { canRefund: true }
  }

  // Admins can refund any order
  if (userRole === 'admin') {
    return { canRefund: true }
  }

  // Organizers can only refund their own events' orders
  if (userId === orderOrganizerId) {
    return { canRefund: true }
  }

  return {
    canRefund: false,
    reason: 'You do not have permission to refund this order',
  }
}

/**
 * Checks if an order has already been refunded
 */
export function isOrderRefunded(
  paymentStatus: string,
  refundedAt?: number,
  refundAmount?: number,
  orderTotal?: number
): { isRefunded: boolean; isPartiallyRefunded: boolean } {
  if (paymentStatus === 'refunded') {
    return { isRefunded: true, isPartiallyRefunded: false }
  }

  if (refundedAt && refundAmount && orderTotal) {
    const isPartiallyRefunded = refundAmount < orderTotal
    return { isRefunded: true, isPartiallyRefunded }
  }

  return { isRefunded: false, isPartiallyRefunded: false }
}

/**
 * Calculates the maximum refundable amount for an order
 */
export function calculateMaxRefundableAmount(
  orderTotal: number,
  previousRefundAmount?: number
): number {
  const alreadyRefunded = previousRefundAmount ?? 0
  return Math.max(0, orderTotal - alreadyRefunded)
}

// ============================================================================
// Refund Processing
// ============================================================================

/**
 * Creates a refund record for tracking
 */
export function createRefundRecord(
  request: RefundRequest,
  validation: RefundValidationResult
): RefundRecord {
  return {
    orderId: request.orderId,
    orderNumber: request.orderNumber,
    amount: validation.refundAmount,
    currency: request.currency,
    status: 'pending',
    reason: request.reason,
    isPartial: validation.isPartial,
    requestedBy: request.requestedBy,
    requestedAt: Date.now(),
  }
}

/**
 * Updates a refund record with completion status
 */
export function completeRefundRecord(
  record: RefundRecord,
  success: boolean,
  stripeRefundId?: string,
  errorMessage?: string
): RefundRecord {
  return {
    ...record,
    status: success ? 'completed' : 'failed',
    stripeRefundId,
    completedAt: Date.now(),
    errorMessage,
  }
}

/**
 * Creates a user-friendly refund result message
 */
export function createRefundResultMessage(
  success: boolean,
  amount: number,
  currency: string,
  isPartial: boolean,
  errorMessage?: string
): string {
  if (success) {
    const formattedAmount = formatCents(amount, currency)
    if (isPartial) {
      return `Partial refund of ${formattedAmount} processed successfully`
    }
    return `Full refund of ${formattedAmount} processed successfully`
  }

  return errorMessage || 'Refund could not be processed. Please try again or contact support.'
}

/**
 * Determines if a refund error is retryable
 */
export function isRefundErrorRetryable(errorMessage: string): boolean {
  const retryablePatterns = [
    /network/i,
    /timeout/i,
    /temporarily/i,
    /try again/i,
    /rate limit/i,
    /service unavailable/i,
  ]

  return retryablePatterns.some((pattern) => pattern.test(errorMessage))
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats cents to a currency string
 */
export function formatCents(cents: number, currency: string = 'USD'): string {
  const amount = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * Logs a refund event
 */
export function logRefundEvent(
  eventType: 'refund_requested' | 'refund_validated' | 'refund_completed' | 'refund_failed',
  record: RefundRecord,
  additionalContext?: Record<string, unknown>
): void {
  logger.info(`Refund event: ${eventType}`, {
    eventType,
    orderId: record.orderId,
    orderNumber: record.orderNumber,
    amount: record.amount,
    currency: record.currency,
    status: record.status,
    isPartial: record.isPartial,
    requestedBy: record.requestedBy,
    ...additionalContext,
  })
}

/**
 * Sanitizes refund reason for storage (removes PII, limits length)
 */
export function sanitizeRefundReason(reason?: string): string | undefined {
  if (!reason) return undefined

  // Limit length
  let sanitized = reason.substring(0, 500)

  // Remove potential PII patterns (emails, phone numbers)
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]')
  sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')

  return sanitized.trim()
}
