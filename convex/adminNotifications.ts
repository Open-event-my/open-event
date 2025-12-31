/**
 * Admin Notifications System
 *
 * Provides notification management for admins including:
 * - Listing and filtering notifications
 * - Marking as read
 * - Creating notifications (internal use)
 * - Email delivery for high-severity alerts
 */

import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import { assertRole } from './lib/auth'

// ============================================================================
// Types
// ============================================================================

// Note: These types are defined for documentation but used via schema validators
// type NotificationType =
//   | 'security_alert'
//   | 'new_application'
//   | 'flagged_content'
//   | 'user_report'
//   | 'system_alert'

// type Severity = 'low' | 'medium' | 'high'

// ============================================================================
// Queries
// ============================================================================

/**
 * List admin notifications with filtering
 * Accessible by admin and superadmin
 */
export const list = query({
  args: {
    type: v.optional(
      v.union(
        v.literal('security_alert'),
        v.literal('new_application'),
        v.literal('flagged_content'),
        v.literal('user_report'),
        v.literal('system_alert')
      )
    ),
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let notifications

    if (args.unreadOnly) {
      notifications = await ctx.db
        .query('adminNotifications')
        .withIndex('by_read', (q) => q.eq('read', false))
        .order('desc')
        .collect()
    } else {
      notifications = await ctx.db.query('adminNotifications').order('desc').collect()
    }

    // Filter by type if specified
    if (args.type) {
      notifications = notifications.filter((n) => n.type === args.type)
    }

    // Apply limit
    const limit = args.limit || 50
    return notifications.slice(0, limit)
  },
})

/**
 * Get unread notification count
 * Accessible by admin and superadmin
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const unreadNotifications = await ctx.db
      .query('adminNotifications')
      .withIndex('by_read', (q) => q.eq('read', false))
      .collect()

    // Group by type
    const counts = {
      total: unreadNotifications.length,
      security_alert: 0,
      new_application: 0,
      flagged_content: 0,
      user_report: 0,
      system_alert: 0,
      high_severity: 0,
    }

    for (const n of unreadNotifications) {
      counts[n.type as keyof typeof counts]++
      if (n.severity === 'high') counts.high_severity++
    }

    return counts
  },
})

/**
 * Get notification by ID
 * Accessible by admin and superadmin
 */
export const get = query({
  args: { id: v.id('adminNotifications') },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')
    return ctx.db.get(args.id)
  },
})

// ============================================================================
// Mutations
// ============================================================================

/**
 * Mark a notification as read
 * Accessible by admin and superadmin
 */
export const markAsRead = mutation({
  args: { id: v.id('adminNotifications') },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const notification = await ctx.db.get(args.id)
    if (!notification) {
      throw new Error('Notification not found')
    }

    if (notification.read) {
      return { success: true, alreadyRead: true }
    }

    await ctx.db.patch(args.id, {
      read: true,
      readAt: Date.now(),
      readBy: admin._id,
    })

    return { success: true }
  },
})

/**
 * Mark all notifications as read
 * Accessible by admin and superadmin
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await assertRole(ctx, 'admin')

    const unreadNotifications = await ctx.db
      .query('adminNotifications')
      .withIndex('by_read', (q) => q.eq('read', false))
      .collect()

    const now = Date.now()

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
        readBy: admin._id,
      })
    }

    return { success: true, count: unreadNotifications.length }
  },
})

/**
 * Delete a notification
 * Accessible by admin and superadmin
 */
export const remove = mutation({
  args: { id: v.id('adminNotifications') },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const notification = await ctx.db.get(args.id)
    if (!notification) {
      throw new Error('Notification not found')
    }

    await ctx.db.delete(args.id)
    return { success: true }
  },
})

/**
 * Clear all read notifications older than a certain age
 * Accessible by superadmin only
 */
export const clearOldNotifications = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin')

    const days = args.olderThanDays || 30
    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000

    const oldNotifications = await ctx.db
      .query('adminNotifications')
      .withIndex('by_read', (q) => q.eq('read', true))
      .filter((q) => q.lt(q.field('createdAt'), cutoffDate))
      .collect()

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id)
    }

    return { success: true, deleted: oldNotifications.length }
  },
})

// ============================================================================
// Internal Mutations (for use by other modules)
// ============================================================================

/**
 * Create an admin notification
 * Used internally by other modules to trigger notifications
 */
export const createNotification = internalMutation({
  args: {
    type: v.union(
      v.literal('security_alert'),
      v.literal('new_application'),
      v.literal('flagged_content'),
      v.literal('user_report'),
      v.literal('system_alert')
    ),
    title: v.string(),
    message: v.string(),
    severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const notificationId = await ctx.db.insert('adminNotifications', {
      type: args.type,
      title: args.title,
      message: args.message,
      severity: args.severity,
      targetType: args.targetType,
      targetId: args.targetId,
      metadata: args.metadata,
      read: false,
      emailSent: false,
      createdAt: now,
    })

    return { notificationId }
  },
})

/**
 * Mark email as sent for a notification
 */
export const markEmailSent = internalMutation({
  args: { id: v.id('adminNotifications') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      emailSent: true,
      emailSentAt: Date.now(),
    })
  },
})

// ============================================================================
// Helper Functions for Creating Common Notifications
// ============================================================================

/**
 * Create a security alert notification
 */
export const createSecurityAlert = internalMutation({
  args: {
    title: v.string(),
    message: v.string(),
    severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    return ctx.db.insert('adminNotifications', {
      type: 'security_alert',
      title: args.title,
      message: args.message,
      severity: args.severity,
      metadata: args.metadata,
      read: false,
      emailSent: false,
      createdAt: now,
    })
  },
})

/**
 * Create a new application notification
 */
export const createApplicationNotification = internalMutation({
  args: {
    applicationId: v.string(),
    applicationType: v.string(),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    return ctx.db.insert('adminNotifications', {
      type: 'new_application',
      title: `New ${args.applicationType} application`,
      message: `${args.companyName} has submitted a ${args.applicationType} application.`,
      severity: 'medium',
      targetType: 'application',
      targetId: args.applicationId,
      metadata: {
        applicationType: args.applicationType,
        companyName: args.companyName,
      },
      read: false,
      emailSent: false,
      createdAt: now,
    })
  },
})

/**
 * Create a flagged content notification
 */
export const createFlaggedContentNotification = internalMutation({
  args: {
    eventId: v.string(),
    eventTitle: v.string(),
    reason: v.string(),
    severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    flaggedByName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    return ctx.db.insert('adminNotifications', {
      type: 'flagged_content',
      title: `Event flagged: ${args.eventTitle}`,
      message: `Flagged by ${args.flaggedByName}. Reason: ${args.reason}`,
      severity: args.severity,
      targetType: 'event',
      targetId: args.eventId,
      metadata: {
        eventTitle: args.eventTitle,
        reason: args.reason,
        flaggedBy: args.flaggedByName,
      },
      read: false,
      emailSent: false,
      createdAt: now,
    })
  },
})
