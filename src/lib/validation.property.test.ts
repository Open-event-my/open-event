/**
 * Property-Based Tests for Form Validation
 *
 * Tests Properties 41 and 42:
 * - Property 41: Form Validation Before Submission (Requirements 11.9)
 * - Property 42: Clear Validation Error Messages (Requirements 11.10)
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  isValidEmail,
  isValidUrl,
  isWithinLength,
  isNotEmpty,
  isNonNegative,
  isValidBudgetRange,
  isValidEventDate,
  isValidDateRange,
  validatePasswordStrength,
  validateEventTitle,
  validateEventDescription,
  validateBusinessName,
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS,
  isAdminRole,
  hasRolePrivilege,
} from './validation'

describe('Form Validation - Property Tests', () => {
  /**
   * Feature: production-readiness, Property 41: Form Validation Before Submission
   * Validates: Requirements 11.9
   *
   * For any form submission, all required fields should be validated on the client
   * side before the form is submitted to the server.
   */
  describe('Property 41: Form Validation Before Submission', () => {
    it('should validate email format for any string input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = isValidEmail(input)
          expect(typeof result).toBe('boolean')

          // Valid emails must contain @ and a domain with TLD
          if (result) {
            expect(input).toContain('@')
            expect(input.split('@')[1]).toContain('.')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should always accept properly formatted emails', () => {
      // Helper to generate alphanumeric strings
      const alphanumeric = fc
        .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
          minLength: 1,
          maxLength: 20,
        })
        .map((arr) => arr.join(''))

      const alphaOnly = fc
        .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
          minLength: 2,
          maxLength: 6,
        })
        .map((arr) => arr.join(''))

      fc.assert(
        fc.property(fc.tuple(alphanumeric, alphanumeric, alphaOnly), ([local, domain, tld]) => {
          const email = `${local}@${domain}.${tld}`
          expect(isValidEmail(email)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate URL format for any string input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = isValidUrl(input)
          expect(typeof result).toBe('boolean')

          // Valid URLs must start with http:// or https://
          if (result) {
            expect(input.startsWith('http://') || input.startsWith('https://')).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should always accept properly formatted URLs', () => {
      const alphanumeric = fc
        .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
          minLength: 1,
          maxLength: 20,
        })
        .map((arr) => arr.join(''))

      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom('http://', 'https://'),
            alphanumeric,
            fc.constantFrom('.com', '.org', '.net', '.io')
          ),
          ([protocol, domain, tld]) => {
            const url = `${protocol}${domain}${tld}`
            expect(isValidUrl(url)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate string length constraints consistently', () => {
      fc.assert(
        fc.property(fc.string(), fc.integer({ min: 0, max: 1000 }), (value, maxLength) => {
          const result = isWithinLength(value, maxLength)
          expect(typeof result).toBe('boolean')

          // Result should match actual length comparison
          expect(result).toBe(value.length <= maxLength)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate non-empty strings correctly', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const result = isNotEmpty(value)
          expect(typeof result).toBe('boolean')

          // Result should match trimmed length check
          expect(result).toBe(value.trim().length > 0)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate non-negative numbers correctly', () => {
      fc.assert(
        fc.property(fc.double({ min: -1000000, max: 1000000, noNaN: true }), (value) => {
          const result = isNonNegative(value)
          expect(typeof result).toBe('boolean')

          // Result should match actual comparison
          expect(result).toBe(value >= 0)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate budget ranges correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000000, noNaN: true }),
          fc.double({ min: 0, max: 1000000, noNaN: true }),
          (min, max) => {
            const result = isValidBudgetRange(min, max)
            expect(typeof result).toBe('boolean')

            // Result should match actual comparison
            expect(result).toBe(min <= max)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate date ranges correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
          fc.integer({ min: 0, max: Date.now() + 365 * 24 * 60 * 60 * 1000 }),
          (start, end) => {
            const result = isValidDateRange(start, end)
            expect(typeof result).toBe('boolean')

            // Result should match actual comparison
            expect(result).toBe(end >= start)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate event titles with consistent rules', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 250 }), (title) => {
          const result = validateEventTitle(title)
          expect(typeof result.valid).toBe('boolean')

          // Empty or whitespace-only titles should be invalid
          if (title.trim().length === 0) {
            expect(result.valid).toBe(false)
          }

          // Titles over 200 chars should be invalid
          if (title.length > 200) {
            expect(result.valid).toBe(false)
          }

          // Valid titles should have content and be within length
          if (title.trim().length > 0 && title.length <= 200) {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should validate event descriptions with consistent rules', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 11000 }), (description) => {
          const result = validateEventDescription(description)
          expect(typeof result.valid).toBe('boolean')

          // Descriptions over 10000 chars should be invalid
          if (description.length > 10000) {
            expect(result.valid).toBe(false)
          }

          // Descriptions within limit should be valid (empty is allowed)
          if (description.length <= 10000) {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should validate business names with consistent rules', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 250 }), (name) => {
          const result = validateBusinessName(name)
          expect(typeof result.valid).toBe('boolean')

          // Empty or whitespace-only names should be invalid
          if (name.trim().length === 0) {
            expect(result.valid).toBe(false)
          }

          // Names over 200 chars should be invalid
          if (name.length > 200) {
            expect(result.valid).toBe(false)
          }

          // Valid names should have content and be within length
          if (name.trim().length > 0 && name.length <= 200) {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should validate password strength with all requirements', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 100 }), (password) => {
          const result = validatePasswordStrength(password)

          expect(typeof result.isValid).toBe('boolean')
          expect(Array.isArray(result.errors)).toBe(true)
          expect(['weak', 'medium', 'strong']).toContain(result.strength)

          // Strong passwords should have no errors
          if (result.strength === 'strong') {
            expect(result.errors).toHaveLength(0)
            expect(result.isValid).toBe(true)
          }

          // Invalid passwords should have errors
          if (!result.isValid) {
            expect(result.errors.length).toBeGreaterThan(0)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should validate status transitions according to state machine', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('draft', 'planning', 'active', 'completed', 'cancelled'),
          fc.constantFrom('draft', 'planning', 'active', 'completed', 'cancelled'),
          (currentStatus, newStatus) => {
            const result = isValidStatusTransition(currentStatus, newStatus)
            expect(typeof result).toBe('boolean')

            // Result should match the defined transitions
            const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || []
            expect(result).toBe(allowedTransitions.includes(newStatus))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate role privileges consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('superadmin', 'admin', 'organizer', undefined),
          fc.constantFrom('superadmin', 'admin', 'organizer'),
          (userRole, requiredRole) => {
            const result = hasRolePrivilege(userRole, requiredRole)
            expect(typeof result).toBe('boolean')

            // Superadmin should always have access
            if (userRole === 'superadmin') {
              expect(result).toBe(true)
            }

            // Organizer should only access organizer level
            if (userRole === 'organizer' && requiredRole !== 'organizer') {
              expect(result).toBe(false)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should identify admin roles correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('superadmin', 'admin', 'organizer', 'user', 'guest', undefined),
          (role) => {
            const result = isAdminRole(role)
            expect(typeof result).toBe('boolean')

            // Only admin and superadmin should be admin roles
            expect(result).toBe(role === 'admin' || role === 'superadmin')
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * Feature: production-readiness, Property 42: Clear Validation Error Messages
   * Validates: Requirements 11.10
   *
   * For any validation error, the error message should clearly indicate which
   * field failed validation and why.
   */
  describe('Property 42: Clear Validation Error Messages', () => {
    it('should provide clear error messages for invalid event titles', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''), // Empty
            fc.constant('   '), // Whitespace only
            fc.constant('\t\n'), // Tabs and newlines
            fc.string({ minLength: 201, maxLength: 300 }) // Too long
          ),
          (title) => {
            const result = validateEventTitle(title)

            expect(result.valid).toBe(false)
            expect(result.message).toBeDefined()
            expect(typeof result.message).toBe('string')
            expect(result.message!.length).toBeGreaterThan(0)

            // Message should be descriptive
            if (title.trim().length === 0) {
              expect(result.message!.toLowerCase()).toContain('empty')
            }
            if (title.length > 200) {
              expect(result.message!).toContain('200')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide clear error messages for invalid event descriptions', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10001, maxLength: 12000 }), (description) => {
          const result = validateEventDescription(description)

          expect(result.valid).toBe(false)
          expect(result.message).toBeDefined()
          expect(typeof result.message).toBe('string')
          expect(result.message!.length).toBeGreaterThan(0)

          // Message should mention the limit
          expect(result.message!).toContain('10000')
        }),
        { numRuns: 100 }
      )
    })

    it('should provide clear error messages for invalid business names', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''), // Empty
            fc.constant('   '), // Whitespace only
            fc.string({ minLength: 201, maxLength: 300 }) // Too long
          ),
          (name) => {
            const result = validateBusinessName(name)

            expect(result.valid).toBe(false)
            expect(result.message).toBeDefined()
            expect(typeof result.message).toBe('string')
            expect(result.message!.length).toBeGreaterThan(0)

            // Message should be descriptive
            if (name.trim().length === 0) {
              expect(result.message!.toLowerCase()).toContain('empty')
            }
            if (name.length > 200) {
              expect(result.message!).toContain('200')
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide specific error messages for each password requirement', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('short'), // Too short
            fc.constant('alllowercase123!'), // No uppercase
            fc.constant('ALLUPPERCASE123!'), // No lowercase
            fc.constant('NoNumbersHere!!'), // No numbers
            fc.constant('NoSpecialChars123') // No special chars
          ),
          (password) => {
            const result = validatePasswordStrength(password)

            expect(result.isValid).toBe(false)
            expect(result.errors.length).toBeGreaterThan(0)

            // Each error should be descriptive
            result.errors.forEach((error) => {
              expect(typeof error).toBe('string')
              expect(error.length).toBeGreaterThan(5)

              // Error should mention what's required
              expect(
                error.toLowerCase().includes('at least') ||
                  error.toLowerCase().includes('character') ||
                  error.toLowerCase().includes('letter') ||
                  error.toLowerCase().includes('number')
              ).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide strength indicator for all passwords', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 50 }), (password) => {
          const result = validatePasswordStrength(password)

          // Should always have a strength indicator
          expect(result.strength).toBeDefined()
          expect(['weak', 'medium', 'strong']).toContain(result.strength)

          // Strength should correlate with error count
          if (result.errors.length === 0) {
            expect(result.strength).toBe('strong')
          }
          if (result.errors.length > 2) {
            expect(result.strength).toBe('weak')
          }
          if (result.errors.length > 0 && result.errors.length <= 2) {
            expect(result.strength).toBe('medium')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should not provide error messages for valid inputs', () => {
      const validChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')
      const validString = fc
        .array(fc.constantFrom(...validChars), { minLength: 1, maxLength: 200 })
        .map((arr) => arr.join(''))

      fc.assert(
        fc.property(validString, (validTitle) => {
          // Ensure it's not just whitespace
          if (validTitle.trim().length > 0) {
            const result = validateEventTitle(validTitle)

            expect(result.valid).toBe(true)
            // Valid inputs should not have error messages
            expect(result.message).toBeUndefined()
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should provide consistent error message format', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.string({ minLength: 201, maxLength: 250 })
          ),
          (input) => {
            const titleResult = validateEventTitle(input)
            const nameResult = validateBusinessName(input)

            // Both should have consistent format
            if (!titleResult.valid) {
              expect(titleResult.message).toBeDefined()
              // Message should be a complete sentence or phrase
              expect(titleResult.message!.length).toBeGreaterThan(10)
            }

            if (!nameResult.valid) {
              expect(nameResult.message).toBeDefined()
              expect(nameResult.message!.length).toBeGreaterThan(10)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide actionable error messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '', // Empty title
            'a'.repeat(201), // Too long title
            '   ', // Whitespace only
            'short' // Short password
          ),
          (input) => {
            // Test title validation
            const titleResult = validateEventTitle(input)
            if (!titleResult.valid && titleResult.message) {
              // Message should indicate what to do
              const hasActionableInfo =
                titleResult.message.includes('cannot') ||
                titleResult.message.includes('must') ||
                titleResult.message.includes('or less') ||
                titleResult.message.includes('at least')
              expect(hasActionableInfo).toBe(true)
            }

            // Test password validation
            const passwordResult = validatePasswordStrength(input)
            if (!passwordResult.isValid) {
              passwordResult.errors.forEach((error) => {
                // Each error should indicate what's needed
                expect(error.toLowerCase()).toContain('at least')
              })
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property tests for edge cases and robustness
   */
  describe('Edge Cases and Robustness', () => {
    it('should handle unicode characters in validation', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (input) => {
          // Should not throw for any string input (including unicode)
          expect(() => isNotEmpty(input)).not.toThrow()
          expect(() => isWithinLength(input, 200)).not.toThrow()
          expect(() => validateEventTitle(input)).not.toThrow()
          expect(() => validateBusinessName(input)).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should handle special characters in email validation', () => {
      const specialChars = '!#$%&\'*+-/=?^_`{|}~'.split('')
      const specialString = fc
        .array(fc.constantFrom(...specialChars), { minLength: 1, maxLength: 10 })
        .map((arr) => arr.join(''))

      fc.assert(
        fc.property(specialString, (specialPart) => {
          // Should not throw for special characters
          expect(() => isValidEmail(`test${specialPart}@example.com`)).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should handle extreme length inputs gracefully', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100000 }), (length) => {
          const longString = 'a'.repeat(length)

          // Should not throw for any length
          expect(() => isWithinLength(longString, 200)).not.toThrow()
          expect(() => validateEventTitle(longString)).not.toThrow()
          expect(() => validateEventDescription(longString)).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should handle boundary values correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(199, 200, 201, 9999, 10000, 10001),
          (length) => {
            const input = 'a'.repeat(length)

            // Title boundary (200)
            const titleResult = validateEventTitle(input)
            expect(titleResult.valid).toBe(length <= 200)

            // Description boundary (10000)
            const descResult = validateEventDescription(input)
            expect(descResult.valid).toBe(length <= 10000)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate event dates within acceptable range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -2 * 365 * 24 * 60 * 60 * 1000, max: 2 * 365 * 24 * 60 * 60 * 1000 }),
          (offset) => {
            const timestamp = Date.now() + offset
            const result = isValidEventDate(timestamp)

            expect(typeof result).toBe('boolean')

            // Dates more than 1 year in the past should be invalid
            const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
            expect(result).toBe(timestamp >= oneYearAgo)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null-like values in role validation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(undefined, null, '', 'invalid'),
          (role) => {
            // Should not throw for invalid roles
            expect(() => isAdminRole(role as string | undefined)).not.toThrow()
            expect(() => hasRolePrivilege(role as string | undefined, 'organizer')).not.toThrow()

            // Invalid roles should not be admin
            expect(isAdminRole(role as string | undefined)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
