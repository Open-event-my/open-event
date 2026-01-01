/**
 * Account Lockout Protection
 *
 * Prevents brute force attacks by locking accounts after multiple failed login attempts.
 * Uses progressive lockout with exponential backoff.
 */

import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'

// ============================================================================
// Configuration
// ============================================================================

export const LOCKOUT_CONFIG = {
  // Number of failed attempts before lockout
  MAX_ATTEMPTS: 5,

  // Time window for counting attempts (15 minutes)
  ATTEMPT_WINDOW_MS: 15 * 60 * 1000,

  // Progressive lockout durations
  LOCKOUT_DURATIONS: [
    1 * 60 * 1000, // 1 minute after 5 failures
    5 * 60 * 1000, // 5 minutes after 10 failures
    15 * 60 * 1000, // 15 minutes after 15 failures
    60 * 60 * 1000, // 1 hour after 20+ failures
  ],

  // Maximum lockout duration (1 hour)
  MAX_LOCKOUT_MS: 60 * 60 * 1000,
} as const

// ============================================================================
// Types
// ============================================================================

export interface LockoutStatus {
  isLocked: boolean
  remainingAttempts: number
  lockedUntil?: number
  lockoutDuration?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate lockout duration based on number of failures
 */
function calculateLockoutDuration(failureCount: number): number {
  const index = Math.floor(failureCount / LOCKOUT_CONFIG.MAX_ATTEMPTS) - 1
  const durations = LOCKOUT_CONFIG.LOCKOUT_DURATIONS
  return durations[Math.min(index, durations.length - 1)] || LOCKOUT_CONFIG.MAX_LOCKOUT_MS
}

/**
 * Format lockout duration for display
 */
export function formatLockoutDuration(ms: number): string {
  const minutes = Math.ceil(ms / 60000)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'}`
}

// ============================================================================
// Convex Functions
// ============================================================================

/**
 * Check if an identifier (email/IP) is currently locked out
 */
export const checkLockoutStatus = internalQuery({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args): Promise<LockoutStatus> => {
    const now = Date.now()
    const windowStart = now - LOCKOUT_CONFIG.ATTEMPT_WINDOW_MS

    // Get existing record
    const record = await ctx.db
      .query('failedLoginAttempts')
      .withIndex('by_identifier', (q) => q.eq('identifier', args.identifier.toLowerCase()))
      .first()

    if (!record) {
      return {
        isLocked: false,
        remainingAttempts: LOCKOUT_CONFIG.MAX_ATTEMPTS,
      }
    }

    // Check if currently locked
    if (record.lockedUntil && record.lockedUntil > now) {
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil: record.lockedUntil,
        lockoutDuration: record.lockedUntil - now,
      }
    }

    // Count recent attempts
    const recentAttempts = record.attempts.filter((t) => t > windowStart)
    const remainingAttempts = Math.max(0, LOCKOUT_CONFIG.MAX_ATTEMPTS - recentAttempts.length)

    return {
      isLocked: false,
      remainingAttempts,
    }
  },
})

/**
 * Record a failed login attempt
 */
export const recordFailedAttempt = internalMutation({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args): Promise<LockoutStatus> => {
    const now = Date.now()
    const windowStart = now - LOCKOUT_CONFIG.ATTEMPT_WINDOW_MS
    const identifier = args.identifier.toLowerCase()

    // Get existing record
    const record = await ctx.db
      .query('failedLoginAttempts')
      .withIndex('by_identifier', (q) => q.eq('identifier', identifier))
      .first()

    let attempts: number[] = record?.attempts || []

    // Clean up old attempts
    attempts = attempts.filter((t) => t > windowStart)

    // Add new attempt
    attempts.push(now)

    // Check if we need to lock
    let lockedUntil: number | undefined

    if (attempts.length >= LOCKOUT_CONFIG.MAX_ATTEMPTS) {
      const lockoutDuration = calculateLockoutDuration(attempts.length)
      lockedUntil = now + lockoutDuration
    }

    // Update or create record
    if (record) {
      await ctx.db.patch(record._id, {
        attempts,
        lockedUntil,
      })
    } else {
      await ctx.db.insert('failedLoginAttempts', {
        identifier,
        attempts,
        lockedUntil,
        createdAt: now,
      })
    }

    const remainingAttempts = Math.max(0, LOCKOUT_CONFIG.MAX_ATTEMPTS - attempts.length)

    return {
      isLocked: !!lockedUntil,
      remainingAttempts,
      lockedUntil,
      lockoutDuration: lockedUntil ? lockedUntil - now : undefined,
    }
  },
})

/**
 * Clear failed attempts after successful login
 */
export const clearFailedAttempts = internalMutation({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('failedLoginAttempts')
      .withIndex('by_identifier', (q) => q.eq('identifier', args.identifier.toLowerCase()))
      .first()

    if (record) {
      await ctx.db.delete(record._id)
    }
  },
})

/**
 * Clean up old lockout records (run periodically via cron)
 */
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

    // Find records with no recent attempts and no active lockout
    const oldRecords = await ctx.db
      .query('failedLoginAttempts')
      .filter((q) =>
        q.and(
          q.lt(q.field('createdAt'), oneDayAgo),
          q.or(q.eq(q.field('lockedUntil'), undefined), q.lt(q.field('lockedUntil'), Date.now()))
        )
      )
      .collect()

    // Delete old records
    for (const record of oldRecords) {
      await ctx.db.delete(record._id)
    }

    return { deleted: oldRecords.length }
  },
})
