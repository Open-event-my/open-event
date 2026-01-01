/**
 * Global Rate Limiting
 *
 * IP-based rate limiting to protect all API endpoints from abuse.
 * Uses a sliding window approach for accurate rate limiting.
 */

import { v } from 'convex/values'
import { query, internalMutation, internalQuery } from './_generated/server'
import { getCurrentUser } from './lib/auth'
import { AppError, ErrorCodes } from './lib/errors'

// ============================================================================
// Configuration
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  // Default limits for different endpoint types
  LIMITS: {
    // Auth endpoints (login, signup) - stricter limits
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 20, // 20 requests per 15 minutes
    },
    // Public API endpoints
    api: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
    },
    // AI/Chat endpoints - more restrictive
    ai: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 requests per minute
    },
    // Admin panel operations - prevent abuse
    admin: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 admin ops per minute
    },
    // General endpoints
    default: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    },
  },
} as const

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG.LIMITS

// ============================================================================
// Types
// ============================================================================

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number // Unix timestamp when limit resets
  retryAfter?: number // Seconds until retry is allowed
}

// ============================================================================
// Convex Functions
// ============================================================================

/**
 * Check if a request is allowed under rate limits (read-only)
 */
export const checkRateLimit = internalQuery({
  args: {
    identifier: v.string(), // IP address or user ID
    type: v.string(), // 'auth' | 'api' | 'ai' | 'default'
  },
  handler: async (ctx, args): Promise<RateLimitResult> => {
    const config =
      RATE_LIMIT_CONFIG.LIMITS[args.type as RateLimitType] || RATE_LIMIT_CONFIG.LIMITS.default
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Query for existing record
    const record = await ctx.db
      .query('globalRateLimits')
      .withIndex('by_identifier_type', (q) =>
        q.eq('identifier', args.identifier).eq('type', args.type)
      )
      .first()

    // No record or expired window
    if (!record || record.windowStart < windowStart) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        limit: config.maxRequests,
        resetAt: now + config.windowMs,
      }
    }

    // Check if over limit
    if (record.requestCount >= config.maxRequests) {
      const resetAt = record.windowStart + config.windowMs
      return {
        allowed: false,
        remaining: 0,
        limit: config.maxRequests,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      }
    }

    return {
      allowed: true,
      remaining: config.maxRequests - record.requestCount,
      limit: config.maxRequests,
      resetAt: record.windowStart + config.windowMs,
    }
  },
})

/**
 * Check and increment rate limit atomically
 * Returns whether the request is allowed and increments the counter
 */
export const checkAndIncrement = internalMutation({
  args: {
    identifier: v.string(), // IP address or user ID
    type: v.string(), // 'auth' | 'api' | 'ai' | 'default'
  },
  handler: async (ctx, args): Promise<RateLimitResult> => {
    const config =
      RATE_LIMIT_CONFIG.LIMITS[args.type as RateLimitType] || RATE_LIMIT_CONFIG.LIMITS.default
    const now = Date.now()
    const windowStart = now - config.windowMs
    const currentWindowStart = Math.floor(now / config.windowMs) * config.windowMs

    // Query for existing record
    const record = await ctx.db
      .query('globalRateLimits')
      .withIndex('by_identifier_type', (q) =>
        q.eq('identifier', args.identifier).eq('type', args.type)
      )
      .first()

    // No record exists - create new one
    if (!record) {
      await ctx.db.insert('globalRateLimits', {
        identifier: args.identifier,
        type: args.type,
        requestCount: 1,
        windowStart: currentWindowStart,
        lastRequestAt: now,
      })

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        limit: config.maxRequests,
        resetAt: currentWindowStart + config.windowMs,
      }
    }

    // Record exists but window has expired - reset
    if (record.windowStart < windowStart) {
      await ctx.db.patch(record._id, {
        requestCount: 1,
        windowStart: currentWindowStart,
        lastRequestAt: now,
      })

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        limit: config.maxRequests,
        resetAt: currentWindowStart + config.windowMs,
      }
    }

    // Check if over limit
    if (record.requestCount >= config.maxRequests) {
      const resetAt = record.windowStart + config.windowMs
      return {
        allowed: false,
        remaining: 0,
        limit: config.maxRequests,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      }
    }

    // Increment counter
    await ctx.db.patch(record._id, {
      requestCount: record.requestCount + 1,
      lastRequestAt: now,
    })

    return {
      allowed: true,
      remaining: config.maxRequests - record.requestCount - 1,
      limit: config.maxRequests,
      resetAt: record.windowStart + config.windowMs,
    }
  },
})

/**
 * Clean up old rate limit records
 * Run periodically to prevent table bloat
 */
export const cleanupOldRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Remove records older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    const oldRecords = await ctx.db
      .query('globalRateLimits')
      .withIndex('by_window')
      .filter((q) => q.lt(q.field('windowStart'), oneHourAgo))
      .take(500) // Process in batches

    for (const record of oldRecords) {
      await ctx.db.delete(record._id)
    }

    return { deleted: oldRecords.length }
  },
})

// ============================================================================
// Admin Queries (require admin role)
// ============================================================================

/**
 * Get rate limit statistics (admin only)
 */
export const getStats = query({
  args: {
    hoursBack: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      throw new AppError('Admin access required', ErrorCodes.FORBIDDEN, 403)
    }

    const hoursBack = args.hoursBack || 1
    const startTime = Date.now() - hoursBack * 60 * 60 * 1000

    const records = await ctx.db
      .query('globalRateLimits')
      .withIndex('by_window')
      .filter((q) => q.gte(q.field('windowStart'), startTime))
      .collect()

    const stats = {
      totalRecords: records.length,
      totalRequests: records.reduce((sum, r) => sum + r.requestCount, 0),
      byType: {} as Record<string, { count: number; requests: number }>,
      topIPs: [] as { ip: string; requests: number; type: string }[],
    }

    for (const record of records) {
      if (!stats.byType[record.type]) {
        stats.byType[record.type] = { count: 0, requests: 0 }
      }
      stats.byType[record.type].count++
      stats.byType[record.type].requests += record.requestCount
    }

    // Find top IPs by request count
    const ipMap = new Map<string, { requests: number; type: string }>()
    for (const record of records) {
      const key = `${record.identifier}:${record.type}`
      const existing = ipMap.get(key)
      if (!existing || record.requestCount > existing.requests) {
        ipMap.set(key, { requests: record.requestCount, type: record.type })
      }
    }

    stats.topIPs = Array.from(ipMap.entries())
      .map(([key, val]) => ({
        ip: key.split(':')[0],
        requests: val.requests,
        type: val.type,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    return stats
  },
})

/**
 * List active rate limit records (admin only)
 */
export const listActiveRecords = query({
  args: {
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      throw new AppError('Admin access required', ErrorCodes.FORBIDDEN, 403)
    }

    const limit = args.limit || 50
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    let records = await ctx.db
      .query('globalRateLimits')
      .withIndex('by_window')
      .filter((q) => q.gte(q.field('windowStart'), oneHourAgo))
      .order('desc')
      .take(limit * 2)

    if (args.type) {
      records = records.filter((r) => r.type === args.type)
    }

    return records.slice(0, limit).map((r) => ({
      ...r,
      config: RATE_LIMIT_CONFIG.LIMITS[r.type as RateLimitType] || RATE_LIMIT_CONFIG.LIMITS.default,
      percentUsed: Math.round(
        (r.requestCount /
          (RATE_LIMIT_CONFIG.LIMITS[r.type as RateLimitType]?.maxRequests ||
            RATE_LIMIT_CONFIG.LIMITS.default.maxRequests)) *
          100
      ),
    }))
  },
})

/**
 * Get rate limit configuration (admin only)
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      throw new AppError('Admin access required', ErrorCodes.FORBIDDEN, 403)
    }

    return RATE_LIMIT_CONFIG
  },
})

// ============================================================================
// Helper Functions for HTTP Actions
// ============================================================================

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Try various headers in order of preference
  const headers = [
    'CF-Connecting-IP', // Cloudflare
    'X-Real-IP', // Nginx
    'X-Forwarded-For', // Standard proxy header
  ]

  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // X-Forwarded-For can contain multiple IPs, take the first
      return value.split(',')[0].trim()
    }
  }

  // Default to unknown if no IP found
  return 'unknown'
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
    ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
  }
}

/**
 * Create a 429 Too Many Requests response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${result.retryAfter || 60} seconds.`,
      retryAfter: result.retryAfter,
      limit: result.limit,
      resetAt: result.resetAt,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...rateLimitHeaders(result),
        ...corsHeaders,
      },
    }
  )
}
