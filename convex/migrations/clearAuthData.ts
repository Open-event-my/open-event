/**
 * Development Cleanup Script
 * Clears all authentication-related data to start fresh
 *
 * Usage: Run from Convex Dashboard -> Functions -> clearAuthData:clearAllAuthData
 * Or via CLI: npx convex run migrations/clearAuthData:clearAllAuthData
 */

import { internalMutation } from '../_generated/server'

/**
 * Clears all auth-related tables for a fresh start
 * WARNING: This deletes ALL user data - only use in development!
 */
export const clearAllAuthData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      users: 0,
      sessions: 0,
      authAccounts: 0,
      authSessions: 0,
      authRefreshTokens: 0,
      authVerificationCodes: 0,
      authVerifiers: 0,
      organizerProfiles: 0,
      verificationTokens: 0,
    }

    // Clear users table
    const users = await ctx.db.query('users').collect()
    for (const user of users) {
      await ctx.db.delete(user._id)
      results.users++
    }

    // Clear custom sessions table
    const sessions = await ctx.db.query('sessions').collect()
    for (const session of sessions) {
      await ctx.db.delete(session._id)
      results.sessions++
    }

    // Clear Convex Auth tables
    try {
      const authAccounts = await ctx.db.query('authAccounts').collect()
      for (const account of authAccounts) {
        await ctx.db.delete(account._id)
        results.authAccounts++
      }
    } catch {
      // Table might not exist yet
    }

    try {
      const authSessions = await ctx.db.query('authSessions').collect()
      for (const session of authSessions) {
        await ctx.db.delete(session._id)
        results.authSessions++
      }
    } catch {
      // Table might not exist yet
    }

    try {
      const authRefreshTokens = await ctx.db.query('authRefreshTokens').collect()
      for (const token of authRefreshTokens) {
        await ctx.db.delete(token._id)
        results.authRefreshTokens++
      }
    } catch {
      // Table might not exist yet
    }

    try {
      const authVerificationCodes = await ctx.db.query('authVerificationCodes').collect()
      for (const code of authVerificationCodes) {
        await ctx.db.delete(code._id)
        results.authVerificationCodes++
      }
    } catch {
      // Table might not exist yet
    }

    try {
      const authVerifiers = await ctx.db.query('authVerifiers').collect()
      for (const verifier of authVerifiers) {
        await ctx.db.delete(verifier._id)
        results.authVerifiers++
      }
    } catch {
      // Table might not exist yet
    }

    // Clear organizer profiles (linked to users)
    try {
      const profiles = await ctx.db.query('organizerProfiles').collect()
      for (const profile of profiles) {
        await ctx.db.delete(profile._id)
        results.organizerProfiles++
      }
    } catch {
      // Table might not exist
    }

    // Clear verification tokens
    try {
      const tokens = await ctx.db.query('verificationTokens').collect()
      for (const token of tokens) {
        await ctx.db.delete(token._id)
        results.verificationTokens++
      }
    } catch {
      // Table might not exist
    }

    console.log('Cleared auth data:', results)
    return results
  },
})
