import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertRole } from './lib/auth'
import { isValidEmail } from './lib/emailValidation'

// ============================================================================
// Public Queries (for organizers)
// ============================================================================

// List all approved sponsors with optional industry filter
export const list = query({
  args: {
    industry: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let sponsors = await ctx.db
      .query('sponsors')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()

    // Filter by industry if provided
    if (args.industry && args.industry !== 'all') {
      sponsors = sponsors.filter((s) => s.industry === args.industry)
    }

    // Filter by search query if provided
    if (args.search && args.search.trim()) {
      const searchLower = args.search.toLowerCase()
      sponsors = sponsors.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.description?.toLowerCase().includes(searchLower)
      )
    }

    return sponsors
  },
})

// Get a single sponsor by ID
// Only returns approved sponsors to unauthenticated users
// Admins can view all sponsors including pending/rejected
export const get = query({
  args: { id: v.id('sponsors') },
  handler: async (ctx, args) => {
    const sponsor = await ctx.db.get(args.id)
    if (!sponsor) return null

    // Always allow viewing approved sponsors
    if (sponsor.status === 'approved') {
      return sponsor
    }

    // For non-approved sponsors, require admin role
    const { getCurrentUser, isAdminRole } = await import('./lib/auth')
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) {
      // Return null for unauthorized access to non-approved sponsors
      return null
    }

    return sponsor
  },
})

// Get all unique industries from approved sponsors
export const getIndustries = query({
  args: {},
  handler: async (ctx) => {
    const sponsors = await ctx.db
      .query('sponsors')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()

    const industries = [...new Set(sponsors.map((s) => s.industry))]
    return industries.sort()
  },
})

// Get sponsors for a specific event with full sponsor details
export const getByEvent = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    if (eventSponsors.length === 0) return []

    // BATCH LOAD: Fetch all sponsors at once instead of N+1 queries
    const sponsorIds = [...new Set(eventSponsors.map((es) => es.sponsorId))]
    const sponsorPromises = sponsorIds.map((id) => ctx.db.get(id))
    const sponsors = await Promise.all(sponsorPromises)

    // Create lookup map
    const sponsorMap = new Map(sponsors.filter(Boolean).map((s) => [s!._id, s!]))

    // Merge using map (no additional queries)
    return eventSponsors
      .map((es) => ({
        ...es,
        sponsor: sponsorMap.get(es.sponsorId) || null,
      }))
      .filter((s) => s.sponsor !== null)
  },
})

// Create a new sponsor (for sponsor registration - future feature)
// Requires authentication - creates sponsor in pending status for admin review
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    industry: v.string(),
    sponsorshipTiers: v.optional(v.array(v.string())),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    targetEventTypes: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require authentication for sponsor creation
    const { getCurrentUser } = await import('./lib/auth')
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required to register as a sponsor')
    }

    // Input validation - prevent excessively long strings
    if (args.name.length > 200) {
      throw new Error('Sponsor name must be 200 characters or less')
    }
    if (args.description && args.description.length > 5000) {
      throw new Error('Description must be 5000 characters or less')
    }
    if (args.industry.length > 100) {
      throw new Error('Industry must be 100 characters or less')
    }

    // Validate budget range
    if (args.budgetMin !== undefined && args.budgetMin < 0) {
      throw new Error('Minimum budget cannot be negative')
    }
    if (args.budgetMax !== undefined && args.budgetMax < 0) {
      throw new Error('Maximum budget cannot be negative')
    }
    if (
      args.budgetMin !== undefined &&
      args.budgetMax !== undefined &&
      args.budgetMin > args.budgetMax
    ) {
      throw new Error('Minimum budget cannot exceed maximum budget')
    }

    // Validate email format if provided
    if (args.contactEmail && !isValidEmail(args.contactEmail)) {
      throw new Error('Invalid email format')
    }

    // Validate website URL format if provided
    if (args.website) {
      try {
        new URL(args.website)
      } catch {
        throw new Error('Invalid website URL format')
      }
    }

    return await ctx.db.insert('sponsors', {
      ...args,
      verified: false,
      status: 'pending',
      // Note: Consider adding submittedBy field to schema to track who submitted
      createdAt: Date.now(),
    })
  },
})

// ============================================================================
// Admin Queries
// ============================================================================

// List all sponsors for admin review (includes pending)
export const listForAdmin = query({
  args: {
    status: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
    industry: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let sponsors
    const statusFilter = args.status
    if (statusFilter) {
      sponsors = await ctx.db
        .query('sponsors')
        .withIndex('by_status', (q) => q.eq('status', statusFilter))
        .order('desc')
        .collect()
    } else {
      sponsors = await ctx.db.query('sponsors').order('desc').collect()
    }

    // Filter by industry if provided
    if (args.industry && args.industry !== 'all') {
      sponsors = sponsors.filter((s) => s.industry === args.industry)
    }

    // Apply limit
    const limit = args.limit || 100
    return sponsors.slice(0, limit)
  },
})

// Get pending sponsors count for admin dashboard
export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const pending = await ctx.db
      .query('sponsors')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect()

    return pending.length
  },
})

// ============================================================================
// Admin Mutations
// ============================================================================

// Approve a sponsor
export const approve = mutation({
  args: {
    sponsorId: v.id('sponsors'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const sponsor = await ctx.db.get(args.sponsorId)
    if (!sponsor) {
      throw new Error('Sponsor not found')
    }

    if (sponsor.status === 'approved') {
      throw new Error('Sponsor is already approved')
    }

    const now = Date.now()

    await ctx.db.patch(args.sponsorId, {
      status: 'approved',
      verified: true,
      reviewedBy: admin._id,
      reviewedAt: now,
      reviewNotes: args.notes,
      rejectionReason: undefined,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'sponsor_approved',
      targetType: 'sponsor',
      targetId: args.sponsorId,
      reason: args.notes || 'Sponsor approved',
      metadata: {
        sponsorName: sponsor.name,
        sponsorIndustry: sponsor.industry,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

// Reject a sponsor
export const reject = mutation({
  args: {
    sponsorId: v.id('sponsors'),
    reason: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const sponsor = await ctx.db.get(args.sponsorId)
    if (!sponsor) {
      throw new Error('Sponsor not found')
    }

    if (sponsor.status === 'rejected') {
      throw new Error('Sponsor is already rejected')
    }

    const now = Date.now()

    await ctx.db.patch(args.sponsorId, {
      status: 'rejected',
      verified: false,
      reviewedBy: admin._id,
      reviewedAt: now,
      rejectionReason: args.reason,
      reviewNotes: args.notes,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'sponsor_rejected',
      targetType: 'sponsor',
      targetId: args.sponsorId,
      reason: args.reason,
      metadata: {
        sponsorName: sponsor.name,
        sponsorIndustry: sponsor.industry,
        internalNotes: args.notes,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

// Admin create sponsor (manual onboarding)
export const adminCreate = mutation({
  args: {
    // Basic Info
    name: v.string(),
    description: v.optional(v.string()),
    industry: v.string(),
    sponsorshipTiers: v.optional(v.array(v.string())),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    targetEventTypes: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    applicationSource: v.optional(v.string()),
    applicationNotes: v.optional(v.string()),
    autoApprove: v.optional(v.boolean()),

    // Enterprise Fields - Company Info
    companySize: v.optional(v.string()),
    yearFounded: v.optional(v.number()),
    headquarters: v.optional(v.string()),

    // Past Experience
    pastSponsorships: v.optional(
      v.array(
        v.object({
          eventName: v.string(),
          year: v.number(),
          tier: v.optional(v.string()),
          amount: v.optional(v.number()),
        })
      )
    ),
    deliverablesOffered: v.optional(v.array(v.string())),

    // Contracts & Legal
    contractTemplateUrl: v.optional(v.string()),
    legalDocs: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          type: v.string(),
          uploadedAt: v.number(),
        })
      )
    ),

    // Payment Terms
    paymentTerms: v.optional(
      v.object({
        preferredMethod: v.optional(v.string()),
        netDays: v.optional(v.number()),
        requiresInvoice: v.optional(v.boolean()),
        currency: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),

    // Exclusivity Requirements
    exclusivityRequirements: v.optional(
      v.object({
        requiresExclusivity: v.boolean(),
        competitorRestrictions: v.optional(v.array(v.string())),
        territorialScope: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),

    // Brand Guidelines
    brandGuidelines: v.optional(
      v.object({
        guidelinesUrl: v.optional(v.string()),
        logoUsageNotes: v.optional(v.string()),
        colorCodes: v.optional(v.array(v.string())),
        prohibitedUsages: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const now = Date.now()
    const status = args.autoApprove ? 'approved' : 'pending'

    const sponsorId = await ctx.db.insert('sponsors', {
      // Basic Info
      name: args.name,
      description: args.description,
      industry: args.industry,
      sponsorshipTiers: args.sponsorshipTiers,
      budgetMin: args.budgetMin,
      budgetMax: args.budgetMax,
      targetEventTypes: args.targetEventTypes,
      targetAudience: args.targetAudience,
      contactEmail: args.contactEmail,
      contactName: args.contactName,
      contactPhone: args.contactPhone,
      website: args.website,
      logoUrl: args.logoUrl,
      verified: args.autoApprove || false,
      status,
      applicationSource: args.applicationSource || 'manual',
      applicationNotes: args.applicationNotes,
      reviewedBy: args.autoApprove ? admin._id : undefined,
      reviewedAt: args.autoApprove ? now : undefined,

      // Enterprise Fields
      companySize: args.companySize,
      yearFounded: args.yearFounded,
      headquarters: args.headquarters,
      pastSponsorships: args.pastSponsorships,
      deliverablesOffered: args.deliverablesOffered,
      contractTemplateUrl: args.contractTemplateUrl,
      legalDocs: args.legalDocs,
      paymentTerms: args.paymentTerms,
      exclusivityRequirements: args.exclusivityRequirements,
      brandGuidelines: args.brandGuidelines,

      createdAt: now,
    })

    // Log if auto-approved
    if (args.autoApprove) {
      await ctx.db.insert('moderationLogs', {
        adminId: admin._id,
        action: 'sponsor_approved',
        targetType: 'sponsor',
        targetId: sponsorId,
        reason: 'Manually onboarded and approved',
        metadata: {
          sponsorName: args.name,
          sponsorIndustry: args.industry,
          source: args.applicationSource || 'manual',
        },
        createdAt: now,
      })
    }

    return sponsorId
  },
})

// Admin update sponsor
export const adminUpdate = mutation({
  args: {
    sponsorId: v.id('sponsors'),

    // Basic Info
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    industry: v.optional(v.string()),
    sponsorshipTiers: v.optional(v.array(v.string())),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    targetEventTypes: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    applicationNotes: v.optional(v.string()),

    // Enterprise Fields - Company Info
    companySize: v.optional(v.string()),
    yearFounded: v.optional(v.number()),
    headquarters: v.optional(v.string()),

    // Past Experience
    pastSponsorships: v.optional(
      v.array(
        v.object({
          eventName: v.string(),
          year: v.number(),
          tier: v.optional(v.string()),
          amount: v.optional(v.number()),
        })
      )
    ),
    deliverablesOffered: v.optional(v.array(v.string())),

    // Contracts & Legal
    contractTemplateUrl: v.optional(v.string()),
    legalDocs: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          type: v.string(),
          uploadedAt: v.number(),
        })
      )
    ),

    // Payment Terms
    paymentTerms: v.optional(
      v.object({
        preferredMethod: v.optional(v.string()),
        netDays: v.optional(v.number()),
        requiresInvoice: v.optional(v.boolean()),
        currency: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),

    // Exclusivity Requirements
    exclusivityRequirements: v.optional(
      v.object({
        requiresExclusivity: v.boolean(),
        competitorRestrictions: v.optional(v.array(v.string())),
        territorialScope: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),

    // Brand Guidelines
    brandGuidelines: v.optional(
      v.object({
        guidelinesUrl: v.optional(v.string()),
        logoUsageNotes: v.optional(v.string()),
        colorCodes: v.optional(v.array(v.string())),
        prohibitedUsages: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const { sponsorId, ...updates } = args

    const sponsor = await ctx.db.get(sponsorId)
    if (!sponsor) {
      throw new Error('Sponsor not found')
    }

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value
      }
    }

    await ctx.db.patch(sponsorId, {
      ...filteredUpdates,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})
