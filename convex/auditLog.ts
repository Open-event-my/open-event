/**
 * Audit Logging
 *
 * Comprehensive audit trail for security-sensitive actions.
 * Tracks who did what, when, and from where.
 */

import { v } from 'convex/values'
import { query, internalMutation, internalQuery } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { getCurrentUser } from './lib/auth'
import { AppError, ErrorCodes } from './lib/errors'

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  // Authentication
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'signup'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'email_verified'
  // User Management
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'role_changed'
  // Events
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'event_published'
  // Vendors/Sponsors
  | 'vendor_approved'
  | 'vendor_rejected'
  | 'sponsor_approved'
  | 'sponsor_rejected'
  // API
  | 'api_key_created'
  | 'api_key_revoked'
  | 'api_request'
  // Admin
  | 'admin_action'
  | 'settings_changed'
  // Security
  | 'rate_limited'
  | 'account_locked'
  | 'suspicious_activity'

export type AuditResource =
  | 'user'
  | 'event'
  | 'vendor'
  | 'sponsor'
  | 'api_key'
  | 'webhook'
  | 'settings'
  | 'auth'

export interface AuditLogEntry {
  userId?: Id<'users'>
  userEmail?: string
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  endpoint?: string
  metadata?: Record<string, unknown>
  status: 'success' | 'failure' | 'blocked'
  errorMessage?: string
}

// ============================================================================
// Convex Functions
// ============================================================================

/**
 * Create an audit log entry
 */
export const log = internalMutation({
  args: {
    userId: v.optional(v.id('users')),
    userEmail: v.optional(v.string()),
    action: v.string(),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    metadata: v.optional(v.any()),
    status: v.union(v.literal('success'), v.literal('failure'), v.literal('blocked')),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('auditLogs', {
      ...args,
      createdAt: Date.now(),
    })
  },
})

/**
 * Query audit logs for a specific user
 */
export const getByUser = internalQuery({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    return ctx.db
      .query('auditLogs')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)
  },
})

/**
 * Query audit logs for a specific action type
 */
export const getByAction = internalQuery({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    let query = ctx.db
      .query('auditLogs')
      .withIndex('by_action', (q) => q.eq('action', args.action))
      .order('desc')

    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field('createdAt'), args.startDate!))
    }

    return query.take(limit)
  },
})

/**
 * Query audit logs for a specific resource
 */
export const getByResource = internalQuery({
  args: {
    resource: v.string(),
    resourceId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100

    if (args.resourceId) {
      return ctx.db
        .query('auditLogs')
        .withIndex('by_resource', (q) =>
          q.eq('resource', args.resource).eq('resourceId', args.resourceId)
        )
        .order('desc')
        .take(limit)
    }

    return ctx.db
      .query('auditLogs')
      .withIndex('by_resource', (q) => q.eq('resource', args.resource))
      .order('desc')
      .take(limit)
  },
})

/**
 * Get recent security events (failures, blocks, suspicious activity)
 */
export const getSecurityEvents = internalQuery({
  args: {
    limit: v.optional(v.number()),
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100
    const hoursBack = args.hoursBack || 24
    const startTime = Date.now() - hoursBack * 60 * 60 * 1000

    // Get failures and blocks
    const events = await ctx.db
      .query('auditLogs')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('createdAt'), startTime),
          q.or(q.eq(q.field('status'), 'failure'), q.eq(q.field('status'), 'blocked'))
        )
      )
      .order('desc')
      .take(limit)

    return events
  },
})

/**
 * Clean up old audit logs (keep 90 days by default)
 */
export const cleanupOldLogs = internalMutation({
  args: {
    daysToKeep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysToKeep = args.daysToKeep || 90
    const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000

    const oldLogs = await ctx.db
      .query('auditLogs')
      .withIndex('by_date')
      .filter((q) => q.lt(q.field('createdAt'), cutoffDate))
      .take(1000) // Process in batches

    for (const log of oldLogs) {
      await ctx.db.delete(log._id)
    }

    return { deleted: oldLogs.length }
  },
})

// ============================================================================
// Admin Queries (require admin role)
// ============================================================================

/**
 * List all audit logs (admin only)
 */
export const listLogs = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    status: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      throw new AppError('Admin access required', ErrorCodes.FORBIDDEN, 403)
    }

    const limit = args.limit || 100
    let logs = await ctx.db
      .query('auditLogs')
      .withIndex('by_date')
      .order('desc')
      .take(limit * 2)

    // Apply filters
    if (args.action) {
      logs = logs.filter((log) => log.action === args.action)
    }
    if (args.status) {
      logs = logs.filter((log) => log.status === args.status)
    }
    if (args.startDate) {
      logs = logs.filter((log) => log.createdAt >= args.startDate!)
    }
    if (args.endDate) {
      logs = logs.filter((log) => log.createdAt <= args.endDate!)
    }

    return logs.slice(0, limit)
  },
})

/**
 * Get audit log statistics (admin only)
 */
export const getStats = query({
  args: {
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      throw new AppError('Admin access required', ErrorCodes.FORBIDDEN, 403)
    }

    const hoursBack = args.hoursBack || 24
    const startTime = Date.now() - hoursBack * 60 * 60 * 1000

    const recentLogs = await ctx.db
      .query('auditLogs')
      .withIndex('by_date')
      .filter((q) => q.gte(q.field('createdAt'), startTime))
      .collect()

    const stats = {
      total: recentLogs.length,
      success: recentLogs.filter((l) => l.status === 'success').length,
      failure: recentLogs.filter((l) => l.status === 'failure').length,
      blocked: recentLogs.filter((l) => l.status === 'blocked').length,
      byAction: {} as Record<string, number>,
      byResource: {} as Record<string, number>,
    }

    for (const log of recentLogs) {
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1
      stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1
    }

    return stats
  },
})

/**
 * Get security events for admin dashboard (admin only)
 */
export const getSecurityEventsAdmin = query({
  args: {
    limit: v.optional(v.number()),
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      throw new AppError('Admin access required', ErrorCodes.FORBIDDEN, 403)
    }

    const limit = args.limit || 50
    const hoursBack = args.hoursBack || 24
    const startTime = Date.now() - hoursBack * 60 * 60 * 1000

    const events = await ctx.db
      .query('auditLogs')
      .withIndex('by_date')
      .filter((q) =>
        q.and(
          q.gte(q.field('createdAt'), startTime),
          q.or(q.eq(q.field('status'), 'failure'), q.eq(q.field('status'), 'blocked'))
        )
      )
      .order('desc')
      .take(limit)

    return events
  },
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string | undefined {
  // Try various headers in order of preference
  const headers = [
    'CF-Connecting-IP', // Cloudflare
    'X-Real-IP', // Nginx
    'X-Forwarded-For', // Standard proxy header
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first
      return value.split(',')[0].trim()
    }
  }

  return undefined
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('User-Agent') || undefined
}
