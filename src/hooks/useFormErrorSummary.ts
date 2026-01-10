/**
 * Form Error Summary Hook
 *
 * Hook to manage form error summary state.
 */

import * as React from 'react'
import type { FieldError } from '@/components/ui/form-error-summary'
import { convertErrorsToFieldErrors } from '@/components/ui/form-error-summary.utils'

/**
 * Focus a field by its name
 * @param fieldName - The field name to focus
 */
function focusField(fieldName: string): void {
  // Try multiple selectors to find the field
  const selectors = [
    `#${fieldName}`,
    `[name="${fieldName}"]`,
    `[data-field="${fieldName}"]`,
    `#${fieldName}-input`,
  ]

  for (const selector of selectors) {
    try {
      const element = document.querySelector<HTMLElement>(selector)
      if (element) {
        element.focus()
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    } catch {
      // Invalid selector, try next
    }
  }
}

/**
 * Hook to manage form error summary state
 *
 * @param errors - Object mapping field names to error messages
 * @param labels - Optional object mapping field names to labels
 * @returns Object with fieldErrors array and helper functions
 */
export function useFormErrorSummary(
  errors: Record<string, string | string[] | undefined>,
  labels?: Record<string, string>
): {
  fieldErrors: FieldError[]
  errorCount: number
  hasErrors: boolean
  focusFirstError: () => void
} {
  const fieldErrors = React.useMemo(
    () => convertErrorsToFieldErrors(errors, labels),
    [errors, labels]
  )

  const errorCount = fieldErrors.length
  const hasErrors = errorCount > 0

  const focusFirstError = React.useCallback(() => {
    if (fieldErrors.length > 0) {
      focusField(fieldErrors[0].fieldName)
    }
  }, [fieldErrors])

  return {
    fieldErrors,
    errorCount,
    hasErrors,
    focusFirstError,
  }
}
