/**
 * CSRF Protection Example
 *
 * This file demonstrates how to apply CSRF protection to mutations.
 * Use this as a reference when adding CSRF protection to your mutations.
 */

import { v } from 'convex/values'
import { mutation } from '../../_generated/server'
import { requireValidCSRFToken } from './csrf'

/**
 * Example 1: Simple Create Mutation with CSRF Protection
 */
export const exampleCreate = mutation({
  args: {
    csrfToken: v.string(), // REQUIRED: CSRF token
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // STEP 1: Validate CSRF token FIRST (before any other logic)
    await requireValidCSRFToken(ctx, args.csrfToken)

    // STEP 2: Continue with your mutation logic
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    // STEP 3: Get user from database to get proper Id type
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', identity.email!))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // STEP 4: Perform the operation with proper organizerId type
    const id = await ctx.db.insert('events', {
      title: args.title,
      description: args.description,
      organizerId: user._id,
      status: 'draft',
      createdAt: Date.now(),
      startDate: Date.now(),
    })

    return id
  },
})

/**
 * Example 2: Update Mutation with CSRF Protection
 */
export const exampleUpdate = mutation({
  args: {
    csrfToken: v.string(), // REQUIRED: CSRF token
    id: v.id('events'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // STEP 1: Validate CSRF token
    await requireValidCSRFToken(ctx, args.csrfToken)

    // STEP 2: Verify ownership/permissions
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const event = await ctx.db.get(args.id)
    if (!event) {
      throw new Error('Event not found')
    }

    if (event.organizerId !== identity.subject) {
      throw new Error('Access denied')
    }

    // STEP 3: Perform the update
    await ctx.db.patch(args.id, {
      ...(args.title && { title: args.title }),
      ...(args.description && { description: args.description }),
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Example 3: Delete Mutation with CSRF Protection
 */
export const exampleDelete = mutation({
  args: {
    csrfToken: v.string(), // REQUIRED: CSRF token
    id: v.id('events'),
  },
  handler: async (ctx, args) => {
    // STEP 1: Validate CSRF token
    await requireValidCSRFToken(ctx, args.csrfToken)

    // STEP 2: Verify ownership/permissions
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const event = await ctx.db.get(args.id)
    if (!event) {
      throw new Error('Event not found')
    }

    if (event.organizerId !== identity.subject) {
      throw new Error('Access denied')
    }

    // STEP 3: Perform the deletion
    await ctx.db.delete(args.id)

    return { success: true }
  },
})

/**
 * Example 4: Batch Operation with CSRF Protection
 */
export const exampleBatchUpdate = mutation({
  args: {
    csrfToken: v.string(), // REQUIRED: CSRF token
    ids: v.array(v.id('events')),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // STEP 1: Validate CSRF token
    await requireValidCSRFToken(ctx, args.csrfToken)

    // STEP 2: Verify ownership for all items
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const events = await Promise.all(args.ids.map((id) => ctx.db.get(id)))

    // Verify all events exist and belong to user
    for (const event of events) {
      if (!event) {
        throw new Error('One or more events not found')
      }
      if (event.organizerId !== identity.subject) {
        throw new Error('Access denied')
      }
    }

    // STEP 3: Perform batch update
    await Promise.all(
      args.ids.map((id) =>
        ctx.db.patch(id, {
          status: args.status,
          updatedAt: Date.now(),
        })
      )
    )

    return { success: true, updated: args.ids.length }
  },
})

/**
 * Example 5: Complex Mutation with Multiple Operations
 */
export const exampleComplexOperation = mutation({
  args: {
    csrfToken: v.string(), // REQUIRED: CSRF token
    eventId: v.id('events'),
    vendorId: v.id('vendors'),
    budget: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // STEP 1: Validate CSRF token FIRST
    await requireValidCSRFToken(ctx, args.csrfToken)

    // STEP 2: Verify permissions
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== identity.subject) {
      throw new Error('Access denied')
    }

    // STEP 3: Perform multiple operations atomically
    // Create event-vendor relationship
    const relationshipId = await ctx.db.insert('eventVendors', {
      eventId: args.eventId,
      vendorId: args.vendorId,
      status: 'inquiry',
      proposedBudget: args.budget,
      notes: args.notes,
      createdAt: Date.now(),
    })

    // Create budget item
    await ctx.db.insert('budgetItems', {
      eventId: args.eventId,
      vendorId: args.vendorId,
      category: 'vendor',
      name: 'Vendor Service',
      estimatedAmount: args.budget,
      status: 'planned',
      createdAt: Date.now(),
    })

    // Update event
    await ctx.db.patch(args.eventId, {
      updatedAt: Date.now(),
    })

    return {
      success: true,
      relationshipId,
    }
  },
})

/**
 * IMPORTANT NOTES:
 *
 * 1. ALWAYS call requireValidCSRFToken() FIRST in your mutation handler
 * 2. Add csrfToken: v.string() to your mutation args
 * 3. Handle CSRF errors gracefully in your frontend
 * 4. Never skip CSRF validation, even for "internal" operations
 * 5. Test your mutations with valid and invalid tokens
 *
 * FRONTEND USAGE:
 *
 * const createEvent = useMutation(api.lib.security.csrfExample.exampleCreate);
 * const { csrfToken } = useCSRF();
 *
 * await createEvent({
 *   csrfToken,
 *   title: 'My Event',
 *   description: 'Event description',
 * });
 */
