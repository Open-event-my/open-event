/**
 * Data Retention Service
 * 
 * Implements automated data retention policies to comply with GDPR Article 5
 * (Storage Limitation Principle) and organizational data governance requirements.
 * 
 * This service:
 * - Defines retention periods for different data types
 * - Automatically identifies data that exceeds retention periods
 * - Provides cleanup functions to delete or anonymize old data
 * - Logs all retention-related actions for audit purposes
 */

import { v } from 'convex/values';
import { mutation, query, internalMutation } from '../../_generated/server';

/**
 * Retention policy configuration
 * Defines how long different types of data should be retained
 */
export interface RetentionPolicy {
  // Data type identifier
  dataType: string;
  
  // Retention period in days
  retentionDays: number;
  
  // Action to take when data exceeds retention period
  action: 'delete' | 'anonymize';
  
  // Description of the policy
  description: string;
}

/**
 * Default retention policies
 * These can be overridden by platform settings
 */
export const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    dataType: 'audit_logs',
    retentionDays: 365, // 1 year
    action: 'delete',
    description: 'Audit logs older than 1 year',
  },
  {
    dataType: 'sessions',
    retentionDays: 90, // 3 months
    action: 'delete',
    description: 'Expired sessions older than 90 days',
  },
  {
    dataType: 'verification_tokens',
    retentionDays: 7, // 1 week
    action: 'delete',
    description: 'Used or expired verification tokens older than 7 days',
  },
  {
    dataType: 'failed_login_attempts',
    retentionDays: 30, // 1 month
    action: 'delete',
    description: 'Failed login attempt records older than 30 days',
  },
  {
    dataType: 'notifications',
    retentionDays: 90, // 3 months
    action: 'delete',
    description: 'Read notifications older than 90 days',
  },
  {
    dataType: 'admin_notifications',
    retentionDays: 180, // 6 months
    action: 'delete',
    description: 'Read admin notifications older than 6 months',
  },
  {
    dataType: 'api_request_logs',
    retentionDays: 90, // 3 months
    action: 'delete',
    description: 'API request logs older than 90 days',
  },
  {
    dataType: 'webhook_deliveries',
    retentionDays: 30, // 1 month
    action: 'delete',
    description: 'Webhook delivery logs older than 30 days',
  },
  {
    dataType: 'moderation_logs',
    retentionDays: 730, // 2 years
    action: 'delete',
    description: 'Moderation logs older than 2 years',
  },
  {
    dataType: 'completed_events',
    retentionDays: 1095, // 3 years
    action: 'anonymize',
    description: 'Completed events older than 3 years',
  },
];

/**
 * Result of a cleanup operation
 */
export interface CleanupResult {
  dataType: string;
  recordsProcessed: number;
  recordsDeleted: number;
  recordsAnonymized: number;
  errors: string[];
  completedAt: number;
}

/**
 * Get retention policies
 * Returns the configured retention policies for the platform
 */
export const getRetentionPolicies = query({
  args: {},
  handler: async (_ctx): Promise<RetentionPolicy[]> => {
    // In the future, this could read from platformSettings
    // For now, return default policies
    return DEFAULT_RETENTION_POLICIES;
  },
});

/**
 * Clean up audit logs
 * Deletes audit logs older than the retention period
 */
async function cleanupAuditLogs(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old audit logs
    const oldLogs = await ctx.db
      .query('auditLogs')
      .withIndex('by_date', (q: any) => q.lt('createdAt', cutoffDate))
      .collect();

    // Delete each log
    for (const log of oldLogs) {
      try {
        await ctx.db.delete(log._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete audit log ${log._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query audit logs: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up expired sessions
 * Deletes sessions older than the retention period
 */
async function cleanupSessions(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old sessions
    const allSessions = await ctx.db.query('sessions').collect();
    const oldSessions = allSessions.filter((session: any) => {
      // Check if session is expired and old enough to delete
      const isExpired =
        (session.accessTokenExpiresAt && session.accessTokenExpiresAt < Date.now()) ||
        (session.expiresAt && session.expiresAt < Date.now());
      const isOld = session.createdAt < cutoffDate;
      return isExpired && isOld;
    });

    // Delete each session
    for (const session of oldSessions) {
      try {
        await ctx.db.delete(session._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete session ${session._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query sessions: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up verification tokens
 * Deletes used or expired verification tokens older than retention period
 */
async function cleanupVerificationTokens(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old used tokens
    const usedTokens = await ctx.db
      .query('verificationTokens')
      .withIndex('by_type_used', (q: any) => q.eq('type', 'email_verification').eq('used', true))
      .collect();

    const oldUsedTokens = usedTokens.filter((token: any) => token.createdAt < cutoffDate);

    // Find old expired tokens
    const allTokens = await ctx.db.query('verificationTokens').collect();
    const oldExpiredTokens = allTokens.filter(
      (token: any) => token.expiresAt < Date.now() && token.createdAt < cutoffDate
    );

    // Combine and deduplicate
    const tokensToDelete = new Map();
    [...oldUsedTokens, ...oldExpiredTokens].forEach((token) => {
      tokensToDelete.set(token._id, token);
    });

    // Delete each token
    for (const token of tokensToDelete.values()) {
      try {
        await ctx.db.delete(token._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete verification token ${token._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query verification tokens: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up failed login attempts
 * Deletes failed login attempt records older than retention period
 */
async function cleanupFailedLoginAttempts(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old failed login records
    const allRecords = await ctx.db.query('failedLoginAttempts').collect();
    const oldRecords = allRecords.filter((record: any) => record.createdAt < cutoffDate);

    // Delete each record
    for (const record of oldRecords) {
      try {
        await ctx.db.delete(record._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete failed login record ${record._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query failed login attempts: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up notifications
 * Deletes read notifications older than retention period
 */
async function cleanupNotifications(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old read notifications
    const allNotifications = await ctx.db.query('notifications').collect();
    const oldReadNotifications = allNotifications.filter(
      (notif: any) => notif.read && notif.createdAt < cutoffDate
    );

    // Delete each notification
    for (const notif of oldReadNotifications) {
      try {
        await ctx.db.delete(notif._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete notification ${notif._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query notifications: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up admin notifications
 * Deletes read admin notifications older than retention period
 */
async function cleanupAdminNotifications(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old read admin notifications
    const readNotifications = await ctx.db
      .query('adminNotifications')
      .withIndex('by_read', (q: any) => q.eq('read', true))
      .collect();

    const oldReadNotifications = readNotifications.filter(
      (notif: any) => notif.createdAt < cutoffDate
    );

    // Delete each notification
    for (const notif of oldReadNotifications) {
      try {
        await ctx.db.delete(notif._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete admin notification ${notif._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query admin notifications: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up API request logs
 * Deletes API request logs older than retention period
 */
async function cleanupApiRequestLogs(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old API request logs
    const oldLogs = await ctx.db
      .query('apiRequestLogs')
      .withIndex('by_date', (q: any) => q.lt('createdAt', cutoffDate))
      .collect();

    // Delete each log
    for (const log of oldLogs) {
      try {
        await ctx.db.delete(log._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete API request log ${log._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query API request logs: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up webhook deliveries
 * Deletes webhook delivery logs older than retention period
 */
async function cleanupWebhookDeliveries(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old webhook deliveries
    const oldDeliveries = await ctx.db
      .query('webhookDeliveries')
      .withIndex('by_date', (q: any) => q.lt('createdAt', cutoffDate))
      .collect();

    // Delete each delivery
    for (const delivery of oldDeliveries) {
      try {
        await ctx.db.delete(delivery._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete webhook delivery ${delivery._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query webhook deliveries: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Clean up moderation logs
 * Deletes moderation logs older than retention period
 */
async function cleanupModerationLogs(
  ctx: any,
  retentionDays: number
): Promise<{ deleted: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find old moderation logs
    const oldLogs = await ctx.db
      .query('moderationLogs')
      .withIndex('by_date', (q: any) => q.lt('createdAt', cutoffDate))
      .collect();

    // Delete each log
    for (const log of oldLogs) {
      try {
        await ctx.db.delete(log._id);
        deleted++;
      } catch (error) {
        errors.push(`Failed to delete moderation log ${log._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query moderation logs: ${error}`);
  }

  return { deleted, errors };
}

/**
 * Anonymize completed events
 * Anonymizes events that have been completed for longer than retention period
 */
async function anonymizeCompletedEvents(
  ctx: any,
  retentionDays: number
): Promise<{ anonymized: number; errors: string[] }> {
  const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const errors: string[] = [];
  let anonymized = 0;

  try {
    // Find old completed events
    const completedEvents = await ctx.db
      .query('events')
      .withIndex('by_status', (q: any) => q.eq('status', 'completed'))
      .collect();

    const oldCompletedEvents = completedEvents.filter((event: any) => {
      // Use endDate if available, otherwise use updatedAt or createdAt
      const completionDate = event.endDate || event.updatedAt || event.createdAt;
      return completionDate < cutoffDate;
    });

    // Anonymize each event
    for (const event of oldCompletedEvents) {
      try {
        await ctx.db.patch(event._id, {
          title: `Event ${event._id}`,
          description: '[Anonymized - Retention Policy]',
          venueName: undefined,
          venueAddress: undefined,
          virtualPlatform: undefined,
          requirements: undefined,
          sponsorBenefits: undefined,
          updatedAt: Date.now(),
        });
        anonymized++;
      } catch (error) {
        errors.push(`Failed to anonymize event ${event._id}: ${error}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to query completed events: ${error}`);
  }

  return { anonymized, errors };
}

/**
 * Internal handler for retention cleanup logic
 * This is the actual implementation that can be called directly
 */
async function executeRetentionCleanupHandler(
  ctx: any,
  args: { dataType: string; retentionDays: number; action: 'delete' | 'anonymize' }
): Promise<CleanupResult> {
  const { dataType, retentionDays, action } = args;

  let recordsDeleted = 0;
  let recordsAnonymized = 0;
  const errors: string[] = [];

  try {
    switch (dataType) {
      case 'audit_logs': {
        const result = await cleanupAuditLogs(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'sessions': {
        const result = await cleanupSessions(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'verification_tokens': {
        const result = await cleanupVerificationTokens(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'failed_login_attempts': {
        const result = await cleanupFailedLoginAttempts(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'notifications': {
        const result = await cleanupNotifications(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'admin_notifications': {
        const result = await cleanupAdminNotifications(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'api_request_logs': {
        const result = await cleanupApiRequestLogs(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'webhook_deliveries': {
        const result = await cleanupWebhookDeliveries(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'moderation_logs': {
        const result = await cleanupModerationLogs(ctx, retentionDays);
        recordsDeleted = result.deleted;
        errors.push(...result.errors);
        break;
      }
      case 'completed_events': {
        const result = await anonymizeCompletedEvents(ctx, retentionDays);
        recordsAnonymized = result.anonymized;
        errors.push(...result.errors);
        break;
      }
      default:
        errors.push(`Unknown data type: ${dataType}`);
    }
  } catch (error) {
    errors.push(`Cleanup failed for ${dataType}: ${error}`);
  }

  const result: CleanupResult = {
    dataType,
    recordsProcessed: recordsDeleted + recordsAnonymized,
    recordsDeleted,
    recordsAnonymized,
    errors,
    completedAt: Date.now(),
  };

  // Log the cleanup operation in audit logs
  await ctx.db.insert('auditLogs', {
    userId: undefined,
    userEmail: 'system',
    action: 'data_retention_cleanup',
    resource: dataType,
    resourceId: undefined,
    ipAddress: undefined,
    userAgent: undefined,
    endpoint: 'executeRetentionCleanup',
    metadata: {
      retentionDays,
      action,
      recordsDeleted,
      recordsAnonymized,
      errors: errors.length > 0 ? errors : undefined,
    },
    status: errors.length === 0 ? 'success' : 'failure',
    createdAt: Date.now(),
  });

  return result;
}

/**
 * Execute retention policy cleanup
 * Runs cleanup for a specific data type based on its retention policy
 */
export const executeRetentionCleanup = internalMutation({
  args: {
    dataType: v.string(),
    retentionDays: v.number(),
    action: v.union(v.literal('delete'), v.literal('anonymize')),
  },
  handler: async (ctx, args): Promise<CleanupResult> => {
    return executeRetentionCleanupHandler(ctx, args);
  },
});

/**
 * Run all retention policies
 * Executes cleanup for all configured retention policies
 * This should be called by a cron job (e.g., daily at 2 AM)
 */
export const runAllRetentionPolicies = internalMutation({
  args: {},
  handler: async (ctx): Promise<CleanupResult[]> => {
    const policies = DEFAULT_RETENTION_POLICIES;
    const results: CleanupResult[] = [];

    for (const policy of policies) {
      try {
        // Execute cleanup directly instead of calling the mutation
        const result = await executeRetentionCleanupHandler(ctx, {
          dataType: policy.dataType,
          retentionDays: policy.retentionDays,
          action: policy.action,
        });
        results.push(result);
      } catch (error) {
        // Log error but continue with other policies
        results.push({
          dataType: policy.dataType,
          recordsProcessed: 0,
          recordsDeleted: 0,
          recordsAnonymized: 0,
          errors: [`Failed to execute policy: ${error}`],
          completedAt: Date.now(),
        });
      }
    }

    return results;
  },
});

/**
 * Manual trigger for retention cleanup (admin only)
 * Allows administrators to manually trigger retention cleanup
 */
export const triggerRetentionCleanup = mutation({
  args: {
    dataType: v.optional(v.string()), // If provided, only clean this data type
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get requesting user
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', identity.email))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Verify admin authorization
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Unauthorized: Only admins can trigger retention cleanup');
    }

    // If specific data type requested, run only that policy
    if (args.dataType) {
      const policy = DEFAULT_RETENTION_POLICIES.find((p) => p.dataType === args.dataType);
      if (!policy) {
        throw new Error(`Unknown data type: ${args.dataType}`);
      }

      const result = await executeRetentionCleanupHandler(ctx, {
        dataType: policy.dataType,
        retentionDays: policy.retentionDays,
        action: policy.action,
      });

      return {
        success: true,
        results: [result],
      };
    }

    // Otherwise, run all policies
    const policies = DEFAULT_RETENTION_POLICIES;
    const results: CleanupResult[] = [];

    for (const policy of policies) {
      try {
        const result = await executeRetentionCleanupHandler(ctx, {
          dataType: policy.dataType,
          retentionDays: policy.retentionDays,
          action: policy.action,
        });
        results.push(result);
      } catch (error) {
        results.push({
          dataType: policy.dataType,
          recordsProcessed: 0,
          recordsDeleted: 0,
          recordsAnonymized: 0,
          errors: [`Failed to execute policy: ${error}`],
          completedAt: Date.now(),
        });
      }
    }

    return {
      success: true,
      results,
    };
  },
});
