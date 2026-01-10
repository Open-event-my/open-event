# Frontend Development Skills

## React 19 & TypeScript

### Component Patterns

- **Functional Components with Hooks**: All components use modern React patterns
- **TypeScript Strict Mode**: Full type safety throughout the codebase
- **Custom Hooks**: Reusable logic in `src/hooks/` directory

**Example Pattern**:

```typescript
// Custom hook pattern
export function useEventData(eventId: string) {
  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')
  const isLoading = event === undefined
  const isNotFound = event === null
  return { event, isLoading, isNotFound }
}

// Component usage
export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { event, isLoading, isNotFound } = useEventData(eventId)

  if (isLoading) return <LoadingState />
  if (isNotFound) return <NotFoundState />
  return <EventContent event={event} />
}
```

### Key React Patterns Used

1. **Error Boundaries**: `QueryErrorBoundary`, `ErrorBoundary` components
2. **Suspense**: Lazy loading with React Suspense
3. **Context API**: AuthContext, ErrorStateContext for global state
4. **Route Protection**: Protected routes with authentication checks

### State Management

- **Convex Hooks**: `useQuery`, `useMutation`, `useAction` for server state
- **Local State**: `useState` for UI state
- **Context**: Global app state (auth, errors)
- **No Redux/Zustand**: Server state handled by Convex, local state by React

## Vite 7 Build System

### Key Features

- **Fast HMR**: Hot module replacement for instant updates
- **Code Splitting**: Manual chunks configured in `vite.config.ts`
- **PWA Plugin**: Service worker generation with `vite-plugin-pwa`
- **Security Headers**: CSP, X-Frame-Options, HSTS configured

### Build Configuration

```typescript
// Manual chunks for code splitting
manualChunks: (id) => {
  if (id.includes('tldraw')) return 'vendor-tldraw'
  if (id.includes('recharts')) return 'vendor-charts'
  if (id.includes('react-dom')) return 'vendor-react'
  if (id.includes('@radix-ui/')) return 'vendor-radix'
  // ... more chunking strategies
}
```

### Dev Server Features

- **Port**: 5173 (default Vite port)
- **Security Headers**: CSP configured for development
- **Proxy**: Not needed (Convex handles backend)

## TailwindCSS 4

### Utility-First Styling

- **Custom Design Tokens**: CSS variables for theming
- **Dark Mode**: `next-themes` integration
- **Responsive Design**: Mobile-first approach
- **Component Variants**: `class-variance-authority` for component variants

### Key Utilities Used

```typescript
// Tailwind + CVA pattern
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        outline: 'border border-input bg-background',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
      },
    },
  }
)

export function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
```

### Theme System

- **CSS Variables**: Defined in `index.css`
- **Dark Mode**: Automatic theme detection
- **Color System**: Semantic color tokens (primary, secondary, muted, etc.)

## React Router v7

### Routing Patterns

```typescript
// Lazy loading with Suspense
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

// Protected routes
<Route element={<ProtectedRoute />}>
  <Route path="dashboard/*" element={<DashboardLayout />} />
</Route>
```

### Navigation Patterns

- **Link Component**: Use `Link` from react-router-dom
- **useNavigate**: Programmatic navigation
- **useParams**: Extract route parameters
- **Protected Routes**: Auth checks before rendering

## Component Organization

### Directory Structure

```
src/components/
├── ui/              # ShadCN base components
├── app/             # App shell & navigation
├── dashboard/       # Dashboard-specific components
├── events/          # Event management components
├── admin/           # Admin panel components
└── [feature]/       # Feature-specific components
```

### File Naming

- **Components**: PascalCase (`EventCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useEventData.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Types**: camelCase (`eventTypes.ts`)

### Import Conventions

```typescript
// Absolute imports using @ alias
import { Button } from '@/components/ui/button'
import { useEventData } from '@/hooks/useEventData'
import { formatDate } from '@/lib/utils'

// External imports first
import { useQuery } from 'convex/react'
import { useParams } from 'react-router-dom'

// Then internal imports
import { api } from '@/convex/_generated/api'
```

## Key Skills to Master

1. **React 19 Features**: Server Components concepts, improved Suspense
2. **TypeScript Patterns**: Type inference, generic types, utility types
3. **Vite Optimization**: Code splitting, lazy loading, tree shaking
4. **TailwindCSS**: Utility composition, responsive design, dark mode
5. **React Router**: Route protection, lazy loading, navigation patterns
6. **Error Handling**: Error boundaries, query error boundaries, fallback UI
7. **Performance**: Memoization, code splitting, lazy loading
8. **Accessibility**: ARIA attributes, keyboard navigation, screen reader support
