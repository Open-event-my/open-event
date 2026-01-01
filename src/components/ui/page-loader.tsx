import { cn } from '@/lib/utils'

interface PageLoaderProps {
  className?: string
  message?: string
}

/**
 * Full-page loading spinner for route transitions.
 * Used as Suspense fallback for lazy-loaded routes.
 */
export function PageLoader({ className, message }: PageLoaderProps) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center bg-background', className)}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
        {message && <p className="text-sm text-muted-foreground animate-pulse">{message}</p>}
      </div>
    </div>
  )
}

/**
 * Dashboard-specific loading skeleton.
 * Matches the AppShell layout structure.
 */
export function DashboardLoader() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="hidden w-64 border-r bg-muted/30 md:block">
        <div className="p-4 space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}

/**
 * Card-style loading skeleton for content areas.
 */
export function ContentLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-6">
      <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  )
}

/**
 * Table loading skeleton.
 */
export function TableLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 border-b pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 flex-1 animate-pulse rounded bg-muted" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2">
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className="h-4 flex-1 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ))}
    </div>
  )
}
