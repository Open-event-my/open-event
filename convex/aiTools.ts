import { v } from 'convex/values'
import { query } from './_generated/server'
import { getCurrentUser, isAdminRole } from './lib/auth'

/**
 * AI Tools for Vendor & Sponsor Management
 *
 * These queries provide structured data access for AI agents to:
 * 1. Search and filter vendors/sponsors
 * 2. Analyze matches for specific events
 * 3. Generate recommendations based on event requirements
 * 4. Aggregate statistics and insights
 */

// ============================================================================
// Vendor Search & Analysis
// ============================================================================

/**
 * Search vendors with flexible filtering criteria.
 * Designed for AI agents to find matching vendors for events.
 */
export const searchVendors = query({
  args: {
    // Filter criteria
    category: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    priceRange: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    status: v.optional(v.string()),

    // Search terms
    searchQuery: v.optional(v.string()),
    services: v.optional(v.array(v.string())),

    // Capacity filters
    minTeamSize: v.optional(v.number()),
    maxEventsPerMonth: v.optional(v.number()),
    serviceArea: v.optional(v.string()),

    // Insurance requirements
    requiresInsurance: v.optional(v.boolean()),
    minCoverageAmount: v.optional(v.number()),

    // Pagination
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return { vendors: [], total: 0 }

    // Start with all vendors
    let vendors = await ctx.db.query('vendors').collect()

    // Filter by status (default to approved for non-admins)
    if (args.status) {
      vendors = vendors.filter((v) => v.status === args.status)
    } else if (!isAdminRole(user.role)) {
      vendors = vendors.filter((v) => v.status === 'approved')
    }

    // Filter by category
    if (args.category) {
      vendors = vendors.filter((v) => v.category.toLowerCase() === args.category!.toLowerCase())
    }

    // Filter by multiple categories
    if (args.categories && args.categories.length > 0) {
      const lowerCategories = args.categories.map((c) => c.toLowerCase())
      vendors = vendors.filter((v) => lowerCategories.includes(v.category.toLowerCase()))
    }

    // Filter by location (partial match)
    if (args.location) {
      const locationLower = args.location.toLowerCase()
      vendors = vendors.filter(
        (v) =>
          v.location?.toLowerCase().includes(locationLower) ||
          v.headquarters?.toLowerCase().includes(locationLower)
      )
    }

    // Filter by price range
    if (args.priceRange) {
      vendors = vendors.filter((v) => v.priceRange === args.priceRange)
    }

    // Filter by verified status
    if (args.verified !== undefined) {
      vendors = vendors.filter((v) => v.verified === args.verified)
    }

    // Search by query (name, description, services)
    if (args.searchQuery) {
      const queryLower = args.searchQuery.toLowerCase()
      vendors = vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(queryLower) ||
          v.description?.toLowerCase().includes(queryLower) ||
          v.services?.some((s) => s.toLowerCase().includes(queryLower))
      )
    }

    // Filter by services offered
    if (args.services && args.services.length > 0) {
      const servicesLower = args.services.map((s) => s.toLowerCase())
      vendors = vendors.filter((v) =>
        v.services?.some((vs) => servicesLower.some((s) => vs.toLowerCase().includes(s)))
      )
    }

    // Filter by capacity
    if (args.minTeamSize) {
      vendors = vendors.filter((v) => (v.capacity?.teamSize ?? 0) >= args.minTeamSize!)
    }

    if (args.maxEventsPerMonth) {
      vendors = vendors.filter(
        (v) => (v.capacity?.maxEventsPerMonth ?? 999) >= args.maxEventsPerMonth!
      )
    }

    if (args.serviceArea) {
      vendors = vendors.filter((v) => v.capacity?.serviceArea === args.serviceArea)
    }

    // Filter by insurance requirements
    if (args.requiresInsurance) {
      vendors = vendors.filter((v) => v.insuranceInfo != null)
    }

    if (args.minCoverageAmount) {
      vendors = vendors.filter(
        (v) => (v.insuranceInfo?.coverageAmount ?? 0) >= args.minCoverageAmount!
      )
    }

    const total = vendors.length

    // Apply pagination
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0
    vendors = vendors.slice(offset, offset + limit)

    // Return structured response for AI consumption
    return {
      vendors: vendors.map((v) => ({
        id: v._id,
        name: v.name,
        category: v.category,
        description: v.description,
        services: v.services ?? [],
        location: v.location,
        priceRange: v.priceRange,
        rating: v.rating,
        reviewCount: v.reviewCount,
        verified: v.verified,
        status: v.status,
        // Capacity info
        teamSize: v.capacity?.teamSize,
        maxEventsPerMonth: v.capacity?.maxEventsPerMonth,
        serviceArea: v.capacity?.serviceArea,
        // Insurance info
        hasInsurance: v.insuranceInfo != null,
        insuranceCoverage: v.insuranceInfo?.coverageAmount,
        // Company info
        companySize: v.companySize,
        yearFounded: v.yearFounded,
        // Certifications count
        certificationCount: v.certifications?.length ?? 0,
        // Portfolio count
        portfolioCount: v.portfolio?.length ?? 0,
        // Contact
        contactEmail: v.contactEmail,
        website: v.website,
      })),
      total,
      limit,
      offset,
    }
  },
})

/**
 * Get detailed vendor profile for AI analysis.
 */
export const getVendorDetails = query({
  args: {
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const vendor = await ctx.db.get(args.vendorId)
    if (!vendor) return null

    // Non-admins can only see approved vendors
    if (!isAdminRole(user.role) && vendor.status !== 'approved') {
      return null
    }

    // Get event history
    const eventVendors = await ctx.db
      .query('eventVendors')
      .withIndex('by_vendor', (q) => q.eq('vendorId', args.vendorId))
      .collect()

    const eventHistory = await Promise.all(
      eventVendors.map(async (ev) => {
        const event = await ctx.db.get(ev.eventId)
        return {
          eventId: ev.eventId,
          eventTitle: event?.title,
          status: ev.status,
          proposedBudget: ev.proposedBudget,
          finalBudget: ev.finalBudget,
        }
      })
    )

    return {
      ...vendor,
      eventHistory,
      confirmedEvents: eventHistory.filter((e) => e.status === 'confirmed').length,
      totalEvents: eventHistory.length,
    }
  },
})

/**
 * Get vendor categories with counts for AI context.
 */
export const getVendorCategories = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const vendors = await ctx.db.query('vendors').collect()

    // Only count approved vendors for non-admins
    const filteredVendors = isAdminRole(user.role)
      ? vendors
      : vendors.filter((v) => v.status === 'approved')

    const categoryCounts = new Map<string, number>()
    for (const vendor of filteredVendors) {
      const count = categoryCounts.get(vendor.category) ?? 0
      categoryCounts.set(vendor.category, count + 1)
    }

    return Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  },
})

// ============================================================================
// Sponsor Search & Analysis
// ============================================================================

/**
 * Search sponsors with flexible filtering criteria.
 * Designed for AI agents to find matching sponsors for events.
 */
export const searchSponsors = query({
  args: {
    // Filter criteria
    industry: v.optional(v.string()),
    industries: v.optional(v.array(v.string())),
    verified: v.optional(v.boolean()),
    status: v.optional(v.string()),

    // Budget filters
    minBudget: v.optional(v.number()),
    maxBudget: v.optional(v.number()),

    // Tier filters
    tier: v.optional(v.string()),
    tiers: v.optional(v.array(v.string())),

    // Target event types
    targetEventTypes: v.optional(v.array(v.string())),

    // Search terms
    searchQuery: v.optional(v.string()),

    // Exclusivity preference
    requiresExclusivity: v.optional(v.boolean()),

    // Pagination
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return { sponsors: [], total: 0 }

    let sponsors = await ctx.db.query('sponsors').collect()

    // Filter by status
    if (args.status) {
      sponsors = sponsors.filter((s) => s.status === args.status)
    } else if (!isAdminRole(user.role)) {
      sponsors = sponsors.filter((s) => s.status === 'approved')
    }

    // Filter by industry
    if (args.industry) {
      sponsors = sponsors.filter((s) => s.industry.toLowerCase() === args.industry!.toLowerCase())
    }

    // Filter by multiple industries
    if (args.industries && args.industries.length > 0) {
      const lowerIndustries = args.industries.map((i) => i.toLowerCase())
      sponsors = sponsors.filter((s) => lowerIndustries.includes(s.industry.toLowerCase()))
    }

    // Filter by verified status
    if (args.verified !== undefined) {
      sponsors = sponsors.filter((s) => s.verified === args.verified)
    }

    // Filter by budget range
    if (args.minBudget !== undefined) {
      sponsors = sponsors.filter((s) => (s.budgetMax ?? 0) >= args.minBudget!)
    }

    if (args.maxBudget !== undefined) {
      sponsors = sponsors.filter((s) => (s.budgetMin ?? Infinity) <= args.maxBudget!)
    }

    // Filter by tier
    if (args.tier) {
      sponsors = sponsors.filter((s) => s.sponsorshipTiers?.includes(args.tier!))
    }

    if (args.tiers && args.tiers.length > 0) {
      sponsors = sponsors.filter((s) => s.sponsorshipTiers?.some((t) => args.tiers!.includes(t)))
    }

    // Filter by target event types
    if (args.targetEventTypes && args.targetEventTypes.length > 0) {
      sponsors = sponsors.filter((s) =>
        s.targetEventTypes?.some((t) =>
          args.targetEventTypes!.some((target) => t.toLowerCase().includes(target.toLowerCase()))
        )
      )
    }

    // Search query
    if (args.searchQuery) {
      const queryLower = args.searchQuery.toLowerCase()
      sponsors = sponsors.filter(
        (s) =>
          s.name.toLowerCase().includes(queryLower) ||
          s.description?.toLowerCase().includes(queryLower) ||
          s.industry.toLowerCase().includes(queryLower)
      )
    }

    // Exclusivity filter
    if (args.requiresExclusivity !== undefined) {
      sponsors = sponsors.filter(
        (s) =>
          (s.exclusivityRequirements?.requiresExclusivity ?? false) === args.requiresExclusivity
      )
    }

    const total = sponsors.length

    // Apply pagination
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0
    sponsors = sponsors.slice(offset, offset + limit)

    return {
      sponsors: sponsors.map((s) => ({
        id: s._id,
        name: s.name,
        industry: s.industry,
        description: s.description,
        sponsorshipTiers: s.sponsorshipTiers ?? [],
        budgetMin: s.budgetMin,
        budgetMax: s.budgetMax,
        targetEventTypes: s.targetEventTypes ?? [],
        targetAudience: s.targetAudience,
        verified: s.verified,
        status: s.status,
        // Company info
        companySize: s.companySize,
        yearFounded: s.yearFounded,
        // Exclusivity
        requiresExclusivity: s.exclusivityRequirements?.requiresExclusivity ?? false,
        // Past sponsorships count
        pastSponsorshipsCount: s.pastSponsorships?.length ?? 0,
        // Contact
        contactEmail: s.contactEmail,
        website: s.website,
      })),
      total,
      limit,
      offset,
    }
  },
})

/**
 * Get detailed sponsor profile for AI analysis.
 */
export const getSponsorDetails = query({
  args: {
    sponsorId: v.id('sponsors'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const sponsor = await ctx.db.get(args.sponsorId)
    if (!sponsor) return null

    if (!isAdminRole(user.role) && sponsor.status !== 'approved') {
      return null
    }

    // Get event history
    const eventSponsors = await ctx.db
      .query('eventSponsors')
      .withIndex('by_sponsor', (q) => q.eq('sponsorId', args.sponsorId))
      .collect()

    const eventHistory = await Promise.all(
      eventSponsors.map(async (es) => {
        const event = await ctx.db.get(es.eventId)
        return {
          eventId: es.eventId,
          eventTitle: event?.title,
          tier: es.tier,
          status: es.status,
          amount: es.amount,
        }
      })
    )

    return {
      ...sponsor,
      eventHistory,
      confirmedEvents: eventHistory.filter((e) => e.status === 'confirmed').length,
      totalEvents: eventHistory.length,
      totalSpent: eventHistory
        .filter((e) => e.status === 'confirmed')
        .reduce((sum, e) => sum + (e.amount ?? 0), 0),
    }
  },
})

/**
 * Get sponsor industries with counts for AI context.
 */
export const getSponsorIndustries = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const sponsors = await ctx.db.query('sponsors').collect()

    const filteredSponsors = isAdminRole(user.role)
      ? sponsors
      : sponsors.filter((s) => s.status === 'approved')

    const industryCounts = new Map<string, number>()
    for (const sponsor of filteredSponsors) {
      const count = industryCounts.get(sponsor.industry) ?? 0
      industryCounts.set(sponsor.industry, count + 1)
    }

    return Array.from(industryCounts.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
  },
})

// ============================================================================
// Event Matching & Recommendations
// ============================================================================

/**
 * Find vendors that match event requirements.
 * AI can use this to generate recommendations.
 */
export const matchVendorsToEvent = query({
  args: {
    eventId: v.id('events'),
    includeAlreadyAssigned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return { matches: [], event: null }

    const event = await ctx.db.get(args.eventId)
    if (!event) return { matches: [], event: null }

    // Check access
    if (event.organizerId !== user._id && !isAdminRole(user.role)) {
      return { matches: [], event: null }
    }

    // Get already assigned vendors
    const assignedVendorIds = new Set<string>()
    if (!args.includeAlreadyAssigned) {
      const eventVendors = await ctx.db
        .query('eventVendors')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect()
      for (const ev of eventVendors) {
        assignedVendorIds.add(ev.vendorId)
      }
    }

    // Get all approved vendors
    let vendors = await ctx.db
      .query('vendors')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()

    // Exclude already assigned
    if (!args.includeAlreadyAssigned) {
      vendors = vendors.filter((v) => !assignedVendorIds.has(v._id))
    }

    // Score each vendor based on requirements match
    const matches = vendors.map((vendor) => {
      let score = 0
      const matchReasons: string[] = []

      // Check vendor categories against event requirements
      if (event.requirements) {
        const categoryMap: Record<string, string> = {
          catering: 'catering',
          av: 'av',
          photography: 'photography',
          security: 'security',
          transportation: 'transportation',
          decoration: 'decoration',
        }

        for (const [requirement, category] of Object.entries(categoryMap)) {
          if (event.requirements[requirement as keyof typeof event.requirements]) {
            if (vendor.category.toLowerCase().includes(category)) {
              score += 20
              matchReasons.push(`Matches ${requirement} requirement`)
            }
          }
        }
      }

      // Check vendor categories requested
      if (event.vendorCategories) {
        for (const category of event.vendorCategories) {
          if (vendor.category.toLowerCase().includes(category.toLowerCase())) {
            score += 15
            matchReasons.push(`Matches requested category: ${category}`)
          }
          if (vendor.services?.some((s) => s.toLowerCase().includes(category.toLowerCase()))) {
            score += 10
            matchReasons.push(`Offers service: ${category}`)
          }
        }
      }

      // Boost for verified vendors
      if (vendor.verified) {
        score += 10
        matchReasons.push('Verified vendor')
      }

      // Boost for high-rated vendors
      if (vendor.rating && vendor.rating >= 4.5) {
        score += 10
        matchReasons.push(`High rating: ${vendor.rating}`)
      }

      // Boost for vendors with insurance (enterprise events)
      if (vendor.insuranceInfo) {
        score += 5
        matchReasons.push('Has insurance')
      }

      // Boost for vendors with portfolio
      if (vendor.portfolio && vendor.portfolio.length > 0) {
        score += 5
        matchReasons.push(`Has ${vendor.portfolio.length} portfolio items`)
      }

      return {
        vendor: {
          id: vendor._id,
          name: vendor.name,
          category: vendor.category,
          services: vendor.services ?? [],
          priceRange: vendor.priceRange,
          rating: vendor.rating,
          verified: vendor.verified,
        },
        score,
        matchReasons,
      }
    })

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score)

    return {
      matches: matches.filter((m) => m.score > 0).slice(0, 20),
      event: {
        id: event._id,
        title: event.title,
        requirements: event.requirements,
        vendorCategories: event.vendorCategories,
        expectedAttendees: event.expectedAttendees,
        budget: event.budget,
      },
    }
  },
})

/**
 * Find sponsors that match event profile.
 * AI can use this to generate sponsorship recommendations.
 */
export const matchSponsorsToEvent = query({
  args: {
    eventId: v.id('events'),
    includeAlreadyAssigned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return { matches: [], event: null }

    const event = await ctx.db.get(args.eventId)
    if (!event) return { matches: [], event: null }

    // Check access
    if (event.organizerId !== user._id && !isAdminRole(user.role)) {
      return { matches: [], event: null }
    }

    // Get already assigned sponsors
    const assignedSponsorIds = new Set<string>()
    if (!args.includeAlreadyAssigned) {
      const eventSponsors = await ctx.db
        .query('eventSponsors')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect()
      for (const es of eventSponsors) {
        assignedSponsorIds.add(es.sponsorId)
      }
    }

    // Get all approved sponsors
    let sponsors = await ctx.db
      .query('sponsors')
      .withIndex('by_status', (q) => q.eq('status', 'approved'))
      .collect()

    // Exclude already assigned
    if (!args.includeAlreadyAssigned) {
      sponsors = sponsors.filter((s) => !assignedSponsorIds.has(s._id))
    }

    // Score each sponsor
    const matches = sponsors.map((sponsor) => {
      let score = 0
      const matchReasons: string[] = []

      // Check target event types
      if (sponsor.targetEventTypes && event.eventType) {
        for (const targetType of sponsor.targetEventTypes) {
          if (
            targetType.toLowerCase().includes(event.eventType.toLowerCase()) ||
            event.eventType.toLowerCase().includes(targetType.toLowerCase())
          ) {
            score += 25
            matchReasons.push(`Targets ${event.eventType} events`)
            break
          }
        }
      }

      // Check budget alignment
      if (sponsor.budgetMin !== undefined && sponsor.budgetMax !== undefined) {
        // Sponsor has budget range defined
        score += 10
        matchReasons.push(
          `Budget range: $${sponsor.budgetMin.toLocaleString()} - $${sponsor.budgetMax.toLocaleString()}`
        )
      }

      // Boost for verified sponsors
      if (sponsor.verified) {
        score += 10
        matchReasons.push('Verified sponsor')
      }

      // Boost for sponsors with past experience
      if (sponsor.pastSponsorships && sponsor.pastSponsorships.length > 0) {
        score += 5 + Math.min(sponsor.pastSponsorships.length * 2, 10)
        matchReasons.push(`${sponsor.pastSponsorships.length} past sponsorships`)
      }

      // Boost for sponsors with clear deliverables
      if (sponsor.deliverablesOffered && sponsor.deliverablesOffered.length > 0) {
        score += 5
        matchReasons.push(`Offers: ${sponsor.deliverablesOffered.slice(0, 3).join(', ')}`)
      }

      return {
        sponsor: {
          id: sponsor._id,
          name: sponsor.name,
          industry: sponsor.industry,
          sponsorshipTiers: sponsor.sponsorshipTiers ?? [],
          budgetMin: sponsor.budgetMin,
          budgetMax: sponsor.budgetMax,
          verified: sponsor.verified,
        },
        score,
        matchReasons,
      }
    })

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score)

    return {
      matches: matches.filter((m) => m.score > 0).slice(0, 20),
      event: {
        id: event._id,
        title: event.title,
        eventType: event.eventType,
        expectedAttendees: event.expectedAttendees,
        budget: event.budget,
      },
    }
  },
})

// ============================================================================
// Aggregated Statistics for AI Context
// ============================================================================

/**
 * Get platform-wide vendor/sponsor statistics.
 * Useful for AI to understand marketplace health.
 */
export const getMarketplaceStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user || !isAdminRole(user.role)) return null

    const [vendors, sponsors, events, applications] = await Promise.all([
      ctx.db.query('vendors').collect(),
      ctx.db.query('sponsors').collect(),
      ctx.db.query('events').collect(),
      ctx.db.query('publicApplications').collect(),
    ])

    return {
      vendors: {
        total: vendors.length,
        approved: vendors.filter((v) => v.status === 'approved').length,
        pending: vendors.filter((v) => v.status === 'pending').length,
        verified: vendors.filter((v) => v.verified).length,
        withInsurance: vendors.filter((v) => v.insuranceInfo != null).length,
        byCategoryTop5: Object.entries(
          vendors.reduce(
            (acc, v) => {
              acc[v.category] = (acc[v.category] ?? 0) + 1
              return acc
            },
            {} as Record<string, number>
          )
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([category, count]) => ({ category, count })),
      },
      sponsors: {
        total: sponsors.length,
        approved: sponsors.filter((s) => s.status === 'approved').length,
        pending: sponsors.filter((s) => s.status === 'pending').length,
        verified: sponsors.filter((s) => s.verified).length,
        byIndustryTop5: Object.entries(
          sponsors.reduce(
            (acc, s) => {
              acc[s.industry] = (acc[s.industry] ?? 0) + 1
              return acc
            },
            {} as Record<string, number>
          )
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([industry, count]) => ({ industry, count })),
      },
      events: {
        total: events.length,
        active: events.filter((e) => e.status === 'active').length,
        seekingVendors: events.filter((e) => e.seekingVendors).length,
        seekingSponsors: events.filter((e) => e.seekingSponsors).length,
        public: events.filter((e) => e.isPublic).length,
      },
      applications: {
        total: applications.length,
        submitted: applications.filter((a) => a.status === 'submitted').length,
        underReview: applications.filter((a) => a.status === 'under_review').length,
        approved: applications.filter((a) => a.status === 'approved').length,
        converted: applications.filter((a) => a.status === 'converted').length,
        vendors: applications.filter((a) => a.applicationType === 'vendor').length,
        sponsors: applications.filter((a) => a.applicationType === 'sponsor').length,
      },
    }
  },
})

/**
 * Get event-specific context for AI recommendations.
 */
export const getEventContext = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const event = await ctx.db.get(args.eventId)
    if (!event) return null

    // Check access
    if (event.organizerId !== user._id && !isAdminRole(user.role)) {
      return null
    }

    // Get assigned vendors and sponsors
    const [eventVendors, eventSponsors, budgetItems, tasks] = await Promise.all([
      ctx.db
        .query('eventVendors')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect(),
      ctx.db
        .query('eventSponsors')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect(),
      ctx.db
        .query('budgetItems')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect(),
      ctx.db
        .query('eventTasks')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
        .collect(),
    ])

    // Get vendor/sponsor details
    const vendorDetails = await Promise.all(
      eventVendors.map(async (ev) => {
        const vendor = await ctx.db.get(ev.vendorId)
        return {
          vendorId: ev.vendorId,
          name: vendor?.name,
          category: vendor?.category,
          status: ev.status,
          proposedBudget: ev.proposedBudget,
          finalBudget: ev.finalBudget,
        }
      })
    )

    const sponsorDetails = await Promise.all(
      eventSponsors.map(async (es) => {
        const sponsor = await ctx.db.get(es.sponsorId)
        return {
          sponsorId: es.sponsorId,
          name: sponsor?.name,
          industry: sponsor?.industry,
          tier: es.tier,
          status: es.status,
          amount: es.amount,
        }
      })
    )

    // Calculate budget summary
    const budgetSummary = {
      estimated: budgetItems.reduce((sum, item) => sum + item.estimatedAmount, 0),
      actual: budgetItems.reduce((sum, item) => sum + (item.actualAmount ?? 0), 0),
      committed: budgetItems
        .filter((i) => i.status === 'committed')
        .reduce((sum, item) => sum + item.estimatedAmount, 0),
      paid: budgetItems
        .filter((i) => i.status === 'paid')
        .reduce((sum, item) => sum + (item.actualAmount ?? item.estimatedAmount), 0),
    }

    // Task summary
    const taskSummary = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      overdue: tasks.filter((t) => t.dueDate && t.dueDate < Date.now() && t.status !== 'completed')
        .length,
    }

    return {
      event: {
        id: event._id,
        title: event.title,
        description: event.description,
        eventType: event.eventType,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        locationType: event.locationType,
        venueName: event.venueName,
        expectedAttendees: event.expectedAttendees,
        budget: event.budget,
        requirements: event.requirements,
        seekingVendors: event.seekingVendors,
        seekingSponsors: event.seekingSponsors,
        vendorCategories: event.vendorCategories,
      },
      vendors: {
        total: vendorDetails.length,
        confirmed: vendorDetails.filter((v) => v.status === 'confirmed').length,
        list: vendorDetails,
      },
      sponsors: {
        total: sponsorDetails.length,
        confirmed: sponsorDetails.filter((s) => s.status === 'confirmed').length,
        totalAmount: sponsorDetails.reduce((sum, s) => sum + (s.amount ?? 0), 0),
        list: sponsorDetails,
      },
      budget: budgetSummary,
      tasks: taskSummary,
    }
  },
})
