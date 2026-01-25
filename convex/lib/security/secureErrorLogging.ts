/**
 * Secure Error Logging with PII Sanitization
 *
 * Provides centralized error logging that automatically redacts:
 * - Email addresses
 * - Phone numbers
 * - Credit card numbers
 * - API keys and tokens
 * - Social Security Numbers
 * - Passwords and secrets
 *
 * CRITICAL: This prevents sensitive data leakage in server logs,
 * which is essential for GDPR/SOC2 compliance and security.
 *
 * USAGE:
 * try {
 *   await processPayment(args)
 * } catch (error) {
 *   logSecureError('stripe:createCheckout', error, {
 *     orderId: args.orderId,
 *     amount: args.amount,
 *     // Sensitive fields automatically redacted
 *   })
 *   throw new AppError('Payment processing failed', 'PAYMENT_ERROR', 500)
 * }
 */

import { logger } from '../monitoring/logger'

// ============================================================================
// PII DETECTION PATTERNS
// ============================================================================

/**
 * Regex patterns for detecting PII in strings
 */
const PII_PATTERNS = {
  // Email addresses (RFC 5322 simplified)
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Phone numbers (US and international formats)
  phone: /\b(\+\d{1,3}\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,

  // Credit card numbers (Visa, MC, Amex, Discover)
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // Social Security Numbers
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // API keys and tokens (common patterns)
  token: /\b(Bearer\s+)?[A-Za-z0-9_-]{20,}\b/g,

  // Stripe API keys
  stripeKey: /\b(sk|pk|rk)_(test|live)_[A-Za-z0-9]{24,}\b/g,

  // AWS access keys
  awsKey: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g,

  // JWT tokens (three base64 segments separated by dots)
  jwt: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,

  // Password in key-value format
  password: /(password|passwd|pwd)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,

  // Secret in key-value format
  secret: /(secret|api_?key|access_?token)\s*[:=]\s*['"]?[^'"\s]+['"]?/gi,
} as const

/**
 * Redaction replacements for each pattern type
 */
const REDACTION_REPLACEMENTS = {
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  creditCard: '[CARD_REDACTED]',
  ssn: '[SSN_REDACTED]',
  token: '[TOKEN_REDACTED]',
  stripeKey: '[STRIPE_KEY_REDACTED]',
  awsKey: '[AWS_KEY_REDACTED]',
  jwt: '[JWT_REDACTED]',
  password: '$1=[PASSWORD_REDACTED]',
  secret: '$1=[SECRET_REDACTED]',
} as const

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize a string by redacting all PII patterns
 */
function sanitizeString(input: string): string {
  let sanitized = input

  // Apply all PII patterns
  sanitized = sanitized.replace(PII_PATTERNS.email, REDACTION_REPLACEMENTS.email)
  sanitized = sanitized.replace(PII_PATTERNS.phone, REDACTION_REPLACEMENTS.phone)
  sanitized = sanitized.replace(
    PII_PATTERNS.creditCard,
    REDACTION_REPLACEMENTS.creditCard
  )
  sanitized = sanitized.replace(PII_PATTERNS.ssn, REDACTION_REPLACEMENTS.ssn)
  sanitized = sanitized.replace(
    PII_PATTERNS.stripeKey,
    REDACTION_REPLACEMENTS.stripeKey
  )
  sanitized = sanitized.replace(PII_PATTERNS.awsKey, REDACTION_REPLACEMENTS.awsKey)
  sanitized = sanitized.replace(PII_PATTERNS.jwt, REDACTION_REPLACEMENTS.jwt)
  sanitized = sanitized.replace(
    PII_PATTERNS.password,
    REDACTION_REPLACEMENTS.password
  )
  sanitized = sanitized.replace(PII_PATTERNS.secret, REDACTION_REPLACEMENTS.secret)
  // Token pattern last (most generic)
  sanitized = sanitized.replace(PII_PATTERNS.token, REDACTION_REPLACEMENTS.token)

  return sanitized
}

/**
 * Recursively sanitize an object, redacting PII in all string values
 */
function sanitizeObject(obj: unknown, maxDepth = 10, currentDepth = 0): unknown {
  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return '[MAX_DEPTH_REACHED]'
  }

  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle strings
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }

  // Handle primitive types
  if (
    typeof obj === 'number' ||
    typeof obj === 'boolean' ||
    typeof obj === 'bigint' ||
    typeof obj === 'symbol'
  ) {
    return obj
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, maxDepth, currentDepth + 1))
  }

  // Handle Error objects
  if (obj instanceof Error) {
    const errorProps = Object.getOwnPropertyNames(obj).reduce(
      (acc, key) => {
        if (key !== 'name' && key !== 'message' && key !== 'stack') {
          acc[key] = (obj as unknown as Record<string, unknown>)[key]
        }
        return acc
      },
      {} as Record<string, unknown>
    )

    const sanitizedProps = sanitizeObject(errorProps, maxDepth, currentDepth + 1)

    return {
      name: obj.name,
      message: sanitizeString(obj.message),
      stack: obj.stack ? sanitizeString(obj.stack) : undefined,
      ...(typeof sanitizedProps === 'object' && sanitizedProps !== null ? sanitizedProps : {}),
    }
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Redact entire value for known sensitive keys
      const lowerKey = key.toLowerCase()
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('creditcard') ||
        lowerKey.includes('ssn')
      ) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1)
      }
    }

    return sanitized
  }

  return obj
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Log an error with automatic PII sanitization
 *
 * @param context - Context string identifying where the error occurred
 * @param error - The error object or unknown value
 * @param metadata - Additional metadata (will be sanitized)
 *
 * @example
 * try {
 *   await stripe.checkout.sessions.create(...)
 * } catch (error) {
 *   logSecureError('stripe:createCheckout', error, {
 *     orderId: args.orderId,
 *     customerEmail: args.email, // Will be redacted
 *   })
 * }
 */
export function logSecureError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const sanitizedError = sanitizeObject(error)
  const sanitizedMetadata = metadata ? sanitizeObject(metadata) : undefined

  // Log using structured logger
  logger.error(`Error in ${context}`, {
    context,
    error: sanitizedError,
    metadata: sanitizedMetadata,
    timestamp: Date.now(),
  })
}

/**
 * Log a warning with PII sanitization
 *
 * @param context - Context string
 * @param message - Warning message
 * @param metadata - Additional metadata (will be sanitized)
 */
export function logSecureWarning(
  context: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const sanitizedMessage = sanitizeString(message)
  const sanitizedMetadata = metadata ? sanitizeObject(metadata) : undefined

  logger.warn(sanitizedMessage, {
    context,
    metadata: sanitizedMetadata,
    timestamp: Date.now(),
  })
}

/**
 * Manually sanitize a value for safe logging
 *
 * @param value - Value to sanitize
 * @returns Sanitized value safe for logging
 *
 * @example
 * const userInput = getUserInput()
 * logger.info('User input received', {
 *   input: sanitizeForLogging(userInput)
 * })
 */
export function sanitizeForLogging(value: unknown): unknown {
  return sanitizeObject(value)
}

/**
 * Check if a string contains potential PII
 *
 * @param text - Text to check
 * @returns true if PII patterns are detected
 *
 * @example
 * if (containsPII(errorMessage)) {
 *   logSecureError('operation', new Error(errorMessage))
 * }
 */
export function containsPII(text: string): boolean {
  return (
    PII_PATTERNS.email.test(text) ||
    PII_PATTERNS.phone.test(text) ||
    PII_PATTERNS.creditCard.test(text) ||
    PII_PATTERNS.ssn.test(text) ||
    PII_PATTERNS.stripeKey.test(text) ||
    PII_PATTERNS.awsKey.test(text) ||
    PII_PATTERNS.jwt.test(text) ||
    PII_PATTERNS.password.test(text) ||
    PII_PATTERNS.secret.test(text)
  )
}

// ============================================================================
// DEVELOPMENT MODE HELPERS
// ============================================================================

/**
 * In development, optionally log full error details to console
 * (sanitization still applied to prevent accidental PII exposure)
 */
export function logDevError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[DEV ERROR] ${context}:`, {
      error: sanitizeObject(error),
      metadata: metadata ? sanitizeObject(metadata) : undefined,
    })
  }

  // Always log to production logger
  logSecureError(context, error, metadata)
}
