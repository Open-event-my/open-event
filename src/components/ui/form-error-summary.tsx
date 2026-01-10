/**
 * Form Error Summary Component
 *
 * Displays a summary of all form validation errors at the top of a form.
 * Each error links to its corresponding field for easy navigation.
 *
 * Requirements: 4.5
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { WarningCircle, X } from '@phosphor-icons/react'

/**
 * Individual field error for the summary
 */
export interface FieldError {
  /** Field name/identifier */
  fieldName: string
  /** Human-readable field label */
  label: string
  /** Error message */
  message: string
}

/**
 * Props for the FormErrorSummary component
 */
export interface FormErrorSummaryProps {
  /** Array of field errors to display */
  errors: FieldError[]
  /** Title for the error summary */
  title?: string
  /** Called when the summary is dismissed */
  onDismiss?: () => void
  /** Additional class name */
  className?: string
  /** Whether to auto-focus the summary when it appears */
  autoFocus?: boolean
  /** ID for the summary element (for aria-describedby) */
  id?: string
}

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
 * FormErrorSummary Component
 *
 * Displays a list of all form validation errors at the top of a form.
 * Each error is clickable and focuses the corresponding field.
 *
 * Requirements:
 * - 4.5: Display a summary at the top of the form listing all errors
 * - 4.5: Link each error to its field (click to focus)
 * - 4.5: Update dynamically as errors change
 *
 * @example
 * ```tsx
 * <FormErrorSummary
 *   errors={[
 *     { fieldName: 'email', label: 'Email', message: 'Please enter a valid email' },
 *     { fieldName: 'password', label: 'Password', message: 'Password is required' },
 *   ]}
 *   title="Please fix the following errors:"
 * />
 * ```
 */
export function FormErrorSummary({
  errors,
  title = 'Please fix the following errors:',
  onDismiss,
  className,
  autoFocus = true,
  id = 'form-error-summary',
}: FormErrorSummaryProps) {
  const summaryRef = React.useRef<HTMLDivElement>(null)

  // Auto-focus the summary when errors appear
  React.useEffect(() => {
    if (autoFocus && errors.length > 0 && summaryRef.current) {
      summaryRef.current.focus()
    }
  }, [autoFocus, errors.length])

  // Don't render if there are no errors
  if (errors.length === 0) {
    return null
  }

  return (
    <div
      ref={summaryRef}
      id={id}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={-1}
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/10 p-4',
        'focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <WarningCircle
          size={20}
          weight="fill"
          className="mt-0.5 flex-shrink-0 text-destructive"
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h2 className="text-sm font-medium text-destructive">{title}</h2>

          {/* Error list */}
          <ul className="mt-2 space-y-1" aria-label="Form errors">
            {errors.map((error, index) => (
              <li key={`${error.fieldName}-${index}`}>
                <button
                  type="button"
                  onClick={() => focusField(error.fieldName)}
                  className={cn(
                    'text-sm text-destructive/90 hover:text-destructive',
                    'hover:underline focus:underline focus:outline-none',
                    'text-left'
                  )}
                  aria-describedby={`${id}-error-${index}`}
                >
                  <span className="font-medium">{error.label}:</span>{' '}
                  <span id={`${id}-error-${index}`}>{error.message}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Error count */}
          <p className="mt-2 text-xs text-destructive/70">
            {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
          </p>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 p-1 rounded-md transition-colors',
              'text-destructive/70 hover:text-destructive hover:bg-destructive/10',
              'focus:outline-none focus:ring-2 focus:ring-destructive'
            )}
            aria-label="Dismiss error summary"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
}

export default FormErrorSummary
