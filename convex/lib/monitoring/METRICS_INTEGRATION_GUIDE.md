# Metrics Integration Guide

This guide explains how to add metrics collection to Convex API endpoints.

## Overview

The metrics middleware automatically collects:
- **API Request Metrics**: Response times, status codes, endpoint names
- **API Usage Tracking**: User/organization usage per endpoint
- **Database Query Metrics**: Query types, tables, durations

## Quick Start

### Option 1: Wrap Individual Handlers (Recommended for Existing Code)

For existing endpoints, wrap the handler function:

```typescript
import { query, mutation } from './_generated/server';
import { withQueryMetrics, withMutationMetrics } from './lib/monitoring/metricsMiddleware';

// Before:
export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.query('vendors').collect();
  },
});

// After:
export const list = query({
  args: { category: v.optional(v.string()) },
  handler: withQueryMetrics('vendors:list', async (ctx, args) => {
    return await ctx.db.query('vendors').collect();
  }),
});
```

### Option 2: Use Helper Functions (For New Code)

For new endpoints, use the helper functions:

```typescript
import { createMetricsQuery, createMetricsMutation } from './lib/monitoring/metricsMiddleware';

export const list = query(createMetricsQuery({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.query('vendors').collect();
  },
}));

export const create = mutation(createMetricsMutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('vendors', { name: args.name });
  },
}));
```

## Adding Database Query Metrics

For expensive database operations, add explicit database metrics:

```typescript
import { withDatabaseMetrics } from './lib/monitoring/metricsMiddleware';

export const list = query({
  args: {},
  handler: withQueryMetrics('vendors:list', async (ctx, args) => {
    // Wrap database query with metrics
    const vendors = await withDatabaseMetrics(
      () => ctx.db.query('vendors').collect(),
      { queryType: 'read', table: 'vendors' }
    );
    
    return vendors;
  }),
});
```

## Naming Convention

Use a consistent naming pattern for function names:
- Format: `{table}:{operation}`
- Examples:
  - `vendors:list`
  - `vendors:get`
  - `vendors:create`
  - `vendors:update`
  - `vendors:delete`
  - `events:list`
  - `events:create`

This makes it easy to filter and aggregate metrics by table or operation.

## What Gets Tracked

### Automatic Tracking

When you wrap a handler, the middleware automatically tracks:

1. **Response Time**: Time from request start to completion
2. **Status Code**: 200 for success, 500 for errors
3. **User ID**: Extracted from `ctx.auth.userId` if authenticated
4. **Organization ID**: Can be enhanced to extract from user data
5. **Endpoint Name**: The function name you provide
6. **Method Type**: QUERY, MUTATION, or ACTION

### API Usage Tracking

For authenticated requests, the middleware also records:
- User ID
- Organization ID (if available)
- Endpoint accessed
- Action type (query/mutation/action)

This enables tracking:
- API usage per user
- API usage per organization
- Most popular endpoints
- User activity patterns

## Example: Complete File Integration

Here's how to integrate metrics into a complete Convex file:

```typescript
// convex/vendors.ts
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { withQueryMetrics, withMutationMetrics, withDatabaseMetrics } from './lib/monitoring/metricsMiddleware';

// List vendors with metrics
export const list = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: withQueryMetrics('vendors:list', async (ctx, args) => {
    // Wrap the database query
    let vendors = await withDatabaseMetrics(
      () => ctx.db
        .query('vendors')
        .withIndex('by_status', (q) => q.eq('status', 'approved'))
        .collect(),
      { queryType: 'read', table: 'vendors' }
    );

    // Filter logic...
    if (args.category && args.category !== 'all') {
      vendors = vendors.filter((v) => v.category === args.category);
    }

    return vendors;
  }),
});

// Get single vendor with metrics
export const get = query({
  args: { id: v.id('vendors') },
  handler: withQueryMetrics('vendors:get', async (ctx, args) => {
    const vendor = await withDatabaseMetrics(
      () => ctx.db.get(args.id),
      { queryType: 'read', table: 'vendors' }
    );
    
    return vendor;
  }),
});

// Create vendor with metrics
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
  },
  handler: withMutationMetrics('vendors:create', async (ctx, args) => {
    const vendorId = await withDatabaseMetrics(
      () => ctx.db.insert('vendors', {
        name: args.name,
        category: args.category,
        description: args.description,
        status: 'pending',
        createdAt: Date.now(),
      }),
      { queryType: 'write', table: 'vendors' }
    );
    
    return vendorId;
  }),
});

// Update vendor with metrics
export const update = mutation({
  args: {
    id: v.id('vendors'),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: withMutationMetrics('vendors:update', async (ctx, args) => {
    await withDatabaseMetrics(
      () => ctx.db.patch(args.id, {
        ...(args.name && { name: args.name }),
        ...(args.category && { category: args.category }),
        updatedAt: Date.now(),
      }),
      { queryType: 'write', table: 'vendors' }
    );
  }),
});

// Delete vendor with metrics
export const remove = mutation({
  args: { id: v.id('vendors') },
  handler: withMutationMetrics('vendors:delete', async (ctx, args) => {
    await withDatabaseMetrics(
      () => ctx.db.delete(args.id),
      { queryType: 'delete', table: 'vendors' }
    );
  }),
});
```

## Viewing Metrics

Metrics are collected in memory and can be accessed via the `metricsCollector`:

```typescript
import { metricsCollector } from './lib/monitoring/metrics';

// Get all API request metrics
const apiMetrics = metricsCollector.getMetricsByName('api.request');

// Get metrics for a specific endpoint
const vendorListMetrics = metricsCollector.getMetricsByTag('endpoint', 'vendors:list');

// Get metrics for a specific user
const userMetrics = metricsCollector.getMetricsByTag('userId', 'user123');

// Get statistics for response times
const stats = metricsCollector.getMetricStats('api.request');
console.log(`Avg response time: ${stats.avg}ms`);
console.log(`Max response time: ${stats.max}ms`);
```

## Best Practices

1. **Always wrap handlers**: Add metrics to all public queries and mutations
2. **Use consistent naming**: Follow the `{table}:{operation}` pattern
3. **Wrap expensive queries**: Add database metrics for complex queries
4. **Don't wrap internal functions**: Only wrap exported Convex functions
5. **Monitor in production**: Set up dashboards to visualize metrics

## Performance Impact

The metrics middleware has minimal performance impact:
- ~1-2ms overhead per request
- Metrics stored in memory (max 1000 entries)
- No external API calls
- No database writes (metrics are in-memory only)

For production, you may want to:
- Export metrics to external monitoring (Datadog, CloudWatch, etc.)
- Store metrics in database for historical analysis
- Set up alerts based on metric thresholds

## Next Steps

1. Add metrics to all existing endpoints (start with high-traffic ones)
2. Create a metrics dashboard to visualize data
3. Set up alerts for slow queries (>1000ms)
4. Monitor API usage per user/organization
5. Identify and optimize slow endpoints

## Migration Strategy

To add metrics to existing codebase:

1. **Phase 1**: Add to high-traffic endpoints (events, vendors, sponsors)
2. **Phase 2**: Add to authentication and user management
3. **Phase 3**: Add to admin and internal functions
4. **Phase 4**: Add database metrics to expensive queries

Start with Phase 1 and gradually expand coverage.
