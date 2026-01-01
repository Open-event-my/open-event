/**
 * Attendee Management
 * CRUD operations for event attendees with check-in support
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser } from './lib/auth'
import { isValidEmail } from './lib/emailValidation'
// Attendee status type (used in schema, re-exported for type safety)
export type AttendeeStatus = 'registered' | 'confirmed' | 'checked_in' | 'cancelled' | 'no_show'

/**
 * Generate a unique ticket number
 */
function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TKT-${timestamp}-${random}`
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all attendees for an event
 */
export const getByEvent = query({
  args: {
    eventId: v.id('events'),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    // Verify user owns this event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    const attendeesQuery = ctx.db
      .query('attendees')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))

    let attendees = await attendeesQuery.collect()

    // Filter by status
    if (args.status) {
      attendees = attendees.filter((a) => a.status === args.status)
    }

    // Search by name or email
    if (args.search) {
      const searchLower = args.search.toLowerCase()
      attendees = attendees.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email.toLowerCase().includes(searchLower) ||
          a.ticketNumber.toLowerCase().includes(searchLower)
      )
    }

    // Sort by registration date (newest first)
    attendees.sort((a, b) => b.registeredAt - a.registeredAt)

    // Pagination
    const total = attendees.length
    const offset = args.offset || 0
    const limit = args.limit || 50
    const paginatedAttendees = attendees.slice(offset, offset + limit)

    return {
      attendees: paginatedAttendees,
      total,
      hasMore: offset + limit < total,
    }
  },
})

/**
 * Get a single attendee by ID
 */
export const get = query({
  args: { id: v.id('attendees') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const attendee = await ctx.db.get(args.id)
    if (!attendee) return null

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) return null
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    return attendee
  },
})

/**
 * Get attendee by ticket number (for check-in)
 */
export const getByTicket = query({
  args: { ticketNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const attendee = await ctx.db
      .query('attendees')
      .withIndex('by_ticket', (q) => q.eq('ticketNumber', args.ticketNumber))
      .first()

    if (!attendee) return null

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) return null
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    // Include event info for context
    return {
      ...attendee,
      eventName: event.title,
      eventDate: event.startDate,
    }
  },
})

/**
 * Get attendee statistics for an event
 */
export const getStats = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    // Verify user owns this event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    const attendees = await ctx.db
      .query('attendees')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const stats = {
      total: attendees.length,
      registered: 0,
      confirmed: 0,
      checkedIn: 0,
      cancelled: 0,
      noShow: 0,
      checkInRate: 0,
    }

    for (const attendee of attendees) {
      switch (attendee.status) {
        case 'registered':
          stats.registered++
          break
        case 'confirmed':
          stats.confirmed++
          break
        case 'checked_in':
          stats.checkedIn++
          break
        case 'cancelled':
          stats.cancelled++
          break
        case 'no_show':
          stats.noShow++
          break
      }
    }

    // Calculate check-in rate (excluding cancelled)
    const eligibleAttendees = stats.total - stats.cancelled
    if (eligibleAttendees > 0) {
      stats.checkInRate = Math.round((stats.checkedIn / eligibleAttendees) * 100)
    }

    return stats
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new attendee (manual registration)
 */
export const create = mutation({
  args: {
    eventId: v.id('events'),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    ticketType: v.optional(v.string()),
    dietaryRestrictions: v.optional(v.string()),
    accessibilityNeeds: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    organization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    // Verify user owns this event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    // Validate email
    if (!isValidEmail(args.email)) {
      throw new Error('Invalid email address')
    }

    // Check for duplicate email in this event
    const existing = await ctx.db
      .query('attendees')
      .withIndex('by_event_email', (q) =>
        q.eq('eventId', args.eventId).eq('email', args.email.toLowerCase())
      )
      .first()

    if (existing) {
      throw new Error('An attendee with this email is already registered for this event')
    }

    const attendeeId = await ctx.db.insert('attendees', {
      eventId: args.eventId,
      email: args.email.toLowerCase(),
      name: args.name,
      phone: args.phone,
      ticketType: args.ticketType || 'General',
      ticketNumber: generateTicketNumber(),
      status: 'registered',
      dietaryRestrictions: args.dietaryRestrictions,
      accessibilityNeeds: args.accessibilityNeeds,
      specialRequests: args.specialRequests,
      organization: args.organization,
      jobTitle: args.jobTitle,
      notes: args.notes,
      registrationSource: 'manual',
      registeredAt: Date.now(),
    })

    return attendeeId
  },
})

/**
 * Update an attendee
 */
export const update = mutation({
  args: {
    id: v.id('attendees'),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    ticketType: v.optional(v.string()),
    status: v.optional(v.string()),
    dietaryRestrictions: v.optional(v.string()),
    accessibilityNeeds: v.optional(v.string()),
    specialRequests: v.optional(v.string()),
    organization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const attendee = await ctx.db.get(args.id)
    if (!attendee) throw new Error('Attendee not found')

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    // Extract update fields (excluding id which is used directly via args.id)
    const { id: _, ...updates } = args
    void _ // Explicitly mark as intentionally unused
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    )

    await ctx.db.patch(args.id, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })

    return args.id
  },
})

/**
 * Delete an attendee
 */
export const remove = mutation({
  args: { id: v.id('attendees') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const attendee = await ctx.db.get(args.id)
    if (!attendee) throw new Error('Attendee not found')

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    await ctx.db.delete(args.id)
    return true
  },
})

/**
 * Check in an attendee
 */
export const checkIn = mutation({
  args: {
    id: v.optional(v.id('attendees')),
    ticketNumber: v.optional(v.string()),
    method: v.optional(v.string()), // 'qr_scan', 'manual', 'self_check_in'
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    let attendee
    if (args.id) {
      attendee = await ctx.db.get(args.id)
    } else if (args.ticketNumber) {
      const ticketNum = args.ticketNumber
      attendee = await ctx.db
        .query('attendees')
        .withIndex('by_ticket', (q) => q.eq('ticketNumber', ticketNum))
        .first()
    } else {
      throw new Error('Either id or ticketNumber is required')
    }

    if (!attendee) throw new Error('Attendee not found')

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    // Check if already checked in
    if (attendee.status === 'checked_in') {
      return {
        success: false,
        message: 'Attendee already checked in',
        attendee,
        checkedInAt: attendee.checkedInAt,
      }
    }

    // Check if cancelled
    if (attendee.status === 'cancelled') {
      return {
        success: false,
        message: 'Cannot check in a cancelled registration',
        attendee,
      }
    }

    // Perform check-in
    await ctx.db.patch(attendee._id, {
      status: 'checked_in',
      checkedInAt: Date.now(),
      checkedInBy: user._id,
      checkInMethod: args.method || 'manual',
      updatedAt: Date.now(),
    })

    return {
      success: true,
      message: 'Check-in successful',
      attendee: {
        ...attendee,
        status: 'checked_in',
        checkedInAt: Date.now(),
      },
    }
  },
})

/**
 * Undo check-in (revert to confirmed status)
 */
export const undoCheckIn = mutation({
  args: { id: v.id('attendees') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const attendee = await ctx.db.get(args.id)
    if (!attendee) throw new Error('Attendee not found')

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    if (attendee.status !== 'checked_in') {
      throw new Error('Attendee is not checked in')
    }

    await ctx.db.patch(args.id, {
      status: 'confirmed',
      checkedInAt: undefined,
      checkedInBy: undefined,
      checkInMethod: undefined,
      updatedAt: Date.now(),
    })

    return true
  },
})

/**
 * Bulk import attendees from CSV data
 */
export const bulkImport = mutation({
  args: {
    eventId: v.id('events'),
    attendees: v.array(
      v.object({
        email: v.string(),
        name: v.string(),
        phone: v.optional(v.string()),
        ticketType: v.optional(v.string()),
        organization: v.optional(v.string()),
        jobTitle: v.optional(v.string()),
        dietaryRestrictions: v.optional(v.string()),
        accessibilityNeeds: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    skipDuplicates: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    // Verify user owns this event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    // Get existing attendees for duplicate check
    const existingAttendees = await ctx.db
      .query('attendees')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const existingEmails = new Set(existingAttendees.map((a) => a.email.toLowerCase()))

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as { email: string; error: string }[],
    }

    for (const attendeeData of args.attendees) {
      const email = attendeeData.email.toLowerCase()

      // Validate email
      if (!isValidEmail(email)) {
        results.errors.push({ email, error: 'Invalid email format' })
        continue
      }

      // Check for duplicates
      if (existingEmails.has(email)) {
        if (args.skipDuplicates) {
          results.skipped++
          continue
        } else {
          results.errors.push({ email, error: 'Duplicate email' })
          continue
        }
      }

      // Insert attendee
      await ctx.db.insert('attendees', {
        eventId: args.eventId,
        email,
        name: attendeeData.name,
        phone: attendeeData.phone,
        ticketType: attendeeData.ticketType || 'General',
        ticketNumber: generateTicketNumber(),
        status: 'registered',
        organization: attendeeData.organization,
        jobTitle: attendeeData.jobTitle,
        dietaryRestrictions: attendeeData.dietaryRestrictions,
        accessibilityNeeds: attendeeData.accessibilityNeeds,
        notes: attendeeData.notes,
        registrationSource: 'csv_import',
        registeredAt: Date.now(),
      })

      existingEmails.add(email)
      results.imported++
    }

    return results
  },
})

/**
 * Cancel a registration
 */
export const cancel = mutation({
  args: {
    id: v.id('attendees'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const attendee = await ctx.db.get(args.id)
    if (!attendee) throw new Error('Attendee not found')

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    await ctx.db.patch(args.id, {
      status: 'cancelled',
      notes: args.reason ? `Cancelled: ${args.reason}` : attendee.notes,
      updatedAt: Date.now(),
    })

    return true
  },
})

/**
 * Mark attendee as no-show (after event)
 */
export const markNoShow = mutation({
  args: { id: v.id('attendees') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const attendee = await ctx.db.get(args.id)
    if (!attendee) throw new Error('Attendee not found')

    // Verify user owns this event
    const event = await ctx.db.get(attendee.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    if (attendee.status === 'checked_in') {
      throw new Error('Cannot mark checked-in attendee as no-show')
    }

    await ctx.db.patch(args.id, {
      status: 'no_show',
      updatedAt: Date.now(),
    })

    return true
  },
})

/**
 * Export attendees data (returns data for frontend to generate CSV/PDF)
 */
export const exportData = query({
  args: {
    eventId: v.id('events'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    // Verify user owns this event
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    let attendees = await ctx.db
      .query('attendees')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    if (args.status) {
      attendees = attendees.filter((a) => a.status === args.status)
    }

    // Sort by name
    attendees.sort((a, b) => a.name.localeCompare(b.name))

    return {
      eventName: event.title,
      eventDate: event.startDate,
      exportedAt: Date.now(),
      attendees: attendees.map((a) => ({
        name: a.name,
        email: a.email,
        phone: a.phone || '',
        ticketType: a.ticketType || 'General',
        ticketNumber: a.ticketNumber,
        status: a.status,
        organization: a.organization || '',
        jobTitle: a.jobTitle || '',
        dietaryRestrictions: a.dietaryRestrictions || '',
        accessibilityNeeds: a.accessibilityNeeds || '',
        registeredAt: a.registeredAt,
        checkedInAt: a.checkedInAt || null,
      })),
    }
  },
})
