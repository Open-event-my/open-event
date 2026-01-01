import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUser } from './lib/auth'

/**
 * Event-Vendor relationship mutations
 * Used by the AI agent to add vendors to events
 */

/**
 * Add a vendor to an event (create inquiry)
 * Used by AI agent when user wants to add a vendor
 */
export const addToEvent = mutation({
  args: {
    eventId: v.id('events'),
    vendorId: v.id('vendors'),
    proposedBudget: v.optional(v.number()),
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

    // Verify vendor exists
    const vendor = await ctx.db.get(args.vendorId)
    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Check if relationship already exists
    const existing = await ctx.db
      .query('eventVendors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .filter((q) => q.eq(q.field('vendorId'), args.vendorId))
      .first()

    if (existing) {
      // Return existing relationship instead of throwing
      return {
        id: existing._id,
        existed: true,
        vendorName: vendor.name,
        status: existing.status,
      }
    }

    // Create event-vendor relationship
    const id = await ctx.db.insert('eventVendors', {
      eventId: args.eventId,
      vendorId: args.vendorId,
      status: 'inquiry',
      proposedBudget: args.proposedBudget,
      notes: args.notes,
      createdAt: Date.now(),
    })

    return {
      id,
      existed: false,
      vendorName: vendor.name,
      status: 'inquiry',
    }
  },
})

/**
 * Update vendor relationship status
 */
export const updateStatus = mutation({
  args: {
    id: v.id('eventVendors'),
    status: v.string(),
    finalBudget: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    // Get the event-vendor relationship
    const eventVendor = await ctx.db.get(args.id)
    if (!eventVendor) {
      throw new Error('Vendor relationship not found')
    }

    // Verify event belongs to user
    const event = await ctx.db.get(eventVendor.eventId)
    if (!event || event.organizerId !== currentUser._id) {
      throw new Error('Not authorized to modify this relationship')
    }

    // Validate status transition
    const validStatuses = ['inquiry', 'negotiating', 'confirmed', 'declined', 'completed']
    if (!validStatuses.includes(args.status)) {
      throw new Error(`Invalid status: ${args.status}`)
    }

    // Update the relationship
    await ctx.db.patch(args.id, {
      status: args.status,
      finalBudget: args.finalBudget,
      notes: args.notes,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Remove vendor from event
 */
export const removeFromEvent = mutation({
  args: {
    id: v.id('eventVendors'),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    const eventVendor = await ctx.db.get(args.id)
    if (!eventVendor) {
      throw new Error('Vendor relationship not found')
    }

    // Verify event belongs to user
    const event = await ctx.db.get(eventVendor.eventId)
    if (!event || event.organizerId !== currentUser._id) {
      throw new Error('Not authorized to modify this relationship')
    }

    await ctx.db.delete(args.id)
    return { success: true }
  },
})

/**
 * List vendors for an event
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

    // Get all vendor relationships for this event
    const eventVendors = await ctx.db
      .query('eventVendors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    // Fetch vendor details for each
    const vendorsWithDetails = await Promise.all(
      eventVendors.map(async (ev) => {
        const vendor = await ctx.db.get(ev.vendorId)
        return {
          ...ev,
          vendor: vendor
            ? {
                id: vendor._id,
                name: vendor.name,
                category: vendor.category,
                rating: vendor.rating,
                priceRange: vendor.priceRange,
              }
            : null,
        }
      })
    )

    return vendorsWithDetails.filter((v) => v.vendor !== null)
  },
})
