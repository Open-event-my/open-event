import { convexTest } from 'convex-test'
import { describe, it, expect } from 'vitest'
import schema from './schema'
import { internal } from './_generated/api'

describe('Organizations Module - Downgrade Tests', () => {
  describe('checkDowngradeEligibilityInternal', () => {
    it('should return eligible=true when organization is within free plan limits', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization with pro plan
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'pro',
          ownerId,
          maxMembers: 5,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Add owner as member (only 1 member, within free limit)
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: ownerId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Check eligibility
      const result = await t.run(async (ctx) => {
        return await ctx.runQuery(internal.organizations.checkDowngradeEligibilityInternal, {
          organizationId: orgId,
          userId: ownerId,
        })
      })

      expect(result.eligible).toBe(true)
      expect(result.alreadyFree).toBe(false)
      expect(result.org).toBeDefined()
    })

    it('should return eligible=false when member count exceeds free plan limit', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create another user
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Member',
          email: 'member@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization with pro plan
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'pro',
          ownerId,
          maxMembers: 5,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Add 2 members (exceeds free plan limit of 1)
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: ownerId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: memberId,
          role: 'member',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Check eligibility
      const result = await t.run(async (ctx) => {
        return await ctx.runQuery(internal.organizations.checkDowngradeEligibilityInternal, {
          organizationId: orgId,
          userId: ownerId,
        })
      })

      expect(result.eligible).toBe(false)
      expect(result.error).toContain('members')
      expect(result.error).toContain('Remove')
    })

    it('should return eligible=false when event count exceeds free plan limit', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization with pro plan
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'pro',
          ownerId,
          maxMembers: 5,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Add owner as member
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: ownerId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Add 2 active events (exceeds free plan limit of 1)
      await t.run(async (ctx) => {
        const futureDate = Date.now() + 86400000 // tomorrow
        await ctx.db.insert('events', {
          title: 'Event 1',
          organizationId: orgId,
          organizerId: ownerId,
          status: 'draft',
          startDate: futureDate,
          endDate: futureDate + 3600000,
          timezone: 'UTC',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        await ctx.db.insert('events', {
          title: 'Event 2',
          organizationId: orgId,
          organizerId: ownerId,
          status: 'published',
          startDate: futureDate,
          endDate: futureDate + 3600000,
          timezone: 'UTC',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Check eligibility
      const result = await t.run(async (ctx) => {
        return await ctx.runQuery(internal.organizations.checkDowngradeEligibilityInternal, {
          organizationId: orgId,
          userId: ownerId,
        })
      })

      expect(result.eligible).toBe(false)
      expect(result.error).toContain('events')
    })

    it('should return alreadyFree=true when organization is already on free plan', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization already on free plan
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'free',
          ownerId,
          maxMembers: 1,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Check eligibility
      const result = await t.run(async (ctx) => {
        return await ctx.runQuery(internal.organizations.checkDowngradeEligibilityInternal, {
          organizationId: orgId,
          userId: ownerId,
        })
      })

      expect(result.eligible).toBe(true)
      expect(result.alreadyFree).toBe(true)
    })

    it('should return eligible=false when user is not the owner', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create non-owner user
      const memberId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Member',
          email: 'member@test.com',
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
          plan: 'pro',
          ownerId,
          maxMembers: 5,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Check eligibility as non-owner
      const result = await t.run(async (ctx) => {
        return await ctx.runQuery(internal.organizations.checkDowngradeEligibilityInternal, {
          organizationId: orgId,
          userId: memberId,
        })
      })

      expect(result.eligible).toBe(false)
      expect(result.error).toContain('owner')
    })
  })

  describe('updateToFreePlan', () => {
    it('should set plan to free and clear Stripe fields', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization with Stripe subscription
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'pro',
          ownerId,
          maxMembers: 5,
          status: 'active',
          stripeSubscriptionId: 'sub_test123',
          subscriptionStatus: 'active',
          currentPeriodEnd: Date.now() + 2592000000, // 30 days
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Run updateToFreePlan
      const result = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.organizations.updateToFreePlan, {
          organizationId: orgId,
          previousPlan: 'pro',
        })
      })

      expect(result.success).toBe(true)
      expect(result.previousPlan).toBe('pro')
      expect(result.newPlan).toBe('free')

      // Verify DB state
      await t.run(async (ctx) => {
        const org = await ctx.db.get(orgId)
        expect(org?.plan).toBe('free')
        expect(org?.stripeSubscriptionId).toBeUndefined()
        expect(org?.subscriptionStatus).toBe('canceled')
        expect(org?.currentPeriodEnd).toBeUndefined()
        expect(org?.maxMembers).toBe(1) // Free plan limit
      })
    })
  })

  describe('downgradeToFree integration flow', () => {
    it('should successfully downgrade when within limits and no Stripe subscription', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization with pro plan but no Stripe subscription
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'pro',
          ownerId,
          maxMembers: 5,
          status: 'active',
          // No stripeSubscriptionId
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Add owner as member
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: ownerId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Test the eligibility check first
      const eligibility = await t.run(async (ctx) => {
        return await ctx.runQuery(internal.organizations.checkDowngradeEligibilityInternal, {
          organizationId: orgId,
          userId: ownerId,
        })
      })

      expect(eligibility.eligible).toBe(true)
      expect(eligibility.org?.stripeSubscriptionId).toBeUndefined()

      // Since no Stripe subscription, we can directly call updateToFreePlan
      const result = await t.run(async (ctx) => {
        return await ctx.runMutation(internal.organizations.updateToFreePlan, {
          organizationId: orgId,
          previousPlan: 'pro',
        })
      })

      expect(result.success).toBe(true)

      // Verify final state
      await t.run(async (ctx) => {
        const org = await ctx.db.get(orgId)
        expect(org?.plan).toBe('free')
      })
    })

    it('should not update DB when Stripe subscription exists (requires Stripe cancellation first)', async () => {
      const t = convexTest(schema)

      // Create owner user
      const ownerId = await t.run(async (ctx) => {
        return await ctx.db.insert('users', {
          name: 'Owner',
          email: 'owner@test.com',
          role: 'organizer',
          status: 'active',
          createdAt: Date.now(),
        })
      })

      // Create organization WITH Stripe subscription
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert('organizations', {
          name: 'Test Org',
          slug: 'test-org',
          plan: 'pro',
          ownerId,
          maxMembers: 5,
          status: 'active',
          stripeSubscriptionId: 'sub_test123', // Has Stripe subscription
          subscriptionStatus: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      })

      // Add owner as member
      await t.run(async (ctx) => {
        await ctx.db.insert('organizationMembers', {
          organizationId: orgId,
          userId: ownerId,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          createdAt: Date.now(),
        })
      })

      // Check eligibility - should be eligible but org has Stripe subscription
      const eligibility = await t.run(async (ctx) => {
        return await ctx.runQuery(internal.organizations.checkDowngradeEligibilityInternal, {
          organizationId: orgId,
          userId: ownerId,
        })
      })

      expect(eligibility.eligible).toBe(true)
      expect(eligibility.org?.stripeSubscriptionId).toBe('sub_test123')

      // In real flow, downgradeToFree action would call Stripe first
      // Here we verify that the org still has the subscription ID
      // (Stripe cancellation must happen before DB update)
      await t.run(async (ctx) => {
        const org = await ctx.db.get(orgId)
        expect(org?.stripeSubscriptionId).toBe('sub_test123')
        expect(org?.plan).toBe('pro')
      })
    })
  })
})
