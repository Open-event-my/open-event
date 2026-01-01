import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser, assertRole, isAdminRole } from './lib/auth'
import type { Id } from './_generated/dataModel'

/**
 * Safely parse an applicant ID string to the appropriate Id type.
 * Returns null if the ID format is invalid.
 * Convex IDs are base64url-encoded strings that typically look like: j57123abc...
 */
function parseApplicantId<T extends 'vendors' | 'sponsors'>(
  id: string,
  // Used for type inference only
  table: T
): Id<T> | null {
  // The table parameter is used for generic type inference
  void table
  // Convex IDs are base64url-encoded, typically 24+ characters
  // They use [a-zA-Z0-9_-] characters and start with specific prefixes
  if (!id || typeof id !== 'string') {
    return null
  }
  // Convex ID format validation: must be alphanumeric with _ and -, reasonable length
  const convexIdPattern = /^[a-zA-Z0-9_-]{10,}$/
  if (!convexIdPattern.test(id)) {
    return null
  }
  return id as Id<T>
}

// ============================================================================
// Queries
// ============================================================================

// Get applications for an event (organizer or admin)
export const listByEvent = query({
  args: {
    eventId: v.id('events'),
    status: v.optional(v.string()),
    applicantType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const event = await ctx.db.get(args.eventId)
    if (!event) return []

    // Only organizer (owner) or admin can view applications
    const isOwner = event.organizerId === user._id
    if (!isOwner && !isAdminRole(user.role)) return []

    let applications = await ctx.db
      .query('eventApplications')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .order('desc')
      .collect()

    // Filter by status
    if (args.status && args.status !== 'all') {
      applications = applications.filter((a) => a.status === args.status)
    }

    // Filter by applicant type
    if (args.applicantType && args.applicantType !== 'all') {
      applications = applications.filter((a) => a.applicantType === args.applicantType)
    }

    // BATCH LOAD: Collect all unique vendor/sponsor IDs first
    const vendorIds = new Set<Id<'vendors'>>()
    const sponsorIds = new Set<Id<'sponsors'>>()

    for (const app of applications) {
      if (app.applicantType === 'vendor') {
        const vendorId = parseApplicantId(app.applicantId, 'vendors')
        if (vendorId) vendorIds.add(vendorId)
      } else if (app.applicantType === 'sponsor') {
        const sponsorId = parseApplicantId(app.applicantId, 'sponsors')
        if (sponsorId) sponsorIds.add(sponsorId)
      }
    }

    // Batch fetch all vendors and sponsors
    const vendorPromises = Array.from(vendorIds).map((id) => ctx.db.get(id))
    const sponsorPromises = Array.from(sponsorIds).map((id) => ctx.db.get(id))

    const [vendors, sponsors] = await Promise.all([
      Promise.all(vendorPromises),
      Promise.all(sponsorPromises),
    ])

    // Create lookup maps
    const vendorMap = new Map(vendors.filter(Boolean).map((v) => [v!._id, v!]))
    const sponsorMap = new Map(sponsors.filter(Boolean).map((s) => [s!._id, s!]))

    // Enrich applications using the maps (no additional queries)
    const enrichedApplications = applications.map((app) => {
      let applicantDetails: {
        name: string
        category?: string
        industry?: string
        contactEmail?: string
        verified: boolean
      } | null = null

      if (app.applicantType === 'vendor') {
        const vendorId = parseApplicantId(app.applicantId, 'vendors')
        const vendor = vendorId ? vendorMap.get(vendorId) : null
        if (vendor) {
          applicantDetails = {
            name: vendor.name,
            category: vendor.category,
            contactEmail: vendor.contactEmail,
            verified: vendor.verified,
          }
        }
      } else if (app.applicantType === 'sponsor') {
        const sponsorId = parseApplicantId(app.applicantId, 'sponsors')
        const sponsor = sponsorId ? sponsorMap.get(sponsorId) : null
        if (sponsor) {
          applicantDetails = {
            name: sponsor.name,
            industry: sponsor.industry,
            contactEmail: sponsor.contactEmail,
            verified: sponsor.verified,
          }
        }
      }
      return { ...app, applicantDetails }
    })

    return enrichedApplications
  },
})

// Get application count for event (for badges/stats)
export const getCountByEvent = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return { total: 0, pending: 0, accepted: 0 }

    const event = await ctx.db.get(args.eventId)
    if (!event) return { total: 0, pending: 0, accepted: 0 }

    const isOwner = event.organizerId === user._id
    if (!isOwner && !isAdminRole(user.role)) return { total: 0, pending: 0, accepted: 0 }

    const applications = await ctx.db
      .query('eventApplications')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    return {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      accepted: applications.filter((a) => a.status === 'accepted').length,
    }
  },
})

// Get applications by vendor/sponsor (admin only)
export const listByApplicant = query({
  args: {
    applicantType: v.union(v.literal('vendor'), v.literal('sponsor')),
    applicantId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []
    if (!isAdminRole(user.role)) return []

    const applications = await ctx.db
      .query('eventApplications')
      .withIndex('by_applicant', (q) =>
        q.eq('applicantType', args.applicantType).eq('applicantId', args.applicantId)
      )
      .order('desc')
      .collect()

    // Enrich with event details
    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        const event = await ctx.db.get(app.eventId)
        return {
          ...app,
          eventDetails: event
            ? {
                title: event.title,
                startDate: event.startDate,
                status: event.status,
              }
            : null,
        }
      })
    )

    return enrichedApplications
  },
})

// Get single application
export const get = query({
  args: { id: v.id('eventApplications') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const application = await ctx.db.get(args.id)
    if (!application) return null

    const event = await ctx.db.get(application.eventId)
    if (!event) return null

    // Only organizer (owner) or admin can view
    const isOwner = event.organizerId === user._id
    if (!isOwner && !isAdminRole(user.role)) return null

    // Get applicant details
    let applicantDetails = null
    if (application.applicantType === 'vendor') {
      const vendorId = parseApplicantId(application.applicantId, 'vendors')
      applicantDetails = vendorId ? await ctx.db.get(vendorId) : null
    } else {
      const sponsorId = parseApplicantId(application.applicantId, 'sponsors')
      applicantDetails = sponsorId ? await ctx.db.get(sponsorId) : null
    }

    return {
      ...application,
      event,
      applicantDetails,
    }
  },
})

// ============================================================================
// Mutations
// ============================================================================

// Submit application (admin submits on behalf of vendor/sponsor)
export const submit = mutation({
  args: {
    eventId: v.id('events'),
    applicantType: v.union(v.literal('vendor'), v.literal('sponsor')),
    applicantId: v.string(),
    message: v.optional(v.string()),
    proposedServices: v.optional(v.array(v.string())),
    proposedBudget: v.optional(v.number()),
    proposedTier: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await assertRole(ctx, 'admin')

    // Verify event exists and is public
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    if (!event.isPublic) {
      throw new Error('Event is not accepting applications')
    }

    // Verify applicant exists and is approved
    if (args.applicantType === 'vendor') {
      const vendorId = parseApplicantId(args.applicantId, 'vendors')
      if (!vendorId) {
        throw new Error('Invalid vendor ID format')
      }
      const vendor = await ctx.db.get(vendorId)
      if (!vendor || vendor.status !== 'approved') {
        throw new Error('Vendor not found or not approved')
      }
    } else {
      const sponsorId = parseApplicantId(args.applicantId, 'sponsors')
      if (!sponsorId) {
        throw new Error('Invalid sponsor ID format')
      }
      const sponsor = await ctx.db.get(sponsorId)
      if (!sponsor || sponsor.status !== 'approved') {
        throw new Error('Sponsor not found or not approved')
      }
    }

    // Check for duplicate application
    const existing = await ctx.db
      .query('eventApplications')
      .withIndex('by_applicant', (q) =>
        q.eq('applicantType', args.applicantType).eq('applicantId', args.applicantId)
      )
      .filter((q) => q.eq(q.field('eventId'), args.eventId))
      .first()

    if (existing && existing.status !== 'withdrawn' && existing.status !== 'rejected') {
      throw new Error('An application already exists for this event')
    }

    return await ctx.db.insert('eventApplications', {
      eventId: args.eventId,
      applicantType: args.applicantType,
      applicantId: args.applicantId,
      status: 'pending',
      message: args.message,
      proposedServices: args.proposedServices,
      proposedBudget: args.proposedBudget,
      proposedTier: args.proposedTier,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      submittedBy: user._id,
      createdAt: Date.now(),
    })
  },
})

// Update application status (organizer accepts/rejects)
export const updateStatus = mutation({
  args: {
    applicationId: v.id('eventApplications'),
    status: v.union(v.literal('under_review'), v.literal('accepted'), v.literal('rejected')),
    organizerNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new Error('Application not found')
    }

    const event = await ctx.db.get(application.eventId)
    if (!event) {
      throw new Error('Event not found')
    }

    // Only organizer (owner) or admin can update
    const isOwner = event.organizerId === user._id
    if (!isOwner && !isAdminRole(user.role)) {
      throw new Error('Access denied')
    }

    await ctx.db.patch(args.applicationId, {
      status: args.status,
      organizerNotes: args.organizerNotes,
      rejectionReason: args.status === 'rejected' ? args.rejectionReason : undefined,
      respondedAt: Date.now(),
      respondedBy: user._id,
      updatedAt: Date.now(),
    })

    // If accepted, optionally create eventVendor/eventSponsor relationship
    if (args.status === 'accepted') {
      if (application.applicantType === 'vendor') {
        const vendorId = parseApplicantId(application.applicantId, 'vendors')
        if (vendorId) {
          // Check if relationship already exists
          const existing = await ctx.db
            .query('eventVendors')
            .withIndex('by_event', (q) => q.eq('eventId', application.eventId))
            .filter((q) => q.eq(q.field('vendorId'), vendorId))
            .first()

          if (!existing) {
            await ctx.db.insert('eventVendors', {
              eventId: application.eventId,
              vendorId,
              status: 'confirmed',
              proposedBudget: application.proposedBudget,
              notes: application.message,
              createdAt: Date.now(),
            })
          }
        }
      } else {
        // Sponsor
        const sponsorId = parseApplicantId(application.applicantId, 'sponsors')
        if (sponsorId) {
          const existing = await ctx.db
            .query('eventSponsors')
            .withIndex('by_event', (q) => q.eq('eventId', application.eventId))
            .filter((q) => q.eq(q.field('sponsorId'), sponsorId))
            .first()

          if (!existing) {
            await ctx.db.insert('eventSponsors', {
              eventId: application.eventId,
              sponsorId,
              tier: application.proposedTier,
              status: 'confirmed',
              amount: application.proposedBudget,
              notes: application.message,
              createdAt: Date.now(),
            })
          }
        }
      }
    }

    return { success: true }
  },
})

// Withdraw application (admin only)
export const withdraw = mutation({
  args: {
    applicationId: v.id('eventApplications'),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new Error('Application not found')
    }

    if (application.status === 'accepted') {
      throw new Error('Cannot withdraw an accepted application')
    }

    await ctx.db.patch(args.applicationId, {
      status: 'withdrawn',
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Get pending application counts for organizer dashboard
export const getMyPendingCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return 0

    // Get all events owned by this user
    const myEvents = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', user._id))
      .collect()

    if (myEvents.length === 0) return 0

    let pendingCount = 0
    for (const event of myEvents) {
      const applications = await ctx.db
        .query('eventApplications')
        .withIndex('by_event_status', (q) => q.eq('eventId', event._id).eq('status', 'pending'))
        .collect()
      pendingCount += applications.length
    }

    return pendingCount
  },
})

// ============================================================================
// Self-Service Mutations (for approved vendors/sponsors)
// ============================================================================

/**
 * Self-service application submission by an approved vendor or sponsor.
 * The user must be linked to an approved vendor/sponsor account.
 */
export const selfServiceSubmit = mutation({
  args: {
    eventId: v.id('events'),
    applicantType: v.union(v.literal('vendor'), v.literal('sponsor')),
    applicantId: v.string(),
    message: v.optional(v.string()),
    proposedServices: v.optional(v.array(v.string())),
    proposedBudget: v.optional(v.number()),
    proposedTier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    // Verify event exists and is public
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    if (!event.isPublic) {
      throw new Error('This event is not accepting public applications')
    }

    // Verify applicant exists and is approved
    let applicantName = ''
    let applicantEmail = ''

    if (args.applicantType === 'vendor') {
      const vendorId = parseApplicantId(args.applicantId, 'vendors')
      if (!vendorId) {
        throw new Error('Invalid vendor ID format')
      }
      const vendor = await ctx.db.get(vendorId)
      if (!vendor) {
        throw new Error('Vendor not found')
      }
      if (vendor.status !== 'approved') {
        throw new Error(
          'Only approved vendors can apply to events. Please wait for your application to be approved.'
        )
      }
      applicantName = vendor.contactName || vendor.name
      applicantEmail = vendor.contactEmail || ''

      // Check if seeking vendors
      if (!event.seekingVendors) {
        throw new Error('This event is not seeking vendors')
      }
    } else {
      const sponsorId = parseApplicantId(args.applicantId, 'sponsors')
      if (!sponsorId) {
        throw new Error('Invalid sponsor ID format')
      }
      const sponsor = await ctx.db.get(sponsorId)
      if (!sponsor) {
        throw new Error('Sponsor not found')
      }
      if (sponsor.status !== 'approved') {
        throw new Error(
          'Only approved sponsors can apply to events. Please wait for your application to be approved.'
        )
      }
      applicantName = sponsor.contactName || sponsor.name
      applicantEmail = sponsor.contactEmail || ''

      // Check if seeking sponsors
      if (!event.seekingSponsors) {
        throw new Error('This event is not seeking sponsors')
      }
    }

    // Check for duplicate application
    const existing = await ctx.db
      .query('eventApplications')
      .withIndex('by_applicant', (q) =>
        q.eq('applicantType', args.applicantType).eq('applicantId', args.applicantId)
      )
      .filter((q) => q.eq(q.field('eventId'), args.eventId))
      .first()

    if (existing) {
      if (existing.status === 'pending' || existing.status === 'under_review') {
        throw new Error('You already have a pending application for this event')
      }
      if (existing.status === 'accepted') {
        throw new Error('You are already confirmed for this event')
      }
    }

    const applicationId = await ctx.db.insert('eventApplications', {
      eventId: args.eventId,
      applicantType: args.applicantType,
      applicantId: args.applicantId,
      status: 'pending',
      message: args.message,
      proposedServices: args.proposedServices,
      proposedBudget: args.proposedBudget,
      proposedTier: args.proposedTier,
      contactName: applicantName,
      contactEmail: applicantEmail,
      submittedBy: user._id,
      createdAt: Date.now(),
    })

    return { applicationId, success: true }
  },
})

/**
 * Get all applications submitted by vendors/sponsors linked to the current user.
 * Allows self-service users to track their application status.
 */
export const listMyApplications = query({
  args: {
    applicantType: v.union(v.literal('vendor'), v.literal('sponsor')),
    applicantId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    // Get applications for this applicant
    const applications = await ctx.db
      .query('eventApplications')
      .withIndex('by_applicant', (q) =>
        q.eq('applicantType', args.applicantType).eq('applicantId', args.applicantId)
      )
      .order('desc')
      .collect()

    // Enrich with event details
    const eventIds = [...new Set(applications.map((a) => a.eventId))]
    const eventPromises = eventIds.map((id) => ctx.db.get(id))
    const events = await Promise.all(eventPromises)
    const eventMap = new Map(events.filter(Boolean).map((e) => [e!._id, e!]))

    return applications.map((app) => {
      const event = eventMap.get(app.eventId)
      return {
        ...app,
        eventDetails: event
          ? {
              title: event.title,
              startDate: event.startDate,
              endDate: event.endDate,
              venueName: event.venueName,
              locationType: event.locationType,
              status: event.status,
            }
          : null,
      }
    })
  },
})
