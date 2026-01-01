import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUser } from './lib/auth'

/**
 * Event-Sponsor relationship mutations
 * Used by the AI agent to add sponsors to events
 */

/**
 * Add a sponsor to an event (create inquiry)
 * Used by AI agent when user wants to add a sponsor
 */
export const addToEvent = mutation({
  args: {
    eventId: v.id('events'),
    sponsorId: v.id('sponsors'),
    tier: v.optional(v.string()),
    proposedAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    // Verify event exists and belongs to user
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    if (event.organizerId !== currentUser._id) {
      throw new Error('Not authorized to modify this event')
    }

    // Verify sponsor exists
    const sponsor = await ctx.db.get(args.sponsorId)
    if (!sponsor) {
      throw new Error('Sponsor not found')
    }

    // Check if relationship already exists
    const existing = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .filter((q) => q.eq(q.field('sponsorId'), args.sponsorId))
      .first()

    if (existing) {
      // Return existing relationship instead of throwing
      return {
        id: existing._id,
        existed: true,
        sponsorName: sponsor.name,
        status: existing.status,
        tier: existing.tier,
      }
    }

    // Create event-sponsor relationship
    const id = await ctx.db.insert('eventSponsors', {
      eventId: args.eventId,
      sponsorId: args.sponsorId,
      status: 'inquiry',
      tier: args.tier,
      amount: args.proposedAmount,
      notes: args.notes,
      createdAt: Date.now(),
    })

    return {
      id,
      existed: false,
      sponsorName: sponsor.name,
      status: 'inquiry',
      tier: args.tier,
    }
  },
})

/**
 * Update sponsor relationship status
 */
export const updateStatus = mutation({
  args: {
    id: v.id('eventSponsors'),
    status: v.string(),
    tier: v.optional(v.string()),
    amount: v.optional(v.number()),
    benefits: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    // Get the event-sponsor relationship
    const eventSponsor = await ctx.db.get(args.id)
    if (!eventSponsor) {
      throw new Error('Sponsor relationship not found')
    }

    // Verify event belongs to user
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event || event.organizerId !== currentUser._id) {
      throw new Error('Not authorized to modify this relationship')
    }

    // Validate status transition
    const validStatuses = ['inquiry', 'negotiating', 'confirmed', 'declined']
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status: ${args.status}`)
    }

    // Update the relationship
    await ctx.db.patch(args.id, {
      status: args.status,
      tier: args.tier,
      amount: args.amount,
      benefits: args.benefits,
      notes: args.notes,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Remove sponsor from event
 */
export const removeFromEvent = mutation({
  args: {
    id: v.id('eventSponsors'),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    const eventSponsor = await ctx.db.get(args.id)
    if (!eventSponsor) {
      throw new Error('Sponsor relationship not found')
    }

    // Verify event belongs to user
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event || event.organizerId !== currentUser._id) {
      throw new Error('Not authorized to modify this relationship')
    }

    await ctx.db.delete(args.id)
    return { success: true }
  },
})

/**
 * List sponsors for an event
 */
export const listForEvent = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      return []
    }

    // Verify event belongs to user
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== currentUser._id) {
      return []
    }

    // Get all sponsor relationships for this event
    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    // Fetch sponsor details for each
    const sponsorsWithDetails = await Promise.all(
      eventSponsors.map(async (es) => {
        const sponsor = await ctx.db.get(es.sponsorId)
        return {
          ...es,
          sponsor: sponsor
            ? {
                id: sponsor._id,
                name: sponsor.name,
                industry: sponsor.industry,
                budgetMin: sponsor.budgetMin,
                budgetMax: sponsor.budgetMax,
              }
            : null,
        }
      })
    )

    return sponsorsWithDetails.filter((s) => s.sponsor !== null)
  },
})
