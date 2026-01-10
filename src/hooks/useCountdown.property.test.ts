/**
 * Property-Based Tests for Countdown Timer Hook
 *
 * Tests Property 5: Rate Limit Countdown
 * - Property 5: Rate Limit Countdown (Requirements 2.6)
 *
 * For any rate limit error with a retry-after duration, the countdown timer
 * SHALL decrement by 1 second each second until reaching 0.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { useCountdown, formatCountdownTime, calculateProgress } from './useCountdown'

describe('Countdown Timer - Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Feature: error-messaging-improvements, Property 5: Rate Limit Countdown
   * Validates: Requirements 2.6
   *
   * For any rate limit error with a retry-after duration, the countdown timer
   * SHALL decrement by 1 second each second until reaching 0.
   */
  describe('Property 5: Rate Limit Countdown', () => {
    it('should decrement by 1 second each second', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 120 }), (initialSeconds) => {
          const { result } = renderHook(() => useCountdown({ initialSeconds, autoStart: true }))

          // Initial state
          expect(result.current.remainingSeconds).toBe(initialSeconds)
          expect(result.current.isActive).toBe(true)
          expect(result.current.isComplete).toBe(false)

          // Advance by 1 second
          act(() => {
            vi.advanceTimersByTime(1000)
          })

          // Should have decremented by 1
          expect(result.current.remainingSeconds).toBe(initialSeconds - 1)
        }),
        { numRuns: 100 }
      )
    })

    it('should reach 0 after initialSeconds seconds', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 60 }), (initialSeconds) => {
          const { result } = renderHook(() => useCountdown({ initialSeconds, autoStart: true }))

          // Advance by exactly initialSeconds
          act(() => {
            vi.advanceTimersByTime(initialSeconds * 1000)
          })

          // Should be at 0 and complete
          expect(result.current.remainingSeconds).toBe(0)
          expect(result.current.isComplete).toBe(true)
          expect(result.current.isActive).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should not go below 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 1, max: 60 }),
          (initialSeconds, extraSeconds) => {
            const { result } = renderHook(() => useCountdown({ initialSeconds, autoStart: true }))

            // Advance by more than initialSeconds
            act(() => {
              vi.advanceTimersByTime((initialSeconds + extraSeconds) * 1000)
            })

            // Should stay at 0
            expect(result.current.remainingSeconds).toBe(0)
            expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should call onComplete when countdown reaches 0', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 30 }), (initialSeconds) => {
          const onComplete = vi.fn()
          const { result } = renderHook(() =>
            useCountdown({ initialSeconds, autoStart: true, onComplete })
          )

          // Advance to completion
          act(() => {
            vi.advanceTimersByTime(initialSeconds * 1000)
          })

          // onComplete should have been called exactly once
          expect(onComplete).toHaveBeenCalledTimes(1)
          expect(result.current.isComplete).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should call onTick for each second', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 10 }), (initialSeconds) => {
          const onTick = vi.fn()
          renderHook(() => useCountdown({ initialSeconds, autoStart: true, onTick }))

          // Advance by 3 seconds (or less if initialSeconds is smaller)
          const tickCount = Math.min(3, initialSeconds)
          act(() => {
            vi.advanceTimersByTime(tickCount * 1000)
          })

          // onTick should have been called for each second
          expect(onTick).toHaveBeenCalledTimes(tickCount)

          // Each call should have the correct remaining seconds
          for (let i = 0; i < tickCount; i++) {
            expect(onTick).toHaveBeenNthCalledWith(i + 1, initialSeconds - i - 1)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should not decrement when paused', () => {
      fc.assert(
        fc.property(fc.integer({ min: 5, max: 60 }), (initialSeconds) => {
          const { result } = renderHook(() => useCountdown({ initialSeconds, autoStart: true }))

          // Advance by 2 seconds
          act(() => {
            vi.advanceTimersByTime(2000)
          })

          const afterTwoSeconds = result.current.remainingSeconds

          // Pause
          act(() => {
            result.current.pause()
          })

          // Advance by 3 more seconds while paused
          act(() => {
            vi.advanceTimersByTime(3000)
          })

          // Should not have changed
          expect(result.current.remainingSeconds).toBe(afterTwoSeconds)
          expect(result.current.isActive).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should resume from paused state', () => {
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 60 }), (initialSeconds) => {
          const { result } = renderHook(() => useCountdown({ initialSeconds, autoStart: true }))

          // Advance by 2 seconds
          act(() => {
            vi.advanceTimersByTime(2000)
          })

          const afterTwoSeconds = result.current.remainingSeconds

          // Pause
          act(() => {
            result.current.pause()
          })

          // Resume
          act(() => {
            result.current.resume()
          })

          // Advance by 1 more second
          act(() => {
            vi.advanceTimersByTime(1000)
          })

          // Should have decremented by 1 from paused state
          expect(result.current.remainingSeconds).toBe(afterTwoSeconds - 1)
          expect(result.current.isActive).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reset to initial state', () => {
      fc.assert(
        fc.property(fc.integer({ min: 5, max: 60 }), (initialSeconds) => {
          const { result } = renderHook(() => useCountdown({ initialSeconds, autoStart: true }))

          // Advance by some time
          act(() => {
            vi.advanceTimersByTime(3000)
          })

          // Reset
          act(() => {
            result.current.reset()
          })

          // Should be back to initial state
          expect(result.current.remainingSeconds).toBe(initialSeconds)
          expect(result.current.isActive).toBe(false)
          expect(result.current.isComplete).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should start with custom duration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 30 }),
          fc.integer({ min: 10, max: 60 }),
          (initialSeconds, newDuration) => {
            const { result } = renderHook(() => useCountdown({ initialSeconds, autoStart: false }))

            // Start with custom duration
            act(() => {
              result.current.start(newDuration)
            })

            expect(result.current.remainingSeconds).toBe(newDuration)
            expect(result.current.isActive).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Tests for formatCountdownTime helper function
   */
  describe('formatCountdownTime', () => {
    it('should format seconds correctly for values under 60', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 59 }), (seconds) => {
          const formatted = formatCountdownTime(seconds)

          // Should be just the number as string
          expect(formatted).toBe(seconds.toString())
        }),
        { numRuns: 100 }
      )
    })

    it('should format minutes and seconds correctly for values >= 60', () => {
      fc.assert(
        fc.property(fc.integer({ min: 60, max: 3600 }), (totalSeconds) => {
          const formatted = formatCountdownTime(totalSeconds)
          const mins = Math.floor(totalSeconds / 60)
          const secs = totalSeconds % 60

          // Should be in MM:SS format
          expect(formatted).toBe(`${mins}:${secs.toString().padStart(2, '0')}`)
        }),
        { numRuns: 100 }
      )
    })

    it('should return "0" for negative values', () => {
      fc.assert(
        fc.property(fc.integer({ min: -1000, max: -1 }), (seconds) => {
          const formatted = formatCountdownTime(seconds)
          expect(formatted).toBe('0')
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Tests for calculateProgress helper function
   */
  describe('calculateProgress', () => {
    it('should return 0 when remaining equals total', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (total) => {
          const progress = calculateProgress(total, total)
          expect(progress).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should return 100 when remaining is 0', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (total) => {
          const progress = calculateProgress(0, total)
          expect(progress).toBe(100)
        }),
        { numRuns: 100 }
      )
    })

    it('should return progress between 0 and 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          (total, remaining) => {
            // Ensure remaining <= total for valid progress
            const validRemaining = Math.min(remaining, total)
            const progress = calculateProgress(validRemaining, total)

            expect(progress).toBeGreaterThanOrEqual(0)
            expect(progress).toBeLessThanOrEqual(100)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate correct percentage', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (total, remaining) => {
            const validRemaining = Math.min(remaining, total)
            const progress = calculateProgress(validRemaining, total)
            const expectedProgress = Math.round(((total - validRemaining) / total) * 100)

            expect(progress).toBe(expectedProgress)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case of total = 0', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 100 }), (remaining) => {
          const progress = calculateProgress(remaining, 0)
          // When total is 0, should return 100 (complete)
          expect(progress).toBe(100)
        }),
        { numRuns: 100 }
      )
    })
  })
})
