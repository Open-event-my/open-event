/**
 * Property-Based Tests for Form Error Summary
 *
 * Feature: error-messaging-improvements, Property 10: Error Summary Completeness
 * Validates: Requirements 4.5
 *
 * For any form with N validation errors, the error summary SHALL list exactly N error messages.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { FormErrorSummary } from './form-error-summary'
import {
  convertErrorsToFieldErrors,
  formatFieldLabel,
  getErrorCount,
} from './form-error-summary.utils'
import { useFormErrorSummary } from '@/hooks/useFormErrorSummary'

// Test component to verify useFormErrorSummary hook
function TestHookComponent({
  errors,
  labels,
}: {
  errors: Record<string, string | string[] | undefined>
  labels?: Record<string, string>
}) {
  const { fieldErrors, errorCount, hasErrors } = useFormErrorSummary(errors, labels)
  return (
    <div>
      <span data-testid="error-count">{errorCount}</span>
      <span data-testid="has-errors">{hasErrors.toString()}</span>
      <span data-testid="field-errors-length">{fieldErrors.length}</span>
    </div>
  )
}

describe('Form Error Summary - Property Tests', () => {
  /**
   * Feature: error-messaging-improvements, Property 10: Error Summary Completeness
   * Validates: Requirements 4.5
   *
   * For any form with N validation errors, the error summary SHALL list exactly N error messages.
   */
  describe('Property 10: Error Summary Completeness', () => {
    // Arbitrary for valid field names
    const fieldNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,20}$/)

    // Arbitrary for error messages (non-empty strings)
    const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 })

    // Arbitrary for field labels
    const labelArb = fc.string({ minLength: 1, maxLength: 50 })

    // Arbitrary for a single FieldError
    const fieldErrorArb = fc.record({
      fieldName: fieldNameArb,
      label: labelArb,
      message: errorMessageArb,
    })

    // Arbitrary for an array of FieldErrors (1-10 errors)
    const fieldErrorsArb = fc.array(fieldErrorArb, { minLength: 1, maxLength: 10 })

    it('should display exactly N error messages for N errors', { timeout: 30000 }, () => {
      fc.assert(
        fc.property(fieldErrorsArb, (errors) => {
          const { unmount } = render(<FormErrorSummary errors={errors} />)

          // Get all list items in the error list
          const listItems = screen.getAllByRole('button')

          // Should have exactly N error messages displayed
          expect(listItems.length).toBe(errors.length)

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should display each error message in the summary', () => {
      fc.assert(
        fc.property(fieldErrorsArb, (errors) => {
          const { unmount, container } = render(<FormErrorSummary errors={errors} />)

          // Each error message should be present in the summary
          for (const error of errors) {
            expect(container.textContent).toContain(error.message)
            expect(container.textContent).toContain(error.label)
          }

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should display correct error count text', () => {
      fc.assert(
        fc.property(fieldErrorsArb, (errors) => {
          const { unmount, container } = render(<FormErrorSummary errors={errors} />)

          const expectedText =
            errors.length === 1 ? '1 error found' : `${errors.length} errors found`

          expect(container.textContent).toContain(expectedText)

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should not render when errors array is empty', () => {
      fc.assert(
        fc.property(
          fc.constant([] as const).map((arr) => [...arr]),
          (errors) => {
            const { container, unmount } = render(<FormErrorSummary errors={errors} />)

            // Should not render anything when no errors
            expect(container.firstChild).toBeNull()

            unmount()
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should convert errors object to exactly N FieldErrors', () => {
      // Generate a record of field names to error messages
      const errorsRecordArb = fc.dictionary(fieldNameArb, errorMessageArb, {
        minKeys: 1,
        maxKeys: 10,
      })

      fc.assert(
        fc.property(errorsRecordArb, (errorsRecord) => {
          const fieldErrors = convertErrorsToFieldErrors(errorsRecord)

          // Should have exactly the same number of errors
          const expectedCount = Object.keys(errorsRecord).length
          expect(fieldErrors.length).toBe(expectedCount)

          // Each field should be represented
          for (const fieldName of Object.keys(errorsRecord)) {
            const found = fieldErrors.find((e) => e.fieldName === fieldName)
            expect(found).toBeDefined()
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should handle array error messages correctly', () => {
      // Generate errors with array messages
      const errorsWithArraysArb = fc.dictionary(
        fieldNameArb,
        fc.array(errorMessageArb, { minLength: 1, maxLength: 3 }),
        { minKeys: 1, maxKeys: 5 }
      )

      fc.assert(
        fc.property(errorsWithArraysArb, (errorsRecord) => {
          const fieldErrors = convertErrorsToFieldErrors(errorsRecord)

          // Should have exactly the same number of errors (one per field)
          const expectedCount = Object.keys(errorsRecord).length
          expect(fieldErrors.length).toBe(expectedCount)

          // Each field error should use the first message from the array
          for (const [fieldName, messages] of Object.entries(errorsRecord)) {
            const found = fieldErrors.find((e) => e.fieldName === fieldName)
            expect(found).toBeDefined()
            expect(found?.message).toBe(messages[0])
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should skip undefined and empty error values', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fieldNameArb,
            fc.oneof(
              errorMessageArb,
              fc.constant(undefined),
              fc.constant(''),
              fc.constant([] as string[])
            ),
            { minKeys: 1, maxKeys: 10 }
          ),
          (errorsRecord) => {
            const fieldErrors = convertErrorsToFieldErrors(errorsRecord)

            // Count non-empty errors
            const nonEmptyCount = Object.values(errorsRecord).filter((v) => {
              if (v === undefined || v === '') return false
              if (Array.isArray(v) && v.length === 0) return false
              return true
            }).length

            // Should only include non-empty errors
            expect(fieldErrors.length).toBe(nonEmptyCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use provided labels when available', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fieldNameArb, errorMessageArb, { minKeys: 1, maxKeys: 5 }),
          fc.dictionary(fieldNameArb, labelArb, { minKeys: 0, maxKeys: 5 }),
          (errorsRecord, labelsRecord) => {
            const fieldErrors = convertErrorsToFieldErrors(errorsRecord, labelsRecord)

            for (const error of fieldErrors) {
              if (labelsRecord[error.fieldName]) {
                // Should use provided label
                expect(error.label).toBe(labelsRecord[error.fieldName])
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should format field names correctly when no label provided', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const label = formatFieldLabel(fieldName)

          // Label should be non-empty
          expect(label.length).toBeGreaterThan(0)
          // Label should start with uppercase
          expect(label[0]).toBe(label[0].toUpperCase())
          // Label should not have leading/trailing spaces
          expect(label).toBe(label.trim())
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly count errors in getErrorCount', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fieldNameArb,
            fc.oneof(
              errorMessageArb,
              fc.constant(undefined),
              fc.constant(''),
              fc.array(errorMessageArb, { minLength: 0, maxLength: 3 })
            ),
            { minKeys: 0, maxKeys: 10 }
          ),
          (errorsRecord) => {
            const count = getErrorCount(errorsRecord)

            // Count non-empty errors manually
            const expectedCount = Object.values(errorsRecord).filter((v) => {
              if (v === undefined || v === '') return false
              if (Array.isArray(v) && v.length === 0) return false
              return true
            }).length

            expect(count).toBe(expectedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return correct values from useFormErrorSummary hook', () => {
      fc.assert(
        fc.property(
          fc.dictionary(fieldNameArb, errorMessageArb, { minKeys: 0, maxKeys: 5 }),
          (errorsRecord) => {
            const { unmount } = render(<TestHookComponent errors={errorsRecord} />)

            const expectedCount = Object.keys(errorsRecord).length

            expect(screen.getByTestId('error-count').textContent).toBe(expectedCount.toString())
            expect(screen.getByTestId('has-errors').textContent).toBe(
              (expectedCount > 0).toString()
            )
            expect(screen.getByTestId('field-errors-length').textContent).toBe(
              expectedCount.toString()
            )

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have role="alert" on the summary container', () => {
      fc.assert(
        fc.property(fieldErrorsArb, (errors) => {
          const { unmount } = render(<FormErrorSummary errors={errors} />)

          const alert = screen.getByRole('alert')
          expect(alert).toBeDefined()

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should have aria-live="assertive" for immediate announcement', () => {
      fc.assert(
        fc.property(fieldErrorsArb, (errors) => {
          const { unmount } = render(<FormErrorSummary errors={errors} />)

          const alert = screen.getByRole('alert')
          expect(alert.getAttribute('aria-live')).toBe('assertive')

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should have aria-atomic="true" for complete re-reading', () => {
      fc.assert(
        fc.property(fieldErrorsArb, (errors) => {
          const { unmount } = render(<FormErrorSummary errors={errors} />)

          const alert = screen.getByRole('alert')
          expect(alert.getAttribute('aria-atomic')).toBe('true')

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should render clickable buttons for each error', () => {
      fc.assert(
        fc.property(fieldErrorsArb, (errors) => {
          const { unmount } = render(<FormErrorSummary errors={errors} />)

          const buttons = screen.getAllByRole('button')

          // Should have a button for each error (plus optional dismiss button)
          expect(buttons.length).toBeGreaterThanOrEqual(errors.length)

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should update dynamically when errors change', { timeout: 30000 }, () => {
      fc.assert(
        fc.property(fieldErrorsArb, fieldErrorsArb, (errors1, errors2) => {
          const { rerender, unmount } = render(<FormErrorSummary errors={errors1} />)

          // Initial render should show errors1
          let buttons = screen.getAllByRole('button')
          expect(buttons.length).toBeGreaterThanOrEqual(errors1.length)

          // Re-render with errors2
          rerender(<FormErrorSummary errors={errors2} />)

          // Should now show errors2
          buttons = screen.getAllByRole('button')
          expect(buttons.length).toBeGreaterThanOrEqual(errors2.length)

          unmount()
        }),
        { numRuns: 50 } // Reduced runs due to re-render overhead
      )
    })
  })
})
