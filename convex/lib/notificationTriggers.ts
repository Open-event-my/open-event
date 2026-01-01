/**
 * Notification Triggers
 *
 * Helper functions to create notifications for various events in the system.
 * These should be called from other mutations when relevant actions occur.
 */

import type { Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

export type NotificationContext = {
  db: MutationCtx['db']
  scheduler?: MutationCtx['scheduler']
}

/**
 * Notify when a new vendor application is submitted
 */
export async function notifyNewVendorApplication(
  ctx: NotificationContext,
  params: {
    eventId: Id<'events'>
    vendorName: string
    organizerId: Id<'users'>
  }
) {
  await ctx.db.insert('notifications', {
    userId: params.organizerId,
    type: 'vendor_application',
    title: 'New Vendor Application',
    message: `${params.vendorName} has applied to be a vendor for your event.`,
    eventId: params.eventId,
    actionUrl: `/dashboard/events/${params.eventId}/vendors`,
    actionLabel: 'View Application',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when a new sponsor application is submitted
 */
export async function notifyNewSponsorApplication(
  ctx: NotificationContext,
  params: {
    eventId: Id<'events'>
    sponsorName: string
    organizerId: Id<'users'>
  }
) {
  await ctx.db.insert('notifications', {
    userId: params.organizerId,
    type: 'sponsor_application',
    title: 'New Sponsor Application',
    message: `${params.sponsorName} has applied to sponsor your event.`,
    eventId: params.eventId,
    actionUrl: `/dashboard/events/${params.eventId}/sponsors`,
    actionLabel: 'View Application',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when a task deadline is approaching (1 day before)
 * NOTE: Disabled until tasks table is implemented
 */
export async function notifyTaskDeadlineApproaching(
  ctx: NotificationContext,
  params: {
    // taskId: Id<'tasks'>  // Commented out - tasks table not yet implemented
    taskTitle: string
    eventId: Id<'events'>
    organizerId: Id<'users'>
    dueDate: number
  }
) {
  const daysUntilDue = Math.ceil((params.dueDate - Date.now()) / (1000 * 60 * 60 * 24))

  await ctx.db.insert('notifications', {
    userId: params.organizerId,
    type: 'task_deadline',
    title: 'Task Deadline Approaching',
    message: `"${params.taskTitle}" is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}.`,
    eventId: params.eventId,
    // taskId: params.taskId,  // Commented out - tasks table not yet implemented
    actionUrl: `/dashboard/events/${params.eventId}/tasks`,
    actionLabel: 'View Task',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when an event is starting soon (1 week before)
 */
export async function notifyEventReminder(
  ctx: NotificationContext,
  params: {
    eventId: Id<'events'>
    eventTitle: string
    organizerId: Id<'users'>
    startDate: number
  }
) {
  const daysUntilEvent = Math.ceil((params.startDate - Date.now()) / (1000 * 60 * 60 * 24))

  await ctx.db.insert('notifications', {
    userId: params.organizerId,
    type: 'event_reminder',
    title: 'Event Starting Soon',
    message: `"${params.eventTitle}" starts in ${daysUntilEvent} day${daysUntilEvent === 1 ? '' : 's'}.`,
    eventId: params.eventId,
    actionUrl: `/dashboard/events/${params.eventId}`,
    actionLabel: 'View Event',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when budget threshold is exceeded
 */
export async function notifyBudgetThresholdExceeded(
  ctx: NotificationContext,
  params: {
    eventId: Id<'events'>
    eventTitle: string
    organizerId: Id<'users'>
    budgetUsed: number
    budgetTotal: number
    threshold: number // percentage (e.g., 80 for 80%)
  }
) {
  const percentage = Math.round((params.budgetUsed / params.budgetTotal) * 100)

  await ctx.db.insert('notifications', {
    userId: params.organizerId,
    type: 'budget_threshold',
    title: 'Budget Threshold Exceeded',
    message: `"${params.eventTitle}" has used ${percentage}% of its budget (threshold: ${params.threshold}%).`,
    eventId: params.eventId,
    actionUrl: `/dashboard/events/${params.eventId}/budget`,
    actionLabel: 'View Budget',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when a vendor/sponsor application is approved
 */
export async function notifyApplicationApproved(
  ctx: NotificationContext,
  params: {
    userId: Id<'users'>
    eventTitle: string
    type: 'vendor' | 'sponsor'
  }
) {
  await ctx.db.insert('notifications', {
    userId: params.userId,
    type: 'application_approved',
    title: 'Application Approved',
    message: `Your ${params.type} application for "${params.eventTitle}" has been approved!`,
    actionUrl: `/dashboard`,
    actionLabel: 'View Dashboard',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when a vendor/sponsor application is rejected
 */
export async function notifyApplicationRejected(
  ctx: NotificationContext,
  params: {
    userId: Id<'users'>
    eventTitle: string
    type: 'vendor' | 'sponsor'
    reason?: string
  }
) {
  const message = params.reason
    ? `Your ${params.type} application for "${params.eventTitle}" was not approved. Reason: ${params.reason}`
    : `Your ${params.type} application for "${params.eventTitle}" was not approved.`

  await ctx.db.insert('notifications', {
    userId: params.userId,
    type: 'application_rejected',
    title: 'Application Update',
    message,
    actionUrl: `/dashboard`,
    actionLabel: 'View Dashboard',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when event is published
 */
export async function notifyEventPublished(
  ctx: NotificationContext,
  params: {
    eventId: Id<'events'>
    eventTitle: string
    organizerId: Id<'users'>
  }
) {
  await ctx.db.insert('notifications', {
    userId: params.organizerId,
    type: 'event_published',
    title: 'Event Published',
    message: `"${params.eventTitle}" has been successfully published and is now live!`,
    eventId: params.eventId,
    actionUrl: `/events/${params.eventId}`,
    actionLabel: 'View Event',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}

/**
 * Notify when a team member is invited to an organization
 * (For future multi-tenancy feature)
 */
export async function notifyTeamInvitation(
  ctx: NotificationContext,
  params: {
    userId: Id<'users'>
    organizationName: string
    inviterName: string
  }
) {
  await ctx.db.insert('notifications', {
    userId: params.userId,
    type: 'team_invitation',
    title: 'Team Invitation',
    message: `${params.inviterName} has invited you to join ${params.organizationName}.`,
    actionUrl: `/dashboard/invitations`,
    actionLabel: 'View Invitation',
    read: false,
    emailSent: false,
    pushSent: false,
    createdAt: Date.now(),
  })
}
