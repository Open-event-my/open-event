/**
 * Property-Based Tests for Error Message Formatter
 *
 * Tests Properties 35 and 36:
 * - Property 35: User-Friendly Error Messages (Requirements 11.1)
 * - Property 36: Error Recovery Suggestions (Requirements 11.3)
 *
 * Tests Properties 1 and 16:
 * - Property 1: Contextual Error Formatting (Requirements 1.1, 1.2)
 * - Property 16: Unique Error ID Generation (Requirements 7.1)
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  formatErrorMessage,
  hasTechnicalDetails,
  formatMultipleErrors,
  formatErrorWithContext,
  generateErrorId,
  combineErrors,
  sanitizePII,
  containsPII,
  type ErrorContext,
} from './errorFormatter'

describe('Error Message Formatter - Property Tests', () => {
  /**
   * Feature: production-readiness, Property 35: User-Friendly Error Messages
   * Validates: Requirements 11.1
   *
   * For any error displayed to end users, the error message should not contain
   * stack traces, internal system details, or technical jargon.
   */
  describe('Property 35: User-Friendly Error Messages', () => {
    it('should never include stack traces in formatted messages', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Generate errors with stack traces
            fc.string().map((msg) => {
              const error = new Error(msg)
              error.stack = `Error: ${msg}\n    at Object.<anonymous> (/path/to/file.ts:10:15)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)`
              return error
            }),
            // Generate errors with file paths
            fc.string().map((msg) => new Error(`${msg} at file:///C:/Users/test/app.ts:42:10`)),
            // Generate errors with URLs
            fc.string().map((msg) => new Error(`${msg} https://api.example.com/endpoint failed`))
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            // Should not contain stack trace patterns
            expect(formatted.message).not.toMatch(/at\s+[\w.]+\s+\([^)]+\)/)
            expect(formatted.message).not.toMatch(/at\b.*?:\d+:\d+/)
            expect(formatted.message).not.toMatch(/file:\/\/\//)
            expect(formatted.message).not.toMatch(/https?:\/\/[^\s]+/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should never include technical error type prefixes', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().map((msg) => new TypeError(msg)),
            fc.string().map((msg) => new ReferenceError(msg)),
            fc.string().map((msg) => new SyntaxError(msg)),
            fc.string().map((msg) => new Error(`Error: ${msg}`))
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            // Should not contain error type prefixes
            expect(formatted.message).not.toMatch(/^TypeError:\s+/)
            expect(formatted.message).not.toMatch(/^ReferenceError:\s+/)
            expect(formatted.message).not.toMatch(/^SyntaxError:\s+/)
            expect(formatted.message).not.toMatch(/^Error:\s+/)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should never include technical jargon like "undefined is not" or "cannot read property"', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(new Error('undefined is not an object')),
            fc.constant(new Error('Cannot read property "foo" of undefined')),
            fc.constant(new Error('null is not an object')),
            fc.constant(new Error('[object Object] is not valid'))
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            // Should not contain technical jargon
            expect(formatted.message).not.toMatch(/undefined is not/i)
            expect(formatted.message).not.toMatch(/cannot read property/i)
            expect(formatted.message).not.toMatch(/null is not/i)
            expect(formatted.message).not.toMatch(/\[object\s+\w+\]/i)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always return a non-empty, readable message', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.string().map((msg) => new Error(msg)),
            fc.record({
              message: fc.string(),
              code: fc.constantFrom('UNAUTHORIZED', 'NOT_FOUND', 'VALIDATION_ERROR'),
            }),
            fc.constant(null),
            fc.constant(undefined),
            fc.constant({})
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            // Should always have a message
            expect(formatted.message).toBeTruthy()
            expect(typeof formatted.message).toBe('string')
            expect(formatted.message.length).toBeGreaterThan(0)

            // Should be readable (at least 10 characters)
            expect(formatted.message.length).toBeGreaterThanOrEqual(10)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should categorize all errors appropriately', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.string().map((msg) => new Error(msg)),
            fc.record({
              message: fc.string(),
              code: fc.string(),
            })
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            // Should always have a valid category
            expect(formatted.category).toBeTruthy()
            expect([
              'auth',
              'network',
              'validation',
              'permission',
              'notFound',
              'rateLimit',
              'payment',
              'server',
              'unknown',
            ]).toContain(formatted.category)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle errors with known error codes consistently', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'UNAUTHORIZED',
            'FORBIDDEN',
            'NOT_FOUND',
            'VALIDATION_ERROR',
            'RATE_LIMITED',
            'NETWORK_ERROR',
            'PAYMENT_FAILED',
            'INTERNAL_ERROR'
          ),
          (code) => {
            const error = { code, message: 'Some technical error message' }
            const formatted = formatErrorMessage(error)

            // Should use predefined friendly message, not the technical one
            expect(formatted.message).not.toBe('Some technical error message')
            expect(formatted.message.length).toBeGreaterThan(10)

            // Should have appropriate category
            expect(formatted.category).toBeTruthy()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: production-readiness, Property 36: Error Recovery Suggestions
   * Validates: Requirements 11.3
   *
   * For any error shown to users, the error message should include actionable
   * recovery suggestions when applicable.
   */
  describe('Property 36: Error Recovery Suggestions', () => {
    it('should provide recovery suggestions for all error categories', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'UNAUTHORIZED',
            'FORBIDDEN',
            'NOT_FOUND',
            'VALIDATION_ERROR',
            'RATE_LIMITED',
            'NETWORK_ERROR',
            'PAYMENT_FAILED',
            'INTERNAL_ERROR'
          ),
          (code) => {
            const error = { code, message: 'Error occurred' }
            const formatted = formatErrorMessage(error)

            // Should have suggestions
            expect(formatted.suggestions).toBeDefined()
            expect(Array.isArray(formatted.suggestions)).toBe(true)
            expect(formatted.suggestions!.length).toBeGreaterThan(0)

            // Each suggestion should be actionable (not empty)
            formatted.suggestions!.forEach((suggestion) => {
              expect(suggestion).toBeTruthy()
              expect(typeof suggestion).toBe('string')
              expect(suggestion.length).toBeGreaterThan(5)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide actionable suggestions (contain action verbs)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({ code: fc.string(), message: fc.string() }),
            fc.string().map((msg) => new Error(msg))
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            if (formatted.suggestions && formatted.suggestions.length > 0) {
              // At least one suggestion should contain an action verb
              const actionVerbs = [
                'try',
                'check',
                'verify',
                'contact',
                'sign',
                'wait',
                'review',
                'update',
                'go',
                'click',
                'use',
                'enter',
                'fill',
                'refresh',
              ]

              const hasActionVerb = formatted.suggestions.some((suggestion) =>
                actionVerbs.some((verb) => suggestion.toLowerCase().includes(verb))
              )

              expect(hasActionVerb).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide action text for all formatted errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.string().map((msg) => new Error(msg)),
            fc.record({
              code: fc.constantFrom(
                'UNAUTHORIZED',
                'NOT_FOUND',
                'VALIDATION_ERROR',
                'NETWORK_ERROR'
              ),
              message: fc.string(),
            })
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            // Should have action text
            expect(formatted.actionText).toBeDefined()
            expect(typeof formatted.actionText).toBe('string')
            expect(formatted.actionText!.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should limit suggestions to a reasonable number (max 5)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.string().map((msg) => new Error(msg)),
            fc.record({ code: fc.string(), message: fc.string() })
          ),
          (error) => {
            const formatted = formatErrorMessage(error)

            if (formatted.suggestions) {
              // Should not overwhelm user with too many suggestions
              expect(formatted.suggestions.length).toBeLessThanOrEqual(5)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should provide context-appropriate suggestions based on error category', () => {
      fc.assert(
        fc.property(
          fc.record({
            code: fc.constantFrom('UNAUTHORIZED', 'NETWORK_ERROR', 'VALIDATION_ERROR'),
            message: fc.string(),
          }),
          (error) => {
            const formatted = formatErrorMessage(error)

            // Verify suggestions match the category
            if (formatted.category === 'auth') {
              const suggestionsText = formatted.suggestions?.join(' ').toLowerCase() || ''
              expect(
                suggestionsText.includes('sign') ||
                  suggestionsText.includes('account') ||
                  suggestionsText.includes('credential')
              ).toBe(true)
            }

            if (formatted.category === 'network') {
              const suggestionsText = formatted.suggestions?.join(' ').toLowerCase() || ''
              expect(
                suggestionsText.includes('connection') ||
                  suggestionsText.includes('internet') ||
                  suggestionsText.includes('try again')
              ).toBe(true)
            }

            if (formatted.category === 'validation') {
              const suggestionsText = formatted.suggestions?.join(' ').toLowerCase() || ''
              expect(
                suggestionsText.includes('check') ||
                  suggestionsText.includes('review') ||
                  suggestionsText.includes('field')
              ).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property tests for edge cases
   */
  describe('Edge Cases and Robustness', () => {
    // Filter out reserved JavaScript property names that conflict with Object prototype
    const reservedNames = [
      'valueOf',
      'toString',
      'hasOwnProperty',
      'constructor',
      'prototype',
      '__proto__',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
    ]
    const safeString = fc.string().filter((s) => !reservedNames.includes(s))
    const safeCode = fc.string().filter((s) => !reservedNames.includes(s))

    it('should handle multiple errors gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              safeString,
              safeString.map((msg) => new Error(msg)),
              fc.record({ code: safeCode, message: safeString })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (errors) => {
            const formatted = formatMultipleErrors(errors)

            // Should always return a valid formatted error
            expect(formatted.message).toBeTruthy()
            expect(formatted.category).toBeTruthy()

            // Should not contain technical details
            expect(hasTechnicalDetails(formatted.message)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect technical details correctly', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('Error at file:///path/to/file.ts:10:15'),
            fc.constant('TypeError: Cannot read property'),
            fc.constant('at Object.<anonymous> (/path/file.js:42:10)'),
            fc.constant('undefined is not an object'),
            fc.constant('https://api.example.com/error in stack trace')
          ),
          (technicalMessage) => {
            // Should detect technical details
            expect(hasTechnicalDetails(technicalMessage)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not flag user-friendly messages as technical', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Please sign in to continue',
            'Your session has expired',
            'Unable to connect to the server',
            'Please check your input',
            'The item was not found'
          ),
          (friendlyMessage) => {
            // Should not detect technical details in friendly messages
            expect(hasTechnicalDetails(friendlyMessage)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 1: Contextual Error Formatting
   * Validates: Requirements 1.1, 1.2
   *
   * For any error and action context, when formatErrorWithContext is called with both
   * parameters, the resulting error message SHALL contain the action context description.
   */
  describe('Property 1: Contextual Error Formatting', () => {
    // Generator for valid action context strings (non-empty, reasonable length)
    const actionArbitrary = fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length > 0)

    // Generator for ErrorContext objects
    const errorContextArbitrary = fc.record({
      action: actionArbitrary,
      component: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
    }) as fc.Arbitrary<ErrorContext>

    it('should include action context in error message when context is provided', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1 }).map((msg) => new Error(msg)),
            fc.record({
              code: fc.constantFrom('NETWORK_ERROR', 'VALIDATION_ERROR', 'INTERNAL_ERROR'),
              message: fc.string(),
            })
          ),
          errorContextArbitrary,
          (error, context) => {
            const formatted = formatErrorWithContext(error, context)

            // The message should contain the action from context
            expect(formatted.message.toLowerCase()).toContain(context.action.toLowerCase())

            // The message should start with "Couldn't"
            expect(formatted.message.startsWith("Couldn't")).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve context object in the formatted error', () => {
      fc.assert(
        fc.property(
          fc.string().map((msg) => new Error(msg)),
          errorContextArbitrary,
          (error, context) => {
            const formatted = formatErrorWithContext(error, context)

            // Context should be preserved
            expect(formatted.context).toBeDefined()
            expect(formatted.context?.action).toBe(context.action)
            if (context.component) {
              expect(formatted.context?.component).toBe(context.component)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should work without context (backward compatibility)', () => {
      // Filter out JavaScript reserved property names that could cause issues
      const safeCodeArbitrary = fc
        .string()
        .filter(
          (s) =>
            ![
              'valueOf',
              'toString',
              'constructor',
              'prototype',
              '__proto__',
              'hasOwnProperty',
            ].includes(s)
        )

      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.string().map((msg) => new Error(msg)),
            fc.record({ code: safeCodeArbitrary, message: fc.string() })
          ),
          (error) => {
            const formatted = formatErrorWithContext(error)

            // Should still return a valid enhanced error
            expect(formatted.id).toBeTruthy()
            expect(formatted.timestamp).toBeGreaterThan(0)
            expect(formatted.message).toBeTruthy()
            expect(formatted.category).toBeTruthy()

            // Context should be undefined when not provided
            expect(formatted.context).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include timestamp and id in enhanced error', () => {
      fc.assert(
        fc.property(
          fc.string().map((msg) => new Error(msg)),
          fc.option(errorContextArbitrary, { nil: undefined }),
          (error, context) => {
            const beforeTimestamp = Date.now()
            const formatted = formatErrorWithContext(error, context)
            const afterTimestamp = Date.now()

            // Should have a valid ID
            expect(formatted.id).toBeTruthy()
            expect(typeof formatted.id).toBe('string')
            expect(formatted.id.length).toBeGreaterThan(0)

            // Should have a valid timestamp within the test execution window
            expect(formatted.timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
            expect(formatted.timestamp).toBeLessThanOrEqual(afterTimestamp)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include recovery actions based on error category', () => {
      fc.assert(
        fc.property(
          fc.record({
            code: fc.constantFrom(
              'UNAUTHORIZED',
              'NETWORK_ERROR',
              'VALIDATION_ERROR',
              'RATE_LIMITED',
              'PAYMENT_FAILED'
            ),
            message: fc.string(),
          }),
          fc.option(errorContextArbitrary, { nil: undefined }),
          (error, context) => {
            const formatted = formatErrorWithContext(error, context)

            // Should have recovery actions
            expect(formatted.recoveryActions).toBeDefined()
            expect(Array.isArray(formatted.recoveryActions)).toBe(true)
            expect(formatted.recoveryActions.length).toBeGreaterThan(0)

            // Each recovery action should have required fields
            formatted.recoveryActions.forEach((action) => {
              expect(action.label).toBeTruthy()
              expect(action.type).toBeTruthy()
              expect(['retry', 'navigate', 'focus', 'custom', 'countdown']).toContain(action.type)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 16: Unique Error ID Generation
   * Validates: Requirements 7.1
   *
   * For any two errors generated, their IDs SHALL be different.
   */
  describe('Property 16: Unique Error ID Generation', () => {
    it('should generate unique IDs for each call', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 100 }), (count) => {
          const ids = new Set<string>()

          for (let i = 0; i < count; i++) {
            const id = generateErrorId()
            ids.add(id)
          }

          // All IDs should be unique
          expect(ids.size).toBe(count)
        }),
        { numRuns: 100 }
      )
    })

    it('should generate non-empty string IDs', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No input needed
          () => {
            const id = generateErrorId()

            expect(typeof id).toBe('string')
            expect(id.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique IDs for formatted errors', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string().map((msg) => new Error(msg)),
            { minLength: 2, maxLength: 20 }
          ),
          (errors) => {
            const formattedErrors = errors.map((error) => formatErrorWithContext(error))
            const ids = formattedErrors.map((e) => e.id)
            const uniqueIds = new Set(ids)

            // All IDs should be unique
            expect(uniqueIds.size).toBe(errors.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique IDs even for identical errors', () => {
      fc.assert(
        fc.property(
          fc.string().map((msg) => new Error(msg)),
          fc.integer({ min: 2, max: 10 }),
          (error, count) => {
            const ids = new Set<string>()

            for (let i = 0; i < count; i++) {
              const formatted = formatErrorWithContext(error)
              ids.add(formatted.id)
            }

            // All IDs should be unique even for the same error
            expect(ids.size).toBe(count)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 2: Multiple Error Combination
   * Validates: Requirements 1.4
   *
   * For any array of errors with the same action context, when combined, the result
   * SHALL be a single error message that references all original errors and maintains
   * the shared context.
   */
  describe('Property 2: Multiple Error Combination', () => {
    // Generator for valid action context strings (non-empty, reasonable length)
    const actionArbitrary = fc
      .string({ minLength: 3, maxLength: 50 })
      .filter((s) => s.trim().length > 0)

    // Generator for ErrorContext objects
    const errorContextArbitrary = fc.record({
      action: actionArbitrary,
      component: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
      metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
    }) as fc.Arbitrary<ErrorContext>

    // Generator for error messages that won't be sanitized away
    const errorMessageArbitrary = fc
      .string({ minLength: 15, maxLength: 100 })
      .filter((s) => s.trim().length >= 10)

    it('should combine multiple errors into a single message with shared context', () => {
      fc.assert(
        fc.property(
          fc.array(
            errorMessageArbitrary.map((msg) => new Error(msg)),
            { minLength: 2, maxLength: 5 }
          ),
          errorContextArbitrary,
          (errors, context) => {
            const combined = combineErrors(errors, context)

            // Should have the shared context
            expect(combined.context).toBeDefined()
            expect(combined.context?.action).toBe(context.action)

            // Message should contain the action context
            expect(combined.message.toLowerCase()).toContain(context.action.toLowerCase())

            // Message should start with "Couldn't"
            expect(combined.message.startsWith("Couldn't")).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should aggregate suggestions from all errors', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              code: fc.constantFrom('NETWORK_ERROR', 'VALIDATION_ERROR', 'UNAUTHORIZED'),
              message: fc.string(),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          errorContextArbitrary,
          (errors, context) => {
            const combined = combineErrors(errors, context)

            // Should have suggestions
            expect(combined.suggestions).toBeDefined()
            expect(Array.isArray(combined.suggestions)).toBe(true)

            // Suggestions should be limited to a reasonable number
            expect(combined.suggestions!.length).toBeLessThanOrEqual(5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return enhanced error with all required fields', () => {
      fc.assert(
        fc.property(
          fc.array(
            errorMessageArbitrary.map((msg) => new Error(msg)),
            { minLength: 1, maxLength: 5 }
          ),
          errorContextArbitrary,
          (errors, context) => {
            const combined = combineErrors(errors, context)

            // Should have all enhanced error fields
            expect(combined.id).toBeTruthy()
            expect(combined.timestamp).toBeGreaterThan(0)
            expect(combined.message).toBeTruthy()
            expect(combined.category).toBeTruthy()
            expect(combined.recoveryActions).toBeDefined()
            expect(Array.isArray(combined.recoveryActions)).toBe(true)
            expect(typeof combined.requiresAcknowledgment).toBe('boolean')
            expect(typeof combined.persistent).toBe('boolean')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle single error gracefully', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary.map((msg) => new Error(msg)),
          errorContextArbitrary,
          (error, context) => {
            const combined = combineErrors([error], context)

            // Should still work with single error
            expect(combined.context?.action).toBe(context.action)
            expect(combined.message.toLowerCase()).toContain(context.action.toLowerCase())
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty error array gracefully', () => {
      fc.assert(
        fc.property(errorContextArbitrary, (context) => {
          const combined = combineErrors([], context)

          // Should return a valid error even with empty array
          expect(combined.id).toBeTruthy()
          expect(combined.message).toBeTruthy()
          expect(combined.context?.action).toBe(context.action)
        }),
        { numRuns: 100 }
      )
    })

    it('should deduplicate suggestions', () => {
      fc.assert(
        fc.property(
          // Create multiple errors with the same code to get duplicate suggestions
          fc.array(fc.constant({ code: 'NETWORK_ERROR', message: 'Network failed' }), {
            minLength: 3,
            maxLength: 5,
          }),
          errorContextArbitrary,
          (errors, context) => {
            const combined = combineErrors(errors, context)

            // Suggestions should be unique (no duplicates)
            if (combined.suggestions && combined.suggestions.length > 0) {
              const uniqueSuggestions = new Set(combined.suggestions)
              expect(uniqueSuggestions.size).toBe(combined.suggestions.length)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 20: PII Redaction
   * Validates: Requirements 8.5
   *
   * For any logged error data, email addresses, phone numbers, and names
   * SHALL be replaced with redaction placeholders.
   */
  describe('Property 20: PII Redaction', () => {
    // Generator for email addresses
    const emailArbitrary = fc
      .tuple(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z]+$/.test(s)),
        fc.constantFrom('gmail.com', 'example.com', 'test.org', 'company.net')
      )
      .map(([local, domain]) => `${local}@${domain}`)

    // Generator for phone numbers in various formats
    const phoneArbitrary = fc.oneof(
      // Format: 555-123-4567
      fc
        .tuple(
          fc.integer({ min: 100, max: 999 }),
          fc.integer({ min: 100, max: 999 }),
          fc.integer({ min: 1000, max: 9999 })
        )
        .map(([a, b, c]) => `${a}-${b}-${c}`),
      // Format: (555) 123-4567
      fc
        .tuple(
          fc.integer({ min: 100, max: 999 }),
          fc.integer({ min: 100, max: 999 }),
          fc.integer({ min: 1000, max: 9999 })
        )
        .map(([a, b, c]) => `(${a}) ${b}-${c}`),
      // Format: 5551234567
      fc.integer({ min: 1000000000, max: 9999999999 }).map((n) => n.toString())
    )

    // Generator for SSN-like numbers
    const ssnArbitrary = fc
      .tuple(
        fc.integer({ min: 100, max: 999 }),
        fc.integer({ min: 10, max: 99 }),
        fc.integer({ min: 1000, max: 9999 })
      )
      .map(([a, b, c]) => `${a}-${b}-${c}`)

    it('should redact email addresses from strings', () => {
      fc.assert(
        fc.property(
          fc.tuple(fc.string(), emailArbitrary, fc.string()),
          ([prefix, email, suffix]) => {
            const input = `${prefix} ${email} ${suffix}`
            const sanitized = sanitizePII(input) as string

            // Should not contain the original email
            expect(sanitized).not.toContain(email)

            // Should contain the redaction placeholder
            expect(sanitized).toContain('[EMAIL_REDACTED]')

            // Should preserve non-PII content
            expect(sanitized).toContain(prefix)
            expect(sanitized).toContain(suffix)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should redact phone numbers from strings', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 0, maxLength: 20 }),
            phoneArbitrary,
            fc.string({ minLength: 0, maxLength: 20 })
          ),
          ([prefix, phone, suffix]) => {
            const input = `Contact: ${prefix} ${phone} ${suffix}`
            const sanitized = sanitizePII(input) as string

            // Should contain the redaction placeholder
            expect(sanitized).toContain('[PHONE_REDACTED]')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should redact SSN-like numbers from strings', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 0, maxLength: 20 }),
            ssnArbitrary,
            fc.string({ minLength: 0, maxLength: 20 })
          ),
          ([prefix, ssn, suffix]) => {
            const input = `SSN: ${prefix} ${ssn} ${suffix}`
            const sanitized = sanitizePII(input) as string

            // Should contain the redaction placeholder
            expect(sanitized).toContain('[SSN_REDACTED]')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sanitize nested objects recursively', () => {
      fc.assert(
        fc.property(
          emailArbitrary,
          phoneArbitrary,
          fc.string({ minLength: 1, maxLength: 20 }),
          (email, phone, name) => {
            const input = {
              user: {
                email,
                phone,
                name,
              },
              metadata: {
                contact: `Email: ${email}`,
              },
            }

            const sanitized = sanitizePII(input) as typeof input

            // Should redact email in nested object
            expect(sanitized.user.email).toBe('[EMAIL_REDACTED]')

            // Should redact phone in nested object
            expect(sanitized.user.phone).toContain('[PHONE_REDACTED]')

            // Should redact email in nested string
            expect(sanitized.metadata.contact).toContain('[EMAIL_REDACTED]')

            // Should preserve non-PII data
            expect(sanitized.user.name).toBe(name)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should sanitize arrays', () => {
      fc.assert(
        fc.property(fc.array(emailArbitrary, { minLength: 1, maxLength: 5 }), (emails) => {
          const sanitized = sanitizePII(emails) as string[]

          // All emails should be redacted
          sanitized.forEach((item) => {
            expect(item).toBe('[EMAIL_REDACTED]')
          })

          // Array length should be preserved
          expect(sanitized.length).toBe(emails.length)
        }),
        { numRuns: 100 }
      )
    })

    it('should handle null and undefined gracefully', () => {
      fc.assert(
        fc.property(fc.constantFrom(null, undefined), (value) => {
          const sanitized = sanitizePII(value)
          expect(sanitized).toBe(value)
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve non-PII data unchanged', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer(),
            count: fc.integer(),
            active: fc.boolean(),
            message: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !containsPII(s)),
          }),
          (data) => {
            const sanitized = sanitizePII(data) as typeof data

            // All non-PII fields should be unchanged
            expect(sanitized.id).toBe(data.id)
            expect(sanitized.count).toBe(data.count)
            expect(sanitized.active).toBe(data.active)
            expect(sanitized.message).toBe(data.message)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect PII correctly with containsPII helper', () => {
      fc.assert(
        fc.property(fc.oneof(emailArbitrary, phoneArbitrary, ssnArbitrary), (pii) => {
          // Should detect PII
          expect(containsPII(pii)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should not flag non-PII strings as containing PII', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Hello world',
            'Error occurred',
            'User not found',
            'Invalid input',
            'Connection timeout'
          ),
          (message) => {
            // Should not detect PII in regular messages
            expect(containsPII(message)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
