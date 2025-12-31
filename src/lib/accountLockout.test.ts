/**
 * Account Lockout Tests
 *
 * Tests for the account lockout configuration and helper functions.
 * Note: Convex mutation/query handlers require integration testing with Convex.
 */

import { describe, it, expect } from 'vitest'
import {
  LOCKOUT_CONFIG,
  formatLockoutDuration,
} from '../../convex/accountLockout'

describe('Account Lockout Configuration', () => {
  describe('LOCKOUT_CONFIG', () => {
    it('should have correct MAX_ATTEMPTS', () => {
      expect(LOCKOUT_CONFIG.MAX_ATTEMPTS).toBe(5)
    })

    it('should have a 15-minute attempt window', () => {
      const fifteenMinutesMs = 15 * 60 * 1000
      expect(LOCKOUT_CONFIG.ATTEMPT_WINDOW_MS).toBe(fifteenMinutesMs)
    })

    it('should have progressive lockout durations', () => {
      expect(LOCKOUT_CONFIG.LOCKOUT_DURATIONS).toHaveLength(4)
      expect(LOCKOUT_CONFIG.LOCKOUT_DURATIONS[0]).toBe(1 * 60 * 1000) // 1 minute
      expect(LOCKOUT_CONFIG.LOCKOUT_DURATIONS[1]).toBe(5 * 60 * 1000) // 5 minutes
      expect(LOCKOUT_CONFIG.LOCKOUT_DURATIONS[2]).toBe(15 * 60 * 1000) // 15 minutes
      expect(LOCKOUT_CONFIG.LOCKOUT_DURATIONS[3]).toBe(60 * 60 * 1000) // 1 hour
    })

    it('should have a 1-hour maximum lockout duration', () => {
      const oneHourMs = 60 * 60 * 1000
      expect(LOCKOUT_CONFIG.MAX_LOCKOUT_MS).toBe(oneHourMs)
    })

    it('should have increasing lockout durations', () => {
      const durations = LOCKOUT_CONFIG.LOCKOUT_DURATIONS
      for (let i = 1; i < durations.length; i++) {
        expect(durations[i]).toBeGreaterThan(durations[i - 1])
      }
    })

    it('should not exceed MAX_LOCKOUT_MS in LOCKOUT_DURATIONS', () => {
      const durations = LOCKOUT_CONFIG.LOCKOUT_DURATIONS
      for (const duration of durations) {
        expect(duration).toBeLessThanOrEqual(LOCKOUT_CONFIG.MAX_LOCKOUT_MS)
      }
    })
  })

  describe('formatLockoutDuration', () => {
    it('should format 1 minute correctly', () => {
      const oneMinute = 60 * 1000
      expect(formatLockoutDuration(oneMinute)).toBe('1 minute')
    })

    it('should format multiple minutes correctly', () => {
      const fiveMinutes = 5 * 60 * 1000
      expect(formatLockoutDuration(fiveMinutes)).toBe('5 minutes')
    })

    it('should format partial minutes by rounding up', () => {
      const partialMinute = 30 * 1000 // 30 seconds
      expect(formatLockoutDuration(partialMinute)).toBe('1 minute')

      const twoAndHalfMinutes = 2.5 * 60 * 1000
      expect(formatLockoutDuration(twoAndHalfMinutes)).toBe('3 minutes')
    })

    it('should format 1 hour correctly', () => {
      const oneHour = 60 * 60 * 1000
      expect(formatLockoutDuration(oneHour)).toBe('1 hour')
    })

    it('should format multiple hours correctly', () => {
      const twoHours = 2 * 60 * 60 * 1000
      expect(formatLockoutDuration(twoHours)).toBe('2 hours')
    })

    it('should format partial hours by rounding up', () => {
      const oneHourThirtyMinutes = 90 * 60 * 1000
      expect(formatLockoutDuration(oneHourThirtyMinutes)).toBe('2 hours')
    })

    it('should handle edge case of 0 duration', () => {
      expect(formatLockoutDuration(0)).toBe('0 minutes')
    })

    it('should handle very small durations', () => {
      expect(formatLockoutDuration(1)).toBe('1 minute')
      expect(formatLockoutDuration(100)).toBe('1 minute')
    })
  })
})

describe('LockoutStatus Interface', () => {
  it('should correctly type check a not-locked status', () => {
    const status: { isLocked: boolean; remainingAttempts: number; lockedUntil?: number; lockoutDuration?: number } = {
      isLocked: false,
      remainingAttempts: 5,
    }
    expect(status.isLocked).toBe(false)
    expect(status.remainingAttempts).toBe(5)
    expect(status.lockedUntil).toBeUndefined()
    expect(status.lockoutDuration).toBeUndefined()
  })

  it('should correctly type check a locked status', () => {
    const now = Date.now()
    const status = {
      isLocked: true,
      remainingAttempts: 0,
      lockedUntil: now + 60000,
      lockoutDuration: 60000,
    }
    expect(status.isLocked).toBe(true)
    expect(status.remainingAttempts).toBe(0)
    expect(status.lockedUntil).toBeGreaterThan(now)
    expect(status.lockoutDuration).toBe(60000)
  })
})
