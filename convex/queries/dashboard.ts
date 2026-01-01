import { query } from '../_generated/server'
import { assertRole } from '../lib/auth'

/**
 * Superadmin Dashboard Query
 * Returns exactly the specified contract shape
 */
export const getSuperadminDashboard = query({
  args: {},
  handler: async (ctx) => {
    // Assert superadmin role
    await assertRole(ctx, 'superadmin')

    // Get all organizers
    const organizers = await ctx.db
      .query('users')
      .collect()
      .then((users) => users.filter((u) => u.role === 'organizer'))

    // Get all events
    const events = await ctx.db.query('events').collect()

    // Get approved vendors
    const approvedVendors = await ctx.db
      .query('vendors')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()

    // Get approved sponsors
    const approvedSponsors = await ctx.db
      .query('sponsors')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()

    // Get pending vendors with required fields
    const pendingVendors = await ctx.db
      .query('vendors')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()
      .then((vendors) =>
        vendors.map((v) => ({
          id: v._id,
          name: v.name,
          category: v.category,
          submittedAt: v.createdAt,
        }))
      )

    // Get recent events with organizer names
    const recentEvents = await Promise.all(
      events
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(async (event) => {
          const organizer = await ctx.db.get(event.organizerId)
          return {
            id: event._id,
            title: event.title,
            date: event.startDate,
            organizerName: organizer?.name || 'Unknown',
          }
        })
    )

    // Return exact contract shape
    return {
      stats: {
        totalOrganizers: organizers.length,
        totalEvents: events.length,
        totalApprovedVendors: approvedVendors.length,
        totalApprovedSponsors: approvedSponsors.length,
      },
      pendingVendors,
      recentEvents,
    }
  },
})

/**
 * Organizer Dashboard Query
 * Returns exactly the specified contract shape
 */
export const getOrganizerDashboard = query({
  args: {},
  handler: async (ctx) => {
    // Assert organizer role
    const currentUser = await assertRole(ctx, 'organizer')

    // Get all events for this organizer
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', currentUser._id))
      .collect()

    const now = Date.now()

    // Count upcoming events (startDate >= now)
    const upcomingEvents = allEvents.filter((e) => e.startDate >= now).length

    // Build events array with required shape
    const events = await Promise.all(
      allEvents.map(async (event) => {
        // Get sponsors for this event
        const eventSponsors = await ctx.db
          .query('eventSponsors')
          .withIndex('by_event', (q) => q.eq('eventId', event._id))
          .collect()

        // Get sponsor details to count by status
        const sponsorDetails = await Promise.all(
          eventSponsors.map((es) => ctx.db.get(es.sponsorId))
        )

        const pendingSponsors = sponsorDetails.filter((s) => s?.status === 'pending').length
        const approvedSponsors = sponsorDetails.filter((s) => s?.status === 'approved').length

        // Get vendors for this event
        const eventVendors = await ctx.db
          .query('eventVendors')
          .withIndex('by_event', (q) => q.eq('eventId', event._id))
          .collect()

        // Get volunteers count (if volunteers table exists)
        // For minimal schema, return 0
        const volunteersTotal = 0

        return {
          id: event._id,
          title: event.title,
          date: event.startDate,
          venue: event.venueName ?? '', // Use venueName from expanded schema
          sponsors: {
            total: eventSponsors.length,
            pending: pendingSponsors,
            approved: approvedSponsors,
          },
          vendors: {
            total: eventVendors.length,
          },
          volunteers: {
            total: volunteersTotal,
          },
        }
      })
    )

    // Return exact contract shape
    return {
      stats: {
        totalEvents: allEvents.length,
        upcomingEvents,
      },
      events,
    }
  },
})
