/**
 * Bulk Export System
 *
 * Provides export functionality for admin data (users, vendors, sponsors, events).
 * Supports JSON and CSV formats with filtering options.
 */

import { v } from 'convex/values'
import { query } from './_generated/server'
import { assertRole } from './lib/auth'

// ============================================================================
// Export Queries
// ============================================================================

/**
 * Export users data
 * Accessible by admin and superadmin
 */
export const exportUsers = query({
  args: {
    format: v.union(v.literal('json'), v.literal('csv')),
    filters: v.optional(
      v.object({
        role: v.optional(
          v.union(v.literal('admin'), v.literal('organizer'), v.literal('superadmin'))
        ),
        status: v.optional(
          v.union(v.literal('active'), v.literal('suspended'), v.literal('pending'))
        ),
        createdAfter: v.optional(v.number()),
        createdBefore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let users = await ctx.db.query('users').collect()

    // Apply filters
    if (args.filters) {
      if (args.filters.role) {
        users = users.filter((u) => u.role === args.filters!.role)
      }
      if (args.filters.status) {
        users = users.filter((u) => (u.status || 'active') === args.filters!.status)
      }
      if (args.filters.createdAfter) {
        users = users.filter((u) => (u.createdAt || 0) >= args.filters!.createdAfter!)
      }
      if (args.filters.createdBefore) {
        users = users.filter((u) => (u.createdAt || 0) <= args.filters!.createdBefore!)
      }
    }

    // Map to export format (exclude sensitive fields)
    const exportData = users.map((u) => ({
      id: u._id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'organizer',
      status: u.status || 'active',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : '',
    }))

    if (args.format === 'csv') {
      const headers = ['id', 'name', 'email', 'role', 'status', 'createdAt', 'updatedAt']
      const csvRows = [
        headers.join(','),
        ...exportData.map((row) =>
          headers
            .map((h) => `"${String(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ]
      return { data: csvRows.join('\n'), count: exportData.length }
    }

    return { data: JSON.stringify(exportData, null, 2), count: exportData.length }
  },
})

/**
 * Export vendors data
 * Accessible by admin and superadmin
 */
export const exportVendors = query({
  args: {
    format: v.union(v.literal('json'), v.literal('csv')),
    filters: v.optional(
      v.object({
        category: v.optional(v.string()),
        status: v.optional(v.string()),
        createdAfter: v.optional(v.number()),
        createdBefore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let vendors = await ctx.db.query('vendors').collect()

    // Apply filters
    if (args.filters) {
      if (args.filters.category) {
        vendors = vendors.filter((v) => v.category === args.filters!.category)
      }
      if (args.filters.status) {
        vendors = vendors.filter((v) => v.status === args.filters!.status)
      }
      if (args.filters.createdAfter) {
        vendors = vendors.filter((v) => (v.createdAt || 0) >= args.filters!.createdAfter!)
      }
      if (args.filters.createdBefore) {
        vendors = vendors.filter((v) => (v.createdAt || 0) <= args.filters!.createdBefore!)
      }
    }

    // Map to export format
    const exportData = vendors.map((v) => ({
      id: v._id,
      name: v.name || '',
      category: v.category || '',
      description: v.description || '',
      location: v.location || '',
      priceRange: v.priceRange || '',
      contactEmail: v.contactEmail || '',
      contactPhone: v.contactPhone || '',
      contactName: v.contactName || '',
      status: v.status || '',
      rating: v.rating || '',
      createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : '',
    }))

    if (args.format === 'csv') {
      const headers = [
        'id',
        'name',
        'category',
        'description',
        'location',
        'priceRange',
        'contactEmail',
        'contactPhone',
        'contactName',
        'status',
        'rating',
        'createdAt',
      ]
      const csvRows = [
        headers.join(','),
        ...exportData.map((row) =>
          headers
            .map((h) => `"${String(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ]
      return { data: csvRows.join('\n'), count: exportData.length }
    }

    return { data: JSON.stringify(exportData, null, 2), count: exportData.length }
  },
})

/**
 * Export sponsors data
 * Accessible by admin and superadmin
 */
export const exportSponsors = query({
  args: {
    format: v.union(v.literal('json'), v.literal('csv')),
    filters: v.optional(
      v.object({
        industry: v.optional(v.string()),
        status: v.optional(v.string()),
        createdAfter: v.optional(v.number()),
        createdBefore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let sponsors = await ctx.db.query('sponsors').collect()

    // Apply filters
    if (args.filters) {
      if (args.filters.industry) {
        sponsors = sponsors.filter((s) => s.industry === args.filters!.industry)
      }
      if (args.filters.status) {
        sponsors = sponsors.filter((s) => s.status === args.filters!.status)
      }
      if (args.filters.createdAfter) {
        sponsors = sponsors.filter((s) => (s._creationTime || 0) >= args.filters!.createdAfter!)
      }
      if (args.filters.createdBefore) {
        sponsors = sponsors.filter((s) => (s._creationTime || 0) <= args.filters!.createdBefore!)
      }
    }

    // Map to export format
    const exportData = sponsors.map((s) => ({
      id: s._id,
      name: s.name || '',
      industry: s.industry || '',
      description: s.description || '',
      website: s.website || '',
      contactEmail: s.contactEmail || '',
      contactName: s.contactName || '',
      status: s.status || '',
      budgetRange: s.budgetMin && s.budgetMax ? `${s.budgetMin}-${s.budgetMax}` : '',
      createdAt: new Date(s._creationTime).toISOString(),
    }))

    if (args.format === 'csv') {
      const headers = [
        'id',
        'name',
        'industry',
        'description',
        'website',
        'contactEmail',
        'contactName',
        'status',
        'budgetRange',
        'createdAt',
      ]
      const csvRows = [
        headers.join(','),
        ...exportData.map((row) =>
          headers
            .map((h) => `"${String(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ]
      return { data: csvRows.join('\n'), count: exportData.length }
    }

    return { data: JSON.stringify(exportData, null, 2), count: exportData.length }
  },
})

/**
 * Export events data
 * Accessible by admin and superadmin
 */
export const exportEvents = query({
  args: {
    format: v.union(v.literal('json'), v.literal('csv')),
    filters: v.optional(
      v.object({
        status: v.optional(v.string()),
        eventType: v.optional(v.string()),
        createdAfter: v.optional(v.number()),
        createdBefore: v.optional(v.number()),
        startAfter: v.optional(v.number()),
        startBefore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let events = await ctx.db.query('events').collect()

    // Apply filters
    if (args.filters) {
      if (args.filters.status) {
        events = events.filter((e) => e.status === args.filters!.status)
      }
      if (args.filters.eventType) {
        events = events.filter((e) => e.eventType === args.filters!.eventType)
      }
      if (args.filters.createdAfter) {
        events = events.filter((e) => e.createdAt >= args.filters!.createdAfter!)
      }
      if (args.filters.createdBefore) {
        events = events.filter((e) => e.createdAt <= args.filters!.createdBefore!)
      }
      if (args.filters.startAfter) {
        events = events.filter((e) => e.startDate >= args.filters!.startAfter!)
      }
      if (args.filters.startBefore) {
        events = events.filter((e) => e.startDate <= args.filters!.startBefore!)
      }
    }

    // Get organizer info
    const enrichedEvents = await Promise.all(
      events.map(async (e) => {
        const organizer = await ctx.db.get(e.organizerId)
        return {
          id: e._id,
          title: e.title || '',
          description: e.description || '',
          eventType: e.eventType || '',
          status: e.status || '',
          startDate: e.startDate ? new Date(e.startDate).toISOString() : '',
          endDate: e.endDate ? new Date(e.endDate).toISOString() : '',
          locationType: e.locationType || '',
          venueName: e.venueName || '',
          venueAddress: e.venueAddress || '',
          expectedAttendees: e.expectedAttendees || '',
          budget: e.budget || '',
          organizerName: organizer?.name || '',
          organizerEmail: organizer?.email || '',
          createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : '',
        }
      })
    )

    if (args.format === 'csv') {
      const headers = [
        'id',
        'title',
        'description',
        'eventType',
        'status',
        'startDate',
        'endDate',
        'locationType',
        'venueName',
        'venueAddress',
        'expectedAttendees',
        'budget',
        'organizerName',
        'organizerEmail',
        'createdAt',
      ]
      const csvRows = [
        headers.join(','),
        ...enrichedEvents.map((row) =>
          headers
            .map((h) => `"${String(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ]
      return { data: csvRows.join('\n'), count: enrichedEvents.length }
    }

    return { data: JSON.stringify(enrichedEvents, null, 2), count: enrichedEvents.length }
  },
})

/**
 * Export moderation logs
 * Accessible by admin and superadmin
 */
export const exportModerationLogs = query({
  args: {
    format: v.union(v.literal('json'), v.literal('csv')),
    filters: v.optional(
      v.object({
        action: v.optional(v.string()),
        targetType: v.optional(v.string()),
        createdAfter: v.optional(v.number()),
        createdBefore: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let logs = await ctx.db.query('moderationLogs').order('desc').collect()

    // Apply filters
    if (args.filters) {
      if (args.filters.action) {
        logs = logs.filter((l) => l.action === args.filters!.action)
      }
      if (args.filters.targetType) {
        logs = logs.filter((l) => l.targetType === args.filters!.targetType)
      }
      if (args.filters.createdAfter) {
        logs = logs.filter((l) => l.createdAt >= args.filters!.createdAfter!)
      }
      if (args.filters.createdBefore) {
        logs = logs.filter((l) => l.createdAt <= args.filters!.createdBefore!)
      }
    }

    // Get admin info
    const enrichedLogs = await Promise.all(
      logs.map(async (l) => {
        const admin = await ctx.db.get(l.adminId)
        return {
          id: l._id,
          action: l.action || '',
          targetType: l.targetType || '',
          targetId: l.targetId || '',
          reason: l.reason || '',
          adminName: admin?.name || '',
          adminEmail: admin?.email || '',
          createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : '',
        }
      })
    )

    if (args.format === 'csv') {
      const headers = [
        'id',
        'action',
        'targetType',
        'targetId',
        'reason',
        'adminName',
        'adminEmail',
        'createdAt',
      ]
      const csvRows = [
        headers.join(','),
        ...enrichedLogs.map((row) =>
          headers
            .map((h) => `"${String(row[h as keyof typeof row] || '').replace(/"/g, '""')}"`)
            .join(',')
        ),
      ]
      return { data: csvRows.join('\n'), count: enrichedLogs.length }
    }

    return { data: JSON.stringify(enrichedLogs, null, 2), count: enrichedLogs.length }
  },
})
