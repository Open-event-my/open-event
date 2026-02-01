import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  // Include Convex Auth tables (authAccounts, authSessions, authRefreshTokens, etc.)
  ...authTables,
  // Users - Custom auth system
  users: defineTable({
    // Auth fields
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()), // Email verification status
    passwordHash: v.optional(v.string()), // For email/password auth
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // App-specific fields
    role: v.optional(v.union(v.literal('superadmin'), v.literal('admin'), v.literal('organizer'))),

    // Account status for moderation
    status: v.optional(v.union(v.literal('active'), v.literal('suspended'), v.literal('pending'))),

    // Suspension tracking
    suspendedAt: v.optional(v.number()),
    suspendedReason: v.optional(v.string()),
    suspendedBy: v.optional(v.id('users')),

    // Two-Factor Authentication (2FA)
    twoFactorEnabled: v.optional(v.boolean()), // Whether 2FA is enabled
    twoFactorSecret: v.optional(v.string()), // Encrypted TOTP secret
    twoFactorBackupCodes: v.optional(v.array(v.string())), // Hashed backup codes
    twoFactorVerifiedAt: v.optional(v.number()), // When 2FA was last verified

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('by_role', ['role'])
    .index('by_status', ['status']),

  // Sessions - Custom session management with refresh token rotation
  // Note: Old fields (token, expiresAt) kept optional for backward compatibility during migration
  sessions: defineTable({
    userId: v.id('users'),
    // New schema fields
    accessToken: v.optional(v.string()), // Short-lived access token (15 min)
    refreshToken: v.optional(v.string()), // Long-lived refresh token (7 days)
    accessTokenExpiresAt: v.optional(v.number()), // Unix timestamp
    refreshTokenExpiresAt: v.optional(v.number()), // Unix timestamp
    // Old schema fields (for backward compatibility during migration)
    token: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    // Common fields
    createdAt: v.number(),
    userAgent: v.optional(v.string()), // Browser/device info
    ipAddress: v.optional(v.string()), // Client IP for security
  })
    .index('by_access_token', ['accessToken'])
    .index('by_refresh_token', ['refreshToken'])
    .index('by_user', ['userId'])
    .index('by_token', ['token']), // Index for old token field

  // Verification Tokens - Email verification and password reset
  verificationTokens: defineTable({
    userId: v.id('users'),
    token: v.string(), // UUID token
    type: v.string(), // 'email_verification' or 'password_reset'
    expiresAt: v.number(), // Unix timestamp
    used: v.boolean(), // Whether token has been used
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user_type', ['userId', 'type'])
    .index('by_type_used', ['type', 'used']),

  // Organizer Profiles - Stores onboarding data for personalization
  organizerProfiles: defineTable({
    userId: v.id('users'),
    organizationName: v.optional(v.string()),
    role: v.optional(v.string()),
    organizationType: v.optional(v.string()), // company, nonprofit, government, community
    eventTypes: v.optional(v.array(v.string())), // Conferences, Hackathons, etc.
    eventScale: v.optional(v.string()), // small, medium, large, enterprise
    goals: v.optional(v.array(v.string())), // Find sponsors, Manage vendors, etc.
    experienceLevel: v.optional(v.string()), // first-time, 1-5, 5-20, 20+
    referralSource: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_user', ['userId']),

  // ============================================================================
  // Organizations & Teams - Multi-tenancy support
  // ============================================================================

  // Organizations - Company/team accounts
  organizations: defineTable({
    // Basic info
    name: v.string(),
    slug: v.string(), // Unique URL-friendly identifier (e.g., 'acme-corp')
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    website: v.optional(v.string()),

    // Owner (can transfer ownership)
    ownerId: v.id('users'),

    // Subscription/Plan
    plan: v.union(
      v.literal('free'), // Limited features
      v.literal('pro'), // Standard paid features
      v.literal('business'), // Advanced features
      v.literal('enterprise') // Custom features + support
    ),
    planExpiresAt: v.optional(v.number()), // When current plan expires
    maxMembers: v.number(), // Maximum team members allowed
    maxEvents: v.optional(v.number()), // Maximum events allowed (null = unlimited)

    // Settings
    settings: v.optional(
      v.object({
        defaultEventVisibility: v.optional(v.string()), // 'public' | 'private' | 'team'
        requireEventApproval: v.optional(v.boolean()), // Events need admin approval
        allowMemberInvites: v.optional(v.boolean()), // Can members invite others
        notifyOnNewMember: v.optional(v.boolean()),
        notifyOnNewEvent: v.optional(v.boolean()),
      })
    ),

    // Usage counters for atomic limit enforcement (prevents race conditions)
    activeEventCount: v.optional(v.number()), // Current count of active events
    pendingInvitationCount: v.optional(v.number()), // Current count of pending invitations

    // Billing info (for Stripe)
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(
      v.union(
        v.literal('active'),
        v.literal('past_due'),
        v.literal('canceled'),
        v.literal('trialing'),
        v.literal('incomplete'),
        v.literal('incomplete_expired'),
        v.literal('unpaid')
      )
    ),
    currentPeriodEnd: v.optional(v.number()), // Unix timestamp when subscription period ends

    // Status
    status: v.union(
      v.literal('active'),
      v.literal('suspended'),
      v.literal('pending') // Awaiting payment/verification
    ),

    // Suspension info (for admin moderation)
    suspendedAt: v.optional(v.number()),
    suspendedReason: v.optional(v.string()),
    suspendedBy: v.optional(v.id('users')),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_slug', ['slug'])
    .index('by_owner', ['ownerId'])
    .index('by_status', ['status'])
    .index('by_plan', ['plan'])
    .index('by_stripe_subscription', ['stripeSubscriptionId']),

  // Organization Members - Team membership
  organizationMembers: defineTable({
    organizationId: v.id('organizations'),
    userId: v.id('users'),

    // Role within the organization
    role: v.union(
      v.literal('owner'), // Full control, can delete org
      v.literal('admin'), // Manage members, settings
      v.literal('manager'), // Manage events, vendors, sponsors
      v.literal('member'), // View and participate
      v.literal('viewer') // Read-only access
    ),

    // Invitation tracking
    invitedBy: v.optional(v.id('users')),
    invitedAt: v.optional(v.number()),
    joinedAt: v.number(),

    // Status
    status: v.union(
      v.literal('active'),
      v.literal('invited'), // Pending acceptance
      v.literal('suspended') // Temporarily disabled
    ),

    // Custom permissions override (optional)
    customPermissions: v.optional(
      v.object({
        canCreateEvents: v.optional(v.boolean()),
        canManageVendors: v.optional(v.boolean()),
        canManageSponsors: v.optional(v.boolean()),
        canViewAnalytics: v.optional(v.boolean()),
        canManageBudget: v.optional(v.boolean()),
        canInviteMembers: v.optional(v.boolean()),
      })
    ),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_organization', ['organizationId'])
    .index('by_user', ['userId'])
    .index('by_org_user', ['organizationId', 'userId'])
    .index('by_status', ['status']),

  // Organization Invitations - Pending invites
  organizationInvitations: defineTable({
    organizationId: v.id('organizations'),

    // Invitee info (may not have account yet)
    email: v.string(),
    role: v.string(), // Role they'll have when they join

    // Invitation details
    invitedBy: v.id('users'),
    token: v.string(), // Unique token for accepting invite
    message: v.optional(v.string()), // Custom invite message

    // Status
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('expired'),
      v.literal('revoked')
    ),

    expiresAt: v.number(), // When invitation expires
    acceptedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index('by_organization', ['organizationId'])
    .index('by_email', ['email'])
    .index('by_token', ['token'])
    .index('by_status', ['status']),

  // Events - Full event management
  events: defineTable({
    organizerId: v.id('users'),
    // Organization support - events can belong to an org
    organizationId: v.optional(v.id('organizations')),
    title: v.string(),
    description: v.optional(v.string()),
    eventType: v.optional(v.string()), // Conference, Hackathon, Workshop, etc.

    // Date/Time
    startDate: v.number(), // Unix timestamp
    endDate: v.optional(v.number()),
    timezone: v.optional(v.string()),

    // Location
    locationType: v.optional(v.string()), // in-person, virtual, hybrid
    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    virtualPlatform: v.optional(v.string()),

    // Budget & Scale
    expectedAttendees: v.optional(v.number()),
    budget: v.optional(v.number()),
    budgetCurrency: v.optional(v.string()),

    // Status tracking
    status: v.string(), // draft, planning, active, completed, cancelled

    // Public directory visibility
    isPublic: v.optional(v.boolean()), // Show in public event directory
    publicVisibility: v.optional(
      v.object({
        showBudget: v.optional(v.boolean()),
        showAttendees: v.optional(v.boolean()),
        showVenue: v.optional(v.boolean()),
        showRequirements: v.optional(v.boolean()),
      })
    ),

    // What the organizer is looking for (for public directory)
    seekingVendors: v.optional(v.boolean()),
    seekingSponsors: v.optional(v.boolean()),
    vendorCategories: v.optional(v.array(v.string())), // Categories they need
    sponsorBenefits: v.optional(v.string()), // What sponsors get

    // Requirements for vendors
    requirements: v.optional(
      v.object({
        catering: v.optional(v.boolean()),
        av: v.optional(v.boolean()),
        photography: v.optional(v.boolean()),
        security: v.optional(v.boolean()),
        transportation: v.optional(v.boolean()),
        decoration: v.optional(v.boolean()),
        other: v.optional(v.array(v.string())),
      })
    ),

    // Moderation/Flagging fields
    flagged: v.optional(v.boolean()),
    flaggedAt: v.optional(v.number()),
    flaggedReason: v.optional(v.string()),
    flaggedSeverity: v.optional(v.union(v.literal('low'), v.literal('medium'), v.literal('high'))),
    flaggedBy: v.optional(v.id('users')),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_organizer', ['organizerId'])
    .index('by_organization', ['organizationId'])
    .index('by_org_status', ['organizationId', 'status'])
    .index('by_status', ['status'])
    .index('by_date', ['startDate'])
    .index('by_public', ['isPublic'])
    .index('by_flagged', ['flagged'])
    .index('by_flagged_severity', ['flagged', 'flaggedSeverity']),

  // Vendors - Service providers for events
  vendors: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // catering, av, photography, security, etc.
    services: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    priceRange: v.optional(v.string()), // budget, mid, premium
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactName: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    verified: v.boolean(),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),

    // Application/Review tracking
    applicationSource: v.optional(v.string()), // form, email, manual, import
    applicationNotes: v.optional(v.string()), // Admin notes during onboarding

    // Review workflow
    reviewedBy: v.optional(v.id('users')), // Admin who reviewed
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    reviewNotes: v.optional(v.string()), // Internal notes from reviewer

    // === ENTERPRISE FIELDS ===

    // Company Info
    companySize: v.optional(v.string()), // solo, small, medium, large
    yearFounded: v.optional(v.number()),
    headquarters: v.optional(v.string()),

    // Portfolio
    portfolio: v.optional(
      v.array(
        v.object({
          eventName: v.string(),
          year: v.number(),
          description: v.optional(v.string()),
          imageUrl: v.optional(v.string()),
        })
      )
    ),

    // Insurance & Legal
    insuranceInfo: v.optional(
      v.object({
        provider: v.optional(v.string()),
        policyNumber: v.optional(v.string()),
        coverageAmount: v.optional(v.number()),
        expirationDate: v.optional(v.number()),
        certificateUrl: v.optional(v.string()),
      })
    ),
    legalDocs: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          type: v.string(), // license, insurance, liability, other
          uploadedAt: v.number(),
        })
      )
    ),

    // Payment Terms
    paymentTerms: v.optional(
      v.object({
        acceptedMethods: v.optional(v.array(v.string())), // card, bank, cash, invoice
        requiresDeposit: v.optional(v.boolean()),
        depositPercentage: v.optional(v.number()),
        netDays: v.optional(v.number()), // NET 30, NET 60
        notes: v.optional(v.string()),
      })
    ),

    // Capacity
    capacity: v.optional(
      v.object({
        maxEventsPerMonth: v.optional(v.number()),
        teamSize: v.optional(v.number()),
        serviceArea: v.optional(v.string()), // local, regional, national, international
      })
    ),

    // Certifications
    certifications: v.optional(
      v.array(
        v.object({
          name: v.string(),
          issuingBody: v.optional(v.string()),
          expirationDate: v.optional(v.number()),
          certificateUrl: v.optional(v.string()),
        })
      )
    ),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_category', ['category']),

  // Sponsors - Companies looking to sponsor events
  sponsors: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    industry: v.string(), // tech, finance, healthcare, etc.
    sponsorshipTiers: v.optional(v.array(v.string())), // platinum, gold, silver, bronze
    budgetMin: v.optional(v.number()),
    budgetMax: v.optional(v.number()),
    targetEventTypes: v.optional(v.array(v.string())),
    targetAudience: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    verified: v.boolean(),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),

    // Application/Review tracking
    applicationSource: v.optional(v.string()), // form, email, manual, import
    applicationNotes: v.optional(v.string()), // Admin notes during onboarding

    // Review workflow
    reviewedBy: v.optional(v.id('users')), // Admin who reviewed
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    reviewNotes: v.optional(v.string()), // Internal notes from reviewer

    // === ENTERPRISE FIELDS ===

    // Company Info
    companySize: v.optional(v.string()), // startup, small, medium, large, enterprise
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
    deliverablesOffered: v.optional(v.array(v.string())), // Logo placement, Booth space, Speaking slot, etc.

    // Contracts & Legal
    contractTemplateUrl: v.optional(v.string()),
    legalDocs: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          type: v.string(), // insurance, liability, nda, other
          uploadedAt: v.number(),
        })
      )
    ),

    // Payment Terms
    paymentTerms: v.optional(
      v.object({
        preferredMethod: v.optional(v.string()), // wire, ach, card, invoice
        netDays: v.optional(v.number()), // NET 30, NET 60
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

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    // Semantic Search
    embedding: v.optional(v.array(v.float64())),
  })
    .index('by_status', ['status'])
    .index('by_industry', ['industry'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
    }),

  // Event-Vendor relationships with status tracking
  eventVendors: defineTable({
    eventId: v.id('events'),
    vendorId: v.id('vendors'),
    status: v.string(), // inquiry, negotiating, confirmed, declined, completed
    proposedBudget: v.optional(v.number()),
    finalBudget: v.optional(v.number()),
    notes: v.optional(v.string()),

    // Payout tracking (Middleman Model - Platform pays vendors)
    paymentStatus: v.optional(
      v.union(
        v.literal('not_due'), // Event not completed yet
        v.literal('pending'), // Due but not paid
        v.literal('approved'), // Approved for payout
        v.literal('processing'), // Payout in progress
        v.literal('paid'), // Vendor received payment
        v.literal('failed'), // Payout failed
        v.literal('disputed') // Payment disputed
      )
    ),
    payoutAmount: v.optional(v.number()), // Final amount to pay (may differ from finalBudget)
    payoutApprovedAt: v.optional(v.number()),
    payoutApprovedBy: v.optional(v.id('users')),
    payoutAt: v.optional(v.number()), // When payment was made
    payoutMethod: v.optional(v.string()), // 'bank_transfer', 'check', 'cash', 'stripe'
    payoutReference: v.optional(v.string()), // Transaction/check number
    stripeTransferId: v.optional(v.string()),
    ledgerEntryId: v.optional(v.id('paymentLedger')),

    // Invoice from vendor
    vendorInvoiceNumber: v.optional(v.string()),
    vendorInvoiceReceivedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_vendor', ['vendorId'])
    .index('by_status', ['status'])
    .index('by_payment_status', ['paymentStatus']),

  // Event-Sponsor relationships with tier and amount
  eventSponsors: defineTable({
    eventId: v.id('events'),
    sponsorId: v.id('sponsors'),
    tier: v.optional(v.string()), // platinum, gold, silver, bronze
    status: v.string(), // inquiry, negotiating, confirmed, declined
    amount: v.optional(v.number()),
    benefits: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),

    // Payment tracking (Middleman Model)
    paymentStatus: v.optional(
      v.union(
        v.literal('not_required'), // No payment needed (e.g., in-kind)
        v.literal('pending'), // Awaiting invoice/payment
        v.literal('invoice_sent'), // Invoice sent to sponsor
        v.literal('paid'), // Payment received
        v.literal('held'), // Payment held until event
        v.literal('released'), // Released after event
        v.literal('refunded'), // Payment refunded
        v.literal('failed') // Payment failed
      )
    ),
    invoiceSentAt: v.optional(v.number()),
    invoiceNumber: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    paidAmount: v.optional(v.number()), // Actual amount paid (may differ from `amount`)
    paymentMethod: v.optional(v.string()), // 'stripe', 'bank_transfer', 'check', 'cash'
    stripePaymentIntentId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
    ledgerEntryId: v.optional(v.id('paymentLedger')),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_sponsor', ['sponsorId'])
    .index('by_status', ['status'])
    .index('by_payment_status', ['paymentStatus']),

  // Event Applications - Vendors/Sponsors applying to events
  eventApplications: defineTable({
    eventId: v.id('events'),
    // Applicant type (vendor or sponsor from admin-managed entities)
    applicantType: v.union(v.literal('vendor'), v.literal('sponsor')),
    applicantId: v.string(), // ID of vendor or sponsor

    // Application status
    status: v.union(
      v.literal('pending'), // Awaiting organizer review
      v.literal('under_review'), // Organizer is reviewing
      v.literal('accepted'), // Accepted by organizer
      v.literal('rejected'), // Rejected by organizer
      v.literal('withdrawn') // Withdrawn by applicant (admin)
    ),

    // Application details
    message: v.optional(v.string()), // Cover letter/pitch
    proposedServices: v.optional(v.array(v.string())), // What they're offering
    proposedBudget: v.optional(v.number()), // Budget ask or offer
    proposedTier: v.optional(v.string()), // For sponsors: tier they want

    // Contact info for this application (may differ from main profile)
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),

    // Organizer response
    organizerNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    respondedAt: v.optional(v.number()),
    respondedBy: v.optional(v.id('users')),

    // Submitted by (admin who submitted on behalf of vendor/sponsor)
    submittedBy: v.optional(v.id('users')),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_applicant', ['applicantType', 'applicantId'])
    .index('by_status', ['status'])
    .index('by_event_status', ['eventId', 'status']),

  // Inquiries - General messaging between parties
  inquiries: defineTable({
    // Source of inquiry
    fromType: v.union(v.literal('organizer'), v.literal('admin')),
    fromUserId: v.id('users'),

    // Target of inquiry
    toType: v.union(v.literal('vendor'), v.literal('sponsor')),
    toId: v.string(), // Vendor or sponsor ID

    // Related event (optional)
    eventId: v.optional(v.id('events')),

    // Inquiry content
    subject: v.string(),
    message: v.string(),

    // Status tracking
    status: v.union(
      v.literal('sent'),
      v.literal('read'),
      v.literal('replied'),
      v.literal('closed')
    ),

    // Response (if any)
    response: v.optional(v.string()),
    respondedAt: v.optional(v.number()),

    // Admin internal notes
    adminNotes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_from', ['fromUserId'])
    .index('by_to', ['toType', 'toId'])
    .index('by_event', ['eventId'])
    .index('by_status', ['status'])
    .index('by_type_status', ['toType', 'status'])
    .index('by_createdAt', ['createdAt'])
    .searchIndex('search_content', {
      searchField: 'subject',
      filterFields: ['status', 'toType'],
    }),

  // Budget Items - Track event spending
  budgetItems: defineTable({
    eventId: v.id('events'),
    category: v.string(), // venue, catering, av, marketing, staffing, permits, misc
    name: v.string(),
    description: v.optional(v.string()),
    estimatedAmount: v.number(),
    actualAmount: v.optional(v.number()),
    status: v.union(
      v.literal('planned'), // Budget allocated but not spent
      v.literal('committed'), // Contract signed, committed to spend
      v.literal('paid'), // Payment made
      v.literal('cancelled') // Budget item cancelled
    ),
    // Vendor/sponsor association (optional)
    vendorId: v.optional(v.id('vendors')),
    sponsorId: v.optional(v.id('sponsors')),
    // Payment tracking
    paidAt: v.optional(v.number()),
    paidMethod: v.optional(v.string()), // card, bank, cash, invoice
    invoiceNumber: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    // Notes
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_category', ['category'])
    .index('by_status', ['status'])
    .index('by_event_category', ['eventId', 'category']),

  // Event Tasks - Checklist for event planning
  eventTasks: defineTable({
    eventId: v.id('events'),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()), // venue, vendors, marketing, logistics, etc.
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('urgent')
    ),
    status: v.union(
      v.literal('todo'),
      v.literal('in_progress'),
      v.literal('blocked'),
      v.literal('completed')
    ),
    // Due date tracking
    dueDate: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // Assignment (for future multi-user support)
    assignedTo: v.optional(v.id('users')),
    // Dependencies
    blockedBy: v.optional(v.array(v.id('eventTasks'))), // Tasks that must be done first
    // Linked entities
    linkedVendorId: v.optional(v.id('vendors')),
    linkedSponsorId: v.optional(v.id('sponsors')),
    linkedBudgetItemId: v.optional(v.id('budgetItems')),
    // Ordering for manual sorting
    sortOrder: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_status', ['status'])
    .index('by_priority', ['priority'])
    .index('by_due_date', ['dueDate'])
    .index('by_event_status', ['eventId', 'status'])
    .index('by_assigned', ['assignedTo']),

  // Moderation Logs - Audit trail for all admin actions
  moderationLogs: defineTable({
    // Who performed the action
    adminId: v.id('users'),

    // What action was performed
    action: v.union(
      // User moderation
      v.literal('user_suspended'),
      v.literal('user_unsuspended'),
      v.literal('user_role_changed'),
      // Admin management
      v.literal('admin_created'),
      v.literal('admin_removed'),
      // Vendor/sponsor moderation
      v.literal('vendor_approved'),
      v.literal('vendor_rejected'),
      v.literal('sponsor_approved'),
      v.literal('sponsor_rejected'),
      // Event moderation
      v.literal('event_flagged'),
      v.literal('event_unflagged'),
      v.literal('event_removed'),
      // Organization moderation
      v.literal('organization_suspended'),
      v.literal('organization_activated'),
      // Public applications
      v.literal('application_reviewed'),
      v.literal('application_converted'),
      v.literal('application_rejected')
    ),

    // Target of the action (polymorphic)
    targetType: v.union(
      v.literal('user'),
      v.literal('vendor'),
      v.literal('sponsor'),
      v.literal('event'),
      v.literal('application'),
      v.literal('organization')
    ),
    targetId: v.string(), // ID of the target entity

    // Additional context
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional action-specific data

    createdAt: v.number(),
  })
    .index('by_admin', ['adminId'])
    .index('by_target', ['targetType', 'targetId'])
    .index('by_action', ['action'])
    .index('by_date', ['createdAt']),

  // Admin Notifications - Notifications for admins about platform events
  adminNotifications: defineTable({
    // Notification type
    type: v.union(
      v.literal('security_alert'), // Failed logins, rate limits hit, suspicious activity
      v.literal('new_application'), // New vendor/sponsor application
      v.literal('flagged_content'), // Event flagged for review
      v.literal('user_report'), // User-submitted report
      v.literal('system_alert') // System errors, performance issues
    ),

    // Content
    title: v.string(),
    message: v.string(),
    severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),

    // Related entity (optional)
    targetType: v.optional(v.string()), // 'user' | 'event' | 'vendor' | 'sponsor' | 'application'
    targetId: v.optional(v.string()),

    // Status
    read: v.boolean(),
    readAt: v.optional(v.number()),
    readBy: v.optional(v.id('users')),

    // Email delivery
    emailSent: v.boolean(),
    emailSentAt: v.optional(v.number()),

    // Metadata
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_read', ['read'])
    .index('by_type', ['type'])
    .index('by_severity', ['severity'])
    .index('by_date', ['createdAt']),

  // Public Applications - Vendor/Sponsor applications from public forms (no auth required)
  publicApplications: defineTable({
    applicationType: v.union(v.literal('vendor'), v.literal('sponsor')),
    status: v.union(
      v.literal('submitted'),
      v.literal('under_review'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('converted')
    ),

    // Common fields
    companyName: v.string(),
    description: v.optional(v.string()),
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),

    // Vendor-specific fields
    vendorCategory: v.optional(v.string()),
    vendorServices: v.optional(v.array(v.string())),
    vendorLocation: v.optional(v.string()),
    vendorPriceRange: v.optional(v.string()),

    // Sponsor-specific fields
    sponsorIndustry: v.optional(v.string()),
    sponsorTiers: v.optional(v.array(v.string())),
    sponsorBudgetMin: v.optional(v.number()),
    sponsorBudgetMax: v.optional(v.number()),
    sponsorTargetEventTypes: v.optional(v.array(v.string())),
    sponsorTargetAudience: v.optional(v.string()),

    // Enterprise capture (collected during application)
    pastExperience: v.optional(v.string()), // Free text about their experience
    additionalNotes: v.optional(v.string()),
    referralSource: v.optional(v.string()), // How did they hear about us

    // Conversion tracking
    convertedToId: v.optional(v.string()), // ID of created vendor/sponsor
    convertedAt: v.optional(v.number()),
    convertedBy: v.optional(v.id('users')),

    // Review workflow
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_type', ['applicationType'])
    .index('by_type_status', ['applicationType', 'status'])
    .index('by_email', ['contactEmail']),

  // AI Usage Tracking - Rate limiting for AI agent prompts
  aiUsage: defineTable({
    userId: v.id('users'),
    // Daily usage tracking
    promptCount: v.number(), // Number of prompts used today
    lastResetDate: v.string(), // Date string (YYYY-MM-DD) for daily reset
    // Lifetime stats
    totalPrompts: v.optional(v.number()),
    // Plan limits (default 5 for free users)
    dailyLimit: v.optional(v.number()), // Override default limit (e.g., for premium)
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_user', ['userId']),

  // ============================================================================
  // PUBLIC API INFRASTRUCTURE
  // ============================================================================

  // API Keys - For external API access
  // Keys are stored as encrypted values for security (or hashed for legacy keys)
  apiKeys: defineTable({
    // Owner of this API key
    userId: v.id('users'),

    // Key metadata
    name: v.string(), // "My Production App", "Testing Key"
    description: v.optional(v.string()),

    // Security - Store encrypted key data (new approach)
    encryptedKey: v.optional(v.string()), // Encrypted API key ciphertext (base64)
    encryptionIV: v.optional(v.string()), // Initialization vector (base64)
    encryptionTag: v.optional(v.string()), // Authentication tag (base64)
    encryptionSalt: v.optional(v.string()), // Salt for key derivation (base64)

    // Legacy security - Hash-based storage (deprecated, for backward compatibility)
    keyHash: v.optional(v.string()), // SHA-256 hash of the full key (legacy)
    keyPrefix: v.string(), // First 8 chars for identification (e.g., "oe_live_")

    // Permissions - what this key can do
    permissions: v.array(v.string()), // ["events:read", "events:write", "vendors:read"]

    // Rate limiting
    rateLimit: v.optional(v.number()), // Custom rate limit (requests per hour), null = default

    // Status
    status: v.union(v.literal('active'), v.literal('revoked'), v.literal('expired')),

    // Usage tracking
    lastUsedAt: v.optional(v.number()),
    lastUsedIp: v.optional(v.string()),
    totalRequests: v.optional(v.number()),

    // Expiration (optional)
    expiresAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_key_prefix', ['keyPrefix'])
    .index('by_status', ['status']),

  // API Rate Limits - Track usage per API key per time window
  apiRateLimits: defineTable({
    // Which API key
    apiKeyId: v.id('apiKeys'),

    // Time window (hour bucket)
    windowStart: v.number(), // Unix timestamp of window start

    // Request count in this window
    requestCount: v.number(),

    // Last request timestamp
    lastRequestAt: v.number(),
  })
    .index('by_key', ['apiKeyId'])
    .index('by_key_window', ['apiKeyId', 'windowStart']),

  // API Request Logs - Audit trail for API requests (optional, for debugging)
  apiRequestLogs: defineTable({
    apiKeyId: v.id('apiKeys'),
    userId: v.id('users'),

    // Request details
    method: v.string(), // GET, POST, PATCH, DELETE
    path: v.string(), // /api/v1/events
    statusCode: v.number(), // 200, 400, 401, 429, etc.
    responseTimeMs: v.number(), // Response time in milliseconds

    // Request metadata
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),

    // Error info (if any)
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index('by_key', ['apiKeyId'])
    .index('by_user', ['userId'])
    .index('by_date', ['createdAt'])
    .index('by_status', ['statusCode']),

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  // Webhooks - User-registered webhook endpoints
  webhooks: defineTable({
    // Owner of this webhook
    userId: v.id('users'),

    // Webhook configuration
    name: v.string(), // "My App Webhook"
    url: v.string(), // https://example.com/webhook
    secret: v.string(), // Secret for signature verification (hashed)

    // Events to subscribe to
    events: v.array(v.string()), // ["event.created", "event.updated", "vendor.applied"]

    // Status
    status: v.union(
      v.literal('active'),
      v.literal('paused'),
      v.literal('disabled') // Auto-disabled after too many failures
    ),

    // Failure tracking
    failureCount: v.optional(v.number()), // Consecutive failures
    lastFailureAt: v.optional(v.number()),
    lastFailureReason: v.optional(v.string()),

    // Success tracking
    lastDeliveryAt: v.optional(v.number()),
    lastDeliveryStatus: v.optional(v.number()), // HTTP status code
    totalDeliveries: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // Webhook Deliveries - Log of webhook delivery attempts
  webhookDeliveries: defineTable({
    webhookId: v.id('webhooks'),
    userId: v.id('users'),

    // Event details
    eventType: v.string(), // "event.created"
    eventId: v.optional(v.string()), // ID of the related entity

    // Payload
    payload: v.string(), // JSON string of the webhook payload

    // Delivery status
    status: v.union(
      v.literal('pending'),
      v.literal('success'),
      v.literal('failed'),
      v.literal('retrying')
    ),

    // Response details
    statusCode: v.optional(v.number()), // HTTP response status
    responseBody: v.optional(v.string()), // First 1000 chars of response
    responseTimeMs: v.optional(v.number()),

    // Error info
    errorMessage: v.optional(v.string()),

    // Retry tracking
    attempts: v.number(), // Number of delivery attempts
    nextRetryAt: v.optional(v.number()), // When to retry next

    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index('by_webhook', ['webhookId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_date', ['createdAt']),

  // ============================================================================
  // ATTENDEE MANAGEMENT
  // ============================================================================

  // Attendees - Event attendee/participant tracking
  attendees: defineTable({
    eventId: v.id('events'),

    // Basic info
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),

    // Ticket info
    ticketType: v.optional(v.string()), // VIP, General, Early Bird, etc.
    ticketNumber: v.string(), // Unique ticket ID for QR codes

    // Status
    status: v.union(
      v.literal('registered'),
      v.literal('confirmed'),
      v.literal('checked_in'),
      v.literal('cancelled'),
      v.literal('no_show')
    ),

    // Check-in tracking
    checkedInAt: v.optional(v.number()),
    checkedInBy: v.optional(v.id('users')),
    checkInMethod: v.optional(v.string()), // 'qr_scan', 'manual', 'self_check_in'

    // Special requirements
    dietaryRestrictions: v.optional(v.string()),
    accessibilityNeeds: v.optional(v.string()),
    specialRequests: v.optional(v.string()),

    // Additional info
    organization: v.optional(v.string()), // Company/org they represent
    jobTitle: v.optional(v.string()),
    notes: v.optional(v.string()), // Internal notes

    // Registration source
    registrationSource: v.optional(v.string()), // 'manual', 'csv_import', 'form', 'api'

    // Payment reference (for future integration)
    paymentStatus: v.optional(v.string()), // 'paid', 'pending', 'refunded', 'free'
    paymentReference: v.optional(v.string()),

    // Metadata
    customFields: v.optional(v.any()), // For event-specific custom data

    registeredAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_email', ['email'])
    .index('by_event_email', ['eventId', 'email'])
    .index('by_ticket', ['ticketNumber'])
    .index('by_status', ['status'])
    .index('by_event_status', ['eventId', 'status']),

  // ============================================================================
  // TICKETING & PAYMENTS
  // ============================================================================

  // Ticket Types - Define ticket tiers for events
  ticketTypes: defineTable({
    eventId: v.id('events'),

    // Basic info
    name: v.string(), // "General Admission", "VIP", "Early Bird"
    description: v.optional(v.string()),

    // Pricing
    price: v.number(), // Price in cents (e.g., 1000 = $10.00)
    currency: v.string(), // "usd", "myr", etc.

    // Availability
    quantity: v.optional(v.number()), // Total available (null = unlimited)
    soldCount: v.number(), // Number sold
    reservedCount: v.optional(v.number()), // Reserved but not yet paid (prevents overselling)
    maxPerOrder: v.optional(v.number()), // Max tickets per order (default 10)

    // Sales window
    salesStartAt: v.optional(v.number()), // When tickets go on sale
    salesEndAt: v.optional(v.number()), // When sales close

    // Status
    isActive: v.boolean(),
    isHidden: v.boolean(), // Hidden from public but still purchasable via link

    // Display order
    sortOrder: v.number(),

    // Perks/benefits for this ticket type
    perks: v.optional(v.array(v.string())),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_event_active', ['eventId', 'isActive']),

  // Orders - Track ticket purchases
  orders: defineTable({
    eventId: v.id('events'),
    buyerEmail: v.string(),
    buyerName: v.string(),
    buyerPhone: v.optional(v.string()),

    // Order items (ticket types and quantities)
    items: v.array(
      v.object({
        ticketTypeId: v.id('ticketTypes'),
        ticketTypeName: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        subtotal: v.number(),
      })
    ),

    // Totals
    subtotal: v.number(), // Sum of items
    discount: v.optional(v.number()), // Promo code discount amount
    fees: v.number(), // Platform/processing fees
    total: v.number(), // Final amount charged
    currency: v.string(),

    // Promo code (if applied)
    promoCodeId: v.optional(v.id('promoCodes')),
    promoCodeCode: v.optional(v.string()), // Store the code for display

    // Payment info
    paymentStatus: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('refunded'),
      v.literal('cancelled')
    ),
    paymentMethod: v.optional(v.string()), // 'card', 'fpx', etc.

    // Stripe references
    stripePaymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),

    // Order metadata
    orderNumber: v.string(), // Human-readable order number (ORD-XXXXXX)
    notes: v.optional(v.string()),

    // Refund tracking
    refundId: v.optional(v.string()), // Stripe refund ID
    refundAmount: v.optional(v.number()), // Amount refunded (cents)
    refundReason: v.optional(v.string()),
    isPartialRefund: v.optional(v.boolean()),

    // Timestamps
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
    refundedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // For pending orders
  })
    .index('by_event', ['eventId'])
    .index('by_email', ['buyerEmail'])
    .index('by_order_number', ['orderNumber'])
    .index('by_stripe_session', ['stripeSessionId'])
    .index('by_stripe_intent', ['stripePaymentIntentId'])
    .index('by_status', ['paymentStatus'])
    .index('by_event_status', ['eventId', 'paymentStatus']),

  // Promo Codes - Discount codes for ticket purchases
  promoCodes: defineTable({
    eventId: v.optional(v.id('events')), // If null, applies to all events by this organizer
    organizerId: v.id('users'),

    // Code details
    code: v.string(), // The actual promo code (uppercase)
    description: v.optional(v.string()),

    // Discount type
    discountType: v.union(v.literal('percentage'), v.literal('fixed')),
    discountValue: v.number(), // Percentage (0-100) or fixed amount in cents

    // Usage limits
    maxUses: v.optional(v.number()), // Total uses allowed (null = unlimited)
    usedCount: v.number(), // Times used
    maxUsesPerEmail: v.optional(v.number()), // Per customer limit

    // Minimum requirements
    minOrderAmount: v.optional(v.number()), // Min order amount in cents

    // Validity period
    validFrom: v.optional(v.number()), // Unix timestamp
    validUntil: v.optional(v.number()), // Unix timestamp

    // Status
    isActive: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_organizer', ['organizerId'])
    .index('by_code', ['code'])
    .index('by_active', ['isActive']),

  // Webhook Events - Idempotency tracking for Stripe webhooks
  webhookEvents: defineTable({
    eventId: v.string(), // Stripe event ID
    eventType: v.string(), // checkout.session.completed, etc.
    processedAt: v.number(),
  }).index('by_event_id', ['eventId']),

  // Payment Idempotency - Prevent duplicate payment operations
  paymentIdempotency: defineTable({
    idempotencyKey: v.string(), // Unique key for the operation
    orderId: v.string(), // Order ID (stored as string for flexibility)
    operation: v.union(v.literal('checkout'), v.literal('refund'), v.literal('capture')),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    stripeIdempotencyKey: v.optional(v.string()), // Key sent to Stripe
    result: v.optional(v.string()), // JSON-serialized result for returning on duplicate requests
    errorMessage: v.optional(v.string()), // Error message if failed
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(), // TTL for cleanup (24 hours from creation)
  })
    .index('by_idempotency_key', ['idempotencyKey'])
    .index('by_order_operation', ['orderId', 'operation'])
    .index('by_expires_at', ['expiresAt']),

  // Notes - Playground notes and general event notes
  notes: defineTable({
    eventId: v.optional(v.id('events')), // Optional link to event
    organizerId: v.id('users'), // Note creator
    title: v.string(),
    content: v.string(), // Markdown content
    color: v.string(), // 'yellow' | 'purple' | 'green' | 'blue' | 'pink'
    tags: v.optional(v.array(v.string())), // Optional tags for organization
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_organizer', ['organizerId'])
    .index('by_event', ['eventId']),

  // Notification Preferences - User settings for notifications
  notificationPreferences: defineTable({
    userId: v.id('users'),

    // Email notification settings
    emailEnabled: v.boolean(), // Master switch for all email notifications
    emailVendorApplications: v.boolean(), // Vendor applications
    emailSponsorApplications: v.boolean(), // Sponsor applications
    emailEventReminders: v.boolean(), // Event reminders
    emailTaskDeadlines: v.boolean(), // Task deadlines
    emailBudgetAlerts: v.boolean(), // Budget threshold alerts

    // In-app notification settings
    inAppEnabled: v.boolean(), // Master switch for in-app notifications
    inAppVendorApplications: v.boolean(),
    inAppSponsorApplications: v.boolean(),
    inAppEventReminders: v.boolean(),
    inAppTaskDeadlines: v.boolean(),
    inAppBudgetAlerts: v.boolean(),

    // Timing preferences
    dailyDigest: v.boolean(), // Send daily summary instead of individual emails
    digestTime: v.optional(v.string()), // Time for daily digest (e.g., "09:00")

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_user', ['userId']),

  // Notifications - In-app and email notifications
  notifications: defineTable({
    userId: v.id('users'), // Recipient
    type: v.string(), // Notification type: 'event_reminder', 'task_deadline', 'vendor_application', etc.
    title: v.string(), // Notification title
    message: v.string(), // Notification message/body

    // Related entity references (optional)
    eventId: v.optional(v.id('events')),
    taskId: v.optional(v.id('tasks')),
    applicationId: v.optional(v.id('vendorApplications')),

    // Status tracking
    read: v.boolean(), // Whether notification has been read
    readAt: v.optional(v.number()), // When it was read

    // Delivery tracking
    emailSent: v.boolean(), // Whether email notification was sent
    emailSentAt: v.optional(v.number()),
    pushSent: v.boolean(), // Whether push notification was sent
    pushSentAt: v.optional(v.number()),

    // Optional action link
    actionUrl: v.optional(v.string()), // URL to navigate to when clicked
    actionLabel: v.optional(v.string()), // Label for action button

    createdAt: v.number(),
  })
    .index('by_user', ['userId', 'createdAt'])
    .index('by_user_read', ['userId', 'read', 'createdAt'])
    .index('by_type', ['type'])
    .index('by_date', ['createdAt']),

  // ============================================================================
  // Account Security
  // ============================================================================

  // Session Blacklist - Real-time session revocation
  // Provides immediate suspension blocking without waiting for token refresh
  sessionBlacklist: defineTable({
    userId: v.id('users'),
    invalidatedAt: v.number(), // Timestamp when sessions were invalidated
    reason: v.union(
      v.literal('password_change'),
      v.literal('admin_suspension'),
      v.literal('security_breach'),
      v.literal('user_logout_all'),
      v.literal('manual_admin_action')
    ),
    expiresAt: v.number(), // TTL - automatically cleanup after 7 days
  })
    .index('by_user', ['userId'])
    .index('by_expiry', ['expiresAt']),

  // CSRF Tokens - Cross-Site Request Forgery protection
  csrfTokens: defineTable({
    userId: v.string(), // User ID from auth identity
    token: v.string(), // Random token value
    expiresAt: v.number(), // Unix timestamp when token expires
    createdAt: v.number(), // Unix timestamp when token was created
  })
    .index('by_user', ['userId'])
    .index('by_user_token', ['userId', 'token'])
    .index('by_expiration', ['expiresAt']),

  // Tracks failed login attempts for account lockout
  failedLoginAttempts: defineTable({
    identifier: v.string(), // Email or IP address
    attempts: v.array(v.number()), // Timestamps of failed attempts
    lockedUntil: v.optional(v.number()), // Lockout expiry timestamp
    createdAt: v.number(),
  }).index('by_identifier', ['identifier']),

  // Global rate limiting - IP-based protection for all endpoints
  globalRateLimits: defineTable({
    identifier: v.string(), // IP address or combined IP:endpoint key
    type: v.string(), // 'auth' | 'api' | 'ai' | 'default'
    requestCount: v.number(), // Number of requests in current window
    windowStart: v.number(), // Start of current time window
    lastRequestAt: v.number(), // Timestamp of last request
  })
    .index('by_identifier', ['identifier'])
    .index('by_identifier_type', ['identifier', 'type'])
    .index('by_window', ['windowStart']),

  // Audit logs - Track all significant actions for security review
  auditLogs: defineTable({
    // Who performed the action
    userId: v.optional(v.id('users')), // Null for anonymous/system actions
    userEmail: v.optional(v.string()), // Captured at time of action

    // What action was performed
    action: v.string(), // 'login', 'logout', 'create_event', 'delete_user', etc.
    resource: v.string(), // 'user', 'event', 'vendor', 'sponsor', etc.
    resourceId: v.optional(v.string()), // ID of affected resource

    // Request context
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    endpoint: v.optional(v.string()), // API endpoint path

    // Additional details
    metadata: v.optional(v.any()), // Action-specific data
    status: v.union(v.literal('success'), v.literal('failure'), v.literal('blocked')),
    errorMessage: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index('by_user', ['userId', 'createdAt'])
    .index('by_action', ['action', 'createdAt'])
    .index('by_resource', ['resource', 'resourceId'])
    .index('by_date', ['createdAt'])
    .index('by_status', ['status', 'createdAt']),

  // ============================================================================
  // Platform Settings - Configuration managed by superadmins
  // ============================================================================

  platformSettings: defineTable({
    // Setting identification
    key: v.string(), // Unique setting key (e.g., 'ai.dailyLimit', 'registration.mode')
    category: v.string(), // Category for grouping (e.g., 'ai', 'registration', 'features')

    // Setting value (stored as JSON-compatible value)
    value: v.any(),
    valueType: v.union(
      v.literal('string'),
      v.literal('number'),
      v.literal('boolean'),
      v.literal('json')
    ),

    // Metadata
    label: v.string(), // Human-readable label
    description: v.optional(v.string()), // Explanation of the setting
    defaultValue: v.optional(v.any()), // Default value if not set

    // Audit trail
    lastModifiedBy: v.optional(v.id('users')),
    lastModifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_category', ['category']),

  // ============================================================================
  // Compliance - Terms of Service Acceptance
  // ============================================================================

  // Terms Acceptance - Track user acceptance of terms of service
  termsAcceptance: defineTable({
    userId: v.id('users'),
    version: v.string(), // Terms version (e.g., "1.0", "2024-01-15")
    acceptedAt: v.number(), // Unix timestamp when terms were accepted
    ipAddress: v.optional(v.string()), // IP address at time of acceptance
    userAgent: v.optional(v.string()), // Browser/device info
  })
    .index('by_user', ['userId'])
    .index('by_user_version', ['userId', 'version'])
    .index('by_version', ['version'])
    .index('by_date', ['acceptedAt']),

  // ============================================================================
  // Backup & Disaster Recovery
  // ============================================================================

  // Backups - Backup metadata and tracking
  backups: defineTable({
    backupId: v.string(), // Unique backup identifier
    timestamp: v.number(), // Unix timestamp when backup was created
    size: v.number(), // Backup size in bytes
    location: v.string(), // Storage location path
    checksum: v.string(), // SHA-256 checksum for integrity verification
    encrypted: v.boolean(), // Whether backup data is encrypted
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
    expiresAt: v.number(), // Unix timestamp when backup should be deleted
    errorMessage: v.optional(v.string()), // Error message if backup failed
  })
    .index('by_backup_id', ['backupId'])
    .index('by_status', ['status'])
    .index('by_timestamp', ['timestamp'])
    .index('by_expiration', ['expiresAt']),

  // Backup Verification - Track backup verification tests
  backupVerifications: defineTable({
    backupId: v.id('backups'),
    verifiedAt: v.number(), // Unix timestamp when verification was performed
    success: v.boolean(), // Whether verification succeeded
    errors: v.optional(v.array(v.string())), // List of errors if verification failed
    verificationMethod: v.optional(v.string()), // Method used for verification
    notes: v.optional(v.string()), // Additional notes about verification
  })
    .index('by_backup', ['backupId'])
    .index('by_date', ['verifiedAt'])
    .index('by_success', ['success']),

  // ============================================================================
  // SPONSOR ANALYTICS & ROI
  // ============================================================================

  // Sponsor Leads - Track leads captured by sponsors at events
  sponsorLeads: defineTable({
    eventId: v.id('events'),
    sponsorId: v.id('sponsors'),
    eventSponsorId: v.id('eventSponsors'), // Link to specific sponsorship

    // Lead info (captured from attendee or manual entry)
    attendeeId: v.optional(v.id('attendees')), // If linked to existing attendee
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),

    // Capture context
    captureMethod: v.union(
      v.literal('booth_scan'),
      v.literal('form'),
      v.literal('manual'),
      v.literal('badge_scan')
    ),
    captureLocation: v.optional(v.string()), // 'booth', 'session', 'networking'
    notes: v.optional(v.string()),

    // Lead qualification
    interestLevel: v.optional(v.union(v.literal('hot'), v.literal('warm'), v.literal('cold'))),
    followUpStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('contacted'),
        v.literal('converted'),
        v.literal('lost')
      )
    ),

    capturedAt: v.number(),
    capturedBy: v.optional(v.id('users')),
    updatedAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_sponsor', ['sponsorId'])
    .index('by_event_sponsor', ['eventSponsorId'])
    .index('by_email', ['email']),

  // Sponsor Reports - Auto-generated ROI reports for sponsors
  sponsorReports: defineTable({
    eventId: v.id('events'),
    sponsorId: v.id('sponsors'),
    eventSponsorId: v.id('eventSponsors'),

    // Report metadata
    reportType: v.union(v.literal('post_event'), v.literal('interim'), v.literal('custom')),
    generatedAt: v.number(),
    generatedBy: v.optional(v.id('users')), // null = auto-generated

    // Metrics snapshot
    metrics: v.object({
      // Investment
      sponsorshipAmount: v.number(),
      tier: v.string(),

      // Reach
      totalAttendees: v.number(),
      checkedInAttendees: v.number(),

      // Engagement
      leadsGenerated: v.number(),
      boothVisits: v.optional(v.number()),

      // Calculated ROI
      costPerLead: v.optional(v.number()),
      costPerAttendee: v.number(),
      estimatedImpressions: v.number(),
    }),

    // Report content
    summary: v.optional(v.string()), // AI-generated summary
    highlights: v.optional(v.array(v.string())),

    // Export tracking
    downloadedAt: v.optional(v.number()),
    sentToSponsorAt: v.optional(v.number()),
  })
    .index('by_event', ['eventId'])
    .index('by_sponsor', ['sponsorId'])
    .index('by_event_sponsor', ['eventSponsorId']),

  // ============================================================================
  // Payment System - Middleman Model
  // ============================================================================

  // Payment Ledger - Universal tracking for ALL money movement
  paymentLedger: defineTable({
    // Context
    eventId: v.id('events'),
    organizationId: v.optional(v.id('organizations')),

    // Transaction details
    type: v.union(
      v.literal('sponsor_payment'), // Money IN from sponsor
      v.literal('ticket_revenue'), // Money IN from tickets
      v.literal('vendor_payout'), // Money OUT to vendor
      v.literal('organizer_payout'), // Money OUT to organizer
      v.literal('commission'), // Platform commission
      v.literal('refund') // Money returned
    ),

    // Amounts (all in cents)
    grossAmount: v.number(), // Total amount
    platformFee: v.number(), // Platform commission
    netAmount: v.number(), // After platform fee
    currency: v.string(), // 'usd', 'myr', etc.

    // Status
    status: v.union(
      v.literal('pending'), // Awaiting payment
      v.literal('held'), // Payment received, held until event
      v.literal('released'), // Released after event completion
      v.literal('settled'), // Paid out to recipient
      v.literal('refunded'), // Money returned
      v.literal('failed') // Payment failed
    ),

    // References - Source (where money comes from)
    sourceType: v.optional(v.string()), // 'sponsor', 'attendee', 'organizer'
    sourceId: v.optional(v.string()), // sponsorId, attendeeId, etc.

    // References - Destination (where money goes)
    destinationType: v.optional(v.string()), // 'vendor', 'organizer', 'platform'
    destinationId: v.optional(v.string()),

    // Related records
    eventSponsorId: v.optional(v.id('eventSponsors')),
    eventVendorId: v.optional(v.id('eventVendors')),
    orderId: v.optional(v.id('orders')),

    // Stripe integration
    stripePaymentIntentId: v.optional(v.string()),
    stripeTransferId: v.optional(v.string()),
    stripeRefundId: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    heldAt: v.optional(v.number()),
    releasedAt: v.optional(v.number()),
    settledAt: v.optional(v.number()),

    // Metadata
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index('by_event', ['eventId'])
    .index('by_status', ['status'])
    .index('by_type', ['type'])
    .index('by_event_sponsor', ['eventSponsorId'])
    .index('by_event_vendor', ['eventVendorId'])
    .index('by_order', ['orderId']),

  // Event Settlements - Track settlement status for each event
  eventSettlements: defineTable({
    eventId: v.id('events'),
    organizationId: v.optional(v.id('organizations')),

    // Settlement status
    status: v.union(
      v.literal('pending'), // Event not completed yet
      v.literal('calculating'), // Calculating settlement amounts
      v.literal('ready'), // Ready to process payouts
      v.literal('processing'), // Payouts in progress
      v.literal('completed'), // All payouts completed
      v.literal('disputed'), // Issue raised, on hold
      v.literal('cancelled') // Event cancelled, refunds issued
    ),

    // Money IN totals
    totalSponsorRevenue: v.number(), // Sum of sponsor payments
    totalTicketRevenue: v.number(), // Sum of ticket sales
    totalOtherRevenue: v.optional(v.number()), // Other income
    totalRevenue: v.number(), // Grand total IN

    // Money OUT totals
    totalVendorPayouts: v.number(), // Sum of vendor payments
    totalOrganizerPayout: v.number(), // What organizer receives
    platformCommission: v.number(), // Your cut

    // Commission details
    commissionRate: v.number(), // Rate used (e.g., 0.10 for 10%)
    commissionConfigId: v.optional(v.id('commissionConfig')),

    // Counts
    sponsorPaymentsCount: v.optional(v.number()),
    vendorPayoutsCount: v.optional(v.number()),
    sponsorPaymentsPending: v.optional(v.number()),
    vendorPayoutsPending: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    calculatedAt: v.optional(v.number()),
    processingStartedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Audit
    calculatedBy: v.optional(v.id('users')),
    approvedBy: v.optional(v.id('users')),
    approvedAt: v.optional(v.number()),

    // Notes
    notes: v.optional(v.string()),
  })
    .index('by_event', ['eventId'])
    .index('by_status', ['status'])
    .index('by_organization', ['organizationId']),

  // Commission Configuration - Flexible commission rates
  commissionConfig: defineTable({
    name: v.string(), // Display name for this config
    description: v.optional(v.string()),

    // Type of commission config
    type: v.union(
      v.literal('global'), // Default rate for all
      v.literal('organization'), // Custom rate for specific org
      v.literal('event_type'), // Rate based on event type
      v.literal('tier') // Rate based on sponsorship tier
    ),

    // Commission rate
    rate: v.number(), // Decimal (0.10 = 10%)
    minAmount: v.optional(v.number()), // Minimum commission in cents
    maxAmount: v.optional(v.number()), // Maximum commission in cents

    // What this config applies to
    appliesTo: v.optional(v.string()), // orgId, event type, or tier name
    appliesToId: v.optional(v.id('organizations')),

    // Validity period
    activeFrom: v.number(),
    activeTo: v.optional(v.number()), // null = no end date

    // Status
    isActive: v.boolean(),

    // Audit
    createdAt: v.number(),
    createdBy: v.optional(v.id('users')),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id('users')),
  })
    .index('by_type', ['type'])
    .index('by_active', ['isActive'])
    .index('by_organization', ['appliesToId']),
})
