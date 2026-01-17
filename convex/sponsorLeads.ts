import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUser } from './lib/auth'

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List leads for a specific event sponsorship
 */
export const listByEventSponsor = query({
  args: {
    eventSponsorId: v.id('eventSponsors'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Get the eventSponsor to verify access
    const eventSponsor = await ctx.db.get(args.eventSponsorId)
    if (!eventSponsor) throw new Error('Event sponsorship not found')

    // Get the event to verify organizer access
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id) {
      throw new Error('Not authorized to view these leads')
    }

    const leads = await ctx.db
      .query('sponsorLeads')
      .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', args.eventSponsorId))
      .order('desc')
      .collect()

    return leads
  },
})

/**
 * List all leads for an event (for organizers)
 */
export const listByEvent = query({
  args: {
    eventId: v.id('events'),
    sponsorId: v.optional(v.id('sponsors')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify organizer access
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id) {
      throw new Error('Not authorized to view these leads')
    }

    let leads
    if (args.sponsorId) {
      // Filter by specific sponsor
      leads = await ctx.db
        .query('sponsorLeads')
        .withIndex('by_sponsor', (q) => q.eq('sponsorId', args.sponsorId!))
        .filter((q) => q.eq(q.field('eventId'), args.eventId))
        .order('desc')
        .collect()
    } else {
      leads = await ctx.db
        .query('sponsorLeads')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .order('desc')
        .collect()
    }

    // Enrich with sponsor names
    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const sponsor = await ctx.db.get(lead.sponsorId)
        return {
          ...lead,
          sponsorName: sponsor?.name || 'Unknown',
        }
      })
    )

    return enrichedLeads
  },
})

/**
 * Get lead statistics for an event or sponsorship
 */
export const getStats = query({
  args: {
    eventId: v.id('events'),
    eventSponsorId: v.optional(v.id('eventSponsors')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify organizer access
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id) {
      throw new Error('Not authorized to view these stats')
    }

    let leads
    if (args.eventSponsorId) {
      leads = await ctx.db
        .query('sponsorLeads')
        .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', args.eventSponsorId!))
        .collect()
    } else {
      leads = await ctx.db
        .query('sponsorLeads')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect()
    }

    // Calculate stats
    const totalLeads = leads.length
    const hotLeads = leads.filter((l) => l.interestLevel === 'hot').length
    const warmLeads = leads.filter((l) => l.interestLevel === 'warm').length
    const coldLeads = leads.filter((l) => l.interestLevel === 'cold').length
    const unqualified = leads.filter((l) => !l.interestLevel).length

    const pendingFollowUp = leads.filter((l) => l.followUpStatus === 'pending').length
    const contacted = leads.filter((l) => l.followUpStatus === 'contacted').length
    const converted = leads.filter((l) => l.followUpStatus === 'converted').length
    const lost = leads.filter((l) => l.followUpStatus === 'lost').length

    // Leads by capture method
    const byMethod = {
      booth_scan: leads.filter((l) => l.captureMethod === 'booth_scan').length,
      form: leads.filter((l) => l.captureMethod === 'form').length,
      manual: leads.filter((l) => l.captureMethod === 'manual').length,
      badge_scan: leads.filter((l) => l.captureMethod === 'badge_scan').length,
    }

    return {
      totalLeads,
      byInterestLevel: { hot: hotLeads, warm: warmLeads, cold: coldLeads, unqualified },
      byFollowUpStatus: { pending: pendingFollowUp, contacted, converted, lost },
      byMethod,
      conversionRate: totalLeads > 0 ? (converted / totalLeads) * 100 : 0,
    }
  },
})

/**
 * Get a single lead by ID
 */
export const get = query({
  args: {
    leadId: v.id('sponsorLeads'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const lead = await ctx.db.get(args.leadId)
    if (!lead) throw new Error('Lead not found')

    // Verify access
    const event = await ctx.db.get(lead.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to view this lead')
    }

    // Enrich with related data
    const sponsor = await ctx.db.get(lead.sponsorId)
    const attendee = lead.attendeeId ? await ctx.db.get(lead.attendeeId) : null

    return {
      ...lead,
      sponsorName: sponsor?.name || 'Unknown',
      attendeeDetails: attendee ? { name: attendee.name, ticketType: attendee.ticketType } : null,
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Capture a new lead for a sponsor
 */
export const capture = mutation({
  args: {
    eventSponsorId: v.id('eventSponsors'),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    captureMethod: v.union(
      v.literal('booth_scan'),
      v.literal('form'),
      v.literal('manual'),
      v.literal('badge_scan')
    ),
    captureLocation: v.optional(v.string()),
    notes: v.optional(v.string()),
    interestLevel: v.optional(v.union(v.literal('hot'), v.literal('warm'), v.literal('cold'))),
    attendeeId: v.optional(v.id('attendees')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Get the eventSponsor
    const eventSponsor = await ctx.db.get(args.eventSponsorId)
    if (!eventSponsor) throw new Error('Event sponsorship not found')

    // Verify organizer access
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id) {
      throw new Error('Not authorized to capture leads for this sponsorship')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(args.email)) {
      throw new Error('Invalid email address')
    }

    // Check for duplicate lead (same email for same event sponsor)
    const existingLead = await ctx.db
      .query('sponsorLeads')
      .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', args.eventSponsorId))
      .filter((q) => q.eq(q.field('email'), args.email.toLowerCase()))
      .first()

    if (existingLead) {
      throw new Error('A lead with this email already exists for this sponsor')
    }

    const leadId = await ctx.db.insert('sponsorLeads', {
      eventId: eventSponsor.eventId,
      sponsorId: eventSponsor.sponsorId,
      eventSponsorId: args.eventSponsorId,
      attendeeId: args.attendeeId,
      name: args.name,
      email: args.email.toLowerCase(),
      phone: args.phone,
      company: args.company,
      jobTitle: args.jobTitle,
      captureMethod: args.captureMethod,
      captureLocation: args.captureLocation,
      notes: args.notes,
      interestLevel: args.interestLevel,
      followUpStatus: 'pending',
      capturedAt: Date.now(),
      capturedBy: user._id,
    })

    return { leadId }
  },
})

/**
 * Update lead follow-up status
 */
export const updateFollowUp = mutation({
  args: {
    leadId: v.id('sponsorLeads'),
    followUpStatus: v.union(
      v.literal('pending'),
      v.literal('contacted'),
      v.literal('converted'),
      v.literal('lost')
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const lead = await ctx.db.get(args.leadId)
    if (!lead) throw new Error('Lead not found')

    // Verify access
    const event = await ctx.db.get(lead.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to update this lead')
    }

    await ctx.db.patch(args.leadId, {
      followUpStatus: args.followUpStatus,
      notes: args.notes !== undefined ? args.notes : lead.notes,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Update lead interest level
 */
export const updateInterestLevel = mutation({
  args: {
    leadId: v.id('sponsorLeads'),
    interestLevel: v.union(v.literal('hot'), v.literal('warm'), v.literal('cold')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const lead = await ctx.db.get(args.leadId)
    if (!lead) throw new Error('Lead not found')

    // Verify access
    const event = await ctx.db.get(lead.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to update this lead')
    }

    await ctx.db.patch(args.leadId, {
      interestLevel: args.interestLevel,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Delete a lead
 */
export const remove = mutation({
  args: {
    leadId: v.id('sponsorLeads'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const lead = await ctx.db.get(args.leadId)
    if (!lead) throw new Error('Lead not found')

    // Verify access
    const event = await ctx.db.get(lead.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to delete this lead')
    }

    await ctx.db.delete(args.leadId)

    return { success: true }
  },
})

/**
 * Bulk import leads from CSV data
 */
export const bulkImport = mutation({
  args: {
    eventSponsorId: v.id('eventSponsors'),
    leads: v.array(
      v.object({
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
        company: v.optional(v.string()),
        jobTitle: v.optional(v.string()),
        interestLevel: v.optional(v.union(v.literal('hot'), v.literal('warm'), v.literal('cold'))),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Get the eventSponsor
    const eventSponsor = await ctx.db.get(args.eventSponsorId)
    if (!eventSponsor) throw new Error('Event sponsorship not found')

    // Verify organizer access
    const event = await ctx.db.get(eventSponsor.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id) {
      throw new Error('Not authorized to import leads for this sponsorship')
    }

    // Get existing emails to check for duplicates
    const existingLeads = await ctx.db
      .query('sponsorLeads')
      .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', args.eventSponsorId))
      .collect()
    const existingEmails = new Set(existingLeads.map((l) => l.email.toLowerCase()))

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const lead of args.leads) {
      const email = lead.email.toLowerCase()

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push(`Invalid email: ${lead.email}`)
        skipped++
        continue
      }

      // Check for duplicate
      if (existingEmails.has(email)) {
        skipped++
        continue
      }

      await ctx.db.insert('sponsorLeads', {
        eventId: eventSponsor.eventId,
        sponsorId: eventSponsor.sponsorId,
        eventSponsorId: args.eventSponsorId,
        name: lead.name,
        email: email,
        phone: lead.phone,
        company: lead.company,
        jobTitle: lead.jobTitle,
        captureMethod: 'form',
        interestLevel: lead.interestLevel,
        notes: lead.notes,
        followUpStatus: 'pending',
        capturedAt: Date.now(),
        capturedBy: user._id,
      })

      existingEmails.add(email)
      imported++
    }

    return { imported, skipped, errors }
  },
})
