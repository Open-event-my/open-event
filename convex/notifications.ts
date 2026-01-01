import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { requireAuth, getCurrentUser } from './lib/auth'
import { Resend } from 'resend'
import { getNotificationEmailTemplate } from './lib/notificationEmails'
import { logger } from './lib/monitoring/logger'

// Lazy initialize Resend (API key from environment)
function getResendClient() {
  const apiKey = process.env.AUTH_RESEND_KEY
  if (!apiKey) {
    throw new Error('AUTH_RESEND_KEY environment variable is not set')
  }
  return new Resend(apiKey)
}

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'Open Event <noreply@openevent.com>'

/**
 * Create a new notification for a user
 */
export const create = mutation({
  args: {
    userId: v.id('users'),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    eventId: v.optional(v.id('events')),
    taskId: v.optional(v.id('tasks')),
    applicationId: v.optional(v.id('vendorApplications')),
    actionUrl: v.optional(v.string()),
    actionLabel: v.optional(v.string()),
    sendEmail: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, sendEmail, ...notificationData } = args

    // Create the notification
    const notificationId = await ctx.db.insert('notifications', {
      userId,
      ...notificationData,
      read: false,
      emailSent: false,
      pushSent: false,
      createdAt: Date.now(),
    })

    // Send email notification if requested
    if (sendEmail) {
      await ctx.scheduler.runAfter(0, internal.notifications.sendEmailNotification, {
        notificationId,
      })
    }

    return notificationId
  },
})

/**
 * Create a test notification for the current user (for testing)
 */
export const createTestNotification = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const testTypes = [
      {
        type: 'vendor_application',
        title: 'New Vendor Application',
        message:
          'Test Vendor Co. has applied to be a vendor for your event "Tech Conference 2025".',
        actionUrl: '/dashboard',
        actionLabel: 'View Application',
      },
      {
        type: 'task_deadline',
        title: 'Task Deadline Approaching',
        message: 'Your task "Finalize venue booking" is due in 2 days.',
        actionUrl: '/dashboard',
        actionLabel: 'View Task',
      },
      {
        type: 'event_published',
        title: 'Event Published Successfully',
        message: 'Your event "Summer Music Festival" has been published and is now live!',
        actionUrl: '/dashboard',
        actionLabel: 'View Event',
      },
    ]

    const randomNotification = testTypes[Math.floor(Math.random() * testTypes.length)]

    return await ctx.db.insert('notifications', {
      userId,
      ...randomNotification,
      read: false,
      emailSent: false,
      pushSent: false,
      createdAt: Date.now(),
    })
  },
})

/**
 * Get all notifications for the authenticated user
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const { limit = 50, unreadOnly = false } = args

    // Query notifications
    let notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit)

    // Filter to unread only if requested
    if (unreadOnly) {
      notifications = notifications.filter((n) => !n.read)
    }

    return notifications
  },
})

/**
 * Get unread notification count for the authenticated user
 * Returns 0 if user is not authenticated (graceful handling for TopBar)
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    // Use getCurrentUser to gracefully handle unauthenticated users
    const userId = await getCurrentUser(ctx)
      .then((u) => u?._id)
      .catch(() => null)
    if (!userId) {
      return 0
    }

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', userId).eq('read', false))
      .collect()

    return notifications.length
  },
})

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const notification = await ctx.db.get(args.notificationId)
    if (!notification) {
      throw new Error('Notification not found')
    }

    // Verify ownership
    if (notification.userId !== userId) {
      throw new Error('Unauthorized')
    }

    // Update notification
    await ctx.db.patch(args.notificationId, {
      read: true,
      readAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Mark all notifications as read for the authenticated user
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    // Get all unread notifications
    const unreadNotifications = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', userId).eq('read', false))
      .collect()

    // Mark each as read
    const now = Date.now()
    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        read: true,
        readAt: now,
      })
    }

    return { count: unreadNotifications.length }
  },
})

/**
 * Delete a notification
 */
export const remove = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const notification = await ctx.db.get(args.notificationId)
    if (!notification) {
      throw new Error('Notification not found')
    }

    // Verify ownership
    if (notification.userId !== userId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.delete(args.notificationId)

    return { success: true }
  },
})

/**
 * Delete all notifications for the authenticated user
 */
export const deleteAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    // Get all notifications for user
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    // Delete each notification
    for (const notification of notifications) {
      await ctx.db.delete(notification._id)
    }

    return { count: notifications.length }
  },
})

/**
 * Helper function to create a notification (can be called from other mutations)
 */
export const createNotification = async (
  ctx: { db: { insert: (table: string, data: Record<string, unknown>) => Promise<string> } },
  data: {
    userId: string
    type: string
    title: string
    message: string
    eventId?: string
    taskId?: string
    applicationId?: string
    actionUrl?: string
    actionLabel?: string
  }
) => {
  return await ctx.db.insert('notifications', {
    ...data,
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

// ============================================================================
// INTERNAL QUERIES & MUTATIONS - For email sending
// ============================================================================

export const getNotificationForEmail = internalQuery({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.notificationId)
  },
})

export const getUserForNotification = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const markEmailSent = internalMutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      emailSent: true,
      emailSentAt: Date.now(),
    })
  },
})

/**
 * Check if user has email notifications enabled for a specific type
 */
export const shouldSendEmail = internalQuery({
  args: {
    userId: v.id('users'),
    notificationType: v.string(),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    // If no preferences exist, default to enabled
    if (!preferences) {
      return true
    }

    // Check master email switch
    if (!preferences.emailEnabled) {
      return false
    }

    // Map notification type to preference field
    const typeToField: Record<string, string> = {
      vendor_application: 'emailVendorApplications',
      sponsor_application: 'emailSponsorApplications',
      event_reminder: 'emailEventReminders',
      task_deadline: 'emailTaskDeadlines',
      budget_threshold: 'emailBudgetAlerts',
    }

    const field = typeToField[args.notificationType]
    if (!field) {
      // Unknown type, default to enabled
      return true
    }

    return (preferences as Record<string, unknown>)[field] !== false
  },
})

// ============================================================================
// ACTIONS - Email sending
// ============================================================================

/**
 * Send email notification (internal action, scheduled by mutation)
 */
export const sendEmailNotification = internalMutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    // Get notification and user
    const notification = await ctx.runQuery(internal.notifications.getNotificationForEmail, {
      notificationId: args.notificationId,
    })

    if (!notification) {
      logger.error('Notification not found', undefined, {
        notificationId: args.notificationId,
      })
      return
    }

    const user = await ctx.runQuery(internal.notifications.getUserForNotification, {
      userId: notification.userId,
    })

    if (!user || !user.email) {
      logger.error('User not found or has no email', undefined, {
        userId: notification.userId,
      })
      return
    }

    // Check user notification preferences
    const shouldSend = await ctx.runQuery(internal.notifications.shouldSendEmail, {
      userId: notification.userId,
      notificationType: notification.type,
    })

    if (!shouldSend) {
      logger.debug('Email notification skipped due to user preferences', {
        notificationType: notification.type,
      })
      return
    }

    // Generate email template
    const emailTemplate = getNotificationEmailTemplate(notification.type, {
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
    })

    // Send email using Resend
    try {
      const resend = getResendClient()
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      })

      // Mark email as sent
      await ctx.runMutation(internal.notifications.markEmailSent, {
        notificationId: args.notificationId,
      })

      logger.info('Email notification sent successfully', {
        userEmail: user.email,
        notificationType: notification.type,
      })
    } catch (error) {
      logger.error('Failed to send email notification', error)
      // Don't throw error - notification is still created in-app
    }
  },
})
