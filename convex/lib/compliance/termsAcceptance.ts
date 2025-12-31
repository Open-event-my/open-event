/**
 * Terms Acceptance Service
 *
 * Handles tracking of user acceptance of terms of service.
 * Validates: Requirements 3.4
 */

import { v } from 'convex/values'
import { mutation, query } from '../../_generated/server'

/**
 * Record user acceptance of terms of service
 */
export const acceptTerms = mutation({
  args: {
    version: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user has already accepted this version
    const existing = await ctx.db
      .query('termsAcceptance')
      .withIndex('by_user_version', (q) => q.eq('userId', user._id).eq('version', args.version))
      .first()

    if (existing) {
      // Already accepted this version
      return existing._id
    }

    // Record the acceptance
    const acceptanceId = await ctx.db.insert('termsAcceptance', {
      userId: user._id,
      version: args.version,
      acceptedAt: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    })

    return acceptanceId
  },
})

/**
 * Check if user has accepted a specific version of terms
 */
export const hasAcceptedVersion = query({
  args: {
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return false
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first()

    if (!user) {
      return false
    }

    // Check if acceptance record exists
    const acceptance = await ctx.db
      .query('termsAcceptance')
      .withIndex('by_user_version', (q) => q.eq('userId', user._id).eq('version', args.version))
      .first()

    return !!acceptance
  },
})

/**
 * Get all terms acceptances for a user
 */
export const getUserAcceptances = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first()

    if (!user) {
      return []
    }

    // Get all acceptances for this user
    const acceptances = await ctx.db
      .query('termsAcceptance')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    return acceptances
  },
})

/**
 * Get the latest terms version accepted by a user
 */
export const getLatestAcceptedVersion = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    // Get user ID from identity
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first()

    if (!user) {
      return null
    }

    // Get all acceptances for this user, sorted by date
    const acceptances = await ctx.db
      .query('termsAcceptance')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    if (acceptances.length === 0) {
      return null
    }

    // Find the most recent acceptance
    const latest = acceptances.reduce((prev, current) =>
      current.acceptedAt > prev.acceptedAt ? current : prev
    )

    return {
      version: latest.version,
      acceptedAt: latest.acceptedAt,
    }
  },
})
