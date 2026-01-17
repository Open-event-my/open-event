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

// ============================================================================
// PAYOUT MUTATIONS (Middleman Model - Platform pays vendors)
// ============================================================================

/**
 * Record vendor invoice received
 */
export const recordInvoiceReceived = mutation({
  args: {
    id: v.id('eventVendors'),
    vendorInvoiceNumber: v.string(),
    payoutAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
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
      throw new Error('Not authorized')
    }

    // Use finalBudget or proposedBudget if payoutAmount not provided
    const payoutAmount = args.payoutAmount || eventVendor.finalBudget || eventVendor.proposedBudget

    await ctx.db.patch(args.id, {
      vendorInvoiceNumber: args.vendorInvoiceNumber,
      vendorInvoiceReceivedAt: Date.now(),
      payoutAmount,
      paymentStatus: 'pending',
      notes: args.notes || eventVendor.notes,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Approve vendor payout
 */
export const approvePayout = mutation({
  args: {
    id: v.id('eventVendors'),
    payoutAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
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

    // Verify access - organizer or admin
    const event = await ctx.db.get(eventVendor.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    if (
      event.organizerId !== currentUser._id &&
      currentUser.role !== 'admin' &&
      currentUser.role !== 'superadmin'
    ) {
      throw new Error('Not authorized to approve payout')
    }

    // Event should be completed before approving payouts
    if (event.status !== 'completed') {
      throw new Error('Event must be completed before approving vendor payouts')
    }

    const payoutAmount =
      args.payoutAmount || eventVendor.payoutAmount || eventVendor.finalBudget || 0

    await ctx.db.patch(args.id, {
      paymentStatus: 'approved',
      payoutAmount,
      payoutApprovedAt: Date.now(),
      payoutApprovedBy: currentUser._id,
      notes: args.notes || eventVendor.notes,
      updatedAt: Date.now(),
    })

    return { success: true, payoutAmount }
  },
})

/**
 * Record vendor payout completed
 */
export const recordPayout = mutation({
  args: {
    id: v.id('eventVendors'),
    payoutAmount: v.number(),
    payoutMethod: v.string(), // 'bank_transfer', 'check', 'cash', 'stripe'
    payoutReference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    // Only admins can record payouts
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw new Error('Only administrators can record vendor payouts')
    }

    const eventVendor = await ctx.db.get(args.id)
    if (!eventVendor) {
      throw new Error('Vendor relationship not found')
    }

    const event = await ctx.db.get(eventVendor.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Create ledger entry
    const ledgerEntryId = await ctx.db.insert('paymentLedger', {
      eventId: eventVendor.eventId,
      organizationId: event.organizationId,
      type: 'vendor_payout',
      grossAmount: args.payoutAmount,
      platformFee: 0,
      netAmount: args.payoutAmount,
      currency: 'usd', // TODO: Get from event
      status: 'settled',
      sourceType: 'platform',
      destinationType: 'vendor',
      destinationId: eventVendor.vendorId.toString(),
      eventVendorId: args.id,
      description: `Vendor payout via ${args.payoutMethod}`,
      notes: args.notes,
      createdAt: Date.now(),
      settledAt: Date.now(),
    })

    // Update vendor record
    await ctx.db.patch(args.id, {
      paymentStatus: 'paid',
      payoutAmount: args.payoutAmount,
      payoutAt: Date.now(),
      payoutMethod: args.payoutMethod,
      payoutReference: args.payoutReference,
      ledgerEntryId,
      notes: args.notes || eventVendor.notes,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      ledgerEntryId,
    }
  },
})

/**
 * Update vendor payment status
 */
export const updatePaymentStatus = mutation({
  args: {
    id: v.id('eventVendors'),
    paymentStatus: v.union(
      v.literal('not_due'),
      v.literal('pending'),
      v.literal('approved'),
      v.literal('processing'),
      v.literal('paid'),
      v.literal('failed'),
      v.literal('disputed')
    ),
    notes: v.optional(v.string()),
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

    // Verify access
    const event = await ctx.db.get(eventVendor.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    if (
      event.organizerId !== currentUser._id &&
      currentUser.role !== 'admin' &&
      currentUser.role !== 'superadmin'
    ) {
      throw new Error('Not authorized to update payment status')
    }

    await ctx.db.patch(args.id, {
      paymentStatus: args.paymentStatus,
      notes: args.notes || eventVendor.notes,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Get payout summary for an event's vendors
 */
export const getPayoutSummary = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Not authenticated')
    }

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    if (
      event.organizerId !== currentUser._id &&
      currentUser.role !== 'admin' &&
      currentUser.role !== 'superadmin'
    ) {
      throw new Error('Not authorized')
    }

    const eventVendors = await ctx.db
      .query('eventVendors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const summary = {
      totalConfirmed: 0,
      totalBudgeted: 0, // Sum of final/proposed budgets
      totalApproved: 0, // Sum of approved payout amounts
      totalPaid: 0, // Sum of actual payouts
      countConfirmed: 0,
      countPending: 0,
      countApproved: 0,
      countPaid: 0,
    }

    for (const ev of eventVendors) {
      if (ev.status === 'confirmed' || ev.status === 'completed') {
        summary.countConfirmed++
        summary.totalBudgeted += ev.finalBudget || ev.proposedBudget || 0

        switch (ev.paymentStatus) {
          case 'pending':
            summary.countPending++
            break
          case 'approved':
          case 'processing':
            summary.countApproved++
            summary.totalApproved += ev.payoutAmount || 0
            break
          case 'paid':
            summary.countPaid++
            summary.totalPaid += ev.payoutAmount || 0
            break
        }
      }
    }

    return summary
  },
})
