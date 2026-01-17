import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUser } from './lib/auth'

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a report by event sponsor ID
 */
export const getByEventSponsor = query({
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
      throw new Error('Not authorized to view this report')
    }

    const report = await ctx.db
      .query('sponsorReports')
      .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', args.eventSponsorId))
      .order('desc')
      .first()

    if (!report) return null

    // Enrich with sponsor and event info
    const sponsor = await ctx.db.get(report.sponsorId)

    return {
      ...report,
      sponsorName: sponsor?.name || 'Unknown',
      eventTitle: event.title,
    }
  },
})

/**
 * List all reports for an event
 */
export const listByEvent = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify organizer access
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id) {
      throw new Error('Not authorized to view these reports')
    }

    const reports = await ctx.db
      .query('sponsorReports')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .order('desc')
      .collect()

    // Enrich with sponsor names
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        const sponsor = await ctx.db.get(report.sponsorId)
        return {
          ...report,
          sponsorName: sponsor?.name || 'Unknown',
        }
      })
    )

    return enrichedReports
  },
})

/**
 * List reports for a specific sponsor across all events
 */
export const listBySponsor = query({
  args: {
    sponsorId: v.id('sponsors'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const reports = await ctx.db
      .query('sponsorReports')
      .withIndex('by_sponsor', (q) => q.eq('sponsorId', args.sponsorId))
      .order('desc')
      .collect()

    // Filter to only reports the user has access to (their events)
    const accessibleReports = []
    for (const report of reports) {
      const event = await ctx.db.get(report.eventId)
      if (event && event.organizerId === user._id) {
        accessibleReports.push({
          ...report,
          eventTitle: event.title,
          eventDate: event.startDate,
        })
      }
    }

    return accessibleReports
  },
})

/**
 * Get a single report by ID
 */
export const get = query({
  args: {
    reportId: v.id('sponsorReports'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const report = await ctx.db.get(args.reportId)
    if (!report) throw new Error('Report not found')

    // Verify access
    const event = await ctx.db.get(report.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to view this report')
    }

    // Enrich with related data
    const sponsor = await ctx.db.get(report.sponsorId)
    const eventSponsor = await ctx.db.get(report.eventSponsorId)

    return {
      ...report,
      sponsorName: sponsor?.name || 'Unknown',
      sponsorIndustry: sponsor?.industry,
      eventTitle: event.title,
      eventDate: event.startDate,
      sponsorshipBenefits: eventSponsor?.benefits || [],
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Generate a new ROI report for an event sponsorship
 */
export const generate = mutation({
  args: {
    eventSponsorId: v.id('eventSponsors'),
    reportType: v.optional(
      v.union(v.literal('post_event'), v.literal('interim'), v.literal('custom'))
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
      throw new Error('Not authorized to generate reports for this sponsorship')
    }

    // Get sponsor info
    const sponsor = await ctx.db.get(eventSponsor.sponsorId)
    if (!sponsor) throw new Error('Sponsor not found')

    // Get attendee stats
    const attendees = await ctx.db
      .query('attendees')
      .withIndex('by_event', (q) => q.eq('eventId', event._id))
      .collect()

    const totalAttendees = attendees.length
    const checkedInAttendees = attendees.filter((a) => a.status === 'checked_in').length

    // Get leads for this sponsorship
    const leads = await ctx.db
      .query('sponsorLeads')
      .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', args.eventSponsorId))
      .collect()

    const leadsGenerated = leads.length
    const sponsorshipAmount = eventSponsor.amount || 0

    // Calculate metrics
    const costPerLead = leadsGenerated > 0 ? sponsorshipAmount / leadsGenerated : undefined
    const costPerAttendee = totalAttendees > 0 ? sponsorshipAmount / totalAttendees : 0

    // Estimate impressions (conservative estimate: 3x the checked-in attendees)
    const estimatedImpressions = checkedInAttendees * 3

    const metrics = {
      sponsorshipAmount,
      tier: eventSponsor.tier || 'standard',
      totalAttendees,
      checkedInAttendees,
      leadsGenerated,
      costPerLead,
      costPerAttendee,
      estimatedImpressions,
    }

    // Generate highlights
    const highlights = generateHighlights(metrics)

    // Check for existing report and update or create
    const existingReport = await ctx.db
      .query('sponsorReports')
      .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', args.eventSponsorId))
      .first()

    if (existingReport) {
      // Update existing report
      await ctx.db.patch(existingReport._id, {
        reportType: args.reportType || 'post_event',
        generatedAt: Date.now(),
        generatedBy: user._id,
        metrics,
        highlights,
      })
      return { reportId: existingReport._id, updated: true }
    }

    // Create new report
    const reportId = await ctx.db.insert('sponsorReports', {
      eventId: event._id,
      sponsorId: sponsor._id,
      eventSponsorId: args.eventSponsorId,
      reportType: args.reportType || 'post_event',
      generatedAt: Date.now(),
      generatedBy: user._id,
      metrics,
      highlights,
    })

    return { reportId, updated: false }
  },
})

/**
 * Mark report as downloaded
 */
export const markDownloaded = mutation({
  args: {
    reportId: v.id('sponsorReports'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const report = await ctx.db.get(args.reportId)
    if (!report) throw new Error('Report not found')

    // Verify access
    const event = await ctx.db.get(report.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to update this report')
    }

    await ctx.db.patch(args.reportId, {
      downloadedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Mark report as sent to sponsor
 */
export const markSentToSponsor = mutation({
  args: {
    reportId: v.id('sponsorReports'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const report = await ctx.db.get(args.reportId)
    if (!report) throw new Error('Report not found')

    // Verify access
    const event = await ctx.db.get(report.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to update this report')
    }

    await ctx.db.patch(args.reportId, {
      sentToSponsorAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Delete a report
 */
export const remove = mutation({
  args: {
    reportId: v.id('sponsorReports'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const report = await ctx.db.get(args.reportId)
    if (!report) throw new Error('Report not found')

    // Verify access
    const event = await ctx.db.get(report.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Not authorized to delete this report')
    }

    await ctx.db.delete(args.reportId)

    return { success: true }
  },
})

/**
 * Generate all reports for an event (batch)
 */
export const generateAllForEvent = mutation({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify organizer access
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error('Event not found')
    if (event.organizerId !== user._id) {
      throw new Error('Not authorized to generate reports for this event')
    }

    // Get all confirmed sponsors for this event
    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .filter((q) => q.eq(q.field('status'), 'confirmed'))
      .collect()

    // Get attendee stats once (reused for all reports)
    const attendees = await ctx.db
      .query('attendees')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const totalAttendees = attendees.length
    const checkedInAttendees = attendees.filter((a) => a.status === 'checked_in').length

    let generated = 0
    const reportIds: string[] = []

    for (const eventSponsor of eventSponsors) {
      const sponsor = await ctx.db.get(eventSponsor.sponsorId)
      if (!sponsor) continue

      // Get leads for this sponsorship
      const leads = await ctx.db
        .query('sponsorLeads')
        .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', eventSponsor._id))
        .collect()

      const leadsGenerated = leads.length
      const sponsorshipAmount = eventSponsor.amount || 0

      const metrics = {
        sponsorshipAmount,
        tier: eventSponsor.tier || 'standard',
        totalAttendees,
        checkedInAttendees,
        leadsGenerated,
        costPerLead: leadsGenerated > 0 ? sponsorshipAmount / leadsGenerated : undefined,
        costPerAttendee: totalAttendees > 0 ? sponsorshipAmount / totalAttendees : 0,
        estimatedImpressions: checkedInAttendees * 3,
      }

      const highlights = generateHighlights(metrics)

      // Check for existing report
      const existingReport = await ctx.db
        .query('sponsorReports')
        .withIndex('by_event_sponsor', (q) => q.eq('eventSponsorId', eventSponsor._id))
        .first()

      if (existingReport) {
        await ctx.db.patch(existingReport._id, {
          reportType: 'post_event',
          generatedAt: Date.now(),
          generatedBy: user._id,
          metrics,
          highlights,
        })
        reportIds.push(existingReport._id)
      } else {
        const reportId = await ctx.db.insert('sponsorReports', {
          eventId: event._id,
          sponsorId: sponsor._id,
          eventSponsorId: eventSponsor._id,
          reportType: 'post_event',
          generatedAt: Date.now(),
          generatedBy: user._id,
          metrics,
          highlights,
        })
        reportIds.push(reportId)
      }

      generated++
    }

    return { generated, reportIds }
  },
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateHighlights(metrics: {
  sponsorshipAmount: number
  tier: string
  totalAttendees: number
  checkedInAttendees: number
  leadsGenerated: number
  costPerLead?: number
  costPerAttendee: number
  estimatedImpressions: number
}): string[] {
  const highlights: string[] = []

  // Attendance highlight
  if (metrics.checkedInAttendees > 0) {
    const attendanceRate = ((metrics.checkedInAttendees / metrics.totalAttendees) * 100).toFixed(0)
    highlights.push(
      `${metrics.checkedInAttendees} attendees checked in (${attendanceRate}% attendance rate)`
    )
  }

  // Lead generation highlight
  if (metrics.leadsGenerated > 0) {
    highlights.push(`${metrics.leadsGenerated} qualified leads captured`)
    if (metrics.costPerLead) {
      highlights.push(`Cost per lead: $${metrics.costPerLead.toFixed(2)}`)
    }
  }

  // Impressions highlight
  if (metrics.estimatedImpressions > 0) {
    highlights.push(`Estimated ${metrics.estimatedImpressions.toLocaleString()} brand impressions`)
  }

  // Cost efficiency highlight
  if (metrics.costPerAttendee > 0) {
    highlights.push(`Cost per attendee reached: $${metrics.costPerAttendee.toFixed(2)}`)
  }

  // Tier highlight
  if (metrics.tier && metrics.tier !== 'standard') {
    highlights.push(`${metrics.tier.charAt(0).toUpperCase() + metrics.tier.slice(1)} tier sponsor`)
  }

  return highlights
}
