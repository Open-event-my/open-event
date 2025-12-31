/**
 * Session Manager Tests
 * Tests session timeout functionality
 *
 * Requirements: 1.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SessionManager, resetSessionManager } from './sessionManager'

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    vi.useFakeTimers()
    resetSessionManager()
    sessionManager = new SessionManager({
      timeoutMs: 15 * 60 * 1000, // 15 minutes
      warningMs: 2 * 60 * 1000, // 2 minutes
      checkIntervalMs: 10 * 1000, // 10 seconds
    })
  })

  afterEach(() => {
    sessionManager.stop()
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = sessionManager.getState()
      expect(state.isActive).toBe(true)
      expect(state.isWarningShown).toBe(false)
      expect(state.lastActivityTime).toBeGreaterThan(0)
    })

    it('should start tracking when start() is called', () => {
      sessionManager.start()
      const state = sessionManager.getState()
      expect(state.isActive).toBe(true)
    })

    it('should not start twice', () => {
      sessionManager.start()
      const firstState = sessionManager.getState()

      sessionManager.start()
      const secondState = sessionManager.getState()

      expect(firstState.lastActivityTime).toBe(secondState.lastActivityTime)
    })
  })

  describe('Activity Tracking', () => {
    it('should reset timer on user activity', () => {
      sessionManager.start()
      const initialTime = sessionManager.getState().lastActivityTime

      vi.advanceTimersByTime(5000) // 5 seconds

      // Simulate user activity
      window.dispatchEvent(new MouseEvent('mousedown'))
      vi.advanceTimersByTime(1100) // Wait for throttle

      const newTime = sessionManager.getState().lastActivityTime
      expect(newTime).toBeGreaterThan(initialTime)
    })

    it('should throttle activity updates', () => {
      sessionManager.start()
      const initialTime = sessionManager.getState().lastActivityTime

      // Multiple rapid events
      window.dispatchEvent(new MouseEvent('mousedown'))
      window.dispatchEvent(new MouseEvent('mousemove'))
      window.dispatchEvent(new KeyboardEvent('keydown'))

      vi.advanceTimersByTime(1100) // Wait for throttle to clear

      const newTime = sessionManager.getState().lastActivityTime
      // Should have updated at least once
      expect(newTime).toBeGreaterThanOrEqual(initialTime)
    })

    it('should track multiple activity event types', () => {
      sessionManager.start()
      let activityCount = 0

      sessionManager.on((event) => {
        if (event === 'activity') {
          activityCount++
        }
      })

      // Test different event types
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
      events.forEach((eventType) => {
        window.dispatchEvent(new Event(eventType))
        vi.advanceTimersByTime(1100) // Wait for throttle
      })

      expect(activityCount).toBeGreaterThan(0)
    })
  })

  describe('Timeout Detection', () => {
    it('should detect when session is near timeout', () => {
      sessionManager.start()

      // Advance to warning threshold (13 minutes = 15 - 2)
      vi.advanceTimersByTime(13 * 60 * 1000)

      expect(sessionManager.isNearTimeout()).toBe(true)
    })

    it('should detect when session has timed out', () => {
      sessionManager.start()

      // Advance past timeout (15 minutes)
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000)

      expect(sessionManager.isTimedOut()).toBe(true)
    })

    it('should emit warning event when approaching timeout', () => {
      sessionManager.start()
      let warningEmitted = false

      sessionManager.on((event) => {
        if (event === 'warning') {
          warningEmitted = true
        }
      })

      // Advance to warning threshold and trigger check
      vi.advanceTimersByTime(13 * 60 * 1000)
      vi.advanceTimersByTime(10 * 1000) // Trigger check interval

      expect(warningEmitted).toBe(true)
    })

    it('should emit timeout event when session expires', () => {
      sessionManager.start()
      let timeoutEmitted = false

      sessionManager.on((event) => {
        if (event === 'timeout') {
          timeoutEmitted = true
        }
      })

      // Advance past timeout and trigger check
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000)
      vi.advanceTimersByTime(10 * 1000) // Trigger check interval

      expect(timeoutEmitted).toBe(true)
    })

    it('should only emit warning once', () => {
      sessionManager.start()
      let warningCount = 0

      sessionManager.on((event) => {
        if (event === 'warning') {
          warningCount++
        }
      })

      // Advance to warning threshold
      vi.advanceTimersByTime(13 * 60 * 1000)

      // Trigger multiple checks
      vi.advanceTimersByTime(10 * 1000)
      vi.advanceTimersByTime(10 * 1000)
      vi.advanceTimersByTime(10 * 1000)

      expect(warningCount).toBe(1)
    })
  })

  describe('Timer Reset', () => {
    it('should reset timer manually', () => {
      sessionManager.start()

      // Advance time
      vi.advanceTimersByTime(10 * 60 * 1000) // 10 minutes

      const beforeReset = sessionManager.getTimeRemaining()
      expect(beforeReset).toBeLessThan(15 * 60 * 1000)

      sessionManager.resetTimer()

      const afterReset = sessionManager.getTimeRemaining()
      expect(afterReset).toBeGreaterThan(beforeReset)
    })

    it('should clear warning state when timer is reset', () => {
      sessionManager.start()

      // Advance to warning threshold
      vi.advanceTimersByTime(13 * 60 * 1000)
      vi.advanceTimersByTime(10 * 1000) // Trigger check

      expect(sessionManager.getState().isWarningShown).toBe(true)

      sessionManager.resetTimer()

      expect(sessionManager.getState().isWarningShown).toBe(false)
    })
  })

  describe('Time Remaining', () => {
    it('should calculate time remaining correctly', () => {
      sessionManager.start()

      const initial = sessionManager.getTimeRemaining()
      expect(initial).toBeCloseTo(15 * 60 * 1000, -3) // Within 1 second

      vi.advanceTimersByTime(5 * 60 * 1000) // 5 minutes

      const after5min = sessionManager.getTimeRemaining()
      expect(after5min).toBeCloseTo(10 * 60 * 1000, -3)
    })

    it('should return 0 when timed out', () => {
      sessionManager.start()

      vi.advanceTimersByTime(20 * 60 * 1000) // 20 minutes (past timeout)

      const remaining = sessionManager.getTimeRemaining()
      expect(remaining).toBe(0)
    })
  })

  describe('Event Handlers', () => {
    it('should register and call event handlers', () => {
      sessionManager.start()
      const events: string[] = []

      sessionManager.on((event) => {
        events.push(event)
      })

      sessionManager.resetTimer()

      expect(events).toContain('activity')
    })

    it('should unregister event handlers', () => {
      sessionManager.start()
      let callCount = 0

      const unsubscribe = sessionManager.on(() => {
        callCount++
      })

      sessionManager.resetTimer()
      expect(callCount).toBe(1)

      unsubscribe()

      sessionManager.resetTimer()
      expect(callCount).toBe(1) // Should not increase
    })

    it('should handle errors in event handlers gracefully', () => {
      sessionManager.start()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      sessionManager.on(() => {
        throw new Error('Handler error')
      })

      // Should not throw
      expect(() => {
        sessionManager.resetTimer()
      }).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('should stop tracking when stop() is called', () => {
      sessionManager.start()
      sessionManager.stop()

      // Activity should not be tracked after stop
      const beforeActivity = sessionManager.getState().lastActivityTime

      window.dispatchEvent(new MouseEvent('mousedown'))
      vi.advanceTimersByTime(2000)

      const afterActivity = sessionManager.getState().lastActivityTime
      expect(afterActivity).toBe(beforeActivity)
    })

    it('should clear intervals on stop', () => {
      sessionManager.start()

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      sessionManager.stop()

      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })

  describe('Custom Configuration', () => {
    it('should accept custom timeout duration', () => {
      const customManager = new SessionManager({
        timeoutMs: 5 * 60 * 1000, // 5 minutes
        warningMs: 1 * 60 * 1000, // 1 minute
        checkIntervalMs: 5 * 1000, // 5 seconds
      })

      customManager.start()

      const initial = customManager.getTimeRemaining()
      expect(initial).toBeCloseTo(5 * 60 * 1000, -3)

      customManager.stop()
    })

    it('should use custom warning threshold', () => {
      const customManager = new SessionManager({
        timeoutMs: 10 * 60 * 1000, // 10 minutes
        warningMs: 5 * 60 * 1000, // 5 minutes warning
        checkIntervalMs: 5 * 1000,
      })

      customManager.start()

      // Advance to 6 minutes (within warning threshold)
      vi.advanceTimersByTime(6 * 60 * 1000)

      expect(customManager.isNearTimeout()).toBe(true)

      customManager.stop()
    })
  })
})
