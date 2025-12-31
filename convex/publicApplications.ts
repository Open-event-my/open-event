import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { assertRole } from './lib/auth'
import { isValidEmail } from './lib/emailValidation'
import { internal } from './_generated/api'

// ============================================================================
// Constants
// ============================================================================

const VENDOR_CATEGORIES = [
  'catering',
  'av',
  'photography',
  'videography',
  'security',
  'transportation',
  'decoration',
  'entertainment',
  'staffing',
  'equipment',
  'venue',
  'other',
] as const

const SPONSOR_INDUSTRIES = [
  'technology',
  'finance',
  'healthcare',
  'education',
  'retail',
  'manufacturing',
  'media',
  'entertainment',
  'food_beverage',
  'automotive',
  'real_estate',
  'consulting',
  'other',
] as const

const SPONSORSHIP_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'custom'] as const

const PRICE_RANGES = ['budget', 'mid', 'premium'] as const

const REFERRAL_SOURCES = [
  'google',
  'social_media',
  'referral',
  'event',
  'advertisement',
  'other',
] as const

// ============================================================================
// Public Mutations (No Auth Required)
// ============================================================================

/**
 * Submit a vendor application from the public form
 * No authentication required - anyone can apply
 */
export const submitVendorApplication = mutation({
  args: {
    companyName: v.string(),
    description: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    category: v.string(),
    services: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    pastExperience: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    referralSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    if (!isValidEmail(args.contactEmail)) {
      throw new Error('Invalid email address')
    }

    // Check for duplicate applications from same email
    const existingApplication = await ctx.db
      .query('publicApplications')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .filter((q) =>
        q.and(
          q.eq(q.field('applicationType'), 'vendor'),
          q.neq(q.field('status'), 'rejected'),
          q.neq(q.field('status'), 'converted')
        )
      )
      .first()

    if (existingApplication) {
      throw new Error(
        'An application with this email is already pending. Please contact us if you need to update your application.'
      )
    }

    const applicationId = await ctx.db.insert('publicApplications', {
      applicationType: 'vendor',
      status: 'submitted',
      companyName: args.companyName,
      description: args.description,
      contactName: args.contactName,
      contactEmail: args.contactEmail.toLowerCase(),
      contactPhone: args.contactPhone,
      website: args.website,
      vendorCategory: args.category,
      vendorServices: args.services,
      vendorLocation: args.location,
      vendorPriceRange: args.priceRange,
      pastExperience: args.pastExperience,
      additionalNotes: args.additionalNotes,
      referralSource: args.referralSource,
      createdAt: Date.now(),
    })

    // Create admin notification for new vendor application
    await ctx.runMutation(internal.adminNotifications.createApplicationNotification, {
      applicationId: applicationId,
      applicationType: 'vendor',
      companyName: args.companyName,
    })

    return { applicationId, type: 'vendor' }
  },
})

/**
 * Submit a sponsor application from the public form
 * No authentication required - anyone can apply
 */
export const submitSponsorApplication = mutation({
  args: {
    companyName: v.string(),
    description: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    industry: v.string(),
    sponsorshipTiers: v.optional(v.array(v.string())),
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    targetEventTypes: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    pastExperience: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    referralSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    if (!isValidEmail(args.contactEmail)) {
      throw new Error('Invalid email address')
    }

    // Check for duplicate applications from same email
    const existingApplication = await ctx.db
      .query('publicApplications')
      .withIndex('by_email', (q) => q.eq('contactEmail', args.contactEmail))
      .filter((q) =>
        q.and(
          q.eq(q.field('applicationType'), 'sponsor'),
          q.neq(q.field('status'), 'rejected'),
          q.neq(q.field('status'), 'converted')
        )
      )
      .first()

    if (existingApplication) {
      throw new Error(
        'An application with this email is already pending. Please contact us if you need to update your application.'
      )
    }

    const applicationId = await ctx.db.insert('publicApplications', {
      applicationType: 'sponsor',
      status: 'submitted',
      companyName: args.companyName,
      description: args.description,
      contactName: args.contactName,
      contactEmail: args.contactEmail.toLowerCase(),
      contactPhone: args.contactPhone,
      website: args.website,
      sponsorIndustry: args.industry,
      sponsorTiers: args.sponsorshipTiers,
      sponsorBudgetMin: args.budgetMin,
      sponsorBudgetMax: args.budgetMax,
      sponsorTargetEventTypes: args.targetEventTypes,
      sponsorTargetAudience: args.targetAudience,
      pastExperience: args.pastExperience,
      additionalNotes: args.additionalNotes,
      referralSource: args.referralSource,
      createdAt: Date.now(),
    })

    // Create admin notification for new sponsor application
    await ctx.runMutation(internal.adminNotifications.createApplicationNotification, {
      applicationId: applicationId,
      applicationType: 'sponsor',
      companyName: args.companyName,
    })

    return { applicationId, type: 'sponsor' }
  },
})

// ============================================================================
// Admin Queries
// ============================================================================

/**
 * List public applications for admin review
 */
export const listForAdmin = query({
  args: {
    status: v.optional(v.string()),
    type: v.optional(v.union(v.literal('vendor'), v.literal('sponsor'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const limit = args.limit ?? 50

    let applications

    if (args.type && args.status) {
      applications = await ctx.db
        .query('publicApplications')
        .withIndex('by_type_status', (q) =>
          q
            .eq('applicationType', args.type!)
            .eq(
              'status',
              args.status as 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted'
            )
        )
        .order('desc')
        .take(limit)
    } else if (args.type) {
      applications = await ctx.db
        .query('publicApplications')
        .withIndex('by_type', (q) => q.eq('applicationType', args.type!))
        .order('desc')
        .take(limit)
    } else if (args.status) {
      applications = await ctx.db
        .query('publicApplications')
        .withIndex('by_status', (q) =>
          q.eq(
            'status',
            args.status as 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted'
          )
        )
        .order('desc')
        .take(limit)
    } else {
      applications = await ctx.db.query('publicApplications').order('desc').take(limit)
    }

    // Enrich with reviewer info
    const enrichedApplications = await Promise.all(
      applications.map(async (app) => {
        let reviewer = null
        if (app.reviewedBy) {
          reviewer = await ctx.db.get(app.reviewedBy)
        }
        return {
          ...app,
          reviewerName: reviewer?.name ?? null,
        }
      })
    )

    return enrichedApplications
  },
})

/**
 * Get a single application by ID
 */
export const get = query({
  args: {
    applicationId: v.id('publicApplications'),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new Error('Application not found')
    }

    let reviewer = null
    if (application.reviewedBy) {
      reviewer = await ctx.db.get(application.reviewedBy)
    }

    let converter = null
    if (application.convertedBy) {
      converter = await ctx.db.get(application.convertedBy)
    }

    return {
      ...application,
      reviewerName: reviewer?.name ?? null,
      converterName: converter?.name ?? null,
    }
  },
})

/**
 * Get pending counts by type
 */
export const getPendingCounts = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const vendorPending = await ctx.db
      .query('publicApplications')
      .withIndex('by_type_status', (q) =>
        q.eq('applicationType', 'vendor').eq('status', 'submitted')
      )
      .collect()

    const sponsorPending = await ctx.db
      .query('publicApplications')
      .withIndex('by_type_status', (q) =>
        q.eq('applicationType', 'sponsor').eq('status', 'submitted')
      )
      .collect()

    const vendorUnderReview = await ctx.db
      .query('publicApplications')
      .withIndex('by_type_status', (q) =>
        q.eq('applicationType', 'vendor').eq('status', 'under_review')
      )
      .collect()

    const sponsorUnderReview = await ctx.db
      .query('publicApplications')
      .withIndex('by_type_status', (q) =>
        q.eq('applicationType', 'sponsor').eq('status', 'under_review')
      )
      .collect()

    return {
      vendor: {
        submitted: vendorPending.length,
        underReview: vendorUnderReview.length,
        total: vendorPending.length + vendorUnderReview.length,
      },
      sponsor: {
        submitted: sponsorPending.length,
        underReview: sponsorUnderReview.length,
        total: sponsorPending.length + sponsorUnderReview.length,
      },
      total:
        vendorPending.length +
        sponsorPending.length +
        vendorUnderReview.length +
        sponsorUnderReview.length,
    }
  },
})

// ============================================================================
// Admin Mutations
// ============================================================================

/**
 * Update application status (e.g., mark as under review)
 */
export const updateStatus = mutation({
  args: {
    applicationId: v.id('publicApplications'),
    status: v.union(v.literal('under_review'), v.literal('approved'), v.literal('rejected')),
    notes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await assertRole(ctx, 'admin')

    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new Error('Application not found')
    }

    // Validate state transitions
    if (args.status === 'rejected' && !args.rejectionReason) {
      throw new Error('Rejection reason is required')
    }

    await ctx.db.patch(args.applicationId, {
      status: args.status,
      reviewedBy: user._id,
      reviewedAt: Date.now(),
      reviewNotes: args.notes,
      rejectionReason: args.status === 'rejected' ? args.rejectionReason : undefined,
      updatedAt: Date.now(),
    })

    // Log moderation action
    await ctx.db.insert('moderationLogs', {
      adminId: user._id,
      action: args.status === 'rejected' ? 'application_rejected' : 'application_reviewed',
      targetType: 'application',
      targetId: args.applicationId,
      reason: args.status === 'rejected' ? args.rejectionReason : args.notes,
      metadata: {
        previousStatus: application.status,
        newStatus: args.status,
        applicationType: application.applicationType,
      },
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Convert an approved application to a vendor record
 */
export const convertToVendor = mutation({
  args: {
    applicationId: v.id('publicApplications'),
    autoApprove: v.optional(v.boolean()),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await assertRole(ctx, 'admin')

    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new Error('Application not found')
    }

    if (application.applicationType !== 'vendor') {
      throw new Error('This application is not for a vendor')
    }

    if (application.status === 'converted') {
      throw new Error('This application has already been converted')
    }

    // Create the vendor record
    const vendorId = await ctx.db.insert('vendors', {
      name: application.companyName,
      description: application.description,
      category: application.vendorCategory || 'other',
      services: application.vendorServices,
      location: application.vendorLocation,
      priceRange: application.vendorPriceRange,
      contactEmail: application.contactEmail,
      contactPhone: application.contactPhone,
      contactName: application.contactName,
      website: application.website,
      verified: false,
      status: args.autoApprove ? 'approved' : 'pending',
      applicationSource: 'form',
      applicationNotes: args.additionalNotes || application.additionalNotes,
      reviewedBy: args.autoApprove ? user._id : undefined,
      reviewedAt: args.autoApprove ? Date.now() : undefined,
      createdAt: Date.now(),
    })

    // Update the application as converted
    await ctx.db.patch(args.applicationId, {
      status: 'converted',
      convertedToId: vendorId,
      convertedAt: Date.now(),
      convertedBy: user._id,
      updatedAt: Date.now(),
    })

    // Log moderation action
    await ctx.db.insert('moderationLogs', {
      adminId: user._id,
      action: 'application_converted',
      targetType: 'application',
      targetId: args.applicationId,
      metadata: {
        applicationType: 'vendor',
        convertedToId: vendorId,
        autoApproved: args.autoApprove ?? false,
      },
      createdAt: Date.now(),
    })

    return { vendorId, autoApproved: args.autoApprove ?? false }
  },
})

/**
 * Convert an approved application to a sponsor record
 */
export const convertToSponsor = mutation({
  args: {
    applicationId: v.id('publicApplications'),
    autoApprove: v.optional(v.boolean()),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await assertRole(ctx, 'admin')

    const application = await ctx.db.get(args.applicationId)
    if (!application) {
      throw new Error('Application not found')
    }

    if (application.applicationType !== 'sponsor') {
      throw new Error('This application is not for a sponsor')
    }

    if (application.status === 'converted') {
      throw new Error('This application has already been converted')
    }

    // Create the sponsor record
    const sponsorId = await ctx.db.insert('sponsors', {
      name: application.companyName,
      description: application.description,
      industry: application.sponsorIndustry || 'other',
      sponsorshipTiers: application.sponsorTiers,
      budgetMin: application.sponsorBudgetMin,
      budgetMax: application.sponsorBudgetMax,
      targetEventTypes: application.sponsorTargetEventTypes,
      targetAudience: application.sponsorTargetAudience,
      contactEmail: application.contactEmail,
      contactName: application.contactName,
      contactPhone: application.contactPhone,
      website: application.website,
      verified: false,
      status: args.autoApprove ? 'approved' : 'pending',
      applicationSource: 'form',
      applicationNotes: args.additionalNotes || application.additionalNotes,
      reviewedBy: args.autoApprove ? user._id : undefined,
      reviewedAt: args.autoApprove ? Date.now() : undefined,
      createdAt: Date.now(),
    })

    // Update the application as converted
    await ctx.db.patch(args.applicationId, {
      status: 'converted',
      convertedToId: sponsorId,
      convertedAt: Date.now(),
      convertedBy: user._id,
      updatedAt: Date.now(),
    })

    // Log moderation action
    await ctx.db.insert('moderationLogs', {
      adminId: user._id,
      action: 'application_converted',
      targetType: 'application',
      targetId: args.applicationId,
      metadata: {
        applicationType: 'sponsor',
        convertedToId: sponsorId,
        autoApproved: args.autoApprove ?? false,
      },
      createdAt: Date.now(),
    })

    return { sponsorId, autoApproved: args.autoApprove ?? false }
  },
})

// ============================================================================
// Exports for form options
// ============================================================================

export const getFormOptions = query({
  args: {},
  handler: async () => {
    return {
      vendorCategories: VENDOR_CATEGORIES,
      sponsorIndustries: SPONSOR_INDUSTRIES,
      sponsorshipTiers: SPONSORSHIP_TIERS,
      priceRanges: PRICE_RANGES,
      referralSources: REFERRAL_SOURCES,
    }
  },
})
