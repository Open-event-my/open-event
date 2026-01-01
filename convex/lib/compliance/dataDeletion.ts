/**
 * Data Deletion Service - Types and Utilities
 *
 * Implements GDPR Article 17 (Right to Erasure / Right to be Forgotten) by providing
 * comprehensive user data deletion functionality.
 *
 * NOTE: The actual Convex mutation implementations should be in
 * the root convex/ directory (e.g., convex/compliance.ts).
 * This file contains only types and utility functions.
 */

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
