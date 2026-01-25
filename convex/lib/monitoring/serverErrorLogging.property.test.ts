/**
 * Property-Based Tests for Server-Side Error Logging
 *
 * Feature: production-readiness, Property 37: Server-Side Error Logging
 * Validates: Requirements 11.5
 *
 * For any error that occurs, detailed error information (stack trace, context, user ID)
 * should be logged server-side for debugging.
 */

import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import {
  createServerErrorLog,
  createClientSafeError,
  isValidServerErrorLog,
  isClientSafe,
  containsSensitiveData,
  redactSensitiveData,
  extractStackTrace,
  extractErrorName,
  extractErrorMessage,
  generateRequestId,
} from './serverErrorLogging'

describe('Server-Side Error Logging - Property Tests', () => {
  /**
   * Property 37: Server-Side Error Logging
   * For any error that occurs, detailed error information (stack trace, context, user ID)
   * should be logged server-side for debugging.
   */
  describe('Property 37: Server-Side Error Logging', () => {
    test('server error logs contain all required fields for debugging', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }), // error message
          fc.option(fc.string({ minLength: 1, maxLength: 50 })), // userId
          fc.option(fc.string({ minLength: 1, maxLength: 50 })), // requestId
          fc.option(fc.string({ minLength: 1, maxLength: 100 })), // source
          fc.option(fc.string({ minLength: 1, maxLength: 50 })), // errorCode
          (errorMessage, userId, requestId, source, errorCode) => {
            const error = new Error(errorMessage)

            const logEntry = createServerErrorLog(error, {
              userId: userId ?? undefined,
              requestId: requestId ?? undefined,
              source: source ?? undefined,
              errorCode: errorCode ?? undefined,
            })

            // Verify all required fields are present
            expect(isValidServerErrorLog(logEntry)).toBe(true)

            // Verify message is captured
            expect(logEntry.message).toBe(errorMessage)

            // Verify stack trace is captured for Error objects
            expect(logEntry.stackTrace).toBeDefined()
            expect(typeof logEntry.stackTrace).toBe('string')
            expect(logEntry.stackTrace!.length).toBeGreaterThan(0)

            // Verify error name is captured
            expect(logEntry.errorName).toBe('Error')

            // Verify timestamp is valid
            expect(logEntry.timestamp).toBeGreaterThan(0)
            expect(logEntry.timestamp).toBeLessThanOrEqual(Date.now())

            // Verify context is an object
            expect(typeof logEntry.context).toBe('object')
            expect(logEntry.context).not.toBeNull()

            // Verify severity is set
            expect(logEntry.severity).toBe('error')

            // Verify userId is captured when provided
            if (userId) {
              expect(logEntry.userId).toBe(userId)
            }

            // Verify requestId is present (generated if not provided)
            expect(logEntry.requestId).toBeDefined()
            if (requestId) {
              expect(logEntry.requestId).toBe(requestId)
            }

            // Verify source is captured when provided
            if (source) {
              expect(logEntry.source).toBe(source)
            }

            // Verify errorCode is captured when provided
            if (errorCode) {
              expect(logEntry.errorCode).toBe(errorCode)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    test('client-safe errors never contain stack traces', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          fc.option(
            fc.constantFrom(
              'UNAUTHORIZED',
              'FORBIDDEN',
              'NOT_FOUND',
              'VALIDATION_ERROR',
              'RATE_LIMITED',
              'INTERNAL_ERROR',
              'SERVICE_UNAVAILABLE'
            )
          ),
          (errorMessage, userId, errorCode) => {
            const error = new Error(errorMessage)

            const logEntry = createServerErrorLog(error, {
              userId: userId ?? undefined,
              errorCode: errorCode ?? undefined,
            })

            const clientError = createClientSafeError(logEntry)

            // Verify client error is safe
            expect(isClientSafe(clientError)).toBe(true)

            // Verify no stack trace patterns in message
            const stackTracePatterns = [
              /at\s+[\w.]+\s+\([^)]+\)/,
              /:\d+:\d+/,
              /file:\/\//,
              /node_modules/,
            ]

            stackTracePatterns.forEach((pattern) => {
              expect(pattern.test(clientError.message)).toBe(false)
            })

            // Verify message is user-friendly
            expect(clientError.message.length).toBeGreaterThan(0)
            expect(clientError.message.length).toBeLessThan(500)

            // Verify code is present
            expect(clientError.code).toBeDefined()
            expect(typeof clientError.code).toBe('string')
          }
        ),
        { numRuns: 100 }
      )
    })

    test('sensitive data is redacted from logs', () => {
      // Generate objects with sensitive field names
      const sensitiveFieldArb = fc.constantFrom(
        'password',
        'secret',
        'token',
        'apiKey',
        'api_key',
        'authKey',
        'creditCard',
        'cardNumber',
        'cvv',
        'ssn',
        'accessToken',
        'refreshToken',
        'authorization'
      )

      fc.assert(
        fc.property(
          sensitiveFieldArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          (sensitiveField, sensitiveValue) => {
            const contextWithSensitiveData: Record<string, unknown> = {
              [sensitiveField]: sensitiveValue,
              normalField: 'normal value',
            }

            const redacted = redactSensitiveData(contextWithSensitiveData)

            // Verify sensitive field is redacted
            expect(redacted[sensitiveField]).toBe('[REDACTED]')

            // Verify normal field is preserved
            expect(redacted.normalField).toBe('normal value')
          }
        ),
        { numRuns: 100 }
      )
    })

    test('sensitive patterns in values are detected and redacted', () => {
      const sensitivePatternArb = fc.constantFrom(
        'Bearer abc123token',
        'password=secret123',
        'api_key: sk-12345',
        'jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'credit_card 4111111111111111',
        'ssn 123-45-6789'
      )

      fc.assert(
        fc.property(sensitivePatternArb, (sensitiveValue) => {
          // Verify pattern is detected
          expect(containsSensitiveData(sensitiveValue)).toBe(true)

          // Verify redaction works
          const obj = { data: sensitiveValue }
          const redacted = redactSensitiveData(obj)
          expect(redacted.data).toBe('[REDACTED]')
        }),
        { numRuns: 100 }
      )
    })

    test('non-sensitive data is preserved in logs', () => {
      fc.assert(
        fc.property(
          fc.record({
            eventId: fc.string({ minLength: 1, maxLength: 50 }),
            eventName: fc.string({ minLength: 1, maxLength: 100 }),
            organizationId: fc.string({ minLength: 1, maxLength: 50 }),
            timestamp: fc.integer({ min: 0 }),
            count: fc.integer({ min: 0, max: 1000 }),
          }),
          (normalContext) => {
            const redacted = redactSensitiveData(normalContext)

            // Verify all non-sensitive fields are preserved
            expect(redacted.eventId).toBe(normalContext.eventId)
            expect(redacted.eventName).toBe(normalContext.eventName)
            expect(redacted.organizationId).toBe(normalContext.organizationId)
            expect(redacted.timestamp).toBe(normalContext.timestamp)
            expect(redacted.count).toBe(normalContext.count)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('request IDs are always generated for traceability', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
          const error = new Error(errorMessage)

          // Without providing requestId
          const logEntry = createServerErrorLog(error, {})

          // Verify requestId is generated
          expect(logEntry.requestId).toBeDefined()
          expect(typeof logEntry.requestId).toBe('string')
          expect(logEntry.requestId!.length).toBeGreaterThan(0)
          expect(logEntry.requestId!.startsWith('req_')).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    test('generated request IDs are unique', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 20 }), (count) => {
          const requestIds = new Set<string>()

          for (let i = 0; i < count; i++) {
            requestIds.add(generateRequestId())
          }

          // All generated IDs should be unique
          expect(requestIds.size).toBe(count)
        }),
        { numRuns: 100 }
      )
    })

    test('error extraction works for various error types', () => {
      // Test with Error objects
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (message, name) => {
            const error = new Error(message)
            error.name = name

            expect(extractErrorMessage(error)).toBe(message)
            expect(extractErrorName(error)).toBe(name)
            expect(extractStackTrace(error)).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )

      // Test with string errors
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (message) => {
          expect(extractErrorMessage(message)).toBe(message)
          expect(extractErrorName(message)).toBe('StringError')
          expect(extractStackTrace(message)).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    test('nested sensitive data is redacted', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (secretValue, normalValue) => {
            const nestedObj = {
              level1: {
                level2: {
                  password: secretValue,
                  normalField: normalValue,
                },
              },
            }

            const redacted = redactSensitiveData(nestedObj)

            // Verify nested sensitive field is redacted
            const level1 = redacted.level1 as Record<string, unknown>
            const level2 = level1.level2 as Record<string, unknown>
            expect(level2.password).toBe('[REDACTED]')

            // Verify nested normal field is preserved
            expect(level2.normalField).toBe(normalValue)
          }
        ),
        { numRuns: 100 }
      )
    })

    test('client errors include requestId for support reference', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (errorMessage, requestId) => {
            const error = new Error(errorMessage)

            const logEntry = createServerErrorLog(error, { requestId })
            const clientError = createClientSafeError(logEntry)

            // Verify requestId is included in client error
            expect(clientError.requestId).toBe(requestId)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
