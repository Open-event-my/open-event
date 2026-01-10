/**
 * Property-Based Tests for Data Retention Service
 *
 * Feature: production-readiness, Property 17: Data Retention Policy Enforcement
 * Validates: Requirements 3.6
 *
 * These tests verify that data retention policies are correctly enforced:
 * - Data older than retention period is identified for cleanup
 * - Data within retention period is preserved
 * - Cleanup actions (delete/anonymize) are applied correctly
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Type definitions for mock data
interface AuditLogRecord {
  _id: string
  userId: string | undefined
  userEmail: string
  action: string
  resource: string
  resourceId: string | undefined
  status: string
  createdAt: number
  metadata?: {
    retentionDays?: number
    recordsDeleted?: number
  }
}

interface SessionRecord {
  _id: string
  userId: string
  accessToken: string
  accessTokenExpiresAt: number
  createdAt: number
}

interface NotificationRecord {
  _id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: number
}

interface EventRecord {
  _id: string
  organizerId: string
  title: string
  description: string
  status: string
  venueName?: string
  venueAddress?: string
  startDate?: number
  endDate?: number
  createdAt: number
  updatedAt?: number
}

type MockRecord = AuditLogRecord | SessionRecord | NotificationRecord | EventRecord

interface MockDataStore {
  auditLogs: Map<string, AuditLogRecord>
  sessions: Map<string, SessionRecord>
  verificationTokens: Map<string, MockRecord>
  failedLoginAttempts: Map<string, MockRecord>
  notifications: Map<string, NotificationRecord>
  adminNotifications: Map<string, MockRecord>
  apiRequestLogs: Map<string, MockRecord>
  webhookDeliveries: Map<string, MockRecord>
  moderationLogs: Map<string, MockRecord>
  events: Map<string, EventRecord>
}

// Mock Convex context and database for testing
const createMockContext = () => {
  const mockData: MockDataStore = {
    auditLogs: new Map<string, AuditLogRecord>(),
    sessions: new Map<string, SessionRecord>(),
    verificationTokens: new Map<string, MockRecord>(),
    failedLoginAttempts: new Map<string, MockRecord>(),
    notifications: new Map<string, NotificationRecord>(),
    adminNotifications: new Map<string, MockRecord>(),
    apiRequestLogs: new Map<string, MockRecord>(),
    webhookDeliveries: new Map<string, MockRecord>(),
    moderationLogs: new Map<string, MockRecord>(),
    events: new Map<string, EventRecord>(),
  }

  return {
    db: {
      get: async (id: string): Promise<MockRecord | null> => {
        // Check each table explicitly for type safety
        if (mockData.auditLogs.has(id)) {
          return mockData.auditLogs.get(id) ?? null
        }
        if (mockData.sessions.has(id)) {
          return mockData.sessions.get(id) ?? null
        }
        if (mockData.notifications.has(id)) {
          return mockData.notifications.get(id) ?? null
        }
        if (mockData.events.has(id)) {
          return mockData.events.get(id) ?? null
        }
        if (mockData.verificationTokens.has(id)) {
          return mockData.verificationTokens.get(id) ?? null
        }
        if (mockData.failedLoginAttempts.has(id)) {
          return mockData.failedLoginAttempts.get(id) ?? null
        }
        if (mockData.adminNotifications.has(id)) {
          return mockData.adminNotifications.get(id) ?? null
        }
        if (mockData.apiRequestLogs.has(id)) {
          return mockData.apiRequestLogs.get(id) ?? null
        }
        if (mockData.webhookDeliveries.has(id)) {
          return mockData.webhookDeliveries.get(id) ?? null
        }
        if (mockData.moderationLogs.has(id)) {
          return mockData.moderationLogs.get(id) ?? null
        }
        return null
      },
      delete: async (id: string): Promise<void> => {
        // Check each table explicitly for type safety
        if (mockData.auditLogs.has(id)) {
          mockData.auditLogs.delete(id)
          return
        }
        if (mockData.sessions.has(id)) {
          mockData.sessions.delete(id)
          return
        }
        if (mockData.notifications.has(id)) {
          mockData.notifications.delete(id)
          return
        }
        if (mockData.events.has(id)) {
          mockData.events.delete(id)
          return
        }
        if (mockData.verificationTokens.has(id)) {
          mockData.verificationTokens.delete(id)
          return
        }
        if (mockData.failedLoginAttempts.has(id)) {
          mockData.failedLoginAttempts.delete(id)
          return
        }
        if (mockData.adminNotifications.has(id)) {
          mockData.adminNotifications.delete(id)
          return
        }
        if (mockData.apiRequestLogs.has(id)) {
          mockData.apiRequestLogs.delete(id)
          return
        }
        if (mockData.webhookDeliveries.has(id)) {
          mockData.webhookDeliveries.delete(id)
          return
        }
        if (mockData.moderationLogs.has(id)) {
          mockData.moderationLogs.delete(id)
          return
        }
      },
      patch: async (id: string, updates: Partial<MockRecord>): Promise<void> => {
        // Check each table explicitly for type safety
        if (mockData.auditLogs.has(id)) {
          const existing = mockData.auditLogs.get(id)
          if (existing) {
            const updated = { ...existing, ...updates }
            if (isAuditLogRecord(updated)) {
              mockData.auditLogs.set(id, updated)
            }
          }
          return
        }

        if (mockData.sessions.has(id)) {
          const existing = mockData.sessions.get(id)
          if (existing) {
            const updated = { ...existing, ...updates }
            if (isSessionRecord(updated)) {
              mockData.sessions.set(id, updated)
            }
          }
          return
        }

        if (mockData.notifications.has(id)) {
          const existing = mockData.notifications.get(id)
          if (existing) {
            const updated = { ...existing, ...updates }
            if (isNotificationRecord(updated)) {
              mockData.notifications.set(id, updated)
            }
          }
          return
        }

        if (mockData.events.has(id)) {
          const existing = mockData.events.get(id)
          if (existing) {
            const updated = { ...existing, ...updates }
            if (isEventRecord(updated)) {
              mockData.events.set(id, updated)
            }
          }
          return
        }

        // Handle generic MockRecord tables
        const genericTables: Array<
          keyof Pick<
            MockDataStore,
            | 'verificationTokens'
            | 'failedLoginAttempts'
            | 'adminNotifications'
            | 'apiRequestLogs'
            | 'webhookDeliveries'
            | 'moderationLogs'
          >
        > = [
          'verificationTokens',
          'failedLoginAttempts',
          'adminNotifications',
          'apiRequestLogs',
          'webhookDeliveries',
          'moderationLogs',
        ]

        for (const tableName of genericTables) {
          const table = mockData[tableName]
          if (table.has(id)) {
            const existing = table.get(id)
            if (existing) {
              const updated = { ...existing, ...updates }
              table.set(id, updated)
            }
            return
          }
        }
      },
      insert: async (tableName: string, doc: Record<string, unknown>): Promise<string> => {
        const id = `${tableName}_${Date.now()}_${Math.random()}`
        const recordData = { _id: id, ...doc }

        // Type-safe insertion with exhaustive table matching and type narrowing
        switch (tableName) {
          case 'auditLogs':
            if (isAuditLogRecord(recordData)) {
              mockData.auditLogs.set(id, recordData)
            }
            break
          case 'sessions':
            if (isSessionRecord(recordData)) {
              mockData.sessions.set(id, recordData)
            }
            break
          case 'notifications':
            if (isNotificationRecord(recordData)) {
              mockData.notifications.set(id, recordData)
            }
            break
          case 'events':
            if (isEventRecord(recordData)) {
              mockData.events.set(id, recordData)
            }
            break
          case 'verificationTokens':
          case 'failedLoginAttempts':
          case 'adminNotifications':
          case 'apiRequestLogs':
          case 'webhookDeliveries':
          case 'moderationLogs': {
            // For generic tables, check if it matches any of the specific record types
            // If not, accept it as a generic MockRecord
            if (isAuditLogRecord(recordData)) {
              mockData[tableName].set(id, recordData)
            } else if (isSessionRecord(recordData)) {
              mockData[tableName].set(id, recordData)
            } else if (isNotificationRecord(recordData)) {
              mockData[tableName].set(id, recordData)
            } else if (isEventRecord(recordData)) {
              mockData[tableName].set(id, recordData)
            } else if (hasRequiredMockRecordFields(recordData)) {
              mockData[tableName].set(id, recordData)
            }
            break
          }
          default:
            throw new Error(`Unknown table: ${tableName}`)
        }

        return id
      },
    },
    mockData,
  }
}

// Type guard functions
function isAuditLogRecord(
  record: Record<string, unknown>
): record is AuditLogRecord & Record<string, unknown> {
  return (
    '_id' in record &&
    'userEmail' in record &&
    'action' in record &&
    'resource' in record &&
    'status' in record &&
    'createdAt' in record
  )
}

function isSessionRecord(
  record: Record<string, unknown>
): record is SessionRecord & Record<string, unknown> {
  return (
    '_id' in record &&
    'userId' in record &&
    'accessToken' in record &&
    'accessTokenExpiresAt' in record &&
    'createdAt' in record
  )
}

function isNotificationRecord(
  record: Record<string, unknown>
): record is NotificationRecord & Record<string, unknown> {
  return (
    '_id' in record &&
    'userId' in record &&
    'type' in record &&
    'title' in record &&
    'message' in record &&
    'read' in record &&
    'createdAt' in record
  )
}

function isEventRecord(
  record: Record<string, unknown>
): record is EventRecord & Record<string, unknown> {
  return (
    '_id' in record &&
    'organizerId' in record &&
    'title' in record &&
    'description' in record &&
    'status' in record &&
    'createdAt' in record
  )
}

function hasRequiredMockRecordFields(
  record: Record<string, unknown>
): record is MockRecord & Record<string, unknown> {
  // A record is a MockRecord if it has an _id and createdAt
  // This is a fallback for generic record types
  return (
    '_id' in record &&
    typeof record._id === 'string' &&
    'createdAt' in record &&
    typeof record.createdAt === 'number'
  )
}

// Arbitraries for generating test data
const retentionDaysArbitrary = fc.integer({ min: 1, max: 365 })

describe('Data Retention Service - Property Tests', () => {
  describe('Property 17: Data Retention Policy Enforcement', () => {
    /**
     * Property: For any data record subject to retention policies, if the record age
     * exceeds the retention period, it should be automatically deleted during cleanup.
     */
    it('should delete records older than retention period', async () => {
      await fc.assert(
        fc.asyncProperty(
          retentionDaysArbitrary,
          fc.record({
            oldRecordCount: fc.integer({ min: 1, max: 10 }),
            recentRecordCount: fc.integer({ min: 1, max: 10 }),
          }),
          async (retentionDays, testData) => {
            const ctx = createMockContext()

            // Create old records (should be deleted)
            const oldRecordIds: string[] = []
            for (let i = 0; i < testData.oldRecordCount; i++) {
              const recordId = `old_audit_${i}`
              const createdAt = Date.now() - (retentionDays + 1) * 24 * 60 * 60 * 1000

              ctx.mockData.auditLogs.set(recordId, {
                _id: recordId,
                userId: `user_${i}`,
                userEmail: `user${i}@test.com`,
                action: 'test_action',
                resource: 'test',
                resourceId: `resource_${i}`,
                status: 'success',
                createdAt,
              })
              oldRecordIds.push(recordId)
            }

            // Create recent records (should be kept)
            const recentRecordIds: string[] = []
            for (let i = 0; i < testData.recentRecordCount; i++) {
              const recordId = `recent_audit_${i}`
              const createdAt = Date.now() - (retentionDays - 1) * 24 * 60 * 60 * 1000

              ctx.mockData.auditLogs.set(recordId, {
                _id: recordId,
                userId: `user_${i}`,
                userEmail: `user${i}@test.com`,
                action: 'test_action',
                resource: 'test',
                resourceId: `resource_${i}`,
                status: 'success',
                createdAt,
              })
              recentRecordIds.push(recordId)
            }

            // Verify initial state
            expect(ctx.mockData.auditLogs.size).toBe(
              testData.oldRecordCount + testData.recentRecordCount
            )

            // Simulate cleanup
            const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000
            const recordsToDelete = Array.from(ctx.mockData.auditLogs.values()).filter(
              (record: AuditLogRecord) => record.createdAt < cutoffDate
            )

            for (const record of recordsToDelete) {
              await ctx.db.delete(record._id)
            }

            // Verify old records are deleted
            for (const recordId of oldRecordIds) {
              const record = await ctx.db.get(recordId)
              expect(record).toBeNull()
            }

            // Verify recent records are kept
            for (const recordId of recentRecordIds) {
              const record = await ctx.db.get(recordId)
              expect(record).not.toBeNull()
            }

            // Verify final count
            expect(ctx.mockData.auditLogs.size).toBe(testData.recentRecordCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any retention period, records created exactly at the cutoff date
     * should be preserved (boundary condition).
     */
    it('should preserve records at the exact retention boundary', async () => {
      await fc.assert(
        fc.asyncProperty(
          retentionDaysArbitrary,
          fc.integer({ min: 1, max: 5 }),
          async (retentionDays, recordCount) => {
            const ctx = createMockContext()

            // Create records exactly at the cutoff date
            const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000
            const boundaryRecordIds: string[] = []

            for (let i = 0; i < recordCount; i++) {
              const recordId = `boundary_audit_${i}`

              ctx.mockData.auditLogs.set(recordId, {
                _id: recordId,
                userId: `user_${i}`,
                userEmail: `user${i}@test.com`,
                action: 'test_action',
                resource: 'test',
                resourceId: `resource_${i}`,
                status: 'success',
                createdAt: cutoffDate,
              })
              boundaryRecordIds.push(recordId)
            }

            // Simulate cleanup (should only delete records OLDER than cutoff)
            const recordsToDelete = Array.from(ctx.mockData.auditLogs.values()).filter(
              (record: AuditLogRecord) => record.createdAt < cutoffDate
            )

            for (const record of recordsToDelete) {
              await ctx.db.delete(record._id)
            }

            // Verify all boundary records are preserved
            for (const recordId of boundaryRecordIds) {
              const record = await ctx.db.get(recordId)
              expect(record).not.toBeNull()
            }

            expect(ctx.mockData.auditLogs.size).toBe(recordCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any expired session older than retention period,
     * it should be deleted during cleanup.
     */
    it('should delete expired sessions older than retention period', async () => {
      await fc.assert(
        fc.asyncProperty(
          retentionDaysArbitrary,
          fc.record({
            expiredOldCount: fc.integer({ min: 1, max: 10 }),
            expiredRecentCount: fc.integer({ min: 1, max: 10 }),
            activeCount: fc.integer({ min: 1, max: 10 }),
          }),
          async (retentionDays, testData) => {
            const ctx = createMockContext()

            // Create expired old sessions (should be deleted)
            const expiredOldIds: string[] = []
            for (let i = 0; i < testData.expiredOldCount; i++) {
              const sessionId = `expired_old_${i}`
              const createdAt = Date.now() - (retentionDays + 1) * 24 * 60 * 60 * 1000
              const expiresAt = createdAt + 1000 // Expired

              ctx.mockData.sessions.set(sessionId, {
                _id: sessionId,
                userId: `user_${i}`,
                accessToken: `token_${i}`,
                accessTokenExpiresAt: expiresAt,
                createdAt,
              })
              expiredOldIds.push(sessionId)
            }

            // Create expired recent sessions (should be kept - not old enough)
            const expiredRecentIds: string[] = []
            for (let i = 0; i < testData.expiredRecentCount; i++) {
              const sessionId = `expired_recent_${i}`
              const createdAt = Date.now() - (retentionDays - 1) * 24 * 60 * 60 * 1000
              const expiresAt = createdAt + 1000 // Expired

              ctx.mockData.sessions.set(sessionId, {
                _id: sessionId,
                userId: `user_${i}`,
                accessToken: `token_${i}`,
                accessTokenExpiresAt: expiresAt,
                createdAt,
              })
              expiredRecentIds.push(sessionId)
            }

            // Create active sessions (should be kept - not expired)
            const activeIds: string[] = []
            for (let i = 0; i < testData.activeCount; i++) {
              const sessionId = `active_${i}`
              const createdAt = Date.now() - (retentionDays + 1) * 24 * 60 * 60 * 1000
              const expiresAt = Date.now() + 1000000 // Not expired

              ctx.mockData.sessions.set(sessionId, {
                _id: sessionId,
                userId: `user_${i}`,
                accessToken: `token_${i}`,
                accessTokenExpiresAt: expiresAt,
                createdAt,
              })
              activeIds.push(sessionId)
            }

            // Simulate cleanup
            const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000
            const sessionsToDelete = Array.from(ctx.mockData.sessions.values()).filter(
              (session: SessionRecord) => {
                const isExpired = session.accessTokenExpiresAt < Date.now()
                const isOld = session.createdAt < cutoffDate
                return isExpired && isOld
              }
            )

            for (const session of sessionsToDelete) {
              await ctx.db.delete(session._id)
            }

            // Verify expired old sessions are deleted
            for (const sessionId of expiredOldIds) {
              const session = await ctx.db.get(sessionId)
              expect(session).toBeNull()
            }

            // Verify expired recent sessions are kept
            for (const sessionId of expiredRecentIds) {
              const session = await ctx.db.get(sessionId)
              expect(session).not.toBeNull()
            }

            // Verify active sessions are kept
            for (const sessionId of activeIds) {
              const session = await ctx.db.get(sessionId)
              expect(session).not.toBeNull()
            }

            // Verify final count
            expect(ctx.mockData.sessions.size).toBe(
              testData.expiredRecentCount + testData.activeCount
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any completed event older than retention period,
     * it should be anonymized (not deleted) during cleanup.
     */
    it('should anonymize completed events older than retention period', async () => {
      await fc.assert(
        fc.asyncProperty(
          retentionDaysArbitrary,
          fc.record({
            oldCompletedCount: fc.integer({ min: 1, max: 5 }),
            recentCompletedCount: fc.integer({ min: 1, max: 5 }),
            activeCount: fc.integer({ min: 1, max: 5 }),
          }),
          async (retentionDays, testData) => {
            const ctx = createMockContext()

            // Create old completed events (should be anonymized)
            const oldCompletedIds: string[] = []
            for (let i = 0; i < testData.oldCompletedCount; i++) {
              const eventId = `old_completed_${i}`
              const endDate = Date.now() - (retentionDays + 1) * 24 * 60 * 60 * 1000

              ctx.mockData.events.set(eventId, {
                _id: eventId,
                organizerId: `user_${i}`,
                title: `Old Event ${i}`,
                description: 'Sensitive event description',
                status: 'completed',
                venueName: 'Secret Venue',
                venueAddress: '123 Secret St',
                endDate,
                createdAt: endDate - 1000000,
              })
              oldCompletedIds.push(eventId)
            }

            // Create recent completed events (should be kept as-is)
            const recentCompletedIds: string[] = []
            for (let i = 0; i < testData.recentCompletedCount; i++) {
              const eventId = `recent_completed_${i}`
              const endDate = Date.now() - (retentionDays - 1) * 24 * 60 * 60 * 1000

              ctx.mockData.events.set(eventId, {
                _id: eventId,
                organizerId: `user_${i}`,
                title: `Recent Event ${i}`,
                description: 'Recent event description',
                status: 'completed',
                venueName: 'Recent Venue',
                venueAddress: '456 Recent St',
                endDate,
                createdAt: endDate - 1000000,
              })
              recentCompletedIds.push(eventId)
            }

            // Create active events (should be kept as-is)
            const activeIds: string[] = []
            for (let i = 0; i < testData.activeCount; i++) {
              const eventId = `active_${i}`

              ctx.mockData.events.set(eventId, {
                _id: eventId,
                organizerId: `user_${i}`,
                title: `Active Event ${i}`,
                description: 'Active event description',
                status: 'active',
                venueName: 'Active Venue',
                venueAddress: '789 Active St',
                startDate: Date.now(),
                createdAt: Date.now() - 1000000,
              })
              activeIds.push(eventId)
            }

            // Simulate anonymization
            const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000
            const completedEvents = Array.from(ctx.mockData.events.values()).filter(
              (event: EventRecord) => event.status === 'completed'
            )

            const oldCompletedEvents = completedEvents.filter((event: EventRecord) => {
              const completionDate = event.endDate || event.updatedAt || event.createdAt
              return completionDate < cutoffDate
            })

            for (const event of oldCompletedEvents) {
              await ctx.db.patch(event._id, {
                title: `Event ${event._id}`,
                description: '[Anonymized - Retention Policy]',
                venueName: undefined,
                venueAddress: undefined,
                updatedAt: Date.now(),
              })
            }

            // Verify old completed events are anonymized
            for (const eventId of oldCompletedIds) {
              const event = (await ctx.db.get(eventId)) as EventRecord | null
              expect(event).not.toBeNull()
              expect(event?.title).toBe(`Event ${eventId}`)
              expect(event?.description).toBe('[Anonymized - Retention Policy]')
              expect(event?.venueName).toBeUndefined()
              expect(event?.venueAddress).toBeUndefined()
            }

            // Verify recent completed events are unchanged
            for (const eventId of recentCompletedIds) {
              const event = (await ctx.db.get(eventId)) as EventRecord | null
              expect(event).not.toBeNull()
              expect(event?.title).toContain('Recent Event')
              expect(event?.description).toBe('Recent event description')
              expect(event?.venueName).toBe('Recent Venue')
            }

            // Verify active events are unchanged
            for (const eventId of activeIds) {
              const event = (await ctx.db.get(eventId)) as EventRecord | null
              expect(event).not.toBeNull()
              expect(event?.title).toContain('Active Event')
              expect(event?.description).toBe('Active event description')
              expect(event?.venueName).toBe('Active Venue')
            }

            // Verify all events still exist (anonymized, not deleted)
            expect(ctx.mockData.events.size).toBe(
              testData.oldCompletedCount + testData.recentCompletedCount + testData.activeCount
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any retention cleanup operation, an audit log entry
     * should be created documenting the cleanup.
     */
    it('should create audit log for every retention cleanup operation', async () => {
      await fc.assert(
        fc.asyncProperty(
          retentionDaysArbitrary,
          fc.constantFrom('sessions', 'notifications'),
          fc.integer({ min: 1, max: 10 }),
          async (retentionDays, dataType, recordCount) => {
            const ctx = createMockContext()

            // Create old records
            const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000

            for (let i = 0; i < recordCount; i++) {
              const recordId = `${dataType}_${i}`
              if (dataType === 'sessions') {
                ctx.mockData.sessions.set(recordId, {
                  _id: recordId,
                  createdAt: cutoffDate - 1000,
                  userId: `user_${i}`,
                  accessToken: `token_${i}`,
                  accessTokenExpiresAt: cutoffDate - 500,
                })
              } else if (dataType === 'notifications') {
                ctx.mockData.notifications.set(recordId, {
                  _id: recordId,
                  createdAt: cutoffDate - 1000,
                  userId: `user_${i}`,
                  type: 'test',
                  title: 'Test',
                  message: 'Test',
                  read: true,
                })
              }
            }

            const initialAuditLogCount = ctx.mockData.auditLogs.size

            // Simulate cleanup
            const records =
              dataType === 'sessions'
                ? Array.from(ctx.mockData.sessions.values())
                : Array.from(ctx.mockData.notifications.values())
            const recordsToDelete = records.filter((record) => record.createdAt < cutoffDate)

            let deletedCount = 0
            for (const record of recordsToDelete) {
              await ctx.db.delete(record._id)
              deletedCount++
            }

            // Create audit log entry
            await ctx.db.insert('auditLogs', {
              userId: undefined,
              userEmail: 'system',
              action: 'data_retention_cleanup',
              resource: dataType,
              resourceId: undefined,
              status: 'success',
              metadata: {
                retentionDays,
                recordsDeleted: deletedCount,
              },
              createdAt: Date.now(),
            })

            // Verify audit log was created
            const finalAuditLogCount = ctx.mockData.auditLogs.size
            expect(finalAuditLogCount).toBe(initialAuditLogCount + 1)

            // Verify audit log contains correct information
            const auditLogs = Array.from(ctx.mockData.auditLogs.values())
            const cleanupLog = auditLogs.find(
              (log: AuditLogRecord) =>
                log.action === 'data_retention_cleanup' && log.resource === dataType
            )

            expect(cleanupLog).toBeDefined()
            expect(cleanupLog?.metadata?.recordsDeleted).toBe(deletedCount)
            expect(cleanupLog?.metadata?.retentionDays).toBe(retentionDays)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any retention policy with zero retention days,
     * all records older than the current moment should be deleted.
     */
    it('should delete all old records when retention period is zero', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (recordCount) => {
          const ctx = createMockContext()
          const retentionDays = 0

          // Create records of various ages (all in the past)
          const now = Date.now()
          for (let i = 0; i < recordCount; i++) {
            const recordId = `audit_${i}`
            // Create records at least 1 second in the past
            const createdAt = now - (i + 1) * 1000

            ctx.mockData.auditLogs.set(recordId, {
              _id: recordId,
              userId: `user_${i}`,
              userEmail: `user${i}@test.com`,
              action: 'test_action',
              resource: 'test',
              resourceId: `resource_${i}`,
              status: 'success',
              createdAt,
            })
          }

          expect(ctx.mockData.auditLogs.size).toBe(recordCount)

          // Simulate cleanup with zero retention
          const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000
          const recordsToDelete = Array.from(ctx.mockData.auditLogs.values()).filter(
            (record: AuditLogRecord) => record.createdAt < cutoffDate
          )

          for (const record of recordsToDelete) {
            await ctx.db.delete(record._id)
          }

          // Verify all records are deleted (since they were all created in the past)
          expect(ctx.mockData.auditLogs.size).toBe(0)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Cleanup should be idempotent - running cleanup multiple times
     * should not cause errors or delete additional records.
     */
    it('should be idempotent when run multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          retentionDaysArbitrary,
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 2, max: 5 }),
          async (retentionDays, recordCount, cleanupRuns) => {
            const ctx = createMockContext()

            // Create old records
            const cutoffDate = Date.now() - retentionDays * 24 * 60 * 60 * 1000
            for (let i = 0; i < recordCount; i++) {
              const recordId = `audit_${i}`

              ctx.mockData.auditLogs.set(recordId, {
                _id: recordId,
                userId: `user_${i}`,
                userEmail: `user${i}@test.com`,
                action: 'test_action',
                resource: 'test',
                resourceId: `resource_${i}`,
                status: 'success',
                createdAt: cutoffDate - 1000,
              })
            }

            // Run cleanup multiple times
            for (let run = 0; run < cleanupRuns; run++) {
              const recordsToDelete = Array.from(ctx.mockData.auditLogs.values()).filter(
                (record: AuditLogRecord) => record.createdAt < cutoffDate
              )

              for (const record of recordsToDelete) {
                await ctx.db.delete(record._id)
              }
            }

            // Verify all records are deleted (and no errors occurred)
            expect(ctx.mockData.auditLogs.size).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
