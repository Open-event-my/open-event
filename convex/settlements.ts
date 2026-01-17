import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUser } from './lib/auth'
import type { Id } from './_generated/dataModel'

// ============================================================================
// TYPES
// ============================================================================

const settlementStatus = v.union(
  v.literal('pending'),
  v.literal('calculating'),
  v.literal('ready'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('disputed'),
  v.literal('cancelled')
)

// Default commission rate (10%)
const DEFAULT_COMMISSION_RATE = 0.1

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get settlement for an event
 */
export const getByEvent = query({
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
      throw new Error('Not authorized to view this settlement')
    }

    const settlement = await ctx.db
      .query('eventSettlements')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .first()

    return settlement
  },
})

/**
 * Get a settlement by ID
 */
export const get = query({
  args: {
    id: v.id('eventSettlements'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const settlement = await ctx.db.get(args.id)
    if (!settlement) throw new Error('Settlement not found')

    // Verify access
    const event = await ctx.db.get(settlement.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to view this settlement')
    }

    return settlement
  },
})

/**
 * List settlements by status (admin only)
 */
export const listByStatus = query({
  args: {
    status: settlementStatus,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can view all settlements
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to view all settlements')
    }

    const baseQuery = ctx.db
      .query('eventSettlements')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .order('desc')

    const settlements = args.limit ? await baseQuery.take(args.limit) : await baseQuery.collect()

    // Enrich with event info
    const enriched = await Promise.all(
      settlements.map(async (settlement) => {
        const event = await ctx.db
          .query('events')
          .filter((q) => q.eq(q.field('_id'), settlement.eventId))
          .first()
        return {
          ...settlement,
          eventTitle: event?.title || 'Unknown Event',
          eventStatus: event?.status,
        }
      })
    )

    return enriched
  },
})

/**
 * Get commission configuration
 */
export const getCommissionRate = query({
  args: {
    eventId: v.optional(v.id('events')),
    organizationId: v.optional(v.id('organizations')),
  },
  handler: async (ctx, args) => {
    // Try to find organization-specific rate first
    if (args.organizationId) {
      const orgConfig = await ctx.db
        .query('commissionConfig')
        .withIndex('by_organization', (q) => q.eq('appliesToId', args.organizationId))
        .filter((q) => q.eq(q.field('isActive'), true))
        .first()

      if (orgConfig) {
        return {
          rate: orgConfig.rate,
          configId: orgConfig._id,
          type: 'organization' as const,
          name: orgConfig.name,
        }
      }
    }

    // Try to find global rate
    const globalConfig = await ctx.db
      .query('commissionConfig')
      .withIndex('by_type', (q) => q.eq('type', 'global'))
      .filter((q) => q.eq(q.field('isActive'), true))
      .first()

    if (globalConfig) {
      return {
        rate: globalConfig.rate,
        configId: globalConfig._id,
        type: 'global' as const,
        name: globalConfig.name,
      }
    }

    // Return default rate
    return {
      rate: DEFAULT_COMMISSION_RATE,
      configId: undefined,
      type: 'default' as const,
      name: 'Default Commission',
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update settlement for an event
 * This calculates all the numbers based on current data
 */
export const calculate = mutation({
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
      throw new Error('Not authorized to calculate settlement')
    }

    // Get commission rate - try org-specific, then global, then default
    let commissionRate = DEFAULT_COMMISSION_RATE
    let commissionConfigId: Id<'commissionConfig'> | undefined = undefined

    if (event.organizationId) {
      const orgConfig = await ctx.db
        .query('commissionConfig')
        .withIndex('by_organization', (q) => q.eq('appliesToId', event.organizationId))
        .filter((q) => q.eq(q.field('isActive'), true))
        .first()

      if (orgConfig) {
        commissionRate = orgConfig.rate
        commissionConfigId = orgConfig._id
      }
    }

    if (commissionConfigId === undefined) {
      const globalConfig = await ctx.db
        .query('commissionConfig')
        .withIndex('by_type', (q) => q.eq('type', 'global'))
        .filter((q) => q.eq(q.field('isActive'), true))
        .first()

      if (globalConfig) {
        commissionRate = globalConfig.rate
        commissionConfigId = globalConfig._id
      }
    }

    // Get all sponsor payments for this event
    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect()

    let totalSponsorRevenue = 0
    let sponsorPaymentsCount = 0
    let sponsorPaymentsPending = 0

    for (const es of eventSponsors) {
      if (es.paidAmount) {
        totalSponsorRevenue += es.paidAmount
        sponsorPaymentsCount++
      } else if (es.amount && es.paymentStatus !== 'paid') {
        sponsorPaymentsPending++
      }
    }

    // Get ticket revenue from orders
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .filter((q) => q.eq(q.field('paymentStatus'), 'completed'))
      .collect()

    let totalTicketRevenue = 0
    for (const order of orders) {
      totalTicketRevenue += order.total || 0
    }

    // Get vendor payouts
    const eventVendors = await ctx.db
      .query('eventVendors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect()

    let totalVendorPayouts = 0
    let vendorPayoutsCount = 0
    let vendorPayoutsPending = 0

    for (const ev of eventVendors) {
      const amount = ev.payoutAmount || ev.finalBudget || 0
      if (ev.paymentStatus === 'paid') {
        totalVendorPayouts += amount
        vendorPayoutsCount++
      } else if (amount > 0) {
        totalVendorPayouts += amount // Still count for calculation
        vendorPayoutsPending++
      }
    }

    // Calculate totals
    const totalRevenue = totalSponsorRevenue + totalTicketRevenue
    const platformCommission = Math.round(totalRevenue * commissionRate)
    const totalOrganizerPayout = totalRevenue - totalVendorPayouts - platformCommission

    // Check if settlement already exists
    const existingSettlement = await ctx.db
      .query('eventSettlements')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .first()

    const settlementData = {
      eventId: args.eventId,
      organizationId: event.organizationId,
      status: 'calculating' as const,
      totalSponsorRevenue,
      totalTicketRevenue,
      totalRevenue,
      totalVendorPayouts,
      totalOrganizerPayout,
      platformCommission,
      commissionRate,
      commissionConfigId,
      sponsorPaymentsCount,
      vendorPayoutsCount,
      sponsorPaymentsPending,
      vendorPayoutsPending,
      calculatedAt: Date.now(),
      calculatedBy: user._id,
    }

    let settlementId: string

    if (existingSettlement) {
      await ctx.db.patch(existingSettlement._id, settlementData)
      settlementId = existingSettlement._id
    } else {
      settlementId = await ctx.db.insert('eventSettlements', {
        ...settlementData,
        createdAt: Date.now(),
      })
    }

    return {
      settlementId,
      summary: {
        totalRevenue,
        totalSponsorRevenue,
        totalTicketRevenue,
        totalVendorPayouts,
        platformCommission,
        totalOrganizerPayout,
        commissionRate,
        sponsorPaymentsPending,
        vendorPayoutsPending,
      },
    }
  },
})

/**
 * Mark settlement as ready for processing
 */
export const markReady = mutation({
  args: {
    id: v.id('eventSettlements'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const settlement = await ctx.db.get(args.id)
    if (!settlement) throw new Error('Settlement not found')

    // Verify access
    const event = await ctx.db.get(settlement.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to update settlement')
    }

    // Check if event is completed
    if (event.status !== 'completed') {
      throw new Error('Event must be completed before settlement can be marked ready')
    }

    await ctx.db.patch(args.id, {
      status: 'ready',
      approvedBy: user._id,
      approvedAt: Date.now(),
      notes: args.notes,
    })

    return { success: true }
  },
})

/**
 * Start processing settlement (admin only)
 */
export const startProcessing = mutation({
  args: {
    id: v.id('eventSettlements'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can start processing
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Only administrators can start settlement processing')
    }

    const settlement = await ctx.db.get(args.id)
    if (!settlement) throw new Error('Settlement not found')

    if (settlement.status !== 'ready') {
      throw new Error('Settlement must be ready before processing can start')
    }

    await ctx.db.patch(args.id, {
      status: 'processing',
      processingStartedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Mark settlement as completed
 */
export const markCompleted = mutation({
  args: {
    id: v.id('eventSettlements'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can mark as completed
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Only administrators can complete settlements')
    }

    const settlement = await ctx.db.get(args.id)
    if (!settlement) throw new Error('Settlement not found')

    if (settlement.status !== 'processing') {
      throw new Error('Settlement must be processing before it can be completed')
    }

    await ctx.db.patch(args.id, {
      status: 'completed',
      completedAt: Date.now(),
      notes: args.notes || settlement.notes,
    })

    return { success: true }
  },
})

/**
 * Mark settlement as disputed
 */
export const markDisputed = mutation({
  args: {
    id: v.id('eventSettlements'),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const settlement = await ctx.db.get(args.id)
    if (!settlement) throw new Error('Settlement not found')

    // Verify access
    const event = await ctx.db.get(settlement.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Not authorized to dispute settlement')
    }

    await ctx.db.patch(args.id, {
      status: 'disputed',
      notes: args.notes,
    })

    return { success: true }
  },
})

/**
 * Cancel settlement (for cancelled events)
 */
export const cancel = mutation({
  args: {
    id: v.id('eventSettlements'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const settlement = await ctx.db.get(args.id)
    if (!settlement) throw new Error('Settlement not found')

    // Only admins can cancel
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Only administrators can cancel settlements')
    }

    if (settlement.status === 'completed') {
      throw new Error('Cannot cancel completed settlements')
    }

    await ctx.db.patch(args.id, {
      status: 'cancelled',
      notes: args.notes || settlement.notes,
    })

    return { success: true }
  },
})

// ============================================================================
// COMMISSION CONFIG MANAGEMENT
// ============================================================================

/**
 * Create a commission configuration
 */
export const createCommissionConfig = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal('global'),
      v.literal('organization'),
      v.literal('event_type'),
      v.literal('tier')
    ),
    rate: v.number(),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    appliesTo: v.optional(v.string()),
    appliesToId: v.optional(v.id('organizations')),
    activeFrom: v.optional(v.number()),
    activeTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can create commission configs
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Only administrators can create commission configurations')
    }

    // Validate rate
    if (args.rate < 0 || args.rate > 1) {
      throw new Error('Commission rate must be between 0 and 1')
    }

    const configId = await ctx.db.insert('commissionConfig', {
      name: args.name,
      description: args.description,
      type: args.type,
      rate: args.rate,
      minAmount: args.minAmount,
      maxAmount: args.maxAmount,
      appliesTo: args.appliesTo,
      appliesToId: args.appliesToId,
      activeFrom: args.activeFrom || Date.now(),
      activeTo: args.activeTo,
      isActive: true,
      createdAt: Date.now(),
      createdBy: user._id,
    })

    return { configId }
  },
})

/**
 * Update commission configuration
 */
export const updateCommissionConfig = mutation({
  args: {
    id: v.id('commissionConfig'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    rate: v.optional(v.number()),
    minAmount: v.optional(v.number()),
    maxAmount: v.optional(v.number()),
    activeTo: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can update commission configs
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Only administrators can update commission configurations')
    }

    const config = await ctx.db.get(args.id)
    if (!config) throw new Error('Commission configuration not found')

    // Validate rate if provided
    if (args.rate !== undefined && (args.rate < 0 || args.rate > 1)) {
      throw new Error('Commission rate must be between 0 and 1')
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedBy: user._id,
    }

    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.rate !== undefined) updates.rate = args.rate
    if (args.minAmount !== undefined) updates.minAmount = args.minAmount
    if (args.maxAmount !== undefined) updates.maxAmount = args.maxAmount
    if (args.activeTo !== undefined) updates.activeTo = args.activeTo
    if (args.isActive !== undefined) updates.isActive = args.isActive

    await ctx.db.patch(args.id, updates)

    return { success: true }
  },
})

/**
 * List all commission configurations (admin only)
 */
export const listCommissionConfigs = query({
  args: {
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Only admins can view all configs
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Only administrators can view commission configurations')
    }

    if (args.activeOnly) {
      return await ctx.db
        .query('commissionConfig')
        .withIndex('by_active', (q) => q.eq('isActive', true))
        .collect()
    }

    return await ctx.db.query('commissionConfig').collect()
  },
})
