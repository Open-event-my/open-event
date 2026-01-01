/**
 * Promo Codes - CRUD operations for discount codes
 */

import { v } from 'convex/values'
import { query, mutation, internalQuery } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

// Get all promo codes for an organizer (optionally filtered by event)
export const getByOrganizer = query({
  args: {
    eventId: v.optional(v.id('events')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    let promoCodes
    if (args.eventId) {
      promoCodes = await ctx.db
        .query('promoCodes')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect()
    } else {
      promoCodes = await ctx.db
        .query('promoCodes')
        .withIndex('by_organizer', (q) => q.eq('organizerId', userId))
        .collect()
    }

    // Filter to only show codes owned by this organizer
    return promoCodes.filter((code) => code.organizerId === userId)
  },
})

// Get a single promo code
export const get = query({
  args: { id: v.id('promoCodes') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const promoCode = await ctx.db.get(args.id)
    if (!promoCode) return null

    // Only allow owner to view
    if (promoCode.organizerId !== userId) {
      throw new Error('Not authorized')
    }

    return promoCode
  },
})

// Validate a promo code for an order (public - for checkout)
export const validate = query({
  args: {
    code: v.string(),
    eventId: v.id('events'),
    orderAmount: v.number(), // Subtotal in cents
    buyerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const code = args.code.toUpperCase().trim()

    // Find promo code by code string
    const promoCodes = await ctx.db
      .query('promoCodes')
      .withIndex('by_code', (q) => q.eq('code', code))
      .collect()

    // Find one that matches this event (or is global for the organizer)
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      return { valid: false, error: 'Event not found' }
    }

    const promoCode = promoCodes.find(
      (pc) =>
        pc.isActive &&
        (pc.eventId === args.eventId || (!pc.eventId && pc.organizerId === event.organizerId))
    )

    if (!promoCode) {
      return { valid: false, error: 'Invalid promo code' }
    }

    // Check if active
    if (!promoCode.isActive) {
      return { valid: false, error: 'This promo code is no longer active' }
    }

    // Check validity period
    const now = Date.now()
    if (promoCode.validFrom && now < promoCode.validFrom) {
      return { valid: false, error: 'This promo code is not yet valid' }
    }
    if (promoCode.validUntil && now > promoCode.validUntil) {
      return { valid: false, error: 'This promo code has expired' }
    }

    // Check usage limits
    if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
      return { valid: false, error: 'This promo code has reached its usage limit' }
    }

    // Check per-email limit if email provided
    if (args.buyerEmail && promoCode.maxUsesPerEmail) {
      const buyerEmail = args.buyerEmail // TypeScript now knows this is defined
      const emailUsage = await ctx.db
        .query('orders')
        .withIndex('by_email', (q) => q.eq('buyerEmail', buyerEmail))
        .filter((q) =>
          q.and(
            q.eq(q.field('promoCodeId'), promoCode._id),
            q.neq(q.field('paymentStatus'), 'cancelled'),
            q.neq(q.field('paymentStatus'), 'failed')
          )
        )
        .collect()

      if (emailUsage.length >= promoCode.maxUsesPerEmail) {
        return { valid: false, error: 'You have already used this promo code' }
      }
    }

    // Check minimum order amount
    if (promoCode.minOrderAmount && args.orderAmount < promoCode.minOrderAmount) {
      const minFormatted = (promoCode.minOrderAmount / 100).toFixed(2)
      return {
        valid: false,
        error: `Minimum order amount is $${minFormatted} for this promo code`,
      }
    }

    // Calculate discount
    let discountAmount: number
    if (promoCode.discountType === 'percentage') {
      discountAmount = Math.round((args.orderAmount * promoCode.discountValue) / 100)
    } else {
      discountAmount = Math.min(promoCode.discountValue, args.orderAmount)
    }

    return {
      valid: true,
      promoCodeId: promoCode._id,
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      discountAmount,
      description: promoCode.description,
    }
  },
})

// Internal query to get promo code by ID
export const getById = internalQuery({
  args: { id: v.id('promoCodes') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// Create a new promo code
export const create = mutation({
  args: {
    eventId: v.optional(v.id('events')),
    code: v.string(),
    description: v.optional(v.string()),
    discountType: v.union(v.literal('percentage'), v.literal('fixed')),
    discountValue: v.number(),
    maxUses: v.optional(v.number()),
    maxUsesPerEmail: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Normalize code to uppercase
    const code = args.code.toUpperCase().trim()

    if (!code) {
      throw new Error('Promo code cannot be empty')
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new Error('Promo code can only contain letters, numbers, hyphens, and underscores')
    }

    // Validate discount value
    if (args.discountType === 'percentage') {
      if (args.discountValue <= 0 || args.discountValue > 100) {
        throw new Error('Percentage discount must be between 1 and 100')
      }
    } else {
      if (args.discountValue <= 0) {
        throw new Error('Fixed discount must be greater than 0')
      }
    }

    // If event-specific, verify ownership
    if (args.eventId) {
      const event = await ctx.db.get(args.eventId)
      if (!event || event.organizerId !== userId) {
        throw new Error('Not authorized to create promo codes for this event')
      }
    }

    // Check if code already exists for this organizer
    const existingCodes = await ctx.db
      .query('promoCodes')
      .withIndex('by_code', (q) => q.eq('code', code))
      .collect()

    const duplicate = existingCodes.find((pc) => pc.organizerId === userId)
    if (duplicate) {
      throw new Error('A promo code with this code already exists')
    }

    return await ctx.db.insert('promoCodes', {
      eventId: args.eventId,
      organizerId: userId,
      code,
      description: args.description,
      discountType: args.discountType,
      discountValue: args.discountValue,
      maxUses: args.maxUses,
      usedCount: 0,
      maxUsesPerEmail: args.maxUsesPerEmail,
      minOrderAmount: args.minOrderAmount,
      validFrom: args.validFrom,
      validUntil: args.validUntil,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    })
  },
})

// Update a promo code
export const update = mutation({
  args: {
    id: v.id('promoCodes'),
    description: v.optional(v.string()),
    discountType: v.optional(v.union(v.literal('percentage'), v.literal('fixed'))),
    discountValue: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    maxUsesPerEmail: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const promoCode = await ctx.db.get(args.id)
    if (!promoCode) throw new Error('Promo code not found')
    if (promoCode.organizerId !== userId) throw new Error('Not authorized')

    // Extract update fields (excluding id which is used directly via args.id)
    const { id: _, ...updates } = args
    void _ // Explicitly mark as intentionally unused
    const validUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )

    // Validate discount value if updating
    if (updates.discountValue !== undefined) {
      const type = updates.discountType || promoCode.discountType
      if (type === 'percentage') {
        if (updates.discountValue <= 0 || updates.discountValue > 100) {
          throw new Error('Percentage discount must be between 1 and 100')
        }
      } else {
        if (updates.discountValue <= 0) {
          throw new Error('Fixed discount must be greater than 0')
        }
      }
    }

    await ctx.db.patch(args.id, {
      ...validUpdates,
      updatedAt: Date.now(),
    })
  },
})

// Delete a promo code (only if unused)
export const remove = mutation({
  args: { id: v.id('promoCodes') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const promoCode = await ctx.db.get(args.id)
    if (!promoCode) throw new Error('Promo code not found')
    if (promoCode.organizerId !== userId) throw new Error('Not authorized')

    // Check if it's been used
    if (promoCode.usedCount > 0) {
      throw new Error('Cannot delete promo code that has been used. Deactivate it instead.')
    }

    await ctx.db.delete(args.id)
  },
})

// Increment usage count (called when order is completed)
export const incrementUsage = mutation({
  args: { id: v.id('promoCodes') },
  handler: async (ctx, args) => {
    const promoCode = await ctx.db.get(args.id)
    if (!promoCode) return

    await ctx.db.patch(args.id, {
      usedCount: promoCode.usedCount + 1,
      updatedAt: Date.now(),
    })
  },
})
