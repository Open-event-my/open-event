/**
 * Rate Limiting Middleware for Convex Functions
 *
 * This module provides middleware to apply rate limiting to Convex queries,
 * mutations, and actions. It integrates with the RateLimiter service to
 * enforce request limits on public endpoints.
 *
 * Usage:
 * ```typescript
 * import { withRateLimit } from './lib/security/rateLimitMiddleware';
 * import { DEFAULT_RATE_LIMITS } from './lib/security/rateLimiter';
 *
 * export const myPublicEndpoint = mutation(
 *   withRateLimit({
 *     args: { ... },
 *     handler: async (ctx, args) => { ... },
 *   }, DEFAULT_RATE_LIMITS.api)
 * );
 * ```
 */

import { ConvexError } from 'convex/values'
import type { RateLimitConfig } from './rateLimiter'
import { RateLimiter, generateRateLimitKey } from './rateLimiter'
import type {
  MutationCtx,
  QueryCtx,
  ActionCtx,
  DatabaseReader,
  DatabaseWriter,
} from '../../_generated/server'

/**
 * Union type for all Convex context types
 */
type ConvexCtx = MutationCtx | QueryCtx | ActionCtx

/**
 * Context type with database access (for rate limiting)
 */
interface CtxWithDb {
  db: DatabaseReader & DatabaseWriter
  auth?: { userId?: string }
  request?: { ip?: string }
}

/**
 * Generic args type for Convex function arguments
 */
type FunctionArgs = Record<string, unknown>

/**
 * Rate limit error that includes retry information
 */
export class RateLimitError extends ConvexError<{
  retryAfter: number
  limit: number
  resetAt: number
}> {
  constructor(retryAfter: number, limit: number, resetAt: number) {
    super({
      retryAfter,
      limit,
      resetAt,
    })
  }
}

/**
 * Middleware wrapper for mutations with rate limiting
 *
 * @param definition - The mutation definition (args + handler)
 * @param config - Rate limit configuration
 * @returns Wrapped mutation definition with rate limiting
 */
export function withRateLimit<Args extends FunctionArgs, Output, Ctx extends ConvexCtx>(
  definition: {
    args: Args
    handler: (ctx: Ctx, args: Args) => Promise<Output>
  },
  config: RateLimitConfig
) {
  return {
    args: definition.args,
    handler: async (ctx: Ctx, args: Args): Promise<Output> => {
      // Only apply rate limiting if we have database access (mutations/queries)
      if ('db' in ctx) {
        const ctxWithDb = ctx as unknown as CtxWithDb
        const rateLimiter = new RateLimiter(ctxWithDb.db)
        const key = config.keyGenerator ? config.keyGenerator(ctx) : generateRateLimitKey(ctx)

        const result = await rateLimiter.checkLimit(key, config)

        if (!result.allowed) {
          throw new RateLimitError(result.retryAfter!, config.maxRequests, result.resetAt)
        }

        // Add rate limit info to response headers if available
        // Note: Convex doesn't support custom response headers directly,
        // but we can include this info in the response or logs
        console.log('Rate limit status:', {
          remaining: result.remaining,
          resetAt: result.resetAt,
          limit: config.maxRequests,
        })
      }

      // Execute the original handler
      return definition.handler(ctx, args)
    },
  }
}

/**
 * Apply rate limiting to authentication endpoints
 * Uses stricter limits to prevent brute force attacks
 */
export function withAuthRateLimit<
  Args extends FunctionArgs,
  Output,
  Ctx extends ConvexCtx,
>(definition: { args: Args; handler: (ctx: Ctx, args: Args) => Promise<Output> }) {
  return withRateLimit(definition, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: (ctx: CtxWithDb) => {
      // For auth endpoints, use IP address if available
      const ip = ctx.request?.ip || 'unknown'
      return `auth:${ip}`
    },
  })
}

/**
 * Apply rate limiting to AI endpoints
 * Uses moderate limits to prevent API abuse
 */
export function withAIRateLimit<
  Args extends FunctionArgs,
  Output,
  Ctx extends ConvexCtx,
>(definition: { args: Args; handler: (ctx: Ctx, args: Args) => Promise<Output> }) {
  return withRateLimit(definition, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 AI requests per hour
    keyGenerator: (ctx: CtxWithDb) => {
      // For AI endpoints, use user ID if authenticated
      const userId = ctx.auth?.userId || 'anonymous'
      return `ai:${userId}`
    },
  })
}

/**
 * Apply rate limiting to public API endpoints
 * Uses standard limits for general API access
 */
export function withAPIRateLimit<
  Args extends FunctionArgs,
  Output,
  Ctx extends ConvexCtx,
>(definition: { args: Args; handler: (ctx: Ctx, args: Args) => Promise<Output> }) {
  return withRateLimit(definition, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (ctx: CtxWithDb) => {
      // For API endpoints, use user ID or IP
      const userId = ctx.auth?.userId
      const ip = ctx.request?.ip || 'unknown'
      return userId ? `api:user:${userId}` : `api:ip:${ip}`
    },
  })
}

/**
 * Example: Apply rate limiting to a public query
 *
 * ```typescript
 * export const listPublicEvents = query(
 *   withAPIRateLimit({
 *     args: {},
 *     handler: async (ctx) => {
 *       return await ctx.db.query('events')
 *         .filter(q => q.eq(q.field('isPublic'), true))
 *         .collect();
 *     },
 *   })
 * );
 * ```
 */

/**
 * Example: Apply rate limiting to a login mutation
 *
 * ```typescript
 * export const login = mutation(
 *   withAuthRateLimit({
 *     args: {
 *       email: v.string(),
 *       password: v.string(),
 *     },
 *     handler: async (ctx, args) => {
 *       // Login logic here
 *     },
 *   })
 * );
 * ```
 */

/**
 * Example: Apply rate limiting to an AI action
 *
 * ```typescript
 * export const generateEventDescription = action(
 *   withAIRateLimit({
 *     args: {
 *       eventTitle: v.string(),
 *     },
 *     handler: async (ctx, args) => {
 *       // AI generation logic here
 *     },
 *   })
 * );
 * ```
 */
