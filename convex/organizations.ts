/**
 * Organizations Module
 *
 * Handles organization management for multi-tenancy support.
 * Includes CRUD operations for organizations, members, and invitations.
 */

import { v } from 'convex/values'
import { mutation, query, action, internalQuery, internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { getCurrentUser, assertRole } from './lib/auth'
import { AppError, ErrorCodes } from './lib/errors'
import { PLANS, type PlanKey } from './config/plans'

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

// Plan limits are now imported from ./config/plans.ts (PLANS constant)
// This ensures a single source of truth for all plan configurations

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
export function generateSlug(name: string): string {
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

/**
 * Shared logic for creating an organization
 * Used by both the public 'create' mutation and the 'organizerProfiles.saveProfile' mutation
 */
export async function createOrganizationInternal(
  ctx: MutationCtx, // Use MutationCtx explicitly
  user: Doc<'users'>,
  args: {
    name: string
    description?: string
    logoUrl?: string
    website?: string
    plan?: OrganizationPlan
  }
) {
  // Check limit
  const userOrgs = await ctx.db
    .query('organizations')
    .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
    .collect()

  if (userOrgs.length >= MAX_ORGS_PER_USER) {
    throw new AppError(
      `You have reached the maximum number of organizations (${MAX_ORGS_PER_USER}). Please contact support if you need more.`,
      ErrorCodes.FORBIDDEN,
      403
    )
  }

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
  const planConfig = PLANS[plan as PlanKey]
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
    maxMembers: planConfig.maxMembers,
    maxEvents: planConfig.maxEvents === Infinity ? undefined : planConfig.maxEvents,
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
}

// ============================================================================
// Organization Queries
// ============================================================================

/**
 * Get an organization by ID
 * SECURITY: Only members can view organization details
 */
export const get = query({
  args: { id: v.id('organizations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)

    // Check if user is a member
    if (user) {
      const membership = await ctx.db
        .query('organizationMembers')
        .withIndex('by_org_user', (q) => q.eq('organizationId', args.id).eq('userId', user._id))
        .first()

      // Only active members or admins can view
      if (membership?.status === 'active' || user.role === 'admin' || user.role === 'superadmin') {
        return ctx.db.get(args.id)
      }
    }

    // Return null if not authorized
    return null
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

/**
 * Get user's role in an organization
 */
export const getMyRole = query({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) => q.eq('organizationId', args.orgId).eq('userId', user._id))
      .first()

    if (!membership || membership.status !== 'active') {
      return null
    }

    return { role: membership.role }
  },
})

// ============================================================================
// Organization Mutations
// ============================================================================

// Maximum organizations a user can create (prevents free tier abuse)
const MAX_ORGS_PER_USER = 5

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

    // Use shared logic for creation
    return createOrganizationInternal(ctx, user, {
      name: args.name,
      description: args.description,
      logoUrl: args.logoUrl,
      website: args.website,
      plan: args.plan as OrganizationPlan,
    })
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

    // SECURITY FIX: Prevent role escalation - only owners can invite admins
    // This prevents an admin from creating a chain of other admins without owner knowledge
    if (args.role === 'admin' && membership.role !== 'owner') {
      throw new Error('Only organization owners can invite admins')
    }

    // Check organization member limits
    const org = await ctx.db.get(args.organizationId)
    if (!org) throw new Error('Organization not found')

    // Ensure we respect the maxMembers limit from the plan config if stored value is out of sync
    const planConfig = PLANS[org.plan as PlanKey] || PLANS.free
    const effectiveLimit = Math.max(org.maxMembers, planConfig.maxMembers)

    // Check if this is a re-invite for an existing pending invitation
    const existingPendingInvite = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .filter((q) =>
        q.and(
          q.eq(q.field('organizationId'), args.organizationId),
          q.eq(q.field('status'), 'pending')
        )
      )
      .first()

    const isReinvite = !!existingPendingInvite

    // SECURITY FIX: Use atomic counter for invitation limit enforcement
    // This prevents race conditions when multiple invitations are sent simultaneously
    if (!isReinvite) {
      // Get current active members count (for accurate total)
      const currentMembers = await ctx.db
        .query('organizationMembers')
        .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect()

      // Use atomic counter for pending invitations
      const currentPendingCount = org.pendingInvitationCount ?? 0
      const totalSeatsUsed = currentMembers.length + currentPendingCount

      if (totalSeatsUsed >= effectiveLimit) {
        throw new Error(
          `Organization has reached maximum members (${effectiveLimit}). Upgrade your plan to add more members.`
        )
      }

      // Atomically increment the pending invitation counter BEFORE creating invitation
      await ctx.db.patch(args.organizationId, {
        pendingInvitationCount: currentPendingCount + 1,
        updatedAt: Date.now(),
      })
    }

    // Check if invitation already exists (we already queried this above)
    if (isReinvite) {
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

    // SECURITY FIX: Decrement the pending invitation counter
    const org = await ctx.db.get(invitation.organizationId)
    if (org && org.pendingInvitationCount && org.pendingInvitationCount > 0) {
      await ctx.db.patch(invitation.organizationId, {
        pendingInvitationCount: org.pendingInvitationCount - 1,
        updatedAt: now,
      })
    }

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

    // Only decrement counter if the invitation was pending
    if (invitation.status === 'pending') {
      const org = await ctx.db.get(invitation.organizationId)
      if (org && org.pendingInvitationCount && org.pendingInvitationCount > 0) {
        await ctx.db.patch(invitation.organizationId, {
          pendingInvitationCount: org.pendingInvitationCount - 1,
          updatedAt: Date.now(),
        })
      }
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

    // SECURITY FIX: Prevent role escalation attacks
    // 1. Only owners can promote to admin
    if (args.role === 'admin' && userMembership.role !== 'owner') {
      throw new Error('Only organization owners can promote members to admin')
    }

    // 2. Admins cannot modify other admins (only owners can)
    if (targetMember.role === 'admin' && userMembership.role !== 'owner') {
      throw new Error('Only organization owners can modify admin roles')
    }

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
 * Check downgrade eligibility (internal)
 * Called by downgradeToFree action to validate before Stripe cancellation
 */
export const checkDowngradeEligibilityInternal = internalQuery({
  args: {
    organizationId: v.id('organizations'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      return { eligible: false, error: 'Organization not found', org: null }
    }

    // Only owner can downgrade
    if (org.ownerId !== args.userId) {
      return { eligible: false, error: 'Only the owner can change the organization plan', org }
    }

    // Already on free plan
    if (org.plan === 'free') {
      return { eligible: true, alreadyFree: true, org }
    }

    const freePlanConfig = PLANS.free

    // Check current usage
    const [members, events] = await Promise.all([
      ctx.db
        .query('organizationMembers')
        .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect(),
      ctx.db
        .query('events')
        .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
        .collect(),
    ])

    const activeEvents = events.filter((e) => e.status !== 'cancelled' && e.status !== 'completed')

    const memberCount = members.length
    const activeEventCount = activeEvents.length
    const issues: string[] = []

    if (memberCount > freePlanConfig.maxMembers) {
      issues.push(
        `You have ${memberCount} members but the Free plan only allows ${freePlanConfig.maxMembers}. ` +
          `Remove ${memberCount - freePlanConfig.maxMembers} member(s) first.`
      )
    }

    if (freePlanConfig.maxEvents !== Infinity && activeEventCount > freePlanConfig.maxEvents) {
      issues.push(
        `You have ${activeEventCount} active events but the Free plan only allows ${freePlanConfig.maxEvents}. ` +
          `Archive or cancel ${activeEventCount - freePlanConfig.maxEvents} event(s) first.`
      )
    }

    if (issues.length > 0) {
      return { eligible: false, error: `Cannot downgrade: ${issues.join(' ')}`, org }
    }

    return { eligible: true, alreadyFree: false, org }
  },
})

/**
 * Get current user for action context (internal)
 */
export const getCurrentUserInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return getCurrentUser(ctx)
  },
})

/**
 * Update organization to free plan (internal)
 * Called by downgradeToFree action AFTER Stripe subscription is cancelled
 */
export const updateToFreePlan = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    previousPlan: v.string(),
  },
  handler: async (ctx, args) => {
    const freePlanConfig = PLANS.free
    const now = Date.now()

    await ctx.db.patch(args.organizationId, {
      plan: 'free',
      maxMembers: freePlanConfig.maxMembers,
      maxEvents: freePlanConfig.maxEvents === Infinity ? undefined : freePlanConfig.maxEvents,
      // Clear Stripe subscription data since subscription is now cancelled
      stripeSubscriptionId: undefined,
      subscriptionStatus: 'canceled',
      currentPeriodEnd: undefined,
      updatedAt: now,
    })

    return {
      success: true,
      previousPlan: args.previousPlan,
      newPlan: 'free',
    }
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

    // Group expired invitations by organization for counter updates
    // Use a Map with proper Id type as key
    const orgDecrements = new Map<Id<'organizations'>, number>()

    for (const invitation of expiredInvitations) {
      await ctx.db.patch(invitation._id, { status: 'expired' })

      // Track decrement for each organization using the actual ID
      const currentCount = orgDecrements.get(invitation.organizationId) || 0
      orgDecrements.set(invitation.organizationId, currentCount + 1)
    }

    // SECURITY FIX: Decrement pending invitation counters for each affected organization
    for (const [orgId, decrementCount] of orgDecrements) {
      const org = await ctx.db.get(orgId)
      if (org && org.pendingInvitationCount) {
        await ctx.db.patch(orgId, {
          pendingInvitationCount: Math.max(0, org.pendingInvitationCount - decrementCount),
          updatedAt: now,
        })
      }
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

// ============================================================================
// Plan Management
// ============================================================================

/**
 * Check if an organization is eligible to downgrade to a specific plan
 * Returns eligibility status and any issues that would prevent the downgrade
 */
export const checkPlanDowngradeEligibility = query({
  args: {
    organizationId: v.id('organizations'),
    targetPlan: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new AppError('Authentication required', ErrorCodes.UNAUTHORIZED, 401)
    }

    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      throw new AppError('Organization not found', ErrorCodes.NOT_FOUND, 404)
    }

    // Check if user is owner (only owners can change plans)
    if (org.ownerId !== user._id) {
      throw new AppError(
        'Only the owner can change the organization plan',
        ErrorCodes.FORBIDDEN,
        403
      )
    }

    const targetPlanConfig = PLANS[args.targetPlan as PlanKey]
    if (!targetPlanConfig) {
      throw new AppError('Invalid plan', ErrorCodes.INVALID_INPUT, 400)
    }

    // Get current usage
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    const events = await ctx.db
      .query('events')
      .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
      .collect()

    // Count only active events (not cancelled/completed)
    const activeEvents = events.filter((e) => e.status !== 'cancelled' && e.status !== 'completed')

    const memberCount = members.length
    const activeEventCount = activeEvents.length

    const issues: string[] = []

    // Check member limit
    if (memberCount > targetPlanConfig.maxMembers) {
      issues.push(
        `You have ${memberCount} members but the ${targetPlanConfig.name} plan only allows ${targetPlanConfig.maxMembers}. ` +
          `Please remove ${memberCount - targetPlanConfig.maxMembers} member(s) before downgrading.`
      )
    }

    // Check event limit (only if target plan has a limit)
    if (targetPlanConfig.maxEvents !== Infinity && activeEventCount > targetPlanConfig.maxEvents) {
      issues.push(
        `You have ${activeEventCount} active events but the ${targetPlanConfig.name} plan only allows ${targetPlanConfig.maxEvents}. ` +
          `Please archive or cancel ${activeEventCount - targetPlanConfig.maxEvents} event(s) before downgrading.`
      )
    }

    return {
      eligible: issues.length === 0,
      issues,
      currentUsage: {
        members: memberCount,
        activeEvents: activeEventCount,
      },
      targetLimits: {
        members: targetPlanConfig.maxMembers,
        events: targetPlanConfig.maxEvents,
      },
      currentPlan: org.plan,
      targetPlan: args.targetPlan,
    }
  },
})

/**
 * Get organization capacity info for the current plan
 * Useful for displaying usage vs limits in the UI
 * Optimized with Promise.all for parallel DB queries
 */
export const getCapacity = query({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const org = await ctx.db.get(args.organizationId)
    if (!org) return null

    // Verify user is a member
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id)
      )
      .first()

    if (!membership || membership.status !== 'active') {
      return null
    }

    const planConfig = PLANS[(org.plan as PlanKey) || 'free']

    // Parallel queries for better performance
    const [members, pendingInvitations, events] = await Promise.all([
      ctx.db
        .query('organizationMembers')
        .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .collect(),
      ctx.db
        .query('organizationInvitations')
        .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
        .filter((q) => q.eq(q.field('status'), 'pending'))
        .collect(),
      ctx.db
        .query('events')
        .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
        .collect(),
    ])

    const activeEvents = events.filter((e) => e.status !== 'cancelled' && e.status !== 'completed')

    const memberCount = members.length
    const pendingCount = pendingInvitations.length
    const activeEventCount = activeEvents.length

    const effectiveMemberLimit = Math.max(org.maxMembers ?? 0, planConfig.maxMembers)
    const effectiveEventLimit =
      org.maxEvents ?? (planConfig.maxEvents === Infinity ? undefined : planConfig.maxEvents)

    return {
      plan: {
        key: org.plan || 'free',
        name: planConfig.name,
      },
      members: {
        used: memberCount,
        pending: pendingCount,
        total: memberCount + pendingCount,
        limit: effectiveMemberLimit,
        remaining: effectiveMemberLimit - memberCount - pendingCount,
        isAtCapacity: memberCount + pendingCount >= effectiveMemberLimit,
        percentUsed: Math.round(((memberCount + pendingCount) / effectiveMemberLimit) * 100),
      },
      events: {
        used: activeEventCount,
        limit: effectiveEventLimit,
        remaining: effectiveEventLimit ? effectiveEventLimit - activeEventCount : undefined,
        isAtCapacity: effectiveEventLimit ? activeEventCount >= effectiveEventLimit : false,
        isUnlimited: effectiveEventLimit === undefined,
        percentUsed: effectiveEventLimit
          ? Math.round((activeEventCount / effectiveEventLimit) * 100)
          : 0,
      },
    }
  },
})

/**
 * Change organization plan - INTERNAL ONLY
 * SECURITY FIX: This is now an internal mutation to prevent direct calls bypassing Stripe payment.
 * Plan changes should only happen via Stripe webhooks after successful payment.
 *
 * For downgrades to free plan, use the public downgradeToFree mutation which validates eligibility.
 */
export const changePlan = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    newPlan: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId)
    if (!org) {
      throw new AppError('Organization not found', ErrorCodes.NOT_FOUND, 404)
    }

    const newPlanConfig = PLANS[args.newPlan as PlanKey]
    if (!newPlanConfig) {
      throw new AppError('Invalid plan', ErrorCodes.INVALID_INPUT, 400)
    }

    const currentPlan = org.plan || 'free'
    if (currentPlan === args.newPlan) {
      return { success: true, message: 'Already on this plan', plan: args.newPlan }
    }

    const currentPlanConfig = PLANS[currentPlan as PlanKey] || PLANS.free
    const isDowngrade = (newPlanConfig.price ?? 0) < (currentPlanConfig.price ?? 0)

    // If downgrading, validate eligibility
    if (isDowngrade) {
      // Parallel queries for current usage
      const [members, events] = await Promise.all([
        ctx.db
          .query('organizationMembers')
          .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
          .filter((q) => q.eq(q.field('status'), 'active'))
          .collect(),
        ctx.db
          .query('events')
          .withIndex('by_organization', (q) => q.eq('organizationId', args.organizationId))
          .collect(),
      ])

      const activeEvents = events.filter(
        (e) => e.status !== 'cancelled' && e.status !== 'completed'
      )

      const memberCount = members.length
      const activeEventCount = activeEvents.length

      const issues: string[] = []

      // Check member limit
      if (memberCount > newPlanConfig.maxMembers) {
        issues.push(
          `You have ${memberCount} members but the ${newPlanConfig.name} plan only allows ${newPlanConfig.maxMembers}. ` +
            `Remove ${memberCount - newPlanConfig.maxMembers} member(s) first.`
        )
      }

      // Check event limit
      if (newPlanConfig.maxEvents !== Infinity && activeEventCount > newPlanConfig.maxEvents) {
        issues.push(
          `You have ${activeEventCount} active events but the ${newPlanConfig.name} plan only allows ${newPlanConfig.maxEvents}. ` +
            `Archive or cancel ${activeEventCount - newPlanConfig.maxEvents} event(s) first.`
        )
      }

      if (issues.length > 0) {
        throw new AppError(`Cannot downgrade: ${issues.join(' ')}`, ErrorCodes.INVALID_INPUT, 400)
      }
    }

    const now = Date.now()

    // Update organization with new plan
    await ctx.db.patch(args.organizationId, {
      plan: args.newPlan as OrganizationPlan,
      maxMembers: newPlanConfig.maxMembers,
      maxEvents: newPlanConfig.maxEvents === Infinity ? undefined : newPlanConfig.maxEvents,
      updatedAt: now,
    })

    return {
      success: true,
      previousPlan: currentPlan,
      newPlan: args.newPlan,
      isDowngrade,
    }
  },
})

/**
 * Downgrade organization to free plan (public action)
 * This is the only public way to change plans - and only for downgrading to free.
 * Upgrades must go through Stripe checkout.
 *
 * SECURITY FIX: This action now properly cancels the Stripe subscription BEFORE
 * updating the local database, preventing desync where users are still charged
 * after appearing to downgrade.
 */
export const downgradeToFree = action({
  args: {
    organizationId: v.id('organizations'),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    previousPlan?: string
    newPlan?: string
    message?: string
    error?: string
  }> => {
    // Step 1: Get current user
    const user = await ctx.runQuery(internal.organizations.getCurrentUserInternal, {})
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Step 2: Check eligibility (permissions + usage limits)
    const eligibility = await ctx.runQuery(
      internal.organizations.checkDowngradeEligibilityInternal,
      {
        organizationId: args.organizationId,
        userId: user._id,
      }
    )

    if (!eligibility.eligible) {
      return { success: false, error: eligibility.error }
    }

    // Already on free plan - no action needed
    if (eligibility.alreadyFree) {
      return { success: true, message: 'Already on free plan' }
    }

    const org = eligibility.org
    if (!org) {
      return { success: false, error: 'Organization not found' }
    }

    const previousPlan = org.plan

    // Step 3: Cancel Stripe subscription FIRST (if exists)
    // This is the critical fix - we must cancel in Stripe before clearing local DB
    if (org.stripeSubscriptionId) {
      try {
        await ctx.runAction(internal.stripe.cancelSubscriptionImmediately, {
          stripeSubscriptionId: org.stripeSubscriptionId,
        })
      } catch (error) {
        // If Stripe cancellation fails, DO NOT update local DB
        // This prevents desync where local shows "free" but Stripe still charges
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          success: false,
          error: `Failed to cancel Stripe subscription: ${message}. Your plan has not been changed.`,
        }
      }
    }

    // Step 4: Only AFTER Stripe confirms cancellation, update local DB
    await ctx.runMutation(internal.organizations.updateToFreePlan, {
      organizationId: args.organizationId,
      previousPlan: previousPlan || 'unknown',
    })

    return {
      success: true,
      previousPlan,
      newPlan: 'free',
    }
  },
})

/**
 * Update Stripe customer ID on organization
 * Internal use only - called after Stripe customer creation
 */
export const updateStripeCustomer = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      stripeCustomerId: args.stripeCustomerId,
      updatedAt: Date.now(),
    })
    return { success: true }
  },
})
