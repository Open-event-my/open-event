# Architecture Patterns & Best Practices

## Component Organization

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # ShadCN base components
│   ├── app/            # App shell & navigation
│   ├── dashboard/      # Dashboard widgets
│   ├── events/         # Event-specific components
│   ├── admin/          # Admin panel components
│   └── [feature]/      # Feature-specific components
├── pages/              # Route-level page components
│   ├── dashboard/      # Dashboard pages
│   ├── admin/          # Admin pages
│   ├── auth/           # Auth flow pages
│   └── public/         # Public pages
├── hooks/              # Custom React hooks
├── lib/                # Utilities and helpers
├── types/              # TypeScript type definitions
└── contexts/           # React contexts
```

### Component Patterns

#### Page Components

```typescript
// Full page component with lazy loading
const EventDetailPage = lazy(() => import('@/pages/dashboard/EventDetailPage'))

// Route configuration
<Route
  path="events/:eventId"
  element={
    <Suspense fallback={<PageLoader />}>
      <EventDetailPage />
    </Suspense>
  }
/>
```

#### Feature Components

```typescript
// Feature-specific component
// src/components/events/EventCard.tsx
export function EventCard({ event }: { event: Event }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <EventActions event={event} />
      </CardContent>
    </Card>
  )
}
```

#### UI Primitives

```typescript
// Base UI component
// src/components/ui/button.tsx
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(/* ... */)

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
```

## State Management

### Convex for Server State

```typescript
// Server state managed by Convex
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function EventList() {
  const events = useQuery(api.events.list, { organizerId: userId })
  const createEvent = useMutation(api.events.create)

  // Query states: undefined (loading), null (not found), data
  if (events === undefined) return <LoadingState />
  if (events === null || events.length === 0) return <EmptyState />

  return <EventGrid events={events} />
}
```

### React Context for Global State

```typescript
// Global app state with Context
// src/contexts/AuthContext.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Usage
const { user } = useAuth()
```

### Local State for UI

```typescript
// UI state with useState
export function Modal({ isOpen, onClose }) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  // ...
}
```

## Routing Architecture

### Route Protection Pattern

```typescript
// Protected route wrapper
export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingState />
  if (!user) return <Navigate to="/sign-in" replace />

  return children
}

// Usage
<Route
  path="dashboard/*"
  element={
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  }
/>
```

### Lazy Loading Pattern

```typescript
// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const EventsPage = lazy(() => import('@/pages/dashboard/EventsPage'))

// Route with Suspense
<Route
  path="dashboard"
  element={
    <Suspense fallback={<PageLoader message="Loading dashboard..." />}>
      <DashboardPage />
    </Suspense>
  }
/>
```

### Error Boundary Pattern

```typescript
// Error boundary for route-level errors
<Route
  path="events/:eventId/applications"
  element={
    <QueryErrorBoundary
      fallback={({ error, retry }) => (
        <RouteErrorFallback error={error} onRetry={retry} />
      )}
    >
      <Suspense fallback={<PageLoader />}>
        <EventApplicationsPage />
      </Suspense>
    </QueryErrorBoundary>
  }
/>
```

## Backend Architecture

### Convex Function Organization

```
convex/
├── schema.ts           # Database schema
├── auth.ts             # Authentication
├── events.ts           # Event queries/mutations
├── vendors.ts          # Vendor operations
├── sponsors.ts         # Sponsor operations
├── lib/
│   ├── agent/          # AI agent system
│   │   ├── tools.ts    # Tool definitions
│   │   ├── handlers.ts # Tool execution
│   │   └── types.ts    # Agent types
│   └── ai/             # AI utilities
├── mutations/          # Complex mutations
├── queries/            # Complex queries
└── _generated/         # Auto-generated types
```

### Function Patterns

#### Query Function

```typescript
export const get = query({
  args: { id: v.id('events') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const event = await ctx.db.get(args.id)
    if (!event) return null

    // Authorization check
    if (event.organizerId !== identity.subject) {
      throw new Error('Not authorized')
    }

    return event
  },
})
```

#### Mutation Function

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const eventId = await ctx.db.insert('events', {
      ...args,
      organizerId: identity.subject as Id<'users'>,
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return eventId
  },
})
```

#### Action Function

```typescript
export const sendEmail = action({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    // External API call
    await resend.emails.send({
      from: 'noreply@example.com',
      to: args.to,
      subject: args.subject,
      html: args.body,
    })

    return { success: true }
  },
})
```

## Error Handling Architecture

### Error Boundary Hierarchy

```
App
└── ErrorBoundary (catch-all)
    └── Routes
        └── QueryErrorBoundary (data fetching errors)
            └── Suspense (loading states)
                └── Page Component
```

### Error Types

1. **Component Errors**: Caught by `ErrorBoundary`
2. **Query Errors**: Caught by `QueryErrorBoundary`
3. **Route Errors**: Caught by route-level error boundaries
4. **Network Errors**: Handled in hooks/components

### Error Display Pattern

```typescript
// Consistent error UI
export function RouteErrorFallback({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <WarningCircle size={64} className="text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6">
        {error.message || 'We encountered an error loading this page.'}
      </p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  )
}
```

## Code Organization Principles

### 1. Feature-Based Organization

- Group related components, hooks, and utilities together
- Feature-specific code in feature directories

### 2. Separation of Concerns

- UI components: Presentation only
- Hooks: Business logic
- Utils: Pure functions
- Types: Type definitions

### 3. DRY (Don't Repeat Yourself)

- Extract common patterns into utilities
- Reusable components for repeated UI patterns
- Custom hooks for repeated logic

### 4. Type Safety

- Use TypeScript strictly
- Define types in `src/types/` for reusable types
- Leverage Convex generated types

## Key Skills to Master

1. **Component Architecture**: Page vs feature vs UI components
2. **State Management**: Convex, Context, local state patterns
3. **Routing Patterns**: Protected routes, lazy loading, error boundaries
4. **Backend Organization**: Schema, queries, mutations, actions
5. **Error Handling**: Error boundaries, error states, error recovery
6. **Code Organization**: Feature-based, separation of concerns, DRY
7. **Type Safety**: TypeScript patterns, type inference, generic types
8. **Performance**: Code splitting, lazy loading, memoization
