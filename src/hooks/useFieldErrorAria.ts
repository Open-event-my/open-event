/**
 * Field Error ARIA Hook
 *
 * Hook to apply ARIA attributes to form fields with errors.
 */

import * as React from 'react'
import { getAriaDescribedBy } from '@/components/ui/form-field-error.utils'

/**
 * Helper hook to apply ARIA attributes to a form field with error
 *
 * @param fieldName - The field name
 * @param hasError - Whether the field has an error
 * @param hasSuggestion - Whether there's a suggestion
 * @returns ARIA attributes to spread on the input element
 *
 * @example
 * ```tsx
 * const ariaProps = useFieldErrorAria('email', !!error, !!suggestion)
 * return <input {...ariaProps} />
 * ```
 */
export function useFieldErrorAria(
  fieldName: string,
  hasError: boolean,
  hasSuggestion: boolean = false
): {
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
} {
  return React.useMemo(
    () => ({
      'aria-invalid': hasError || undefined,
      'aria-describedby': hasError ? getAriaDescribedBy(fieldName, hasSuggestion) : undefined,
    }),
    [fieldName, hasError, hasSuggestion]
  )
}
