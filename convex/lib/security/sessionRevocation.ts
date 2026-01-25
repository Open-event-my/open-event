/**
 * Session Revocation System
 *
 * Provides real-time session invalidation capabilities:
 * - Immediate suspension blocking (not 15-minute delay)
 * - Password change invalidates ALL sessions
 * - Admin can revoke specific sessions for forensics
 * - Automatic TTL cleanup (7-day expiry)
 *
 * SECURITY: This eliminates the token refresh window where suspended
 * users could continue operating for up to 15 minutes.
 *
 * USAGE:
 * // Check if session is revoked (called from withAuth middleware)
 * const isRevoked = await isSessionRevoked(ctx, userId)
 * if (isRevoked) throw new Error('Session revoked')
 *
 * // Revoke all user sessions (password change, breach)
 * await invalidateAllUserSessions(ctx, userId, 'password_change')
 */

import type { QueryCtx, MutationCtx } from '../../_generated/server'
import type { Id } from '../../_generated/dataModel'
import { logger } from '../monitoring/logger'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Session blacklist TTL (7 days in milliseconds)
 * After this time, blacklist entries are automatically cleaned up
 */
const BLACKLIST_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Reasons for session revocation
 */
export type RevocationReason =
  | 'password_change'
  | 'admin_suspension'
  | 'security_breach'
  | 'user_logout_all'
  | 'manual_admin_action'

// ============================================================================
// SESSION BLACKLIST CHECKS
// ============================================================================

/**
 * Check if a user has any active session revocations
 *
 * This is called by withAuth middleware on every authenticated request.
 * It provides real-time session invalidation without waiting for token refresh.
 *
 * @param ctx - Query or mutation context
 * @param userId - User ID to check
 * @returns true if user has active revocations, false otherwise
 */
export async function isSessionRevoked(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<boolean> {
  const now = Date.now()

  // Check for any non-expired blacklist entries
  const blacklistEntry = await ctx.db
    .query('sessionBlacklist')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .filter((q) => q.gt(q.field('expiresAt'), now))
    .first()

  return blacklistEntry !== null
}

/**
 * Get session revocation timestamp for a user
 *
 * Used to compare against token issuance time.
 * If token was issued before revocation, it's invalid.
 *
 * @param ctx - Query or mutation context
 * @param userId - User ID to check
 * @returns Revocation timestamp or null if no active revocation
 */
export async function getRevocationTimestamp(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<number | null> {
  const now = Date.now()

  const blacklistEntry = await ctx.db
    .query('sessionBlacklist')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .filter((q) => q.gt(q.field('expiresAt'), now))
    .first()

  return blacklistEntry?.invalidatedAt ?? null
}

// ============================================================================
// SESSION INVALIDATION
// ============================================================================

/**
 * Invalidate all sessions for a user
 *
 * Creates a blacklist entry that marks all current sessions as invalid.
 * Future withAuth checks will reject these sessions immediately.
 *
 * @param ctx - Mutation context
 * @param userId - User ID whose sessions to invalidate
 * @param reason - Reason for invalidation
 *
 * @example
 * // After password change
 * await invalidateAllUserSessions(ctx, userId, 'password_change')
 *
 * // After admin suspends account
 * await invalidateAllUserSessions(ctx, targetUserId, 'admin_suspension')
 */
export async function invalidateAllUserSessions(
  ctx: MutationCtx,
  userId: Id<'users'>,
  reason: RevocationReason
): Promise<void> {
  const now = Date.now()
  const expiresAt = now + BLACKLIST_TTL_MS

  // Create blacklist entry
  await ctx.db.insert('sessionBlacklist', {
    userId,
    invalidatedAt: now,
    reason,
    expiresAt,
  })

  await logger.info('All user sessions invalidated', {
    userId,
    reason,
    invalidatedAt: now,
    expiresAt,
  })
}

/**
 * Revoke a specific session by session ID
 *
 * For fine-grained control when you want to invalidate a specific
 * session without affecting all user sessions.
 *
 * @param ctx - Mutation context
 * @param sessionId - Specific session ID to revoke
 *
 * @example
 * // Revoke session from suspicious location
 * await revokeSpecificSession(ctx, sessionId)
 */
export async function revokeSpecificSession(
  ctx: MutationCtx,
  sessionId: Id<'authSessions'> | Id<'sessions'>
): Promise<void> {
  const session = await ctx.db.get(sessionId)

  if (!session) {
    await logger.warn('Attempted to revoke non-existent session', { sessionId })
    return
  }

  // Delete the session directly
  await ctx.db.delete(sessionId)

  await logger.info('Specific session revoked', {
    sessionId,
    userId: session.userId,
  })
}

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Clean up expired blacklist entries
 *
 * This should be called periodically (e.g., daily cron job) to prevent
 * unbounded growth of the sessionBlacklist table.
 *
 * @param ctx - Mutation context
 * @returns Number of entries deleted
 */
export async function cleanupExpiredBlacklistEntries(
  ctx: MutationCtx
): Promise<number> {
  const now = Date.now()

  // Find all expired entries
  const expiredEntries = await ctx.db
    .query('sessionBlacklist')
    .withIndex('by_expiry', (q) => q.lt('expiresAt', now))
    .collect()

  // Delete each expired entry
  for (const entry of expiredEntries) {
    await ctx.db.delete(entry._id)
  }

  await logger.info('Cleaned up expired session blacklist entries', {
    deletedCount: expiredEntries.length,
    timestamp: now,
  })

  return expiredEntries.length
}

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * Get all active session revocations for a user (admin only)
 *
 * @param ctx - Query context
 * @param userId - User ID to check
 * @returns Array of active blacklist entries
 */
export async function getActiveRevocations(
  ctx: QueryCtx,
  userId: Id<'users'>
) {
  const now = Date.now()

  return await ctx.db
    .query('sessionBlacklist')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .filter((q) => q.gt(q.field('expiresAt'), now))
    .collect()
}

/**
 * Manually clear all revocations for a user (admin recovery)
 *
 * Use this only in exceptional cases where you need to restore
 * user access after a mistaken revocation.
 *
 * @param ctx - Mutation context
 * @param userId - User ID to clear revocations for
 */
export async function clearUserRevocations(
  ctx: MutationCtx,
  userId: Id<'users'>
): Promise<void> {
  const revocations = await ctx.db
    .query('sessionBlacklist')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  for (const revocation of revocations) {
    await ctx.db.delete(revocation._id)
  }

  await logger.warn('Admin manually cleared user revocations', {
    userId,
    clearedCount: revocations.length,
  })
}
