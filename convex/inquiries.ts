import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { internal } from './_generated/api'
import { getCurrentUser, assertRole, isAdminRole } from './lib/auth'

/**
 * Safely parse a recipient ID string to the appropriate Id type.
 * Returns null if the ID format is invalid.
 * Convex IDs are base64url-encoded strings that typically look like: j57123abc...
 */
function parseRecipientId<T extends 'vendors' | 'sponsors'>(
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
  // Note: convex-test uses IDs like '10000;vendors', so we must allow semicolon
  const convexIdPattern = /^[a-zA-Z0-9_;-]{5,}$/
  if (!convexIdPattern.test(id)) {
    return null
  }
  return id as Id<T>
}

// ============================================================================
// Queries
// ============================================================================

// Get inquiries sent by current user (organizer viewing their sent inquiries)
export const listMySent = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    let inquiries = await ctx.db
      .query('inquiries')
      .withIndex('by_from', (q) => q.eq('fromUserId', user._id))
      .order('desc')
      .collect()

    if (args.status && args.status !== 'all') {
      inquiries = inquiries.filter((i) => i.status === args.status)
    }

    // Enrich with recipient details
    const enrichedInquiries = await Promise.all(
      inquiries.map(async (inquiry) => {
        let recipientDetails: {
          name: string
          category?: string
          industry?: string
          contactEmail?: string
        } | null = null

        if (inquiry.toType === 'vendor') {
          const vendorId = parseRecipientId(inquiry.toId, 'vendors')
          const vendor = vendorId ? await ctx.db.get(vendorId) : null
          if (vendor) {
            recipientDetails = {
              name: vendor.name,
              category: vendor.category,
              contactEmail: vendor.contactEmail,
            }
          }
        } else {
          const sponsorId = parseRecipientId(inquiry.toId, 'sponsors')
          const sponsor = sponsorId ? await ctx.db.get(sponsorId) : null
          if (sponsor) {
            recipientDetails = {
              name: sponsor.name,
              industry: sponsor.industry,
              contactEmail: sponsor.contactEmail,
            }
          }
        }

        // Get event details if associated
        let eventDetails: { title: string; startDate: number } | null = null
        if (inquiry.eventId) {
          const event = await ctx.db.get(inquiry.eventId)
          if (event) {
            eventDetails = {
              title: event.title,
              startDate: event.startDate,
            }
          }
        }

        return { ...inquiry, recipientDetails, eventDetails }
      })
    )

    return enrichedInquiries
  },
})

// Get inquiries for a vendor/sponsor (admin only)
export const listByRecipient = query({
  args: {
    toType: v.union(v.literal('vendor'), v.literal('sponsor')),
    toId: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []
    if (!isAdminRole(user.role)) return []

    let inquiries = await ctx.db
      .query('inquiries')
      .withIndex('by_to', (q) => q.eq('toType', args.toType).eq('toId', args.toId))
      .order('desc')
      .collect()

    if (args.status && args.status !== 'all') {
      inquiries = inquiries.filter((i) => i.status === args.status)
    }

    // Enrich with sender and event details
    const enrichedInquiries = await Promise.all(
      inquiries.map(async (inquiry) => {
        const sender = await ctx.db.get(inquiry.fromUserId)
        let eventDetails: { title: string; startDate: number } | null = null
        if (inquiry.eventId) {
          const event = await ctx.db.get(inquiry.eventId)
          if (event) {
            eventDetails = {
              title: event.title,
              startDate: event.startDate,
            }
          }
        }
        return {
          ...inquiry,
          senderDetails: sender ? { name: sender.name, email: sender.email } : null,
          eventDetails,
        }
      })
    )

    return enrichedInquiries
  },
})

// Paginated list for admin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listAllForAdminHandler = async (ctx: any, args: any) => {
  await assertRole(ctx, 'admin')

  // Determine which index to use for better performance
  let inquiriesQuery
  if (args.status && args.status !== 'all') {
    inquiriesQuery = ctx.db
      .query('inquiries')
      .withIndex('by_status', (q) =>
        q.eq('status', args.status as 'sent' | 'read' | 'replied' | 'closed')
      )
      .order('desc')
  } else if (args.toType) {
    inquiriesQuery = ctx.db
      .query('inquiries')
      .withIndex('by_type_status', (q) => q.eq('toType', args.toType as 'vendor' | 'sponsor'))
      .order('desc')
  } else {
    // Use the new createdAt index for sorting
    inquiriesQuery = ctx.db.query('inquiries').withIndex('by_createdAt').order('desc')
  }

  // Use Convex's built-in pagination
  const {
    page: paginatedResults,
    isDone,
    continueCursor,
  } = await inquiriesQuery.paginate(args.paginationOpts || { numItems: 20, cursor: null })

  // Enrich results
  const enrichedResults = await Promise.all(
    paginatedResults.map(async (inquiry: Doc<'inquiries'>) => {
      // Secondary filter for cases where we couldn't filter by both in the index
      if (args.toType && inquiry.toType !== args.toType) return null
      if (args.status && args.status !== 'all' && inquiry.status !== args.status) return null

      const sender = await ctx.db.get(inquiry.fromUserId)
      let recipientDetails = null

      if (inquiry.toType === 'vendor') {
        const vendorId = parseRecipientId(inquiry.toId, 'vendors')
        const vendor = vendorId ? await ctx.db.get(vendorId) : null
        if (vendor) {
          recipientDetails = {
            name: vendor.name,
            category: vendor.category,
            contactEmail: vendor.contactEmail,
          }
        }
      } else {
        const sponsorId = parseRecipientId(inquiry.toId, 'sponsors')
        const sponsor = sponsorId ? await ctx.db.get(sponsorId) : null
        if (sponsor) {
          recipientDetails = {
            name: sponsor.name,
            industry: sponsor.industry,
            contactEmail: sponsor.contactEmail,
          }
        }
      }

      let eventDetails = null
      if (inquiry.eventId) {
        const event = await ctx.db.get(inquiry.eventId)
        if (event) {
          eventDetails = {
            title: event.title,
            startDate: event.startDate,
          }
        }
      }

      return {
        ...inquiry,
        senderDetails: sender
          ? { name: sender.name, email: sender.email, image: sender.image }
          : null,
        recipientDetails,
        eventDetails,
      }
    })
  )

  // Filter out null results (from secondary filter)
  const filteredPage = enrichedResults.filter(
    (item): item is NonNullable<typeof item> => item !== null
  )

  return {
    page: filteredPage,
    isDone,
    continueCursor: continueCursor ?? '',
  }
}

export const listAllForAdmin = query({
  args: {
    status: v.optional(v.string()),
    toType: v.optional(v.union(v.literal('vendor'), v.literal('sponsor'))),
  },
  handler: listAllForAdminHandler,
})

// Search inquiries (admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const searchAdminInquiriesHandler = async (ctx: any, args: any) => {
  await assertRole(ctx, 'admin')

  const inquiries = await ctx.db
    .query('inquiries')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withSearchIndex('search_content', (q: any) => q.search('subject', args.query))
    .take(20)

  // Enrich results
  const enriched = await Promise.all(
    inquiries.map(async (inquiry: Doc<'inquiries'>) => {
      const sender = await ctx.db.get(inquiry.fromUserId)
      let recipientDetails = null

      if (inquiry.toType === 'vendor') {
        const vendorId = parseRecipientId(inquiry.toId, 'vendors')
        const vendor = vendorId ? await ctx.db.get(vendorId) : null
        if (vendor) {
          recipientDetails = {
            name: vendor.name,
            category: vendor.category,
            contactEmail: vendor.contactEmail,
          }
        }
      } else {
        const sponsorId = parseRecipientId(inquiry.toId, 'sponsors')
        const sponsor = sponsorId ? await ctx.db.get(sponsorId) : null
        if (sponsor) {
          recipientDetails = {
            name: sponsor.name,
            industry: sponsor.industry,
            contactEmail: sponsor.contactEmail,
          }
        }
      }

      return {
        ...inquiry,
        senderDetails: sender
          ? { name: sender.name, email: sender.email, image: sender.image }
          : null,
        recipientDetails,
      }
    })
  )

  return enriched
}

export const searchAdminInquiries = query({
  args: {
    query: v.string(),
  },
  handler: searchAdminInquiriesHandler,
})

// Get inquiries for an event (organizer viewing inquiries they sent for an event)
export const listByEvent = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const event = await ctx.db.get(args.eventId)
    if (!event) return []

    // Only owner or admin can view
    const isOwner = event.organizerId === user._id
    if (!isOwner && !isAdminRole(user.role)) return []

    const inquiries = await ctx.db
      .query('inquiries')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .order('desc')
      .collect()

    // Enrich with recipient details
    const enrichedInquiries = await Promise.all(
      inquiries.map(async (inquiry) => {
        let recipientDetails: {
          name: string
          category?: string
          industry?: string
          contactEmail?: string
        } | null = null

        if (inquiry.toType === 'vendor') {
          const vendorId = parseRecipientId(inquiry.toId, 'vendors')
          const vendor = vendorId ? await ctx.db.get(vendorId) : null
          if (vendor) {
            recipientDetails = {
              name: vendor.name,
              category: vendor.category,
              contactEmail: vendor.contactEmail,
            }
          }
        } else {
          const sponsorId = parseRecipientId(inquiry.toId, 'sponsors')
          const sponsor = sponsorId ? await ctx.db.get(sponsorId) : null
          if (sponsor) {
            recipientDetails = {
              name: sponsor.name,
              industry: sponsor.industry,
              contactEmail: sponsor.contactEmail,
            }
          }
        }
        return { ...inquiry, recipientDetails }
      })
    )

    return enrichedInquiries
  },
})

// Get single inquiry
export const get = query({
  args: { id: v.id('inquiries') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const inquiry = await ctx.db.get(args.id)
    if (!inquiry) return null

    // Only sender or admin can view
    const isSender = inquiry.fromUserId === user._id
    if (!isSender && !isAdminRole(user.role)) return null

    // Get recipient details
    let recipientDetails = null
    if (inquiry.toType === 'vendor') {
      const vendorId = parseRecipientId(inquiry.toId, 'vendors')
      recipientDetails = vendorId ? await ctx.db.get(vendorId) : null
    } else {
      const sponsorId = parseRecipientId(inquiry.toId, 'sponsors')
      recipientDetails = sponsorId ? await ctx.db.get(sponsorId) : null
    }

    // Get event if associated
    let eventDetails = null
    if (inquiry.eventId) {
      eventDetails = await ctx.db.get(inquiry.eventId)
    }

    // Get sender details (for admin)
    let senderDetails = null
    if (isAdminRole(user.role)) {
      const sender = await ctx.db.get(inquiry.fromUserId)
      if (sender) {
        senderDetails = { name: sender.name, email: sender.email, image: sender.image }
      }
    }

    return { ...inquiry, recipientDetails, eventDetails, senderDetails }
  },
})

// Get unread inquiry count for dashboard
export const getMyUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return 0

    // Count inquiries I've sent that have been replied to but I haven't viewed
    const inquiries = await ctx.db
      .query('inquiries')
      .withIndex('by_from', (q) => q.eq('fromUserId', user._id))
      .filter((q) => q.eq(q.field('status'), 'replied'))
      .collect()

    return inquiries.length
  },
})

// ============================================================================
// Mutations
// ============================================================================

// Send inquiry (organizer or admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendHandler = async (ctx: any, args: any) => {
  const user = await getCurrentUser(ctx)
  if (!user) {
    throw new Error('Authentication required')
  }

  // Only organizers and admins can send inquiries
  const isOrganizer = user.role === 'organizer'
  const isAdmin = isAdminRole(user.role)
  if (!isOrganizer && !isAdmin) {
    throw new Error('Only organizers and admins can send inquiries')
  }

  // Verify recipient exists and is approved
  if (args.toType === 'vendor') {
    const vendorId = parseRecipientId(args.toId, 'vendors')
    if (!vendorId) {
      throw new Error('Invalid vendor ID format')
    }
    const vendor = await ctx.db.get(vendorId)
    if (!vendor || vendor.status !== 'approved') {
      throw new Error('Vendor not found or not approved')
    }
  } else {
    const sponsorId = parseRecipientId(args.toId, 'sponsors')
    if (!sponsorId) {
      throw new Error('Invalid sponsor ID format')
    }
    const sponsor = await ctx.db.get(sponsorId)
    if (!sponsor || sponsor.status !== 'approved') {
      throw new Error('Sponsor not found or not approved')
    }
  }

  // If event is specified, verify ownership
  if (args.eventId) {
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    const isOwner = event.organizerId === user._id
    if (!isOwner && !isAdmin) {
      throw new Error('Access denied - not your event')
    }
  }

  // Input validation - string length limits
  if (args.subject.length > 200) {
    throw new Error('Subject must be 200 characters or less')
  }
  if (args.subject.trim().length === 0) {
    throw new Error('Subject cannot be empty')
  }
  if (args.message.length > 10000) {
    throw new Error('Message must be 10000 characters or less')
  }
  if (args.message.trim().length === 0) {
    throw new Error('Message cannot be empty')
  }

  const fromType = isAdmin ? 'admin' : 'organizer'

  const inquiryId = await ctx.db.insert('inquiries', {
    fromType,
    fromUserId: user._id,
    toType: args.toType,
    toId: args.toId,
    eventId: args.eventId,
    subject: args.subject.trim(),
    message: args.message.trim(),
    status: 'sent',
    createdAt: Date.now(),
  })

  if (!isAdmin) {
    await ctx.runMutation(internal.adminNotifications.createNotification, {
      type: 'system_alert',
      title: 'New organizer inquiry',
      message: `${user.name || 'An organizer'} sent an inquiry to a ${args.toType}.`,
      severity: 'medium',
      targetType: 'inquiry',
      targetId: inquiryId,
      metadata: {
        inquiryId,
        organizerId: user._id,
        organizerName: user.name,
        organizerEmail: user.email,
        toType: args.toType,
        toId: args.toId,
        eventId: args.eventId,
        subject: args.subject.trim(),
      },
    })
  }

  return inquiryId
}

export const send = mutation({
  args: {
    toType: v.union(v.literal('vendor'), v.literal('sponsor')),
    toId: v.string(),
    eventId: v.optional(v.id('events')),
    subject: v.string(),
    message: v.string(),
  },
  handler: sendHandler,
})

// Mark as read (admin marking inquiry as read on behalf of vendor/sponsor)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const markAsReadHandler = async (ctx: any, args: any) => {
  await assertRole(ctx, 'admin')

  const inquiry = await ctx.db.get(args.inquiryId)
  if (!inquiry) {
    throw new Error('Inquiry not found')
  }

  if (inquiry.status === 'sent') {
    await ctx.db.patch(args.inquiryId, {
      status: 'read',
      updatedAt: Date.now(),
    })
  }

  return { success: true }
}

export const markAsRead = mutation({
  args: {
    inquiryId: v.id('inquiries'),
  },
  handler: markAsReadHandler,
})

// Add response (admin responding on behalf of vendor/sponsor)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const respondHandler = async (ctx: any, args: any) => {
  await assertRole(ctx, 'admin')

  const inquiry = await ctx.db.get(args.inquiryId)
  if (!inquiry) {
    throw new Error('Inquiry not found')
  }

  // Input validation - string length limits
  if (args.response.length > 10000) {
    throw new Error('Response must be 10000 characters or less')
  }
  if (args.response.trim().length === 0) {
    throw new Error('Response cannot be empty')
  }

  await ctx.db.patch(args.inquiryId, {
    response: args.response.trim(),
    respondedAt: Date.now(),
    status: 'replied',
    updatedAt: Date.now(),
  })

  return { success: true }
}

export const respond = mutation({
  args: {
    inquiryId: v.id('inquiries'),
    response: v.string(),
  },
  handler: respondHandler,
})

// Update admin notes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateAdminNotesHandler = async (ctx: any, args: any) => {
  await assertRole(ctx, 'admin')

  const inquiry = await ctx.db.get(args.inquiryId)
  if (!inquiry) {
    throw new Error('Inquiry not found')
  }

  await ctx.db.patch(args.inquiryId, {
    adminNotes: args.notes,
    updatedAt: Date.now(),
  })

  return { success: true }
}

export const updateAdminNotes = mutation({
  args: {
    inquiryId: v.id('inquiries'),
    notes: v.string(),
  },
  handler: updateAdminNotesHandler,
})

// Close inquiry (admin closing inquiry on behalf of vendor/sponsor)
export const close = mutation({
  args: {
    inquiryId: v.id('inquiries'),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const inquiry = await ctx.db.get(args.inquiryId)
    if (!inquiry) {
      throw new Error('Inquiry not found')
    }

    await ctx.db.patch(args.inquiryId, {
      status: 'closed',
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Get inquiry stats for admin dashboard
export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null
    if (!isAdminRole(user.role)) return null

    const allInquiries = await ctx.db.query('inquiries').collect()

    return {
      total: allInquiries.length,
      sent: allInquiries.filter((i) => i.status === 'sent').length,
      read: allInquiries.filter((i) => i.status === 'read').length,
      replied: allInquiries.filter((i) => i.status === 'replied').length,
      closed: allInquiries.filter((i) => i.status === 'closed').length,
    }
  },
})
