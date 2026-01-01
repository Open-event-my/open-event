/**
 * Scheduled Tasks (Cron Jobs)
 *
 * This file defines all scheduled tasks that run automatically.
 * Uses Convex's built-in cron functionality.
 */

import { cronJobs } from 'convex/server'
import { makeFunctionReference } from 'convex/server'
import { internal } from './_generated/api'

// Create function reference for paymentIdempotency cleanup
const cleanupPaymentIdempotency = makeFunctionReference<'mutation'>(
  'paymentIdempotency:cleanupExpired'
)

const crons = cronJobs()

/**
 * Clean up expired orders every 15 minutes
 *
 * This releases reserved tickets for orders that:
 * - Are in 'pending' status
 * - Have been pending for more than 30 minutes
 *
 * This prevents ticket inventory from being permanently locked
 * by abandoned checkout sessions.
 */
crons.interval('cleanup-expired-orders', { minutes: 15 }, internal.orders.cleanupExpiredOrders)

/**
 * Clean up old webhook events every hour
 *
 * Removes webhook event records older than 7 days.
 * These are only needed for idempotency checks which
 * are only relevant for a short window.
 */
crons.interval('cleanup-old-webhook-events', { hours: 1 }, internal.orders.cleanupOldWebhookEvents)

/**
 * Clean up old account lockout records every 6 hours
 *
 * Removes lockout records that are:
 * - Older than 24 hours
 * - No longer locked
 *
 * This prevents the failedLoginAttempts table from growing indefinitely.
 */
crons.interval('cleanup-lockout-records', { hours: 6 }, internal.accountLockout.cleanupOldRecords)

/**
 * Clean up old global rate limit records every hour
 *
 * Removes rate limit records older than 1 hour.
 * These are only needed for the current window.
 */
crons.interval('cleanup-rate-limits', { hours: 1 }, internal.globalRateLimit.cleanupOldRecords)

/**
 * Clean up expired payment idempotency records every hour
 *
 * Removes idempotency records that have expired (older than 24 hours).
 * These are only needed to prevent duplicate payments within a short window.
 */
crons.interval('cleanup-payment-idempotency', { hours: 1 }, cleanupPaymentIdempotency)

/**
 * Clean up old audit logs every day
 *
 * Removes audit logs older than 90 days by default.
 * This keeps the audit trail manageable while maintaining
 * sufficient history for security reviews.
 */
crons.daily(
  'cleanup-audit-logs',
  { hourUTC: 3, minuteUTC: 0 },
  internal.auditLog.cleanupOldLogs,
  {}
)

/**
 * Run data retention policies every day at 2 AM UTC
 *
 * Executes all configured retention policies to:
 * - Delete data that exceeds retention periods
 * - Anonymize old data where appropriate
 * - Maintain compliance with GDPR storage limitation principle
 *
 * This includes cleanup of:
 * - Old audit logs (365 days)
 * - Expired sessions (90 days)
 * - Used verification tokens (7 days)
 * - Failed login attempts (30 days)
 * - Read notifications (90 days)
 * - API request logs (90 days)
 * - Webhook deliveries (30 days)
 * - Moderation logs (730 days)
 * - Completed events (3 years, anonymized)
 */
// TODO: Enable when compliance module is integrated into Convex API
// crons.daily(
//   'data-retention-cleanup',
//   { hourUTC: 2, minuteUTC: 0 },
//   internal.lib.compliance.dataRetention.runAllRetentionPolicies,
//   {}
// )

/**
 * Create daily database backup at 3 AM UTC
 *
 * Creates an automated backup of all database tables:
 * - Encrypts backup data for security
 * - Stores backup metadata in database
 * - Retains backups for 30 days minimum
 * - Monitors backup success/failure
 *
 * This ensures data can be recovered in case of:
 * - Accidental data deletion
 * - System failures
 * - Data corruption
 * - Disaster recovery scenarios
 */
// TODO: Enable when resilience module is integrated into Convex API
// crons.daily(
//   'daily-database-backup',
//   { hourUTC: 3, minuteUTC: 0 },
//   internal.lib.resilience.backup.createBackup,
//   {}
// )

/**
 * Clean up old backups every day at 4 AM UTC
 *
 * Removes backups that have exceeded their retention period:
 * - Default retention: 30 days
 * - Configurable per backup policy
 * - Frees up storage space
 * - Maintains backup history within policy limits
 */
// TODO: Enable when resilience module is integrated into Convex API
// crons.daily(
//   'cleanup-old-backups',
//   { hourUTC: 4, minuteUTC: 0 },
//   internal.lib.resilience.backup.cleanupOldBackups,
//   { retentionDays: 30 }
// )

export default crons
