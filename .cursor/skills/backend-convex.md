# Backend Development with Convex

## Convex Overview

Convex is a **serverless backend platform** that provides:

- **Real-time Database**: Automatic subscriptions and reactive queries
- **Serverless Functions**: Queries, mutations, and actions
- **TypeScript End-to-End**: Shared types between frontend and backend
- **Built-in Auth**: Authentication and authorization support

## Schema Definition

### Schema Pattern

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(
      v.literal('draft'),
      v.literal('planning'),
      v.literal('active'),
      v.literal('completed'),
      v.literal('cancelled')
    ),
    organizerId: v.id('users'),
    // ... more fields
  })
    .index('by_organizer', ['organizerId'])
    .index('by_status', ['status']),
})
```

### Key Concepts

- **Validators**: Use `v.*` validators for type safety
- **Indexes**: Define indexes for efficient queries
- **Relations**: Use `v.id('tableName')` for foreign keys
- **Optional Fields**: Use `v.optional(v.type())`

## Query Functions

### Basic Query Pattern

```typescript
// convex/events.ts
import { query } from './_generated/server'
import { v } from 'convex/values'

export const get = query({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const list = query({
  args: { organizerId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.organizerId))
      .collect()
  },
})
```

### Advanced Query Patterns

```typescript
// With pagination
export const listPaginated = query({
  args: {
    organizerId: v.id('users'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('events')
      .withIndex('by_organizer', (q) => q.eq('organizerId', args.organizerId))
      .paginate(args.paginationOpts)
    return result
  },
})

// With filtering
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('events')
      .filter((q) =>
        q.or(q.eq(q.field('title'), args.query), q.eq(q.field('description'), args.query))
      )
      .collect()
  },
})
```

## Mutation Functions

### Basic Mutation Pattern

```typescript
// convex/events.ts
import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    title: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    organizerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const eventId = await ctx.db.insert('events', {
      ...args,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return eventId
  },
})

export const update = mutation({
  args: {
    id: v.id('events'),
    title: v.optional(v.string()),
    status: v.optional(v.union(/* ... */)),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
  },
})
```

### Best Practices

1. **Authentication**: Always check `ctx.auth.getUserIdentity()`
2. **Authorization**: Verify user permissions before mutations
3. **Validation**: Validate inputs using Convex validators
4. **Atomic Operations**: Use transactions for multi-step operations
5. **Error Handling**: Throw meaningful errors

## Action Functions

Actions are used for:

- **External API calls**: OpenAI, Stripe, email services
- **Side effects**: File uploads, webhooks
- **Long-running operations**: Background jobs

```typescript
// convex/actions/aiTools.ts
import { action } from './_generated/server'
import { v } from 'convex/values'
import { openai } from '@/lib/ai/provider'

export const generateEventSuggestion = action({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: args.prompt }],
    })
    return response.choices[0].message.content
  },
})
```

## Frontend Integration

### Using Convex Hooks

```typescript
// React component
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function EventList() {
  const events = useQuery(api.events.list, { organizerId: userId })
  const createEvent = useMutation(api.events.create)

  if (events === undefined) return <Loading />
  if (events === null) return <Empty />

  return (
    <div>
      {events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  )
}
```

### Query States

- **`undefined`**: Query is loading
- **`null`**: Query returned no results (if applicable)
- **`data`**: Query result

### Mutation Pattern

```typescript
const createEvent = useMutation(api.events.create)

const handleCreate = async () => {
  try {
    const eventId = await createEvent({
      title: 'My Event',
      startDate: Date.now(),
      endDate: Date.now() + 86400000,
      organizerId: userId,
    })
    // Navigate to event detail
    navigate(`/dashboard/events/${eventId}`)
  } catch (error) {
    toast.error('Failed to create event')
  }
}
```

## Authentication

### Convex Auth Setup

```typescript
// convex/auth.ts
import { convexAuth } from '@convex-dev/auth/server'

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Email/Password
    EmailPasswordProvider({
      id: 'email-password',
    }),
  ],
})
```

### Protecting Functions

```typescript
export const create = mutation({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }
    // ... rest of mutation
  },
})
```

## Key Skills to Master

1. **Schema Design**: Indexes, validators, relationships
2. **Query Optimization**: Efficient queries, pagination, filtering
3. **Mutation Patterns**: Atomic operations, validation, authorization
4. **Actions**: External API calls, file handling, webhooks
5. **Real-time Updates**: Understanding reactive queries and subscriptions
6. **Error Handling**: Meaningful errors, error boundaries
7. **Type Safety**: Leveraging generated types from schema
8. **Performance**: Query optimization, indexing strategies
