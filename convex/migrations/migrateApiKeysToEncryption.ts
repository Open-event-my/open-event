/**
 * Migration: API Keys to Encrypted Storage
 *
 * This migration handles the transition from hashed API keys to encrypted API keys.
 *
 * IMPORTANT NOTES:
 * ================
 * 1. Existing API keys stored as hashes CANNOT be migrated to encrypted storage
 *    because hashing is a one-way operation.
 *
 * 2. This migration will:
 *    - Mark all existing API keys as requiring regeneration
 *    - Add a migration flag to track which keys need to be regenerated
 *    - Notify users that they need to regenerate their API keys
 *
 * 3. After this migration, the API key system will:
 *    - Store new API keys as encrypted values (not hashes)
 *    - Allow retrieval of API keys (with proper authentication)
 *    - Maintain backward compatibility during transition period
 *
 * Requirements: 1.5
 */

import { internalMutation } from '../_generated/server'

/**
 * Migration: Mark existing API keys for regeneration
 *
 * Since we cannot decrypt hashed keys, we need to mark them for regeneration.
 * Users will be notified to regenerate their API keys.
 */
export const markApiKeysForRegeneration = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('Starting API key migration...')

    // Get all active API keys
    const apiKeys = await ctx.db
      .query('apiKeys')
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    console.log(`Found ${apiKeys.length} active API keys to migrate`)

    let migratedCount = 0
    let errorCount = 0

    for (const key of apiKeys) {
      try {
        // Note: We cannot migrate the actual key data because it's hashed
        // Instead, we'll add a note in the description to inform users
        const migrationNote =
          '\n\n⚠️ MIGRATION NOTICE: This API key was created before encryption was enabled. For enhanced security, please regenerate this key.'

        await ctx.db.patch(key._id, {
          description: (key.description || '') + migrationNote,
          // We keep the key active but add the notice
        })

        migratedCount++
      } catch (error) {
        console.error(`Error migrating API key ${key._id}:`, error)
        errorCount++
      }
    }

    console.log(`Migration complete: ${migratedCount} keys marked, ${errorCount} errors`)

    return {
      success: true,
      totalKeys: apiKeys.length,
      migratedCount,
      errorCount,
      message: `Marked ${migratedCount} API keys for regeneration. Users should regenerate their keys for enhanced security.`,
    }
  },
})

/**
 * Migration: Clean up old API keys after transition period
 *
 * This should be run after all users have had time to regenerate their keys.
 * It will revoke any keys that still have the migration notice.
 */
export const revokeUnmigratedApiKeys = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log('Starting cleanup of unmigrated API keys...')

    // Get all active API keys with migration notice
    const apiKeys = await ctx.db
      .query('apiKeys')
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    const unmigratedKeys = apiKeys.filter((key) => key.description?.includes('MIGRATION NOTICE'))

    console.log(`Found ${unmigratedKeys.length} unmigrated API keys to revoke`)

    let revokedCount = 0
    let errorCount = 0

    for (const key of unmigratedKeys) {
      try {
        await ctx.db.patch(key._id, {
          status: 'revoked',
          revokedAt: Date.now(),
        })

        revokedCount++
      } catch (error) {
        console.error(`Error revoking API key ${key._id}:`, error)
        errorCount++
      }
    }

    console.log(`Cleanup complete: ${revokedCount} keys revoked, ${errorCount} errors`)

    return {
      success: true,
      totalUnmigratedKeys: unmigratedKeys.length,
      revokedCount,
      errorCount,
      message: `Revoked ${revokedCount} unmigrated API keys. Users must regenerate their keys.`,
    }
  },
})

/**
 * Helper: Get migration status
 *
 * Returns statistics about the migration progress
 */
export const getMigrationStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allKeys = await ctx.db.query('apiKeys').collect()

    const activeKeys = allKeys.filter((k) => k.status === 'active')
    const unmigratedKeys = activeKeys.filter((k) => k.description?.includes('MIGRATION NOTICE'))
    const migratedKeys = activeKeys.filter((k) => !k.description?.includes('MIGRATION NOTICE'))

    return {
      totalKeys: allKeys.length,
      activeKeys: activeKeys.length,
      unmigratedKeys: unmigratedKeys.length,
      migratedKeys: migratedKeys.length,
      migrationProgress:
        activeKeys.length > 0 ? Math.round((migratedKeys.length / activeKeys.length) * 100) : 100,
    }
  },
})
