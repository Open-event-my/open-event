# Open Event - Open Source API Guide

This guide explains how to transform Open Event into a fully-featured open-source API that external developers can use to build integrations, mobile apps, and third-party services.

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [API Design Strategy](#api-design-strategy)
4. [Implementation Plan](#implementation-plan)
5. [Building the Public API](#building-the-public-api)
6. [API Authentication](#api-authentication)
7. [Rate Limiting](#rate-limiting)
8. [API Versioning](#api-versioning)
9. [OpenAPI Documentation](#openapi-documentation)
10. [SDKs & Client Libraries](#sdks--client-libraries)
11. [Webhooks](#webhooks)
12. [Security Best Practices](#security-best-practices)
13. [Deployment & Monitoring](#deployment--monitoring)

---

## Overview

### What We're Building

Transform Open Event from a web application into a **platform with a public API** that allows:

- **Third-party developers** to build apps on top of Open Event
- **Mobile applications** to access event data
- **Integrations** with other platforms (Zapier, Slack, etc.)
- **Vendors/Sponsors** to build their own portals
- **Analytics tools** to consume event data

### API Goals

| Goal               | Description                                |
| ------------------ | ------------------------------------------ |
| **RESTful Design** | Intuitive, resource-based endpoints        |
| **Type Safety**    | Full TypeScript types for all endpoints    |
| **Documentation**  | OpenAPI/Swagger spec with interactive docs |
| **Authentication** | API keys + OAuth for different use cases   |
| **Rate Limiting**  | Protect the API from abuse                 |
| **Versioning**     | Support multiple API versions              |
| **Webhooks**       | Real-time event notifications              |

---

## Current Architecture

### How Convex Works

Open Event uses **Convex** as its backend. Convex provides:

```
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend                            │
├─────────────────────────────────────────────────────────────┤
│  Queries        │  Mutations     │  HTTP Actions           │
│  (Read data)    │  (Write data)  │  (REST endpoints)       │
├─────────────────┴────────────────┴─────────────────────────┤
│                    Database (Real-time)                      │
└─────────────────────────────────────────────────────────────┘
```

### Current HTTP Endpoints

The project already has some HTTP endpoints in `convex/http.ts`:

```typescript
// Health check
GET / api / health

// AI Chat (streaming)
POST / api / chat / stream
POST / api / chat / execute - tool
```

### Convex HTTP Actions

Convex uses `httpAction` to create REST-like endpoints:

```typescript
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'

const http = httpRouter()

http.route({
  path: '/api/v1/events',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Your logic here
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

export default http
```

---

## API Design Strategy

### Resource Structure

```
/api/v1/
├── /events                    # Event management
│   ├── GET    /              # List events
│   ├── POST   /              # Create event
│   ├── GET    /:id           # Get event
│   ├── PATCH  /:id           # Update event
│   ├── DELETE /:id           # Delete event
│   ├── GET    /:id/vendors   # Event vendors
│   ├── GET    /:id/sponsors  # Event sponsors
│   ├── GET    /:id/tasks     # Event tasks
│   └── GET    /:id/budget    # Event budget
│
├── /vendors                   # Vendor directory
│   ├── GET    /              # List vendors
│   ├── GET    /:id           # Get vendor
│   └── GET    /categories    # Get categories
│
├── /sponsors                  # Sponsor directory
│   ├── GET    /              # List sponsors
│   ├── GET    /:id           # Get sponsor
│   └── GET    /industries    # Get industries
│
├── /applications              # Applications
│   ├── POST   /vendor        # Vendor application
│   └── POST   /sponsor       # Sponsor application
│
├── /users                     # User management
│   ├── GET    /me            # Current user
│   └── PATCH  /me            # Update profile
│
└── /webhooks                  # Webhook management
    ├── GET    /              # List webhooks
    ├── POST   /              # Create webhook
    └── DELETE /:id           # Delete webhook
```

### Response Format

Standardize all API responses:

```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid event date",
    "details": [
      { "field": "startDate", "message": "Must be a future date" }
    ]
  }
}
```

---

## Implementation Plan

### Phase 1: Core API Infrastructure

```
Week 1-2:
├── [ ] Create API router structure
├── [ ] Implement API key authentication
├── [ ] Add rate limiting
├── [ ] Set up error handling
└── [ ] Create response helpers
```

### Phase 2: Public Endpoints

```
Week 3-4:
├── [ ] Events API (CRUD)
├── [ ] Vendors API (read-only public)
├── [ ] Sponsors API (read-only public)
├── [ ] Public event directory
└── [ ] Search endpoints
```

### Phase 3: Protected Endpoints

```
Week 5-6:
├── [ ] User management API
├── [ ] Event tasks API
├── [ ] Budget API
├── [ ] Inquiries API
└── [ ] Applications API
```

### Phase 4: Advanced Features

```
Week 7-8:
├── [ ] Webhooks system
├── [ ] OpenAPI documentation
├── [ ] SDK generation
├── [ ] API analytics
└── [ ] Developer portal
```

---

## Building the Public API

### Step 1: Create API Infrastructure

Create a new file `convex/api/helpers.ts`:

```typescript
// convex/api/helpers.ts
import { httpAction } from '../_generated/server'

// Standard CORS headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
}

// Success response helper
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      ...(meta && { meta }),
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// Error response helper
export function apiError(code: string, message: string, status: number = 400, details?: unknown[]) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// Parse JSON body safely
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

// Extract pagination params
export function getPagination(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

// Extract path params (e.g., /events/:id)
export function getPathParam(path: string, pattern: string): string | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      return pathParts[i] || null
    }
  }
  return null
}
```

### Step 2: Create API Key System

Add API keys to the database schema in `convex/schema.ts`:

```typescript
// Add to schema.ts

// API Keys for external access
apiKeys: defineTable({
  userId: v.id('users'),
  name: v.string(),                    // "My App", "Production Key"
  key: v.string(),                     // Hashed key (never store plain)
  keyPrefix: v.string(),               // First 8 chars for identification
  permissions: v.array(v.string()),    // ["events:read", "events:write"]
  rateLimit: v.optional(v.number()),   // Custom rate limit (per hour)
  lastUsedAt: v.optional(v.number()),
  expiresAt: v.optional(v.number()),
  status: v.union(v.literal('active'), v.literal('revoked')),
  createdAt: v.number(),
})
  .index('by_key_prefix', ['keyPrefix'])
  .index('by_user', ['userId'])
  .index('by_status', ['status']),

// API Usage tracking
apiUsage: defineTable({
  apiKeyId: v.id('apiKeys'),
  endpoint: v.string(),
  method: v.string(),
  statusCode: v.number(),
  responseTime: v.number(),           // ms
  timestamp: v.number(),
})
  .index('by_key', ['apiKeyId'])
  .index('by_timestamp', ['timestamp']),
```

Create API key management in `convex/apiKeys.ts`:

```typescript
// convex/apiKeys.ts
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser } from './lib/auth'

// Generate a secure API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const prefix = 'oe_live_' // "oe" for Open Event
  let key = prefix
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

// Hash API key for storage (use proper hashing in production)
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Create a new API key
export const create = mutation({
  args: {
    name: v.string(),
    permissions: v.array(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    // Generate the key
    const plainKey = generateApiKey()
    const hashedKey = await hashKey(plainKey)
    const keyPrefix = plainKey.substring(0, 16)

    await ctx.db.insert('apiKeys', {
      userId: user._id,
      name: args.name,
      key: hashedKey,
      keyPrefix,
      permissions: args.permissions,
      expiresAt: args.expiresAt,
      status: 'active',
      createdAt: Date.now(),
    })

    // Return the plain key ONCE (user must save it)
    return {
      key: plainKey,
      prefix: keyPrefix,
      message: "Save this key securely. You won't be able to see it again.",
    }
  },
})

// List user's API keys
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    // Never return the full key hash
    return keys.map((k) => ({
      _id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      permissions: k.permissions,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      status: k.status,
      createdAt: k.createdAt,
    }))
  },
})

// Revoke an API key
export const revoke = mutation({
  args: { keyId: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    const key = await ctx.db.get(args.keyId)
    if (!key || key.userId !== user._id) {
      throw new Error('API key not found')
    }

    await ctx.db.patch(args.keyId, { status: 'revoked' })
    return { success: true }
  },
})
```

### Step 3: Create API Authentication Middleware

Create `convex/api/auth.ts`:

```typescript
// convex/api/auth.ts
import { ActionCtx } from '../_generated/server'
import { api } from '../_generated/api'

export interface ApiKeyInfo {
  keyId: string
  userId: string
  permissions: string[]
}

// Hash key for comparison
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Validate API key from request
export async function validateApiKey(ctx: ActionCtx, request: Request): Promise<ApiKeyInfo | null> {
  // Check X-API-Key header first, then Authorization header
  let apiKey = request.headers.get('X-API-Key')

  if (!apiKey) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer oe_')) {
      apiKey = authHeader.substring(7)
    }
  }

  if (!apiKey || !apiKey.startsWith('oe_')) {
    return null
  }

  // Get the prefix for lookup
  const keyPrefix = apiKey.substring(0, 16)
  const hashedKey = await hashKey(apiKey)

  // Look up the key
  const keyRecord = await ctx.runQuery(api.apiKeys.validateKey, {
    keyPrefix,
    hashedKey,
  })

  if (!keyRecord) {
    return null
  }

  // Update last used timestamp
  await ctx.runMutation(api.apiKeys.updateLastUsed, {
    keyId: keyRecord._id,
  })

  return {
    keyId: keyRecord._id,
    userId: keyRecord.userId,
    permissions: keyRecord.permissions,
  }
}

// Check if API key has required permission
export function hasPermission(keyInfo: ApiKeyInfo, required: string): boolean {
  // Support wildcards: "events:*" matches "events:read", "events:write"
  return keyInfo.permissions.some((perm) => {
    if (perm === '*') return true
    if (perm === required) return true
    if (perm.endsWith(':*')) {
      const prefix = perm.slice(0, -1)
      return required.startsWith(prefix)
    }
    return false
  })
}

// Permission constants
export const PERMISSIONS = {
  // Events
  EVENTS_READ: 'events:read',
  EVENTS_WRITE: 'events:write',
  EVENTS_DELETE: 'events:delete',

  // Vendors
  VENDORS_READ: 'vendors:read',

  // Sponsors
  SPONSORS_READ: 'sponsors:read',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',

  // Budget
  BUDGET_READ: 'budget:read',
  BUDGET_WRITE: 'budget:write',

  // Webhooks
  WEBHOOKS_MANAGE: 'webhooks:manage',

  // Full access
  ADMIN: '*',
} as const
```

### Step 4: Create Events API Endpoints

Update `convex/http.ts` to add the events API:

```typescript
// Add to convex/http.ts

import { apiSuccess, apiError, corsHeaders, getPagination, parseBody } from './api/helpers'
import { validateApiKey, hasPermission, PERMISSIONS } from './api/auth'

// ============================================================================
// API v1 - Events
// ============================================================================

// OPTIONS handler for CORS preflight
http.route({
  path: '/api/v1/events',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// GET /api/v1/events - List events
http.route({
  path: '/api/v1/events',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const keyInfo = await validateApiKey(ctx, request)
    if (!keyInfo) {
      return apiError('UNAUTHORIZED', 'Invalid or missing API key', 401)
    }

    if (!hasPermission(keyInfo, PERMISSIONS.EVENTS_READ)) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403)
    }

    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)
      const status = url.searchParams.get('status') || undefined

      // Get events for the API key's user
      const events = await ctx.runQuery(api.events.getMyEvents, { status })

      // Apply pagination
      const paginatedEvents = events.slice(offset, offset + limit)

      return apiSuccess(paginatedEvents, {
        total: events.length,
        page,
        limit,
        hasMore: offset + limit < events.length,
      })
    } catch (error) {
      return apiError(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  }),
})

// POST /api/v1/events - Create event
http.route({
  path: '/api/v1/events',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const keyInfo = await validateApiKey(ctx, request)
    if (!keyInfo) {
      return apiError('UNAUTHORIZED', 'Invalid or missing API key', 401)
    }

    if (!hasPermission(keyInfo, PERMISSIONS.EVENTS_WRITE)) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403)
    }

    const body = await parseBody<{
      title: string
      startDate: number
      description?: string
      eventType?: string
      locationType?: string
      venueName?: string
      venueAddress?: string
      expectedAttendees?: number
      budget?: number
    }>(request)

    if (!body) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400)
    }

    if (!body.title || !body.startDate) {
      return apiError('VALIDATION_ERROR', 'title and startDate are required', 400)
    }

    try {
      // Create event using internal mutation (runs as the API key's user)
      const eventId = await ctx.runMutation(api.events.create, body)

      return apiSuccess({ eventId }, { created: true })
    } catch (error) {
      return apiError(
        'CREATION_FAILED',
        error instanceof Error ? error.message : 'Failed to create event',
        400
      )
    }
  }),
})

// GET /api/v1/events/:id - Get single event
http.route({
  pathPrefix: '/api/v1/events/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const keyInfo = await validateApiKey(ctx, request)
    if (!keyInfo) {
      return apiError('UNAUTHORIZED', 'Invalid or missing API key', 401)
    }

    if (!hasPermission(keyInfo, PERMISSIONS.EVENTS_READ)) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403)
    }

    // Extract event ID from URL
    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const eventId = pathParts[pathParts.length - 1]

    if (!eventId) {
      return apiError('VALIDATION_ERROR', 'Event ID required', 400)
    }

    try {
      const event = await ctx.runQuery(api.events.get, { id: eventId as any })

      if (!event) {
        return apiError('NOT_FOUND', 'Event not found', 404)
      }

      return apiSuccess(event)
    } catch (error) {
      return apiError(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  }),
})
```

### Step 5: Add Vendors & Sponsors API

```typescript
// Add to convex/http.ts

// ============================================================================
// API v1 - Vendors (Public Read-Only)
// ============================================================================

http.route({
  path: '/api/v1/vendors',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

// GET /api/v1/vendors - List approved vendors
http.route({
  path: '/api/v1/vendors',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const keyInfo = await validateApiKey(ctx, request)
    if (!keyInfo) {
      return apiError('UNAUTHORIZED', 'Invalid or missing API key', 401)
    }

    if (!hasPermission(keyInfo, PERMISSIONS.VENDORS_READ)) {
      return apiError('FORBIDDEN', 'Insufficient permissions', 403)
    }

    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)
      const category = url.searchParams.get('category') || undefined
      const search = url.searchParams.get('search') || undefined

      const vendors = await ctx.runQuery(api.vendors.list, { category, search })

      const paginatedVendors = vendors.slice(offset, offset + limit)

      return apiSuccess(paginatedVendors, {
        total: vendors.length,
        page,
        limit,
        hasMore: offset + limit < vendors.length,
      })
    } catch (error) {
      return apiError(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        500
      )
    }
  }),
})

// GET /api/v1/vendors/categories
http.route({
  path: '/api/v1/vendors/categories',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const keyInfo = await validateApiKey(ctx, request)
    if (!keyInfo) {
      return apiError('UNAUTHORIZED', 'Invalid or missing API key', 401)
    }

    try {
      const categories = await ctx.runQuery(api.vendors.getCategories)
      return apiSuccess(categories)
    } catch (error) {
      return apiError('INTERNAL_ERROR', 'Failed to fetch categories', 500)
    }
  }),
})

// ============================================================================
// API v1 - Public Events (No Auth Required)
// ============================================================================

// GET /api/v1/public/events - Public event directory
http.route({
  path: '/api/v1/public/events',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // No API key required for public events
    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)

      const eventType = url.searchParams.get('eventType') || undefined
      const locationType = url.searchParams.get('locationType') || undefined
      const seekingVendors = url.searchParams.get('seekingVendors') === 'true'
      const seekingSponsors = url.searchParams.get('seekingSponsors') === 'true'
      const search = url.searchParams.get('search') || undefined

      const events = await ctx.runQuery(api.events.listPublic, {
        eventType,
        locationType,
        seekingVendors: seekingVendors || undefined,
        seekingSponsors: seekingSponsors || undefined,
        search,
        limit: 100, // Max limit
      })

      const paginatedEvents = events.slice(offset, offset + limit)

      return apiSuccess(paginatedEvents, {
        total: events.length,
        page,
        limit,
        hasMore: offset + limit < events.length,
      })
    } catch (error) {
      return apiError('INTERNAL_ERROR', 'Failed to fetch events', 500)
    }
  }),
})
```

---

## API Authentication

### Authentication Methods

| Method        | Use Case                               | Security Level |
| ------------- | -------------------------------------- | -------------- |
| **API Key**   | Server-to-server, backend integrations | High           |
| **OAuth 2.0** | User-facing apps, third-party login    | High           |
| **JWT Token** | Existing web app users accessing API   | Medium         |

### API Key Format

```
oe_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
│  │    └──────────────────────────┴── 32 random chars
│  └─────────────────────────────────── Environment (live/test)
└────────────────────────────────────── Prefix (Open Event)
```

### Using API Keys

```bash
# Via X-API-Key header (recommended)
curl -H "X-API-Key: oe_live_abc123..." https://api.openevent.dev/api/v1/events

# Via Authorization header
curl -H "Authorization: Bearer oe_live_abc123..." https://api.openevent.dev/api/v1/events
```

### Permission Scopes

```typescript
// Available permissions
events:read      // Read events
events:write     // Create/update events
events:delete    // Delete events
vendors:read     // Read vendor directory
sponsors:read    // Read sponsor directory
tasks:read       // Read event tasks
tasks:write      // Create/update tasks
budget:read      // Read budget items
budget:write     // Create/update budget
webhooks:manage  // Manage webhooks
*                // Full access (admin)
```

---

## Rate Limiting

### Implementation

Create `convex/api/rateLimit.ts`:

```typescript
// convex/api/rateLimit.ts
import { ActionCtx } from '../_generated/server'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
}

// In-memory rate limiting (for development)
// In production, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
  ctx: ActionCtx,
  identifier: string,
  limit: number = 1000, // requests per hour
  windowMs: number = 60 * 60 * 1000 // 1 hour
): Promise<RateLimitResult> {
  const now = Date.now()
  const key = `rate:${identifier}`

  let record = rateLimitStore.get(key)

  // Reset if window expired
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs }
    rateLimitStore.set(key, record)
  }

  // Increment count
  record.count++

  const remaining = Math.max(0, limit - record.count)
  const allowed = record.count <= limit

  return {
    allowed,
    remaining,
    resetAt: record.resetAt,
    limit,
  }
}

// Rate limit headers
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  }
}
```

### Rate Limit Tiers

| Tier           | Limit           | Use Case              |
| -------------- | --------------- | --------------------- |
| **Free**       | 100 req/hour    | Testing, small apps   |
| **Basic**      | 1,000 req/hour  | Small production apps |
| **Pro**        | 10,000 req/hour | Medium apps           |
| **Enterprise** | Custom          | Large scale           |

### Rate Limit Response

```json
// 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 1832 seconds.",
    "retryAfter": 1832
  }
}
```

---

## API Versioning

### Strategy: URL Path Versioning

```
/api/v1/events    ← Current version
/api/v2/events    ← Future version
```

### Version Lifecycle

| Stage          | Duration | Description                    |
| -------------- | -------- | ------------------------------ |
| **Current**    | Ongoing  | Actively developed             |
| **Deprecated** | 6 months | Still works, migration advised |
| **Sunset**     | -        | No longer available            |

### Version Header

```
X-API-Version: 1
X-API-Deprecated: true
X-API-Sunset: 2025-06-01
```

---

## OpenAPI Documentation

### Generate OpenAPI Spec

Create `convex/api/openapi.ts`:

```typescript
// convex/api/openapi.ts
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Open Event API',
    version: '1.0.0',
    description: 'API for the Open Event platform',
    contact: {
      name: 'Open Event Team',
      url: 'https://github.com/hazlijohar95/open-event',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'https://api.openevent.dev',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000',
      description: 'Development',
    },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
    schemas: {
      Event: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          startDate: { type: 'number', description: 'Unix timestamp' },
          endDate: { type: 'number' },
          status: {
            type: 'string',
            enum: ['draft', 'planning', 'active', 'completed', 'cancelled'],
          },
          eventType: { type: 'string' },
          locationType: { type: 'string', enum: ['in-person', 'virtual', 'hybrid'] },
          venueName: { type: 'string' },
          venueAddress: { type: 'string' },
          expectedAttendees: { type: 'number' },
          budget: { type: 'number' },
        },
        required: ['_id', 'title', 'startDate', 'status'],
      },
      Vendor: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          rating: { type: 'number' },
          verified: { type: 'boolean' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/v1/events': {
      get: {
        summary: 'List events',
        tags: ['Events'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        hasMore: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create event',
        tags: ['Events'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  startDate: { type: 'number' },
                  description: { type: 'string' },
                  eventType: { type: 'string' },
                },
                required: ['title', 'startDate'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Event created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    // Add more paths...
  },
}
```

### Serve OpenAPI Spec

```typescript
// Add to convex/http.ts

// GET /api/docs/openapi.json
http.route({
  path: '/api/docs/openapi.json',
  method: 'GET',
  handler: httpAction(async () => {
    const { openApiSpec } = await import('./api/openapi')
    return new Response(JSON.stringify(openApiSpec), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }),
})
```

### Interactive Documentation

For interactive docs, you can:

1. **Swagger UI**: Host at `/api/docs`
2. **Redoc**: Alternative documentation viewer
3. **Postman Collection**: Export for API testing

---

## SDKs & Client Libraries

### TypeScript/JavaScript SDK

Create a separate npm package `@open-event/sdk`:

```typescript
// @open-event/sdk/src/index.ts
export class OpenEventClient {
  private apiKey: string
  private baseUrl: string

  constructor(options: { apiKey: string; baseUrl?: string }) {
    this.apiKey = options.apiKey
    this.baseUrl = options.baseUrl || 'https://api.openevent.dev'
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!data.success) {
      throw new OpenEventError(data.error.code, data.error.message)
    }

    return data
  }

  // Events
  events = {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      this.request<EventsListResponse>(
        'GET',
        '/api/v1/events?' + new URLSearchParams(params as any)
      ),

    get: (id: string) => this.request<EventResponse>('GET', `/api/v1/events/${id}`),

    create: (data: CreateEventInput) =>
      this.request<CreateEventResponse>('POST', '/api/v1/events', data),

    update: (id: string, data: UpdateEventInput) =>
      this.request<UpdateEventResponse>('PATCH', `/api/v1/events/${id}`, data),

    delete: (id: string) => this.request<void>('DELETE', `/api/v1/events/${id}`),
  }

  // Vendors
  vendors = {
    list: (params?: { category?: string; search?: string }) =>
      this.request<VendorsListResponse>(
        'GET',
        '/api/v1/vendors?' + new URLSearchParams(params as any)
      ),

    get: (id: string) => this.request<VendorResponse>('GET', `/api/v1/vendors/${id}`),

    categories: () => this.request<string[]>('GET', '/api/v1/vendors/categories'),
  }

  // Sponsors
  sponsors = {
    list: (params?: { industry?: string; search?: string }) =>
      this.request<SponsorsListResponse>(
        'GET',
        '/api/v1/sponsors?' + new URLSearchParams(params as any)
      ),

    get: (id: string) => this.request<SponsorResponse>('GET', `/api/v1/sponsors/${id}`),
  }
}

// Usage example:
// const client = new OpenEventClient({ apiKey: 'oe_live_xxx' })
// const events = await client.events.list({ status: 'active' })
```

### SDK Distribution

```
@open-event/sdk          # JavaScript/TypeScript
open-event-python        # Python
open-event-go            # Go
open-event-ruby          # Ruby
```

---

## Webhooks

### Webhook System

Allow users to receive real-time notifications when events occur.

Add to schema:

```typescript
// Add to convex/schema.ts

webhooks: defineTable({
  userId: v.id('users'),
  url: v.string(),
  secret: v.string(),          // For signature verification
  events: v.array(v.string()), // ["event.created", "event.updated"]
  status: v.union(v.literal('active'), v.literal('paused'), v.literal('failed')),
  failureCount: v.optional(v.number()),
  lastDeliveryAt: v.optional(v.number()),
  lastDeliveryStatus: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_status', ['status']),

webhookDeliveries: defineTable({
  webhookId: v.id('webhooks'),
  event: v.string(),
  payload: v.string(),
  status: v.union(v.literal('pending'), v.literal('success'), v.literal('failed')),
  statusCode: v.optional(v.number()),
  response: v.optional(v.string()),
  attempts: v.number(),
  createdAt: v.number(),
  deliveredAt: v.optional(v.number()),
})
  .index('by_webhook', ['webhookId'])
  .index('by_status', ['status']),
```

### Webhook Events

| Event                  | Description              |
| ---------------------- | ------------------------ |
| `event.created`        | New event created        |
| `event.updated`        | Event details updated    |
| `event.cancelled`      | Event cancelled          |
| `vendor.applied`       | Vendor applied to event  |
| `sponsor.applied`      | Sponsor applied to event |
| `application.accepted` | Application accepted     |
| `application.rejected` | Application rejected     |

### Webhook Payload

```json
{
  "id": "wh_abc123",
  "event": "event.created",
  "timestamp": 1699900000000,
  "data": {
    "eventId": "evt_xyz789",
    "title": "Tech Conference 2024",
    "status": "draft"
  }
}
```

### Signature Verification

```typescript
// Verify webhook signature
const signature = request.headers.get('X-OpenEvent-Signature')
const timestamp = request.headers.get('X-OpenEvent-Timestamp')
const body = await request.text()

const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${body}`)
  .digest('hex')

if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature')
}
```

---

## Security Best Practices

### API Security Checklist

- [ ] **HTTPS Only**: Never allow HTTP in production
- [ ] **API Key Hashing**: Store only hashed keys
- [ ] **Rate Limiting**: Prevent abuse and DDoS
- [ ] **Input Validation**: Validate all inputs
- [ ] **Output Sanitization**: Don't leak sensitive data
- [ ] **CORS Configuration**: Restrict origins in production
- [ ] **Audit Logging**: Log all API access
- [ ] **Key Rotation**: Support key rotation without downtime

### Input Validation

```typescript
// Use Zod for validation
import { z } from 'zod'

const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  startDate: z.number().positive(),
  description: z.string().max(10000).optional(),
  eventType: z.enum(['conference', 'hackathon', 'workshop', 'meetup']).optional(),
  expectedAttendees: z.number().positive().max(1000000).optional(),
  budget: z.number().positive().max(100000000).optional(),
})

// In handler
const result = CreateEventSchema.safeParse(body)
if (!result.success) {
  return apiError('VALIDATION_ERROR', 'Invalid input', 400, result.error.issues)
}
```

### Sensitive Data

Never expose in API responses:

- User passwords/hashes
- API key hashes
- Internal IDs (use public IDs)
- Email verification tokens
- Session tokens

---

## Deployment & Monitoring

### Environment Setup

```bash
# .env for API
CONVEX_DEPLOYMENT=your-deployment-url
API_BASE_URL=https://api.openevent.dev

# Rate limiting (Redis)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Monitoring Dashboard

Track these metrics:

| Metric              | Description                  |
| ------------------- | ---------------------------- |
| **Request Rate**    | Requests per second/minute   |
| **Latency**         | P50, P95, P99 response times |
| **Error Rate**      | % of 4xx and 5xx responses   |
| **Rate Limit Hits** | How often limits are hit     |
| **API Key Usage**   | Requests per key             |

### Health Check Endpoint

```typescript
// Already exists at /api/health
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": 1699900000000,
  "version": "1.0.0",
  "services": {
    "database": "ok",
    "cache": "ok"
  }
}
```

---

## Summary

### Quick Start for Developers

1. **Get API Key**: Sign up at openevent.dev and create an API key
2. **Install SDK**: `npm install @open-event/sdk`
3. **Make First Request**:

```typescript
import { OpenEventClient } from '@open-event/sdk'

const client = new OpenEventClient({
  apiKey: 'oe_live_your_key_here',
})

// List your events
const { data: events } = await client.events.list()

// Create an event
const { data: newEvent } = await client.events.create({
  title: 'My Conference',
  startDate: Date.now() + 86400000, // Tomorrow
  eventType: 'conference',
})
```

### API Endpoints Overview

| Endpoint                 | Method | Auth    | Description            |
| ------------------------ | ------ | ------- | ---------------------- |
| `/api/v1/events`         | GET    | API Key | List events            |
| `/api/v1/events`         | POST   | API Key | Create event           |
| `/api/v1/events/:id`     | GET    | API Key | Get event              |
| `/api/v1/events/:id`     | PATCH  | API Key | Update event           |
| `/api/v1/events/:id`     | DELETE | API Key | Delete event           |
| `/api/v1/vendors`        | GET    | API Key | List vendors           |
| `/api/v1/sponsors`       | GET    | API Key | List sponsors          |
| `/api/v1/public/events`  | GET    | None    | Public event directory |
| `/api/health`            | GET    | None    | Health check           |
| `/api/docs/openapi.json` | GET    | None    | OpenAPI spec           |

---

## Next Steps

1. **Implement Phase 1**: Set up API infrastructure
2. **Create API Keys UI**: Dashboard for key management
3. **Write Tests**: API integration tests
4. **Document**: Complete OpenAPI spec
5. **Launch**: Beta program for early adopters

---

## Resources

- [Convex HTTP Actions](https://docs.convex.dev/functions/http-actions)
- [OpenAPI Specification](https://swagger.io/specification/)
- [API Security Best Practices](https://owasp.org/www-project-api-security/)
- [Rate Limiting Algorithms](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
