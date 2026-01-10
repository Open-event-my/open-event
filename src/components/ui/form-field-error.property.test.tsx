/**
 * Property-Based Tests for Form Field Error
 *
 * Feature: error-messaging-improvements, Property 9: Field Error ARIA Association
 * Validates: Requirements 4.4
 *
 * For any form field with a validation error, the field input SHALL have
 * `aria-invalid="true"` and `aria-describedby` pointing to the error message element.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { FormFieldError, FormFieldWithError } from './form-field-error'
import { getErrorId, getSuggestionId, getAriaDescribedBy } from './form-field-error.utils'
import { useFieldErrorAria } from '@/hooks/useFieldErrorAria'

// Test component to verify useFieldErrorAria hook
function TestInput({
  fieldName,
  hasError,
  hasSuggestion,
}: {
  fieldName: string
  hasError: boolean
  hasSuggestion: boolean
}) {
  const ariaProps = useFieldErrorAria(fieldName, hasError, hasSuggestion)
  return <input data-testid="test-input" {...ariaProps} />
}

describe('Form Field Error - Property Tests', () => {
  /**
   * Feature: error-messaging-improvements, Property 9: Field Error ARIA Association
   * Validates: Requirements 4.4
   *
   * For any form field with a validation error, the field input SHALL have
   * `aria-invalid="true"` and `aria-describedby` pointing to the error message element.
   */
  describe('Property 9: Field Error ARIA Association', () => {
    // Arbitrary for valid field names (alphanumeric with optional hyphens/underscores)
    const fieldNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,30}$/)

    // Arbitrary for error messages (non-empty strings)
    const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 })

    it('should generate correct error ID for any field name', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const errorId = getErrorId(fieldName)

          // Error ID should follow the pattern: {fieldName}-error
          expect(errorId).toBe(`${fieldName}-error`)
          // Error ID should be non-empty
          expect(errorId.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should generate correct suggestion ID for any field name', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const suggestionId = getSuggestionId(fieldName)

          // Suggestion ID should follow the pattern: {fieldName}-suggestion
          expect(suggestionId).toBe(`${fieldName}-suggestion`)
          // Suggestion ID should be non-empty
          expect(suggestionId.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should generate aria-describedby with error ID only when no suggestion', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const describedBy = getAriaDescribedBy(fieldName, false)

          // Should only contain the error ID
          expect(describedBy).toBe(getErrorId(fieldName))
          // Should not contain suggestion ID
          expect(describedBy).not.toContain('suggestion')
        }),
        { numRuns: 100 }
      )
    })

    it('should generate aria-describedby with both IDs when suggestion exists', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const describedBy = getAriaDescribedBy(fieldName, true)

          // Should contain both error ID and suggestion ID
          expect(describedBy).toContain(getErrorId(fieldName))
          expect(describedBy).toContain(getSuggestionId(fieldName))
          // Should be space-separated
          expect(describedBy).toBe(`${getErrorId(fieldName)} ${getSuggestionId(fieldName)}`)
        }),
        { numRuns: 100 }
      )
    })

    it('should return aria-invalid=true when field has error', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const { unmount } = render(
            <TestInput fieldName={fieldName} hasError={true} hasSuggestion={false} />
          )

          const input = screen.getByTestId('test-input')

          // aria-invalid should be true when there's an error
          expect(input.getAttribute('aria-invalid')).toBe('true')
          // aria-describedby should point to error element
          expect(input.getAttribute('aria-describedby')).toBe(getErrorId(fieldName))

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should not have aria-invalid when field has no error', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const { unmount } = render(
            <TestInput fieldName={fieldName} hasError={false} hasSuggestion={false} />
          )

          const input = screen.getByTestId('test-input')

          // aria-invalid should not be present when there's no error
          expect(input.hasAttribute('aria-invalid')).toBe(false)
          // aria-describedby should not be present when there's no error
          expect(input.hasAttribute('aria-describedby')).toBe(false)

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should include suggestion ID in aria-describedby when suggestion exists', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const { unmount } = render(
            <TestInput fieldName={fieldName} hasError={true} hasSuggestion={true} />
          )

          const input = screen.getByTestId('test-input')
          const describedBy = input.getAttribute('aria-describedby')

          // Should contain both error and suggestion IDs
          expect(describedBy).toContain(getErrorId(fieldName))
          expect(describedBy).toContain(getSuggestionId(fieldName))

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should render FormFieldError with correct error ID', () => {
      fc.assert(
        fc.property(fieldNameArb, errorMessageArb, (fieldName, message) => {
          const { unmount } = render(<FormFieldError fieldName={fieldName} message={message} />)

          // Error element should have the correct ID
          const errorElement = document.getElementById(getErrorId(fieldName))
          expect(errorElement).not.toBeNull()
          expect(errorElement?.textContent).toContain(message)

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should render FormFieldError with suggestion ID when suggestion provided', () => {
      fc.assert(
        fc.property(
          fieldNameArb,
          errorMessageArb,
          errorMessageArb,
          (fieldName, message, suggestion) => {
            const { unmount } = render(
              <FormFieldError fieldName={fieldName} message={message} suggestion={suggestion} />
            )

            // Error element should have the correct ID
            const errorElement = document.getElementById(getErrorId(fieldName))
            expect(errorElement).not.toBeNull()

            // Suggestion element should have the correct ID
            const suggestionElement = document.getElementById(getSuggestionId(fieldName))
            expect(suggestionElement).not.toBeNull()
            expect(suggestionElement?.textContent).toContain(suggestion)

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not render suggestion element when no suggestion provided', () => {
      fc.assert(
        fc.property(fieldNameArb, errorMessageArb, (fieldName, message) => {
          const { unmount } = render(<FormFieldError fieldName={fieldName} message={message} />)

          // Suggestion element should not exist
          const suggestionElement = document.getElementById(getSuggestionId(fieldName))
          expect(suggestionElement).toBeNull()

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should have role="alert" on error message element', () => {
      fc.assert(
        fc.property(fieldNameArb, errorMessageArb, (fieldName, message) => {
          const { unmount } = render(<FormFieldError fieldName={fieldName} message={message} />)

          const errorElement = document.getElementById(getErrorId(fieldName))

          // Error element should have role="alert" for screen readers
          expect(errorElement?.getAttribute('role')).toBe('alert')

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should have aria-live="assertive" on error message element', () => {
      fc.assert(
        fc.property(fieldNameArb, errorMessageArb, (fieldName, message) => {
          const { unmount } = render(<FormFieldError fieldName={fieldName} message={message} />)

          const errorElement = document.getElementById(getErrorId(fieldName))

          // Error element should have aria-live="assertive" for immediate announcement
          expect(errorElement?.getAttribute('aria-live')).toBe('assertive')

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should apply aria-invalid to wrapped input in FormFieldWithError', () => {
      fc.assert(
        fc.property(fieldNameArb, errorMessageArb, (fieldName, error) => {
          const { unmount } = render(
            <FormFieldWithError fieldName={fieldName} error={error}>
              <input data-testid="wrapped-input" />
            </FormFieldWithError>
          )

          const input = screen.getByTestId('wrapped-input')

          // Wrapped input should have aria-invalid="true"
          expect(input.getAttribute('aria-invalid')).toBe('true')
          // Wrapped input should have aria-describedby pointing to error
          expect(input.getAttribute('aria-describedby')).toBe(getErrorId(fieldName))

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should not apply aria-invalid when no error in FormFieldWithError', () => {
      fc.assert(
        fc.property(fieldNameArb, (fieldName) => {
          const { unmount } = render(
            <FormFieldWithError fieldName={fieldName}>
              <input data-testid="wrapped-input" />
            </FormFieldWithError>
          )

          const input = screen.getByTestId('wrapped-input')

          // Wrapped input should not have aria-invalid when no error
          expect(input.hasAttribute('aria-invalid')).toBe(false)
          // Wrapped input should not have aria-describedby when no error
          expect(input.hasAttribute('aria-describedby')).toBe(false)

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('should include suggestion in aria-describedby for FormFieldWithError', () => {
      fc.assert(
        fc.property(
          fieldNameArb,
          errorMessageArb,
          errorMessageArb,
          (fieldName, error, suggestion) => {
            const { unmount } = render(
              <FormFieldWithError fieldName={fieldName} error={error} suggestion={suggestion}>
                <input data-testid="wrapped-input" />
              </FormFieldWithError>
            )

            const input = screen.getByTestId('wrapped-input')
            const describedBy = input.getAttribute('aria-describedby')

            // Should contain both error and suggestion IDs
            expect(describedBy).toContain(getErrorId(fieldName))
            expect(describedBy).toContain(getSuggestionId(fieldName))

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique IDs for different field names', () => {
      fc.assert(
        fc.property(
          fieldNameArb,
          fieldNameArb.filter((name) => name.length > 0),
          (fieldName1, fieldName2) => {
            // Skip if field names are the same
            if (fieldName1 === fieldName2) return true

            const errorId1 = getErrorId(fieldName1)
            const errorId2 = getErrorId(fieldName2)

            // Different field names should produce different error IDs
            expect(errorId1).not.toBe(errorId2)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
