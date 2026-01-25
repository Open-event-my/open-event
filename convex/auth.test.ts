import { convexTest } from 'convex-test'
import { describe, it, expect } from 'vitest'
import schema from './schema'
import { _testHelpers } from './auth'

const { transferUserReferences, getInheritedRole, ORG_ROLE_HIERARCHY } = _testHelpers

describe('Auth Module - User Reference Transfer', () => {
  describe('transferUserReferences', () => {
    it('should transfer organization memberships to new user', async () => {
      const t = convexTest(schema)

      // Create pre-promoted user (old user)
      const oldUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Pre-promoted User',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new authenticated user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'free',
          ownerId: oldUserId,
          maxMembers: 5,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Create membership for old user
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: oldUserId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Transfer references
      await t.run(async (ctx) => {
        await transferUserReferences(ctx, oldUserId, newUserId, 'test@example.com')
      })

      // Verify membership transferred to new user
      await t.run(async (ctx) => {
        const newMembership = await ctx.db
          .query('organizationMembers')
          .withIndex('by_org_user', (q) => q.eq('organizationId', orgId).eq('userId', newUserId))
          .first()

        expect(newMembership).toBeDefined()
        expect(newMembership?.role).toBe('owner')
        expect(newMembership?.status).toBe('active')

        // Old membership should no longer exist for old user
        const oldMembership = await ctx.db
          .query('organizationMembers')
          .withIndex('by_org_user', (q) => q.eq('organizationId', orgId).eq('userId', oldUserId))
          .first()

        expect(oldMembership).toBeNull()
      })
    })

    it('should keep higher role when both users have membership in same org', async () => {
      const t = convexTest(schema)

      // Create old user with owner role
      const oldUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Pre-promoted User',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user with member role
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'free',
          ownerId: oldUserId,
          maxMembers: 5,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Create membership for old user as OWNER
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: oldUserId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Create membership for new user as MEMBER (lower role)
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: newUserId,
          role: 'member',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Transfer references
      await t.run(async (ctx) => {
        await transferUserReferences(ctx, oldUserId, newUserId, 'test@example.com')
      })

      // Verify new user got upgraded to owner role
      await t.run(async (ctx) => {
        const newMembership = await ctx.db
          .query('organizationMembers')
          .withIndex('by_org_user', (q) => q.eq('organizationId', orgId).eq('userId', newUserId))
          .first()

        expect(newMembership).toBeDefined()
        expect(newMembership?.role).toBe('owner') // Upgraded from member to owner
      })
    })

    it('should auto-accept pending invitations for the email', async () => {
      const t = convexTest(schema)

      // Create old user (no membership)
      const oldUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Pre-promoted User',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create inviter user
      const inviterId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Inviter',
          email: 'inviter@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'free',
          ownerId: inviterId,
          maxMembers: 5,
          status: 'active',
          pendingInvitationCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Create pending invitation
      const invitationId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizationInvitations', {
          organizationId: orgId,
          email: 'test@example.com',
          role: 'admin',
          invitedBy: inviterId,
          token: 'test-token',
          status: 'pending',
          expiresAt: Date.now() + 604800000, // 7 days
          createdAt: Date.now(),
        })
      })

      // Transfer references
      await t.run(async (ctx) => {
        await transferUserReferences(ctx, oldUserId, newUserId, 'test@example.com')
      })

      // Verify invitation was accepted
      await t.run(async (ctx) => {
        const invitation = await ctx.db.get(invitationId)
        expect(invitation?.status).toBe('accepted')
        expect(invitation?.acceptedAt).toBeDefined()
      })

      // Verify membership was created
      await t.run(async (ctx) => {
        const membership = await ctx.db
          .query('organizationMembers')
          .withIndex('by_org_user', (q) => q.eq('organizationId', orgId).eq('userId', newUserId))
          .first()

        expect(membership).toBeDefined()
        expect(membership?.role).toBe('admin')
        expect(membership?.status).toBe('active')
      })

      // Verify pendingInvitationCount was decremented
      await t.run(async (ctx) => {
        const org = await ctx.db.get(orgId)
        expect(org?.pendingInvitationCount).toBe(0)
      })
    })

    it('should handle case with no memberships or invitations', async () => {
      const t = convexTest(schema)

      // Create old user with no memberships
      const oldUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Pre-promoted User',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Transfer references (should not throw)
      await t.run(async (ctx) => {
        await transferUserReferences(ctx, oldUserId, newUserId, 'test@example.com')
      })

      // Verify no errors and no memberships created
      await t.run(async (ctx) => {
        const memberships = await ctx.db
          .query('organizationMembers')
          .withIndex('by_user', (q) => q.eq('userId', newUserId))
          .collect()

        expect(memberships).toHaveLength(0)
      })
    })

    it('should transfer multiple memberships from different orgs', async () => {
      const t = convexTest(schema)

      // Create old user
      const oldUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Pre-promoted User',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create 3 organizations
      const orgIds = await t.run(async (ctx) => {
        const ids = []
        for (let i = 1; i <= 3; i++) {
          const id = await ctx.db.insert('organizations', {
            name: `Test Org ${i}`,
            slug: `test-org-${i}`,
            plan: 'free',
            ownerId: oldUserId,
            maxMembers: 5,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          ids.push(id)
        }
        return ids
      })

      // Create memberships for old user in all orgs
      await t.run(async (ctx) => {
        const roles: Array<'owner' | 'admin' | 'member'> = ['owner', 'admin', 'member']
        for (let i = 0; i < orgIds.length; i++) {
          await ctx.db.insert('organizationMembers', {
            organizationId: orgIds[i],
            userId: oldUserId,
            role: roles[i],
            status: 'active',
            joinedAt: Date.now(),
            createdAt: Date.now(),
          })
        }
      })

      // Transfer references
      await t.run(async (ctx) => {
        await transferUserReferences(ctx, oldUserId, newUserId, 'test@example.com')
      })

      // Verify all 3 memberships transferred
      await t.run(async (ctx) => {
        const memberships = await ctx.db
          .query('organizationMembers')
          .withIndex('by_user', (q) => q.eq('userId', newUserId))
          .collect()

        expect(memberships).toHaveLength(3)

        // Verify each org has the new user as member with correct role
        for (const orgId of orgIds) {
          const membership = memberships.find((m) => m.organizationId === orgId)
          expect(membership).toBeDefined()
        }
      })

      // Verify old user has no memberships
      await t.run(async (ctx) => {
        const oldMemberships = await ctx.db
          .query('organizationMembers')
          .withIndex('by_user', (q) => q.eq('userId', oldUserId))
          .collect()

        expect(oldMemberships).toHaveLength(0)
      })
    })
  })

  describe('getInheritedRole', () => {
    it('should inherit superadmin role from pre-promoted user', async () => {
      const t = convexTest(schema)

      // Create pre-promoted superadmin
      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          name: 'Pre-promoted Superadmin',
          email: 'test@example.com',
          role: 'superadmin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Get inherited role (don't consume yet)
      const role = await t.run(async (ctx) => {
        return await getInheritedRole(ctx, 'test@example.com', newUserId, false)
      })

      expect(role).toBe('superadmin')
    })

    it('should inherit admin role from pre-promoted user', async () => {
      const t = convexTest(schema)

      // Create pre-promoted admin
      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          name: 'Pre-promoted Admin',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      const role = await t.run(async (ctx) => {
        return await getInheritedRole(ctx, 'test@example.com', newUserId, false)
      })

      expect(role).toBe('admin')
    })

    it('should return organizer if no pre-promoted user exists', async () => {
      const t = convexTest(schema)

      // Create new user only (no pre-promoted user)
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      const role = await t.run(async (ctx) => {
        return await getInheritedRole(ctx, 'test@example.com', newUserId, false)
      })

      expect(role).toBe('organizer')
    })

    it('should inherit highest role when multiple pre-promoted users exist', async () => {
      const t = convexTest(schema)

      // Create pre-promoted admin
      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          name: 'Pre-promoted Admin',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create pre-promoted superadmin
      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          name: 'Pre-promoted Superadmin',
          email: 'test@example.com',
          role: 'superadmin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      const role = await t.run(async (ctx) => {
        return await getInheritedRole(ctx, 'test@example.com', newUserId, false)
      })

      expect(role).toBe('superadmin') // Highest role wins
    })

    it('should not delete pre-promoted user when shouldConsume=false', async () => {
      const t = convexTest(schema)

      // Create pre-promoted admin
      const prePromotedId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Pre-promoted Admin',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Get role without consuming
      await t.run(async (ctx) => {
        await getInheritedRole(ctx, 'test@example.com', newUserId, false)
      })

      // Verify pre-promoted user still exists
      await t.run(async (ctx) => {
        const prePromoted = await ctx.db.get(prePromotedId)
        expect(prePromoted).toBeDefined()
        expect(prePromoted?.email).toBe('test@example.com')
      })
    })

    it('should delete pre-promoted user and transfer references when shouldConsume=true', async () => {
      const t = convexTest(schema)

      // Create pre-promoted admin
      const prePromotedId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Pre-promoted Admin',
          email: 'test@example.com',
          role: 'admin',
          status: 'pending',
          createdAt: Date.now(),
        })
      })

      // Create organization owned by pre-promoted user
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'free',
          ownerId: prePromotedId,
          maxMembers: 5,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Create membership for pre-promoted user
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: prePromotedId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          email: 'test@example.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Get role with consuming
      const role = await t.run(async (ctx) => {
        return await getInheritedRole(ctx, 'test@example.com', newUserId, true)
      })

      expect(role).toBe('admin')

      // Verify pre-promoted user was deleted
      await t.run(async (ctx) => {
        const prePromoted = await ctx.db.get(prePromotedId)
        expect(prePromoted).toBeNull()
      })

      // Verify membership was transferred to new user
      await t.run(async (ctx) => {
        const membership = await ctx.db
          .query('organizationMembers')
          .withIndex('by_org_user', (q) => q.eq('organizationId', orgId).eq('userId', newUserId))
          .first()

        expect(membership).toBeDefined()
        expect(membership?.role).toBe('owner')
      })
    })

    it('should return organizer when email is undefined', async () => {
      const t = convexTest(schema)

      // Create new user
      const newUserId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Authenticated User',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      const role = await t.run(async (ctx) => {
        return await getInheritedRole(ctx, undefined, newUserId, false)
      })

      expect(role).toBe('organizer')
    })
  })

  describe('ORG_ROLE_HIERARCHY', () => {
    it('should have correct role hierarchy values', () => {
      expect(ORG_ROLE_HIERARCHY.owner).toBe(5)
      expect(ORG_ROLE_HIERARCHY.admin).toBe(4)
      expect(ORG_ROLE_HIERARCHY.manager).toBe(3)
      expect(ORG_ROLE_HIERARCHY.member).toBe(2)
      expect(ORG_ROLE_HIERARCHY.viewer).toBe(1)
    })

    it('should have owner > admin > manager > member > viewer', () => {
      expect(ORG_ROLE_HIERARCHY.owner).toBeGreaterThan(ORG_ROLE_HIERARCHY.admin)
      expect(ORG_ROLE_HIERARCHY.admin).toBeGreaterThan(ORG_ROLE_HIERARCHY.manager)
      expect(ORG_ROLE_HIERARCHY.manager).toBeGreaterThan(ORG_ROLE_HIERARCHY.member)
      expect(ORG_ROLE_HIERARCHY.member).toBeGreaterThan(ORG_ROLE_HIERARCHY.viewer)
    })
  })
})
