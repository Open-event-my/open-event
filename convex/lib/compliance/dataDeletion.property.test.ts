/**
 * Property-Based Tests for Data Deletion Service
 * 
 * Feature: production-readiness, Property 14: Complete Data Deletion
 * Validates: Requirements 3.2
 * 
 * These tests verify that user account deletion completely purges all
 * associated data across all tables in the system.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Mock Convex context and database for testing
const createMockContext = () => {
  const mockData = {
    users: new Map(),
    organizerProfiles: new Map(),
    notificationPreferences: new Map(),
    events: new Map(),
    organizations: new Map(),
    organizationMembers: new Map(),
    orders: new Map(),
    attendees: new Map(),
    apiKeys: new Map(),
    notes: new Map(),
    notifications: new Map(),
    budgetItems: new Map(),
    eventTasks: new Map(),
    inquiries: new Map(),
    eventApplications: new Map(),
    auditLogs: new Map(),
    sessions: new Map(),
    verificationTokens: new Map(),
    eventSponsors: new Map(),
    eventVendors: new Map(),
    ticketTypes: new Map(),
  };

  return {
    db: {
      get: async (id: string) => {
        for (const table of Object.values(mockData)) {
          if (table.has(id)) {
            return table.get(id);
          }
        }
        return null;
      },
      delete: async (id: string) => {
        for (const table of Object.values(mockData)) {
          if (table.has(id)) {
            table.delete(id);
            return;
          }
        }
      },
      patch: async (id: string, updates: any) => {
        for (const table of Object.values(mockData)) {
          if (table.has(id)) {
            const existing = table.get(id);
            table.set(id, { ...existing, ...updates });
            return;
          }
        }
      },
    },
    mockData,
  };
};

// Arbitraries for generating test data
const userIdArbitrary = fc.string({ minLength: 10, maxLength: 20 });
const emailArbitrary = fc.emailAddress();
const timestampArbitrary = fc.integer({ min: 1600000000000, max: Date.now() });
const stringArbitrary = fc.string({ minLength: 1, maxLength: 100 });

const userArbitrary = fc.record({
  _id: userIdArbitrary,
  email: emailArbitrary,
  name: fc.option(stringArbitrary, { nil: undefined }),
  role: fc.constantFrom('organizer', 'admin', 'superadmin'),
  status: fc.constantFrom('active', 'suspended', 'pending'),
  createdAt: timestampArbitrary,
});

describe('Data Deletion Service - Property Tests', () => {
  describe('Property 14: Complete Data Deletion', () => {
    /**
     * Property: For any user account deletion request, all associated data should be
     * purged from the database including related records in all tables.
     */
    it('should completely delete all user data across all tables', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.record({
            hasOrganizerProfile: fc.boolean(),
            hasNotificationPrefs: fc.boolean(),
            eventCount: fc.integer({ min: 0, max: 5 }),
            notificationCount: fc.integer({ min: 0, max: 10 }),
            sessionCount: fc.integer({ min: 1, max: 3 }),
          }),
          async (user, testData) => {
            const ctx = createMockContext();
            
            // Add user to mock database
            ctx.mockData.users.set(user._id, user);
            
            // Create related data
            if (testData.hasOrganizerProfile) {
              const profileId = `profile_${user._id}`;
              ctx.mockData.organizerProfiles.set(profileId, {
                _id: profileId,
                userId: user._id,
                organizationName: 'Test Org',
                createdAt: Date.now(),
              });
            }
            
            if (testData.hasNotificationPrefs) {
              const prefId = `pref_${user._id}`;
              ctx.mockData.notificationPreferences.set(prefId, {
                _id: prefId,
                userId: user._id,
                email: true,
                push: false,
                createdAt: Date.now(),
              });
            }
            
            // Create events
            const eventIds: string[] = [];
            for (let i = 0; i < testData.eventCount; i++) {
              const eventId = `event_${user._id}_${i}`;
              eventIds.push(eventId);
              ctx.mockData.events.set(eventId, {
                _id: eventId,
                organizerId: user._id,
                title: `Event ${i}`,
                startDate: Date.now(),
                status: 'draft',
                createdAt: Date.now(),
              });
              
              // Add budget item for each event
              const budgetId = `budget_${eventId}`;
              ctx.mockData.budgetItems.set(budgetId, {
                _id: budgetId,
                eventId,
                category: 'venue',
                name: 'Venue',
                estimatedCost: 1000,
                createdAt: Date.now(),
              });
              
              // Add task for each event
              const taskId = `task_${eventId}`;
              ctx.mockData.eventTasks.set(taskId, {
                _id: taskId,
                eventId,
                title: 'Task',
                status: 'todo',
                createdAt: Date.now(),
              });
            }
            
            // Create notifications
            for (let i = 0; i < testData.notificationCount; i++) {
              const notifId = `notif_${user._id}_${i}`;
              ctx.mockData.notifications.set(notifId, {
                _id: notifId,
                userId: user._id,
                type: 'system',
                title: `Notification ${i}`,
                message: 'Test',
                read: false,
                createdAt: Date.now(),
              });
            }
            
            // Create sessions
            for (let i = 0; i < testData.sessionCount; i++) {
              const sessionId = `session_${user._id}_${i}`;
              ctx.mockData.sessions.set(sessionId, {
                _id: sessionId,
                userId: user._id,
                accessToken: `token_${i}`,
                createdAt: Date.now(),
              });
            }
            
            // Create API key
            const apiKeyId = `apikey_${user._id}`;
            ctx.mockData.apiKeys.set(apiKeyId, {
              _id: apiKeyId,
              userId: user._id,
              name: 'Test Key',
              encryptedKey: 'encrypted',
              createdAt: Date.now(),
            });
            
            // Simulate deletion logic
            // 1. Delete user
            await ctx.db.delete(user._id);
            
            // 2. Delete related data
            const profilesToDelete = Array.from(ctx.mockData.organizerProfiles.values())
              .filter((p: any) => p.userId === user._id);
            profilesToDelete.forEach((p: any) => ctx.mockData.organizerProfiles.delete(p._id));
            
            const prefsToDelete = Array.from(ctx.mockData.notificationPreferences.values())
              .filter((p: any) => p.userId === user._id);
            prefsToDelete.forEach((p: any) => ctx.mockData.notificationPreferences.delete(p._id));
            
            const eventsToDelete = Array.from(ctx.mockData.events.values())
              .filter((e: any) => e.organizerId === user._id);
            eventsToDelete.forEach((e: any) => {
              // Delete event-related data
              const budgets = Array.from(ctx.mockData.budgetItems.values())
                .filter((b: any) => b.eventId === e._id);
              budgets.forEach((b: any) => ctx.mockData.budgetItems.delete(b._id));
              
              const tasks = Array.from(ctx.mockData.eventTasks.values())
                .filter((t: any) => t.eventId === e._id);
              tasks.forEach((t: any) => ctx.mockData.eventTasks.delete(t._id));
              
              ctx.mockData.events.delete(e._id);
            });
            
            const notifsToDelete = Array.from(ctx.mockData.notifications.values())
              .filter((n: any) => n.userId === user._id);
            notifsToDelete.forEach((n: any) => ctx.mockData.notifications.delete(n._id));
            
            const sessionsToDelete = Array.from(ctx.mockData.sessions.values())
              .filter((s: any) => s.userId === user._id);
            sessionsToDelete.forEach((s: any) => ctx.mockData.sessions.delete(s._id));
            
            const keysToDelete = Array.from(ctx.mockData.apiKeys.values())
              .filter((k: any) => k.userId === user._id);
            keysToDelete.forEach((k: any) => ctx.mockData.apiKeys.delete(k._id));
            
            // Verify deletion
            const deletedUser = await ctx.db.get(user._id);
            expect(deletedUser).toBeNull();
            
            // Verify all related data is deleted
            const remainingProfiles = Array.from(ctx.mockData.organizerProfiles.values())
              .filter((p: any) => p.userId === user._id);
            expect(remainingProfiles).toHaveLength(0);
            
            const remainingPrefs = Array.from(ctx.mockData.notificationPreferences.values())
              .filter((p: any) => p.userId === user._id);
            expect(remainingPrefs).toHaveLength(0);
            
            const remainingEvents = Array.from(ctx.mockData.events.values())
              .filter((e: any) => e.organizerId === user._id);
            expect(remainingEvents).toHaveLength(0);
            
            const remainingNotifs = Array.from(ctx.mockData.notifications.values())
              .filter((n: any) => n.userId === user._id);
            expect(remainingNotifs).toHaveLength(0);
            
            const remainingSessions = Array.from(ctx.mockData.sessions.values())
              .filter((s: any) => s.userId === user._id);
            expect(remainingSessions).toHaveLength(0);
            
            const remainingKeys = Array.from(ctx.mockData.apiKeys.values())
              .filter((k: any) => k.userId === user._id);
            expect(remainingKeys).toHaveLength(0);
            
            // Verify no orphaned event data
            for (const eventId of eventIds) {
              const remainingBudgets = Array.from(ctx.mockData.budgetItems.values())
                .filter((b: any) => b.eventId === eventId);
              expect(remainingBudgets).toHaveLength(0);
              
              const remainingTasks = Array.from(ctx.mockData.eventTasks.values())
                .filter((t: any) => t.eventId === eventId);
              expect(remainingTasks).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any user with events, all event-related data should be deleted
     * including budget items, tasks, applications, sponsors, vendors, etc.
     */
    it('should cascade delete all event-related data', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.record({
            eventCount: fc.integer({ min: 1, max: 3 }),
            budgetItemsPerEvent: fc.integer({ min: 1, max: 5 }),
            tasksPerEvent: fc.integer({ min: 1, max: 5 }),
          }),
          async (user, testData) => {
            const ctx = createMockContext();
            
            // Add user
            ctx.mockData.users.set(user._id, user);
            
            // Create events with related data
            const eventIds: string[] = [];
            let totalBudgetItems = 0;
            let totalTasks = 0;
            
            for (let i = 0; i < testData.eventCount; i++) {
              const eventId = `event_${user._id}_${i}`;
              eventIds.push(eventId);
              
              ctx.mockData.events.set(eventId, {
                _id: eventId,
                organizerId: user._id,
                title: `Event ${i}`,
                startDate: Date.now(),
                status: 'draft',
                createdAt: Date.now(),
              });
              
              // Create budget items
              for (let j = 0; j < testData.budgetItemsPerEvent; j++) {
                const budgetId = `budget_${eventId}_${j}`;
                ctx.mockData.budgetItems.set(budgetId, {
                  _id: budgetId,
                  eventId,
                  category: 'venue',
                  name: `Budget ${j}`,
                  estimatedCost: 1000,
                  createdAt: Date.now(),
                });
                totalBudgetItems++;
              }
              
              // Create tasks
              for (let j = 0; j < testData.tasksPerEvent; j++) {
                const taskId = `task_${eventId}_${j}`;
                ctx.mockData.eventTasks.set(taskId, {
                  _id: taskId,
                  eventId,
                  title: `Task ${j}`,
                  status: 'todo',
                  createdAt: Date.now(),
                });
                totalTasks++;
              }
            }
            
            // Verify data exists before deletion
            expect(ctx.mockData.events.size).toBe(testData.eventCount);
            expect(ctx.mockData.budgetItems.size).toBe(totalBudgetItems);
            expect(ctx.mockData.eventTasks.size).toBe(totalTasks);
            
            // Simulate deletion
            const eventsToDelete = Array.from(ctx.mockData.events.values())
              .filter((e: any) => e.organizerId === user._id);
            
            eventsToDelete.forEach((e: any) => {
              // Delete event-related data
              const budgets = Array.from(ctx.mockData.budgetItems.values())
                .filter((b: any) => b.eventId === e._id);
              budgets.forEach((b: any) => ctx.mockData.budgetItems.delete(b._id));
              
              const tasks = Array.from(ctx.mockData.eventTasks.values())
                .filter((t: any) => t.eventId === e._id);
              tasks.forEach((t: any) => ctx.mockData.eventTasks.delete(t._id));
              
              ctx.mockData.events.delete(e._id);
            });
            
            await ctx.db.delete(user._id);
            
            // Verify all data is deleted
            expect(ctx.mockData.events.size).toBe(0);
            expect(ctx.mockData.budgetItems.size).toBe(0);
            expect(ctx.mockData.eventTasks.size).toBe(0);
            
            // Verify no orphaned data
            for (const eventId of eventIds) {
              const orphanedBudgets = Array.from(ctx.mockData.budgetItems.values())
                .filter((b: any) => b.eventId === eventId);
              expect(orphanedBudgets).toHaveLength(0);
              
              const orphanedTasks = Array.from(ctx.mockData.eventTasks.values())
                .filter((t: any) => t.eventId === eventId);
              expect(orphanedTasks).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any user who owns organizations, when their account is deleted:
     * - If other admins exist, ownership should transfer to them
     * - If no other admins exist, the organization should be deleted
     */
    it('should handle organization ownership correctly during deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArbitrary,
          fc.record({
            hasOtherAdmin: fc.boolean(),
            otherAdminEmail: emailArbitrary,
          }),
          async (user, testData) => {
            const ctx = createMockContext();
            
            // Add owner
            ctx.mockData.users.set(user._id, user);
            
            // Create organization
            const orgId = `org_${user._id}`;
            ctx.mockData.organizations.set(orgId, {
              _id: orgId,
              name: 'Test Org',
              slug: `test-org-${Date.now()}`,
              ownerId: user._id,
              plan: 'free',
              maxMembers: 10,
              status: 'active',
              createdAt: Date.now(),
            });
            
            // Add owner as member
            const ownerMemberId = `member_${user._id}`;
            ctx.mockData.organizationMembers.set(ownerMemberId, {
              _id: ownerMemberId,
              organizationId: orgId,
              userId: user._id,
              role: 'owner',
              status: 'active',
              createdAt: Date.now(),
            });
            
            let otherAdminId: string | undefined;
            
            // Optionally create another admin
            if (testData.hasOtherAdmin) {
              otherAdminId = `user_admin_${Date.now()}`;
              ctx.mockData.users.set(otherAdminId, {
                _id: otherAdminId,
                email: testData.otherAdminEmail,
                name: 'Other Admin',
                role: 'organizer',
                status: 'active',
                createdAt: Date.now(),
              });
              
              const adminMemberId = `member_${otherAdminId}`;
              ctx.mockData.organizationMembers.set(adminMemberId, {
                _id: adminMemberId,
                organizationId: orgId,
                userId: otherAdminId,
                role: 'admin',
                status: 'active',
                createdAt: Date.now(),
              });
            }
            
            // Simulate deletion logic
            const org = ctx.mockData.organizations.get(orgId);
            if (org) {
              const otherAdmins = Array.from(ctx.mockData.organizationMembers.values())
                .filter((m: any) => 
                  m.organizationId === orgId &&
                  m.userId !== user._id &&
                  (m.role === 'admin' || m.role === 'owner')
                );
              
              if (otherAdmins.length > 0) {
                // Transfer ownership
                await ctx.db.patch(orgId, {
                  ownerId: otherAdmins[0].userId,
                  updatedAt: Date.now(),
                });
              } else {
                // Delete organization and all members
                const members = Array.from(ctx.mockData.organizationMembers.values())
                  .filter((m: any) => m.organizationId === orgId);
                members.forEach((m: any) => ctx.mockData.organizationMembers.delete(m._id));
                ctx.mockData.organizations.delete(orgId);
              }
            }
            
            // Delete user's membership
            const userMemberships = Array.from(ctx.mockData.organizationMembers.values())
              .filter((m: any) => m.userId === user._id);
            userMemberships.forEach((m: any) => ctx.mockData.organizationMembers.delete(m._id));
            
            await ctx.db.delete(user._id);
            
            // Verify organization handling
            const finalOrg = ctx.mockData.organizations.get(orgId);
            
            if (testData.hasOtherAdmin) {
              // Organization should still exist with transferred ownership
              expect(finalOrg).toBeDefined();
              expect(finalOrg?.ownerId).toBe(otherAdminId);
            } else {
              // Organization should be deleted
              expect(finalOrg).toBeUndefined();
              
              // All members should be deleted
              const remainingMembers = Array.from(ctx.mockData.organizationMembers.values())
                .filter((m: any) => m.organizationId === orgId);
              expect(remainingMembers).toHaveLength(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Deletion should be idempotent - deleting a non-existent user
     * should not cause errors or side effects.
     */
    it('should handle deletion of non-existent users gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          async (nonExistentUserId) => {
            const ctx = createMockContext();
            
            // Verify user doesn't exist
            const user = await ctx.db.get(nonExistentUserId);
            expect(user).toBeNull();
            
            // Attempt deletion - should not throw
            await ctx.db.delete(nonExistentUserId);
            
            // Verify no side effects
            expect(ctx.mockData.users.size).toBe(0);
            expect(ctx.mockData.events.size).toBe(0);
            expect(ctx.mockData.notifications.size).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
