/**
 * Ticket Types - CRUD operations for event ticket tiers
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import { isAdminRole } from './lib/auth'

// Get all ticket types for an event
export const getByEvent = query({
  args: {
    eventId: v.id('events'),
    includeHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)

    // Get the event to check visibility
    const event = await ctx.db.get(args.eventId)
    if (!event) return []

    // Get current user for admin check
    const user = userId ? await ctx.db.get(userId) : null
    const isAdmin = user && isAdminRole(user.role)
    const isOwner = userId && event.organizerId === userId

    // For non-published events, only owner or admins can view ticket types
    if (event.status !== 'published') {
      if (!isOwner && !isAdmin) {
        return []
      }
    }

    const ticketTypes = await ctx.db
      .query('ticketTypes')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    // Only owner or admins can see hidden ticket types
    const canSeeHidden = isOwner || isAdmin
    const filtered =
      args.includeHidden && canSeeHidden ? ticketTypes : ticketTypes.filter((t) => !t.isHidden)

    // Sort by sortOrder
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

// Get a single ticket type
export const get = query({
  args: { id: v.id('ticketTypes') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Get available ticket types (active, in sales window, with stock)
export const getAvailable = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    // Get the event to check if it's published and public
    const event = await ctx.db.get(args.eventId)
    if (!event) return []

    // Only return available tickets for published events
    if (event.status !== 'published') {
      return []
    }

    const now = Date.now()
    const ticketTypes = await ctx.db
      .query('ticketTypes')
      .withIndex('by_event_active', (q) => q.eq('eventId', args.eventId).eq('isActive', true))
      .collect()

    return ticketTypes
      .filter((t) => {
        // Check if hidden
        if (t.isHidden) return false

        // Check sales window
        if (t.salesStartAt && now < t.salesStartAt) return false
        if (t.salesEndAt && now > t.salesEndAt) return false

        // Check availability
        if (t.quantity !== undefined && t.soldCount >= t.quantity) return false

        return true
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        ...t,
        remaining: t.quantity ? t.quantity - t.soldCount : null,
        isSoldOut: t.quantity !== undefined && t.soldCount >= t.quantity,
      }))
  },
})

// Create a new ticket type
export const create = mutation({
  args: {
    eventId: v.id('events'),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    currency: v.optional(v.string()),
    quantity: v.optional(v.number()),
    maxPerOrder: v.optional(v.number()),
    salesStartAt: v.optional(v.number()),
    salesEndAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isHidden: v.optional(v.boolean()),
    perks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Verify event ownership
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== userId) throw new Error('Not authorized')

    // Get next sort order
    const existing = await ctx.db
      .query('ticketTypes')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    const maxSortOrder = Math.max(0, ...existing.map((t) => t.sortOrder))

    return await ctx.db.insert('ticketTypes', {
      eventId: args.eventId,
      name: args.name,
      description: args.description,
      price: args.price,
      currency: args.currency || 'usd',
      quantity: args.quantity,
      soldCount: 0,
      maxPerOrder: args.maxPerOrder || 10,
      salesStartAt: args.salesStartAt,
      salesEndAt: args.salesEndAt,
      isActive: args.isActive ?? true,
      isHidden: args.isHidden ?? false,
      sortOrder: maxSortOrder + 1,
      perks: args.perks,
      createdAt: Date.now(),
    })
  },
})

// Update a ticket type
export const update = mutation({
  args: {
    id: v.id('ticketTypes'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    quantity: v.optional(v.number()),
    maxPerOrder: v.optional(v.number()),
    salesStartAt: v.optional(v.number()),
    salesEndAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isHidden: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    perks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const ticketType = await ctx.db.get(args.id)
    if (!ticketType) throw new Error('Ticket type not found')

    // Verify event ownership
    const event = await ctx.db.get(ticketType.eventId)
    if (!event || event.organizerId !== userId) throw new Error('Not authorized')

    // Extract update fields (excluding id which is used directly via args.id)
    const { id: _, ...updates } = args
    void _ // Explicitly mark as intentionally unused
    const validUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )

    await ctx.db.patch(args.id, {
      ...validUpdates,
      updatedAt: Date.now(),
    })
  },
})

// Delete a ticket type (only if no sales)
export const remove = mutation({
  args: { id: v.id('ticketTypes') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const ticketType = await ctx.db.get(args.id)
    if (!ticketType) throw new Error('Ticket type not found')

    // Verify event ownership
    const event = await ctx.db.get(ticketType.eventId)
    if (!event || event.organizerId !== userId) throw new Error('Not authorized')

    // Check if any tickets have been sold
    if (ticketType.soldCount > 0) {
      throw new Error('Cannot delete ticket type with sales. Deactivate it instead.')
    }

    await ctx.db.delete(args.id)
  },
})

// Reorder ticket types
export const reorder = mutation({
  args: {
    eventId: v.id('events'),
    orderedIds: v.array(v.id('ticketTypes')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Verify event ownership
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== userId) throw new Error('Not authorized')

    // Update sort orders
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        sortOrder: i + 1,
        updatedAt: Date.now(),
      })
    }
  },
})
