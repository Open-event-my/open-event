# Rate Limiting Implementation Guide

This guide explains how to apply rate limiting to Convex endpoints in the Open Event platform.

## Overview

Rate limiting protects public endpoints from abuse by limiting the number of requests a client can make within a time window. The implementation uses a sliding window algorithm and stores rate limit data in the `globalRateLimits` table.

## Quick Start

### 1. Import the middleware

```typescript
import {
  withRateLimit,
  withAuthRateLimit,
  withAPIRateLimit,
  withAIRateLimit,
} from './lib/security/rateLimitMiddleware'
```

### 2. Wrap your endpoint

```typescript
// Before (no rate limiting)
export const myEndpoint = mutation({
  args: { ... },
  handler: async (ctx, args) => { ... },
});

// After (with rate limiting)
export const myEndpoint = mutation(
  withAPIRateLimit({
    args: { ... },
    handler: async (ctx, args) => { ... },
  })
);
```

## Rate Limit Types

### Authentication Endpoints (`withAuthRateLimit`)

**Use for:** Login, signup, password reset, email verification

**Limits:** 5 requests per 15 minutes per IP address

**Example:**

```typescript
export const login = mutation(
  withAuthRateLimit({
    args: {
      email: v.string(),
      password: v.string(),
    },
    handler: async (ctx, args) => {
      // Login logic
    },
  })
)
```

### AI Endpoints (`withAIRateLimit`)

**Use for:** AI agent calls, AI-powered features

**Limits:** 50 requests per hour per user

**Example:**

```typescript
export const generateDescription = action(
  withAIRateLimit({
    args: {
      prompt: v.string(),
    },
    handler: async (ctx, args) => {
      // AI generation logic
    },
  })
)
```

### Public API Endpoints (`withAPIRateLimit`)

**Use for:** Public queries, general API access

**Limits:** 100 requests per minute per user/IP

**Example:**

```typescript
export const listPublicEvents = query(
  withAPIRateLimit({
    args: {},
    handler: async (ctx) => {
      return await ctx.db
        .query('events')
        .filter((q) => q.eq(q.field('isPublic'), true))
        .collect()
    },
  })
)
```

### Custom Rate Limits (`withRateLimit`)

**Use for:** Endpoints with specific requirements

**Example:**

```typescript
import { withRateLimit } from './lib/security/rateLimitMiddleware';

export const uploadFile = mutation(
  withRateLimit({
    args: { ... },
    handler: async (ctx, args) => { ... },
  }, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    keyGenerator: (ctx) => `upload:${ctx.auth?.userId || 'anonymous'}`,
  })
);
```

## Endpoints to Rate Limit

### High Priority (Apply First)

1. **Authentication Endpoints** - Use `withAuthRateLimit`
   - `convex/auth.ts`: login, signup, password reset
   - `convex/emailVerification.ts`: send verification, verify email
   - `convex/passwordReset.ts`: request reset, reset password

2. **AI Endpoints** - Use `withAIRateLimit`
   - `convex/playground.ts`: AI-powered features
   - Any endpoint calling OpenAI API

3. **Public API Endpoints** - Use `withAPIRateLimit`
   - `convex/events.ts`: public event listings
   - `convex/vendors.ts`: public vendor directory
   - `convex/sponsors.ts`: public sponsor directory
   - `convex/publicApplications.ts`: public application forms

### Medium Priority

4. **Webhook Endpoints**
   - `convex/webhooks.ts`: create, update, delete webhooks

5. **Order/Payment Endpoints**
   - `convex/orders.ts`: create order, process payment
   - `convex/stripe.ts`: checkout session creation

6. **User-Generated Content**
   - `convex/inquiries.ts`: send inquiry
   - `convex/eventApplications.ts`: submit application

### Low Priority (Internal/Admin Only)

These endpoints typically don't need rate limiting as they're already protected by authentication:

- Admin-only mutations
- Internal queries
- Authenticated user operations

## Error Handling

When rate limit is exceeded, the middleware throws a `RateLimitError`:

```typescript
{
  message: "Rate limit exceeded. Please try again in 45 seconds.",
  retryAfter: 45, // seconds until reset
  limit: 100, // max requests allowed
  resetAt: 1234567890 // unix timestamp when window resets
}
```

### Frontend Handling

```typescript
try {
  await myMutation({ ... });
} catch (error) {
  if (error.data?.retryAfter) {
    // Show user-friendly message
    toast.error(`Too many requests. Please wait ${error.data.retryAfter} seconds.`);

    // Optionally, retry after the specified time
    setTimeout(() => {
      // Retry the request
    }, error.data.retryAfter * 1000);
  }
}
```

## Testing Rate Limits

### Manual Testing

```typescript
// Test rate limiting in Convex dashboard
for (let i = 0; i < 10; i++) {
  await ctx.runMutation(api.myEndpoint, { ... });
}
// Should succeed for first N requests, then fail
```

### Property-Based Testing

See `convex/lib/security/rateLimiter.property.test.ts` for comprehensive property-based tests.

## Configuration

### Default Limits

Defined in `convex/lib/security/rateLimiter.ts`:

```typescript
export const DEFAULT_RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  ai: { windowMs: 60 * 60 * 1000, maxRequests: 50 },
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  default: { windowMs: 60 * 1000, maxRequests: 60 },
}
```

### Environment Variables

You can override defaults via environment variables:

```bash
RATE_LIMIT_WINDOW_MS=60000 # 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

## Monitoring

Rate limit status is logged for each request:

```typescript
console.log('Rate limit status:', {
  remaining: 95, // requests remaining in window
  resetAt: 1234567890, // when window resets
  limit: 100, // max requests allowed
})
```

### Metrics to Track

1. **Rate limit hits** - How often limits are exceeded
2. **Top rate-limited IPs/users** - Identify potential abuse
3. **Average requests per window** - Tune limits appropriately

## Cleanup

Old rate limit records should be cleaned up periodically:

```typescript
// Add to convex/crons.ts
export default cronJobs
cronJobs.interval(
  'cleanup rate limits',
  { hours: 24 }, // Run daily
  internal.lib.security.rateLimiter.cleanup
)
```

## Best Practices

1. **Start Conservative** - Begin with stricter limits, relax if needed
2. **Monitor Usage** - Track rate limit hits to tune limits
3. **User-Friendly Errors** - Provide clear retry information
4. **Whitelist if Needed** - Allow higher limits for trusted users/IPs
5. **Test Thoroughly** - Ensure limits don't block legitimate usage

## Migration Checklist

- [ ] Add rate limiting to authentication endpoints
- [ ] Add rate limiting to AI endpoints
- [ ] Add rate limiting to public API endpoints
- [ ] Add rate limiting to webhook endpoints
- [ ] Add rate limiting to payment endpoints
- [ ] Add rate limiting to user-generated content endpoints
- [ ] Set up rate limit cleanup cron job
- [ ] Add monitoring for rate limit hits
- [ ] Update frontend error handling
- [ ] Test rate limits in staging
- [ ] Document rate limits in API documentation

## Troubleshooting

### Issue: Legitimate users being rate limited

**Solution:** Increase limits or use user-specific keys instead of IP-based

### Issue: Rate limits not working

**Check:**

1. Middleware is properly applied to endpoint
2. Database has `globalRateLimits` table
3. Rate limiter is using correct key generator

### Issue: Performance impact

**Solution:**

1. Add database indexes on `identifier` and `windowStart`
2. Run cleanup job more frequently
3. Consider caching rate limit status

## Additional Resources

- [Rate Limiting Design Document](../../.kiro/specs/production-readiness/design.md)
- [Property-Based Tests](./rateLimiter.property.test.ts)
- [Rate Limiter Implementation](./rateLimiter.ts)
