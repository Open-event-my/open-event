/**
 * Payment Security Service
 *
 * Ensures PCI-compliant payment handling:
 * - No credit card storage (only Stripe tokens)
 * - Webhook signature verification
 * - Server-side payment validation
 * - Idempotency for payment operations
 * - Fraud detection
 */

import Stripe from 'stripe'
import { logger } from '../monitoring/logger'

// Patterns that indicate credit card data
const CREDIT_CARD_PATTERNS = {
  // Full card number patterns (13-19 digits)
  cardNumber:
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/,
  // CVV/CVC patterns (3-4 digits in context)
  cvv: /\b(?:cvv|cvc|cvv2|cvc2|security.?code)[:\s]*[0-9]{3,4}\b/i,
  // Expiry date patterns
  expiry: /\b(?:exp(?:iry|iration)?[:\s]*)?(?:0[1-9]|1[0-2])[/-](?:[0-9]{2}|[0-9]{4})\b/i,
}

// Fields that should never contain card data
const SENSITIVE_FIELD_NAMES = [
  'cardNumber',
  'card_number',
  'creditCard',
  'credit_card',
  'ccNumber',
  'cc_number',
  'pan',
  'cvv',
  'cvc',
  'cvv2',
  'cvc2',
  'securityCode',
  'security_code',
]

// Allowed Stripe token prefixes
const STRIPE_TOKEN_PREFIXES = [
  'pi_', // Payment Intent
  'cs_', // Checkout Session
  'cus_', // Customer
  'pm_', // Payment Method
  'ch_', // Charge
  're_', // Refund
  'tok_', // Token
  'src_', // Source
  'sub_', // Subscription
  'in_', // Invoice
]

export interface PaymentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface FraudCheckResult {
  isSuspicious: boolean
  riskScore: number
  reasons: string[]
  shouldAlert: boolean
}

export interface WebhookVerificationResult {
  isValid: boolean
  event: Stripe.Event | null
  error?: string
  errorType?: WebhookVerificationErrorType
}

/**
 * Validates that a value does not contain credit card data
 */
export function containsCreditCardData(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    // Check for card number patterns
    if (CREDIT_CARD_PATTERNS.cardNumber.test(value.replace(/[\s-]/g, ''))) {
      return true
    }
    // Check for CVV patterns
    if (CREDIT_CARD_PATTERNS.cvv.test(value)) {
      return true
    }
    return false
  }

  if (typeof value === 'number') {
    // Check if number looks like a card number (13-19 digits)
    const numStr = value.toString()
    if (numStr.length >= 13 && numStr.length <= 19 && /^\d+$/.test(numStr)) {
      return CREDIT_CARD_PATTERNS.cardNumber.test(numStr)
    }
    return false
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsCreditCardData(item))
  }

  if (typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      // Check if field name suggests card data
      if (SENSITIVE_FIELD_NAMES.some((name) => key.toLowerCase().includes(name.toLowerCase()))) {
        if (val !== null && val !== undefined && String(val).length > 0) {
          return true
        }
      }
      // Recursively check nested values
      if (containsCreditCardData(val)) {
        return true
      }
    }
  }

  return false
}

/**
 * Validates that only Stripe tokens are stored, not raw card data
 */
export function isValidStripeToken(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  return STRIPE_TOKEN_PREFIXES.some((prefix) => value.startsWith(prefix))
}

/**
 * Validates payment data before storage
 */
export function validatePaymentDataForStorage(
  data: Record<string, unknown>
): PaymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for credit card data
  if (containsCreditCardData(data)) {
    errors.push('Payment data contains credit card information which must not be stored')
  }

  // Validate Stripe references
  const stripeFields = ['stripePaymentIntentId', 'stripeSessionId', 'stripeCustomerId']
  for (const field of stripeFields) {
    const value = data[field]
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        errors.push(`${field} must be a string`)
      } else if (value.length > 0 && !isValidStripeToken(value)) {
        warnings.push(`${field} does not appear to be a valid Stripe token`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Webhook signature verification error types
 */
export type WebhookVerificationErrorType =
  | 'missing_payload'
  | 'missing_signature'
  | 'missing_secret'
  | 'invalid_signature'
  | 'expired_timestamp'
  | 'invalid_payload'
  | 'unknown_error'

export interface WebhookVerificationResult {
  isValid: boolean
  event: Stripe.Event | null
  error?: string
  errorType?: WebhookVerificationErrorType
}

/**
 * Validates webhook signature header format
 * Stripe signatures have format: t=timestamp,v1=signature[,v0=signature]
 */
export function isValidSignatureFormat(signature: string): boolean {
  if (!signature || typeof signature !== 'string') {
    return false
  }

  // Must contain timestamp and at least one signature version
  const hasTimestamp = /t=\d+/.test(signature)
  const hasSignature = /v1=[a-f0-9]+/i.test(signature)

  return hasTimestamp && hasSignature
}

/**
 * Extracts timestamp from Stripe webhook signature
 */
export function extractSignatureTimestamp(signature: string): number | null {
  if (!signature) return null

  const match = signature.match(/t=(\d+)/)
  if (!match) return null

  return parseInt(match[1], 10)
}

/**
 * Checks if webhook timestamp is within acceptable tolerance (5 minutes)
 */
export function isTimestampValid(timestamp: number, toleranceSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - timestamp) <= toleranceSeconds
}

/**
 * Verifies Stripe webhook signature
 *
 * This function validates that:
 * 1. All required parameters are present
 * 2. The signature format is valid
 * 3. The timestamp is within acceptable range (prevents replay attacks)
 * 4. The cryptographic signature matches the payload
 *
 * @param payload - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @param webhookSecret - Webhook endpoint secret from Stripe dashboard
 * @returns WebhookVerificationResult with validation status and parsed event
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
): WebhookVerificationResult {
  // Validate required parameters
  if (!payload) {
    logger.warn('Webhook verification failed: missing payload')
    return {
      isValid: false,
      event: null,
      error: 'Missing webhook payload',
      errorType: 'missing_payload',
    }
  }

  if (!signature) {
    logger.warn('Webhook verification failed: missing signature header')
    return {
      isValid: false,
      event: null,
      error: 'Missing Stripe-Signature header',
      errorType: 'missing_signature',
    }
  }

  if (!webhookSecret) {
    logger.error('Webhook verification failed: webhook secret not configured')
    return {
      isValid: false,
      event: null,
      error: 'Webhook secret not configured',
      errorType: 'missing_secret',
    }
  }

  // Validate signature format
  if (!isValidSignatureFormat(signature)) {
    logger.warn('Webhook verification failed: invalid signature format', {
      signaturePreview: signature.substring(0, 20) + '...',
    })
    return {
      isValid: false,
      event: null,
      error: 'Invalid signature format',
      errorType: 'invalid_signature',
    }
  }

  // Check timestamp to prevent replay attacks
  const timestamp = extractSignatureTimestamp(signature)
  if (timestamp && !isTimestampValid(timestamp)) {
    logger.warn('Webhook verification failed: timestamp outside tolerance', {
      timestamp,
      now: Math.floor(Date.now() / 1000),
    })
    return {
      isValid: false,
      event: null,
      error: 'Webhook timestamp outside tolerance window (possible replay attack)',
      errorType: 'expired_timestamp',
    }
  }

  try {
    // Create a temporary Stripe instance for verification
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2025-12-15.clover',
    })

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)

    logger.info('Webhook signature verified successfully', {
      eventId: event.id,
      eventType: event.type,
    })

    return {
      isValid: true,
      event,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown verification error'

    // Determine error type from Stripe error message
    let errorType: WebhookVerificationErrorType = 'unknown_error'
    if (message.includes('signature')) {
      errorType = 'invalid_signature'
    } else if (message.includes('timestamp')) {
      errorType = 'expired_timestamp'
    } else if (message.includes('JSON') || message.includes('parse')) {
      errorType = 'invalid_payload'
    }

    logger.warn('Webhook signature verification failed', {
      error: message,
      errorType,
    })

    return {
      isValid: false,
      event: null,
      error: message,
      errorType,
    }
  }
}

/**
 * Creates a standardized error response for webhook verification failures
 */
export function createWebhookErrorResponse(result: WebhookVerificationResult): {
  status: number
  body: Record<string, unknown>
} {
  const statusMap: Record<WebhookVerificationErrorType, number> = {
    missing_payload: 400,
    missing_signature: 400,
    missing_secret: 500,
    invalid_signature: 401,
    expired_timestamp: 401,
    invalid_payload: 400,
    unknown_error: 500,
  }

  const status = result.errorType ? statusMap[result.errorType] : 400

  return {
    status,
    body: {
      error: result.error || 'Webhook verification failed',
      errorType: result.errorType,
    },
  }
}

/**
 * Validates payment amount server-side
 */
export function validatePaymentAmount(
  requestedAmount: number,
  expectedAmount: number,
  currency: string
): PaymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Amount must be positive
  if (requestedAmount <= 0) {
    errors.push('Payment amount must be positive')
  }

  // Amount must match expected (within tolerance for rounding)
  const tolerance = 1 // 1 cent tolerance
  if (Math.abs(requestedAmount - expectedAmount) > tolerance) {
    errors.push(`Payment amount mismatch: requested ${requestedAmount}, expected ${expectedAmount}`)
  }

  // Currency validation
  const validCurrencies = ['usd', 'eur', 'gbp', 'myr', 'sgd', 'aud', 'cad']
  if (!validCurrencies.includes(currency.toLowerCase())) {
    warnings.push(`Unusual currency: ${currency}`)
  }

  // Check for suspiciously large amounts (over $10,000)
  if (requestedAmount > 1000000) {
    // 10000.00 in cents
    warnings.push('Large payment amount detected')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// SERVER-SIDE PAYMENT VALIDATION
// ============================================================================

/**
 * Order item for validation
 */
export interface OrderItemForValidation {
  ticketTypeId: string
  ticketTypeName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

/**
 * Order data for server-side validation
 */
export interface OrderForValidation {
  items: OrderItemForValidation[]
  subtotal: number
  discount: number
  fees: number
  total: number
  currency: string
}

/**
 * Ticket type data for validation
 */
export interface TicketTypeForValidation {
  _id: string
  price: number
  currency: string
  isActive: boolean
  quantity?: number
  soldCount: number
  reservedCount?: number
}

/**
 * Server-side payment validation result
 */
export interface ServerSidePaymentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  recalculatedTotal: number
  recalculatedSubtotal: number
  recalculatedFees: number
  amountMismatch: boolean
}

/**
 * Platform fee percentage (must match orders.ts)
 */
const PLATFORM_FEE_PERCENT = 0.03 // 3%

/**
 * Validates payment amounts server-side to prevent client-side manipulation
 *
 * This function:
 * 1. Recalculates all amounts from ticket prices
 * 2. Validates item quantities and prices
 * 3. Validates subtotal, fees, and total calculations
 * 4. Detects any client-side manipulation attempts
 *
 * @param order - The order data to validate
 * @param ticketTypes - Map of ticket type IDs to their data
 * @param promoDiscount - Optional promo code discount amount
 * @returns ServerSidePaymentValidationResult with validation status and recalculated amounts
 */
export function validateServerSidePayment(
  order: OrderForValidation,
  ticketTypes: Map<string, TicketTypeForValidation>,
  promoDiscount: number = 0
): ServerSidePaymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  let recalculatedSubtotal = 0

  // Validate each item
  for (const item of order.items) {
    // Get ticket type from server data
    const ticketType = ticketTypes.get(item.ticketTypeId)

    if (!ticketType) {
      errors.push(`Ticket type not found: ${item.ticketTypeId}`)
      continue
    }

    // Validate ticket is active
    if (!ticketType.isActive) {
      errors.push(`Ticket type is not active: ${item.ticketTypeName}`)
    }

    // Validate quantity is positive
    if (item.quantity <= 0) {
      errors.push(`Invalid quantity for ${item.ticketTypeName}: ${item.quantity}`)
      continue
    }

    // Validate unit price matches server price
    if (item.unitPrice !== ticketType.price) {
      errors.push(
        `Price mismatch for ${item.ticketTypeName}: ` +
          `client sent ${item.unitPrice}, server has ${ticketType.price}`
      )
    }

    // Recalculate item subtotal
    const expectedItemSubtotal = ticketType.price * item.quantity
    if (item.subtotal !== expectedItemSubtotal) {
      errors.push(
        `Subtotal mismatch for ${item.ticketTypeName}: ` +
          `client sent ${item.subtotal}, expected ${expectedItemSubtotal}`
      )
    }

    // Add to recalculated subtotal using server price
    recalculatedSubtotal += ticketType.price * item.quantity

    // Validate currency consistency
    if (ticketType.currency.toLowerCase() !== order.currency.toLowerCase()) {
      errors.push(
        `Currency mismatch for ${item.ticketTypeName}: ` +
          `ticket is ${ticketType.currency}, order is ${order.currency}`
      )
    }
  }

  // Validate subtotal
  if (order.subtotal !== recalculatedSubtotal) {
    errors.push(
      `Order subtotal mismatch: client sent ${order.subtotal}, ` +
        `server calculated ${recalculatedSubtotal}`
    )
  }

  // Validate discount
  const validatedDiscount = Math.min(promoDiscount, recalculatedSubtotal)
  if (order.discount !== validatedDiscount && order.discount !== promoDiscount) {
    warnings.push(
      `Discount amount adjusted: client sent ${order.discount}, ` +
        `validated as ${validatedDiscount}`
    )
  }

  // Recalculate fees and total
  const discountedSubtotal = recalculatedSubtotal - validatedDiscount
  const recalculatedFees = Math.round(discountedSubtotal * PLATFORM_FEE_PERCENT)
  const recalculatedTotal = discountedSubtotal + recalculatedFees

  // Validate fees
  if (order.fees !== recalculatedFees) {
    errors.push(
      `Fees mismatch: client sent ${order.fees}, ` + `server calculated ${recalculatedFees}`
    )
  }

  // Validate total
  const amountMismatch = order.total !== recalculatedTotal
  if (amountMismatch) {
    errors.push(
      `Total mismatch: client sent ${order.total}, ` + `server calculated ${recalculatedTotal}`
    )
  }

  // Check for suspiciously large amounts
  if (recalculatedTotal > 1000000) {
    // Over $10,000
    warnings.push('Large payment amount detected')
  }

  // Validate currency
  const validCurrencies = ['usd', 'eur', 'gbp', 'myr', 'sgd', 'aud', 'cad']
  if (!validCurrencies.includes(order.currency.toLowerCase())) {
    warnings.push(`Unusual currency: ${order.currency}`)
  }

  // Log validation result
  if (errors.length > 0) {
    logger.warn('Server-side payment validation failed', {
      errors,
      orderTotal: order.total,
      recalculatedTotal,
      itemCount: order.items.length,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recalculatedTotal,
    recalculatedSubtotal,
    recalculatedFees,
    amountMismatch,
  }
}

/**
 * Validates that a checkout request has not been tampered with
 *
 * This is a simpler validation for use in the checkout flow
 * when we already have the order from the database.
 *
 * @param orderTotal - Total from the order in database
 * @param lineItemsTotal - Sum of line items being sent to Stripe
 * @param currency - Currency code
 * @returns PaymentValidationResult
 */
export function validateCheckoutAmounts(
  orderTotal: number,
  lineItemsTotal: number,
  currency: string
): PaymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate amounts are positive
  if (orderTotal <= 0) {
    errors.push('Order total must be positive')
  }

  if (lineItemsTotal <= 0) {
    errors.push('Line items total must be positive')
  }

  // Validate amounts match (within 1 cent tolerance for rounding)
  const tolerance = 1
  if (Math.abs(orderTotal - lineItemsTotal) > tolerance) {
    errors.push(
      `Checkout amount mismatch: order total ${orderTotal}, ` + `line items total ${lineItemsTotal}`
    )
  }

  // Validate currency
  const validCurrencies = ['usd', 'eur', 'gbp', 'myr', 'sgd', 'aud', 'cad']
  if (!validCurrencies.includes(currency.toLowerCase())) {
    warnings.push(`Unusual currency: ${currency}`)
  }

  // Check for large amounts
  if (orderTotal > 1000000) {
    warnings.push('Large payment amount detected')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Generates idempotency key for payment operations
 */
export function generateIdempotencyKey(
  orderId: string,
  operation: 'checkout' | 'refund' | 'capture',
  timestamp?: number
): string {
  const ts = timestamp || Date.now()
  // Round to nearest minute to allow retries within a window
  const roundedTs = Math.floor(ts / 60000) * 60000
  return `${operation}_${orderId}_${roundedTs}`
}

/**
 * Generates a Stripe-compatible idempotency key
 * Stripe idempotency keys must be unique per request and max 255 characters
 */
export function generateStripeIdempotencyKey(
  orderId: string,
  operation: 'checkout' | 'refund' | 'capture',
  timestamp?: number
): string {
  const ts = timestamp || Date.now()
  // Use full timestamp for Stripe to ensure uniqueness
  return `stripe_${operation}_${orderId}_${ts}`
}

/**
 * Payment operation types
 */
export type PaymentOperation = 'checkout' | 'refund' | 'capture'

/**
 * Idempotency record status
 */
export type IdempotencyStatus = 'pending' | 'completed' | 'failed'

/**
 * Idempotency check result
 */
export interface IdempotencyCheckResult {
  /** Whether this is a duplicate request */
  isDuplicate: boolean
  /** The idempotency key used */
  idempotencyKey: string
  /** Status of the existing operation (if duplicate) */
  existingStatus?: IdempotencyStatus
  /** Cached result from previous operation (if completed) */
  cachedResult?: unknown
  /** Error message from previous operation (if failed) */
  errorMessage?: string
  /** Stripe idempotency key to use for API calls */
  stripeIdempotencyKey: string
}

/**
 * Idempotency record for storage
 */
export interface IdempotencyRecord {
  idempotencyKey: string
  orderId: string
  operation: PaymentOperation
  status: IdempotencyStatus
  stripeIdempotencyKey: string
  result?: string // JSON-serialized result
  errorMessage?: string
  createdAt: number
  completedAt?: number
  expiresAt: number
}

/**
 * Creates a new idempotency record
 */
export function createIdempotencyRecord(
  orderId: string,
  operation: PaymentOperation,
  timestamp?: number
): IdempotencyRecord {
  const ts = timestamp || Date.now()
  const idempotencyKey = generateIdempotencyKey(orderId, operation, ts)
  const stripeIdempotencyKey = generateStripeIdempotencyKey(orderId, operation, ts)

  return {
    idempotencyKey,
    orderId,
    operation,
    status: 'pending',
    stripeIdempotencyKey,
    createdAt: ts,
    expiresAt: ts + 24 * 60 * 60 * 1000, // 24 hours TTL
  }
}

/**
 * Checks if an idempotency record indicates a duplicate request
 */
export function checkIdempotencyRecord(
  existingRecord: IdempotencyRecord | null,
  orderId: string,
  operation: PaymentOperation,
  timestamp?: number
): IdempotencyCheckResult {
  const ts = timestamp || Date.now()
  const idempotencyKey = generateIdempotencyKey(orderId, operation, ts)
  const stripeIdempotencyKey = generateStripeIdempotencyKey(orderId, operation, ts)

  // No existing record - this is a new request
  if (!existingRecord) {
    return {
      isDuplicate: false,
      idempotencyKey,
      stripeIdempotencyKey,
    }
  }

  // Check if the existing record has expired
  if (existingRecord.expiresAt < ts) {
    // Expired record - treat as new request
    return {
      isDuplicate: false,
      idempotencyKey,
      stripeIdempotencyKey,
    }
  }

  // Existing record found - this is a duplicate
  let cachedResult: unknown
  if (existingRecord.result) {
    try {
      cachedResult = JSON.parse(existingRecord.result)
    } catch {
      // Invalid JSON, ignore cached result
    }
  }

  return {
    isDuplicate: true,
    idempotencyKey: existingRecord.idempotencyKey,
    existingStatus: existingRecord.status,
    cachedResult,
    errorMessage: existingRecord.errorMessage,
    stripeIdempotencyKey: existingRecord.stripeIdempotencyKey,
  }
}

/**
 * Updates an idempotency record with the operation result
 */
export function completeIdempotencyRecord(
  record: IdempotencyRecord,
  status: 'completed' | 'failed',
  result?: unknown,
  errorMessage?: string
): IdempotencyRecord {
  return {
    ...record,
    status,
    result: result ? JSON.stringify(result) : undefined,
    errorMessage,
    completedAt: Date.now(),
  }
}

/**
 * Validates that an idempotency key is properly formatted
 */
export function isValidIdempotencyKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false
  }

  // Format: operation_orderId_timestamp
  const parts = key.split('_')
  if (parts.length < 3) {
    return false
  }

  const operation = parts[0]
  const validOperations = ['checkout', 'refund', 'capture']
  if (!validOperations.includes(operation)) {
    return false
  }

  // Last part should be a timestamp (number)
  const timestamp = parseInt(parts[parts.length - 1], 10)
  if (isNaN(timestamp) || timestamp <= 0) {
    return false
  }

  return true
}

/**
 * Extracts components from an idempotency key
 */
export function parseIdempotencyKey(key: string): {
  operation: PaymentOperation
  orderId: string
  timestamp: number
} | null {
  if (!isValidIdempotencyKey(key)) {
    return null
  }

  const parts = key.split('_')
  const operation = parts[0] as PaymentOperation
  const timestamp = parseInt(parts[parts.length - 1], 10)
  // Order ID is everything between operation and timestamp
  const orderId = parts.slice(1, -1).join('_')

  return {
    operation,
    orderId,
    timestamp,
  }
}

/**
 * Determines if a payment operation should be retried based on idempotency status
 */
export function shouldRetryPaymentOperation(checkResult: IdempotencyCheckResult): {
  shouldRetry: boolean
  reason: string
} {
  if (!checkResult.isDuplicate) {
    return { shouldRetry: true, reason: 'New request' }
  }

  switch (checkResult.existingStatus) {
    case 'pending':
      // Operation is still in progress - don't retry
      return {
        shouldRetry: false,
        reason: 'Operation already in progress',
      }

    case 'completed':
      // Operation already completed successfully - return cached result
      return {
        shouldRetry: false,
        reason: 'Operation already completed',
      }

    case 'failed':
      // Previous attempt failed - allow retry with new idempotency key
      // Note: The caller should generate a new key for the retry
      return {
        shouldRetry: true,
        reason: 'Previous attempt failed, retry allowed',
      }

    default:
      return { shouldRetry: false, reason: 'Unknown status' }
  }
}

/**
 * Fraud detection rules
 */
export interface FraudCheckInput {
  amount: number
  currency: string
  buyerEmail: string
  ipAddress?: string
  previousOrderCount?: number
  previousTotalSpent?: number
  timeSinceLastOrder?: number // milliseconds
  orderId?: string
  orderNumber?: string
  eventId?: string
  userId?: string
  countryCode?: string
  failedAttemptsLastHour?: number
  cardCountry?: string
}

/**
 * Fraud detection thresholds
 */
const FRAUD_THRESHOLDS = {
  largeTransactionAmount: 500000, // $5,000
  veryLargeTransactionAmount: 1000000, // $10,000
  firstTimeBuyerLargeAmount: 100000, // $1,000
  velocityTimeThreshold: 60000, // 1 minute
  unusualSpendingMultiplier: 5,
  failedAttemptsThreshold: 3,
  suspiciousThreshold: 50,
  alertThreshold: 70,
  blockThreshold: 90,
}

/**
 * Suspicious email patterns for fraud detection
 */
const SUSPICIOUS_EMAIL_FRAUD_PATTERNS = [
  /\+.*@/, // Plus addressing
  /^[a-z]{1,2}\d+@/i, // Short prefix with numbers
  /@(tempmail|guerrillamail|10minutemail|throwaway|mailinator|yopmail|fakeinbox|trashmail)/i,
]

/**
 * High-risk countries for additional scrutiny
 */
const HIGH_RISK_COUNTRIES = ['NG', 'GH', 'PK', 'BD', 'VN', 'PH', 'ID', 'IN', 'BR', 'MX']

/**
 * Mask email for logging (privacy)
 */
function maskEmailForFraudLogging(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***'
  return `${maskedLocal}@${domain}`
}

/**
 * Check for fraud indicators in a payment
 * Sends alerts to administrators for high-risk transactions
 *
 * Property 49: Fraud Detection Alerts
 * Validates: Requirements 12.9
 */
export function checkForFraud(input: FraudCheckInput): FraudCheckResult {
  const reasons: string[] = []
  let riskScore = 0

  // Rule 1: Unusually large single transaction
  if (input.amount > FRAUD_THRESHOLDS.largeTransactionAmount) {
    reasons.push('Large transaction amount')
    riskScore += input.amount > FRAUD_THRESHOLDS.veryLargeTransactionAmount ? 45 : 30
  }

  // Rule 2: Velocity check - multiple orders in short time
  if (
    input.timeSinceLastOrder !== undefined &&
    input.timeSinceLastOrder < FRAUD_THRESHOLDS.velocityTimeThreshold
  ) {
    reasons.push('Multiple orders within 1 minute')
    riskScore += input.timeSinceLastOrder < 30000 ? 50 : 40 // Extra risk for under 30 seconds
  }

  // Rule 3: New account with large purchase
  if (
    input.previousOrderCount !== undefined &&
    input.previousOrderCount === 0 &&
    input.amount > FRAUD_THRESHOLDS.firstTimeBuyerLargeAmount
  ) {
    reasons.push('First-time buyer with large purchase')
    riskScore += 25
  }

  // Rule 4: Suspicious email patterns
  if (SUSPICIOUS_EMAIL_FRAUD_PATTERNS.some((pattern) => pattern.test(input.buyerEmail))) {
    reasons.push('Suspicious email pattern')
    riskScore += 20
  }

  // Rule 5: Unusual spending pattern
  if (
    input.previousTotalSpent !== undefined &&
    input.previousOrderCount !== undefined &&
    input.previousOrderCount > 0
  ) {
    const avgPreviousOrder = input.previousTotalSpent / input.previousOrderCount
    if (input.amount > avgPreviousOrder * FRAUD_THRESHOLDS.unusualSpendingMultiplier) {
      reasons.push('Order significantly larger than average')
      riskScore += 15
    }
  }

  // Rule 6: Multiple failed payment attempts
  if (
    input.failedAttemptsLastHour !== undefined &&
    input.failedAttemptsLastHour >= FRAUD_THRESHOLDS.failedAttemptsThreshold
  ) {
    reasons.push(`${input.failedAttemptsLastHour} failed payment attempts in last hour`)
    riskScore += 35
  }

  // Rule 7: High-risk country
  if (input.countryCode && HIGH_RISK_COUNTRIES.includes(input.countryCode.toUpperCase())) {
    reasons.push(`Transaction from high-risk country: ${input.countryCode}`)
    riskScore += 15
  }

  // Rule 8: Card country mismatch
  if (
    input.cardCountry &&
    input.countryCode &&
    input.cardCountry.toUpperCase() !== input.countryCode.toUpperCase()
  ) {
    reasons.push(
      `Card country (${input.cardCountry}) differs from IP country (${input.countryCode})`
    )
    riskScore += 25
  }

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore)

  const isSuspicious = riskScore >= FRAUD_THRESHOLDS.suspiciousThreshold
  const shouldAlert = riskScore >= FRAUD_THRESHOLDS.alertThreshold
  const shouldBlock = riskScore >= FRAUD_THRESHOLDS.blockThreshold

  // Log fraud check result
  logger.info('Fraud detection check completed', {
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    amount: input.amount,
    riskScore,
    isSuspicious,
    shouldAlert,
    triggeredRuleCount: reasons.length,
    buyerEmail: maskEmailForFraudLogging(input.buyerEmail),
  })

  // Send alert for high-risk transactions
  if (shouldAlert) {
    const riskLevel = shouldBlock ? 'CRITICAL' : 'HIGH'
    const alertTitle = shouldBlock
      ? '🚨 BLOCKED: High-Risk Payment Detected'
      : '⚠️ Suspicious Payment Requires Review'

    logger.warn('High-risk payment detected - sending alert', {
      riskScore,
      riskLevel,
      reasons,
      amount: input.amount,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      email: maskEmailForFraudLogging(input.buyerEmail),
    })

    // Import and use alert manager dynamically to avoid circular dependencies
    import('../monitoring/alerts')
      .then(({ alertManager }) => {
        alertManager
          .sendAlert({
            title: alertTitle,
            message: [
              `Risk Score: ${riskScore}/100 (${riskLevel})`,
              `Amount: $${(input.amount / 100).toFixed(2)} ${input.currency.toUpperCase()}`,
              `Order: ${input.orderNumber || input.orderId || 'N/A'}`,
              '',
              'Triggered Rules:',
              ...reasons.map((r) => `  • ${r}`),
              '',
              `Recommended Action: ${shouldBlock ? 'BLOCK' : 'REVIEW'}`,
            ].join('\n'),
            severity: shouldBlock ? 'critical' : 'warning',
            channels: shouldBlock ? ['email', 'slack', 'pagerduty'] : ['email', 'slack'],
            metadata: {
              type: 'fraud_detection',
              orderId: input.orderId,
              orderNumber: input.orderNumber,
              eventId: input.eventId,
              userId: input.userId,
              amount: input.amount,
              currency: input.currency,
              riskScore,
              riskLevel,
              reasons,
              shouldBlock,
              buyerEmailMasked: maskEmailForFraudLogging(input.buyerEmail),
              ipAddress: input.ipAddress,
              countryCode: input.countryCode,
              timestamp: Date.now(),
            },
          })
          .catch((err) => {
            logger.error('Failed to send fraud alert', err, {
              orderId: input.orderId,
              riskScore,
            })
          })
      })
      .catch((err) => {
        logger.error('Failed to import alert manager', err)
      })
  }

  return {
    isSuspicious,
    riskScore,
    reasons,
    shouldAlert,
  }
}

/**
 * Logs payment event for audit trail
 */
export interface PaymentAuditEvent {
  eventType:
    | 'checkout_started'
    | 'checkout_completed'
    | 'payment_failed'
    | 'refund_initiated'
    | 'refund_completed'
    | 'dispute_created'
  orderId: string
  orderNumber: string
  amount: number
  currency: string
  stripeEventId?: string
  stripePaymentIntentId?: string
  metadata?: Record<string, unknown>
}

export function logPaymentEvent(event: PaymentAuditEvent): void {
  // Ensure no sensitive data in metadata
  const sanitizedMetadata = event.metadata ? { ...event.metadata } : {}

  // Remove any potential card data from metadata
  for (const key of SENSITIVE_FIELD_NAMES) {
    delete sanitizedMetadata[key]
  }

  logger.info(`Payment event: ${event.eventType}`, {
    eventType: event.eventType,
    orderId: event.orderId,
    orderNumber: event.orderNumber,
    amount: event.amount,
    currency: event.currency,
    stripeEventId: event.stripeEventId,
    stripePaymentIntentId: event.stripePaymentIntentId,
    metadata: sanitizedMetadata,
    timestamp: Date.now(),
  })
}

// ============================================================================
// PAYMENT FAILURE HANDLING
// ============================================================================

/**
 * Payment failure error types
 */
export type PaymentFailureType =
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'invalid_card'
  | 'processing_error'
  | 'authentication_required'
  | 'rate_limit'
  | 'network_error'
  | 'unknown'

/**
 * Payment failure result with user-friendly message
 */
export interface PaymentFailureResult {
  /** Whether the payment failed */
  failed: boolean
  /** Type of failure for categorization */
  failureType: PaymentFailureType
  /** User-friendly error message (no technical details) */
  userMessage: string
  /** Recovery suggestions for the user */
  suggestions: string[]
  /** Whether an order should be created (always false for failures) */
  shouldCreateOrder: boolean
  /** Whether the error is retryable */
  isRetryable: boolean
  /** Original error code from Stripe (for logging only) */
  stripeErrorCode?: string
  /** Decline code from Stripe (for logging only) */
  declineCode?: string
}

/**
 * Stripe error codes mapped to failure types
 */
const STRIPE_ERROR_TO_FAILURE_TYPE: Record<string, PaymentFailureType> = {
  // Card errors
  card_declined: 'card_declined',
  insufficient_funds: 'insufficient_funds',
  expired_card: 'expired_card',
  incorrect_cvc: 'invalid_card',
  incorrect_number: 'invalid_card',
  invalid_cvc: 'invalid_card',
  invalid_expiry_month: 'invalid_card',
  invalid_expiry_year: 'invalid_card',
  invalid_number: 'invalid_card',
  // Processing errors
  processing_error: 'processing_error',
  card_not_supported: 'processing_error',
  // Authentication
  authentication_required: 'authentication_required',
  // Rate limiting
  rate_limit: 'rate_limit',
}

/**
 * Decline codes mapped to failure types
 */
const DECLINE_CODE_TO_FAILURE_TYPE: Record<string, PaymentFailureType> = {
  insufficient_funds: 'insufficient_funds',
  lost_card: 'card_declined',
  stolen_card: 'card_declined',
  generic_decline: 'card_declined',
  do_not_honor: 'card_declined',
  expired_card: 'expired_card',
  incorrect_cvc: 'invalid_card',
  fraudulent: 'card_declined',
  pickup_card: 'card_declined',
  restricted_card: 'card_declined',
  security_violation: 'card_declined',
  service_not_allowed: 'card_declined',
  transaction_not_allowed: 'card_declined',
  withdrawal_count_limit_exceeded: 'rate_limit',
}

/**
 * User-friendly messages for each failure type
 */
const FAILURE_TYPE_MESSAGES: Record<
  PaymentFailureType,
  { message: string; suggestions: string[] }
> = {
  card_declined: {
    message: 'Your card was declined.',
    suggestions: [
      'Check your card details are correct',
      'Try a different payment method',
      'Contact your bank for more information',
    ],
  },
  insufficient_funds: {
    message: 'Your card has insufficient funds.',
    suggestions: ['Try a different payment method', 'Add funds to your account and try again'],
  },
  expired_card: {
    message: 'Your card has expired.',
    suggestions: ['Update your card details', 'Try a different payment method'],
  },
  invalid_card: {
    message: 'Your card details are invalid.',
    suggestions: [
      'Check your card number, expiry date, and CVC',
      'Make sure you entered the details correctly',
      'Try a different card',
    ],
  },
  processing_error: {
    message: "We couldn't process your payment.",
    suggestions: [
      'Please try again in a moment',
      'Try a different payment method',
      'Contact support if the issue persists',
    ],
  },
  authentication_required: {
    message: 'Additional authentication is required.',
    suggestions: [
      'Complete the authentication step from your bank',
      'Check for a notification from your bank',
      'Try a different payment method',
    ],
  },
  rate_limit: {
    message: 'Too many payment attempts.',
    suggestions: [
      'Please wait a few minutes before trying again',
      'Contact support if you need immediate assistance',
    ],
  },
  network_error: {
    message: 'Unable to connect to payment service.',
    suggestions: ['Check your internet connection', 'Try again in a moment'],
  },
  unknown: {
    message: "Your payment couldn't be processed.",
    suggestions: [
      'Please try again',
      'Try a different payment method',
      'Contact support if the issue persists',
    ],
  },
}

/**
 * Retryable failure types
 */
const RETRYABLE_FAILURES: Set<PaymentFailureType> = new Set([
  'processing_error',
  'network_error',
  'rate_limit',
])

/**
 * Handle a payment failure gracefully
 *
 * This function:
 * 1. Logs the error with full technical details (server-side only)
 * 2. Returns a user-friendly error message without technical details
 * 3. Ensures no order is created for failed payments
 * 4. Provides recovery suggestions to the user
 *
 * @param error - The error from Stripe or payment processing
 * @param context - Additional context for logging
 * @returns PaymentFailureResult with user-friendly message and suggestions
 */
export function handlePaymentFailure(
  error: unknown,
  context?: {
    orderId?: string
    orderNumber?: string
    amount?: number
    currency?: string
    buyerEmail?: string
  }
): PaymentFailureResult {
  // Extract error details
  const errorDetails = extractPaymentErrorDetails(error)

  // Determine failure type
  const failureType = determineFailureType(errorDetails)

  // Get user-friendly message
  const { message, suggestions } = FAILURE_TYPE_MESSAGES[failureType]

  // Safely convert error to loggable format
  const safeError = safeErrorForLogging(error)

  // Log the full error details server-side
  logger.error('Payment failed', safeError, {
    failureType,
    stripeErrorCode: errorDetails.code,
    declineCode: errorDetails.declineCode,
    orderId: context?.orderId,
    orderNumber: context?.orderNumber,
    amount: context?.amount,
    currency: context?.currency,
    // Partially mask email for privacy
    buyerEmail: context?.buyerEmail ? maskEmail(context.buyerEmail) : undefined,
    timestamp: Date.now(),
  })

  // Log payment failure event for audit
  if (context?.orderId && context?.orderNumber) {
    logPaymentEvent({
      eventType: 'payment_failed',
      orderId: context.orderId,
      orderNumber: context.orderNumber,
      amount: context.amount || 0,
      currency: context.currency || 'usd',
      metadata: {
        failureType,
        stripeErrorCode: errorDetails.code,
        declineCode: errorDetails.declineCode,
      },
    })
  }

  return {
    failed: true,
    failureType,
    userMessage: message,
    suggestions,
    shouldCreateOrder: false, // Never create order on failure
    isRetryable: RETRYABLE_FAILURES.has(failureType),
    stripeErrorCode: errorDetails.code,
    declineCode: errorDetails.declineCode,
  }
}

/**
 * Safely convert error to a format suitable for logging
 * Handles edge cases like objects with null prototype
 */
function safeErrorForLogging(error: unknown): unknown {
  if (error === null || error === undefined) {
    return error
  }

  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') {
    return error
  }

  if (typeof error === 'object') {
    try {
      // Check if object has null prototype (Object.create(null))
      const proto = Object.getPrototypeOf(error)
      if (proto === null) {
        // Convert to regular object for safe logging
        return { ...(error as Record<string, unknown>) }
      }
      return error
    } catch {
      // If we can't get prototype, wrap in a safe object
      return { errorValue: String(error) }
    }
  }

  return { errorValue: String(error) }
}

/**
 * Extract error details from various error formats
 */
interface PaymentErrorDetails {
  code?: string
  declineCode?: string
  message?: string
  type?: string
}

function extractPaymentErrorDetails(error: unknown): PaymentErrorDetails {
  if (!error) {
    return {}
  }

  // Handle Stripe error format
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>

    // Stripe errors have a specific structure
    // Ensure type is a string before comparing
    if ('type' in err && typeof err.type === 'string' && err.type === 'StripeCardError') {
      return {
        code: err.code as string | undefined,
        declineCode: err.decline_code as string | undefined,
        message: err.message as string | undefined,
        type: 'card_error',
      }
    }

    // Check for nested error structure
    if ('raw' in err && typeof err.raw === 'object' && err.raw !== null) {
      const raw = err.raw as Record<string, unknown>
      return {
        code: raw.code as string | undefined,
        declineCode: raw.decline_code as string | undefined,
        message: raw.message as string | undefined,
        type: raw.type as string | undefined,
      }
    }

    // Generic error object
    return {
      code: err.code as string | undefined,
      declineCode: (err.decline_code || err.declineCode) as string | undefined,
      message: err.message as string | undefined,
      type: err.type as string | undefined,
    }
  }

  // Handle Error instance
  if (error instanceof Error) {
    return {
      message: error.message,
    }
  }

  // Handle string error
  if (typeof error === 'string') {
    return {
      message: error,
    }
  }

  return {}
}

/**
 * Determine failure type from error details
 */
function determineFailureType(details: PaymentErrorDetails): PaymentFailureType {
  // Check decline code first (more specific)
  if (details.declineCode && DECLINE_CODE_TO_FAILURE_TYPE[details.declineCode]) {
    return DECLINE_CODE_TO_FAILURE_TYPE[details.declineCode]
  }

  // Check error code
  if (details.code && STRIPE_ERROR_TO_FAILURE_TYPE[details.code]) {
    return STRIPE_ERROR_TO_FAILURE_TYPE[details.code]
  }

  // Check message for network errors
  if (details.message) {
    const lowerMessage = details.message.toLowerCase()
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('econnrefused')
    ) {
      return 'network_error'
    }
  }

  return 'unknown'
}

/**
 * Mask email for logging (privacy)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'

  const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***'

  return `${maskedLocal}@${domain}`
}

/**
 * Check if a payment error indicates the payment should not be retried
 */
export function isPaymentPermanentlyFailed(error: unknown): boolean {
  const details = extractPaymentErrorDetails(error)
  const failureType = determineFailureType(details)

  // These failures are permanent and should not be retried
  const permanentFailures: PaymentFailureType[] = [
    'card_declined',
    'insufficient_funds',
    'expired_card',
    'invalid_card',
  ]

  return permanentFailures.includes(failureType)
}

/**
 * Create a standardized payment failure response for API endpoints
 */
export function createPaymentFailureResponse(result: PaymentFailureResult): {
  status: number
  body: Record<string, unknown>
} {
  const statusMap: Record<PaymentFailureType, number> = {
    card_declined: 402,
    insufficient_funds: 402,
    expired_card: 402,
    invalid_card: 400,
    processing_error: 500,
    authentication_required: 402,
    rate_limit: 429,
    network_error: 503,
    unknown: 500,
  }

  return {
    status: statusMap[result.failureType],
    body: {
      error: result.userMessage,
      suggestions: result.suggestions,
      isRetryable: result.isRetryable,
      failureType: result.failureType,
    },
  }
}
