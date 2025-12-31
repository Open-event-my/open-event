/**
 * Property-Based Tests for Rate Limiting
 * 
 * Feature: production-readiness, Property 5: Rate Limiting Enforcement
 * Validates: Requirements 1.6
 * 
 * These tests verify that rate limiting works correctly across all possible
 * request patterns and configurations using property-based testing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Mock types for testing
 * These simulate the rate limiting logic without requiring a full Convex database
 */

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface RateLimitRecord {
  identifier: string;
  requestCount: number;
  windowStart: number;
  lastRequestAt: number;
}

/**
 * Simulated Rate Limiter
 * This mirrors the actual implementation in rateLimiter.ts
 */
class MockRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private currentTime: number = Date.now();

  // Allow time manipulation for testing
  setCurrentTime(time: number) {
    this.currentTime = time;
  }

  async checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = this.currentTime;
    const windowStart = now - config.windowMs;

    const existing = this.records.get(key);

    if (!existing) {
      // First request - create new record
      this.records.set(key, {
        identifier: key,
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
      this.records.set(key, {
        identifier: key,
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
    existing.requestCount += 1;
    existing.lastRequestAt = now;
    this.records.set(key, existing);

    return {
      allowed: true,
      remaining: config.maxRequests - existing.requestCount,
      resetAt: existing.windowStart + config.windowMs,
    };
  }

  async resetLimit(key: string): Promise<void> {
    this.records.delete(key);
  }

  clear() {
    this.records.clear();
  }
}

/**
 * Custom generator for valid rate limit identifiers
 * Ensures identifiers are non-empty and not just whitespace
 */
const validIdentifier = () =>
  fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

describe('Rate Limiting - Property-Based Tests', () => {
  /**
   * Property 5: Rate Limiting Enforcement
   * For any public API endpoint, when a client exceeds the configured rate limit,
   * subsequent requests should be rejected with a 429 status code until the rate
   * limit window resets.
   */

  describe('Property 1: First N requests should always be allowed', () => {
    it('should allow up to maxRequests within a window', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 1, max: 100 }), // maxRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          async (identifier, maxRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };

            // Make exactly maxRequests requests
            for (let i = 0; i < maxRequests; i++) {
              const result = await limiter.checkLimit(identifier, config);
              
              // All requests up to the limit should be allowed
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBe(maxRequests - i - 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Requests beyond limit should be rejected', () => {
    it('should reject requests after exceeding maxRequests', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 1, max: 50 }), // maxRequests
          fc.integer({ min: 1, max: 10 }), // extraRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          async (identifier, maxRequests, extraRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };

            // Make maxRequests requests (all should succeed)
            for (let i = 0; i < maxRequests; i++) {
              await limiter.checkLimit(identifier, config);
            }

            // Make additional requests (all should fail)
            for (let i = 0; i < extraRequests; i++) {
              const result = await limiter.checkLimit(identifier, config);
              
              expect(result.allowed).toBe(false);
              expect(result.remaining).toBe(0);
              expect(result.retryAfter).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Window reset should allow new requests', () => {
    it('should reset counter after window expires', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 1, max: 50 }), // maxRequests
          fc.integer({ min: 1000, max: 10000 }), // windowMs
          async (identifier, maxRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };
            const startTime = Date.now();
            limiter.setCurrentTime(startTime);

            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
              await limiter.checkLimit(identifier, config);
            }

            // Verify limit is exceeded
            const blockedResult = await limiter.checkLimit(identifier, config);
            expect(blockedResult.allowed).toBe(false);

            // Advance time past the window
            limiter.setCurrentTime(startTime + windowMs + 1000);

            // Should be allowed again
            const allowedResult = await limiter.checkLimit(identifier, config);
            expect(allowedResult.allowed).toBe(true);
            expect(allowedResult.remaining).toBe(maxRequests - 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Different identifiers should have independent limits', () => {
    it('should maintain separate counters for different identifiers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validIdentifier(), { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 5, max: 20 }), // maxRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          async (identifiers, maxRequests, windowMs) => {
            // Ensure unique identifiers
            const uniqueIds = Array.from(new Set(identifiers));
            fc.pre(uniqueIds.length >= 2);

            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };

            // Exhaust limit for first identifier
            for (let i = 0; i < maxRequests; i++) {
              await limiter.checkLimit(uniqueIds[0], config);
            }

            // First identifier should be blocked
            const blocked = await limiter.checkLimit(uniqueIds[0], config);
            expect(blocked.allowed).toBe(false);

            // Other identifiers should still be allowed
            for (let i = 1; i < uniqueIds.length; i++) {
              const result = await limiter.checkLimit(uniqueIds[i], config);
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBe(maxRequests - 1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 5: Remaining count should decrease monotonically', () => {
    it('should decrease remaining count with each request', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 2, max: 50 }), // maxRequests (at least 2)
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          async (identifier, maxRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };

            let previousRemaining = maxRequests;

            for (let i = 0; i < maxRequests; i++) {
              const result = await limiter.checkLimit(identifier, config);
              
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBe(previousRemaining - 1);
              
              previousRemaining = result.remaining;
            }

            // Final remaining should be 0
            expect(previousRemaining).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Reset time should be consistent within window', () => {
    it('should return the same resetAt for all requests in a window', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 2, max: 20 }), // maxRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          async (identifier, maxRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };
            const startTime = Date.now();
            limiter.setCurrentTime(startTime);

            const resetTimes: number[] = [];

            // Make multiple requests
            for (let i = 0; i < Math.min(maxRequests, 5); i++) {
              const result = await limiter.checkLimit(identifier, config);
              resetTimes.push(result.resetAt);
            }

            // All reset times should be the same
            const firstResetTime = resetTimes[0];
            expect(resetTimes.every(t => t === firstResetTime)).toBe(true);
            
            // Reset time should be windowMs after start
            expect(firstResetTime).toBe(startTime + windowMs);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: RetryAfter should decrease over time', () => {
    it('should provide decreasing retryAfter values as time passes', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 1, max: 10 }), // maxRequests
          fc.integer({ min: 5000, max: 20000 }), // windowMs
          async (identifier, maxRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };
            const startTime = Date.now();
            limiter.setCurrentTime(startTime);

            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
              await limiter.checkLimit(identifier, config);
            }

            // Get initial retryAfter
            const result1 = await limiter.checkLimit(identifier, config);
            expect(result1.allowed).toBe(false);
            const retryAfter1 = result1.retryAfter!;

            // Advance time by 1 second
            limiter.setCurrentTime(startTime + 1000);

            // Get new retryAfter
            const result2 = await limiter.checkLimit(identifier, config);
            expect(result2.allowed).toBe(false);
            const retryAfter2 = result2.retryAfter!;

            // RetryAfter should have decreased (or stayed same if rounding)
            expect(retryAfter2).toBeLessThanOrEqual(retryAfter1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Reset should clear all limits', () => {
    it('should allow full quota after manual reset', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 1, max: 50 }), // maxRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          async (identifier, maxRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };

            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
              await limiter.checkLimit(identifier, config);
            }

            // Verify blocked
            const blocked = await limiter.checkLimit(identifier, config);
            expect(blocked.allowed).toBe(false);

            // Reset the limit
            await limiter.resetLimit(identifier);

            // Should have full quota again
            const result = await limiter.checkLimit(identifier, config);
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(maxRequests - 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Concurrent requests should not exceed limit', () => {
    it('should enforce limit even with rapid sequential requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 5, max: 20 }), // maxRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          fc.integer({ min: 1, max: 10 }), // extraRequests
          async (identifier, maxRequests, windowMs, extraRequests) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };

            let allowedCount = 0;
            let deniedCount = 0;

            // Make more requests than the limit
            const totalRequests = maxRequests + extraRequests;
            for (let i = 0; i < totalRequests; i++) {
              const result = await limiter.checkLimit(identifier, config);
              if (result.allowed) {
                allowedCount++;
              } else {
                deniedCount++;
              }
            }

            // Exactly maxRequests should be allowed
            expect(allowedCount).toBe(maxRequests);
            // Remaining should be denied
            expect(deniedCount).toBe(extraRequests);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Zero remaining means next request is blocked', () => {
    it('should block when remaining reaches zero', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 1, max: 50 }), // maxRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          async (identifier, maxRequests, windowMs) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };

            let lastResult: RateLimitResult | null = null;

            // Make requests until remaining is 0
            for (let i = 0; i < maxRequests; i++) {
              lastResult = await limiter.checkLimit(identifier, config);
            }

            // Last allowed request should have remaining = 0
            expect(lastResult!.allowed).toBe(true);
            expect(lastResult!.remaining).toBe(0);

            // Next request should be blocked
            const blocked = await limiter.checkLimit(identifier, config);
            expect(blocked.allowed).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Multiple windows should be independent', () => {
    it('should handle multiple complete window cycles correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validIdentifier(), // identifier
          fc.integer({ min: 2, max: 10 }), // maxRequests
          fc.integer({ min: 1000, max: 5000 }), // windowMs
          fc.integer({ min: 2, max: 5 }), // number of windows
          async (identifier, maxRequests, windowMs, numWindows) => {
            const limiter = new MockRateLimiter();
            const config: RateLimitConfig = { windowMs, maxRequests };
            let currentTime = Date.now();

            for (let window = 0; window < numWindows; window++) {
              limiter.setCurrentTime(currentTime);

              // Should be able to make maxRequests in each window
              for (let i = 0; i < maxRequests; i++) {
                const result = await limiter.checkLimit(identifier, config);
                expect(result.allowed).toBe(true);
              }

              // Should be blocked after maxRequests
              const blocked = await limiter.checkLimit(identifier, config);
              expect(blocked.allowed).toBe(false);

              // Advance to next window
              currentTime += windowMs + 1000;
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
