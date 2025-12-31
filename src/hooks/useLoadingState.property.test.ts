/**
 * Property-Based Tests for Loading State Management
 *
 * Tests Property 39: Async Operation Loading States
 * **Validates: Requirements 11.7**
 *
 * For any asynchronous operation initiated by user action, a loading indicator
 * should be displayed until the operation completes or fails.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { useLoadingState, useMultipleLoadingStates } from './useLoadingState'

describe('Loading State Management - Property Tests', () => {
  /**
   * Feature: production-readiness, Property 39: Async Operation Loading States
   * Validates: Requirements 11.7
   *
   * For any asynchronous operation initiated by user action, a loading indicator
   * should be displayed until the operation completes or fails.
   */
  describe('Property 39: Async Operation Loading States', () => {
    it('should always show loading state when startLoading is called', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          () => {
            const { result } = renderHook(() => useLoadingState())

            // Initially not loading
            expect(result.current.isLoading).toBe(false)
            expect(result.current.hasStarted).toBe(false)

            // Start loading
            act(() => {
              result.current.startLoading()
            })

            // Should immediately show loading state
            expect(result.current.isLoading).toBe(true)
            expect(result.current.hasStarted).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transition to success state when endSuccess is called', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          () => {
            const { result } = renderHook(() => useLoadingState())

            // Start loading
            act(() => {
              result.current.startLoading()
            })

            expect(result.current.isLoading).toBe(true)

            // End with success
            act(() => {
              result.current.endSuccess()
            })

            // Should no longer be loading and should be success
            expect(result.current.isLoading).toBe(false)
            expect(result.current.isSuccess).toBe(true)
            expect(result.current.isError).toBe(false)
            expect(result.current.error).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should transition to error state when endError is called', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (errorMessage) => {
            const { result } = renderHook(() => useLoadingState())

            // Start loading
            act(() => {
              result.current.startLoading()
            })

            expect(result.current.isLoading).toBe(true)

            // End with error
            act(() => {
              result.current.endError(errorMessage)
            })

            // Should no longer be loading and should have error
            expect(result.current.isLoading).toBe(false)
            expect(result.current.isSuccess).toBe(false)
            expect(result.current.isError).toBe(true)
            expect(result.current.error).toBeTruthy()
            expect(result.current.error?.message).toBe(errorMessage)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should track startedAt timestamp when loading begins', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          () => {
            const { result } = renderHook(() => useLoadingState())

            const beforeStart = Date.now()

            act(() => {
              result.current.startLoading()
            })

            const afterStart = Date.now()

            // startedAt should be set and within the time window
            expect(result.current.startedAt).not.toBeNull()
            expect(result.current.startedAt).toBeGreaterThanOrEqual(beforeStart)
            expect(result.current.startedAt).toBeLessThanOrEqual(afterStart)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reset state correctly', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (shouldSucceed) => {
            const { result } = renderHook(() => useLoadingState())

            // Start loading
            act(() => {
              result.current.startLoading()
            })

            // End with success or error
            act(() => {
              if (shouldSucceed) {
                result.current.endSuccess()
              } else {
                result.current.endError('Test error')
              }
            })

            // Reset state
            act(() => {
              result.current.reset()
            })

            // Should be back to initial state
            expect(result.current.isLoading).toBe(false)
            expect(result.current.hasStarted).toBe(false)
            expect(result.current.isSuccess).toBe(false)
            expect(result.current.isError).toBe(false)
            expect(result.current.error).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle multiple sequential start/end cycles', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }),
          (cycles) => {
            const { result } = renderHook(() => useLoadingState())

            for (let i = 0; i < cycles; i++) {
              // Start loading
              act(() => {
                result.current.startLoading()
              })

              expect(result.current.isLoading).toBe(true)

              // End loading
              act(() => {
                result.current.endSuccess()
              })

              expect(result.current.isLoading).toBe(false)
              expect(result.current.isSuccess).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept Error objects in endError', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (errorMessage) => {
            const { result } = renderHook(() => useLoadingState())

            act(() => {
              result.current.startLoading()
            })

            const error = new Error(errorMessage)

            act(() => {
              result.current.endError(error)
            })

            expect(result.current.isError).toBe(true)
            expect(result.current.error).toBe(error)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Multiple Loading States', () => {
    // Filter out reserved JavaScript property names that conflict with Object prototype
    const reservedNames = ['valueOf', 'toString', 'hasOwnProperty', 'constructor', 'prototype', '__proto__']
    const safeString = fc.string({ minLength: 1, maxLength: 20 }).filter(s => !reservedNames.includes(s))

    it('should track multiple independent loading states', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(safeString, { minLength: 2, maxLength: 5 }),
          (keys) => {
            if (keys.length < 2) return // Skip if not enough unique keys

            const { result } = renderHook(() => useMultipleLoadingStates<string>())

            // Start loading for first key
            act(() => {
              result.current.startLoading(keys[0])
            })

            // First key should be loading, others should not
            expect(result.current.getState(keys[0]).isLoading).toBe(true)
            expect(result.current.getState(keys[1]).isLoading).toBe(false)

            // Start loading for second key
            act(() => {
              result.current.startLoading(keys[1])
            })

            // Both should be loading
            expect(result.current.getState(keys[0]).isLoading).toBe(true)
            expect(result.current.getState(keys[1]).isLoading).toBe(true)

            // End first
            act(() => {
              result.current.endSuccess(keys[0])
            })

            // First should not be loading, second should still be loading
            expect(result.current.getState(keys[0]).isLoading).toBe(false)
            expect(result.current.getState(keys[1]).isLoading).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly report if any operation is loading', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
          (loadingStates) => {
            const { result } = renderHook(() => useMultipleLoadingStates<string>())

            // Set loading states
            loadingStates.forEach((shouldLoad, index) => {
              if (shouldLoad) {
                act(() => {
                  result.current.startLoading(`key-${index}`)
                })
              }
            })

            // isAnyLoading should match if any state is true
            const expectedAnyLoading = loadingStates.some((s) => s)
            expect(result.current.isAnyLoading()).toBe(expectedAnyLoading)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return initial state for unknown keys', () => {
      fc.assert(
        fc.property(
          safeString,
          (unknownKey) => {
            const { result } = renderHook(() => useMultipleLoadingStates<string>())

            const state = result.current.getState(unknownKey)

            // Should return initial state
            expect(state.isLoading).toBe(false)
            expect(state.hasStarted).toBe(false)
            expect(state.isSuccess).toBe(false)
            expect(state.isError).toBe(false)
            expect(state.error).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Loading State Invariants', () => {
    it('should never have both isSuccess and isError true simultaneously', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 50 }),
          (shouldSucceed, errorMessage) => {
            const { result } = renderHook(() => useLoadingState())

            act(() => {
              result.current.startLoading()
            })

            act(() => {
              if (shouldSucceed) {
                result.current.endSuccess()
              } else {
                result.current.endError(errorMessage)
              }
            })

            // Invariant: isSuccess and isError should never both be true
            expect(result.current.isSuccess && result.current.isError).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should never have isLoading true with isSuccess or isError true', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (shouldSucceed) => {
            const { result } = renderHook(() => useLoadingState())

            act(() => {
              result.current.startLoading()
            })

            // While loading, success and error should be false
            expect(result.current.isLoading).toBe(true)
            expect(result.current.isSuccess).toBe(false)
            expect(result.current.isError).toBe(false)

            act(() => {
              if (shouldSucceed) {
                result.current.endSuccess()
              } else {
                result.current.endError('error')
              }
            })

            // After ending, loading should be false
            expect(result.current.isLoading).toBe(false)
            // And exactly one of success/error should be true
            expect(result.current.isSuccess !== result.current.isError).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should always have hasStarted true after startLoading is called', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (cycles) => {
            const { result } = renderHook(() => useLoadingState())

            expect(result.current.hasStarted).toBe(false)

            for (let i = 0; i < cycles; i++) {
              act(() => {
                result.current.startLoading()
              })

              // hasStarted should always be true after startLoading
              expect(result.current.hasStarted).toBe(true)

              act(() => {
                result.current.endSuccess()
              })

              // hasStarted should remain true after ending
              expect(result.current.hasStarted).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
