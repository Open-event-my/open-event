/**
 * Property-Based Tests for Error Message Formatter
 *
 * Tests Properties 35 and 36:
 * - Property 35: User-Friendly Error Messages (Requirements 11.1)
 * - Property 36: Error Recovery Suggestions (Requirements 11.3)
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  formatErrorMessage,
  hasTechnicalDetails,
  formatMultipleErrors,
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
            expect(
              [
                'auth',
                'network',
                'validation',
                'permission',
                'notFound',
                'rateLimit',
                'payment',
                'server',
                'unknown',
              ]
            ).toContain(formatted.category)
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
    const reservedNames = ['valueOf', 'toString', 'hasOwnProperty', 'constructor', 'prototype', '__proto__', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString']
    const safeString = fc.string().filter(s => !reservedNames.includes(s))
    const safeCode = fc.string().filter(s => !reservedNames.includes(s))

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
})
