// ============================================================================
// Internal API Mutations
// ============================================================================
// These mutations are called from HTTP actions with API key authentication.
// They accept a userId parameter instead of relying on Convex Auth session.

import { v } from 'convex/values'
import { internalMutation, internalQuery } from '../_generated/server'

// Valid event status transitions (state machine)
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['planning', 'cancelled'],
  planning: ['active', 'draft', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: ['draft'], // Can reactivate by going back to draft
}

// Helper to validate status transition
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowedTransitions) return false
  return allowedTransitions.includes(newStatus)
}

// ============================================================================
// Event Mutations (for API)
// ============================================================================

/**
 * Create an event via API (with userId from API key)
 */
export const createEvent = internalMutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    startDate: v.number(),
    description: v.optional(v.string()),
    eventType: v.optional(v.string()),
    status: v.optional(v.string()),
    locationType: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    virtualPlatform: v.optional(v.string()),
    expectedAttendees: v.optional(v.number()),
    budget: v.optional(v.number()),
    budgetCurrency: v.optional(v.string()),
    endDate: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      throw new Error('Account suspended. Cannot create events.')
    }

    // Input validation - string length limits
    if (args.title.length > 200) {
      throw new Error('Event title must be 200 characters or less')
    }
    if (args.title.trim().length === 0) {
      throw new Error('Event title cannot be empty')
    }
    if (args.description && args.description.length > 10000) {
      throw new Error('Description must be 10000 characters or less')
    }
    if (args.venueName && args.venueName.length > 200) {
      throw new Error('Venue name must be 200 characters or less')
    }
    if (args.venueAddress && args.venueAddress.length > 500) {
      throw new Error('Venue address must be 500 characters or less')
    }

    // Validate budget/attendees are non-negative
    if (args.budget !== undefined && args.budget < 0) {
      throw new Error('Budget cannot be negative')
    }
    if (args.expectedAttendees !== undefined && args.expectedAttendees < 0) {
      throw new Error('Expected attendees cannot be negative')
    }

    // Validate date is not too far in the past
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
    if (args.startDate < oneYearAgo) {
      throw new Error('Event date cannot be more than one year in the past')
    }

    // Validate end date is after start date if provided
    if (args.endDate && args.endDate < args.startDate) {
      throw new Error('End date must be after start date')
    }

    // Validate status if provided
    const validStatuses = ['draft', 'planning', 'active', 'completed', 'cancelled']
    if (args.status && !validStatuses.includes(args.status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }

    return await ctx.db.insert('events', {
      organizerId: args.userId,
      title: args.title.trim(),
      startDate: args.startDate,
      description: args.description?.trim(),
      eventType: args.eventType,
      status: args.status ?? 'draft',
      locationType: args.locationType,
      venueName: args.venueName?.trim(),
      venueAddress: args.venueAddress?.trim(),
      virtualPlatform: args.virtualPlatform,
      expectedAttendees: args.expectedAttendees,
      budget: args.budget,
      budgetCurrency: args.budgetCurrency,
      endDate: args.endDate,
      timezone: args.timezone,
      createdAt: Date.now(),
    })
  },
})

/**
 * Update an event via API (with userId from API key)
 */
export const updateEvent = internalMutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    title: v.optional(v.string()),
    startDate: v.optional(v.number()),
    description: v.optional(v.string()),
    eventType: v.optional(v.string()),
    status: v.optional(v.string()),
    locationType: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    virtualPlatform: v.optional(v.string()),
    expectedAttendees: v.optional(v.number()),
    budget: v.optional(v.number()),
    budgetCurrency: v.optional(v.string()),
    endDate: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      throw new Error('Account suspended. Cannot update events.')
    }

    // Get event
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Authorization: Only owner or superadmin can update
    if (user.role !== 'superadmin' && event.organizerId !== args.userId) {
      throw new Error('Access denied - you can only update your own events')
    }

    // Input validation - string length limits
    if (args.title !== undefined) {
      if (args.title.length > 200) {
        throw new Error('Event title must be 200 characters or less')
      }
      if (args.title.trim().length === 0) {
        throw new Error('Event title cannot be empty')
      }
    }
    if (args.description !== undefined && args.description.length > 10000) {
      throw new Error('Description must be 10000 characters or less')
    }
    if (args.venueName !== undefined && args.venueName.length > 200) {
      throw new Error('Venue name must be 200 characters or less')
    }
    if (args.venueAddress !== undefined && args.venueAddress.length > 500) {
      throw new Error('Venue address must be 500 characters or less')
    }

    // Validate budget/attendees are non-negative
    if (args.budget !== undefined && args.budget < 0) {
      throw new Error('Budget cannot be negative')
    }
    if (args.expectedAttendees !== undefined && args.expectedAttendees < 0) {
      throw new Error('Expected attendees cannot be negative')
    }

    // Validate date order if both provided
    const startDate = args.startDate ?? event.startDate
    const endDate = args.endDate ?? event.endDate
    if (startDate && endDate && startDate > endDate) {
      throw new Error('Start date must be before end date')
    }

    // Validate status transitions (state machine)
    if (args.status && args.status !== event.status) {
      if (!isValidStatusTransition(event.status, args.status)) {
        throw new Error(
          `Invalid status transition: cannot change from "${event.status}" to "${args.status}". ` +
            `Allowed transitions: ${VALID_STATUS_TRANSITIONS[event.status]?.join(', ') || 'none'}`
        )
      }
    }

    // Build update object (exclude userId and eventId)
    const { userId: _userId, eventId: _eventId, ...updates } = args
    void _userId // Intentionally unused - excluded from updates
    void _eventId // Intentionally unused - excluded from updates

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )

    await ctx.db.patch(args.eventId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Delete an event via API (with userId from API key)
 */
export const deleteEvent = internalMutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      throw new Error('Account suspended. Cannot delete events.')
    }

    // Get event
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Authorization: Only owner or superadmin can delete
    if (user.role !== 'superadmin' && event.organizerId !== args.userId) {
      throw new Error('Access denied - you can only delete your own events')
    }

    // Prevent deleting active events with confirmed vendors/sponsors
    if (event.status === 'active') {
      const confirmedVendors = await ctx.db
        .query('eventVendors')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .filter((q) => q.eq(q.field('status'), 'confirmed'))
        .first()

      const confirmedSponsors = await ctx.db
        .query('eventSponsors')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .filter((q) => q.eq(q.field('status'), 'confirmed'))
        .first()

      if (confirmedVendors || confirmedSponsors) {
        throw new Error(
          'Cannot delete active event with confirmed vendors or sponsors. Cancel the event first.'
        )
      }
    }

    // CASCADE DELETE: eventVendors
    const eventVendors = await ctx.db
      .query('eventVendors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    for (const ev of eventVendors) {
      await ctx.db.delete(ev._id)
    }

    // CASCADE DELETE: eventSponsors
    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    for (const es of eventSponsors) {
      await ctx.db.delete(es._id)
    }

    // CASCADE DELETE: budgetItems
    const budgetItems = await ctx.db
      .query('budgetItems')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    for (const item of budgetItems) {
      await ctx.db.delete(item._id)
    }

    // CASCADE DELETE: eventTasks
    const eventTasks = await ctx.db
      .query('eventTasks')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    for (const task of eventTasks) {
      await ctx.db.delete(task._id)
    }

    // CASCADE DELETE: eventApplications
    const eventApplications = await ctx.db
      .query('eventApplications')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    for (const app of eventApplications) {
      await ctx.db.delete(app._id)
    }

    // CASCADE DELETE: inquiries related to this event
    const inquiries = await ctx.db
      .query('inquiries')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    for (const inquiry of inquiries) {
      await ctx.db.delete(inquiry._id)
    }

    // Delete the event
    await ctx.db.delete(args.eventId)

    return { success: true }
  },
})

// ============================================================================
// Event Queries (for API)
// ============================================================================

/**
 * Get events for a user via API
 */
export const getEventsByUser = internalQuery({
  args: {
    userId: v.id('users'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventsQuery = ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.userId))

    const events = await eventsQuery.order('desc').collect()

    // Filter by status if provided
    if (args.status && args.status !== 'all') {
      return events.filter((e) => e.status === args.status)
    }

    return events
  },
})

/**
 * Get a single event with ownership check
 */
export const getEventById = internalQuery({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event) return null

    // Get user for role check
    const user = await ctx.db.get(args.userId)
    if (!user) return null

    // Public events (active/planning) can be viewed
    if (event.status === 'active' || event.status === 'planning') {
      return event
    }

    // Draft/cancelled events require ownership or superadmin
    if (user.role !== 'superadmin' && event.organizerId !== args.userId) {
      return null // Access denied - return null instead of throwing
    }

    return event
  },
})
