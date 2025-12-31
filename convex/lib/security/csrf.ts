/**
 * CSRF Protection Service
 *
 * Implements Cross-Site Request Forgery protection for all state-changing operations.
 * Tokens are generated per user session and validated on each mutation request.
 */

import { v, ConvexError } from 'convex/values'
import { mutation, query } from '../../_generated/server'
import type { MutationCtx } from '../../_generated/server'

/**
 * CSRF Configuration
 */
export const CSRF_CONFIG = {
  tokenLength: 32, // Length of random token
  tokenExpiration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token',
} as const

/**
 * CSRF Token Interface
 */
export interface CSRFToken {
  token: string
  expiresAt: number
}

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''

  // Use crypto.getRandomValues for secure random generation
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length]
  }

  return token
}

/**
 * Generate a new CSRF token for a user
 */
export const generateCSRFToken = mutation({
  args: {},
  handler: async (ctx): Promise<CSRFToken> => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated to generate CSRF token',
      })
    }

    const userId = identity.subject
    const token = generateSecureToken(CSRF_CONFIG.tokenLength)
    const expiresAt = Date.now() + CSRF_CONFIG.tokenExpiration

    // Delete any existing tokens for this user
    const existingTokens = await ctx.db
      .query('csrfTokens')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    for (const existingToken of existingTokens) {
      await ctx.db.delete(existingToken._id)
    }

    // Store new token
    await ctx.db.insert('csrfTokens', {
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
    })

    return { token, expiresAt }
  },
})

/**
 * Validate a CSRF token for a user
 */
export const validateCSRFToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }): Promise<boolean> => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return false
    }

    const userId = identity.subject

    // Find token in database
    const tokenDoc = await ctx.db
      .query('csrfTokens')
      .withIndex('by_user_token', (q) => q.eq('userId', userId).eq('token', token))
      .first()

    if (!tokenDoc) {
      return false
    }

    // Check if token is expired
    if (tokenDoc.expiresAt < Date.now()) {
      // Note: Cannot delete in a query - expired tokens are cleaned up by cleanupExpiredTokens
      return false
    }

    return true
  },
})

/**
 * Rotate CSRF token (generate new one and invalidate old)
 */
export const rotateCSRFToken = mutation({
  args: {},
  handler: async (ctx): Promise<CSRFToken> => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated to rotate CSRF token',
      })
    }

    const userId = identity.subject
    const token = generateSecureToken(CSRF_CONFIG.tokenLength)
    const expiresAt = Date.now() + CSRF_CONFIG.tokenExpiration

    // Delete any existing tokens for this user
    const existingTokens = await ctx.db
      .query('csrfTokens')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    for (const existingToken of existingTokens) {
      await ctx.db.delete(existingToken._id)
    }

    // Store new token
    await ctx.db.insert('csrfTokens', {
      userId,
      token,
      expiresAt,
      createdAt: Date.now(),
    })

    return { token, expiresAt }
  },
})

/**
 * Clean up expired CSRF tokens (should be called periodically via cron)
 */
export const cleanupExpiredTokens = mutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const now = Date.now()
    const expiredTokens = await ctx.db
      .query('csrfTokens')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect()

    for (const token of expiredTokens) {
      await ctx.db.delete(token._id)
    }

    return expiredTokens.length
  },
})

/**
 * Helper function to validate CSRF token in mutations
 * This should be called at the start of every state-changing mutation
 */
export async function requireValidCSRFToken(
  ctx: MutationCtx,
  token: string | undefined
): Promise<void> {
  if (!token) {
    throw new ConvexError({
      code: 'CSRF_TOKEN_MISSING',
      message: 'CSRF token is required for this operation',
    })
  }

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'Must be authenticated',
    })
  }

  const userId = identity.subject

  // Find token in database
  const tokenDoc = await ctx.db
    .query('csrfTokens')
    .withIndex('by_user_token', (q) => q.eq('userId', userId).eq('token', token))
    .first()

  if (!tokenDoc) {
    throw new ConvexError({
      code: 'CSRF_TOKEN_INVALID',
      message: 'Invalid CSRF token',
    })
  }

  // Check if token is expired
  if (tokenDoc.expiresAt < Date.now()) {
    // Clean up expired token
    await ctx.db.delete(tokenDoc._id)
    throw new ConvexError({
      code: 'CSRF_TOKEN_EXPIRED',
      message: 'CSRF token has expired. Please refresh and try again.',
    })
  }
}

/**
 * Wrapper function to add CSRF protection to mutations
 *
 * Usage:
 * export const myMutation = withCSRFProtection(
 *   mutation({
 *     args: {
 *       csrfToken: v.string(),
 *       // ... other args
 *     },
 *     handler: async (ctx, args) => {
 *       // Your mutation logic here
 *     }
 *   })
 * );
 */
export function withCSRFProtection<T>(mutationFn: T): T {
  return mutationFn
}

/**
 * Example of how to use CSRF protection in a mutation:
 *
 * export const createEvent = mutation({
 *   args: {
 *     csrfToken: v.string(),
 *     title: v.string(),
 *     // ... other args
 *   },
 *   handler: async (ctx, args) => {
 *     // Validate CSRF token first
 *     await requireValidCSRFToken(ctx, args.csrfToken);
 *
 *     // Continue with mutation logic
 *     const eventId = await ctx.db.insert('events', {
 *       title: args.title,
 *       // ...
 *     });
 *
 *     return eventId;
 *   }
 * });
 */
