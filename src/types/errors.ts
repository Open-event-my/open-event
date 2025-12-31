/**
 * Error handling utilities for type-safe error management
 *
 * Updated to use the error formatter for user-friendly messages.
 * Requirements: 11.1, 11.3
 */

import { formatErrorMessage, type FormattedError } from '@/lib/errorFormatter'

/**
 * Extended error interface for application errors
 */
export interface AppError extends Error {
  code?: string
  status?: number
  details?: unknown
}

/**
 * Type guard to check if an unknown value is an Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Type guard to check if an unknown value is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && ('code' in error || 'status' in error)
}

/**
 * Safely extract error message from an unknown error type
 * This is the primary function for handling catch blocks
 * Now uses the error formatter to provide user-friendly messages
 */
export function getErrorMessage(error: unknown): string {
  const formatted = formatErrorMessage(error)
  return formatted.message
}

/**
 * Create an AppError from an unknown error
 */
export function toAppError(error: unknown, defaultMessage = 'An error occurred'): AppError {
  if (error instanceof Error) {
    return error as AppError
  }
  const appError = new Error(getErrorMessage(error) || defaultMessage) as AppError
  return appError
}

/**
 * Auth-specific error messages
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_EXISTS: 'An account with this email already exists',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  ACCOUNT_SUSPENDED: 'Your account has been suspended',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  RATE_LIMITED: 'Too many attempts. Please try again later.',
} as const

export type AuthErrorCode = keyof typeof AUTH_ERRORS

/**
 * Error display info for UI
 * @deprecated Use FormattedError from errorFormatter instead
 */
export interface ErrorDisplay {
  title: string
  message: string
  action?: string
  variant: 'generic' | 'network' | 'permission' | 'notFound'
}

/**
 * Get user-friendly error display info from an error
 * Now uses the error formatter for consistent error handling
 *
 * @example
 * ```tsx
 * try {
 *   await signIn(email, password)
 * } catch (error) {
 *   const display = getErrorDisplay(error)
 *   toast.error(display.title, { description: display.message })
 * }
 * ```
 */
export function getErrorDisplay(error: unknown): ErrorDisplay {
  const formatted = formatErrorMessage(error)

  // Map category to variant
  const variantMap: Record<FormattedError['category'], ErrorDisplay['variant']> = {
    auth: 'permission',
    network: 'network',
    validation: 'generic',
    permission: 'permission',
    notFound: 'notFound',
    rateLimit: 'generic',
    payment: 'generic',
    server: 'generic',
    unknown: 'generic',
  }

  return {
    title: getCategoryTitle(formatted.category),
    message: formatted.message,
    action: formatted.actionText,
    variant: variantMap[formatted.category],
  }
}

/**
 * Get title based on error category
 */
function getCategoryTitle(category: FormattedError['category']): string {
  switch (category) {
    case 'auth':
      return 'Authentication Required'
    case 'network':
      return 'Connection Problem'
    case 'validation':
      return 'Invalid Input'
    case 'permission':
      return 'Access Denied'
    case 'notFound':
      return 'Not Found'
    case 'rateLimit':
      return 'Too Many Requests'
    case 'payment':
      return 'Payment Error'
    case 'server':
      return 'Server Error'
    case 'unknown':
      return 'Something Went Wrong'
  }
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const formatted = formatErrorMessage(error)
  return formatted.category === 'network'
}
