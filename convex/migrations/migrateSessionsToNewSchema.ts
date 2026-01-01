/**
 * Migration Script: Migrate Sessions to New Auth Schema
 *
 * This migration updates existing sessions from the old schema to the new schema:
 * Old: { token, expiresAt }
 * New: { accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt }
 *
 * Run this migration once after deploying the new schema.
 * It can be run via: npx convex run migrations/migrateSessionsToNewSchema:migrate
 */

import { internalMutation, internalQuery } from '../_generated/server'
import { v } from 'convex/values'
import type { MutationCtx } from '../_generated/server'

// Token expiry constants (same as customAuth.ts)
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000 // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

interface MigrationResult {
  processed: number
  migrated: number
  deleted: number
  errors: number
  hasMore: boolean
}

/**
 * Old session schema type (before migration)
 * Sessions may have either old or new schema fields.
 * Using loose typing for legacy data compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacySession = any

/**
 * Core migration logic - can be called by both mutation handlers
 */
async function migrateSessionsBatch(ctx: MutationCtx, batchSize: number): Promise<MigrationResult> {
  const now = Date.now()

  // Get sessions that need migration
  const allSessions: LegacySession[] = await ctx.db.query('sessions').take(batchSize)

  // Filter to only old-schema sessions (those with old 'token' field but no 'accessToken')
  const sessionsToMigrate = allSessions.filter(
    (s: LegacySession) => s.token !== undefined && s.accessToken === undefined
  )

  let migratedCount = 0
  let deletedCount = 0
  let errorCount = 0

  for (const session of sessionsToMigrate) {
    try {
      // session is already typed as SessionRecord with token defined

      // Check if the old session has expired
      if (session.expiresAt && session.expiresAt < now) {
        // Delete expired sessions
        await ctx.db.delete(session._id)
        deletedCount++
        continue
      }

      // Generate new tokens
      const accessToken = session.token || crypto.randomUUID()
      const refreshToken = crypto.randomUUID()

      // Calculate new expiry times
      // If the old session had remaining time, use that for access token
      const remainingTime = session.expiresAt
        ? Math.max(0, session.expiresAt - now)
        : ACCESS_TOKEN_EXPIRY

      // Access token gets either remaining time or default (whichever is smaller)
      const accessTokenExpiresAt = now + Math.min(remainingTime, ACCESS_TOKEN_EXPIRY)
      // Refresh token gets full expiry
      const refreshTokenExpiresAt = now + REFRESH_TOKEN_EXPIRY

      // Update session with new schema
      await ctx.db.patch(session._id, {
        accessToken,
        refreshToken,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        // Remove old fields by setting to undefined
        // (Convex will remove undefined fields)
      })

      migratedCount++
    } catch (error) {
      console.error(`Failed to migrate session ${session._id}:`, error)
      errorCount++
    }
  }

  return {
    processed: sessionsToMigrate.length,
    migrated: migratedCount,
    deleted: deletedCount,
    errors: errorCount,
    hasMore: allSessions.length === batchSize,
  }
}

/**
 * Check if migration is needed by looking for old-style sessions
 */
export const checkMigrationNeeded = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all sessions
    const sessions: LegacySession[] = await ctx.db.query('sessions').take(100)

    // Check if any session has old schema (token instead of accessToken)
    const oldSchemaCount = sessions.filter(
      (s: LegacySession) => s.token !== undefined && s.accessToken === undefined
    ).length

    return {
      totalSessions: sessions.length,
      oldSchemaCount,
      needsMigration: oldSchemaCount > 0,
    }
  },
})

/**
 * Migrate sessions from old schema to new schema
 */
export const migrate = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100
    return await migrateSessionsBatch(ctx, batchSize)
  },
})

/**
 * Run full migration in batches
 * Call this repeatedly until hasMore is false
 */
export const runFullMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    let totalMigrated = 0
    let totalDeleted = 0
    let totalErrors = 0
    let batches = 0
    let hasMore = true

    // Run up to 10 batches per call to avoid timeout
    while (hasMore && batches < 10) {
      const result = await migrateSessionsBatch(ctx, 100)
      totalMigrated += result.migrated
      totalDeleted += result.deleted
      totalErrors += result.errors
      hasMore = result.hasMore
      batches++
    }

    return {
      batches,
      totalMigrated,
      totalDeleted,
      totalErrors,
      complete: !hasMore,
    }
  },
})
