/**
 * One-time Migration: Cleanup Orphaned Admin Records
 *
 * This script fixes the issue where admin promotion was done before user signup,
 * resulting in duplicate user records with different roles.
 *
 * What it does:
 * 1. Finds all users grouped by email
 * 2. For emails with multiple records, identifies the "active" user (linked to authAccounts)
 * 3. Upgrades the active user's role to the highest role found among duplicates
 * 4. Deletes orphaned (unlinked) duplicate records
 *
 * Usage: Run from Convex Dashboard -> Functions -> cleanupOrphanedAdmins:run
 * Or via CLI: npx convex run migrations/cleanupOrphanedAdmins:run
 *
 * Safe to run multiple times - will only modify records with actual duplicates.
 */

import { internalMutation } from '../_generated/server'

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all users
    const allUsers = await ctx.db.query('users').collect()

    // Group by email
    const byEmail = new Map<string, typeof allUsers>()
    for (const user of allUsers) {
      if (!user.email) continue
      const email = user.email.toLowerCase() // Case-insensitive grouping
      const existing = byEmail.get(email) || []
      existing.push(user)
      byEmail.set(email, existing)
    }

    let mergedCount = 0
    let deletedCount = 0
    const details: Array<{ email: string; action: string; role?: string }> = []

    for (const [email, users] of byEmail) {
      if (users.length <= 1) continue

      console.log(`[CLEANUP] Found ${users.length} records for email: ${email}`)

      // Find the active user (has authAccounts linked) and highest role
      let activeUser = null
      let highestRole: 'organizer' | 'admin' | 'superadmin' = 'organizer'

      for (const user of users) {
        // Check if this user has auth linked
        const authAccount = await ctx.db
          .query('authAccounts')
          .filter((q) => q.eq(q.field('userId'), user._id))
          .first()

        if (authAccount) {
          activeUser = user
        }

        // Track highest role
        if (user.role === 'superadmin') {
          highestRole = 'superadmin'
        } else if (user.role === 'admin' && highestRole !== 'superadmin') {
          highestRole = 'admin'
        }
      }

      if (!activeUser) {
        // No active user found - pick the most recently created one
        activeUser = users.reduce((a, b) => ((a.createdAt || 0) > (b.createdAt || 0) ? a : b))
        console.log(`[CLEANUP] No auth-linked user for ${email}, using most recent`)
      }

      // Upgrade active user's role if needed
      if (activeUser && highestRole !== activeUser.role) {
        await ctx.db.patch(activeUser._id, { role: highestRole })
        mergedCount++
        console.log(`[CLEANUP] Upgraded ${email} from ${activeUser.role} to ${highestRole}`)
        details.push({ email, action: 'upgraded', role: highestRole })
      }

      // Delete orphaned records
      for (const user of users) {
        if (user._id !== activeUser?._id) {
          await ctx.db.delete(user._id)
          deletedCount++
          console.log(`[CLEANUP] Deleted orphan record for ${email} (ID: ${user._id})`)
          details.push({ email, action: 'deleted_orphan' })
        }
      }
    }

    const result = {
      totalEmailsScanned: byEmail.size,
      mergedCount,
      deletedCount,
      details,
    }

    console.log('[CLEANUP] Migration complete:', JSON.stringify(result, null, 2))
    return result
  },
})

/**
 * Dry run - shows what would be changed without making modifications
 */
export const dryRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all users
    const allUsers = await ctx.db.query('users').collect()

    // Group by email
    const byEmail = new Map<string, typeof allUsers>()
    for (const user of allUsers) {
      if (!user.email) continue
      const email = user.email.toLowerCase()
      const existing = byEmail.get(email) || []
      existing.push(user)
      byEmail.set(email, existing)
    }

    const duplicates: Array<{
      email: string
      records: number
      roles: string[]
      hasActiveUser: boolean
      wouldUpgradeTo?: string
    }> = []

    for (const [email, users] of byEmail) {
      if (users.length <= 1) continue

      let hasActiveUser = false
      let highestRole: 'organizer' | 'admin' | 'superadmin' = 'organizer'
      const roles: string[] = []

      for (const user of users) {
        roles.push(user.role || 'organizer')

        const authAccount = await ctx.db
          .query('authAccounts')
          .filter((q) => q.eq(q.field('userId'), user._id))
          .first()

        if (authAccount) {
          hasActiveUser = true
        }

        if (user.role === 'superadmin') {
          highestRole = 'superadmin'
        } else if (user.role === 'admin' && highestRole !== 'superadmin') {
          highestRole = 'admin'
        }
      }

      duplicates.push({
        email,
        records: users.length,
        roles,
        hasActiveUser,
        wouldUpgradeTo: highestRole !== 'organizer' ? highestRole : undefined,
      })
    }

    return {
      totalUsers: allUsers.length,
      totalEmails: byEmail.size,
      duplicateEmails: duplicates.length,
      duplicates,
    }
  },
})
