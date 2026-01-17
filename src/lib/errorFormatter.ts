/**
 * Error Message Formatter
 *
 * Transforms technical errors into user-friendly messages with recovery suggestions.
 * Strips stack traces and technical details from user-facing error messages.
 *
 * Requirements: 11.1, 11.3, 1.1, 1.2, 7.1
 */

/**
 * Error category for determining appropriate user message
 */
export type ErrorCategory =
  | 'auth'
  | 'network'
  | 'validation'
  | 'permission'
  | 'notFound'
  | 'rateLimit'
  | 'payment'
  | 'server'
  | 'unknown'

/**
 * Context information about what action the user was performing when the error occurred
 * Requirements: 1.1, 1.2
 */
export interface ErrorContext {
  /** What action the user was performing (e.g., "save your event", "update profile") */
  action: string
  /** Component where error occurred */
  component?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Recovery action type for error handling
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
export type RecoveryActionType = 'retry' | 'navigate' | 'focus' | 'custom' | 'countdown'

/**
 * Recovery action that helps users resolve an error
 * Requirements: 2.1
 */
export interface RecoveryAction {
  /** Button label */
  label: string
  /** Action type for handling */
  type: RecoveryActionType
  /** Handler function or navigation path */
  handler?: () => Promise<void> | void
  /** Navigation path for 'navigate' type */
  path?: string
  /** Element selector for 'focus' type */
  selector?: string
  /** Countdown duration in seconds for 'countdown' type */
  countdownSeconds?: number
}

/**
 * Formatted error message with recovery suggestions
 */
export interface FormattedError {
  /** User-friendly error message (no technical details) */
  message: string
  /** Optional recovery suggestions for the user */
  suggestions?: string[]
  /** Error category for UI styling */
  category: ErrorCategory
  /** Optional action button text */
  actionText?: string
  /** Optional action to perform */
  action?: () => void
}

/**
 * Enhanced formatted error with context, unique ID, and recovery actions
 * Requirements: 1.1, 1.2, 7.1
 */
export interface EnhancedFormattedError extends FormattedError {
  /** Unique error ID for tracking */
  id: string
  /** Timestamp when error occurred */
  timestamp: number
  /** Action context if provided */
  context?: ErrorContext
  /** Whether error requires user acknowledgment */
  requiresAcknowledgment: boolean
  /** Whether error should persist across navigation */
  persistent: boolean
  /** Recovery actions available */
  recoveryActions: RecoveryAction[]
}

/**
 * Technical error patterns to detect and sanitize
 * Note: We use separate arrays for sanitization (with global flag) and detection (without global flag)
 * because RegExp.test() with global flag maintains state via lastIndex, causing inconsistent results
 */
const TECHNICAL_PATTERNS_FOR_REPLACE = [
  /at\s+[\w.]+\s+\([^)]+\)/g, // Stack trace lines
  /Error:\s+/g, // Error prefix
  /TypeError:\s+/g,
  /ReferenceError:\s+/g,
  /SyntaxError:\s+/g,
  /\bat\b.*?:\d+:\d+/g, // File paths with line numbers
  /file:\/\/\/[^\s]+/g, // File URLs
  /https?:\/\/[^\s]+/g, // HTTP URLs in stack traces
  /\[object\s+\w+\]/g, // [object Object]
  /undefined is not/gi,
  /cannot read property/gi,
  /null is not/gi,
]

/**
 * Same patterns without global flag for use with .test()
 * Using global flag with .test() causes inconsistent results due to lastIndex state
 */
const TECHNICAL_PATTERNS_FOR_TEST = [
  /at\s+[\w.]+\s+\([^)]+\)/, // Stack trace lines
  /Error:\s+/, // Error prefix
  /TypeError:\s+/,
  /ReferenceError:\s+/,
  /SyntaxError:\s+/,
  /\bat\b.*?:\d+:\d+/, // File paths with line numbers
  /file:\/\/\/[^\s]+/, // File URLs
  /https?:\/\/[^\s]+/, // HTTP URLs in stack traces
  /\[object\s+\w+\]/, // [object Object]
  /undefined is not/i,
  /cannot read property/i,
  /null is not/i,
]

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<
  string,
  { message: string; suggestions?: string[]; category: ErrorCategory }
> = {
  // Authentication errors
  UNAUTHORIZED: {
    message: 'You need to sign in to access this feature.',
    suggestions: ['Sign in to your account', "Create a new account if you don't have one"],
    category: 'auth',
  },
  INVALID_CREDENTIALS: {
    message: 'The email or password you entered is incorrect.',
    suggestions: ['Check your email and password', 'Use the "Forgot Password" link if needed'],
    category: 'auth',
  },
  SESSION_EXPIRED: {
    message: 'Your session has expired for security reasons.',
    suggestions: ['Sign in again to continue'],
    category: 'auth',
  },
  EMAIL_NOT_VERIFIED: {
    message: 'Please verify your email address to continue.',
    suggestions: [
      'Check your inbox for the verification email',
      'Request a new verification email',
    ],
    category: 'auth',
  },
  ACCOUNT_SUSPENDED: {
    message: 'Your account has been suspended.',
    suggestions: ['Contact support for assistance'],
    category: 'auth',
  },

  // Permission errors
  FORBIDDEN: {
    message: "You don't have permission to perform this action.",
    suggestions: [
      'Contact your organization admin for access',
      "Check if you're signed in to the correct account",
    ],
    category: 'permission',
  },
  ACCESS_DENIED: {
    message: 'Access to this resource is restricted.',
    suggestions: [
      'Verify you have the necessary permissions',
      'Contact support if you believe this is an error',
    ],
    category: 'permission',
  },

  // Resource errors
  NOT_FOUND: {
    message: "The item you're looking for couldn't be found.",
    suggestions: ['Check if the link is correct', 'The item may have been deleted'],
    category: 'notFound',
  },
  ALREADY_EXISTS: {
    message: 'This item already exists.',
    suggestions: ['Try a different name or identifier', 'Check if you already created this item'],
    category: 'validation',
  },

  // Validation errors
  INVALID_INPUT: {
    message: 'Some of the information you entered is invalid.',
    suggestions: ['Check the highlighted fields', 'Make sure all required fields are filled'],
    category: 'validation',
  },
  VALIDATION_ERROR: {
    message: 'Please check your input and try again.',
    suggestions: ['Review the form for errors', 'Ensure all required fields are completed'],
    category: 'validation',
  },
  MISSING_REQUIRED_FIELD: {
    message: 'Some required information is missing.',
    suggestions: ['Fill in all required fields marked with *'],
    category: 'validation',
  },

  // Network errors
  NETWORK_ERROR: {
    message: 'Unable to connect to the server.',
    suggestions: ['Check your internet connection', 'Try again in a moment'],
    category: 'network',
  },
  TIMEOUT: {
    message: 'The request took too long to complete.',
    suggestions: ['Check your internet connection', 'Try again'],
    category: 'network',
  },
  OFFLINE: {
    message: 'You appear to be offline.',
    suggestions: ['Check your internet connection', 'Some features may be limited while offline'],
    category: 'network',
  },

  // Rate limiting
  RATE_LIMITED: {
    message: "You're making requests too quickly.",
    suggestions: ['Wait a moment before trying again', 'Slow down your actions'],
    category: 'rateLimit',
  },
  TOO_MANY_REQUESTS: {
    message: 'Too many requests. Please slow down.',
    suggestions: ['Wait a few minutes before trying again'],
    category: 'rateLimit',
  },

  // Payment errors
  PAYMENT_FAILED: {
    message: "Your payment couldn't be processed.",
    suggestions: [
      'Check your payment details',
      'Try a different payment method',
      'Contact your bank if the issue persists',
    ],
    category: 'payment',
  },
  CARD_DECLINED: {
    message: 'Your card was declined.',
    suggestions: ['Check your card details', 'Try a different card', 'Contact your bank'],
    category: 'payment',
  },
  INSUFFICIENT_FUNDS: {
    message: 'Your card has insufficient funds.',
    suggestions: ['Try a different payment method', 'Add funds to your account'],
    category: 'payment',
  },
  EXPIRED_CARD: {
    message: 'Your card has expired.',
    suggestions: ['Update your card details', 'Try a different payment method'],
    category: 'payment',
  },
  INVALID_CARD: {
    message: 'Your card details are invalid.',
    suggestions: ['Check your card number, expiry date, and CVC', 'Try a different card'],
    category: 'payment',
  },
  PAYMENT_AUTHENTICATION_REQUIRED: {
    message: 'Additional authentication is required.',
    suggestions: [
      'Complete the authentication step from your bank',
      'Try a different payment method',
    ],
    category: 'payment',
  },
  PAYMENT_PROCESSING_ERROR: {
    message: "We couldn't process your payment.",
    suggestions: ['Please try again in a moment', 'Try a different payment method'],
    category: 'payment',
  },

  // Server errors
  INTERNAL_ERROR: {
    message: 'Something went wrong on our end.',
    suggestions: ['Try again in a moment', 'Contact support if the problem persists'],
    category: 'server',
  },
  SERVICE_UNAVAILABLE: {
    message: 'The service is temporarily unavailable.',
    suggestions: ['Try again in a few minutes', 'Check our status page for updates'],
    category: 'server',
  },
  EXTERNAL_API_ERROR: {
    message: 'A connected service is experiencing issues.',
    suggestions: ['Try again later', 'Contact support if the problem persists'],
    category: 'server',
  },
}

/**
 * Extract error code from various error formats
 */
function extractErrorCode(error: unknown): string | null {
  if (!error) return null

  // Check for code property
  if (typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string') return code
  }

  // Check for error message with code prefix like "[CODE] message"
  if (error instanceof Error) {
    const match = error.message.match(/^\[([A-Z_]+)\]/)
    if (match) return match[1]
  }

  // Check for ConvexError data structure
  if (typeof error === 'object' && 'data' in error) {
    const data = (error as { data: unknown }).data
    if (data && typeof data === 'object' && 'code' in data) {
      const code = (data as { code: unknown }).code
      if (typeof code === 'string') return code
    }
  }

  return null
}

/**
 * Detect error category from error message content
 */
function detectErrorCategory(message: string): ErrorCategory {
  const lowerMessage = message.toLowerCase()

  // Authentication
  if (
    lowerMessage.includes('sign in') ||
    lowerMessage.includes('login') ||
    lowerMessage.includes('authenticate') ||
    lowerMessage.includes('credentials') ||
    lowerMessage.includes('password')
  ) {
    return 'auth'
  }

  // Network
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('offline') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('fetch failed')
  ) {
    return 'network'
  }

  // Permission
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('unauthorized')
  ) {
    return 'permission'
  }

  // Not found
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return 'notFound'
  }

  // Rate limit
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
    return 'rateLimit'
  }

  // Validation
  if (
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('validation') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('must be')
  ) {
    return 'validation'
  }

  // Payment
  if (
    lowerMessage.includes('payment') ||
    lowerMessage.includes('card') ||
    lowerMessage.includes('charge') ||
    lowerMessage.includes('declined')
  ) {
    return 'payment'
  }

  // Server
  if (
    lowerMessage.includes('server') ||
    lowerMessage.includes('internal') ||
    lowerMessage.includes('unavailable')
  ) {
    return 'server'
  }

  return 'unknown'
}

/**
 * Strip technical details from error message
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message

  // Remove technical patterns
  for (const pattern of TECHNICAL_PATTERNS_FOR_REPLACE) {
    sanitized = sanitized.replace(pattern, '')
  }

  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // If message is now empty or too technical, use generic message
  if (!sanitized || sanitized.length < 10) {
    return 'An unexpected error occurred'
  }

  return sanitized
}

/**
 * Get error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message
    if (typeof msg === 'string') return msg
  }
  return 'An unexpected error occurred'
}

/**
 * Format an error into a user-friendly message with recovery suggestions
 *
 * This function:
 * - Strips stack traces and technical details
 * - Maps error codes to friendly messages
 * - Provides actionable recovery suggestions
 * - Categorizes errors for appropriate UI treatment
 *
 * @param error - The error to format (can be Error, string, or unknown)
 * @returns Formatted error with user-friendly message and suggestions
 *
 * @example
 * ```typescript
 * try {
 *   await signIn(email, password)
 * } catch (error) {
 *   const formatted = formatErrorMessage(error)
 *   toast.error(formatted.message, {
 *     description: formatted.suggestions?.join('\n')
 *   })
 * }
 * ```
 */
export function formatErrorMessage(error: unknown): FormattedError {
  // Try to extract error code
  const code = extractErrorCode(error)

  // If we have a known error code, use the predefined message
  if (code && Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, code)) {
    const mapped = ERROR_MESSAGES[code]
    return {
      ...mapped,
      actionText: getActionText(mapped.category),
    }
  }

  // Extract and sanitize the error message
  const rawMessage = getErrorMessage(error)
  const sanitizedMessage = sanitizeErrorMessage(rawMessage)

  // Detect category from message content
  const category = detectErrorCategory(sanitizedMessage)

  // Get generic suggestions based on category
  const suggestions = getCategorySuggestions(category)

  return {
    message: sanitizedMessage,
    suggestions,
    category,
    actionText: getActionText(category),
  }
}

/**
 * Get generic recovery suggestions based on error category
 */
function getCategorySuggestions(category: ErrorCategory): string[] {
  switch (category) {
    case 'auth':
      return ['Sign in to your account', 'Check your credentials']
    case 'network':
      return ['Check your internet connection', 'Try again in a moment']
    case 'validation':
      return ['Review your input', 'Check for any errors in the form']
    case 'permission':
      return ['Contact your administrator', 'Verify your account permissions']
    case 'notFound':
      return ['Check the URL', 'Go back and try again']
    case 'rateLimit':
      return ['Wait a moment before trying again']
    case 'payment':
      return ['Check your payment details', 'Try a different payment method']
    case 'server':
      return ['Try again in a moment', 'Contact support if the issue persists']
    case 'unknown':
      return ['Try again', 'Contact support if the problem continues']
  }
}

/**
 * Get action button text based on error category
 */
function getActionText(category: ErrorCategory): string {
  switch (category) {
    case 'auth':
      return 'Sign In'
    case 'network':
      return 'Retry'
    case 'validation':
      return 'Review'
    case 'permission':
      return 'Contact Support'
    case 'notFound':
      return 'Go Back'
    case 'rateLimit':
      return 'Wait'
    case 'payment':
      return 'Update Payment'
    case 'server':
      return 'Try Again'
    case 'unknown':
      return 'Try Again'
  }
}

/**
 * Check if an error message contains technical details that should be hidden from users
 */
export function hasTechnicalDetails(message: string): boolean {
  return TECHNICAL_PATTERNS_FOR_TEST.some((pattern) => pattern.test(message))
}

/**
 * Format multiple errors into a single user-friendly message
 */
export function formatMultipleErrors(errors: unknown[]): FormattedError {
  if (errors.length === 0) {
    return {
      message: 'An error occurred',
      category: 'unknown',
    }
  }

  if (errors.length === 1) {
    return formatErrorMessage(errors[0])
  }

  // Format each error and combine
  const formatted = errors.map(formatErrorMessage)
  const categories = new Set(formatted.map((e) => e.category))
  const allSuggestions = formatted.flatMap((e) => e.suggestions || [])
  const uniqueSuggestions = Array.from(new Set(allSuggestions))

  // Determine primary category
  const primaryCategory = categories.has('server')
    ? 'server'
    : categories.has('validation')
      ? 'validation'
      : formatted[0].category

  return {
    message: `Multiple errors occurred: ${formatted.map((e) => e.message).join('; ')}`,
    suggestions: uniqueSuggestions.slice(0, 3), // Limit to 3 suggestions
    category: primaryCategory,
    actionText: getActionText(primaryCategory),
  }
}

/**
 * Generate a unique error ID for tracking
 * Uses crypto.randomUUID when available, falls back to timestamp + random string
 * Requirements: 7.1
 *
 * @returns A unique error ID string
 */
export function generateErrorId(): string {
  // Use crypto.randomUUID if available (modern browsers and Node.js 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: timestamp + random string
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 11)
  return `${timestamp}-${randomPart}`
}

/**
 * Determine if an error requires user acknowledgment based on category
 * Requirements: 7.5
 */
function requiresAcknowledgment(category: ErrorCategory): boolean {
  // Errors that require explicit user action to dismiss
  return category === 'auth' || category === 'permission' || category === 'payment'
}

/**
 * Determine if an error should persist across navigation
 * Requirements: 7.4
 */
function shouldPersist(category: ErrorCategory): boolean {
  // Persistent errors are those that affect the user's session or require action
  return category === 'auth' || category === 'permission'
}

/**
 * Get default recovery actions based on error category
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
function getDefaultRecoveryActions(category: ErrorCategory): RecoveryAction[] {
  switch (category) {
    case 'auth':
      return [{ label: 'Sign In', type: 'navigate', path: '/auth/signin' }]
    case 'network':
      return [{ label: 'Retry', type: 'retry' }]
    case 'validation':
      return [{ label: 'Review', type: 'focus' }]
    case 'permission':
      return [
        { label: 'Request Access', type: 'custom' },
        { label: 'Contact Support', type: 'navigate', path: '/support' },
      ]
    case 'notFound':
      return [{ label: 'Go Back', type: 'navigate', path: '/' }]
    case 'rateLimit':
      return [{ label: 'Wait', type: 'countdown', countdownSeconds: 60 }]
    case 'payment':
      return [
        { label: 'Update Payment', type: 'navigate', path: '/settings/payment' },
        { label: 'Try Again', type: 'retry' },
      ]
    case 'server':
      return [{ label: 'Try Again', type: 'retry' }]
    case 'unknown':
    default:
      return [{ label: 'Try Again', type: 'retry' }]
  }
}

/**
 * Format an error with context into an enhanced error with unique ID and recovery actions
 * Requirements: 1.1, 1.2, 7.1
 *
 * @param error - The error to format (can be Error, string, or unknown)
 * @param context - Optional context about what action the user was performing
 * @returns Enhanced formatted error with context, unique ID, and recovery actions
 *
 * @example
 * ```typescript
 * try {
 *   await saveEvent(eventData)
 * } catch (error) {
 *   const formatted = formatErrorWithContext(error, {
 *     action: 'save your event',
 *     component: 'EventForm'
 *   })
 *   // formatted.message will be "Couldn't save your event: <error details>"
 * }
 * ```
 */
export function formatErrorWithContext(
  error: unknown,
  context?: ErrorContext
): EnhancedFormattedError {
  // Get the base formatted error
  const baseError = formatErrorMessage(error)

  // Build contextual message if context is provided
  let message = baseError.message
  if (context?.action) {
    // Create a contextual message that includes the action
    message = `Couldn't ${context.action}: ${baseError.message}`
  }

  // Generate unique ID and timestamp
  const id = generateErrorId()
  const timestamp = Date.now()

  // Get recovery actions for this category
  const recoveryActions = getDefaultRecoveryActions(baseError.category)

  return {
    ...baseError,
    id,
    timestamp,
    message,
    context,
    requiresAcknowledgment: requiresAcknowledgment(baseError.category),
    persistent: shouldPersist(baseError.category),
    recoveryActions,
  }
}

/**
 * Combine multiple errors into a single enhanced error with shared context
 * Requirements: 1.4
 *
 * This function:
 * - Combines multiple error messages into a single contextual message
 * - Preserves the shared action context
 * - Aggregates suggestions from all errors (deduplicated)
 * - Determines the primary category based on severity
 *
 * @param errors - Array of errors to combine
 * @param context - Shared context about what action the user was performing
 * @returns Enhanced formatted error combining all errors with shared context
 *
 * @example
 * ```typescript
 * const errors = [
 *   new Error('Invalid email format'),
 *   new Error('Password too short')
 * ]
 * const combined = combineErrors(errors, { action: 'create your account' })
 * // combined.message will be "Couldn't create your account: Invalid email format; Password too short"
 * ```
 */
export function combineErrors(errors: unknown[], context: ErrorContext): EnhancedFormattedError {
  if (errors.length === 0) {
    return formatErrorWithContext(new Error('An error occurred'), context)
  }

  if (errors.length === 1) {
    return formatErrorWithContext(errors[0], context)
  }

  // Format each error individually
  const formattedErrors = errors.map(formatErrorMessage)

  // Collect all unique messages
  const messages = formattedErrors.map((e) => e.message)

  // Aggregate all suggestions and deduplicate
  const allSuggestions = formattedErrors.flatMap((e) => e.suggestions || [])
  const uniqueSuggestions = Array.from(new Set(allSuggestions))

  // Determine primary category based on severity priority
  const categoryPriority: ErrorCategory[] = [
    'server',
    'auth',
    'permission',
    'payment',
    'network',
    'rateLimit',
    'validation',
    'notFound',
    'unknown',
  ]

  const categories = new Set(formattedErrors.map((e) => e.category))
  const primaryCategory =
    categoryPriority.find((cat) => categories.has(cat)) || formattedErrors[0].category

  // Build combined message with context
  const combinedMessage = context.action
    ? `Couldn't ${context.action}: ${messages.join('; ')}`
    : `Multiple errors occurred: ${messages.join('; ')}`

  // Generate unique ID and timestamp
  const id = generateErrorId()
  const timestamp = Date.now()

  // Get recovery actions for the primary category
  const recoveryActions = getDefaultRecoveryActions(primaryCategory)

  return {
    id,
    timestamp,
    message: combinedMessage,
    suggestions: uniqueSuggestions.slice(0, 5), // Limit to 5 suggestions
    category: primaryCategory,
    actionText: getActionText(primaryCategory),
    context,
    requiresAcknowledgment: requiresAcknowledgment(primaryCategory),
    persistent: shouldPersist(primaryCategory),
    recoveryActions,
  }
}

/**
 * PII patterns for detection and redaction
 * Requirements: 8.5
 */
const PII_PATTERNS = {
  // Email addresses: matches common email formats
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers: matches various formats including international
  // Examples: +1-555-123-4567, (555) 123-4567, 555.123.4567, 5551234567
  phone: /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,

  // Social Security Numbers: XXX-XX-XXXX format
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // Credit card numbers: 13-19 digits with optional separators
  creditCard: /\b(?:\d{4}[-\s]?){3,4}\d{1,4}\b/g,

  // IP addresses (IPv4)
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
}

/**
 * Redaction placeholders for different PII types
 */
const PII_REDACTIONS: Record<keyof typeof PII_PATTERNS, string> = {
  email: '[EMAIL_REDACTED]',
  phone: '[PHONE_REDACTED]',
  ssn: '[SSN_REDACTED]',
  creditCard: '[CARD_REDACTED]',
  ipAddress: '[IP_REDACTED]',
}

/**
 * Sanitize PII (Personally Identifiable Information) from data
 * Requirements: 8.5
 *
 * This function:
 * - Detects and redacts email addresses
 * - Detects and redacts phone numbers
 * - Detects and redacts SSNs
 * - Detects and redacts credit card numbers
 * - Detects and redacts IP addresses
 * - Handles strings, objects, arrays, and nested structures
 *
 * @param data - The data to sanitize (can be string, object, array, or any type)
 * @returns Sanitized data with PII replaced by redaction placeholders
 *
 * @example
 * ```typescript
 * const sanitized = sanitizePII('User email: john@example.com, phone: 555-123-4567')
 * // Returns: 'User email: [EMAIL_REDACTED], phone: [PHONE_REDACTED]'
 *
 * const sanitizedObj = sanitizePII({ email: 'john@example.com', name: 'John' })
 * // Returns: { email: '[EMAIL_REDACTED]', name: 'John' }
 * ```
 */
export function sanitizePII(data: unknown): unknown {
  // Handle null and undefined
  if (data === null || data === undefined) {
    return data
  }

  // Handle strings
  if (typeof data === 'string') {
    return sanitizeString(data)
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePII(item))
  }

  // Handle objects (but not special types like Date, RegExp, etc.)
  if (typeof data === 'object') {
    // Skip special object types
    if (data instanceof Date || data instanceof RegExp || data instanceof Error) {
      if (data instanceof Error) {
        // For errors, sanitize the message and stack
        const sanitizedError = new Error(sanitizeString(data.message))
        if (data.stack) {
          sanitizedError.stack = sanitizeString(data.stack)
        }
        return sanitizedError
      }
      return data
    }

    // Handle plain objects
    const sanitizedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      sanitizedObj[key] = sanitizePII(value)
    }
    return sanitizedObj
  }

  // Return primitives (numbers, booleans) as-is
  return data
}

/**
 * Sanitize a string by replacing all PII patterns with redaction placeholders
 */
function sanitizeString(str: string): string {
  let sanitized = str

  // Apply each PII pattern
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const redaction = PII_REDACTIONS[type as keyof typeof PII_PATTERNS]
    // Create a new RegExp to avoid lastIndex issues with global flag
    const freshPattern = new RegExp(pattern.source, pattern.flags)
    sanitized = sanitized.replace(freshPattern, redaction)
  }

  return sanitized
}

/**
 * Check if a string contains any PII
 * Useful for validation before logging
 *
 * @param str - The string to check
 * @returns true if the string contains PII, false otherwise
 */
export function containsPII(str: string): boolean {
  for (const pattern of Object.values(PII_PATTERNS)) {
    // Create a new RegExp without global flag for testing
    const testPattern = new RegExp(pattern.source, pattern.flags.replace('g', ''))
    if (testPattern.test(str)) {
      return true
    }
  }
  return false
}
