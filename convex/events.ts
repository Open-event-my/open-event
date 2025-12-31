import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser, isAdminRole } from './lib/auth'

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

// List all events - public for marketplace, but only returns basic info
export const list = query({
  args: {},
  handler: async (ctx) => {
    // Return only active/planning events for public listing
    const events = await ctx.db.query('events').collect()
    return events.filter((e) => e.status === 'active' || e.status === 'planning')
  },
})

// Get events for the current organizer with optional status filter
export const getMyEvents = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const eventsQuery = ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))

    const events = await eventsQuery.order('desc').collect()

    // Filter by status if provided
    if (args.status && args.status !== 'all') {
      return events.filter((e) => e.status === args.status)
    }

    return events
  },
})

// Get event by ID - public for active events, owner/superadmin for drafts
export const get = query({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id)
    if (!event) return null

    // Public events (active/planning) can be viewed by anyone
    if (event.status === 'active' || event.status === 'planning') {
      return event
    }

    // Draft/cancelled events require ownership or superadmin
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required to view this event')
    }

    if (user.role !== 'superadmin' && event.organizerId !== user._id) {
      throw new Error('Access denied')
    }

    return event
  },
})

// Create event - organizers only, creates for themselves
export const create = mutation({
  args: {
    title: v.string(),
    startDate: v.number(), // Unix timestamp
    description: v.optional(v.string()),
    eventType: v.optional(v.string()),
    status: v.optional(v.string()),
    // Organization support
    organizationId: v.optional(v.id('organizations')),
    // Location fields
    locationType: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    virtualPlatform: v.optional(v.string()),
    // Budget & Scale
    expectedAttendees: v.optional(v.number()),
    budget: v.optional(v.number()),
    budgetCurrency: v.optional(v.string()),
    // End date/timezone
    endDate: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    // Verify organization membership if organizationId is provided
    if (args.organizationId) {
      const orgId = args.organizationId // Store to help TypeScript narrowing
      const membership = await ctx.db
        .query('organizationMembers')
        .withIndex('by_org_user', (q) => q.eq('organizationId', orgId).eq('userId', user._id))
        .first()

      if (!membership || membership.status !== 'active') {
        throw new Error('You are not an active member of this organization')
      }

      // Must have at least manager role to create events for org
      const roleHierarchy: Record<string, number> = {
        viewer: 1,
        member: 2,
        manager: 3,
        admin: 4,
        owner: 5,
      }
      const memberRole = roleHierarchy[membership.role] || 0
      if (memberRole < roleHierarchy.manager) {
        throw new Error('Insufficient permissions to create events for this organization')
      }
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

    return await ctx.db.insert('events', {
      organizerId: user._id, // Always use current user's ID
      organizationId: args.organizationId, // Optional org association
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

// Update event - owner or superadmin only
export const update = mutation({
  args: {
    id: v.id('events'),
    title: v.optional(v.string()),
    startDate: v.optional(v.number()),
    description: v.optional(v.string()),
    eventType: v.optional(v.string()),
    status: v.optional(v.string()),
    // Organization support
    organizationId: v.optional(v.id('organizations')),
    // Location fields
    locationType: v.optional(v.string()),
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    virtualPlatform: v.optional(v.string()),
    // Budget & Scale
    expectedAttendees: v.optional(v.number()),
    budget: v.optional(v.number()),
    budgetCurrency: v.optional(v.string()),
    // End date/timezone
    endDate: v.optional(v.number()),
    timezone: v.optional(v.string()),
    // Requirements
    requirements: v.optional(
      v.object({
        catering: v.optional(v.boolean()),
        av: v.optional(v.boolean()),
        photography: v.optional(v.boolean()),
        security: v.optional(v.boolean()),
        transportation: v.optional(v.boolean()),
        decoration: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const event = await ctx.db.get(args.id)
    if (!event) {
      throw new Error('Event not found')
    }

    // Only owner or superadmin can update
    if (user.role !== 'superadmin' && event.organizerId !== user._id) {
      throw new Error('Access denied - you can only update your own events')
    }

    // Verify organization membership if changing organizationId
    if (args.organizationId !== undefined && args.organizationId !== event.organizationId) {
      if (args.organizationId !== null) {
        const membership = await ctx.db
          .query('organizationMembers')
          .withIndex('by_org_user', (q) =>
            q.eq('organizationId', args.organizationId!).eq('userId', user._id)
          )
          .first()

        if (!membership || membership.status !== 'active') {
          throw new Error('You are not an active member of this organization')
        }

        // Must have at least manager role to assign events to org
        const roleHierarchy: Record<string, number> = {
          viewer: 1,
          member: 2,
          manager: 3,
          admin: 4,
          owner: 5,
        }
        const memberRole = roleHierarchy[membership.role] || 0
        if (memberRole < roleHierarchy.manager) {
          throw new Error('Insufficient permissions to assign events to this organization')
        }
      }
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

    const { id, ...updates } = args
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )
    await ctx.db.patch(id, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    })
  },
})

// Duplicate event - owner only (creates a copy as draft)
export const duplicate = mutation({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const event = await ctx.db.get(args.id)
    if (!event) {
      throw new Error('Event not found')
    }

    // Only owner or superadmin can duplicate
    if (user.role !== 'superadmin' && event.organizerId !== user._id) {
      throw new Error('Access denied - you can only duplicate your own events')
    }

    // Create new event with copied data as draft
    const newEventId = await ctx.db.insert('events', {
      organizerId: user._id,
      title: `${event.title} (Copy)`,
      description: event.description,
      eventType: event.eventType,
      status: 'draft', // Always start as draft
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      locationType: event.locationType,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      virtualPlatform: event.virtualPlatform,
      expectedAttendees: event.expectedAttendees,
      budget: event.budget,
      budgetCurrency: event.budgetCurrency,
      requirements: event.requirements,
      createdAt: Date.now(),
    })

    return newEventId
  },
})

// Delete event - owner or superadmin only
// CASCADE DELETES: Removes all related records to prevent orphaned data
export const remove = mutation({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const event = await ctx.db.get(args.id)
    if (!event) {
      throw new Error('Event not found')
    }

    // Only owner or superadmin can delete
    if (user.role !== 'superadmin' && event.organizerId !== user._id) {
      throw new Error('Access denied - you can only delete your own events')
    }

    // Prevent deleting active events with confirmed vendors/sponsors
    if (event.status === 'active') {
      const confirmedVendors = await ctx.db
        .query('eventVendors')
        .withIndex('by_event', (q) => q.eq('eventId', args.id))
        .filter((q) => q.eq(q.field('status'), 'confirmed'))
        .first()

      const confirmedSponsors = await ctx.db
        .query('eventSponsors')
        .withIndex('by_event', (q) => q.eq('eventId', args.id))
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
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect()
    for (const ev of eventVendors) {
      await ctx.db.delete(ev._id)
    }

    // CASCADE DELETE: eventSponsors
    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect()
    for (const es of eventSponsors) {
      await ctx.db.delete(es._id)
    }

    // CASCADE DELETE: budgetItems
    const budgetItems = await ctx.db
      .query('budgetItems')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect()
    for (const item of budgetItems) {
      await ctx.db.delete(item._id)
    }

    // CASCADE DELETE: eventTasks
    const eventTasks = await ctx.db
      .query('eventTasks')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect()
    for (const task of eventTasks) {
      await ctx.db.delete(task._id)
    }

    // CASCADE DELETE: eventApplications
    const eventApplications = await ctx.db
      .query('eventApplications')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect()
    for (const app of eventApplications) {
      await ctx.db.delete(app._id)
    }

    // CASCADE DELETE: inquiries related to this event
    const inquiries = await ctx.db
      .query('inquiries')
      .withIndex('by_event', (q) => q.eq('eventId', args.id))
      .collect()
    for (const inquiry of inquiries) {
      await ctx.db.delete(inquiry._id)
    }

    await ctx.db.delete(args.id)
  },
})

// ============================================================================
// Public Event Directory (No auth required)
// ============================================================================

// List public events for the directory (vendors/sponsors can browse)
export const listPublic = query({
  args: {
    eventType: v.optional(v.string()),
    locationType: v.optional(v.string()),
    seekingVendors: v.optional(v.boolean()),
    seekingSponsors: v.optional(v.boolean()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all public events that are active or planning
    let events = await ctx.db
      .query('events')
      .withIndex('by_public', (q) => q.eq('isPublic', true))
      .order('desc')
      .collect()

    // Filter to only active/planning events
    events = events.filter((e) => e.status === 'active' || e.status === 'planning')

    // Filter by event type
    if (args.eventType && args.eventType !== 'all') {
      events = events.filter((e) => e.eventType === args.eventType)
    }

    // Filter by location type
    if (args.locationType && args.locationType !== 'all') {
      events = events.filter((e) => e.locationType === args.locationType)
    }

    // Filter by seeking vendors
    if (args.seekingVendors) {
      events = events.filter((e) => e.seekingVendors)
    }

    // Filter by seeking sponsors
    if (args.seekingSponsors) {
      events = events.filter((e) => e.seekingSponsors)
    }

    // Search filter
    if (args.search && args.search.trim()) {
      const searchLower = args.search.toLowerCase()
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(searchLower) ||
          e.description?.toLowerCase().includes(searchLower) ||
          e.eventType?.toLowerCase().includes(searchLower) ||
          e.venueName?.toLowerCase().includes(searchLower)
      )
    }

    // Apply limit
    const limit = args.limit || 50
    events = events.slice(0, limit)

    // Return sanitized public data (respect visibility settings)
    return events.map((e) => ({
      _id: e._id,
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      startDate: e.startDate,
      endDate: e.endDate,
      locationType: e.locationType,
      // Respect visibility settings
      venueName: e.publicVisibility?.showVenue !== false ? e.venueName : undefined,
      expectedAttendees:
        e.publicVisibility?.showAttendees !== false ? e.expectedAttendees : undefined,
      budget: e.publicVisibility?.showBudget ? e.budget : undefined,
      budgetCurrency: e.publicVisibility?.showBudget ? e.budgetCurrency : undefined,
      // What they're looking for
      seekingVendors: e.seekingVendors,
      seekingSponsors: e.seekingSponsors,
      vendorCategories: e.vendorCategories,
      sponsorBenefits: e.sponsorBenefits,
      requirements: e.publicVisibility?.showRequirements !== false ? e.requirements : undefined,
      createdAt: e.createdAt,
    }))
  },
})

// Get a single public event for viewing
export const getPublic = query({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id)
    if (!event) return null

    // Must be public and active/planning
    if (!event.isPublic || (event.status !== 'active' && event.status !== 'planning')) {
      return null
    }

    // Get organizer info (just name)
    const organizer = await ctx.db.get(event.organizerId)

    // Return sanitized public data
    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      locationType: event.locationType,
      // Respect visibility settings
      venueName: event.publicVisibility?.showVenue !== false ? event.venueName : undefined,
      venueAddress: event.publicVisibility?.showVenue !== false ? event.venueAddress : undefined,
      virtualPlatform: event.locationType !== 'in-person' ? event.virtualPlatform : undefined,
      expectedAttendees:
        event.publicVisibility?.showAttendees !== false ? event.expectedAttendees : undefined,
      budget: event.publicVisibility?.showBudget ? event.budget : undefined,
      budgetCurrency: event.publicVisibility?.showBudget ? event.budgetCurrency : undefined,
      // What they're looking for
      seekingVendors: event.seekingVendors,
      seekingSponsors: event.seekingSponsors,
      vendorCategories: event.vendorCategories,
      sponsorBenefits: event.sponsorBenefits,
      requirements:
        event.publicVisibility?.showRequirements !== false ? event.requirements : undefined,
      // Organizer info
      organizer: organizer
        ? {
            name: organizer.name,
          }
        : undefined,
      createdAt: event.createdAt,
    }
  },
})

// Get event types for filtering
export const getPublicEventTypes = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query('events')
      .withIndex('by_public', (q) => q.eq('isPublic', true))
      .collect()

    const types = [...new Set(events.map((e) => e.eventType).filter(Boolean))]
    return types.sort()
  },
})

// Toggle event public visibility - owner only
export const setPublicVisibility = mutation({
  args: {
    id: v.id('events'),
    isPublic: v.boolean(),
    seekingVendors: v.optional(v.boolean()),
    seekingSponsors: v.optional(v.boolean()),
    vendorCategories: v.optional(v.array(v.string())),
    sponsorBenefits: v.optional(v.string()),
    publicVisibility: v.optional(
      v.object({
        showBudget: v.optional(v.boolean()),
        showAttendees: v.optional(v.boolean()),
        showVenue: v.optional(v.boolean()),
        showRequirements: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const event = await ctx.db.get(args.id)
    if (!event) {
      throw new Error('Event not found')
    }

    // Only owner or superadmin can change visibility
    if (user.role !== 'superadmin' && event.organizerId !== user._id) {
      throw new Error('Access denied')
    }

    const { id, ...updates } = args

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// ============================================================================
// Dashboard Stats Queries
// ============================================================================

// Get stats for the current organizer's dashboard
export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const events = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    const now = Date.now()

    // Count events by status
    const totalEvents = events.length
    const activeEvents = events.filter((e) => e.status === 'active').length
    const planningEvents = events.filter((e) => e.status === 'planning').length
    const draftEvents = events.filter((e) => e.status === 'draft').length
    const completedEvents = events.filter((e) => e.status === 'completed').length

    // Upcoming events (start date in the future)
    const upcomingEvents = events.filter((e) => e.startDate > now).length

    // Total budget across all events
    const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0)

    // Total expected attendees
    const totalAttendees = events.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)

    // Get vendor and sponsor counts - BATCH LOAD to avoid N+1 queries
    const eventIds = new Set(events.map((e) => e._id))

    // Fetch ALL eventVendors and eventSponsors in single queries
    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    // Filter to user's events and count confirmed ones
    const vendorCount = allEventVendors.filter(
      (ev) => eventIds.has(ev.eventId) && ev.status === 'confirmed'
    ).length

    const sponsorCount = allEventSponsors.filter(
      (es) => eventIds.has(es.eventId) && es.status === 'confirmed'
    ).length

    return {
      totalEvents,
      activeEvents,
      planningEvents,
      draftEvents,
      completedEvents,
      upcomingEvents,
      totalBudget,
      totalAttendees,
      confirmedVendors: vendorCount,
      confirmedSponsors: sponsorCount,
    }
  },
})

/**
 * Get platform-wide stats for admin/superadmin
 * Aggregates data across all organizers
 */
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Get ALL events (no organizer filter)
    const allEvents = await ctx.db.query('events').collect()

    const now = Date.now()

    // Count events by status
    const totalEvents = allEvents.length
    const activeEvents = allEvents.filter((e) => e.status === 'active').length
    const planningEvents = allEvents.filter((e) => e.status === 'planning').length
    const draftEvents = allEvents.filter((e) => e.status === 'draft').length
    const completedEvents = allEvents.filter((e) => e.status === 'completed').length

    // Upcoming events (start date in the future)
    const upcomingEvents = allEvents.filter((e) => e.startDate > now).length

    // Total budget across all events
    const totalBudget = allEvents.reduce((sum, e) => sum + (e.budget || 0), 0)

    // Total expected attendees
    const totalAttendees = allEvents.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)

    // Get vendor and sponsor counts - BATCH LOAD to avoid N+1 queries
    const eventIds = new Set(allEvents.map((e) => e._id))

    // Fetch ALL eventVendors and eventSponsors in single queries
    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    // Filter to all events and count confirmed ones
    const vendorCount = allEventVendors.filter(
      (ev) => eventIds.has(ev.eventId) && ev.status === 'confirmed'
    ).length

    const sponsorCount = allEventSponsors.filter(
      (es) => eventIds.has(es.eventId) && es.status === 'confirmed'
    ).length

    return {
      totalEvents,
      activeEvents,
      planningEvents,
      draftEvents,
      completedEvents,
      upcomingEvents,
      totalBudget,
      totalAttendees,
      confirmedVendors: vendorCount,
      confirmedSponsors: sponsorCount,
    }
  },
})

// Get upcoming events for dashboard preview
export const getUpcoming = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const now = Date.now()
    const limit = args.limit || 5

    const events = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    // Filter to upcoming events and sort by start date
    const upcoming = events
      .filter((e) => e.startDate > now && e.status !== 'cancelled')
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, limit)

    return upcoming
  },
})
