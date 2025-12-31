import { query } from '../_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'
import { getCurrentUser as getCurrentUserFromLib } from '../lib/auth'
import { logger } from '../lib/monitoring/logger'

/**
 * Get the current authenticated user.
 * Returns null if not authenticated or user doesn't exist in database.
 *
 * Frontend usage:
 * ```tsx
 * const currentUser = useQuery(api.queries.auth.getCurrentUser)
 * ```
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Removed debug logging that exposed sensitive data (Requirements 1.1, 2.2)
    const result = await getCurrentUserFromLib(ctx)
    
    // Log with structured logger (no sensitive data)
    logger.debug('getCurrentUser query executed', {
      hasUser: !!result,
      userRole: result?.role ?? 'null',
    })
    
    return result
  },
})

/**
 * Check if the current user is authenticated.
 * Returns true if authenticated, false otherwise.
 *
 * Frontend usage:
 * ```tsx
 * const isAuthenticated = useQuery(api.queries.auth.isAuthenticated)
 * ```
 */
export const isAuthenticated = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    return userId !== null
  },
})

/**
 * Get the current user's role.
 * Returns the role if authenticated, null otherwise.
 *
 * Frontend usage:
 * ```tsx
 * const userRole = useQuery(api.queries.auth.getUserRole)
 * ```
 */
export const getUserRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserFromLib(ctx)
    return user?.role ?? null
  },
})
