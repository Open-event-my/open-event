import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { getCurrentUser } from './lib/auth'

// Budget categories with display info
export const BUDGET_CATEGORIES = [
  { value: 'venue', label: 'Venue & Facilities' },
  { value: 'catering', label: 'Catering & F&B' },
  { value: 'av', label: 'AV & Technology' },
  { value: 'marketing', label: 'Marketing & Promo' },
  { value: 'staffing', label: 'Staffing & Labor' },
  { value: 'permits', label: 'Permits & Insurance' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'decoration', label: 'Decoration & Design' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'misc', label: 'Miscellaneous' },
] as const

// Get all budget items for an event
export const listByEvent = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== user._id) return []

    return await ctx.db
      .query('budgetItems')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
  },
})

// Get budget summary for an event
export const getSummary = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== user._id) return null

    const items = await ctx.db
      .query('budgetItems')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const activeItems = items.filter((i) => i.status !== 'cancelled')

    const totalEstimated = activeItems.reduce((sum, i) => sum + i.estimatedAmount, 0)
    const totalActual = activeItems.reduce((sum, i) => sum + (i.actualAmount || 0), 0)
    const totalPaid = activeItems
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + (i.actualAmount || i.estimatedAmount), 0)
    const totalCommitted = activeItems
      .filter((i) => i.status === 'committed')
      .reduce((sum, i) => sum + (i.actualAmount || i.estimatedAmount), 0)

    // Group by category
    const byCategory = activeItems.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { estimated: 0, actual: 0, count: 0 }
        }
        acc[item.category].estimated += item.estimatedAmount
        acc[item.category].actual += item.actualAmount || 0
        acc[item.category].count += 1
        return acc
      },
      {} as Record<string, { estimated: number; actual: number; count: number }>
    )

    return {
      totalEstimated,
      totalActual,
      totalPaid,
      totalCommitted,
      totalPlanned: totalEstimated - totalPaid - totalCommitted,
      variance: totalActual - totalEstimated,
      variancePercent:
        totalEstimated > 0 ? ((totalActual - totalEstimated) / totalEstimated) * 100 : 0,
      itemCount: activeItems.length,
      byCategory,
      eventBudget: event.budget || 0,
      remaining: (event.budget || 0) - totalEstimated,
    }
  },
})

// Create a budget item
export const create = mutation({
  args: {
    eventId: v.id('events'),
    category: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    estimatedAmount: v.number(),
    actualAmount: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal('planned'),
        v.literal('committed'),
        v.literal('paid'),
        v.literal('cancelled')
      )
    ),
    vendorId: v.optional(v.id('vendors')),
    sponsorId: v.optional(v.id('sponsors')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or access denied')
    }

    return await ctx.db.insert('budgetItems', {
      eventId: args.eventId,
      category: args.category,
      name: args.name,
      description: args.description,
      estimatedAmount: args.estimatedAmount,
      actualAmount: args.actualAmount,
      status: args.status || 'planned',
      vendorId: args.vendorId,
      sponsorId: args.sponsorId,
      notes: args.notes,
      createdAt: Date.now(),
    })
  },
})

// Update a budget item
export const update = mutation({
  args: {
    id: v.id('budgetItems'),
    category: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    estimatedAmount: v.optional(v.number()),
    actualAmount: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal('planned'),
        v.literal('committed'),
        v.literal('paid'),
        v.literal('cancelled')
      )
    ),
    vendorId: v.optional(v.id('vendors')),
    sponsorId: v.optional(v.id('sponsors')),
    paidAt: v.optional(v.number()),
    paidMethod: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const item = await ctx.db.get(args.id)
    if (!item) throw new Error('Budget item not found')

    // Verify user owns the event
    const event = await ctx.db.get(item.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Access denied')
    }

    const { id, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )

    // If marking as paid and no paidAt, set it now
    if (updates.status === 'paid' && !updates.paidAt && item.status !== 'paid') {
      cleanUpdates.paidAt = Date.now()
    }

    await ctx.db.patch(id, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    })

    return id
  },
})

// Delete a budget item
export const remove = mutation({
  args: { id: v.id('budgetItems') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const item = await ctx.db.get(args.id)
    if (!item) throw new Error('Budget item not found')

    // Verify user owns the event
    const event = await ctx.db.get(item.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Access denied')
    }

    await ctx.db.delete(args.id)
  },
})

// Bulk status update (e.g., mark multiple as paid)
export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id('budgetItems')),
    status: v.union(
      v.literal('planned'),
      v.literal('committed'),
      v.literal('paid'),
      v.literal('cancelled')
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    for (const id of args.ids) {
      const item = await ctx.db.get(id)
      if (!item) continue

      // Verify user owns the event
      const event = await ctx.db.get(item.eventId)
      if (!event || event.organizerId !== user._id) continue

      await ctx.db.patch(id, {
        status: args.status,
        paidAt: args.status === 'paid' && item.status !== 'paid' ? Date.now() : item.paidAt,
        updatedAt: Date.now(),
      })
    }
  },
})
