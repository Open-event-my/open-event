import { v } from 'convex/values'
import { query } from './_generated/server'
import { getCurrentUser } from './lib/auth'

/**
 * Returns a list of suggested actions based on the user's profile and current data state.
 * This drives the "AI Action Feed" in the dashboard.
 */
export const getSuggestedActions = query({
  args: { accessToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.accessToken)
    if (!user) return []

    const profile = await ctx.db
      .query('organizerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (!profile) return []

    const actions = []

    // 1. Role-based Actions
    if (profile.role === 'organizer') {
      // Check if they have any events
      const eventCount = (await ctx.db
        .query('events')
        .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
        .collect()).length

      if (eventCount === 0) {
        actions.push({
          id: 'create-first-event',
          title: 'Create your first event',
          description: `Get started with your first ${profile.eventTypes?.[0] || 'event'}.`,
          cta: 'Create Event',
          link: '/dashboard/events/new',
          priority: 'high',
          icon: 'Plus',
        })
      }
    } else if (profile.role === 'sponsor') {
       // Check if they have filled out brand guidelines
       // (This assumes we might check specific fields in the future, for now generic)
       actions.push({
          id: 'complete-sponsor-profile',
          title: 'Upload Brand Assets',
          description: 'Make it easy for organizers to feature you by uploading logos.',
          cta: 'Go to Profile',
          link: '/dashboard/settings',
          priority: 'medium',
          icon: 'Upload',
       })
    }

    // 2. Goal-based Actions
    if (profile.goals?.includes('Find sponsors')) {
      actions.push({
        id: 'browse-sponsors',
        title: 'Find Potential Sponsors',
        description: 'Browse our database of verified sponsors matching your industry.',
        cta: 'Browse Sponsors',
        link: '/dashboard/sponsors/market',
        priority: 'medium',
        icon: 'Handshake',
      })
    }

    // 3. Experience-based Nudges
    if (profile.experienceLevel === 'first-time') {
      actions.push({
        id: 'read-guide',
        title: 'Organizer Guide 101',
        description: 'Learn the basics of running a successful event on Open Event.',
        cta: 'Read Guide',
        link: '/resources/guide',
        priority: 'low',
        icon: 'BookOpen',
      })
    }

    return actions
  },
})

/**
 * Returns recommended vendors or sponsors based on profile matching.
 */
export const getRecommendedResources = query({
  args: { accessToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.accessToken)
    if (!user) return []

    const profile = await ctx.db
      .query('organizerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (!profile) return []

    // Simple matching logic (can be expanded with vector search later)
    // For organizers: find vendors matching their event types/needs
    if (profile.role === 'organizer') {
      // Mock recommendation logic for now - in production this would query the 'vendors' table
      // filtering by tags that overlap with profile.eventTypes
      const vendors = await ctx.db.query('vendors').take(3)
      return vendors.map(v => ({
        type: 'vendor',
        id: v._id,
        name: v.name,
        category: v.category,
        matchReason: 'Matches your event type',
      }))
    }
    
    return []
  }
})
