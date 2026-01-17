import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUser } from './lib/auth'

// ============================================================================
// TYPES
// ============================================================================

const ledgerType = v.union(
  v.literal('sponsor_payment'),
  v.literal('ticket_revenue'),
  v.literal('vendor_payout'),
  v.literal('organizer_payout'),
  v.literal('commission'),
  v.literal('refund')
)

const ledgerStatus = v.union(
  v.literal('pending'),
  v.literal('held'),
  v.literal('released'),
  v.literal('settled'),
  v.literal('refunded'),
  v.literal('failed')
)

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all ledger entries for an event
 */
export const listByEvent = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify access to event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error("Not authorized to view this event's ledger")
    }

    const entries = await ctx.db
      .query('paymentLedger')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .order('desc')
      .collect()

    return entries
  },
})

/**
 * Get a single ledger entry by ID
 */
export const get = query({
  args: {
    id: v.id('paymentLedger'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const entry = await ctx.db.get(args.id)
    if (!entry) throw new Error('Ledger entry not found')

    // Verify access
    const event = await ctx.db.get(entry.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to view this ledger entry')
    }

    return entry
  },
})

/**
 * Get ledger entries by status
 */
export const listByStatus = query({
  args: {
    status: ledgerStatus,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can view all entries by status
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to view ledger by status')
    }

    const baseQuery = ctx.db
      .query('paymentLedger')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')

    return args.limit ? await baseQuery.take(args.limit) : await baseQuery.collect()
  },
})

/**
 * Get ledger entries by type
 */
export const listByType = query({
  args: {
    type: ledgerType,
    eventId: v.optional(v.id('events')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    let entries = await ctx.db
      .query('paymentLedger')
      .withIndex('by_type', (q) => q.eq('type', args.type))
      .order('desc')
      .collect()

    // Filter by event if specified
    if (args.eventId) {
      const event = await ctx.db.get(args.eventId)
      if (!event) throw new Error('Event not found')
      if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
        throw new Error("Not authorized to view this event's ledger")
      }
      entries = entries.filter((e) => e.eventId === args.eventId)
    } else {
      // Only admins can view all entries
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        throw new Error('Not authorized to view all ledger entries')
      }
    }

    if (args.limit) {
      entries = entries.slice(0, args.limit)
    }

    return entries
  },
})

/**
 * Get ledger summary for an event
 */
export const getEventSummary = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify access to event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error("Not authorized to view this event's ledger")
    }

    const entries = await ctx.db
      .query('paymentLedger')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    // Calculate totals by type
    const summary = {
      totalSponsorPayments: 0,
      totalTicketRevenue: 0,
      totalVendorPayouts: 0,
      totalOrganizerPayouts: 0,
      totalCommission: 0,
      totalRefunds: 0,
      pendingAmount: 0,
      heldAmount: 0,
      settledAmount: 0,
      entriesCount: entries.length,
    }

    for (const entry of entries) {
      switch (entry.type) {
        case 'sponsor_payment':
          summary.totalSponsorPayments += entry.grossAmount
          break
        case 'ticket_revenue':
          summary.totalTicketRevenue += entry.grossAmount
          break
        case 'vendor_payout':
          summary.totalVendorPayouts += entry.grossAmount
          break
        case 'organizer_payout':
          summary.totalOrganizerPayouts += entry.grossAmount
          break
        case 'commission':
          summary.totalCommission += entry.grossAmount
          break
        case 'refund':
          summary.totalRefunds += entry.grossAmount
          break
      }

      switch (entry.status) {
        case 'pending':
          summary.pendingAmount += entry.grossAmount
          break
        case 'held':
          summary.heldAmount += entry.grossAmount
          break
        case 'settled':
          summary.settledAmount += entry.grossAmount
          break
      }
    }

    return summary
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new ledger entry
 */
export const create = mutation({
  args: {
    eventId: v.id('events'),
    organizationId: v.optional(v.id('organizations')),
    type: ledgerType,
    grossAmount: v.number(),
    platformFee: v.number(),
    netAmount: v.number(),
    currency: v.string(),
    status: ledgerStatus,
    sourceType: v.optional(v.string()),
    sourceId: v.optional(v.string()),
    destinationType: v.optional(v.string()),
    destinationId: v.optional(v.string()),
    eventSponsorId: v.optional(v.id('eventSponsors')),
    eventVendorId: v.optional(v.id('eventVendors')),
    orderId: v.optional(v.id('orders')),
    stripePaymentIntentId: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify access to event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to create ledger entries for this event')
    }

    const entryId = await ctx.db.insert('paymentLedger', {
      ...args,
      createdAt: Date.now(),
      heldAt: args.status === 'held' ? Date.now() : undefined,
    })

    return { entryId }
  },
})

/**
 * Update ledger entry status
 */
export const updateStatus = mutation({
  args: {
    id: v.id('paymentLedger'),
    status: ledgerStatus,
    notes: v.optional(v.string()),
    stripeTransferId: v.optional(v.string()),
    stripeRefundId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const entry = await ctx.db.get(args.id)
    if (!entry) throw new Error('Ledger entry not found')

    // Verify access
    const event = await ctx.db.get(entry.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to update this ledger entry')
    }

    const updates: Record<string, unknown> = {
      status: args.status,
    }

    // Set timestamps based on status change
    if (args.status === 'held' && !entry.heldAt) {
      updates.heldAt = Date.now()
    }
    if (args.status === 'released' && !entry.releasedAt) {
      updates.releasedAt = Date.now()
    }
    if (args.status === 'settled' && !entry.settledAt) {
      updates.settledAt = Date.now()
    }

    if (args.notes) {
      updates.notes = args.notes
    }
    if (args.stripeTransferId) {
      updates.stripeTransferId = args.stripeTransferId
    }
    if (args.stripeRefundId) {
      updates.stripeRefundId = args.stripeRefundId
    }

    await ctx.db.patch(args.id, updates)

    return { success: true }
  },
})

/**
 * Mark entry as held (payment received, awaiting event completion)
 */
export const markHeld = mutation({
  args: {
    id: v.id('paymentLedger'),
    stripePaymentIntentId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const entry = await ctx.db.get(args.id)
    if (!entry) throw new Error('Ledger entry not found')

    // Verify access
    const event = await ctx.db.get(entry.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to update this ledger entry')
    }

    await ctx.db.patch(args.id, {
      status: 'held',
      heldAt: Date.now(),
      stripePaymentIntentId: args.stripePaymentIntentId || entry.stripePaymentIntentId,
      notes: args.notes || entry.notes,
    })

    return { success: true }
  },
})

/**
 * Release held funds (after event completion)
 */
export const release = mutation({
  args: {
    id: v.id('paymentLedger'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const entry = await ctx.db.get(args.id)
    if (!entry) throw new Error('Ledger entry not found')

    if (entry.status !== 'held') {
      throw new Error('Can only release held funds')
    }

    // Verify access
    const event = await ctx.db.get(entry.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to release funds')
    }

    await ctx.db.patch(args.id, {
      status: 'released',
      releasedAt: Date.now(),
      notes: args.notes || entry.notes,
    })

    return { success: true }
  },
})

/**
 * Mark entry as settled (payout completed)
 */
export const markSettled = mutation({
  args: {
    id: v.id('paymentLedger'),
    stripeTransferId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const entry = await ctx.db.get(args.id)
    if (!entry) throw new Error('Ledger entry not found')

    // Verify access
    const event = await ctx.db.get(entry.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to settle funds')
    }

    await ctx.db.patch(args.id, {
      status: 'settled',
      settledAt: Date.now(),
      stripeTransferId: args.stripeTransferId || entry.stripeTransferId,
      notes: args.notes || entry.notes,
    })

    return { success: true }
  },
})

/**
 * Mark entry as refunded
 */
export const markRefunded = mutation({
  args: {
    id: v.id('paymentLedger'),
    stripeRefundId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const entry = await ctx.db.get(args.id)
    if (!entry) throw new Error('Ledger entry not found')

    // Verify access
    const event = await ctx.db.get(entry.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to refund')
    }

    await ctx.db.patch(args.id, {
      status: 'refunded',
      stripeRefundId: args.stripeRefundId,
      notes: args.notes || entry.notes,
    })

    return { success: true }
  },
})

/**
 * Delete a ledger entry (admin only, for corrections)
 */
export const remove = mutation({
  args: {
    id: v.id('paymentLedger'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can delete ledger entries
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Only administrators can delete ledger entries')
    }

    const entry = await ctx.db.get(args.id)
    if (!entry) throw new Error('Ledger entry not found')

    // Don't allow deletion of settled entries
    if (entry.status === 'settled') {
      throw new Error('Cannot delete settled ledger entries')
    }

    await ctx.db.delete(args.id)

    return { success: true }
  },
})

// ============================================================================
// INTERNAL HELPERS (for use by other Convex functions)
// ============================================================================

/**
 * Create a sponsor payment ledger entry (internal use)
 */
export const createSponsorPaymentEntry = mutation({
  args: {
    eventId: v.id('events'),
    eventSponsorId: v.id('eventSponsors'),
    sponsorId: v.string(),
    grossAmount: v.number(),
    platformFee: v.number(),
    currency: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert('paymentLedger', {
      eventId: args.eventId,
      type: 'sponsor_payment',
      grossAmount: args.grossAmount,
      platformFee: args.platformFee,
      netAmount: args.grossAmount - args.platformFee,
      currency: args.currency,
      status: 'held',
      sourceType: 'sponsor',
      sourceId: args.sponsorId,
      destinationType: 'platform',
      eventSponsorId: args.eventSponsorId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      description: args.description || 'Sponsor payment',
      createdAt: Date.now(),
      heldAt: Date.now(),
    })

    return { entryId }
  },
})

/**
 * Create a vendor payout ledger entry (internal use)
 */
export const createVendorPayoutEntry = mutation({
  args: {
    eventId: v.id('events'),
    eventVendorId: v.id('eventVendors'),
    vendorId: v.string(),
    grossAmount: v.number(),
    currency: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert('paymentLedger', {
      eventId: args.eventId,
      type: 'vendor_payout',
      grossAmount: args.grossAmount,
      platformFee: 0, // Platform doesn't take fee from vendor payouts
      netAmount: args.grossAmount,
      currency: args.currency,
      status: 'pending',
      sourceType: 'platform',
      destinationType: 'vendor',
      destinationId: args.vendorId,
      eventVendorId: args.eventVendorId,
      description: args.description || 'Vendor payout',
      createdAt: Date.now(),
    })

    return { entryId }
  },
})
