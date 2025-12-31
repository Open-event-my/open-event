/**
 * Centralized error handling utilities
 *
 * Provides consistent error handling patterns across the application.
 * Use these utilities instead of inline try-catch with toast notifications.
 *
 * Updated to use the error formatter for user-friendly messages.
 * Requirements: 11.1, 11.3
 */

import { toast } from 'sonner'
import { formatErrorMessage, type FormattedError } from './errorFormatter'

/**
 * Standard error messages for common scenarios
 * @deprecated Use formatErrorMessage instead for better error handling
 */
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment.',
} as const

/**
 * Extract a user-friendly message from an error
 * Now uses the error formatter to strip technical details
 */
export function getErrorMessage(error: unknown, fallback = ERROR_MESSAGES.GENERIC): string {
  const formatted = formatErrorMessage(error)
  return formatted.message || fallback
}

/**
 * Get formatted error with recovery suggestions
 *
 * @example
 * ```ts
 * try {
 *   await someAction()
 * } catch (error) {
 *   const formatted = getFormattedError(error)
 *   toast.error(formatted.message, {
 *     description: formatted.suggestions?.join('\n')
 *   })
 * }
 * ```
 */
export function getFormattedError(error: unknown): FormattedError {
  return formatErrorMessage(error)
}

/**
 * Handle an error with a toast notification
 * Now includes recovery suggestions when available
 *
 * @example
 * ```ts
 * try {
 *   await someAction()
 * } catch (error) {
 *   handleError(error, 'Failed to save changes')
 * }
 * ```
 */
export function handleError(error: unknown, context?: string): void {
  const formatted = formatErrorMessage(error)
  const displayMessage = context ? `${context}: ${formatted.message}` : formatted.message

  // Log detailed error server-side (with technical details for debugging)
  console.error('[Error]', context || 'Unknown context', error)

  // Show user-friendly error with suggestions
  if (formatted.suggestions && formatted.suggestions.length > 0) {
    toast.error(displayMessage, {
      description: formatted.suggestions.slice(0, 2).join('\n'), // Show max 2 suggestions in toast
    })
  } else {
    toast.error(displayMessage)
  }
}

/**
 * Wrapper for async operations with automatic error handling
 * Now returns formatted error with suggestions
 *
 * @example
 * ```ts
 * const result = await withErrorHandling(
 *   () => api.createEvent(data),
 *   'Failed to create event'
 * )
 * if (result.success) {
 *   // handle success
 * } else {
 *   // result.formatted contains user-friendly message and suggestions
 * }
 * ```
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<
  | { success: true; data: T }
  | { success: false; error: string; formatted: FormattedError }
> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const formatted = formatErrorMessage(error)
    handleError(error, errorContext)
    return { success: false, error: formatted.message, formatted }
  }
}

/**
 * Wrapper for async operations with success toast
 * Now shows recovery suggestions on error
 *
 * @example
 * ```ts
 * await withToast(
 *   () => api.deleteEvent(id),
 *   { success: 'Event deleted', error: 'Failed to delete event' }
 * )
 * ```
 */
export async function withToast<T>(
  operation: () => Promise<T>,
  messages: { success: string; error: string }
): Promise<T | null> {
  try {
    const result = await operation()
    toast.success(messages.success)
    return result
  } catch (error) {
    handleError(error, messages.error)
    return null
  }
}
