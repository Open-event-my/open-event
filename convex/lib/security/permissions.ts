/**
 * Organization Permission Checking Utilities
 *
 * Provides centralized, reusable permission checks for:
 * - Billing management (checkout, portal, subscription changes)
 * - Event management (create, update, delete)
 * - Member management (invite, remove, role changes)
 * - Role escalation prevention
 *
 * SECURITY PRINCIPLES:
 * 1. Fail closed - Default to deny access
 * 2. Minimal privilege - Only grant necessary permissions
 * 3. Consistent error messages - Don't leak internal details
 * 4. Audit everything - Log all permission checks
 */

import type { QueryCtx, MutationCtx } from '../../_generated/server'
import type { Doc, Id } from '../../_generated/dataModel'
import { getCurrentUser } from '../auth'
import { logger } from '../monitoring/logger'

// ============================================================================
// TYPES
// ============================================================================

export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
} as const

/**
 * Roles that can manage billing (checkout, portal, subscriptions)
 */
export const BILLING_ROLES: OrganizationRole[] = ['owner', 'admin']

/**
 * Roles that can manage events (create, update, delete)
 */
export const EVENT_MANAGEMENT_ROLES: OrganizationRole[] = ['owner', 'admin', 'manager']

/**
 * Roles that can manage members (invite, remove)
 */
export const MEMBER_MANAGEMENT_ROLES: OrganizationRole[] = ['owner', 'admin']

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  authorized: boolean
  user: Doc<'users'> | null
  membership: Doc<'organizationMembers'> | null
  role: OrganizationRole | null
  reason?: string
}

/**
 * Extended result for billing permission checks
 */
export interface BillingPermissionResult extends PermissionCheckResult {
  organization: Doc<'organizations'> | null
}

// ============================================================================
// CORE PERMISSION HELPERS
// ============================================================================

/**
 * Check if a role has at least the minimum required permission level
 */
export function hasMinimumRole(
  userRole: OrganizationRole,
  requiredRole: OrganizationRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if a role is in the allowed list
 */
export function isRoleAllowed(role: OrganizationRole, allowedRoles: OrganizationRole[]): boolean {
  return allowedRoles.includes(role)
}

/**
 * Get a user's organization membership
 * Returns null if user is not authenticated or not a member
 */
export async function getOrganizationMembership(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<'organizations'>
): Promise<Doc<'organizationMembers'> | null> {
  const user = await getCurrentUser(ctx)
  if (!user) return null

  return ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .first()
}

// ============================================================================
// BILLING PERMISSION CHECKS
// ============================================================================

/**
 * Verify user has billing permission for an organization
 * Only owners and admins can manage billing
 *
 * Use this for: checkout sessions, billing portal, subscription cancellation
 *
 * @returns Result object with authorization status and context
 */
export async function checkBillingPermission(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<'organizations'>
): Promise<BillingPermissionResult> {
  const user = await getCurrentUser(ctx)

  if (!user) {
    return {
      authorized: false,
      user: null,
      membership: null,
      role: null,
      organization: null,
      reason: 'Authentication required',
    }
  }

  const organization = await ctx.db.get(organizationId)
  if (!organization) {
    return {
      authorized: false,
      user,
      membership: null,
      role: null,
      organization: null,
      reason: 'Organization not found',
    }
  }

  const membership = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .first()

  if (!membership || membership.status !== 'active') {
    logger.warn('Billing permission denied - not a member', {
      organizationId,
      userId: user._id,
    })
    return {
      authorized: false,
      user,
      membership: null,
      role: null,
      organization,
      reason: 'Not authorized to manage billing for this organization',
    }
  }

  const role = membership.role as OrganizationRole

  if (!isRoleAllowed(role, BILLING_ROLES)) {
    logger.warn('Billing permission denied - insufficient role', {
      organizationId,
      userId: user._id,
      role,
    })
    return {
      authorized: false,
      user,
      membership,
      role,
      organization,
      reason: 'Only owners and admins can manage billing',
    }
  }

  return {
    authorized: true,
    user,
    membership,
    role,
    organization,
  }
}

// ============================================================================
// EVENT MANAGEMENT PERMISSION CHECKS
// ============================================================================

/**
 * Verify user has event management permission
 * Manager role or above can manage events
 *
 * Use this for: create, update, delete events
 */
export async function checkEventManagementPermission(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<'organizations'>
): Promise<PermissionCheckResult> {
  const user = await getCurrentUser(ctx)

  if (!user) {
    return {
      authorized: false,
      user: null,
      membership: null,
      role: null,
      reason: 'Authentication required',
    }
  }

  const membership = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .first()

  if (!membership || membership.status !== 'active') {
    return {
      authorized: false,
      user,
      membership: null,
      role: null,
      reason: 'Not a member of this organization',
    }
  }

  const role = membership.role as OrganizationRole

  if (!isRoleAllowed(role, EVENT_MANAGEMENT_ROLES)) {
    return {
      authorized: false,
      user,
      membership,
      role,
      reason: 'Manager role or above required to manage events',
    }
  }

  return {
    authorized: true,
    user,
    membership,
    role,
  }
}

// ============================================================================
// MEMBER MANAGEMENT PERMISSION CHECKS
// ============================================================================

/**
 * Verify user has member management permission
 * Admin role or above can manage members
 *
 * Use this for: invite, remove, update roles
 */
export async function checkMemberManagementPermission(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<'organizations'>
): Promise<PermissionCheckResult> {
  const user = await getCurrentUser(ctx)

  if (!user) {
    return {
      authorized: false,
      user: null,
      membership: null,
      role: null,
      reason: 'Authentication required',
    }
  }

  const membership = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q) =>
      q.eq('organizationId', organizationId).eq('userId', user._id)
    )
    .first()

  if (!membership || membership.status !== 'active') {
    return {
      authorized: false,
      user,
      membership: null,
      role: null,
      reason: 'Not a member of this organization',
    }
  }

  const role = membership.role as OrganizationRole

  if (!isRoleAllowed(role, MEMBER_MANAGEMENT_ROLES)) {
    return {
      authorized: false,
      user,
      membership,
      role,
      reason: 'Admin role or above required to manage members',
    }
  }

  return {
    authorized: true,
    user,
    membership,
    role,
  }
}

// ============================================================================
// ROLE ESCALATION PREVENTION
// ============================================================================

/**
 * Check if user can invite someone to a specific role
 *
 * SECURITY: Prevents admin privilege escalation
 * - Only owners can invite admins
 * - Admins can invite manager, member, viewer
 */
export async function canInviteToRole(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<'organizations'>,
  targetRole: OrganizationRole
): Promise<{ allowed: boolean; reason?: string }> {
  const permCheck = await checkMemberManagementPermission(ctx, organizationId)

  if (!permCheck.authorized) {
    return { allowed: false, reason: permCheck.reason }
  }

  // Only owners can invite admins (prevents escalation)
  if (targetRole === 'admin' && permCheck.role !== 'owner') {
    logger.warn('Role escalation attempt blocked', {
      organizationId,
      inviterRole: permCheck.role,
      targetRole,
    })
    return {
      allowed: false,
      reason: 'Only organization owners can invite admins',
    }
  }

  // Cannot invite to owner role
  if (targetRole === 'owner') {
    return {
      allowed: false,
      reason: 'Cannot invite to owner role. Use ownership transfer instead.',
    }
  }

  return { allowed: true }
}

/**
 * Check if user can change someone's role
 *
 * SECURITY: Prevents role escalation attacks
 * - Cannot promote to a role higher than your own
 * - Cannot demote someone with a higher role
 * - Only owners can change admin roles
 */
export async function canChangeRole(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<'organizations'>,
  targetCurrentRole: OrganizationRole,
  targetNewRole: OrganizationRole
): Promise<{ allowed: boolean; reason?: string }> {
  const permCheck = await checkMemberManagementPermission(ctx, organizationId)

  if (!permCheck.authorized) {
    return { allowed: false, reason: permCheck.reason }
  }

  const changerRoleLevel = ROLE_HIERARCHY[permCheck.role!]
  const currentRoleLevel = ROLE_HIERARCHY[targetCurrentRole]
  const newRoleLevel = ROLE_HIERARCHY[targetNewRole]

  // Cannot modify someone with equal or higher role (except owners can change admins)
  if (currentRoleLevel >= changerRoleLevel && permCheck.role !== 'owner') {
    logger.warn('Role change denied - target has higher/equal role', {
      organizationId,
      changerRole: permCheck.role,
      targetCurrentRole,
      targetNewRole,
    })
    return {
      allowed: false,
      reason: 'Cannot modify role of users with equal or higher permissions',
    }
  }

  // Cannot promote to a role higher than your own
  if (newRoleLevel >= changerRoleLevel && permCheck.role !== 'owner') {
    logger.warn('Role escalation attempt blocked', {
      organizationId,
      changerRole: permCheck.role,
      targetNewRole,
    })
    return {
      allowed: false,
      reason: 'Cannot promote users to a role higher than your own',
    }
  }

  // Cannot change to/from owner role
  if (targetCurrentRole === 'owner' || targetNewRole === 'owner') {
    return {
      allowed: false,
      reason: 'Use ownership transfer to change owner role',
    }
  }

  return { allowed: true }
}

// ============================================================================
// SECURE ERROR MESSAGES
// ============================================================================

/**
 * Get a generic, safe error message that doesn't leak internal details
 */
export function getGenericPermissionError(): string {
  return 'You do not have permission to perform this action'
}

/**
 * Get a safe billing error message
 * Internal Stripe errors should be logged, not exposed
 */
export function getSafeBillingError(): string {
  return 'Unable to process billing request. Please try again or contact support.'
}
