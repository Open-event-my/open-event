// ============================================================================
// Analytics Queries
// ============================================================================
// Advanced analytics for events, vendors, sponsors, and performance metrics

import { v } from 'convex/values'
import { query, internalQuery } from './_generated/server'
import { getCurrentUser, isAdminRole } from './lib/auth'
import {
  anonymizeEventForAnalytics,
  anonymizeUserForAnalytics,
} from './lib/compliance/analyticsAnonymization'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get start of period (day, week, month, year)
 */
function getPeriodStart(timestamp: number, period: 'day' | 'week' | 'month' | 'year'): number {
  const date = new Date(timestamp)

  switch (period) {
    case 'day':
      date.setHours(0, 0, 0, 0)
      return date.getTime()

    case 'week': {
      const day = date.getDay()
      date.setDate(date.getDate() - day)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }

    case 'month':
      date.setDate(1)
      date.setHours(0, 0, 0, 0)
      return date.getTime()

    case 'year':
      date.setMonth(0, 1)
      date.setHours(0, 0, 0, 0)
      return date.getTime()

    default:
      return timestamp
  }
}

/**
 * Group events by time period
 */
function groupByPeriod<T>(
  items: T[],
  getTimestamp: (item: T) => number,
  period: 'day' | 'week' | 'month' | 'year'
): Map<number, T[]> {
  const grouped = new Map<number, T[]>()

  for (const item of items) {
    const timestamp = getTimestamp(item)
    const periodStart = getPeriodStart(timestamp, period)

    if (!grouped.has(periodStart)) {
      grouped.set(periodStart, [])
    }
    grouped.get(periodStart)!.push(item)
  }

  return grouped
}

// ============================================================================
// Event Analytics
// ============================================================================

/**
 * Get event trends over time
 * Returns events grouped by time period (daily, weekly, monthly, yearly)
 */
export const getEventTrends = query({
  args: {
    period: v.optional(
      v.union(v.literal('day'), v.literal('week'), v.literal('month'), v.literal('year'))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const period = args.period || 'month'
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000 // Default: 1 year ago
    const endDate = args.endDate || now

    // Get all events for this organizer
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    // Group by period
    const grouped = groupByPeriod(eventsInRange, (e) => e.createdAt, period)

    // Convert to array format
    const trends = Array.from(grouped.entries())
      .map(([periodStart, events]) => {
        // Calculate metrics for this period
        const totalEvents = events.length
        const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0)
        const totalAttendees = events.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)

        // Count by status
        const byStatus = {
          draft: events.filter((e) => e.status === 'draft').length,
          planning: events.filter((e) => e.status === 'planning').length,
          active: events.filter((e) => e.status === 'active').length,
          completed: events.filter((e) => e.status === 'completed').length,
          cancelled: events.filter((e) => e.status === 'cancelled').length,
        }

        return {
          period: periodStart,
          periodLabel: new Date(periodStart).toISOString(),
          totalEvents,
          totalBudget,
          totalAttendees,
          averageBudget: totalEvents > 0 ? Math.round(totalBudget / totalEvents) : 0,
          averageAttendees: totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0,
          byStatus,
        }
      })
      .sort((a, b) => a.period - b.period)

    return trends
  },
})

/**
 * Get event performance metrics
 * Includes conversion rates, averages, and comparisons
 */
export const getEventPerformance = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000 // Default: 1 year ago
    const endDate = args.endDate || now

    // Get all events
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    if (eventsInRange.length === 0) {
      return {
        totalEvents: 0,
        completedEvents: 0,
        completionRate: 0,
        averageBudget: 0,
        averageAttendees: 0,
        totalBudget: 0,
        totalAttendees: 0,
        byEventType: {},
        byLocationType: {},
      }
    }

    // Get vendor and sponsor data
    const eventIds = new Set(eventsInRange.map((e) => e._id))
    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    const eventVendors = allEventVendors.filter((ev) => eventIds.has(ev.eventId))
    const eventSponsors = allEventSponsors.filter((es) => eventIds.has(es.eventId))

    // Calculate metrics
    const totalEvents = eventsInRange.length
    const completedEvents = eventsInRange.filter((e) => e.status === 'completed').length
    const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0

    const totalBudget = eventsInRange.reduce((sum, e) => sum + (e.budget || 0), 0)
    const averageBudget = totalEvents > 0 ? Math.round(totalBudget / totalEvents) : 0

    const totalAttendees = eventsInRange.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)
    const averageAttendees = totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0

    // Vendor metrics
    const totalVendorApplications = eventVendors.length
    const confirmedVendors = eventVendors.filter((ev) => ev.status === 'confirmed').length
    const vendorConversionRate =
      totalVendorApplications > 0 ? (confirmedVendors / totalVendorApplications) * 100 : 0

    // Sponsor metrics
    const totalSponsorApplications = eventSponsors.length
    const confirmedSponsors = eventSponsors.filter((es) => es.status === 'confirmed').length
    const sponsorConversionRate =
      totalSponsorApplications > 0 ? (confirmedSponsors / totalSponsorApplications) * 100 : 0

    // Group by event type
    const byEventType: Record<string, number> = {}
    for (const event of eventsInRange) {
      const type = event.eventType || 'other'
      byEventType[type] = (byEventType[type] || 0) + 1
    }

    // Group by location type
    const byLocationType: Record<string, number> = {}
    for (const event of eventsInRange) {
      const location = event.locationType || 'other'
      byLocationType[location] = (byLocationType[location] || 0) + 1
    }

    return {
      totalEvents,
      completedEvents,
      completionRate: Math.round(completionRate * 100) / 100,
      averageBudget,
      averageAttendees,
      totalBudget,
      totalAttendees,
      vendorMetrics: {
        totalApplications: totalVendorApplications,
        confirmed: confirmedVendors,
        conversionRate: Math.round(vendorConversionRate * 100) / 100,
      },
      sponsorMetrics: {
        totalApplications: totalSponsorApplications,
        confirmed: confirmedSponsors,
        conversionRate: Math.round(sponsorConversionRate * 100) / 100,
      },
      byEventType,
      byLocationType,
    }
  },
})

/**
 * Get comparative analytics (this period vs previous period)
 */
export const getComparativeAnalytics = query({
  args: {
    period: v.optional(v.union(v.literal('week'), v.literal('month'), v.literal('year'))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const period = args.period || 'month'
    const now = Date.now()

    // Calculate period boundaries
    const currentPeriodStart = getPeriodStart(now, period)
    let previousPeriodStart: number
    let previousPeriodEnd: number

    switch (period) {
      case 'week':
        previousPeriodStart = currentPeriodStart - 7 * 24 * 60 * 60 * 1000
        previousPeriodEnd = currentPeriodStart
        break
      case 'month': {
        const currentMonth = new Date(currentPeriodStart)
        currentMonth.setMonth(currentMonth.getMonth() - 1)
        previousPeriodStart = currentMonth.getTime()
        previousPeriodEnd = currentPeriodStart
        break
      }
      case 'year': {
        const currentYear = new Date(currentPeriodStart)
        currentYear.setFullYear(currentYear.getFullYear() - 1)
        previousPeriodStart = currentYear.getTime()
        previousPeriodEnd = currentPeriodStart
        break
      }
    }

    // Get all events
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    // Filter to current and previous periods
    const currentEvents = allEvents.filter(
      (e) => e.createdAt >= currentPeriodStart && e.createdAt < now
    )
    const previousEvents = allEvents.filter(
      (e) => e.createdAt >= previousPeriodStart && e.createdAt < previousPeriodEnd
    )

    // Calculate metrics for current period
    const current = {
      totalEvents: currentEvents.length,
      totalBudget: currentEvents.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalAttendees: currentEvents.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0),
      completedEvents: currentEvents.filter((e) => e.status === 'completed').length,
    }

    // Calculate metrics for previous period
    const previous = {
      totalEvents: previousEvents.length,
      totalBudget: previousEvents.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalAttendees: previousEvents.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0),
      completedEvents: previousEvents.filter((e) => e.status === 'completed').length,
    }

    // Calculate changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 100) / 100
    }

    return {
      period,
      current: {
        ...current,
        averageBudget:
          current.totalEvents > 0 ? Math.round(current.totalBudget / current.totalEvents) : 0,
        averageAttendees:
          current.totalEvents > 0 ? Math.round(current.totalAttendees / current.totalEvents) : 0,
      },
      previous: {
        ...previous,
        averageBudget:
          previous.totalEvents > 0 ? Math.round(previous.totalBudget / previous.totalEvents) : 0,
        averageAttendees:
          previous.totalEvents > 0 ? Math.round(previous.totalAttendees / previous.totalEvents) : 0,
      },
      changes: {
        totalEvents: calculateChange(current.totalEvents, previous.totalEvents),
        totalBudget: calculateChange(current.totalBudget, previous.totalBudget),
        totalAttendees: calculateChange(current.totalAttendees, previous.totalAttendees),
        completedEvents: calculateChange(current.completedEvents, previous.completedEvents),
      },
    }
  },
})

/**
 * Get budget analytics
 * Track budget allocation, spending trends, and budget efficiency
 */
export const getBudgetAnalytics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get all events
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    // Get budget items if they exist
    const eventIds = new Set(eventsInRange.map((e) => e._id))
    const allBudgetItems = await ctx.db.query('budgetItems').collect()
    const budgetItems = allBudgetItems.filter((bi) => eventIds.has(bi.eventId))

    // Calculate budget metrics
    const totalBudget = eventsInRange.reduce((sum, e) => sum + (e.budget || 0), 0)
    const eventsWithBudget = eventsInRange.filter((e) => e.budget && e.budget > 0).length

    // Calculate actual spending from budget items
    const totalSpent = budgetItems.reduce(
      (sum, bi) => sum + (bi.actualAmount || bi.estimatedAmount || 0),
      0
    )
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    // Group by currency
    const byCurrency: Record<string, { budget: number; spent: number; count: number }> = {}
    for (const event of eventsInRange) {
      if (event.budget && event.budget > 0) {
        const currency = event.budgetCurrency || 'USD'
        if (!byCurrency[currency]) {
          byCurrency[currency] = { budget: 0, spent: 0, count: 0 }
        }
        byCurrency[currency].budget += event.budget
        byCurrency[currency].count += 1
      }
    }

    // Add spent amounts by currency (assuming budget items have currency)
    for (const item of budgetItems) {
      // Note: budgetItems schema may need currency field - for now assume same as event
      const event = eventsInRange.find((e) => e._id === item.eventId)
      if (event) {
        const currency = event.budgetCurrency || 'USD'
        if (byCurrency[currency]) {
          byCurrency[currency].spent += item.actualAmount || 0
        }
      }
    }

    return {
      totalBudget,
      totalSpent,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      eventsWithBudget,
      averageBudget: eventsWithBudget > 0 ? Math.round(totalBudget / eventsWithBudget) : 0,
      byCurrency,
      budgetItemsCount: budgetItems.length,
    }
  },
})

/**
 * Get vendor/sponsor engagement analytics
 */
export const getEngagementAnalytics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get all events
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    const eventIds = new Set(eventsInRange.map((e) => e._id))

    // Get vendor and sponsor data
    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    const eventVendors = allEventVendors.filter((ev) => eventIds.has(ev.eventId))
    const eventSponsors = allEventSponsors.filter((es) => eventIds.has(es.eventId))

    // Vendor analytics
    const vendorApplications = eventVendors.length
    const confirmedVendors = eventVendors.filter((ev) => ev.status === 'confirmed').length
    const pendingVendors = eventVendors.filter((ev) => ev.status === 'pending').length
    const declinedVendors = eventVendors.filter((ev) => ev.status === 'declined').length

    // Sponsor analytics
    const sponsorApplications = eventSponsors.length
    const confirmedSponsors = eventSponsors.filter((es) => es.status === 'confirmed').length
    const pendingSponsors = eventSponsors.filter((es) => es.status === 'pending').length
    const declinedSponsors = eventSponsors.filter((es) => es.status === 'declined').length

    // Calculate conversion rates
    const vendorConversionRate =
      vendorApplications > 0 ? (confirmedVendors / vendorApplications) * 100 : 0
    const sponsorConversionRate =
      sponsorApplications > 0 ? (confirmedSponsors / sponsorApplications) * 100 : 0

    // Average vendors/sponsors per event
    const eventsWithVendors = new Set(eventVendors.map((ev) => ev.eventId)).size
    const eventsWithSponsors = new Set(eventSponsors.map((es) => es.eventId)).size

    const avgVendorsPerEvent = eventsWithVendors > 0 ? vendorApplications / eventsWithVendors : 0
    const avgSponsorsPerEvent =
      eventsWithSponsors > 0 ? sponsorApplications / eventsWithSponsors : 0

    return {
      vendors: {
        totalApplications: vendorApplications,
        confirmed: confirmedVendors,
        pending: pendingVendors,
        declined: declinedVendors,
        conversionRate: Math.round(vendorConversionRate * 100) / 100,
        eventsWithVendors,
        averagePerEvent: Math.round(avgVendorsPerEvent * 100) / 100,
      },
      sponsors: {
        totalApplications: sponsorApplications,
        confirmed: confirmedSponsors,
        pending: pendingSponsors,
        declined: declinedSponsors,
        conversionRate: Math.round(sponsorConversionRate * 100) / 100,
        eventsWithSponsors,
        averagePerEvent: Math.round(avgSponsorsPerEvent * 100) / 100,
      },
    }
  },
})

// ============================================================================
// Platform-Wide Analytics Queries (Admin/Superadmin Only)
// ============================================================================

/**
 * Get platform-wide event trends over time
 * Admin/Superadmin only - aggregates data across all organizers
 */
export const getPlatformEventTrends = query({
  args: {
    period: v.optional(
      v.union(v.literal('day'), v.literal('week'), v.literal('month'), v.literal('year'))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const period = args.period || 'month'
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get ALL events (no organizer filter)
    const allEvents = await ctx.db.query('events').collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    // Group by period
    const grouped = groupByPeriod(eventsInRange, (e) => e.createdAt, period)

    // Convert to array format
    const trends = Array.from(grouped.entries())
      .map(([periodStart, events]) => {
        const totalEvents = events.length
        const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0)
        const totalAttendees = events.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)

        const byStatus = {
          draft: events.filter((e) => e.status === 'draft').length,
          planning: events.filter((e) => e.status === 'planning').length,
          active: events.filter((e) => e.status === 'active').length,
          completed: events.filter((e) => e.status === 'completed').length,
          cancelled: events.filter((e) => e.status === 'cancelled').length,
        }

        return {
          period: periodStart,
          periodLabel: new Date(periodStart).toISOString(),
          totalEvents,
          totalBudget,
          totalAttendees,
          averageBudget: totalEvents > 0 ? Math.round(totalBudget / totalEvents) : 0,
          averageAttendees: totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0,
          byStatus,
        }
      })
      .sort((a, b) => a.period - b.period)

    return trends
  },
})

/**
 * Get platform-wide event performance metrics
 * Admin/Superadmin only
 */
export const getPlatformEventPerformance = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get ALL events (no organizer filter)
    const allEvents = await ctx.db.query('events').collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    if (eventsInRange.length === 0) {
      return {
        totalEvents: 0,
        completedEvents: 0,
        completionRate: 0,
        averageBudget: 0,
        averageAttendees: 0,
        totalBudget: 0,
        totalAttendees: 0,
        byEventType: {},
        byLocationType: {},
      }
    }

    // Get vendor and sponsor data
    const eventIds = new Set(eventsInRange.map((e) => e._id))
    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    const eventVendors = allEventVendors.filter((ev) => eventIds.has(ev.eventId))
    const eventSponsors = allEventSponsors.filter((es) => eventIds.has(es.eventId))

    // Calculate metrics
    const totalEvents = eventsInRange.length
    const completedEvents = eventsInRange.filter((e) => e.status === 'completed').length
    const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0

    const totalBudget = eventsInRange.reduce((sum, e) => sum + (e.budget || 0), 0)
    const averageBudget = totalEvents > 0 ? Math.round(totalBudget / totalEvents) : 0

    const totalAttendees = eventsInRange.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)
    const averageAttendees = totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0

    // Vendor metrics
    const totalVendorApplications = eventVendors.length
    const confirmedVendors = eventVendors.filter((ev) => ev.status === 'confirmed').length
    const vendorConversionRate =
      totalVendorApplications > 0 ? (confirmedVendors / totalVendorApplications) * 100 : 0

    // Sponsor metrics
    const totalSponsorApplications = eventSponsors.length
    const confirmedSponsors = eventSponsors.filter((es) => es.status === 'confirmed').length
    const sponsorConversionRate =
      totalSponsorApplications > 0 ? (confirmedSponsors / totalSponsorApplications) * 100 : 0

    // Group by event type
    const byEventType: Record<string, number> = {}
    for (const event of eventsInRange) {
      const type = event.eventType || 'other'
      byEventType[type] = (byEventType[type] || 0) + 1
    }

    // Group by location type
    const byLocationType: Record<string, number> = {}
    for (const event of eventsInRange) {
      const location = event.locationType || 'other'
      byLocationType[location] = (byLocationType[location] || 0) + 1
    }

    return {
      totalEvents,
      completedEvents,
      completionRate: Math.round(completionRate * 100) / 100,
      averageBudget,
      averageAttendees,
      totalBudget,
      totalAttendees,
      vendorMetrics: {
        totalApplications: totalVendorApplications,
        confirmed: confirmedVendors,
        conversionRate: Math.round(vendorConversionRate * 100) / 100,
      },
      sponsorMetrics: {
        totalApplications: totalSponsorApplications,
        confirmed: confirmedSponsors,
        conversionRate: Math.round(sponsorConversionRate * 100) / 100,
      },
      byEventType,
      byLocationType,
    }
  },
})

/**
 * Get platform-wide comparative analytics
 * Admin/Superadmin only
 */
export const getPlatformComparativeAnalytics = query({
  args: {
    period: v.optional(v.union(v.literal('week'), v.literal('month'), v.literal('year'))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const period = args.period || 'month'
    const now = Date.now()

    // Calculate period boundaries
    const currentPeriodStart = getPeriodStart(now, period)
    let previousPeriodStart: number
    let previousPeriodEnd: number

    switch (period) {
      case 'week':
        previousPeriodStart = currentPeriodStart - 7 * 24 * 60 * 60 * 1000
        previousPeriodEnd = currentPeriodStart
        break
      case 'month': {
        const currentMonth = new Date(currentPeriodStart)
        currentMonth.setMonth(currentMonth.getMonth() - 1)
        previousPeriodStart = currentMonth.getTime()
        previousPeriodEnd = currentPeriodStart
        break
      }
      case 'year': {
        const currentYear = new Date(currentPeriodStart)
        currentYear.setFullYear(currentYear.getFullYear() - 1)
        previousPeriodStart = currentYear.getTime()
        previousPeriodEnd = currentPeriodStart
        break
      }
    }

    // Get ALL events (no organizer filter)
    const allEvents = await ctx.db.query('events').collect()

    // Filter to current and previous periods
    const currentEvents = allEvents.filter(
      (e) => e.createdAt >= currentPeriodStart && e.createdAt < now
    )
    const previousEvents = allEvents.filter(
      (e) => e.createdAt >= previousPeriodStart && e.createdAt < previousPeriodEnd
    )

    // Calculate metrics for current period
    const current = {
      totalEvents: currentEvents.length,
      totalBudget: currentEvents.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalAttendees: currentEvents.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0),
      completedEvents: currentEvents.filter((e) => e.status === 'completed').length,
    }

    // Calculate metrics for previous period
    const previous = {
      totalEvents: previousEvents.length,
      totalBudget: previousEvents.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalAttendees: previousEvents.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0),
      completedEvents: previousEvents.filter((e) => e.status === 'completed').length,
    }

    // Calculate changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 100) / 100
    }

    return {
      period,
      current: {
        ...current,
        averageBudget:
          current.totalEvents > 0 ? Math.round(current.totalBudget / current.totalEvents) : 0,
        averageAttendees:
          current.totalEvents > 0 ? Math.round(current.totalAttendees / current.totalEvents) : 0,
      },
      previous: {
        ...previous,
        averageBudget:
          previous.totalEvents > 0 ? Math.round(previous.totalBudget / previous.totalEvents) : 0,
        averageAttendees:
          previous.totalEvents > 0 ? Math.round(previous.totalAttendees / previous.totalEvents) : 0,
      },
      changes: {
        totalEvents: calculateChange(current.totalEvents, previous.totalEvents),
        totalBudget: calculateChange(current.totalBudget, previous.totalBudget),
        totalAttendees: calculateChange(current.totalAttendees, previous.totalAttendees),
        completedEvents: calculateChange(current.completedEvents, previous.completedEvents),
      },
    }
  },
})

/**
 * Get platform-wide budget analytics
 * Admin/Superadmin only
 */
export const getPlatformBudgetAnalytics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get ALL events (no organizer filter)
    const allEvents = await ctx.db.query('events').collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    // Get budget items
    const eventIds = new Set(eventsInRange.map((e) => e._id))
    const allBudgetItems = await ctx.db.query('budgetItems').collect()
    const budgetItems = allBudgetItems.filter((bi) => eventIds.has(bi.eventId))

    // Calculate budget metrics
    const totalBudget = eventsInRange.reduce((sum, e) => sum + (e.budget || 0), 0)
    const eventsWithBudget = eventsInRange.filter((e) => e.budget && e.budget > 0).length

    // Calculate actual spending from budget items
    const totalSpent = budgetItems.reduce(
      (sum, bi) => sum + (bi.actualAmount || bi.estimatedAmount || 0),
      0
    )
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    // Group by currency
    const byCurrency: Record<string, { budget: number; spent: number; count: number }> = {}
    for (const event of eventsInRange) {
      if (event.budget && event.budget > 0) {
        const currency = event.budgetCurrency || 'USD'
        if (!byCurrency[currency]) {
          byCurrency[currency] = { budget: 0, spent: 0, count: 0 }
        }
        byCurrency[currency].budget += event.budget
        byCurrency[currency].count += 1
      }
    }

    // Add spent amounts by currency
    for (const item of budgetItems) {
      const event = eventsInRange.find((e) => e._id === item.eventId)
      if (event) {
        const currency = event.budgetCurrency || 'USD'
        if (byCurrency[currency]) {
          byCurrency[currency].spent += item.actualAmount || 0
        }
      }
    }

    return {
      totalBudget,
      totalSpent,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      eventsWithBudget,
      averageBudget: eventsWithBudget > 0 ? Math.round(totalBudget / eventsWithBudget) : 0,
      byCurrency,
      budgetItemsCount: budgetItems.length,
    }
  },
})

/**
 * Get platform-wide vendor/sponsor engagement analytics
 * Admin/Superadmin only
 */
export const getPlatformEngagementAnalytics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get ALL events (no organizer filter)
    const allEvents = await ctx.db.query('events').collect()

    // Filter by date range
    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    const eventIds = new Set(eventsInRange.map((e) => e._id))

    // Get vendor and sponsor data
    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    const eventVendors = allEventVendors.filter((ev) => eventIds.has(ev.eventId))
    const eventSponsors = allEventSponsors.filter((es) => eventIds.has(es.eventId))

    // Vendor analytics
    const vendorApplications = eventVendors.length
    const confirmedVendors = eventVendors.filter((ev) => ev.status === 'confirmed').length
    const pendingVendors = eventVendors.filter((ev) => ev.status === 'pending').length
    const declinedVendors = eventVendors.filter((ev) => ev.status === 'declined').length

    // Sponsor analytics
    const sponsorApplications = eventSponsors.length
    const confirmedSponsors = eventSponsors.filter((es) => es.status === 'confirmed').length
    const pendingSponsors = eventSponsors.filter((es) => es.status === 'pending').length
    const declinedSponsors = eventSponsors.filter((es) => es.status === 'declined').length

    // Calculate conversion rates
    const vendorConversionRate =
      vendorApplications > 0 ? (confirmedVendors / vendorApplications) * 100 : 0
    const sponsorConversionRate =
      sponsorApplications > 0 ? (confirmedSponsors / sponsorApplications) * 100 : 0

    // Average vendors/sponsors per event
    const eventsWithVendors = new Set(eventVendors.map((ev) => ev.eventId)).size
    const eventsWithSponsors = new Set(eventSponsors.map((es) => es.eventId)).size

    const avgVendorsPerEvent = eventsWithVendors > 0 ? vendorApplications / eventsWithVendors : 0
    const avgSponsorsPerEvent =
      eventsWithSponsors > 0 ? sponsorApplications / eventsWithSponsors : 0

    return {
      vendors: {
        totalApplications: vendorApplications,
        confirmed: confirmedVendors,
        pending: pendingVendors,
        declined: declinedVendors,
        conversionRate: Math.round(vendorConversionRate * 100) / 100,
        eventsWithVendors,
        averagePerEvent: Math.round(avgVendorsPerEvent * 100) / 100,
      },
      sponsors: {
        totalApplications: sponsorApplications,
        confirmed: confirmedSponsors,
        pending: pendingSponsors,
        declined: declinedSponsors,
        conversionRate: Math.round(sponsorConversionRate * 100) / 100,
        eventsWithSponsors,
        averagePerEvent: Math.round(avgSponsorsPerEvent * 100) / 100,
      },
    }
  },
})

// ============================================================================
// Internal Analytics Queries (for API)
// ============================================================================
// These versions accept userId for API key authentication

/**
 * Internal: Get event trends (for API)
 */
export const getEventTrendsInternal = internalQuery({
  args: {
    userId: v.id('users'),
    period: v.optional(
      v.union(v.literal('day'), v.literal('week'), v.literal('month'), v.literal('year'))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const period = args.period || 'month'
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.userId))
      .collect()

    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    const grouped = groupByPeriod(eventsInRange, (e) => e.createdAt, period)

    const trends = Array.from(grouped.entries())
      .map(([periodStart, events]) => {
        const totalEvents = events.length
        const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0)
        const totalAttendees = events.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)

        const byStatus = {
          draft: events.filter((e) => e.status === 'draft').length,
          planning: events.filter((e) => e.status === 'planning').length,
          active: events.filter((e) => e.status === 'active').length,
          completed: events.filter((e) => e.status === 'completed').length,
          cancelled: events.filter((e) => e.status === 'cancelled').length,
        }

        return {
          period: periodStart,
          periodLabel: new Date(periodStart).toISOString(),
          totalEvents,
          totalBudget,
          totalAttendees,
          averageBudget: totalEvents > 0 ? Math.round(totalBudget / totalEvents) : 0,
          averageAttendees: totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0,
          byStatus,
        }
      })
      .sort((a, b) => a.period - b.period)

    return trends
  },
})

/**
 * Internal: Get event performance (for API)
 */
export const getEventPerformanceInternal = internalQuery({
  args: {
    userId: v.id('users'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.userId))
      .collect()

    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    if (eventsInRange.length === 0) {
      return {
        totalEvents: 0,
        completedEvents: 0,
        completionRate: 0,
        averageBudget: 0,
        averageAttendees: 0,
        totalBudget: 0,
        totalAttendees: 0,
        byEventType: {},
        byLocationType: {},
      }
    }

    const eventIds = new Set(eventsInRange.map((e) => e._id))
    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    const eventVendors = allEventVendors.filter((ev) => eventIds.has(ev.eventId))
    const eventSponsors = allEventSponsors.filter((es) => eventIds.has(es.eventId))

    const totalEvents = eventsInRange.length
    const completedEvents = eventsInRange.filter((e) => e.status === 'completed').length
    const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0

    const totalBudget = eventsInRange.reduce((sum, e) => sum + (e.budget || 0), 0)
    const averageBudget = totalEvents > 0 ? Math.round(totalBudget / totalEvents) : 0

    const totalAttendees = eventsInRange.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)
    const averageAttendees = totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0

    const totalVendorApplications = eventVendors.length
    const confirmedVendors = eventVendors.filter((ev) => ev.status === 'confirmed').length
    const vendorConversionRate =
      totalVendorApplications > 0 ? (confirmedVendors / totalVendorApplications) * 100 : 0

    const totalSponsorApplications = eventSponsors.length
    const confirmedSponsors = eventSponsors.filter((es) => es.status === 'confirmed').length
    const sponsorConversionRate =
      totalSponsorApplications > 0 ? (confirmedSponsors / totalSponsorApplications) * 100 : 0

    const byEventType: Record<string, number> = {}
    for (const event of eventsInRange) {
      const type = event.eventType || 'other'
      byEventType[type] = (byEventType[type] || 0) + 1
    }

    const byLocationType: Record<string, number> = {}
    for (const event of eventsInRange) {
      const location = event.locationType || 'other'
      byLocationType[location] = (byLocationType[location] || 0) + 1
    }

    return {
      totalEvents,
      completedEvents,
      completionRate: Math.round(completionRate * 100) / 100,
      averageBudget,
      averageAttendees,
      totalBudget,
      totalAttendees,
      vendorMetrics: {
        totalApplications: totalVendorApplications,
        confirmed: confirmedVendors,
        conversionRate: Math.round(vendorConversionRate * 100) / 100,
      },
      sponsorMetrics: {
        totalApplications: totalSponsorApplications,
        confirmed: confirmedSponsors,
        conversionRate: Math.round(sponsorConversionRate * 100) / 100,
      },
      byEventType,
      byLocationType,
    }
  },
})

/**
 * Internal: Get comparative analytics (for API)
 */
export const getComparativeAnalyticsInternal = internalQuery({
  args: {
    userId: v.id('users'),
    period: v.optional(v.union(v.literal('week'), v.literal('month'), v.literal('year'))),
  },
  handler: async (ctx, args) => {
    const period = args.period || 'month'
    const now = Date.now()

    const currentPeriodStart = getPeriodStart(now, period)
    let previousPeriodStart: number
    let previousPeriodEnd: number

    switch (period) {
      case 'week':
        previousPeriodStart = currentPeriodStart - 7 * 24 * 60 * 60 * 1000
        previousPeriodEnd = currentPeriodStart
        break
      case 'month': {
        const currentMonth = new Date(currentPeriodStart)
        currentMonth.setMonth(currentMonth.getMonth() - 1)
        previousPeriodStart = currentMonth.getTime()
        previousPeriodEnd = currentPeriodStart
        break
      }
      case 'year': {
        const currentYear = new Date(currentPeriodStart)
        currentYear.setFullYear(currentYear.getFullYear() - 1)
        previousPeriodStart = currentYear.getTime()
        previousPeriodEnd = currentPeriodStart
        break
      }
    }

    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.userId))
      .collect()

    const currentEvents = allEvents.filter(
      (e) => e.createdAt >= currentPeriodStart && e.createdAt < now
    )
    const previousEvents = allEvents.filter(
      (e) => e.createdAt >= previousPeriodStart && e.createdAt < previousPeriodEnd
    )

    const current = {
      totalEvents: currentEvents.length,
      totalBudget: currentEvents.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalAttendees: currentEvents.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0),
      completedEvents: currentEvents.filter((e) => e.status === 'completed').length,
    }

    const previous = {
      totalEvents: previousEvents.length,
      totalBudget: previousEvents.reduce((sum, e) => sum + (e.budget || 0), 0),
      totalAttendees: previousEvents.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0),
      completedEvents: previousEvents.filter((e) => e.status === 'completed').length,
    }

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100 * 100) / 100
    }

    return {
      period,
      current: {
        ...current,
        averageBudget:
          current.totalEvents > 0 ? Math.round(current.totalBudget / current.totalEvents) : 0,
        averageAttendees:
          current.totalEvents > 0 ? Math.round(current.totalAttendees / current.totalEvents) : 0,
      },
      previous: {
        ...previous,
        averageBudget:
          previous.totalEvents > 0 ? Math.round(previous.totalBudget / previous.totalEvents) : 0,
        averageAttendees:
          previous.totalEvents > 0 ? Math.round(previous.totalAttendees / previous.totalEvents) : 0,
      },
      changes: {
        totalEvents: calculateChange(current.totalEvents, previous.totalEvents),
        totalBudget: calculateChange(current.totalBudget, previous.totalBudget),
        totalAttendees: calculateChange(current.totalAttendees, previous.totalAttendees),
        completedEvents: calculateChange(current.completedEvents, previous.completedEvents),
      },
    }
  },
})

/**
 * Internal: Get budget analytics (for API)
 */
export const getBudgetAnalyticsInternal = internalQuery({
  args: {
    userId: v.id('users'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.userId))
      .collect()

    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    const eventIds = new Set(eventsInRange.map((e) => e._id))
    const allBudgetItems = await ctx.db.query('budgetItems').collect()
    const budgetItems = allBudgetItems.filter((bi) => eventIds.has(bi.eventId))

    const totalBudget = eventsInRange.reduce((sum, e) => sum + (e.budget || 0), 0)
    const eventsWithBudget = eventsInRange.filter((e) => e.budget && e.budget > 0).length

    const totalSpent = budgetItems.reduce(
      (sum, bi) => sum + (bi.actualAmount || bi.estimatedAmount || 0),
      0
    )
    const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

    const byCurrency: Record<string, { budget: number; spent: number; count: number }> = {}
    for (const event of eventsInRange) {
      if (event.budget && event.budget > 0) {
        const currency = event.budgetCurrency || 'USD'
        if (!byCurrency[currency]) {
          byCurrency[currency] = { budget: 0, spent: 0, count: 0 }
        }
        byCurrency[currency].budget += event.budget
        byCurrency[currency].count += 1
      }
    }

    for (const item of budgetItems) {
      const event = eventsInRange.find((e) => e._id === item.eventId)
      if (event) {
        const currency = event.budgetCurrency || 'USD'
        if (byCurrency[currency]) {
          byCurrency[currency].spent += item.actualAmount || 0
        }
      }
    }

    return {
      totalBudget,
      totalSpent,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      eventsWithBudget,
      averageBudget: eventsWithBudget > 0 ? Math.round(totalBudget / eventsWithBudget) : 0,
      byCurrency,
      budgetItemsCount: budgetItems.length,
    }
  },
})

/**
 * Internal: Get engagement analytics (for API)
 */
export const getEngagementAnalyticsInternal = internalQuery({
  args: {
    userId: v.id('users'),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.userId))
      .collect()

    const eventsInRange = allEvents.filter(
      (e) => e.createdAt >= startDate && e.createdAt <= endDate
    )

    const eventIds = new Set(eventsInRange.map((e) => e._id))

    const allEventVendors = await ctx.db.query('eventVendors').collect()
    const allEventSponsors = await ctx.db.query('eventSponsors').collect()

    const eventVendors = allEventVendors.filter((ev) => eventIds.has(ev.eventId))
    const eventSponsors = allEventSponsors.filter((es) => eventIds.has(es.eventId))

    const vendorApplications = eventVendors.length
    const confirmedVendors = eventVendors.filter((ev) => ev.status === 'confirmed').length
    const pendingVendors = eventVendors.filter((ev) => ev.status === 'pending').length
    const declinedVendors = eventVendors.filter((ev) => ev.status === 'declined').length

    const sponsorApplications = eventSponsors.length
    const confirmedSponsors = eventSponsors.filter((es) => es.status === 'confirmed').length
    const pendingSponsors = eventSponsors.filter((es) => es.status === 'pending').length
    const declinedSponsors = eventSponsors.filter((es) => es.status === 'declined').length

    const vendorConversionRate =
      vendorApplications > 0 ? (confirmedVendors / vendorApplications) * 100 : 0
    const sponsorConversionRate =
      sponsorApplications > 0 ? (confirmedSponsors / sponsorApplications) * 100 : 0

    const eventsWithVendors = new Set(eventVendors.map((ev) => ev.eventId)).size
    const eventsWithSponsors = new Set(eventSponsors.map((es) => es.eventId)).size

    const avgVendorsPerEvent = eventsWithVendors > 0 ? vendorApplications / eventsWithVendors : 0
    const avgSponsorsPerEvent =
      eventsWithSponsors > 0 ? sponsorApplications / eventsWithSponsors : 0

    return {
      vendors: {
        totalApplications: vendorApplications,
        confirmed: confirmedVendors,
        pending: pendingVendors,
        declined: declinedVendors,
        conversionRate: Math.round(vendorConversionRate * 100) / 100,
        eventsWithVendors,
        averagePerEvent: Math.round(avgVendorsPerEvent * 100) / 100,
      },
      sponsors: {
        totalApplications: sponsorApplications,
        confirmed: confirmedSponsors,
        pending: pendingSponsors,
        declined: declinedSponsors,
        conversionRate: Math.round(sponsorConversionRate * 100) / 100,
        eventsWithSponsors,
        averagePerEvent: Math.round(avgSponsorsPerEvent * 100) / 100,
      },
    }
  },
})

// ============================================================================
// Anonymized Analytics Queries (GDPR Compliant)
// ============================================================================

/**
 * Get anonymized event trends for analytics export
 * Removes all PII while preserving analytical value
 */
export const getAnonymizedEventTrends = query({
  args: {
    period: v.optional(
      v.union(v.literal('day'), v.literal('week'), v.literal('month'), v.literal('year'))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const period = args.period || 'month'
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get all events for this organizer
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    // Anonymize events
    const anonymizedEvents = allEvents.map(anonymizeEventForAnalytics)

    // Filter by date range
    const eventsInRange = anonymizedEvents.filter(
      (e) =>
        (e.createdAt || e._creationTime || 0) >= startDate &&
        (e.createdAt || e._creationTime || 0) <= endDate
    )

    // Group by period (using anonymized data)
    const grouped = groupByPeriod(eventsInRange, (e) => e.createdAt || e._creationTime || 0, period)

    // Convert to array format
    const trends = Array.from(grouped.entries())
      .map(([periodStart, events]) => {
        const totalEvents = events.length
        const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0)
        const totalAttendees = events.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)

        const byStatus = {
          draft: events.filter((e) => e.status === 'draft').length,
          planning: events.filter((e) => e.status === 'planning').length,
          active: events.filter((e) => e.status === 'active').length,
          completed: events.filter((e) => e.status === 'completed').length,
          cancelled: events.filter((e) => e.status === 'cancelled').length,
        }

        return {
          period: periodStart,
          periodLabel: new Date(periodStart).toISOString(),
          totalEvents,
          totalBudget,
          totalAttendees,
          averageBudget: totalEvents > 0 ? Math.round(totalBudget / totalEvents) : 0,
          averageAttendees: totalEvents > 0 ? Math.round(totalAttendees / totalEvents) : 0,
          byStatus,
        }
      })
      .sort((a, b) => a.period - b.period)

    return trends
  },
})

/**
 * Get anonymized platform-wide user analytics
 * Admin/Superadmin only - aggregates anonymized user data
 */
export const getAnonymizedUserAnalytics = query({
  args: {
    period: v.optional(
      v.union(v.literal('day'), v.literal('week'), v.literal('month'), v.literal('year'))
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const period = args.period || 'month'
    const now = Date.now()
    const startDate = args.startDate || now - 365 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || now

    // Get all users
    const allUsers = await ctx.db.query('users').collect()

    // Anonymize users
    const anonymizedUsers = allUsers.map(anonymizeUserForAnalytics)

    // Filter by date range
    const usersInRange = anonymizedUsers.filter(
      (u) =>
        (u.createdAt || u._creationTime || 0) >= startDate &&
        (u.createdAt || u._creationTime || 0) <= endDate
    )

    // Group by period
    const grouped = groupByPeriod(usersInRange, (u) => u.createdAt || u._creationTime || 0, period)

    // Convert to array format
    const trends = Array.from(grouped.entries())
      .map(([periodStart, users]) => {
        const totalUsers = users.length

        // Count by role (no PII)
        const byRole = {
          organizer: users.filter((u) => u.role === 'organizer').length,
          admin: users.filter((u) => u.role === 'admin').length,
          superadmin: users.filter((u) => u.role === 'superadmin').length,
        }

        // Count by status (no PII)
        const byStatus = {
          active: users.filter((u) => u.status === 'active').length,
          suspended: users.filter((u) => u.status === 'suspended').length,
        }

        // Count unique email domains (anonymized)
        const emailDomains = new Set(
          users.map((u) => u.emailDomain).filter((d): d is string => !!d)
        )

        return {
          period: periodStart,
          periodLabel: new Date(periodStart).toISOString(),
          totalUsers,
          byRole,
          byStatus,
          uniqueEmailDomains: emailDomains.size,
        }
      })
      .sort((a, b) => a.period - b.period)

    return trends
  },
})

/**
 * Get anonymized session analytics
 * Admin/Superadmin only - tracks session patterns without PII
 */
export const getAnonymizedSessionAnalytics = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const now = Date.now()
    const startDate = args.startDate || now - 30 * 24 * 60 * 60 * 1000 // Default: 30 days
    const endDate = args.endDate || now

    // Get all sessions
    const allSessions = await ctx.db.query('sessions').collect()

    // Filter by date range
    const sessionsInRange = allSessions.filter(
      (s) =>
        (s.createdAt || s._creationTime || 0) >= startDate &&
        (s.createdAt || s._creationTime || 0) <= endDate
    )

    // Anonymize sessions (remove IP and user agent PII)
    const anonymizedSessions = sessionsInRange.map((session) => {
      // Extract browser and OS without storing full user agent
      let browser = 'Other'
      let os = 'Other'

      if (session.userAgent) {
        if (session.userAgent.includes('Chrome')) browser = 'Chrome'
        else if (session.userAgent.includes('Firefox')) browser = 'Firefox'
        else if (session.userAgent.includes('Safari')) browser = 'Safari'
        else if (session.userAgent.includes('Edge')) browser = 'Edge'

        if (session.userAgent.includes('Windows')) os = 'Windows'
        else if (session.userAgent.includes('Mac')) os = 'macOS'
        else if (session.userAgent.includes('Linux')) os = 'Linux'
        else if (session.userAgent.includes('Android')) os = 'Android'
        else if (session.userAgent.includes('iOS')) os = 'iOS'
      }

      return {
        browser,
        os,
        createdAt: session.createdAt || session._creationTime || 0,
      }
    })

    // Aggregate by browser
    const byBrowser: Record<string, number> = {}
    for (const session of anonymizedSessions) {
      byBrowser[session.browser] = (byBrowser[session.browser] || 0) + 1
    }

    // Aggregate by OS
    const byOS: Record<string, number> = {}
    for (const session of anonymizedSessions) {
      byOS[session.os] = (byOS[session.os] || 0) + 1
    }

    return {
      totalSessions: anonymizedSessions.length,
      byBrowser,
      byOS,
    }
  },
})
