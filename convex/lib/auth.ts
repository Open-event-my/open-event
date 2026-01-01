import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { internalQuery } from '../_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { AppError, ErrorCodes } from './errors'

// Role hierarchy: superadmin (3) > admin (2) > organizer (1)
export const ROLE_HIERARCHY: Record<string, number> = {
  superadmin: 3,
  admin: 2,
  organizer: 1,
} as const

export type UserRole = 'superadmin' | 'admin' | 'organizer'
export type UserStatus = 'active' | 'suspended' | 'pending'

/**
 * Check if a user has admin privileges (admin or superadmin)
 */
export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin'
}

/**
 * Get user ID from access token.
 * Returns null if session is invalid or expired.
 */
export async function getUserIdFromSession(
  ctx: QueryCtx | MutationCtx,
  accessToken: string | undefined
): Promise<Id<'users'> | null> {
  if (!accessToken) return null

  // Find valid session by access token
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_access_token', (q) => q.eq('accessToken', accessToken))
    .first()

  if (!session) return null

  // Check if access token expired (handle optional field for migration)
  if (!session.accessTokenExpiresAt || session.accessTokenExpiresAt < Date.now()) return null

  return session.userId
}

/**
 * Get the current authenticated user from the context.
 * Supports both Convex Auth (Password/OAuth) and custom session tokens.
 * Returns null if no user is authenticated.
 *
 * Authentication priority:
 * 1. Convex Auth (via getAuthUserId) - works automatically with JWT tokens
 * 2. Custom session token (if provided) - for custom auth flows
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx, sessionToken?: string) {
  // #region agent log
  console.log(
    '[DEBUG-AUTH] getCurrentUser lib function called:',
    JSON.stringify({
      location: 'convex/lib/auth.ts:58',
      message: 'getCurrentUser lib entry',
      data: {
        hasSessionToken: !!sessionToken,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'client-query',
      hypothesisId: 'L1',
    })
  )
  // #endregion

  // First, try Convex Auth (Password/Google OAuth)
  const convexAuthUserId = await getAuthUserId(ctx)

  // #region agent log
  console.log(
    '[DEBUG-AUTH] getCurrentUser after getAuthUserId:',
    JSON.stringify({
      location: 'convex/lib/auth.ts:70',
      message: 'getCurrentUser after getAuthUserId',
      data: {
        hasConvexAuthUserId: !!convexAuthUserId,
        convexAuthUserId: convexAuthUserId?.toString() ?? 'null',
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'client-query',
      hypothesisId: 'L2',
    })
  )
  // #endregion

  if (convexAuthUserId) {
    const user = await ctx.db.get(convexAuthUserId)

    // #region agent log
    console.log(
      '[DEBUG-AUTH] getCurrentUser user lookup result:',
      JSON.stringify({
        location: 'convex/lib/auth.ts:78',
        message: 'getCurrentUser user lookup',
        data: {
          hasUser: !!user,
          userId: user?._id?.toString() ?? 'null',
          userRole: user?.role ?? 'null',
          userStatus: user?.status ?? 'null',
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'client-query',
        hypothesisId: 'L3',
      })
    )
    // #endregion

    if (user) return user
  }

  // Fall back to custom session token
  const customUserId = await getUserIdFromSession(ctx, sessionToken)
  if (!customUserId) {
    // #region agent log
    console.log(
      '[DEBUG-AUTH] getCurrentUser no custom userId:',
      JSON.stringify({
        location: 'convex/lib/auth.ts:95',
        message: 'getCurrentUser no custom userId',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'client-query',
        hypothesisId: 'L4',
      })
    )
    // #endregion
    return null
  }

  const user = await ctx.db.get(customUserId)
  if (!user) {
    // #region agent log
    console.log(
      '[DEBUG-AUTH] getCurrentUser custom user not found:',
      JSON.stringify({
        location: 'convex/lib/auth.ts:103',
        message: 'getCurrentUser custom user not found',
        data: {
          customUserId: customUserId.toString(),
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'client-query',
        hypothesisId: 'L5',
      })
    )
    // #endregion
    return null
  }

  return user
}

/**
 * Require an authenticated user with active status.
 * Use this when you need auth + active check but no specific role requirement.
 * Throws an error if:
 * - User is not authenticated
 * - User's account is suspended
 */
export async function requireActiveUser(ctx: QueryCtx | MutationCtx, sessionToken?: string) {
  const user = await getCurrentUser(ctx, sessionToken)

  if (!user) {
    throw new AppError('Authentication required', ErrorCodes.UNAUTHORIZED, 401)
  }

  if (user.status === 'suspended') {
    throw new AppError('Account suspended. Please contact support.', 'ACCOUNT_SUSPENDED', 403)
  }

  return user
}

/**
 * Assert that the current user has the specified role or higher.
 * Uses role hierarchy: superadmin > admin > organizer
 * Throws an error if:
 * - User is not authenticated
 * - User's account is suspended
 * - User doesn't have sufficient role level
 */
export async function assertRole(
  ctx: QueryCtx | MutationCtx,
  requiredRole: UserRole,
  sessionToken?: string
) {
  const user = await getCurrentUser(ctx, sessionToken)

  if (!user) {
    throw new AppError('Authentication required', ErrorCodes.UNAUTHORIZED, 401)
  }

  // Check if user is suspended
  if (user.status === 'suspended') {
    throw new AppError('Account suspended. Please contact support.', 'ACCOUNT_SUSPENDED', 403)
  }

  // Get role levels (default to organizer level for new users)
  const userRoleLevel = ROLE_HIERARCHY[user.role || 'organizer'] || 1
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] || 1

  // Check if user has sufficient role level
  if (userRoleLevel >= requiredRoleLevel) {
    return user
  }

  throw new AppError(
    `Access denied. Required role: ${requiredRole}, but user has role: ${user.role || 'organizer'}`,
    ErrorCodes.FORBIDDEN,
    403
  )
}

/**
 * Assert that the current user is exactly the specified role (not higher).
 * Use this when you want to restrict access to only a specific role.
 */
export async function assertExactRole(
  ctx: QueryCtx | MutationCtx,
  exactRole: UserRole,
  sessionToken?: string
) {
  const user = await getCurrentUser(ctx, sessionToken)

  if (!user) {
    throw new AppError('Authentication required', ErrorCodes.UNAUTHORIZED, 401)
  }

  if (user.status === 'suspended') {
    throw new AppError('Account suspended. Please contact support.', 'ACCOUNT_SUSPENDED', 403)
  }

  const userRole = user.role || 'organizer'
  if (userRole !== exactRole) {
    throw new AppError(
      `Access denied. Required exact role: ${exactRole}, but user has role: ${userRole}`,
      ErrorCodes.FORBIDDEN,
      403
    )
  }

  return user
}

/**
 * Require authentication and return the user ID.
 * Supports both Convex Auth and custom session tokens.
 * Throws an error if not authenticated.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx, sessionToken?: string) {
  // First, try Convex Auth
  const convexAuthUserId = await getAuthUserId(ctx)
  if (convexAuthUserId) return convexAuthUserId

  // Fall back to custom session token
  const customUserId = await getUserIdFromSession(ctx, sessionToken)
  if (!customUserId) {
    throw new AppError('Authentication required', ErrorCodes.UNAUTHORIZED, 401)
  }
  return customUserId
}

/**
 * Get the current user ID if authenticated, null otherwise.
 * Supports both Convex Auth and custom session tokens.
 * Does not throw an error.
 */
export async function getOptionalUserId(ctx: QueryCtx | MutationCtx, sessionToken?: string) {
  // First, try Convex Auth
  const convexAuthUserId = await getAuthUserId(ctx)
  if (convexAuthUserId) return convexAuthUserId

  // Fall back to custom session token
  return await getUserIdFromSession(ctx, sessionToken)
}

/**
 * Internal query to get current user from access token (for use in actions)
 */
export const getCurrentUserInternal = internalQuery({
  args: { accessToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await getCurrentUser(ctx, args.accessToken)
  },
})
