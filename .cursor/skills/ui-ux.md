# UI/UX Development Skills

## ShadCN UI Components

### Component Library

ShadCN UI provides accessible, customizable components built on Radix UI primitives.

**Key Components Used**:

- Button, Card, Dialog, Dropdown, Input, Select, Tabs, Toast, Tooltip
- All components use `class-variance-authority` for variants
- Dark mode support built-in

### Component Pattern

```typescript
// Using ShadCN components
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function EventCard({ event }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleClick}>View Details</Button>
      </CardContent>
    </Card>
  )
}
```

### Variant System

```typescript
// Component variants using class-variance-authority
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva('rounded-lg border bg-card text-card-foreground shadow-sm', {
  variants: {
    variant: {
      default: 'border-border',
      outlined: 'border-2',
      ghost: 'border-transparent',
    },
    size: {
      sm: 'p-4',
      default: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
})
```

## Radix UI Primitives

### Accessible Components

Radix UI provides unstyled, accessible primitives:

- **Dialog**: Modal dialogs with focus management
- **Dropdown Menu**: Accessible dropdown menus
- **Select**: Accessible select components
- **Tooltip**: Accessible tooltips
- **Tabs**: Accessible tab navigation

### Accessibility Features

- Keyboard navigation support
- ARIA attributes included
- Focus management
- Screen reader support

## Dark Mode

### Theme Implementation

```typescript
// Using next-themes for dark mode
import { ThemeProvider } from 'next-themes'
import { useTheme } from 'next-themes'

export function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MainApp />
    </ThemeProvider>
  )
}

// Using theme in components
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </Button>
  )
}
```

### CSS Variables for Theming

```css
/* Using CSS variables for theme colors */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... more colors */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  /* ... dark mode colors */
}
```

## Responsive Design

### Mobile-First Approach

```typescript
// Tailwind responsive utilities
<div className="
  grid
  grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-4
  gap-4
  p-4
  md:p-6
  lg:p-8
">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>
```

### Breakpoints

- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## Icons

### Phosphor Icons (Duotone)

```typescript
import { Calendar, CheckSquare, CurrencyDollar, Note } from '@phosphor-icons/react'

export function IconExample() {
  return (
    <div>
      <Calendar size={24} weight="duotone" />
      <CheckSquare size={24} weight="duotone" />
      <CurrencyDollar size={24} weight="duotone" />
      <Note size={24} weight="duotone" />
    </div>
  )
}
```

**Icon Usage Patterns**:

- **Weight**: `duotone`, `regular`, `bold`, `fill`
- **Size**: Numeric values (16, 20, 24, 32, 48, 64)
- **Color**: Use `className` for Tailwind colors

## Advanced UI Components

### tldraw Integration (Playground)

```typescript
// Custom shapes for tldraw
import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw'
import type { BudgetCardShape } from '@/lib/playground/types'

export class BudgetCardShapeUtil extends ShapeUtil<BudgetCardShape> {
  static override type = 'budget-card' as const

  getGeometry(shape: BudgetCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
    })
  }

  component(shape: BudgetCardShape) {
    return (
      <HTMLContainer>
        <div className="budget-card">
          {/* Custom card rendering */}
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: BudgetCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }
}
```

### Charts (Recharts)

```typescript
// Using Recharts for analytics
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function AnalyticsChart({ data }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
    </LineChart>
  )
}
```

## Form Handling

### Form Patterns

```typescript
// Using React Hook Form with Zod validation
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  startDate: z.date(),
  endDate: z.date(),
})

export function EventForm() {
  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      startDate: new Date(),
      endDate: new Date(),
    },
  })

  const onSubmit = (data) => {
    // Handle form submission
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

## Loading States

### Loading Patterns

```typescript
// Loading states
export function EventList() {
  const events = useQuery(api.events.list, { organizerId: userId })

  if (events === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (events === null || events.length === 0) {
    return <EmptyState message="No events found" />
  }

  return (
    <div>
      {events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  )
}
```

## Error States

### Error Boundary Pattern

```typescript
// QueryErrorBoundary for data fetching errors
import { QueryErrorBoundary } from '@/components/QueryErrorBoundary'
import { RouteErrorFallback } from '@/components/RouteErrorFallback'

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

### Error Display

```typescript
// Error state UI
export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <WarningCircle size={64} className="text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6">
        We encountered an error loading this page.
      </p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  )
}
```

## Key Skills to Master

1. **ShadCN UI**: Component usage, customization, variants
2. **Radix UI**: Primitive usage, accessibility features
3. **Dark Mode**: Theme implementation, CSS variables
4. **Responsive Design**: Mobile-first, breakpoints, flexible layouts
5. **Icons**: Phosphor Icons usage, sizing, styling
6. **Forms**: React Hook Form, Zod validation, error handling
7. **Loading States**: Spinners, skeletons, progressive loading
8. **Error Handling**: Error boundaries, error states, retry logic
9. **Accessibility**: ARIA attributes, keyboard navigation, screen readers
10. **Animations**: Transitions, hover effects, micro-interactions
