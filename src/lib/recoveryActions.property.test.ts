/**
 * Property-Based Tests for Recovery Actions System
 *
 * Tests Property 3: Recovery Action Presence by Category
 * - Property 3: Recovery Action Presence by Category (Requirements 2.1)
 *
 * Tests Property 4: Exponential Backoff Calculation
 * - Property 4: Exponential Backoff Calculation (Requirements 2.2)
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  calculateBackoffDelay,
  DEFAULT_RETRY_CONFIG,
  CATEGORY_RECOVERY_ACTIONS,
  hasRecoveryActions,
  getRecoveryActionsForCategory,
  createRetryState,
  updateRetryState,
  type RetryConfig,
  type ErrorCategory,
} from './recoveryActions'

describe('Recovery Actions System - Property Tests', () => {
  /**
   * Feature: error-messaging-improvements, Property 3: Recovery Action Presence by Category
   * Validates: Requirements 2.1
   *
   * For any error category, the formatted error SHALL include at least one
   * recovery action appropriate for that category.
   */
  describe('Property 3: Recovery Action Presence by Category', () => {
    // All valid error categories
    const allCategories: ErrorCategory[] = [
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

    it('should have at least one recovery action for every error category', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allCategories), (category) => {
          const actions = CATEGORY_RECOVERY_ACTIONS[category]

          // Should have actions defined
          expect(actions).toBeDefined()
          expect(Array.isArray(actions)).toBe(true)

          // Should have at least one action
          expect(actions.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should return true for hasRecoveryActions for all categories', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allCategories), (category) => {
          expect(hasRecoveryActions(category)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should return non-empty array from getRecoveryActionsForCategory', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allCategories), (category) => {
          const actions = getRecoveryActionsForCategory(category)

          expect(Array.isArray(actions)).toBe(true)
          expect(actions.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should have valid action types for all recovery actions', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allCategories), (category) => {
          const actions = CATEGORY_RECOVERY_ACTIONS[category]
          const validTypes = ['retry', 'navigate', 'focus', 'custom', 'countdown']

          actions.forEach((action) => {
            // Each action should have a label
            expect(action.label).toBeTruthy()
            expect(typeof action.label).toBe('string')
            expect(action.label.length).toBeGreaterThan(0)

            // Each action should have a valid type
            expect(action.type).toBeTruthy()
            expect(validTypes).toContain(action.type)
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should have appropriate action types for each category', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allCategories), (category) => {
          const actions = CATEGORY_RECOVERY_ACTIONS[category]
          const actionTypes = actions.map((a) => a.type)

          // Category-specific checks
          switch (category) {
            case 'auth':
              // Auth errors should have navigate action to sign in
              expect(actionTypes).toContain('navigate')
              break
            case 'network':
            case 'server':
            case 'unknown':
              // Network/server errors should have retry action
              expect(actionTypes).toContain('retry')
              break
            case 'validation':
              // Validation errors should have focus action
              expect(actionTypes).toContain('focus')
              break
            case 'rateLimit':
              // Rate limit errors should have countdown action
              expect(actionTypes).toContain('countdown')
              break
            case 'permission':
              // Permission errors should have custom or navigate action
              expect(actionTypes.includes('custom') || actionTypes.includes('navigate')).toBe(true)
              break
            case 'payment':
              // Payment errors should have navigate or retry action
              expect(actionTypes.includes('navigate') || actionTypes.includes('retry')).toBe(true)
              break
            case 'notFound':
              // Not found errors should have navigate action
              expect(actionTypes).toContain('navigate')
              break
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should have navigate actions with valid paths', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allCategories), (category) => {
          const actions = CATEGORY_RECOVERY_ACTIONS[category]
          const navigateActions = actions.filter((a) => a.type === 'navigate')

          navigateActions.forEach((action) => {
            // Navigate actions should have a path
            expect(action.path).toBeTruthy()
            expect(typeof action.path).toBe('string')
            // Path should start with /
            expect(action.path!.startsWith('/')).toBe(true)
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should have countdown actions with valid duration', () => {
      fc.assert(
        fc.property(fc.constantFrom(...allCategories), (category) => {
          const actions = CATEGORY_RECOVERY_ACTIONS[category]
          const countdownActions = actions.filter((a) => a.type === 'countdown')

          countdownActions.forEach((action) => {
            // Countdown actions should have countdownSeconds
            expect(action.countdownSeconds).toBeDefined()
            expect(typeof action.countdownSeconds).toBe('number')
            expect(action.countdownSeconds).toBeGreaterThan(0)
          })
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 4: Exponential Backoff Calculation
   * Validates: Requirements 2.2
   *
   * For any retry attempt number n, the calculated delay SHALL equal
   * baseDelay * (backoffMultiplier ^ n) capped at maxDelay.
   */
  describe('Property 4: Exponential Backoff Calculation', () => {
    // Generator for valid retry configurations
    const retryConfigArbitrary = fc.record({
      maxAttempts: fc.integer({ min: 1, max: 10 }),
      baseDelay: fc.integer({ min: 100, max: 5000 }),
      maxDelay: fc.integer({ min: 5000, max: 60000 }),
      backoffMultiplier: fc.double({ min: 1.5, max: 3, noNaN: true }),
    }) as fc.Arbitrary<RetryConfig>

    it('should calculate delay as baseDelay * (multiplier ^ attempt)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 5 }), retryConfigArbitrary, (attempt, config) => {
          const delay = calculateBackoffDelay(attempt, config)
          const expectedDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)
          const cappedExpected = Math.min(expectedDelay, config.maxDelay)

          // Delay should match the formula (with floating point tolerance)
          expect(delay).toBeCloseTo(cappedExpected, 0)
        }),
        { numRuns: 100 }
      )
    })

    it('should never exceed maxDelay', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 20 }), retryConfigArbitrary, (attempt, config) => {
          const delay = calculateBackoffDelay(attempt, config)

          // Delay should never exceed maxDelay
          expect(delay).toBeLessThanOrEqual(config.maxDelay)
        }),
        { numRuns: 100 }
      )
    })

    it('should return baseDelay for attempt 0', () => {
      fc.assert(
        fc.property(retryConfigArbitrary, (config) => {
          const delay = calculateBackoffDelay(0, config)

          // First attempt should use baseDelay (multiplier^0 = 1)
          expect(delay).toBe(config.baseDelay)
        }),
        { numRuns: 100 }
      )
    })

    it('should increase delay with each attempt (until capped)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }),
          retryConfigArbitrary.filter((c) => c.backoffMultiplier > 1),
          (attempt, config) => {
            const delay1 = calculateBackoffDelay(attempt, config)
            const delay2 = calculateBackoffDelay(attempt + 1, config)

            // Next attempt should have >= delay (equal when capped)
            expect(delay2).toBeGreaterThanOrEqual(delay1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should work with default config', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10 }), (attempt) => {
          const delay = calculateBackoffDelay(attempt)
          const expectedDelay =
            DEFAULT_RETRY_CONFIG.baseDelay *
            Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, attempt)
          const cappedExpected = Math.min(expectedDelay, DEFAULT_RETRY_CONFIG.maxDelay)

          expect(delay).toBeCloseTo(cappedExpected, 0)
          expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelay)
        }),
        { numRuns: 100 }
      )
    })

    it('should return positive delay for all valid attempts', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), retryConfigArbitrary, (attempt, config) => {
          const delay = calculateBackoffDelay(attempt, config)

          expect(delay).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should cap at maxDelay for large attempt numbers', () => {
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 100 }), retryConfigArbitrary, (attempt, config) => {
          const delay = calculateBackoffDelay(attempt, config)
          const uncappedDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)

          // For large attempts where uncapped delay exceeds maxDelay, should be capped
          if (uncappedDelay > config.maxDelay) {
            expect(delay).toBeCloseTo(config.maxDelay, 0)
          } else {
            // Otherwise should be the calculated delay
            expect(delay).toBeCloseTo(uncappedDelay, 0)
          }

          // In all cases, should never exceed maxDelay
          expect(delay).toBeLessThanOrEqual(config.maxDelay)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional tests for retry state management
   */
  describe('Retry State Management', () => {
    it('should create initial retry state correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            maxAttempts: fc.integer({ min: 1, max: 10 }),
            baseDelay: fc.integer({ min: 100, max: 5000 }),
            maxDelay: fc.integer({ min: 5000, max: 60000 }),
            backoffMultiplier: fc.double({ min: 1.5, max: 3, noNaN: true }),
          }) as fc.Arbitrary<RetryConfig>,
          (config) => {
            const state = createRetryState(config)

            expect(state.attemptCount).toBe(0)
            expect(state.lastError).toBeNull()
            expect(state.maxAttemptsReached).toBe(false)
            expect(state.nextRetryDelay).toBe(config.baseDelay)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update retry state correctly after failure', () => {
      fc.assert(
        fc.property(
          fc.record({
            maxAttempts: fc.integer({ min: 2, max: 10 }),
            baseDelay: fc.integer({ min: 100, max: 5000 }),
            maxDelay: fc.integer({ min: 5000, max: 60000 }),
            backoffMultiplier: fc.double({ min: 1.5, max: 3, noNaN: true }),
          }) as fc.Arbitrary<RetryConfig>,
          fc.string().map((msg) => new Error(msg)),
          (config, error) => {
            const initialState = createRetryState(config)
            const updatedState = updateRetryState(initialState, error, config)

            expect(updatedState.attemptCount).toBe(1)
            expect(updatedState.lastError).toBe(error)
            expect(updatedState.maxAttemptsReached).toBe(config.maxAttempts <= 1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should mark maxAttemptsReached when limit is hit', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 5 }), (maxAttempts) => {
          const config: RetryConfig = {
            ...DEFAULT_RETRY_CONFIG,
            maxAttempts,
          }

          let state = createRetryState(config)
          const error = new Error('Test error')

          // Simulate failures up to max attempts
          for (let i = 0; i < maxAttempts; i++) {
            state = updateRetryState(state, error, config)
          }

          expect(state.maxAttemptsReached).toBe(true)
          expect(state.attemptCount).toBe(maxAttempts)
        }),
        { numRuns: 100 }
      )
    })
  })
})
