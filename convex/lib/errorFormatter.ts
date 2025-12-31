/**
 * Backend Error Message Formatter
 *
 * Transforms technical errors into user-friendly messages for Convex functions.
 * Strips stack traces and technical details from user-facing error messages.
 *
 * Requirements: 11.1, 11.3
 */

import { ConvexError } from 'convex/values'

/**
 * Error category for determining appropriate user message
 */
export type ErrorCategory =
  | 'auth'
  | 'validation'
  | 'permission'
  | 'notFound'
  | 'rateLimit'
  | 'server'
  | 'unknown'

/**
 * Formatted error for Convex responses
 */
export interface FormattedConvexError {
  /** User-friendly error message (no technical details) */
  message: string
  /** Error code for client-side handling */
  code: string
  /** Error category */
  category: ErrorCategory
  /** Optional recovery suggestions */
  suggestions?: string[]
  /** Optional field-specific errors */
  fields?: Record<string, string>
  [key: string]: string | string[] | Record<string, string> | undefined
}

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

  // Permission errors
  FORBIDDEN: {
    message: "You don't have permission to perform this action.",
    suggestions: [
      'Contact your organization admin for access',
      "Check if you're signed in to the correct account",
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

  // Rate limiting
  RATE_LIMITED: {
    message: "You're making requests too quickly.",
    suggestions: ['Wait a moment before trying again', 'Slow down your actions'],
    category: 'rateLimit',
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
 * Strip technical details from error message
 */
function sanitizeErrorMessage(message: string): string {
  // Remove stack trace patterns
  let sanitized = message
    .replace(/at\s+[\w.]+\s+\([^)]+\)/g, '')
    .replace(/Error:\s+/g, '')
    .replace(/TypeError:\s+/g, '')
    .replace(/\bat\b.*?:\d+:\d+/g, '')
    .replace(/file:\/\/\/[^\s]+/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')

  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // If message is now empty or too short, use generic message
  if (!sanitized || sanitized.length < 10) {
    return 'An unexpected error occurred'
  }

  return sanitized
}

/**
 * Format an error for Convex response
 *
 * This function:
 * - Strips stack traces and technical details
 * - Maps error codes to friendly messages
 * - Provides actionable recovery suggestions
 *
 * @param error - The error to format
 * @param defaultCode - Default error code if none is found
 * @returns Formatted error for ConvexError
 *
 * @example
 * ```typescript
 * export const myMutation = mutation({
 *   handler: async (ctx, args) => {
 *     try {
 *       // ... operation
 *     } catch (error) {
 *       const formatted = formatConvexError(error)
 *       throw new ConvexError(formatted)
 *     }
 *   }
 * })
 * ```
 */
export function formatConvexError(
  error: unknown,
  defaultCode = 'INTERNAL_ERROR'
): FormattedConvexError {
  // Extract error code
  let code = defaultCode
  if (error && typeof error === 'object' && 'code' in error) {
    const errorCode = (error as { code: unknown }).code
    if (typeof errorCode === 'string') {
      code = errorCode
    }
  }

  // If we have a known error code, use the predefined message
  if (ERROR_MESSAGES[code]) {
    return {
      code,
      ...ERROR_MESSAGES[code],
    }
  }

  // Extract and sanitize the error message
  let message = 'An unexpected error occurred'
  if (error instanceof Error) {
    message = sanitizeErrorMessage(error.message)
  } else if (typeof error === 'string') {
    message = sanitizeErrorMessage(error)
  } else if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message
    if (typeof msg === 'string') {
      message = sanitizeErrorMessage(msg)
    }
  }

  return {
    code,
    message,
    category: 'unknown',
    suggestions: ['Try again', 'Contact support if the problem continues'],
  }
}

/**
 * Throw a user-friendly ConvexError
 *
 * @example
 * ```typescript
 * if (!user) {
 *   throwUserFriendlyError('UNAUTHORIZED')
 * }
 * ```
 */
export function throwUserFriendlyError(code: string, customMessage?: string): never {
  const formatted = ERROR_MESSAGES[code] || {
    message: customMessage || 'An error occurred',
    category: 'unknown' as ErrorCategory,
  }

  throw new ConvexError<FormattedConvexError>({
    code,
    message: formatted.message,
    category: formatted.category,
    suggestions: formatted.suggestions,
  })
}

/**
 * Create a validation error with field details
 *
 * @example
 * ```typescript
 * if (!email.includes('@')) {
 *   throw createValidationError('Invalid email format', { email: 'Must be a valid email' })
 * }
 * ```
 */
export function createValidationError(
  message: string,
  fields?: Record<string, string>
): ConvexError<FormattedConvexError> {
  return new ConvexError<FormattedConvexError>({
    code: 'VALIDATION_ERROR',
    message: sanitizeErrorMessage(message),
    category: 'validation',
    suggestions: ['Check the highlighted fields', 'Make sure all required fields are filled'],
    fields,
  })
}

/**
 * Wrap a Convex handler with automatic error formatting
 *
 * @example
 * ```typescript
 * export const myMutation = mutation({
 *   handler: withErrorFormatting(async (ctx, args) => {
 *     // ... your logic
 *     // Errors will be automatically formatted
 *   })
 * })
 * ```
 */
export function withErrorFormatting<T, Args extends unknown[]>(
  handler: (...args: Args) => Promise<T>
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    try {
      return await handler(...args)
    } catch (error) {
      // If it's already a ConvexError with formatted data, rethrow it
      if (error instanceof ConvexError) {
        throw error
      }

      // Format and throw
      const formatted = formatConvexError(error)
      throw new ConvexError<FormattedConvexError>(formatted)
    }
  }
}
