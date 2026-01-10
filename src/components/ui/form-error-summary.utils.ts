/**
 * Form Error Summary Utilities
 *
 * Utility functions for form error summary handling.
 */

import type { FieldError } from './form-error-summary'

/**
 * Convert validation errors object to FieldError array
 *
 * @param errors - Object mapping field names to error messages
 * @param labels - Optional object mapping field names to labels
 * @returns Array of FieldError objects
 *
 * @example
 * ```tsx
 * const fieldErrors = convertErrorsToFieldErrors(
 *   { email: 'Invalid email', password: 'Required' },
 *   { email: 'Email Address', password: 'Password' }
 * )
 * ```
 */
export function convertErrorsToFieldErrors(
  errors: Record<string, string | string[] | undefined>,
  labels?: Record<string, string>
): FieldError[] {
  const fieldErrors: FieldError[] = []

  for (const [fieldName, error] of Object.entries(errors)) {
    if (!error) continue

    const message = Array.isArray(error) ? error[0] : error
    if (!message) continue

    const label = labels?.[fieldName] || formatFieldLabel(fieldName)

    fieldErrors.push({
      fieldName,
      label,
      message,
    })
  }

  return fieldErrors
}

/**
 * Format a field name into a human-readable label
 *
 * @param fieldName - The field name to format
 * @returns Human-readable label
 *
 * @example
 * formatFieldLabel('firstName') // 'First Name'
 * formatFieldLabel('email_address') // 'Email Address'
 */
export function formatFieldLabel(fieldName: string): string {
  return (
    fieldName
      // Insert space before uppercase letters
      .replace(/([A-Z])/g, ' $1')
      // Replace underscores and hyphens with spaces
      .replace(/[_-]/g, ' ')
      // Capitalize first letter of each word
      .replace(/\b\w/g, (char) => char.toUpperCase())
      // Trim and normalize spaces
      .trim()
      .replace(/\s+/g, ' ')
  )
}

/**
 * Get the count of errors in an errors object
 *
 * @param errors - Object mapping field names to error messages
 * @returns Number of fields with errors
 */
export function getErrorCount(errors: Record<string, string | string[] | undefined>): number {
  return Object.values(errors).filter((error) => {
    if (!error) return false
    if (Array.isArray(error)) return error.length > 0
    return error.length > 0
  }).length
}
