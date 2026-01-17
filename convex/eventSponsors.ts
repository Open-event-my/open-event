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
 * Get a single event-sponsor relationship by ID
 */
export const get = query({
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
      return null
    }

    // Verify event belongs to user
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event || event.organizerId !== currentUser._id) {
      throw new Error('Not authorized to view this relationship')
    }

    // Get sponsor details
    const sponsor = await ctx.db.get(eventSponsor.sponsorId)

    return {
      ...eventSponsor,
      sponsor: sponsor
        ? {
            id: sponsor._id,
            name: sponsor.name,
            industry: sponsor.industry,
            budgetMin: sponsor.budgetMin,
            budgetMax: sponsor.budgetMax,
            contactEmail: sponsor.contactEmail,
            contactName: sponsor.contactName,
          }
        : null,
    }
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

// ============================================================================
// PAYMENT MUTATIONS (Middleman Model)
// ============================================================================

/**
 * Send invoice to sponsor (mark as invoice_sent)
 */
export const sendInvoice = mutation({
  args: {
    id: v.id('eventSponsors'),
    invoiceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
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
      throw new Error('Not authorized to send invoice')
    }

    // Must be confirmed to send invoice
    if (eventSponsor.status !== 'confirmed') {
      throw new Error('Sponsor must be confirmed before sending invoice')
    }

    // Must have an amount set
    if (!eventSponsor.amount || eventSponsor.amount <= 0) {
      throw new Error('Sponsorship amount must be set before sending invoice')
    }

    // Generate invoice number if not provided
    const invoiceNumber =
      args.invoiceNumber || `INV-${Date.now()}-${eventSponsor._id.slice(-6).toUpperCase()}`

    await ctx.db.patch(args.id, {
      paymentStatus: 'invoice_sent',
      invoiceSentAt: Date.now(),
      invoiceNumber,
      notes: args.notes || eventSponsor.notes,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      invoiceNumber,
      amount: eventSponsor.amount,
    }
  },
})

/**
 * Record manual payment (for offline payments like bank transfer, check)
 */
export const recordManualPayment = mutation({
  args: {
    id: v.id('eventSponsors'),
    paidAmount: v.number(),
    paymentMethod: v.string(), // 'bank_transfer', 'check', 'cash'
    notes: v.optional(v.string()),
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

    // Verify event belongs to user or is admin
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    if (
      event.organizerId !== currentUser._id &&
      currentUser.role !== 'admin' &&
      currentUser.role !== 'superadmin'
    ) {
      throw new Error('Not authorized to record payment')
    }

    // Create ledger entry
    const ledgerEntryId = await ctx.db.insert('paymentLedger', {
      eventId: eventSponsor.eventId,
      organizationId: event.organizationId,
      type: 'sponsor_payment',
      grossAmount: args.paidAmount,
      platformFee: 0, // Will be calculated at settlement
      netAmount: args.paidAmount,
      currency: 'usd', // TODO: Get from event/sponsor
      status: 'held',
      sourceType: 'sponsor',
      sourceId: eventSponsor.sponsorId.toString(),
      destinationType: 'platform',
      eventSponsorId: args.id,
      description: `Sponsor payment via ${args.paymentMethod}`,
      notes: args.notes,
      createdAt: Date.now(),
      heldAt: Date.now(),
    })

    // Update sponsor record
    await ctx.db.patch(args.id, {
      paymentStatus: 'held',
      paidAt: Date.now(),
      paidAmount: args.paidAmount,
      paymentMethod: args.paymentMethod,
      ledgerEntryId,
      notes: args.notes || eventSponsor.notes,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      ledgerEntryId,
    }
  },
})

/**
 * Update payment status (admin use)
 */
export const updatePaymentStatus = mutation({
  args: {
    id: v.id('eventSponsors'),
    paymentStatus: v.union(
      v.literal('not_required'),
      v.literal('pending'),
      v.literal('invoice_sent'),
      v.literal('paid'),
      v.literal('held'),
      v.literal('released'),
      v.literal('refunded'),
      v.literal('failed')
    ),
    notes: v.optional(v.string()),
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

    // Verify access
    const event = await ctx.db.get(eventSponsor.eventId)
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

    // Update sponsor record
    await ctx.db.patch(args.id, {
      paymentStatus: args.paymentStatus,
      notes: args.notes || eventSponsor.notes,
      updatedAt: Date.now(),
    })

    // Update ledger entry if exists
    if (eventSponsor.ledgerEntryId) {
      const ledgerStatus =
        args.paymentStatus === 'held'
          ? 'held'
          : args.paymentStatus === 'released'
            ? 'released'
            : args.paymentStatus === 'refunded'
              ? 'refunded'
              : args.paymentStatus === 'failed'
                ? 'failed'
                : undefined

      if (ledgerStatus) {
        await ctx.db.patch(eventSponsor.ledgerEntryId, {
          status: ledgerStatus,
          ...(ledgerStatus === 'held' && { heldAt: Date.now() }),
          ...(ledgerStatus === 'released' && { releasedAt: Date.now() }),
        })
      }
    }

    return { success: true }
  },
})

/**
 * Mark sponsor payment as not required (e.g., in-kind sponsorship)
 */
export const markPaymentNotRequired = mutation({
  args: {
    id: v.id('eventSponsors'),
    notes: v.optional(v.string()),
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

    // Verify access
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event || event.organizerId !== currentUser._id) {
      throw new Error('Not authorized')
    }

    await ctx.db.patch(args.id, {
      paymentStatus: 'not_required',
      notes: args.notes || eventSponsor.notes,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Get payment summary for an event's sponsors
 */
export const getPaymentSummary = query({
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

    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const summary = {
      totalConfirmed: 0,
      totalExpected: 0, // Sum of amounts for confirmed sponsors
      totalReceived: 0, // Sum of paid amounts
      totalHeld: 0, // Amount currently held
      countConfirmed: 0,
      countPaid: 0,
      countPending: 0,
      countInvoiceSent: 0,
    }

    for (const es of eventSponsors) {
      if (es.status === 'confirmed') {
        summary.countConfirmed++
        summary.totalExpected += es.amount || 0

        if (es.paymentStatus === 'paid' || es.paymentStatus === 'held') {
          summary.countPaid++
          summary.totalReceived += es.paidAmount || 0
          if (es.paymentStatus === 'held') {
            summary.totalHeld += es.paidAmount || 0
          }
        } else if (es.paymentStatus === 'invoice_sent') {
          summary.countInvoiceSent++
        } else if (es.paymentStatus === 'pending' || !es.paymentStatus) {
          summary.countPending++
        }
      }
    }

    return summary
  },
})
