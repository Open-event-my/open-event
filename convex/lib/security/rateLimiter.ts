/**
 * Rate Limiter Service
 * 
 * Implements sliding window rate limiting to protect public endpoints from abuse.
 * Uses the globalRateLimits table to track request counts per identifier (IP, user, etc.)
 * 
 * Features:
 * - Sliding window algorithm for accurate rate limiting
 * - Configurable limits per endpoint type
 * - Support for multiple identifier types (IP, user ID, API key)
 * - Automatic window cleanup
 */

import type { DatabaseReader, DatabaseWriter } from '../../_generated/server';

/**
 * Rate limit configuration for different endpoint types
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in window
  keyGenerator?: (ctx: any) => string; // Custom key generator function
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  allowed: boolean; // Whether the request is allowed
  remaining: number; // Requests remaining in current window
  resetAt: number; // Unix timestamp when the window resets
  retryAfter?: number; // Seconds to wait before retrying (if blocked)
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints (login, signup, password reset)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  
  // AI agent endpoints
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 AI requests per hour
  },
  
  // Public API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  
  // Default for all other endpoints
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
};

/**
 * Rate Limiter class implementing sliding window algorithm
 */
export class RateLimiter {
  private db: DatabaseReader & DatabaseWriter;
  
  constructor(db: DatabaseReader & DatabaseWriter) {
    this.db = db;
  }
  
  /**
   * Check if a request should be allowed based on rate limits
   * 
   * @param key - Unique identifier for the rate limit (IP, user ID, etc.)
   * @param config - Rate limit configuration
   * @returns Rate limit result with allowed status and metadata
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Find existing rate limit record
    const existing = await this.db
      .query('globalRateLimits')
      .withIndex('by_identifier', (q) => q.eq('identifier', key))
      .first();
    
    if (!existing) {
      // First request - create new record
      await this.db.insert('globalRateLimits', {
        identifier: key,
        type: 'default',
        requestCount: 1,
        windowStart: now,
        lastRequestAt: now,
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }
    
    // Check if we need to reset the window
    if (existing.windowStart < windowStart) {
      // Window has expired - reset counter
      await this.db.patch(existing._id, {
        requestCount: 1,
        windowStart: now,
        lastRequestAt: now,
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      };
    }
    
    // Window is still active - check if limit exceeded
    if (existing.requestCount >= config.maxRequests) {
      // Rate limit exceeded
      const resetAt = existing.windowStart + config.windowMs;
      const retryAfter = Math.ceil((resetAt - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }
    
    // Increment counter
    await this.db.patch(existing._id, {
      requestCount: existing.requestCount + 1,
      lastRequestAt: now,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - existing.requestCount - 1,
      resetAt: existing.windowStart + config.windowMs,
    };
  }
  
  /**
   * Reset rate limit for a specific key
   * Useful for testing or manual intervention
   * 
   * @param key - Identifier to reset
   */
  async resetLimit(key: string): Promise<void> {
    const existing = await this.db
      .query('globalRateLimits')
      .withIndex('by_identifier', (q) => q.eq('identifier', key))
      .first();
    
    if (existing) {
      await this.db.delete(existing._id);
    }
  }
  
  /**
   * Clean up expired rate limit records
   * Should be called periodically (e.g., via cron job)
   * 
   * @param olderThanMs - Delete records older than this many milliseconds
   */
  async cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const expired = await this.db
      .query('globalRateLimits')
      .withIndex('by_window', (q) => q.lt('windowStart', cutoff))
      .collect();
    
    for (const record of expired) {
      await this.db.delete(record._id);
    }
    
    return expired.length;
  }
  
  /**
   * Get current rate limit status for a key without incrementing
   * 
   * @param key - Identifier to check
   * @param config - Rate limit configuration
   * @returns Current status
   */
  async getStatus(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    const existing = await this.db
      .query('globalRateLimits')
      .withIndex('by_identifier', (q) => q.eq('identifier', key))
      .first();
    
    if (!existing || existing.windowStart < windowStart) {
      // No active limit or window expired
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
    
    const remaining = Math.max(0, config.maxRequests - existing.requestCount);
    const allowed = remaining > 0;
    const resetAt = existing.windowStart + config.windowMs;
    
    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    };
  }
}

/**
 * Helper function to generate rate limit key from context
 * 
 * @param ctx - Request context
 * @param type - Type of rate limit (auth, api, ai, default)
 * @returns Unique key for rate limiting
 */
export function generateRateLimitKey(ctx: any, type: string = 'default'): string {
  // Try to get user ID first
  if (ctx.auth?.userId) {
    return `user:${ctx.auth.userId}:${type}`;
  }
  
  // Fall back to IP address if available
  if (ctx.request?.ip) {
    return `ip:${ctx.request.ip}:${type}`;
  }
  
  // Last resort: use a generic key (not recommended for production)
  return `anonymous:${type}`;
}

/**
 * Middleware wrapper to apply rate limiting to Convex functions
 * 
 * @param handler - The Convex function to wrap
 * @param config - Rate limit configuration
 * @returns Wrapped function with rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => any>(
  handler: T,
  config: RateLimitConfig
): T {
  return (async (ctx: any, ...args: any[]) => {
    const rateLimiter = new RateLimiter(ctx.db);
    const key = config.keyGenerator ? config.keyGenerator(ctx) : generateRateLimitKey(ctx);
    
    const result = await rateLimiter.checkLimit(key, config);
    
    if (!result.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
      );
    }
    
    // Add rate limit headers to response (if supported)
    if (ctx.response) {
      ctx.response.headers = {
        ...ctx.response.headers,
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toString(),
      };
    }
    
    return handler(ctx, ...args);
  }) as T;
}
