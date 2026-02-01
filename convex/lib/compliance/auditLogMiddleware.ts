/**
 * Audit Logging Middleware
 *
 * Provides middleware to automatically log all mutation operations.
 * Wraps mutations to capture audit trail information.
 *
 * Requirements: 3.5, 3.10
 */

import { mutation } from '../../_generated/server'
import type { MutationCtx } from '../../_generated/server'
import { internal } from '../../_generated/api'
import type { Id, TableNames } from '../../_generated/dataModel'

// ============================================================================
// Types
// ============================================================================

export interface AuditLogOptions {
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'admin_action'
  resource: string
  skipAudit?: boolean // Allow skipping audit for specific operations
  captureChanges?: boolean // Whether to capture before/after values
}

// ============================================================================
// Middleware Function
// ============================================================================

/**
 * Wrap a mutation with automatic audit logging
 *
 * @param options - Audit logging options
 * @param handler - The mutation handler function
 * @returns Wrapped mutation with audit logging
 *
 * @example
 * ```typescript
 * export const updateEvent = withAuditLog(
 *   { action: 'update', resource: 'event', captureChanges: true },
 *   async (ctx, args) => {
 *     // Your mutation logic here
 *     await ctx.db.patch(args.id, { title: args.title });
 *     return { success: true };
 *   }
 * );
 * ```
 */
export function withAuditLog<Args extends Record<string, unknown>, Output>(
  options: AuditLogOptions,
  handler: (ctx: MutationCtx, args: Args) => Promise<Output>
) {
  return async (ctx: MutationCtx, args: Args): Promise<Output> => {
    // Skip audit if explicitly disabled
    if (options.skipAudit) {
      return handler(ctx, args)
    }

    // Get user identity
    const identity = await ctx.auth.getUserIdentity()

    // Capture before state if needed
    let beforeState: Record<string, unknown> | null = undefined as unknown as Record<
      string,
      unknown
    > | null
    if (options.captureChanges && options.action === 'update' && 'id' in args) {
      try {
        beforeState = await ctx.db.get(args.id as Id<TableNames>)
      } catch {
        // Ignore errors getting before state
      }
    }

    // Execute the mutation
    const result = await handler(ctx, args)

    // Capture after state if needed
    let afterState: Record<string, unknown> | null = undefined as unknown as Record<
      string,
      unknown
    > | null
    let changes: Record<string, { old: unknown; new: unknown }> | undefined

    if (options.captureChanges && options.action === 'update' && 'id' in args) {
      try {
        afterState = await ctx.db.get(args.id as Id<TableNames>)

        // Calculate changes
        if (beforeState && afterState) {
          changes = {}
          for (const key of Object.keys(afterState)) {
            if (key !== '_id' && key !== '_creationTime' && beforeState[key] !== afterState[key]) {
              changes[key] = {
                old: beforeState[key],
                new: afterState[key],
              }
            }
          }
        }
      } catch {
        // Ignore errors getting after state
      }
    }

    // Determine resource ID
    let resourceId: string | undefined
    if ('id' in args) {
      resourceId = args.id as string
    } else if (typeof result === 'object' && result !== null && 'id' in result) {
      resourceId = (result as { id: string }).id
    } else if (typeof result === 'string') {
      resourceId = result
    }

    // Log the audit entry
    if (identity) {
      try {
        await ctx.runMutation(internal.lib.compliance.auditLog.logInternal, {
          userId: identity.subject,
          action: options.action,
          resource: options.resource,
          resourceId: resourceId || 'unknown',
          changes,
        })
      } catch (error) {
        // Don't fail the mutation if audit logging fails
        console.error('Failed to log audit entry:', error)
      }
    }

    return result
  }
}

/**
 * Wrap an admin mutation with enhanced audit logging
 *
 * @param options - Audit logging options
 * @param handler - The mutation handler function
 * @returns Wrapped mutation with enhanced admin audit logging
 *
 * @example
 * ```typescript
 * export const suspendUser = withAdminAuditLog(
 *   { action: 'admin_action', resource: 'user', severity: 'high' },
 *   async (ctx, args) => {
 *     // Your admin mutation logic here
 *     await ctx.db.patch(args.userId, { status: 'suspended' });
 *     return { success: true };
 *   }
 * );
 * ```
 */
export function withAdminAuditLog<Args extends Record<string, unknown>, Output>(
  options: AuditLogOptions & {
    severity?: 'low' | 'medium' | 'high' | 'critical'
    getImpactedUsers?: (args: Args) => string[]
  },
  handler: (ctx: MutationCtx, args: Args) => Promise<Output>
) {
  return async (ctx: MutationCtx, args: Args): Promise<Output> => {
    // Get user identity
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

    // Capture before state if needed
    let beforeState: Record<string, unknown> | null = undefined as unknown as Record<
      string,
      unknown
    > | null
    if (options.captureChanges && options.action === 'update' && 'id' in args) {
      try {
        beforeState = await ctx.db.get(args.id as Id<TableNames>)
      } catch {
        // Ignore errors
      }
    }

    // Execute the mutation
    const result = await handler(ctx, args)

    // Capture after state and calculate changes
    let afterState: Record<string, unknown> | null = undefined as unknown as Record<
      string,
      unknown
    > | null
    let changes: Record<string, { old: unknown; new: unknown }> | undefined

    if (options.captureChanges && options.action === 'update' && 'id' in args) {
      try {
        afterState = await ctx.db.get(args.id as Id<TableNames>)

        if (beforeState && afterState) {
          changes = {}
          for (const key of Object.keys(afterState)) {
            if (key !== '_id' && key !== '_creationTime' && beforeState[key] !== afterState[key]) {
              changes[key] = {
                old: beforeState[key],
                new: afterState[key],
              }
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    // Determine resource ID
    let resourceId: string | undefined
    if ('id' in args) {
      resourceId = args.id as string
    } else if ('userId' in args) {
      resourceId = args.userId as string
    } else if (typeof result === 'object' && result !== null && 'id' in result) {
      resourceId = (result as { id: string }).id
    } else if (typeof result === 'string') {
      resourceId = result
    }

    // Get impacted users if function provided
    const impactedUsers = options.getImpactedUsers ? options.getImpactedUsers(args) : undefined

    // Log the admin action
    try {
      await ctx.runMutation(internal.lib.compliance.auditLog.logAdminActionInternal, {
        userId: user._id,
        action: options.action,
        resource: options.resource,
        resourceId: resourceId || 'unknown',
        changes,
        adminRole: user.role,
        impactedUsers,
        severity: options.severity,
      })
    } catch (error) {
      // Don't fail the mutation if audit logging fails
      console.error('Failed to log admin audit entry:', error)
    }

    return result
  }
}

/**
 * Helper to create an audited mutation
 *
 * This is a convenience wrapper that combines mutation definition with audit logging.
 *
 * @example
 * ```typescript
 * export const updateEvent = auditedMutation({
 *   audit: { action: 'update', resource: 'event', captureChanges: true },
 *   args: {
 *     id: v.id('events'),
 *     title: v.string(),
 *   },
 *   handler: async (ctx, args) => {
 *     await ctx.db.patch(args.id, { title: args.title });
 *     return { success: true };
 *   },
 * });
 * ```
 */
export function auditedMutation<
  Args extends Record<string, unknown>,
  Output,
  ArgsValidator extends Record<string, unknown>,
>(config: {
  audit: AuditLogOptions
  args: ArgsValidator
  handler: (ctx: MutationCtx, args: Args) => Promise<Output>
}) {
  return mutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: config.args as unknown as any,
    handler: withAuditLog(config.audit, config.handler),
  })
}

/**
 * Helper to create an audited admin mutation
 *
 * @example
 * ```typescript
 * export const suspendUser = auditedAdminMutation({
 *   audit: {
 *     action: 'admin_action',
 *     resource: 'user',
 *     severity: 'high',
 *     getImpactedUsers: (args) => [args.userId]
 *   },
 *   args: {
 *     userId: v.id('users'),
 *     reason: v.string(),
 *   },
 *   handler: async (ctx, args) => {
 *     await ctx.db.patch(args.userId, {
 *       status: 'suspended',
 *       suspendedReason: args.reason
 *     });
 *     return { success: true };
 *   },
 * });
 * ```
 */
export function auditedAdminMutation<
  Args extends Record<string, unknown>,
  Output,
  ArgsValidator extends Record<string, unknown>,
>(config: {
  audit: AuditLogOptions & {
    severity?: 'low' | 'medium' | 'high' | 'critical'
    getImpactedUsers?: (args: Args) => string[]
  }
  args: ArgsValidator
  handler: (ctx: MutationCtx, args: Args) => Promise<Output>
}) {
  return mutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: config.args as unknown as any,
    handler: withAdminAuditLog(config.audit, config.handler),
  })
}
