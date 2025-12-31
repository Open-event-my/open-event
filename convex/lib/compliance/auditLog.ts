/**
 * Audit Logger Service
 *
 * Comprehensive audit logging for compliance and security.
 * Tracks all data operations and admin actions with full context.
 *
 * Requirements: 3.5, 3.10
 */

import { v } from 'convex/values'
import { mutation, internalMutation } from '../../_generated/server'
import type { ActionCtx } from '../../_generated/server'
import type { Id, Doc } from '../../_generated/dataModel'
import { internal } from '../../_generated/api'

// ============================================================================
// Types
// ============================================================================

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'export'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'signup'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'email_verified'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'role_changed'
  | 'event_published'
  | 'vendor_approved'
  | 'vendor_rejected'
  | 'sponsor_approved'
  | 'sponsor_rejected'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'admin_action'
  | 'settings_changed'
  | 'rate_limited'
  | 'account_locked'

export interface AuditEntry {
  userId: string
  action: AuditAction
  resource: string
  resourceId: string
  timestamp?: number
  ipAddress?: string
  userAgent?: string
  changes?: Record<string, { old: unknown; new: unknown }>
}

export interface AdminAuditEntry extends AuditEntry {
  adminRole?: string
  impactedUsers?: string[]
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

// ============================================================================
// Audit Logger Class
// ============================================================================

/**
 * AuditLogger - Service for creating audit trail entries
 *
 * This class provides methods to log all data operations and admin actions
 * with full context for compliance and security auditing.
 */
export class AuditLogger {
  /**
   * Log a standard audit entry
   *
   * @param entry - The audit entry to log
   * @returns Promise that resolves when the entry is logged
   */
  static async log(ctx: ActionCtx, entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
    await ctx.runMutation(internal.lib.compliance.auditLog.logInternal, {
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      changes: entry.changes,
    })
  }

  /**
   * Log an admin action with enhanced detail
   *
   * @param entry - The admin audit entry to log
   * @returns Promise that resolves when the entry is logged
   */
  static async logAdminAction(
    ctx: ActionCtx,
    entry: Omit<AdminAuditEntry, 'timestamp'>
  ): Promise<void> {
    await ctx.runMutation(internal.lib.compliance.auditLog.logAdminActionInternal, {
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      changes: entry.changes,
      adminRole: entry.adminRole,
      impactedUsers: entry.impactedUsers,
      severity: entry.severity,
    })
  }

  /**
   * Query audit logs for a specific user
   *
   * @param ctx - Convex context
   * @param filters - Filter criteria
   * @param limit - Maximum number of entries to return
   * @returns Array of audit log entries
   */
  static async query(
    ctx: ActionCtx,
    filters: Partial<AuditEntry>,
    limit: number = 100
  ): Promise<Doc<'auditLogs'>[]> {
    // Use the existing auditLog queries
    if (filters.userId) {
      return ctx.runQuery(internal.auditLog.getByUser, {
        userId: filters.userId as Id<'users'>,
        limit,
      })
    }

    if (filters.action) {
      return ctx.runQuery(internal.auditLog.getByAction, {
        action: filters.action,
        limit,
      })
    }

    if (filters.resource) {
      return ctx.runQuery(internal.auditLog.getByResource, {
        resource: filters.resource,
        resourceId: filters.resourceId,
        limit,
      })
    }

    return []
  }
}

// ============================================================================
// Internal Mutations
// ============================================================================

/**
 * Internal mutation to log a standard audit entry
 */
export const logInternal = internalMutation({
  args: {
    userId: v.string(),
    action: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    changes: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Convert userId string to Id<'users'> if it's a valid ID
    let userIdTyped: Id<'users'> | undefined
    try {
      userIdTyped = args.userId as Id<'users'>
    } catch {
      userIdTyped = undefined
    }

    await ctx.db.insert('auditLogs', {
      userId: userIdTyped,
      userEmail: undefined,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: {
        changes: args.changes,
      },
      status: 'success',
      createdAt: Date.now(),
    })
  },
})

/**
 * Internal mutation to log an admin action with enhanced detail
 */
export const logAdminActionInternal = internalMutation({
  args: {
    userId: v.string(),
    action: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    changes: v.optional(v.any()),
    adminRole: v.optional(v.string()),
    impactedUsers: v.optional(v.array(v.string())),
    severity: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('critical'))
    ),
  },
  handler: async (ctx, args) => {
    // Convert userId string to Id<'users'> if it's a valid ID
    let userIdTyped: Id<'users'> | undefined
    try {
      userIdTyped = args.userId as Id<'users'>
    } catch {
      userIdTyped = undefined
    }

    // Get user email if possible
    let userEmail: string | undefined
    if (userIdTyped) {
      const user = await ctx.db.get(userIdTyped)
      userEmail = user?.email
    }

    await ctx.db.insert('auditLogs', {
      userId: userIdTyped,
      userEmail,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: {
        changes: args.changes,
        adminRole: args.adminRole,
        impactedUsers: args.impactedUsers,
        severity: args.severity,
        isAdminAction: true,
      },
      status: 'success',
      createdAt: Date.now(),
    })
  },
})

// ============================================================================
// Public Mutations (for use in other modules)
// ============================================================================

/**
 * Log a data operation (create, read, update, delete)
 */
export const logDataOperation = mutation({
  args: {
    action: v.union(
      v.literal('create'),
      v.literal('read'),
      v.literal('update'),
      v.literal('delete')
    ),
    resource: v.string(),
    resourceId: v.string(),
    changes: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return // Don't log if no user identity
    }

    await ctx.runMutation(internal.lib.compliance.auditLog.logInternal, {
      userId: identity.subject,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      changes: args.changes,
    })
  },
})

/**
 * Log an admin action
 */
export const logAdminActionPublic = mutation({
  args: {
    action: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    changes: v.optional(v.any()),
    impactedUsers: v.optional(v.array(v.string())),
    severity: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('critical'))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Authentication required')
    }

    // Get user to check role
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first()

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      throw new Error('Admin access required')
    }

    await ctx.runMutation(internal.lib.compliance.auditLog.logAdminActionInternal, {
      userId: user._id,
      action: args.action,
      resource: args.resource,
      resourceId: args.resourceId,
      changes: args.changes,
      adminRole: user.role,
      impactedUsers: args.impactedUsers,
      severity: args.severity,
    })
  },
})
