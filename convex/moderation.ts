/**
 * Moderation System
 *
 * Handles user moderation (suspend/unsuspend) and audit logging.
 * Accessible by admin and superadmin.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertRole, getCurrentUser } from './lib/auth'
import { internal } from './_generated/api'

// ============================================================================
// Queries
// ============================================================================

/**
 * Get moderation logs with filtering
 * Accessible by admin and superadmin
 */
export const getModerationLogs = query({
  args: {
    action: v.optional(
      v.union(
        v.literal('user_suspended'),
        v.literal('user_unsuspended'),
        v.literal('user_role_changed'),
        v.literal('admin_created'),
        v.literal('admin_removed'),
        v.literal('vendor_approved'),
        v.literal('vendor_rejected'),
        v.literal('sponsor_approved'),
        v.literal('sponsor_rejected'),
        v.literal('event_flagged'),
        v.literal('event_unflagged'),
        v.literal('event_removed')
      )
    ),
    targetType: v.optional(
      v.union(v.literal('user'), v.literal('vendor'), v.literal('sponsor'), v.literal('event'))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let logs

    // Filter by action if specified
    const actionFilter = args.action
    if (actionFilter) {
      logs = await ctx.db
        .query('moderationLogs')
        .withIndex('by_action', (q) => q.eq('action', actionFilter))
        .order('desc')
        .collect()
    } else {
      logs = await ctx.db.query('moderationLogs').order('desc').collect()
    }

    // Filter by target type in memory if specified
    let filteredLogs = logs
    if (args.targetType) {
      filteredLogs = logs.filter((l) => l.targetType === args.targetType)
    }

    // Apply limit
    const limit = args.limit || 50
    const limitedLogs = filteredLogs.slice(0, limit)

    // Enrich with admin info
    const enrichedLogs = await Promise.all(
      limitedLogs.map(async (log) => {
        const admin = await ctx.db.get(log.adminId)
        return {
          ...log,
          adminName: admin?.name || 'Unknown',
          adminEmail: admin?.email || 'Unknown',
        }
      })
    )

    return enrichedLogs
  },
})

/**
 * Get moderation logs for a specific target
 */
export const getTargetModerationLogs = query({
  args: {
    targetType: v.union(
      v.literal('user'),
      v.literal('vendor'),
      v.literal('sponsor'),
      v.literal('event')
    ),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const logs = await ctx.db
      .query('moderationLogs')
      .withIndex('by_target', (q) =>
        q.eq('targetType', args.targetType).eq('targetId', args.targetId)
      )
      .order('desc')
      .collect()

    // Enrich with admin info
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const admin = await ctx.db.get(log.adminId)
        return {
          ...log,
          adminName: admin?.name || 'Unknown',
          adminEmail: admin?.email || 'Unknown',
        }
      })
    )

    return enrichedLogs
  },
})

/**
 * Get suspended users count for dashboard
 */
export const getSuspendedUsersCount = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const suspendedUsers = await ctx.db
      .query('users')
      .withIndex('by_status', (q) => q.eq('status', 'suspended'))
      .collect()

    return suspendedUsers.length
  },
})

// ============================================================================
// Mutations
// ============================================================================

/**
 * Suspend a user account
 * Accessible by admin and superadmin
 */
export const suspendUser = mutation({
  args: {
    userId: v.id('users'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Admins cannot suspend superadmins
    if (user.role === 'superadmin') {
      throw new Error('Cannot suspend a superadmin')
    }

    // Admins cannot suspend other admins (only superadmin can)
    if (user.role === 'admin' && admin.role !== 'superadmin') {
      throw new Error('Only superadmin can suspend other admins')
    }

    // Cannot suspend yourself
    if (user._id === admin._id) {
      throw new Error('Cannot suspend yourself')
    }

    // Already suspended
    if (user.status === 'suspended') {
      throw new Error('User is already suspended')
    }

    const now = Date.now()

    // Update user status
    await ctx.db.patch(args.userId, {
      status: 'suspended',
      suspendedAt: now,
      suspendedReason: args.reason,
      suspendedBy: admin._id,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'user_suspended',
      targetType: 'user',
      targetId: args.userId,
      reason: args.reason,
      metadata: {
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

/**
 * Unsuspend a user account
 * Accessible by admin and superadmin
 */
export const unsuspendUser = mutation({
  args: {
    userId: v.id('users'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Not suspended
    if (user.status !== 'suspended') {
      throw new Error('User is not suspended')
    }

    // Admins cannot unsuspend other admins (only superadmin can)
    if (user.role === 'admin' && admin.role !== 'superadmin') {
      throw new Error('Only superadmin can unsuspend other admins')
    }

    const now = Date.now()

    // Update user status
    await ctx.db.patch(args.userId, {
      status: 'active',
      suspendedAt: undefined,
      suspendedReason: undefined,
      suspendedBy: undefined,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'user_unsuspended',
      targetType: 'user',
      targetId: args.userId,
      reason: args.reason || 'Suspension lifted',
      metadata: {
        userEmail: user.email,
        userName: user.name,
        previousSuspendedAt: user.suspendedAt,
        previousReason: user.suspendedReason,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

/**
 * Change a user's role
 * Only superadmin can change roles
 */
export const changeUserRole = mutation({
  args: {
    userId: v.id('users'),
    newRole: v.union(v.literal('admin'), v.literal('organizer')),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const superadmin = await assertRole(ctx, 'superadmin')

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Cannot change superadmin role
    if (user.role === 'superadmin') {
      throw new Error('Cannot change superadmin role')
    }

    // Cannot change your own role
    if (user._id === superadmin._id) {
      throw new Error('Cannot change your own role')
    }

    const previousRole = user.role || 'organizer'

    // No change needed
    if (previousRole === args.newRole) {
      throw new Error(`User already has role: ${args.newRole}`)
    }

    const now = Date.now()

    // Update user role
    await ctx.db.patch(args.userId, {
      role: args.newRole,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: superadmin._id,
      action: 'user_role_changed',
      targetType: 'user',
      targetId: args.userId,
      reason: args.reason || `Role changed from ${previousRole} to ${args.newRole}`,
      metadata: {
        userEmail: user.email,
        userName: user.name,
        previousRole,
        newRole: args.newRole,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

/**
 * Get the current user's moderation status
 * Used by frontend to check if account is suspended
 */
export const getMyModerationStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      return null
    }

    return {
      status: user.status || 'active',
      suspendedAt: user.suspendedAt,
      suspendedReason: user.suspendedReason,
    }
  },
})

// ============================================================================
// Event Moderation
// ============================================================================

/**
 * Get flagged events for admin review
 * Accessible by admin and superadmin
 */
export const getFlaggedEvents = query({
  args: {
    severity: v.optional(v.union(v.literal('low'), v.literal('medium'), v.literal('high'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let events

    // Query by flagged status
    if (args.severity) {
      events = await ctx.db
        .query('events')
        .withIndex('by_flagged_severity', (q) =>
          q.eq('flagged', true).eq('flaggedSeverity', args.severity)
        )
        .order('desc')
        .collect()
    } else {
      events = await ctx.db
        .query('events')
        .withIndex('by_flagged', (q) => q.eq('flagged', true))
        .order('desc')
        .collect()
    }

    // Apply limit
    const limit = args.limit || 50
    const limitedEvents = events.slice(0, limit)

    // Enrich with organizer and flagger info
    const enrichedEvents = await Promise.all(
      limitedEvents.map(async (event) => {
        const organizer = await ctx.db.get(event.organizerId)
        const flaggedByUser = event.flaggedBy ? await ctx.db.get(event.flaggedBy) : null

        return {
          _id: event._id,
          title: event.title,
          description: event.description,
          status: event.status,
          startDate: event.startDate,
          flagged: event.flagged,
          flaggedAt: event.flaggedAt,
          flaggedReason: event.flaggedReason,
          flaggedSeverity: event.flaggedSeverity,
          flaggedByName: flaggedByUser?.name || 'Unknown',
          organizerName: organizer?.name || 'Unknown',
          organizerEmail: organizer?.email || 'Unknown',
          organizerId: event.organizerId,
          createdAt: event.createdAt,
        }
      })
    )

    return enrichedEvents
  },
})

/**
 * Get flagged events count for dashboard
 */
export const getFlaggedEventsCount = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const flaggedEvents = await ctx.db
      .query('events')
      .withIndex('by_flagged', (q) => q.eq('flagged', true))
      .collect()

    const counts = {
      total: flaggedEvents.length,
      low: 0,
      medium: 0,
      high: 0,
    }

    for (const event of flaggedEvents) {
      if (event.flaggedSeverity === 'low') counts.low++
      else if (event.flaggedSeverity === 'medium') counts.medium++
      else if (event.flaggedSeverity === 'high') counts.high++
    }

    return counts
  },
})

/**
 * Flag an event for review
 * Accessible by admin and superadmin
 */
export const flagEvent = mutation({
  args: {
    eventId: v.id('events'),
    reason: v.string(),
    severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Already flagged
    if (event.flagged) {
      throw new Error('Event is already flagged')
    }

    const now = Date.now()

    // Update event with flag
    await ctx.db.patch(args.eventId, {
      flagged: true,
      flaggedAt: now,
      flaggedReason: args.reason,
      flaggedSeverity: args.severity,
      flaggedBy: admin._id,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'event_flagged',
      targetType: 'event',
      targetId: args.eventId,
      reason: args.reason,
      metadata: {
        eventTitle: event.title,
        severity: args.severity,
        organizerId: event.organizerId,
      },
      createdAt: now,
    })

    // Create admin notification for flagged content
    await ctx.runMutation(internal.adminNotifications.createFlaggedContentNotification, {
      eventId: args.eventId,
      eventTitle: event.title || 'Untitled Event',
      reason: args.reason,
      severity: args.severity,
      flaggedByName: admin.name || admin.email || 'Admin',
    })

    return { success: true }
  },
})

/**
 * Remove flag from an event
 * Accessible by admin and superadmin
 */
export const unflagEvent = mutation({
  args: {
    eventId: v.id('events'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Not flagged
    if (!event.flagged) {
      throw new Error('Event is not flagged')
    }

    const now = Date.now()

    // Remove flag from event
    await ctx.db.patch(args.eventId, {
      flagged: undefined,
      flaggedAt: undefined,
      flaggedReason: undefined,
      flaggedSeverity: undefined,
      flaggedBy: undefined,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'event_unflagged',
      targetType: 'event',
      targetId: args.eventId,
      reason: args.reason || 'Flag removed',
      metadata: {
        eventTitle: event.title,
        previousSeverity: event.flaggedSeverity,
        previousReason: event.flaggedReason,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

/**
 * Remove a flagged event (set status to removed)
 * Accessible by admin and superadmin
 */
export const removeEvent = mutation({
  args: {
    eventId: v.id('events'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    const now = Date.now()
    const previousStatus = event.status

    // Update event status to cancelled (effectively removing it)
    await ctx.db.patch(args.eventId, {
      status: 'cancelled',
      flagged: undefined,
      flaggedAt: undefined,
      flaggedReason: undefined,
      flaggedSeverity: undefined,
      flaggedBy: undefined,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'event_removed',
      targetType: 'event',
      targetId: args.eventId,
      reason: args.reason,
      metadata: {
        eventTitle: event.title,
        previousStatus,
        organizerId: event.organizerId,
      },
      createdAt: now,
    })

    return { success: true }
  },
})
