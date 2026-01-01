/**
 * Global Rate Limit Tests
 *
 * Tests for the rate limiting configuration and helper functions.
 * Note: Convex mutation/query handlers require integration testing with Convex.
 */

import { describe, it, expect } from 'vitest'
import {
  RATE_LIMIT_CONFIG,
  getClientIP,
  rateLimitHeaders,
  rateLimitResponse,
  type RateLimitResult,
} from '../../convex/globalRateLimit'

describe('Rate Limit Configuration', () => {
  describe('RATE_LIMIT_CONFIG.LIMITS', () => {
    it('should have auth endpoint limits configured', () => {
      const auth = RATE_LIMIT_CONFIG.LIMITS.auth
      expect(auth.windowMs).toBe(15 * 60 * 1000) // 15 minutes
      expect(auth.maxRequests).toBe(20)
    })

    it('should have api endpoint limits configured', () => {
      const api = RATE_LIMIT_CONFIG.LIMITS.api
      expect(api.windowMs).toBe(60 * 1000) // 1 minute
      expect(api.maxRequests).toBe(60)
    })

    it('should have ai endpoint limits configured', () => {
      const ai = RATE_LIMIT_CONFIG.LIMITS.ai
      expect(ai.windowMs).toBe(60 * 1000) // 1 minute
      expect(ai.maxRequests).toBe(10)
    })

    it('should have default limits configured', () => {
      const defaultLimit = RATE_LIMIT_CONFIG.LIMITS.default
      expect(defaultLimit.windowMs).toBe(60 * 1000) // 1 minute
      expect(defaultLimit.maxRequests).toBe(100)
    })

    it('should have stricter limits for auth than api', () => {
      const auth = RATE_LIMIT_CONFIG.LIMITS.auth
      const api = RATE_LIMIT_CONFIG.LIMITS.api

      // Auth has longer window but fewer requests per window
      expect(auth.windowMs).toBeGreaterThan(api.windowMs)
      // Auth has fewer total requests
      expect(auth.maxRequests).toBeLessThan(api.maxRequests)
    })

    it('should have stricter limits for ai than api', () => {
      const ai = RATE_LIMIT_CONFIG.LIMITS.ai
      const api = RATE_LIMIT_CONFIG.LIMITS.api

      expect(ai.maxRequests).toBeLessThan(api.maxRequests)
    })
  })
})

describe('getClientIP', () => {
  it('should extract IP from CF-Connecting-IP header (Cloudflare)', () => {
    const request = new Request('https://example.com', {
      headers: { 'CF-Connecting-IP': '203.0.113.50' },
    })
    expect(getClientIP(request)).toBe('203.0.113.50')
  })

  it('should extract IP from X-Real-IP header (Nginx)', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Real-IP': '198.51.100.25' },
    })
    expect(getClientIP(request)).toBe('198.51.100.25')
  })

  it('should extract first IP from X-Forwarded-For header', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Forwarded-For': '192.0.2.100, 10.0.0.1, 172.16.0.1' },
    })
    expect(getClientIP(request)).toBe('192.0.2.100')
  })

  it('should prioritize CF-Connecting-IP over other headers', () => {
    const request = new Request('https://example.com', {
      headers: {
        'CF-Connecting-IP': '203.0.113.50',
        'X-Real-IP': '198.51.100.25',
        'X-Forwarded-For': '192.0.2.100',
      },
    })
    expect(getClientIP(request)).toBe('203.0.113.50')
  })

  it('should prioritize X-Real-IP over X-Forwarded-For', () => {
    const request = new Request('https://example.com', {
      headers: {
        'X-Real-IP': '198.51.100.25',
        'X-Forwarded-For': '192.0.2.100',
      },
    })
    expect(getClientIP(request)).toBe('198.51.100.25')
  })

  it('should return "unknown" if no IP header is present', () => {
    const request = new Request('https://example.com')
    expect(getClientIP(request)).toBe('unknown')
  })

  it('should trim whitespace from IP addresses', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Forwarded-For': '  192.0.2.100  ,  10.0.0.1  ' },
    })
    expect(getClientIP(request)).toBe('192.0.2.100')
  })
})

describe('rateLimitHeaders', () => {
  it('should return correct headers for allowed request', () => {
    const result: RateLimitResult = {
      allowed: true,
      remaining: 50,
      limit: 100,
      resetAt: 1704067200000,
    }

    const headers = rateLimitHeaders(result)

    expect(headers['X-RateLimit-Limit']).toBe('100')
    expect(headers['X-RateLimit-Remaining']).toBe('50')
    expect(headers['X-RateLimit-Reset']).toBe('1704067200000')
    expect(headers['Retry-After']).toBeUndefined()
  })

  it('should include Retry-After header when rate limited', () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 100,
      resetAt: 1704067200000,
      retryAfter: 30,
    }

    const headers = rateLimitHeaders(result)

    expect(headers['X-RateLimit-Limit']).toBe('100')
    expect(headers['X-RateLimit-Remaining']).toBe('0')
    expect(headers['Retry-After']).toBe('30')
  })
})

describe('rateLimitResponse', () => {
  it('should return 429 status code', () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 60,
      resetAt: 1704067200000,
      retryAfter: 45,
    }

    const response = rateLimitResponse(result)

    expect(response.status).toBe(429)
  })

  it('should have correct Content-Type header', () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 60,
      resetAt: 1704067200000,
      retryAfter: 45,
    }

    const response = rateLimitResponse(result)

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('should include rate limit headers', () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 60,
      resetAt: 1704067200000,
      retryAfter: 45,
    }

    const response = rateLimitResponse(result)

    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('Retry-After')).toBe('45')
  })

  it('should include provided CORS headers', () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 60,
      resetAt: 1704067200000,
      retryAfter: 45,
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://example.com',
    }

    const response = rateLimitResponse(result, corsHeaders)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com')
  })

  it('should have correct JSON body structure', async () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 60,
      resetAt: 1704067200000,
      retryAfter: 45,
    }

    const response = rateLimitResponse(result)
    const body = await response.json()

    expect(body.error).toBe('Rate limit exceeded')
    expect(body.message).toContain('45 seconds')
    expect(body.retryAfter).toBe(45)
    expect(body.limit).toBe(60)
    expect(body.resetAt).toBe(1704067200000)
  })

  it('should default retryAfter to 60 seconds in message if not provided', async () => {
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 60,
      resetAt: 1704067200000,
    }

    const response = rateLimitResponse(result)
    const body = await response.json()

    expect(body.message).toContain('60 seconds')
  })
})

describe('RateLimitResult Interface', () => {
  it('should correctly type check an allowed result', () => {
    const result: RateLimitResult = {
      allowed: true,
      remaining: 99,
      limit: 100,
      resetAt: Date.now() + 60000,
    }
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(99)
    expect(result.retryAfter).toBeUndefined()
  })

  it('should correctly type check a rate limited result', () => {
    const now = Date.now()
    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      limit: 100,
      resetAt: now + 60000,
      retryAfter: 60,
    }
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBe(60)
  })
})
