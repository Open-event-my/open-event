import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'

/**
 * SIMULATION TOOLS FOR TESTING SUBSCRIPTIONS
 *
 * Use these mutations to simulate Stripe webhooks and test subscription flows
 * without needing a real Stripe account or webhook forwarding.
 */

/**
 * Simulate a successful upgrade to a paid plan (Pro or Business)
 *
 * Usage:
 * npx convex run testing:simulateUpgrade --args '{"organizationId": "your_org_id", "plan": "pro"}'
 */
export const simulateUpgrade = mutation({
  args: {
    organizationId: v.id('organizations'),
    plan: v.union(v.literal('pro'), v.literal('business')),
  },
  handler: async (ctx, args) => {
    const now = Math.floor(Date.now() / 1000)
    const currentPeriodEnd = now + 30 * 24 * 60 * 60 // 30 days from now

    // Generate fake Stripe IDs
    const subscriptionId = `sub_simulated_${Date.now()}`
    const customerId = `cus_simulated_${Date.now()}`

    // Call the internal handler that normally processes the Stripe webhook
    await ctx.runMutation(internal.stripe.handleSubscriptionCheckoutComplete, {
      organizationId: args.organizationId,
      subscriptionId,
      plan: args.plan,
      customerId,
      currentPeriodEnd,
    })

    return {
      success: true,
      message: `Successfully simulated upgrade to ${args.plan} plan`,
      simulatedData: {
        subscriptionId,
        customerId,
        currentPeriodEnd,
      },
    }
  },
})

/**
 * Simulate a subscription cancellation (downgrade to Free)
 *
 * Usage:
 * npx convex run testing:simulateCancellation --args '{"organizationId": "your_org_id"}'
 */
export const simulateCancellation = mutation({
  args: {
    organizationId: v.id('organizations'),
    immediate: v.optional(v.boolean()), // If true, cancels immediately. If false, marks for cancellation at period end.
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId)
    if (!org) throw new Error('Organization not found')

    if (!org.stripeSubscriptionId) {
      return {
        success: false,
        message: 'Organization does not have an active subscription',
      }
    }

    if (args.immediate) {
      // Simulate immediate deletion (webhook: customer.subscription.deleted)
      await ctx.runMutation(internal.stripe.handleSubscriptionDeleted, {
        subscriptionId: org.stripeSubscriptionId,
      })
      return { success: true, message: 'Simulated immediate cancellation (downgrade to Free)' }
    } else {
      // Simulate update to cancel at period end (webhook: customer.subscription.updated)
      await ctx.runMutation(internal.stripe.handleSubscriptionUpdated, {
        subscriptionId: org.stripeSubscriptionId,
        status: 'active',
        currentPeriodEnd: org.currentPeriodEnd ? org.currentPeriodEnd / 1000 : Math.floor(Date.now() / 1000),
        cancelAtPeriodEnd: true,
      })
      return { success: true, message: 'Simulated cancellation at period end' }
    }
  },
})

/**
 * Helper to get organization ID by slug (easier to use from CLI)
 */
export const getOrgBySlug = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()

    if (!org) return { error: `Organization with slug "${args.slug}" not found` }
    return { _id: org._id, name: org.name, plan: org.plan }
  },
})

export const listAllOrgs = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations').collect()
    return orgs.map(o => ({ _id: o._id, slug: o.slug, name: o.name, plan: o.plan }))
  }
})

/**
 * Helper to get the latest email verification token for a user (by email)
 */
export const getLatestVerificationToken = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()

    if (!user) return { error: `User with email "${args.email}" not found` }

    // Find the most recent unused email verification token
    const tokens = await ctx.db
      .query('verificationTokens')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('type', 'email_verification'))
      .filter((q) => q.eq(q.field('used'), false))
      .collect()
    
    // Sort by createdAt descending in code since we can't sort by createdAt in the index above easily without compound index
    const latestToken = tokens.sort((a, b) => b.createdAt - a.createdAt)[0]

    if (!latestToken) return { error: 'No active verification token found' }

    return { 
      token: latestToken.token,
      userId: user._id,
      email: user.email 
    }
  },
})

/**
 * Helper to get the latest password reset token for a user (by email)
 */
export const getLatestPasswordResetToken = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()

    if (!user) return { error: `User with email "${args.email}" not found` }

    // Find the most recent unused password reset token
    const tokens = await ctx.db
      .query('verificationTokens')
      .withIndex('by_user_type', (q) => q.eq('userId', user._id).eq('type', 'password_reset'))
      .filter((q) => q.eq(q.field('used'), false))
      .collect()
    
    const latestToken = tokens.sort((a, b) => b.createdAt - a.createdAt)[0]

    if (!latestToken) return { error: 'No active password reset token found', allTokens: await ctx.db.query('verificationTokens').withIndex('by_user_type', q => q.eq('userId', user._id)).collect() }

    return { 
      token: latestToken.token,
      userId: user._id,
      email: user.email 
    }
  },
})
