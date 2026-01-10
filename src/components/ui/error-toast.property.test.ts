/**
 * Property-Based Tests for Error Toast
 *
 * Feature: error-messaging-improvements, Property 15: Toast Persistence by Error Type
 * Validates: Requirements 6.6
 *
 * For any error that requires user acknowledgment, the toast duration SHALL be 0 (no auto-dismiss).
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  getToastDuration,
  getToastDurationByCategory,
  shouldShowRecoveryActions,
} from './error-toast'
import type { EnhancedFormattedError, ErrorCategory } from '@/lib/errorFormatter'
import { generateErrorId } from '@/lib/errorFormatter'

// Helper to create a mock EnhancedFormattedError
function createMockError(
  category: ErrorCategory,
  options: {
    requiresAcknowledgment?: boolean
    persistent?: boolean
    message?: string
    suggestions?: string[]
  } = {}
): EnhancedFormattedError {
  return {
    id: generateErrorId(),
    timestamp: Date.now(),
    message: options.message || 'Test error message',
    category,
    suggestions: options.suggestions,
    requiresAcknowledgment: options.requiresAcknowledgment ?? false,
    persistent: options.persistent ?? false,
    recoveryActions: [],
  }
}

describe('Error Toast - Property Tests', () => {
  /**
   * Feature: error-messaging-improvements, Property 15: Toast Persistence by Error Type
   * Validates: Requirements 6.6
   *
   * For any error that requires user acknowledgment, the toast duration SHALL be 0 (no auto-dismiss).
   * Note: In our implementation, we use Infinity instead of 0 to indicate no auto-dismiss.
   */
  describe('Property 15: Toast Persistence by Error Type', () => {
    // Categories that should always be persistent
    const persistentCategories: ErrorCategory[] = ['auth', 'permission', 'payment', 'rateLimit']

    // Categories that should auto-dismiss
    const autoDismissCategories: ErrorCategory[] = [
      'network',
      'validation',
      'notFound',
      'server',
      'unknown',
    ]

    it('should return Infinity duration for errors requiring acknowledgment', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ErrorCategory>(
            'auth',
            'network',
            'validation',
            'permission',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ),
          (category) => {
            const error = createMockError(category, { requiresAcknowledgment: true })
            const config = getToastDuration(error)

            // Errors requiring acknowledgment should have Infinity duration (no auto-dismiss)
            expect(config.duration).toBe(Infinity)
            expect(config.persistent).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return Infinity duration for persistent error categories', () => {
      fc.assert(
        fc.property(fc.constantFrom(...persistentCategories), (category) => {
          const error = createMockError(category, { requiresAcknowledgment: false })
          const config = getToastDuration(error)

          // Persistent categories should have Infinity duration
          expect(config.duration).toBe(Infinity)
          expect(config.persistent).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should return finite duration for auto-dismiss categories without acknowledgment requirement', () => {
      fc.assert(
        fc.property(fc.constantFrom(...autoDismissCategories), (category) => {
          const error = createMockError(category, { requiresAcknowledgment: false })
          const config = getToastDuration(error)

          // Auto-dismiss categories should have finite duration
          expect(config.duration).toBeLessThan(Infinity)
          expect(config.duration).toBeGreaterThan(0)
          expect(config.persistent).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should return consistent duration for same category', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ErrorCategory>(
            'auth',
            'network',
            'validation',
            'permission',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ),
          fc.integer({ min: 1, max: 10 }),
          (category, count) => {
            const durations = new Set<number>()

            for (let i = 0; i < count; i++) {
              const error = createMockError(category, { requiresAcknowledgment: false })
              const config = getToastDuration(error)
              durations.add(config.duration)
            }

            // All durations for the same category should be the same
            expect(durations.size).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return Infinity for getToastDurationByCategory when requiresAcknowledgment is true', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ErrorCategory>(
            'auth',
            'network',
            'validation',
            'permission',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ),
          (category) => {
            const duration = getToastDurationByCategory(category, true)
            expect(duration).toBe(Infinity)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return Infinity for persistent categories in getToastDurationByCategory', () => {
      fc.assert(
        fc.property(fc.constantFrom(...persistentCategories), (category) => {
          const duration = getToastDurationByCategory(category, false)
          expect(duration).toBe(Infinity)
        }),
        { numRuns: 100 }
      )
    })

    it('should return finite duration for auto-dismiss categories in getToastDurationByCategory', () => {
      fc.assert(
        fc.property(fc.constantFrom(...autoDismissCategories), (category) => {
          const duration = getToastDurationByCategory(category, false)
          expect(duration).toBeLessThan(Infinity)
          expect(duration).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should show recovery actions for persistent errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ErrorCategory>(
            'auth',
            'network',
            'validation',
            'permission',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ),
          (category) => {
            const error = createMockError(category, { requiresAcknowledgment: true })
            const showActions = shouldShowRecoveryActions(error)

            // Errors requiring acknowledgment should show recovery actions
            expect(showActions).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show recovery actions for errors marked as persistent', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ErrorCategory>(
            'auth',
            'network',
            'validation',
            'permission',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ),
          (category) => {
            const error = createMockError(category, { persistent: true })
            const showActions = shouldShowRecoveryActions(error)

            // Persistent errors should show recovery actions
            expect(showActions).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should show recovery actions for specific categories', () => {
      const categoriesWithActions: ErrorCategory[] = [
        'auth',
        'network',
        'permission',
        'rateLimit',
        'payment',
      ]

      fc.assert(
        fc.property(fc.constantFrom(...categoriesWithActions), (category) => {
          const error = createMockError(category, {
            requiresAcknowledgment: false,
            persistent: false,
          })
          const showActions = shouldShowRecoveryActions(error)

          // These categories should always show recovery actions
          expect(showActions).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should not show recovery actions for validation and notFound without persistence', () => {
      const categoriesWithoutActions: ErrorCategory[] = [
        'validation',
        'notFound',
        'server',
        'unknown',
      ]

      fc.assert(
        fc.property(fc.constantFrom(...categoriesWithoutActions), (category) => {
          const error = createMockError(category, {
            requiresAcknowledgment: false,
            persistent: false,
          })
          const showActions = shouldShowRecoveryActions(error)

          // These categories should not show recovery actions by default
          expect(showActions).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should have duration >= 5000ms for all auto-dismiss errors', () => {
      fc.assert(
        fc.property(fc.constantFrom(...autoDismissCategories), (category) => {
          const error = createMockError(category, { requiresAcknowledgment: false })
          const config = getToastDuration(error)

          // Minimum duration should be 5000ms for readability
          if (config.duration !== Infinity) {
            expect(config.duration).toBeGreaterThanOrEqual(5000)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should have duration <= 10000ms for auto-dismiss errors', () => {
      fc.assert(
        fc.property(fc.constantFrom(...autoDismissCategories), (category) => {
          const error = createMockError(category, { requiresAcknowledgment: false })
          const config = getToastDuration(error)

          // Maximum duration should be 10000ms to not annoy users
          if (config.duration !== Infinity) {
            expect(config.duration).toBeLessThanOrEqual(10000)
          }
        }),
        { numRuns: 100 }
      )
    })
  })
})
