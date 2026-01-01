/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ErrorState } from './error-state'
import { getErrorMessage } from '@/types/errors'

export interface AsyncBoundaryProps {
  /** Whether the async operation is loading */
  isLoading?: boolean
  /** Error from the async operation */
  error?: Error | null | unknown
  /** Whether the data is empty */
  isEmpty?: boolean
  /** Children to render when data is ready */
  children: React.ReactNode
  /** Custom loading component */
  loadingFallback?: React.ReactNode
  /** Custom error component */
  errorFallback?: React.ReactNode
  /** Custom empty state component */
  emptyFallback?: React.ReactNode
  /** Loading message */
  loadingMessage?: string
  /** Empty state title */
  emptyTitle?: string
  /** Empty state message */
  emptyMessage?: string
  /** Retry callback for error state */
  onRetry?: () => void
  /** Action for empty state */
  emptyAction?: {
    label: string
    onClick: () => void
  }
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Additional class name */
  className?: string
  /** Minimum height for the container */
  minHeight?: string
  /** Whether to show inline loading (smaller, no padding) */
  inline?: boolean
}

/**
 * Default inline loading indicator
 */
function InlineLoading({
  message,
  size = 'default',
}: {
  message?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const sizeMap = { sm: 14, default: 18, lg: 24 }

  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <CircleNotch size={sizeMap[size]} weight="bold" className="animate-spin" aria-hidden="true" />
      {message && <span className="text-sm">{message}</span>}
    </span>
  )
}

/**
 * Default block loading indicator
 */
function BlockLoading({
  message,
  size = 'default',
}: {
  message?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const sizeMap = { sm: 24, default: 32, lg: 48 }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <CircleNotch
        size={sizeMap[size]}
        weight="bold"
        className="animate-spin text-primary"
        aria-hidden="true"
      />
      {message && <p className="text-sm text-muted-foreground animate-pulse">{message}</p>}
    </div>
  )
}

/**
 * Boundary component for async operations that handles loading, error, and empty states.
 *
 * Features:
 * - Automatic loading indicator during async operations
 * - Error state with retry functionality
 * - Empty state with customizable message and action
 * - Inline and block variants
 * - Accessible loading announcements
 *
 * @example
 * ```tsx
 * // Basic usage with Convex query
 * const events = useQuery(api.events.list)
 *
 * <AsyncBoundary
 *   isLoading={events === undefined}
 *   isEmpty={events?.length === 0}
 *   loadingMessage="Loading events..."
 *   emptyTitle="No events"
 *   emptyMessage="Create your first event to get started"
 * >
 *   <EventList events={events} />
 * </AsyncBoundary>
 *
 * // Inline loading for smaller areas
 * <AsyncBoundary isLoading={isLoading} inline>
 *   <span>{data}</span>
 * </AsyncBoundary>
 * ```
 *
 * **Validates: Requirements 11.7** - Show loading states for all async operations
 */
export function AsyncBoundary({
  isLoading,
  error,
  isEmpty,
  children,
  loadingFallback,
  errorFallback,
  emptyFallback,
  loadingMessage = 'Loading...',
  emptyTitle = 'No results',
  emptyMessage = 'No items to display.',
  onRetry,
  emptyAction,
  size = 'default',
  className,
  minHeight,
  inline = false,
}: AsyncBoundaryProps) {
  const containerStyle = minHeight ? { minHeight } : undefined

  // Loading state
  if (isLoading) {
    if (inline) {
      return loadingFallback ?? <InlineLoading message={loadingMessage} size={size} />
    }

    return (
      <div
        className={cn('w-full', className)}
        style={containerStyle}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {loadingFallback ?? <BlockLoading message={loadingMessage} size={size} />}
        <span className="sr-only">{loadingMessage}</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('w-full', className)} style={containerStyle}>
        {errorFallback ?? (
          <ErrorState
            variant="generic"
            message={getErrorMessage(error)}
            onRetry={onRetry}
            size={size}
          />
        )}
      </div>
    )
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className={cn('w-full', className)} style={containerStyle}>
        {emptyFallback ?? (
          <ErrorState
            variant="empty"
            title={emptyTitle}
            message={emptyMessage}
            action={emptyAction}
            onRetry={onRetry}
            size={size}
          />
        )}
      </div>
    )
  }

  // Success state - render children
  return <>{children}</>
}

/**
 * Suspense-like boundary for data that can only be loading or ready.
 * Simpler than AsyncBoundary when you don't need error/empty handling.
 */
export function LoadingBoundary({
  isLoading,
  children,
  fallback,
  message = 'Loading...',
  inline = false,
  className,
}: {
  isLoading?: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  message?: string
  inline?: boolean
  className?: string
}) {
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (inline) {
      return <InlineLoading message={message} />
    }

    return (
      <div className={cn('w-full', className)} role="status" aria-live="polite" aria-busy="true">
        <BlockLoading message={message} />
        <span className="sr-only">{message}</span>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook to create loading state props for AsyncBoundary from Convex query result.
 *
 * @example
 * ```tsx
 * const events = useQuery(api.events.list)
 * const boundaryProps = useAsyncBoundaryProps(events, events?.length === 0)
 *
 * <AsyncBoundary {...boundaryProps}>
 *   <EventList events={events!} />
 * </AsyncBoundary>
 * ```
 */
export function useAsyncBoundaryProps<T>(
  data: T | undefined,
  isEmpty?: boolean
): Pick<AsyncBoundaryProps, 'isLoading' | 'isEmpty'> {
  return {
    isLoading: data === undefined,
    isEmpty: isEmpty ?? (Array.isArray(data) && data.length === 0),
  }
}
