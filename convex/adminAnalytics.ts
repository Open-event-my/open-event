/**
 * Admin Analytics System
 *
 * Provides time-series analytics data for the admin dashboard including:
 * - User growth over time
 * - Event creation trends
 * - Application statistics
 * - Revenue/activity metrics
 *
 * NOTE: All analytics data is anonymized to comply with GDPR requirements.
 * PII (email, name, phone, IP addresses) is hashed or removed.
 */

import { v } from 'convex/values'
import { query } from './_generated/server'
import { assertRole } from './lib/auth'
import { anonymizeUserForAnalytics } from './lib/compliance/analyticsAnonymization'

// ============================================================================
// Types
// ============================================================================

type Period = '7d' | '30d' | '90d'

interface TimeSeriesDataPoint {
  date: string
  count: number
}

interface ApplicationStats {
  total: number
  pending: number
  approved: number
  rejected: number
  approvalRate: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date range based on period
 */
function getDateRange(period: Period): { startDate: number; endDate: number; buckets: number } {
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  switch (period) {
    case '7d':
      return { startDate: now - 7 * DAY, endDate: now, buckets: 7 }
    case '30d':
      return { startDate: now - 30 * DAY, endDate: now, buckets: 30 }
    case '90d':
      return { startDate: now - 90 * DAY, endDate: now, buckets: 12 } // Weekly buckets for 90d
    default:
      return { startDate: now - 30 * DAY, endDate: now, buckets: 30 }
  }
}

/**
 * Format date for display
 */
function formatDate(timestamp: number, period: Period): string {
  const date = new Date(timestamp)
  if (period === '90d') {
    // Week format
    return `W${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('en-US', { month: 'short' })}`
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Group items by date bucket
 */
function groupByDateBucket(
  items: { createdAt?: number; _creationTime?: number }[],
  period: Period,
  startDate: number,
  buckets: number
): TimeSeriesDataPoint[] {
  const DAY = 24 * 60 * 60 * 1000
  const bucketSize = period === '90d' ? 7 * DAY : DAY
  const result: TimeSeriesDataPoint[] = []

  for (let i = 0; i < buckets; i++) {
    const bucketStart = startDate + i * bucketSize
    const bucketEnd = bucketStart + bucketSize

    const count = items.filter((item) => {
      const time = item.createdAt || item._creationTime || 0
      return time >= bucketStart && time < bucketEnd
    }).length

    result.push({
      date: formatDate(bucketStart, period),
      count,
    })
  }

  return result
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get comprehensive dashboard analytics
 * Accessible by admin and superadmin
 */
export const getDashboardAnalytics = query({
  args: {
    period: v.union(v.literal('7d'), v.literal('30d'), v.literal('90d')),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const { startDate, endDate, buckets } = getDateRange(args.period)

    // Get all users created in period
    const allUsers = await ctx.db.query('users').collect()
    const periodUsers = allUsers.filter((u) => {
      const time = u.createdAt || u._creationTime || 0
      return time >= startDate && time <= endDate
    })

    // Get all events created in period
    const allEvents = await ctx.db.query('events').collect()
    const periodEvents = allEvents.filter((e) => {
      const time = e.createdAt || e._creationTime || 0
      return time >= startDate && time <= endDate
    })

    // Get vendor applications
    const vendorApps = await ctx.db.query('eventVendors').collect()
    const periodVendorApps = vendorApps.filter((v) => {
      const time = v.createdAt || v._creationTime || 0
      return time >= startDate && time <= endDate
    })

    // Get sponsor applications
    const sponsorApps = await ctx.db.query('eventSponsors').collect()
    const periodSponsorApps = sponsorApps.filter((s) => {
      const time = s.createdAt || s._creationTime || 0
      return time >= startDate && time <= endDate
    })

    // Build time series data
    const userGrowth = groupByDateBucket(periodUsers, args.period, startDate, buckets)
    const eventCreations = groupByDateBucket(periodEvents, args.period, startDate, buckets)

    // Calculate application stats
    const allApplications = [...periodVendorApps, ...periodSponsorApps]
    const pendingApps = allApplications.filter((a) => a.status === 'pending')
    const approvedApps = allApplications.filter((a) => a.status === 'approved')
    const rejectedApps = allApplications.filter((a) => a.status === 'rejected')

    const applicationStats: ApplicationStats = {
      total: allApplications.length,
      pending: pendingApps.length,
      approved: approvedApps.length,
      rejected: rejectedApps.length,
      approvalRate:
        allApplications.length > 0
          ? Math.round(
              (approvedApps.length / (approvedApps.length + rejectedApps.length || 1)) * 100
            )
          : 0,
    }

    // Calculate week-over-week changes
    const prevPeriodStart = startDate - (endDate - startDate)
    const prevPeriodUsers = allUsers.filter((u) => {
      const time = u.createdAt || u._creationTime || 0
      return time >= prevPeriodStart && time < startDate
    })
    const prevPeriodEvents = allEvents.filter((e) => {
      const time = e.createdAt || e._creationTime || 0
      return time >= prevPeriodStart && time < startDate
    })

    const userChange =
      prevPeriodUsers.length > 0
        ? Math.round(((periodUsers.length - prevPeriodUsers.length) / prevPeriodUsers.length) * 100)
        : periodUsers.length > 0
          ? 100
          : 0

    const eventChange =
      prevPeriodEvents.length > 0
        ? Math.round(
            ((periodEvents.length - prevPeriodEvents.length) / prevPeriodEvents.length) * 100
          )
        : periodEvents.length > 0
          ? 100
          : 0

    return {
      userGrowth,
      eventCreations,
      applicationStats,
      summary: {
        totalUsers: allUsers.length,
        newUsers: periodUsers.length,
        userChange,
        totalEvents: allEvents.length,
        newEvents: periodEvents.length,
        eventChange,
        activeEvents: allEvents.filter((e) => e.status === 'published').length,
      },
    }
  },
})

/**
 * Get event status distribution
 * Accessible by admin and superadmin
 */
export const getEventStatusDistribution = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const events = await ctx.db.query('events').collect()

    const distribution = {
      draft: 0,
      published: 0,
      cancelled: 0,
      completed: 0,
    }

    for (const event of events) {
      const status = event.status || 'draft'
      if (status in distribution) {
        distribution[status as keyof typeof distribution]++
      }
    }

    return distribution
  },
})

/**
 * Get user role distribution
 * Accessible by admin and superadmin
 */
export const getUserRoleDistribution = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const users = await ctx.db.query('users').collect()

    const distribution = {
      organizer: 0,
      admin: 0,
      superadmin: 0,
      suspended: 0,
    }

    for (const user of users) {
      if (user.status === 'suspended') {
        distribution.suspended++
      } else {
        const role = user.role || 'organizer'
        if (role in distribution) {
          distribution[role as keyof typeof distribution]++
        }
      }
    }

    return distribution
  },
})

/**
 * Get recent activity for the dashboard feed
 * Accessible by admin and superadmin
 * NOTE: User names and emails are anonymized
 */
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const limit = args.limit || 10
    const activities: {
      type: string
      title: string
      description: string
      timestamp: number
    }[] = []

    // Get recent users
    const recentUsers = await ctx.db.query('users').order('desc').take(5)

    for (const user of recentUsers) {
      // Anonymize user data - don't expose email or name
      const anonymized = anonymizeUserForAnalytics(user)
      activities.push({
        type: 'user_joined',
        title: 'New User',
        description: `User ${anonymized.emailHash?.substring(0, 8) || 'unknown'} joined the platform`,
        timestamp: user.createdAt || user._creationTime || Date.now(),
      })
    }

    // Get recent events
    const recentEvents = await ctx.db.query('events').order('desc').take(5)

    for (const event of recentEvents) {
      activities.push({
        type: 'event_created',
        title: 'Event Created',
        description: `"${event.title}" was created`,
        timestamp: event.createdAt || event._creationTime || Date.now(),
      })
    }

    // Get recent moderation logs
    const recentModerations = await ctx.db.query('moderationLogs').order('desc').take(5)

    for (const log of recentModerations) {
      activities.push({
        type: 'moderation_action',
        title: 'Moderation',
        description: `${log.action.replace(/_/g, ' ')} action taken`,
        timestamp: log.createdAt || Date.now(),
      })
    }

    // Sort by timestamp and return limited results
    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  },
})

/**
 * Get application trends over time
 * Accessible by admin and superadmin
 */
export const getApplicationTrends = query({
  args: {
    period: v.union(v.literal('7d'), v.literal('30d'), v.literal('90d')),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const { startDate, buckets } = getDateRange(args.period)

    // Get vendor applications
    const vendorApps = await ctx.db.query('eventVendors').collect()
    const periodVendorApps = vendorApps.filter((v) => {
      const time = v.createdAt || v._creationTime || 0
      return time >= startDate
    })

    // Get sponsor applications
    const sponsorApps = await ctx.db.query('eventSponsors').collect()
    const periodSponsorApps = sponsorApps.filter((s) => {
      const time = s.createdAt || s._creationTime || 0
      return time >= startDate
    })

    const vendorTrend = groupByDateBucket(periodVendorApps, args.period, startDate, buckets)
    const sponsorTrend = groupByDateBucket(periodSponsorApps, args.period, startDate, buckets)

    // Combine trends
    return vendorTrend.map((point, i) => ({
      date: point.date,
      vendors: point.count,
      sponsors: sponsorTrend[i]?.count || 0,
      total: point.count + (sponsorTrend[i]?.count || 0),
    }))
  },
})
