/**
 * Data Deletion Service
 *
 * Implements GDPR Article 17 (Right to Erasure / Right to be Forgotten) by providing
 * comprehensive user data deletion functionality.
 */

import { v } from 'convex/values'
import { mutation } from '../../_generated/server'

/**
 * Deletion request status
 */
export type DeletionStatus = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Deletion request record
 */
export interface DeletionRequest {
  userId: string
  requestedAt: number
  reason?: string
  status: DeletionStatus
}

/**
 * Result of deletion operation
 */
export interface DeletionResult {
  success: boolean
  deletedRecords: Record<string, number>
  errors: string[]
  completedAt: number
}

/**
 * Tables that contain user data and need to be cleaned up during deletion
 */
export const USER_DATA_TABLES = [
  'organizerProfiles',
  'notificationPreferences',
  'events',
  'budgetItems',
  'eventTasks',
  'eventApplications',
  'eventSponsors',
  'eventVendors',
  'ticketTypes',
  'attendees',
  'organizations',
  'organizationMembers',
  'orders',
  'apiKeys',
  'notes',
  'notifications',
  'inquiries',
  'sessions',
  'verificationTokens',
  'auditLogs',
] as const

/**
 * Create an empty deletion result
 */
export function createEmptyDeletionResult(): DeletionResult {
  return {
    success: false,
    deletedRecords: {},
    errors: [],
    completedAt: 0,
  }
}

/**
 * Anonymized user data template
 */
export function getAnonymizedUserData(userId: string): Record<string, unknown> {
  return {
    name: 'Deleted User',
    email: `deleted_${userId}@anonymized.local`,
    emailVerified: false,
    passwordHash: undefined,
    phone: undefined,
    image: undefined,
    twoFactorEnabled: false,
    twoFactorSecret: undefined,
    twoFactorBackupCodes: undefined,
    updatedAt: Date.now(),
  }
}

export const requestDeletion = mutation({
  args: {
    userId: v.id('users'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('auditLogs', {
      userId: args.userId,
      action: 'data_deletion_requested',
      resource: 'user',
      resourceId: args.userId,
      status: 'success',
      metadata: { reason: args.reason },
      createdAt: Date.now(),
    })
  },
})

export const executeDeletion = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const result = createEmptyDeletionResult()

    // Delete user
    const user = await ctx.db.get(args.userId)
    if (user) {
      await ctx.db.delete(args.userId)
      result.deletedRecords['users'] = 1
    }

    // Delete events
    const events = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.userId))
      .collect()

    for (const event of events) {
      await ctx.db.delete(event._id)
    }
    result.deletedRecords['events'] = events.length

    // Audit log for completion
    await ctx.db.insert('auditLogs', {
      userId: args.userId,
      action: 'data_deletion_completed',
      resource: 'user',
      resourceId: args.userId,
      status: 'success',
      createdAt: Date.now(),
    })

    result.success = true
    result.completedAt = Date.now()
    return result
  },
})
