/**
 * Property-Based Tests for Error State Manager
 *
 * Tests Properties 17, 18, and 19:
 * - Property 17: Error Deduplication (Requirements 7.2)
 * - Property 18: Error Ordering (Requirements 7.6)
 * - Property 19: Transient Error Clearing (Requirements 7.4)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { getErrorSignature, createErrorStateManager } from './errorStateManager'
import type { EnhancedFormattedError, ErrorCategory, ErrorContext } from '@/lib/errorFormatter'
import { generateErrorId } from '@/lib/errorFormatter'

/**
 * Helper to create a mock EnhancedFormattedError for testing
 */
function createMockError(overrides: Partial<EnhancedFormattedError> = {}): EnhancedFormattedError {
  const id = overrides.id || generateErrorId()
  const timestamp = overrides.timestamp || Date.now()
  const category = overrides.category || 'unknown'

  return {
    id,
    timestamp,
    message: overrides.message || 'Test error message',
    category,
    suggestions: overrides.suggestions || ['Try again'],
    actionText: overrides.actionText || 'Retry',
    context: overrides.context,
    requiresAcknowledgment: overrides.requiresAcknowledgment ?? false,
    persistent: overrides.persistent ?? false,
    recoveryActions: overrides.recoveryActions || [{ label: 'Retry', type: 'retry' }],
  }
}

/**
 * Arbitrary for generating valid error categories
 */
const errorCategoryArbitrary: fc.Arbitrary<ErrorCategory> = fc.constantFrom(
  'auth',
  'network',
  'validation',
  'permission',
  'notFound',
  'rateLimit',
  'payment',
  'server',
  'unknown'
)

/**
 * Arbitrary for generating error context
 */
const errorContextArbitrary: fc.Arbitrary<ErrorContext | undefined> = fc.option(
  fc.record({
    action: fc.string({ minLength: 1, maxLength: 50 }),
    component: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    metadata: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
  }),
  { nil: undefined }
)

/**
 * Arbitrary for generating EnhancedFormattedError
 */
const enhancedErrorArbitrary: fc.Arbitrary<EnhancedFormattedError> = fc.record({
  id: fc.uuid(),
  timestamp: fc.integer({ min: 1, max: Date.now() + 1000000 }),
  message: fc.string({ minLength: 10, maxLength: 200 }),
  category: errorCategoryArbitrary,
  suggestions: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 0, maxLength: 3 }),
  actionText: fc.string({ minLength: 1, maxLength: 20 }),
  context: errorContextArbitrary,
  requiresAcknowledgment: fc.boolean(),
  persistent: fc.boolean(),
  recoveryActions: fc.array(
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 20 }),
      type: fc.constantFrom('retry', 'navigate', 'focus', 'custom', 'countdown') as fc.Arbitrary<
        'retry' | 'navigate' | 'focus' | 'custom' | 'countdown'
      >,
    }),
    { minLength: 1, maxLength: 3 }
  ),
}) as fc.Arbitrary<EnhancedFormattedError>

describe('Error State Manager - Property Tests', () => {
  beforeEach(() => {
    // Reset state before each test
  })

  /**
   * Feature: error-messaging-improvements, Property 17: Error Deduplication
   * Validates: Requirements 7.2
   *
   * For any error with the same signature as an existing error, the duplicate count
   * SHALL increase by 1 and no new error entry SHALL be created.
   */
  describe('Property 17: Error Deduplication', () => {
    it('should not add duplicate errors with the same signature', () => {
      fc.assert(
        fc.property(
          enhancedErrorArbitrary,
          fc.integer({ min: 2, max: 10 }),
          (baseError, duplicateCount) => {
            const manager = createErrorStateManager()

            // Add the first error
            manager.addError(baseError)
            const initialErrors = manager.getErrors()
            expect(initialErrors.length).toBe(1)

            // Create duplicates with same signature (same category, message, action)
            for (let i = 1; i < duplicateCount; i++) {
              const duplicateError = createMockError({
                id: generateErrorId(), // Different ID
                timestamp: baseError.timestamp + i, // Different timestamp
                message: baseError.message, // Same message
                category: baseError.category, // Same category
                context: baseError.context, // Same context (action)
              })

              manager.addError(duplicateError)
            }

            // Should still have only 1 error
            const finalErrors = manager.getErrors()
            expect(finalErrors.length).toBe(1)

            // Duplicate count should be incremented
            const signature = getErrorSignature(baseError)
            expect(manager.getDuplicateCount(signature)).toBe(duplicateCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should increment duplicate count for each duplicate error', () => {
      fc.assert(
        fc.property(
          enhancedErrorArbitrary,
          fc.integer({ min: 1, max: 20 }),
          (baseError, additionalDuplicates) => {
            const manager = createErrorStateManager()

            // Add the first error
            manager.addError(baseError)
            const signature = getErrorSignature(baseError)

            // Initial count should be 1
            expect(manager.getDuplicateCount(signature)).toBe(1)

            // Add duplicates
            for (let i = 0; i < additionalDuplicates; i++) {
              const duplicateError = createMockError({
                id: generateErrorId(),
                timestamp: baseError.timestamp + i + 1,
                message: baseError.message,
                category: baseError.category,
                context: baseError.context,
              })

              manager.addError(duplicateError)
            }

            // Count should be 1 + additionalDuplicates
            expect(manager.getDuplicateCount(signature)).toBe(1 + additionalDuplicates)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify duplicates using isDuplicate', () => {
      fc.assert(
        fc.property(enhancedErrorArbitrary, (baseError) => {
          const manager = createErrorStateManager()

          // Before adding, should not be a duplicate
          expect(manager.isDuplicate(baseError)).toBe(false)

          // Add the error
          manager.addError(baseError)

          // Create a duplicate with same signature
          const duplicateError = createMockError({
            id: generateErrorId(),
            timestamp: baseError.timestamp + 1,
            message: baseError.message,
            category: baseError.category,
            context: baseError.context,
          })

          // Should be identified as duplicate
          expect(manager.isDuplicate(duplicateError)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should not consider errors with different signatures as duplicates', () => {
      fc.assert(
        fc.property(enhancedErrorArbitrary, enhancedErrorArbitrary, (error1, error2) => {
          // Ensure errors have different signatures
          const signature1 = getErrorSignature(error1)
          const signature2 = getErrorSignature(error2)

          // Skip if signatures happen to be the same
          if (signature1 === signature2) {
            return true // Skip this test case
          }

          const manager = createErrorStateManager()

          // Add first error
          manager.addError(error1)

          // Second error should not be a duplicate
          expect(manager.isDuplicate(error2)).toBe(false)

          // Add second error
          manager.addError(error2)

          // Should have 2 errors
          expect(manager.getErrors().length).toBe(2)
        }),
        { numRuns: 100 }
      )
    })

    it('should generate consistent signatures for same error properties', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }),
          errorCategoryArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          (message, category, action) => {
            const error1 = createMockError({
              message,
              category,
              context: { action },
            })

            const error2 = createMockError({
              id: generateErrorId(), // Different ID
              timestamp: Date.now() + 1000, // Different timestamp
              message, // Same message
              category, // Same category
              context: { action }, // Same action
            })

            // Signatures should be identical
            expect(getErrorSignature(error1)).toBe(getErrorSignature(error2))
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 18: Error Ordering
   * Validates: Requirements 7.6
   *
   * For any set of errors, getErrors() SHALL return them sorted by timestamp
   * in descending order (newest first).
   */
  describe('Property 18: Error Ordering', () => {
    it('should return errors sorted by timestamp descending (newest first)', () => {
      fc.assert(
        fc.property(fc.array(enhancedErrorArbitrary, { minLength: 2, maxLength: 20 }), (errors) => {
          const manager = createErrorStateManager()

          // Ensure all errors have unique signatures to avoid deduplication
          const uniqueErrors = errors.map((error, index) => ({
            ...error,
            id: generateErrorId(),
            message: `${error.message} - unique ${index}`,
          }))

          // Add errors in random order
          uniqueErrors.forEach((error) => manager.addError(error))

          // Get errors
          const sortedErrors = manager.getErrors()

          // Verify sorted by timestamp descending
          for (let i = 0; i < sortedErrors.length - 1; i++) {
            expect(sortedErrors[i].timestamp).toBeGreaterThanOrEqual(sortedErrors[i + 1].timestamp)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should maintain order when adding errors with increasing timestamps', () => {
      fc.assert(
        fc.property(fc.integer({ min: 3, max: 15 }), (count) => {
          const manager = createErrorStateManager()
          const baseTimestamp = Date.now()

          // Add errors with increasing timestamps
          for (let i = 0; i < count; i++) {
            const error = createMockError({
              id: generateErrorId(),
              timestamp: baseTimestamp + i * 1000,
              message: `Error ${i}`,
            })
            manager.addError(error)
          }

          const errors = manager.getErrors()

          // First error should be the newest (highest timestamp)
          expect(errors[0].timestamp).toBe(baseTimestamp + (count - 1) * 1000)

          // Last error should be the oldest (lowest timestamp)
          expect(errors[errors.length - 1].timestamp).toBe(baseTimestamp)
        }),
        { numRuns: 100 }
      )
    })

    it('should maintain order when adding errors with decreasing timestamps', () => {
      fc.assert(
        fc.property(fc.integer({ min: 3, max: 15 }), (count) => {
          const manager = createErrorStateManager()
          const baseTimestamp = Date.now()

          // Add errors with decreasing timestamps
          for (let i = count - 1; i >= 0; i--) {
            const error = createMockError({
              id: generateErrorId(),
              timestamp: baseTimestamp + i * 1000,
              message: `Error ${i}`,
            })
            manager.addError(error)
          }

          const errors = manager.getErrors()

          // Should still be sorted newest first
          for (let i = 0; i < errors.length - 1; i++) {
            expect(errors[i].timestamp).toBeGreaterThanOrEqual(errors[i + 1].timestamp)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should handle errors with same timestamp', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 10 }), (count) => {
          const manager = createErrorStateManager()
          const sameTimestamp = Date.now()

          // Add errors with same timestamp
          for (let i = 0; i < count; i++) {
            const error = createMockError({
              id: generateErrorId(),
              timestamp: sameTimestamp,
              message: `Error ${i}`,
            })
            manager.addError(error)
          }

          const errors = manager.getErrors()

          // All errors should be present
          expect(errors.length).toBe(count)

          // All should have the same timestamp
          errors.forEach((error) => {
            expect(error.timestamp).toBe(sameTimestamp)
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve order after removing an error', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 15 }),
          fc.integer({ min: 0, max: 4 }),
          (count, removeIndex) => {
            const manager = createErrorStateManager()
            const baseTimestamp = Date.now()
            const errorIds: string[] = []

            // Add errors
            for (let i = 0; i < count; i++) {
              const error = createMockError({
                id: generateErrorId(),
                timestamp: baseTimestamp + i * 1000,
                message: `Error ${i}`,
              })
              errorIds.push(error.id)
              manager.addError(error)
            }

            // Remove one error
            const indexToRemove = removeIndex % count
            const sortedBefore = manager.getErrors()
            const idToRemove = sortedBefore[indexToRemove].id
            manager.removeError(idToRemove)

            // Get errors after removal
            const sortedAfter = manager.getErrors()

            // Should have one less error
            expect(sortedAfter.length).toBe(count - 1)

            // Should still be sorted
            for (let i = 0; i < sortedAfter.length - 1; i++) {
              expect(sortedAfter[i].timestamp).toBeGreaterThanOrEqual(sortedAfter[i + 1].timestamp)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 19: Transient Error Clearing
   * Validates: Requirements 7.4
   *
   * For any navigation event, all non-persistent errors SHALL be removed
   * and all persistent errors SHALL remain.
   */
  describe('Property 19: Transient Error Clearing', () => {
    it('should clear transient errors and preserve persistent errors', () => {
      fc.assert(
        fc.property(
          fc.array(enhancedErrorArbitrary, { minLength: 1, maxLength: 10 }),
          fc.array(enhancedErrorArbitrary, { minLength: 1, maxLength: 10 }),
          (transientErrors, persistentErrors) => {
            const manager = createErrorStateManager()

            // Add transient errors (non-persistent categories)
            const addedTransient = transientErrors.map((error, index) => {
              const transientError = createMockError({
                ...error,
                id: generateErrorId(),
                message: `Transient ${index}: ${error.message}`,
                category: 'validation', // Non-persistent category
                persistent: false,
              })
              manager.addError(transientError)
              return transientError
            })

            // Add persistent errors
            const addedPersistent = persistentErrors.map((error, index) => {
              const persistentError = createMockError({
                ...error,
                id: generateErrorId(),
                message: `Persistent ${index}: ${error.message}`,
                category: 'auth', // Persistent category
                persistent: true,
              })
              manager.addError(persistentError)
              return persistentError
            })

            // Verify all errors are present
            const beforeClear = manager.getErrors()
            expect(beforeClear.length).toBe(addedTransient.length + addedPersistent.length)

            // Clear transient errors
            manager.clearTransient()

            // Get remaining errors
            const afterClear = manager.getErrors()

            // Only persistent errors should remain
            expect(afterClear.length).toBe(addedPersistent.length)

            // All remaining errors should be persistent
            afterClear.forEach((error) => {
              expect(
                error.persistent || error.category === 'auth' || error.category === 'permission'
              ).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve errors with persistent category (auth)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
          const manager = createErrorStateManager()

          // Add auth errors (persistent category)
          for (let i = 0; i < count; i++) {
            const error = createMockError({
              id: generateErrorId(),
              message: `Auth error ${i}`,
              category: 'auth',
              persistent: false, // Even without explicit persistent flag
            })
            manager.addError(error)
          }

          // Clear transient
          manager.clearTransient()

          // Auth errors should remain
          const remaining = manager.getErrors()
          expect(remaining.length).toBe(count)
          remaining.forEach((error) => {
            expect(error.category).toBe('auth')
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve errors with persistent category (permission)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
          const manager = createErrorStateManager()

          // Add permission errors (persistent category)
          for (let i = 0; i < count; i++) {
            const error = createMockError({
              id: generateErrorId(),
              message: `Permission error ${i}`,
              category: 'permission',
              persistent: false,
            })
            manager.addError(error)
          }

          // Clear transient
          manager.clearTransient()

          // Permission errors should remain
          const remaining = manager.getErrors()
          expect(remaining.length).toBe(count)
          remaining.forEach((error) => {
            expect(error.category).toBe('permission')
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should clear errors with non-persistent categories', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'network',
            'validation',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ) as fc.Arbitrary<ErrorCategory>,
          fc.integer({ min: 1, max: 10 }),
          (category, count) => {
            const manager = createErrorStateManager()

            // Add errors with non-persistent category
            for (let i = 0; i < count; i++) {
              const error = createMockError({
                id: generateErrorId(),
                message: `${category} error ${i}`,
                category,
                persistent: false,
              })
              manager.addError(error)
            }

            // Verify errors are added
            expect(manager.getErrors().length).toBe(count)

            // Clear transient
            manager.clearTransient()

            // All should be cleared
            expect(manager.getErrors().length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve errors with explicit persistent flag regardless of category', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'network',
            'validation',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ) as fc.Arbitrary<ErrorCategory>,
          fc.integer({ min: 1, max: 10 }),
          (category, count) => {
            const manager = createErrorStateManager()

            // Add errors with explicit persistent flag
            for (let i = 0; i < count; i++) {
              const error = createMockError({
                id: generateErrorId(),
                message: `Persistent ${category} error ${i}`,
                category,
                persistent: true, // Explicit persistent flag
              })
              manager.addError(error)
            }

            // Clear transient
            manager.clearTransient()

            // All should remain due to explicit persistent flag
            expect(manager.getErrors().length).toBe(count)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle mixed persistent and transient errors correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (authCount, permissionCount, networkCount) => {
            const manager = createErrorStateManager()

            // Add auth errors (persistent)
            for (let i = 0; i < authCount; i++) {
              manager.addError(
                createMockError({
                  id: generateErrorId(),
                  message: `Auth ${i}`,
                  category: 'auth',
                })
              )
            }

            // Add permission errors (persistent)
            for (let i = 0; i < permissionCount; i++) {
              manager.addError(
                createMockError({
                  id: generateErrorId(),
                  message: `Permission ${i}`,
                  category: 'permission',
                })
              )
            }

            // Add network errors (transient)
            for (let i = 0; i < networkCount; i++) {
              manager.addError(
                createMockError({
                  id: generateErrorId(),
                  message: `Network ${i}`,
                  category: 'network',
                })
              )
            }

            // Verify total
            expect(manager.getErrors().length).toBe(authCount + permissionCount + networkCount)

            // Clear transient
            manager.clearTransient()

            // Only auth and permission should remain
            const remaining = manager.getErrors()
            expect(remaining.length).toBe(authCount + permissionCount)

            // Verify categories
            const categories = remaining.map((e) => e.category)
            expect(categories.filter((c) => c === 'auth').length).toBe(authCount)
            expect(categories.filter((c) => c === 'permission').length).toBe(permissionCount)
            expect(categories.filter((c) => c === 'network').length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not notify subscribers if no transient errors to clear', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
          const manager = createErrorStateManager()
          let notificationCount = 0

          // Subscribe to changes
          manager.subscribe(() => {
            notificationCount++
          })

          // Add only persistent errors
          for (let i = 0; i < count; i++) {
            manager.addError(
              createMockError({
                id: generateErrorId(),
                message: `Auth ${i}`,
                category: 'auth',
              })
            )
          }

          const notificationsAfterAdd = notificationCount

          // Clear transient (should not notify since no transient errors)
          manager.clearTransient()

          // No additional notification should occur
          expect(notificationCount).toBe(notificationsAfterAdd)
        }),
        { numRuns: 100 }
      )
    })
  })
})
