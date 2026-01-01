/**
 * Organizations Module
 *
 * Handles organization management for multi-tenancy support.
 * Includes CRUD operations for organizations, members, and invitations.
 */

import { v } from 'convex/values'
import { mutation, query, internalQuery, internalMutation } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { getCurrentUser, assertRole } from './lib/auth'
import { AppError, ErrorCodes } from './lib/errors'

// ============================================================================
// Types
// ============================================================================

type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'
type OrganizationPlan = 'free' | 'pro' | 'business' | 'enterprise'

const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
}

const PLAN_LIMITS: Record<OrganizationPlan, { maxMembers: number; maxEvents: number | undefined }> =
  {
    free: { maxMembers: 5, maxEvents: 3 },
    pro: { maxMembers: 20, maxEvents: 20 },
    business: { maxMembers: 100, maxEvents: undefined },
    enterprise: { maxMembers: 1000, maxEvents: undefined },
  }

/**
 * Require the current user or throw an error
 */
async function requireUser(ctx: Parameters<typeof getCurrentUser>[0]): Promise<Doc<'users'>> {
  const user = await getCurrentUser(ctx)
  if (!user) {
    throw new AppError('Authentication required', ErrorCodes.UNAUTHORIZED, 401)
  }
  return user
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

/**
 * Check if a user has sufficient role permissions
 */
function hasRolePermission(userRole: OrganizationRole, requiredRole: OrganizationRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// ============================================================================
// Organization Queries
// ============================================================================

/**
 * Get an organization by ID
 */
export const get = query({
  args: { id: v.id('organizations') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

/**
 * Get an organization by slug
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()
  },
})

/**
 * List organizations for the current user
 */
export const listMyOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    // Get all memberships for this user
    const memberships = await ctx.db
      .query('organizationMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    // Fetch organization details for each membership
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId)
        return org ? { ...org, memberRole: membership.role } : null
      })
    )

    return organizations.filter(Boolean)
  },
})

/**
 * Get organization members
 */
export const listMembers = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    // Check if user is a member
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .first()

    if (!membership || membership.status !== 'active') {
      return []
    }

    // Get all active members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    // Fetch user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const memberUser = await ctx.db.get(member.userId)
        return {
          ...member,
          user: memberUser
            ? {
                id: memberUser._id,
                name: memberUser.name,
                email: memberUser.email,
                image: memberUser.image,
              }
            : null,
        }
      })
    )

    return membersWithDetails.filter((m) => m.user !== null)
  },
})

/**
 * Get pending invitations for an organization
 */
export const listInvitations = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    // Check if user is an admin or owner
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .first()

    if (!membership || !hasRolePermission(membership.role as OrganizationRole, 'admin')) {
      return []
    }

    // Get pending invitations
    return ctx.db
      .query('organizationInvitations')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect()
  },
})

/**
 * Get user's membership for a specific organization
 */
export const getMembership = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    return ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .first()
  },
})

// ============================================================================
// Organization Mutations
// ============================================================================

/**
 * Create a new organization
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    plan: v.optional(
      v.union(v.literal('free'), v.literal('pro'), v.literal('business'), v.literal('enterprise'))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    // Generate unique slug
    let slug = generateSlug(args.name)
    let suffix = 0
    let existingOrg = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first()

    while (existingOrg) {
      suffix++
      slug = `${generateSlug(args.name)}-${suffix}`
      existingOrg = await ctx.db
        .query('organizations')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .first()
    }

    const plan = (args.plan || 'free') as OrganizationPlan
    const limits = PLAN_LIMITS[plan]
    const now = Date.now()

    // Create the organization
    const organizationId = await ctx.db.insert('organizations', {
      name: args.name,
      slug,
      description: args.description,
      logoUrl: args.logoUrl,
      website: args.website,
      ownerId: user._id,
      plan,
      maxMembers: limits.maxMembers,
      maxEvents: limits.maxEvents,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    // Add creator as owner member
    await ctx.db.insert('organizationMembers', {
      organizationId,
      userId: user._id,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      createdAt: now,
    })

    return { organizationId, slug }
  },
})

/**
 * Update an organization
 */
export const update = mutation({
  args: {
    id: v.id('organizations'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    settings: v.optional(
      v.object({
        defaultEventVisibility: v.optional(v.string()),
        requireEventApproval: v.optional(v.boolean()),
        allowMemberInvites: v.optional(v.boolean()),
        notifyOnNewMember: v.optional(v.boolean()),
        notifyOnNewEvent: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    // Check if user is admin or owner
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) => q.eq('organizationId', args.id).eq('userId', user._id))
      .first()

    if (!membership || !hasRolePermission(membership.role as OrganizationRole, 'admin')) {
      throw new Error('Not authorized to update this organization')
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl
    if (args.website !== undefined) updates.website = args.website
    if (args.settings !== undefined) updates.settings = args.settings

    await ctx.db.patch(args.id, updates)

    return { success: true }
  },
})

/**
 * Delete an organization (owner only)
 */
export const deleteOrg = mutation({
  args: { id: v.id('organizations') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const org = await ctx.db.get(args.id)
    if (!org) {
      throw new Error('Organization not found')
    }

    // Only owner can delete
    if (org.ownerId !== user._id) {
      throw new Error('Only the owner can delete this organization')
    }

    // Delete all members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.id))
      .collect()

    for (const member of members) {
      await ctx.db.delete(member._id)
    }

    // Delete all invitations
    const invitations = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.id))
      .collect()

    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id)
    }

    // Delete the organization
    await ctx.db.delete(args.id)

    return { success: true }
  },
})

// ============================================================================
// Member Management
// ============================================================================

/**
 * Invite a user to an organization
 */
export const inviteMember = mutation({
  args: {
    organizationId: v.id('organizations'),
    email: v.string(),
    role: v.union(
      v.literal('admin'),
      v.literal('manager'),
      v.literal('member'),
      v.literal('viewer')
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    // Check if user can invite (admin or owner)
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .first()

    if (!membership || !hasRolePermission(membership.role as OrganizationRole, 'admin')) {
      throw new Error('Not authorized to invite members')
    }

    // Check organization member limits
    const org = await ctx.db.get(args.organizationId)
    if (!org) throw new Error('Organization not found')

    const currentMembers = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    if (currentMembers.length >= org.maxMembers) {
      throw new Error(`Organization has reached maximum members (${org.maxMembers})`)
    }

    // Check if invitation already exists
    const existingInvitation = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .filter((q) =>
        q.and(
          q.eq(q.field('organizationId'), args.organizationId),
          q.eq(q.field('status'), 'pending')
        )
      )
      .first()

    if (existingInvitation) {
      throw new Error('An invitation already exists for this email')
    }

    // Check if user is already a member
    const existingUser = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email.toLowerCase()))
      .first()

    if (existingUser) {
      const existingMembership = await ctx.db
        .query('organizationMembers')
        .withIndex('by_org_user', (q) =>
          q.eq('organizationId', args.organizationId).eq('userId', existingUser._id)
        )
        .first()

      if (existingMembership && existingMembership.status === 'active') {
        throw new Error('User is already a member of this organization')
      }
    }

    // Generate invitation token
    const token = crypto.randomUUID()
    const now = Date.now()
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000 // 7 days

    await ctx.db.insert('organizationInvitations', {
      organizationId: args.organizationId,
      email: args.email.toLowerCase(),
      role: args.role,
      invitedBy: user._id,
      token,
      message: args.message,
      status: 'pending',
      expiresAt,
      createdAt: now,
    })

    return { success: true, token }
  },
})

/**
 * Accept an invitation
 */
export const acceptInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const invitation = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid')
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: 'expired' })
      throw new Error('Invitation has expired')
    }

    // Verify email matches
    if (invitation.email !== user.email?.toLowerCase()) {
      throw new Error('This invitation was sent to a different email address')
    }

    const now = Date.now()

    // Create membership
    await ctx.db.insert('organizationMembers', {
      organizationId: invitation.organizationId,
      userId: user._id,
      role: invitation.role as OrganizationRole,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
      joinedAt: now,
      status: 'active',
      createdAt: now,
    })

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: 'accepted',
      acceptedAt: now,
    })

    return { success: true, organizationId: invitation.organizationId }
  },
})

/**
 * Revoke an invitation
 */
export const revokeInvitation = mutation({
  args: { invitationId: v.id('organizationInvitations') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation) {
      throw new Error('Invitation not found')
    }

    // Check if user can revoke (admin or owner)
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', invitation.organizationId).eq('userId', user._id)
      )
      .first()

    if (!membership || !hasRolePermission(membership.role as OrganizationRole, 'admin')) {
      throw new Error('Not authorized to revoke invitations')
    }

    await ctx.db.patch(args.invitationId, { status: 'revoked' })

    return { success: true }
  },
})

/**
 * Update a member's role
 */
export const updateMemberRole = mutation({
  args: {
    memberId: v.id('organizationMembers'),
    role: v.union(
      v.literal('admin'),
      v.literal('manager'),
      v.literal('member'),
      v.literal('viewer')
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const targetMember = await ctx.db.get(args.memberId)
    if (!targetMember) {
      throw new Error('Member not found')
    }

    // Check if user is admin or owner
    const userMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', targetMember.organizationId).eq('userId', user._id)
      )
      .first()

    if (!userMembership || !hasRolePermission(userMembership.role as OrganizationRole, 'admin')) {
      throw new Error('Not authorized to update member roles')
    }

    // Cannot change owner role
    if (targetMember.role === 'owner') {
      throw new Error('Cannot change the owner role. Transfer ownership instead.')
    }

    // Note: The type system already prevents promoting to owner
    // since 'owner' is not in the args.role union type

    await ctx.db.patch(args.memberId, {
      role: args.role,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Remove a member from an organization
 */
export const removeMember = mutation({
  args: { memberId: v.id('organizationMembers') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const targetMember = await ctx.db.get(args.memberId)
    if (!targetMember) {
      throw new Error('Member not found')
    }

    // Check if user is admin or owner, or removing themselves
    const userMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', targetMember.organizationId).eq('userId', user._id)
      )
      .first()

    const isSelf = targetMember.userId === user._id
    const isAuthorized =
      userMembership && hasRolePermission(userMembership.role as OrganizationRole, 'admin')

    if (!isSelf && !isAuthorized) {
      throw new Error('Not authorized to remove this member')
    }

    // Cannot remove owner
    if (targetMember.role === 'owner') {
      throw new Error('Cannot remove the owner. Transfer ownership first.')
    }

    await ctx.db.delete(args.memberId)

    return { success: true }
  },
})

/**
 * Transfer organization ownership
 */
export const transferOwnership = mutation({
  args: {
    organizationId: v.id('organizations'),
    newOwnerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)

    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      throw new Error('Organization not found')
    }

    // Only current owner can transfer
    if (org.ownerId !== user._id) {
      throw new Error('Only the owner can transfer ownership')
    }

    // Check if new owner is a member
    const newOwnerMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', args.newOwnerId)
      )
      .first()

    if (!newOwnerMembership || newOwnerMembership.status !== 'active') {
      throw new Error('New owner must be an active member of the organization')
    }

    // Get current owner's membership
    const currentOwnerMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .first()

    const now = Date.now()

    // Update organization owner
    await ctx.db.patch(args.organizationId, {
      ownerId: args.newOwnerId,
      updatedAt: now,
    })

    // Update new owner's role
    await ctx.db.patch(newOwnerMembership._id, {
      role: 'owner',
      updatedAt: now,
    })

    // Demote current owner to admin
    if (currentOwnerMembership) {
      await ctx.db.patch(currentOwnerMembership._id, {
        role: 'admin',
        updatedAt: now,
      })
    }

    return { success: true }
  },
})

// ============================================================================
// Internal Queries/Mutations (for use by other modules)
// ============================================================================

/**
 * Check if a user has permission in an organization
 */
export const checkPermission = internalQuery({
  args: {
    userId: v.id('users'),
    organizationId: v.id('organizations'),
    requiredRole: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', args.userId)
      )
      .first()

    if (!membership || membership.status !== 'active') {
      return false
    }

    return hasRolePermission(
      membership.role as OrganizationRole,
      args.requiredRole as OrganizationRole
    )
  },
})

/**
 * Get organization by ID (internal)
 */
export const getInternal = internalQuery({
  args: { id: v.id('organizations') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

/**
 * Expire old invitations (for cron job)
 */
export const expireOldInvitations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    const expiredInvitations = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .take(100)

    for (const invitation of expiredInvitations) {
      await ctx.db.patch(invitation._id, { status: 'expired' })
    }

    return { expired: expiredInvitations.length }
  },
})

// ============================================================================
// Admin Queries & Mutations (requires admin/superadmin role)
// ============================================================================

/**
 * List all organizations for admin view
 * Accessible by admin and superadmin
 */
export const listAllOrganizations = query({
  args: {
    status: v.optional(v.union(v.literal('active'), v.literal('suspended'))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let orgs = await ctx.db.query('organizations').order('desc').collect()

    // Filter by status if specified
    if (args.status) {
      orgs = orgs.filter((org) => org.status === args.status)
    }

    // Apply pagination
    const limit = args.limit || 50
    const offset = args.offset || 0
    const paginatedOrgs = orgs.slice(offset, offset + limit)

    // Enrich with member count and event count
    const enrichedOrgs = await Promise.all(
      paginatedOrgs.map(async (org) => {
        const members = await ctx.db
          .query('organizationMembers')
          .withIndex('by_organization', (q) => q.eq('organizationId', org._id))
          .filter((q) => q.eq(q.field('status'), 'active'))
          .collect()

        const events = await ctx.db
          .query('events')
          .withIndex('by_organization', (q) => q.eq('organizationId', org._id))
          .collect()

        const owner = await ctx.db.get(org.ownerId)

        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          description: org.description,
          logoUrl: org.logoUrl,
          website: org.website,
          plan: org.plan,
          status: org.status,
          memberCount: members.length,
          eventCount: events.length,
          ownerName: owner?.name || 'Unknown',
          ownerEmail: owner?.email || 'Unknown',
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        }
      })
    )

    return {
      items: enrichedOrgs,
      totalCount: orgs.length,
      hasMore: offset + limit < orgs.length,
    }
  },
})

/**
 * Get organization statistics for admin dashboard
 * Accessible by admin and superadmin
 */
export const getOrganizationStats = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const orgs = await ctx.db.query('organizations').collect()

    const stats = {
      total: orgs.length,
      active: orgs.filter((o) => o.status === 'active').length,
      suspended: orgs.filter((o) => o.status === 'suspended').length,
      byPlan: {
        free: orgs.filter((o) => o.plan === 'free').length,
        pro: orgs.filter((o) => o.plan === 'pro').length,
        business: orgs.filter((o) => o.plan === 'business').length,
        enterprise: orgs.filter((o) => o.plan === 'enterprise').length,
      },
    }

    return stats
  },
})

/**
 * Suspend an organization
 * Accessible by admin and superadmin
 */
export const suspendOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      throw new AppError('Organization not found', ErrorCodes.NOT_FOUND, 404)
    }

    if (org.status === 'suspended') {
      throw new AppError('Organization is already suspended', ErrorCodes.CONFLICT, 409)
    }

    const now = Date.now()

    await ctx.db.patch(args.organizationId, {
      status: 'suspended',
      suspendedAt: now,
      suspendedReason: args.reason,
      suspendedBy: admin._id,
      updatedAt: now,
    })

    // Log the action in moderation logs
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'organization_suspended',
      targetType: 'organization',
      targetId: args.organizationId,
      reason: args.reason,
      metadata: {
        organizationName: org.name,
        organizationSlug: org.slug,
        ownerId: org.ownerId,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

/**
 * Activate a suspended organization
 * Accessible by admin and superadmin
 */
export const activateOrganization = mutation({
  args: {
    organizationId: v.id('organizations'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      throw new AppError('Organization not found', ErrorCodes.NOT_FOUND, 404)
    }

    if (org.status !== 'suspended') {
      throw new AppError('Organization is not suspended', ErrorCodes.CONFLICT, 409)
    }

    const now = Date.now()

    await ctx.db.patch(args.organizationId, {
      status: 'active',
      suspendedAt: undefined,
      suspendedReason: undefined,
      suspendedBy: undefined,
      updatedAt: now,
    })

    // Log the action in moderation logs
    await ctx.db.insert('moderationLogs', {
      adminId: admin._id,
      action: 'organization_activated',
      targetType: 'organization',
      targetId: args.organizationId,
      reason: args.reason || 'Suspension lifted',
      metadata: {
        organizationName: org.name,
        organizationSlug: org.slug,
        previousReason: org.suspendedReason,
      },
      createdAt: now,
    })

    return { success: true }
  },
})

/**
 * Get organization details for admin view
 * Accessible by admin and superadmin
 */
export const getOrganizationDetails = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      return null
    }

    // Get members
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect()

    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId)
        return {
          ...member,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || 'Unknown',
        }
      })
    )

    // Get events
    const events = await ctx.db
      .query('events')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect()

    // Get owner
    const owner = await ctx.db.get(org.ownerId)

    return {
      ...org,
      ownerName: owner?.name || 'Unknown',
      ownerEmail: owner?.email || 'Unknown',
      members: membersWithDetails,
      events: events.map((e) => ({
        _id: e._id,
        title: e.title,
        status: e.status,
        startDate: e.startDate,
        createdAt: e.createdAt,
      })),
    }
  },
})
