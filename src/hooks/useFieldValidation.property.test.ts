/**
 * Property-Based Tests for Field Validation Hook
 *
 * Feature: error-messaging-improvements, Property 11: Error Clearing on Correction
 * Validates: Requirements 4.3
 *
 * For any field with a validation error, when the field value becomes valid,
 * the error message SHALL be removed immediately.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import {
  useFieldValidation,
  useMultiFieldValidation,
  type ValidationFn,
} from './useFieldValidation'

describe('Field Validation - Property Tests', () => {
  /**
   * Feature: error-messaging-improvements, Property 11: Error Clearing on Correction
   * Validates: Requirements 4.3
   *
   * For any field with a validation error, when the field value becomes valid,
   * the error message SHALL be removed immediately.
   */
  describe('Property 11: Error Clearing on Correction', () => {
    // Simple validation function: value must be non-empty
    const nonEmptyValidator: ValidationFn<string> = (value) => {
      if (!value || value.trim() === '') {
        return 'Value is required'
      }
      return null
    }

    // Validation function: value must be at least 3 characters
    const minLengthValidator: ValidationFn<string> = (value) => {
      if (!value || value.length < 3) {
        return 'Value must be at least 3 characters'
      }
      return null
    }

    // Validation function: value must be a number
    const numberValidator: ValidationFn<string> = (value) => {
      if (!value || isNaN(Number(value))) {
        return 'Value must be a number'
      }
      return null
    }

    it('should clear error when invalid value becomes valid (non-empty)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim() !== ''),
          (validValue) => {
            const { result } = renderHook(() =>
              useFieldValidation('testField', {
                validate: nonEmptyValidator,
                initialValue: '',
              })
            )

            // Start with empty value (invalid)
            act(() => {
              result.current.onBlur() // Touch the field
            })

            // Should have error
            expect(result.current.state.error).toBe('Value is required')
            expect(result.current.state.showError).toBe(true)

            // Change to valid value
            act(() => {
              result.current.onChange(validValue)
            })

            // Error should be cleared immediately
            expect(result.current.state.error).toBeNull()
            expect(result.current.state.isValid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should clear error when value meets minimum length', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 3, maxLength: 50 }), (validValue) => {
          const { result } = renderHook(() =>
            useFieldValidation('testField', {
              validate: minLengthValidator,
              initialValue: 'ab', // Invalid: too short
            })
          )

          // Touch and validate
          act(() => {
            result.current.onBlur()
          })

          // Should have error
          expect(result.current.state.error).toBe('Value must be at least 3 characters')

          // Change to valid value
          act(() => {
            result.current.onChange(validValue)
          })

          // Error should be cleared
          expect(result.current.state.error).toBeNull()
        }),
        { numRuns: 100 }
      )
    })

    it('should clear error when value becomes a valid number', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000000, max: 1000000 }), (num) => {
          const { result } = renderHook(() =>
            useFieldValidation('testField', {
              validate: numberValidator,
              initialValue: 'not-a-number',
            })
          )

          // Touch and validate
          act(() => {
            result.current.onBlur()
          })

          // Should have error
          expect(result.current.state.error).toBe('Value must be a number')

          // Change to valid number
          act(() => {
            result.current.onChange(String(num))
          })

          // Error should be cleared
          expect(result.current.state.error).toBeNull()
        }),
        { numRuns: 100 }
      )
    })

    it('should keep error when value is still invalid', () => {
      fc.assert(
        fc.property(fc.constantFrom('', ' ', '  ', '\t', '\n'), (invalidValue) => {
          const { result } = renderHook(() =>
            useFieldValidation('testField', {
              validate: nonEmptyValidator,
              initialValue: '',
            })
          )

          // Touch and validate
          act(() => {
            result.current.onBlur()
          })

          // Should have error
          expect(result.current.state.error).toBe('Value is required')

          // Change to another invalid value
          act(() => {
            result.current.onChange(invalidValue)
          })

          // Error should still be present
          expect(result.current.state.error).toBe('Value is required')
        }),
        { numRuns: 100 }
      )
    })

    it('should re-validate on blur after correction', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim() !== ''),
          (validValue) => {
            const { result } = renderHook(() =>
              useFieldValidation('testField', {
                validate: nonEmptyValidator,
                initialValue: '',
              })
            )

            // Touch with invalid value
            act(() => {
              result.current.onBlur()
            })
            expect(result.current.state.error).toBe('Value is required')

            // Change to valid value
            act(() => {
              result.current.onChange(validValue)
            })
            expect(result.current.state.error).toBeNull()

            // Blur again - should still be valid
            act(() => {
              result.current.onBlur()
            })
            expect(result.current.state.error).toBeNull()
            expect(result.current.state.isValid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should clear error immediately even before blur', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim() !== ''),
          (validValue) => {
            const { result } = renderHook(() =>
              useFieldValidation('testField', {
                validate: nonEmptyValidator,
                initialValue: '',
              })
            )

            // Mark as submitted to show errors
            act(() => {
              result.current.markSubmitted()
            })

            // Should have error
            expect(result.current.state.error).toBe('Value is required')
            expect(result.current.state.showError).toBe(true)

            // Change to valid value (without blur)
            act(() => {
              result.current.onChange(validValue)
            })

            // Error should be cleared immediately
            expect(result.current.state.error).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle multi-field validation error clearing', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim() !== ''),
          fc.string({ minLength: 3, maxLength: 50 }),
          (validName, validEmail) => {
            const { result } = renderHook(() =>
              useMultiFieldValidation({
                validators: {
                  name: nonEmptyValidator,
                  email: minLengthValidator,
                },
                initialValues: {
                  name: '',
                  email: 'ab',
                },
              })
            )

            // Submit to show all errors
            act(() => {
              result.current.markSubmitted()
            })

            // Both fields should have errors
            expect(result.current.getError('name')).toBe('Value is required')
            expect(result.current.getError('email')).toBe('Value must be at least 3 characters')

            // Fix name field
            act(() => {
              result.current.setValue('name', validName)
            })

            // Name error should be cleared, email error should remain
            expect(result.current.getError('name')).toBeNull()
            expect(result.current.getError('email')).toBe('Value must be at least 3 characters')

            // Fix email field
            act(() => {
              result.current.setValue('email', validEmail)
            })

            // Both errors should be cleared
            expect(result.current.getError('name')).toBeNull()
            expect(result.current.getError('email')).toBeNull()
            expect(result.current.state.isValid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not show error before field is touched', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 50 }), (value) => {
          const { result } = renderHook(() =>
            useFieldValidation('testField', {
              validate: nonEmptyValidator,
              initialValue: value,
            })
          )

          // Before touching, showError should be false
          expect(result.current.state.showError).toBe(false)
          expect(result.current.state.touched).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should show error after field is touched with invalid value', () => {
      fc.assert(
        fc.property(fc.constantFrom('', ' ', '  '), (invalidValue) => {
          const { result } = renderHook(() =>
            useFieldValidation('testField', {
              validate: nonEmptyValidator,
              initialValue: invalidValue,
            })
          )

          // Touch the field
          act(() => {
            result.current.onBlur()
          })

          // Should show error
          expect(result.current.state.showError).toBe(true)
          expect(result.current.state.touched).toBe(true)
          expect(result.current.state.error).toBe('Value is required')
        }),
        { numRuns: 100 }
      )
    })

    it('should reset clears all errors and touched state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim() !== ''),
          (validValue) => {
            const { result } = renderHook(() =>
              useFieldValidation('testField', {
                validate: nonEmptyValidator,
                initialValue: '',
              })
            )

            // Touch and validate
            act(() => {
              result.current.onBlur()
            })
            expect(result.current.state.error).toBe('Value is required')

            // Change value
            act(() => {
              result.current.onChange(validValue)
            })

            // Reset
            act(() => {
              result.current.reset()
            })

            // Should be back to initial state
            expect(result.current.value).toBe('')
            expect(result.current.state.error).toBeNull()
            expect(result.current.state.touched).toBe(false)
            expect(result.current.state.showError).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide correct ARIA props based on error state', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim() !== ''),
          (validValue) => {
            const { result } = renderHook(() =>
              useFieldValidation('testField', {
                validate: nonEmptyValidator,
                initialValue: '',
              })
            )

            // Before touching - no ARIA invalid
            expect(result.current.ariaProps['aria-invalid']).toBeUndefined()
            expect(result.current.ariaProps['aria-describedby']).toBeUndefined()

            // Touch with invalid value
            act(() => {
              result.current.onBlur()
            })

            // Should have ARIA invalid
            expect(result.current.ariaProps['aria-invalid']).toBe(true)
            expect(result.current.ariaProps['aria-describedby']).toBe('testField-error')

            // Fix the value
            act(() => {
              result.current.onChange(validValue)
            })

            // ARIA invalid should be cleared
            expect(result.current.ariaProps['aria-invalid']).toBeUndefined()
            expect(result.current.ariaProps['aria-describedby']).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate all fields on markSubmitted', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const { result } = renderHook(() =>
            useMultiFieldValidation({
              validators: {
                name: nonEmptyValidator,
                email: minLengthValidator,
              },
              initialValues: {
                name: '',
                email: 'ab',
              },
            })
          )

          // Before submit - no errors shown
          expect(result.current.getError('name')).toBeNull()
          expect(result.current.getError('email')).toBeNull()

          // Submit
          act(() => {
            result.current.markSubmitted()
          })

          // All errors should be shown
          expect(result.current.getError('name')).toBe('Value is required')
          expect(result.current.getError('email')).toBe('Value must be at least 3 characters')
          expect(result.current.state.submitted).toBe(true)
        }),
        { numRuns: 10 }
      )
    })
  })
})
