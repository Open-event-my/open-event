/**
 * Form Field Error Component
 *
 * Displays validation error messages below form fields with:
 * - Error message display
 * - Suggestion for fixing
 * - ARIA attributes for accessibility (aria-invalid, aria-describedby)
 *
 * Requirements: 4.1, 4.4, 4.6
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { WarningCircle, Lightbulb } from '@phosphor-icons/react'
import { getErrorId, getSuggestionId, getAriaDescribedBy } from './form-field-error.utils'

/**
 * Props for the FormFieldError component
 */
export interface FormFieldErrorProps {
  /** Field name for ARIA association */
  fieldName: string
  /** Error message to display */
  message: string
  /** Suggestion for fixing the error */
  suggestion?: string
  /** Field input element ref for focus */
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  /** Additional class name */
  className?: string
  /** Whether to show the error icon */
  showIcon?: boolean
}

/**
 * FormFieldError Component
 *
 * Displays error message below a form field with optional suggestion.
 * Provides proper ARIA attributes for accessibility.
 *
 * Requirements:
 * - 4.1: Display error message directly below the field
 * - 4.4: Use ARIA attributes to associate errors with their fields
 * - 4.6: Provide specific suggestion for fixing the error
 *
 * @example
 * ```tsx
 * <FormFieldError
 *   fieldName="email"
 *   message="Please enter a valid email address"
 *   suggestion="Make sure to include @ and a domain (e.g., user@example.com)"
 * />
 * ```
 */
export function FormFieldError({
  fieldName,
  message,
  suggestion,
  inputRef,
  className,
  showIcon = true,
}: FormFieldErrorProps) {
  const errorId = getErrorId(fieldName)
  const suggestionId = getSuggestionId(fieldName)

  // Track whether we have an input ref for styling purposes
  const hasInputRef = inputRef !== undefined

  // Focus the input when clicking on the error message
  const handleClick = React.useCallback(() => {
    if (inputRef?.current) {
      inputRef.current.focus()
      inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [inputRef])

  return (
    <div
      className={cn('mt-1.5 space-y-1', className)}
      role="group"
      aria-label={`Error for ${fieldName}`}
    >
      {/* Error message */}
      <div
        id={errorId}
        role="alert"
        aria-live="assertive"
        className={cn(
          'flex items-start gap-1.5 text-sm text-destructive',
          hasInputRef && 'cursor-pointer hover:underline'
        )}
        onClick={hasInputRef ? handleClick : undefined}
      >
        {showIcon && (
          <WarningCircle
            size={16}
            weight="fill"
            className="mt-0.5 flex-shrink-0"
            aria-hidden="true"
          />
        )}
        <span>{message}</span>
      </div>

      {/* Suggestion for fixing */}
      {suggestion && (
        <div id={suggestionId} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lightbulb
            size={14}
            weight="duotone"
            className="mt-0.5 flex-shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <span>{suggestion}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Wrapper component that combines an input with its error display
 *
 * Requirements: 4.1, 4.4, 4.6
 */
export interface FormFieldWithErrorProps {
  /** Field name for ARIA association */
  fieldName: string
  /** Error message (if any) */
  error?: string
  /** Suggestion for fixing (if any) */
  suggestion?: string
  /** The input element */
  children: React.ReactElement<{
    'aria-invalid'?: boolean
    'aria-describedby'?: string
    ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  }>
  /** Additional class name for the container */
  className?: string
}

/**
 * FormFieldWithError Component
 *
 * Wraps an input element and automatically applies ARIA attributes
 * and displays error message below.
 *
 * @example
 * ```tsx
 * <FormFieldWithError
 *   fieldName="email"
 *   error={errors.email}
 *   suggestion="Include @ and a domain"
 * >
 *   <Input
 *     type="email"
 *     value={email}
 *     onChange={(e) => setEmail(e.target.value)}
 *   />
 * </FormFieldWithError>
 * ```
 */
export function FormFieldWithError({
  fieldName,
  error,
  suggestion,
  children,
  className,
}: FormFieldWithErrorProps) {
  const hasError = !!error
  const hasSuggestion = !!suggestion

  // Memoize ARIA props to avoid recalculating on every render
  const ariaProps = React.useMemo(
    () => ({
      'aria-invalid': hasError || undefined,
      'aria-describedby': hasError ? getAriaDescribedBy(fieldName, hasSuggestion) : undefined,
    }),
    [hasError, fieldName, hasSuggestion]
  )

  // Clone the child element to add ARIA attributes
  // Note: We don't pass a ref here to avoid the lint warning
  const enhancedChild = React.cloneElement(children, ariaProps)

  return (
    <div className={className}>
      {enhancedChild}
      {error && <FormFieldError fieldName={fieldName} message={error} suggestion={suggestion} />}
    </div>
  )
}

export default FormFieldError
