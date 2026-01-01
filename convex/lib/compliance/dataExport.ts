/**
 * Data Export Service - Types and Utilities
 *
 * Implements GDPR Article 20 (Right to Data Portability) by providing
 * comprehensive user data export functionality.
 *
 * NOTE: The actual Convex query/mutation implementations should be in
 * the root convex/ directory (e.g., convex/compliance.ts).
 * This file contains only types and utility functions.
 */

/**
 * Export format configuration
 */
export interface ExportFormat {
  format: 'json' | 'csv'
  includeMetadata: boolean
}

/**
 * Complete user data export structure
 */
export interface UserDataExport {
  exportMetadata: {
    exportedAt: number
    exportedBy: string
    version: string
    format: string
  }
  user: {
    profile: unknown
    organizerProfile: unknown | null
    notificationPreferences: unknown | null
  }
  events: unknown[]
  organizations: {
    owned: unknown[]
    memberships: unknown[]
  }
  orders: unknown[]
  attendees: unknown[]
  apiKeys: unknown[]
  notes: unknown[]
  notifications: unknown[]
  budgetItems: unknown[]
  eventTasks: unknown[]
  inquiries: unknown[]
  eventApplications: unknown[]
  auditLogs: unknown[]
}

/**
 * Generate export file from data
 *
 * This is a helper function that would be used to convert the export data
 * into a downloadable file format (JSON or CSV).
 *
 * In the frontend, this data would be converted to a Blob and downloaded.
 */
export function generateExportFile(data: UserDataExport, format: ExportFormat): string {
  if (format.format === 'json') {
    return JSON.stringify(data, null, 2)
  }

  // CSV export would require flattening the nested structure
  // This is a simplified implementation
  throw new Error('CSV export not yet implemented')
}

/**
 * Sanitize user data for export - removes sensitive fields
 */
export function sanitizeUserForExport(user: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...user }

  // Remove sensitive fields
  delete sanitized.passwordHash
  delete sanitized.twoFactorSecret

  if (sanitized.twoFactorBackupCodes) {
    sanitized.twoFactorBackupCodes = ['[REDACTED]']
  }

  return sanitized
}

/**
 * Sanitize API key for export - removes actual key values
 */
export function sanitizeApiKeyForExport(apiKey: Record<string, unknown>): Record<string, unknown> {
  return {
    ...apiKey,
    encryptedKey: '[REDACTED]',
    keyHash: '[REDACTED]',
    encryptionIV: '[REDACTED]',
    encryptionTag: '[REDACTED]',
    encryptionSalt: '[REDACTED]',
  }
}
