import { type ReactNode } from 'react'
import { ErrorState } from './error-state'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/types/errors'

interface LoadingErrorWrapperProps {
  /**
   * Whether data is currently loading.
   */
  isLoading?: boolean
  /**
   * Error object if an error occurred.
   */
  error?: Error | null | unknown
  /**
   * Whether the data is empty.
   */
  isEmpty?: boolean
  /**
   * The children to render when data is ready.
   */
  children: ReactNode
  /**
   * Custom loading component.
   */
  loadingFallback?: ReactNode
  /**
   * Custom error component.
   */
  errorFallback?: ReactNode
  /**
   * Custom empty state component.
   */
  emptyFallback?: ReactNode
  /**
   * Message to show when empty.
   */
  emptyMessage?: string
  /**
   * Title to show when empty.
   */
  emptyTitle?: string
  /**
   * Called when retry button is clicked.
   */
  onRetry?: () => void
  /**
   * Action to show in empty state.
   */
  emptyAction?: {
    label: string
    onClick: () => void
  }
  /**
   * Size variant for loading and error states.
   */
  size?: 'sm' | 'default' | 'lg'
  /**
   * Additional class name for the container.
   */
  className?: string
  /**
   * Minimum height for the container.
   */
  minHeight?: string
}

/**
 * Default loading skeleton component.
 */
function DefaultLoadingFallback({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeStyles = {
    sm: 'h-6 w-6',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-muted border-t-primary',
          sizeStyles[size]
        )}
      />
    </div>
  )
}

/**
 * A wrapper component that handles loading, error, and empty states.
 *
 * Features:
 * - Loading spinner with customizable fallback
 * - Error state with retry functionality
 * - Empty state with customizable message and action
 * - Consistent styling across all states
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingErrorWrapper
 *   isLoading={isLoading}
 *   error={error}
 *   isEmpty={data?.length === 0}
 *   onRetry={refetch}
 * >
 *   <EventList events={data} />
 * </LoadingErrorWrapper>
 *
 * // With custom empty state
 * <LoadingErrorWrapper
 *   isLoading={isLoading}
 *   error={error}
 *   isEmpty={!events?.length}
 *   emptyTitle="No events yet"
 *   emptyMessage="Create your first event to get started"
 *   emptyAction={{
 *     label: 'Create Event',
 *     onClick: () => navigate('/dashboard/events/new'),
 *   }}
 *   onRetry={refetch}
 * >
 *   <EventList events={events} />
 * </LoadingErrorWrapper>
 * ```
 */
export function LoadingErrorWrapper({
  isLoading,
  error,
  isEmpty,
  children,
  loadingFallback,
  errorFallback,
  emptyFallback,
  emptyMessage = 'No items to display.',
  emptyTitle = 'No results',
  onRetry,
  emptyAction,
  size = 'default',
  className,
  minHeight,
}: LoadingErrorWrapperProps) {
  const containerStyle = minHeight ? { minHeight } : undefined

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('w-full', className)} style={containerStyle}>
        {loadingFallback ?? <DefaultLoadingFallback size={size} />}
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
 * Simpler wrapper for data that can only be loading or ready.
 */
export function LoadingWrapper({
  isLoading,
  children,
  fallback,
  className,
}: {
  isLoading?: boolean
  children: ReactNode
  fallback?: ReactNode
  className?: string
}) {
  if (isLoading) {
    return <div className={className}>{fallback ?? <DefaultLoadingFallback />}</div>
  }

  return <>{children}</>
}

/**
 * Skeleton loading placeholder.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} {...props} />
}

/**
 * Skeleton row for table-like layouts.
 */
export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

/**
 * Skeleton card placeholder.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}
