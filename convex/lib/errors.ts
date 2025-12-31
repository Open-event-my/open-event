/**
 * Standardized Error Handling Utilities
 *
 * This module provides consistent error types and formatting
 * for the entire Convex backend.
 *
 * Updated to use error formatter for user-friendly messages.
 * Requirements: 11.1, 11.3
 */

import { formatConvexError, throwUserFriendlyError } from './errorFormatter'

/**
 * Application Error class for consistent error handling.
 *
 * Usage:
 * ```typescript
 * throw new AppError('User not found', 'USER_NOT_FOUND', 404)
 * ```
 */
export class AppError extends Error {
  public readonly code: string
  public readonly status: number

  constructor(message: string, code: string, status: number = 400) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

/**
 * Common error codes used throughout the application
 */
export const ErrorCodes = {
  // Authentication errors (4xx)
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Resource errors (4xx)
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Validation errors (4xx)
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Rate limiting (429)
  RATE_LIMITED: 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Format an error for HTTP response.
 * Now uses the error formatter for user-friendly messages.
 *
 * Usage:
 * ```typescript
 * try {
 *   // ... operation
 * } catch (error) {
 *   const formatted = formatErrorResponse(error)
 *   return new Response(JSON.stringify(formatted), {
 *     status: formatted.status
 *   })
 * }
 * ```
 */
export function formatErrorResponse(error: unknown): {
  error: string
  code: string
  status: number
  details?: unknown
  suggestions?: string[]
} {
  if (error instanceof AppError) {
    const formatted = formatConvexError(error, error.code)
    return {
      error: formatted.message,
      code: formatted.code,
      status: error.status,
      suggestions: formatted.suggestions,
    }
  }

  if (error instanceof Error) {
    // Format the error message to be user-friendly
    const formatted = formatConvexError(error)

    // Determine status code from error message
    let status = 500
    if (error.message.includes('Authentication required')) {
      status = 401
    } else if (error.message.includes('Access denied')) {
      status = 403
    } else if (error.message.includes('not found')) {
      status = 404
    }

    return {
      error: formatted.message,
      code: formatted.code,
      status,
      suggestions: formatted.suggestions,
    }
  }

  // Unknown error type - format it
  const formatted = formatConvexError(error)
  return {
    error: formatted.message,
    code: formatted.code,
    status: 500,
    suggestions: formatted.suggestions,
  }
}

/**
 * Create an authentication error
 * Now throws user-friendly error
 */
export function authError(message = 'Authentication required'): AppError {
  throwUserFriendlyError('UNAUTHORIZED', message)
}

/**
 * Create a forbidden error
 * Now throws user-friendly error
 */
export function forbiddenError(message = 'Access denied'): AppError {
  throwUserFriendlyError('FORBIDDEN', message)
}

/**
 * Create a not found error
 * Now throws user-friendly error
 */
export function notFoundError(resource: string): AppError {
  throwUserFriendlyError('NOT_FOUND', `${resource} not found`)
}

/**
 * Create a validation error
 * Now throws user-friendly error
 */
export function validationError(message: string, details?: unknown): AppError {
  const formatted = formatConvexError({ code: 'INVALID_INPUT', message }, 'INVALID_INPUT')
  const error = new AppError(formatted.message, ErrorCodes.INVALID_INPUT, 400)
  if (details) {
    ;(error as AppError & { details?: unknown }).details = details
  }
  return error
}

/**
 * Create a rate limit error
 * Now throws user-friendly error
 */
export function rateLimitError(message = 'Rate limit exceeded'): AppError {
  throwUserFriendlyError('RATE_LIMITED', message)
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
