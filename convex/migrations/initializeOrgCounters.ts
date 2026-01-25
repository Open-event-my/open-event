/**
 * Migration: Initialize Organization Counters
 *
 * This migration initializes the activeEventCount and pendingInvitationCount
 * fields for existing organizations. These counters are used for atomic
 * limit enforcement to prevent race conditions.
 *
 * Run this migration once after deploying the security fixes.
 *
 * Usage: npx convex run migrations/initializeOrgCounters:run
 */

import { internalMutation, internalQuery } from '../_generated/server'
import { v } from 'convex/values'

/**
 * Get all organizations that need counter initialization
 */
export const getOrgsNeedingInit = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect()

    // Filter to orgs that don't have counters initialized
    return orgs.filter(
      (org) => org.activeEventCount === undefined || org.pendingInvitationCount === undefined
    )
  },
})

/**
 * Calculate the correct counter values for a single organization
 */
export const calculateOrgCounters = internalQuery({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (ctx, args) => {
    // Count active events (not cancelled or completed)
    const events = await ctx.db
      .query('events')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect()

    const activeEventCount = events.filter(
      (e) => e.status !== 'cancelled' && e.status !== 'completed'
    ).length

    // Count pending invitations
    const invitations = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect()

    const pendingInvitationCount = invitations.length

    return {
      activeEventCount,
      pendingInvitationCount,
    }
  },
})

/**
 * Initialize counters for a single organization
 */
export const initializeOrgCounters = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    activeEventCount: v.number(),
    pendingInvitationCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      activeEventCount: args.activeEventCount,
      pendingInvitationCount: args.pendingInvitationCount,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Run the full migration
 * This is the entry point for the migration
 */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect()

    let migratedCount = 0
    let skippedCount = 0
    const errors: { orgId: string; error: string }[] = []

    for (const org of orgs) {
      try {
        // Skip if already initialized
        if (org.activeEventCount !== undefined && org.pendingInvitationCount !== undefined) {
          skippedCount++
          continue
        }

        // Count active events
        const events = await ctx.db
          .query('events')
          .withIndex('by_organization', (q) => q.eq('organizationId', org._id))
          .collect()

        const activeEventCount = events.filter(
          (e) => e.status !== 'cancelled' && e.status !== 'completed'
        ).length

        // Count pending invitations
        const invitations = await ctx.db
          .query('organizationInvitations')
          .withIndex('by_organization', (q) => q.eq('organizationId', org._id))
          .filter((q) => q.eq(q.field('status'), 'pending'))
          .collect()

        const pendingInvitationCount = invitations.length

        // Update the organization
        await ctx.db.patch(org._id, {
          activeEventCount,
          pendingInvitationCount,
          updatedAt: Date.now(),
        })

        migratedCount++
      } catch (error) {
        errors.push({
          orgId: org._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      success: errors.length === 0,
      totalOrgs: orgs.length,
      migratedCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  },
})

/**
 * Verify the migration was successful
 */
export const verify = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect()

    const issues: { orgId: string; issue: string }[] = []

    for (const org of orgs) {
      // Check if counters are set
      if (org.activeEventCount === undefined) {
        issues.push({ orgId: org._id, issue: 'activeEventCount not set' })
        continue
      }
      if (org.pendingInvitationCount === undefined) {
        issues.push({ orgId: org._id, issue: 'pendingInvitationCount not set' })
        continue
      }

      // Verify counter accuracy
      const events = await ctx.db
        .query('events')
        .withIndex('by_organization', (q) => q.eq('organizationId', org._id))
        .collect()

      const actualActiveCount = events.filter(
        (e) => e.status !== 'cancelled' && e.status !== 'completed'
      ).length

      if (org.activeEventCount !== actualActiveCount) {
        issues.push({
          orgId: org._id,
          issue: `activeEventCount mismatch: stored=${org.activeEventCount}, actual=${actualActiveCount}`,
        })
      }

      const invitations = await ctx.db
        .query('organizationInvitations')
        .withIndex('by_organization', (q) => q.eq('organizationId', org._id))
        .filter((q) => q.eq(q.field('status'), 'pending'))
        .collect()

      if (org.pendingInvitationCount !== invitations.length) {
        issues.push({
          orgId: org._id,
          issue: `pendingInvitationCount mismatch: stored=${org.pendingInvitationCount}, actual=${invitations.length}`,
        })
      }
    }

    return {
      success: issues.length === 0,
      totalOrgs: orgs.length,
      issueCount: issues.length,
      issues: issues.length > 0 ? issues : undefined,
    }
  },
})
