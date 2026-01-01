import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  WarningCircle,
  WifiSlash,
  LockKey,
  MagnifyingGlass,
  ArrowClockwise,
  type Icon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type ErrorVariant = 'generic' | 'network' | 'permission' | 'notFound' | 'empty'

interface ErrorStateProps {
  /**
   * The error variant. Determines icon and default messaging.
   * @default 'generic'
   */
  variant?: ErrorVariant
  /**
   * Custom title. Overrides variant default.
   */
  title?: string
  /**
   * Custom message. Overrides variant default.
   */
  message?: string
  /**
   * Custom icon. Overrides variant default.
   */
  icon?: ReactNode
  /**
   * Called when retry button is clicked.
   */
  onRetry?: () => void
  /**
   * Custom retry button label.
   */
  retryLabel?: string
  /**
   * Additional action button.
   */
  action?: {
    label: string
    onClick: () => void
  }
  /**
   * Size variant.
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
  /**
   * Additional class name.
   */
  className?: string
}

interface VariantConfig {
  icon: Icon
  title: string
  message: string
  retryLabel: string
}

const variantConfigs: Record<ErrorVariant, VariantConfig> = {
  generic: {
    icon: WarningCircle,
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    retryLabel: 'Try Again',
  },
  network: {
    icon: WifiSlash,
    title: 'Connection problem',
    message: 'Unable to connect. Please check your internet connection and try again.',
    retryLabel: 'Retry Connection',
  },
  permission: {
    icon: LockKey,
    title: 'Access denied',
    message: "You don't have permission to view this content.",
    retryLabel: 'Try Again',
  },
  notFound: {
    icon: MagnifyingGlass,
    title: 'Not found',
    message: "We couldn't find what you're looking for. It may have been moved or deleted.",
    retryLabel: 'Refresh',
  },
  empty: {
    icon: MagnifyingGlass,
    title: 'No results',
    message: 'No items to display.',
    retryLabel: 'Refresh',
  },
}

const sizeStyles = {
  sm: {
    container: 'py-6',
    icon: 20,
    title: 'text-sm font-medium',
    message: 'text-xs',
    button: 'sm' as const,
  },
  default: {
    container: 'py-12',
    icon: 32,
    title: 'text-base font-medium',
    message: 'text-sm',
    button: 'default' as const,
  },
  lg: {
    container: 'py-16',
    icon: 48,
    title: 'text-lg font-semibold',
    message: 'text-base',
    button: 'default' as const,
  },
}

/**
 * A consistent error display component with variants for different error types.
 *
 * @example
 * ```tsx
 * // Network error
 * <ErrorState
 *   variant="network"
 *   onRetry={refetch}
 * />
 *
 * // Custom error
 * <ErrorState
 *   title="Failed to load events"
 *   message="Please try again later."
 *   onRetry={refetch}
 * />
 *
 * // Empty state
 * <ErrorState
 *   variant="empty"
 *   title="No events yet"
 *   message="Create your first event to get started."
 *   action={{
 *     label: 'Create Event',
 *     onClick: () => navigate('/dashboard/events/new'),
 *   }}
 * />
 * ```
 */
export function ErrorState({
  variant = 'generic',
  title,
  message,
  icon,
  onRetry,
  retryLabel,
  action,
  size = 'default',
  className,
}: ErrorStateProps) {
  const config = variantConfigs[variant]
  const styles = sizeStyles[size]
  const IconComponent = config.icon

  const displayTitle = title ?? config.title
  const displayMessage = message ?? config.message
  const displayRetryLabel = retryLabel ?? config.retryLabel

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      <div className="flex items-center justify-center mb-4 rounded-full bg-muted p-3">
        {icon ?? (
          <IconComponent size={styles.icon} weight="duotone" className="text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <h3 className={cn('text-foreground mb-1', styles.title)}>{displayTitle}</h3>

      {/* Message */}
      <p className={cn('text-muted-foreground mb-6 max-w-sm', styles.message)}>{displayMessage}</p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button size={styles.button} onClick={onRetry}>
            <ArrowClockwise size={16} className="mr-2" />
            {displayRetryLabel}
          </Button>
        )}

        {action && (
          <Button
            size={styles.button}
            variant={onRetry ? 'outline' : 'default'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Inline error message for form fields and small areas.
 */
export function InlineError({ message, className }: { message: string; className?: string }) {
  return (
    <p className={cn('text-sm text-destructive flex items-center gap-1', className)}>
      <WarningCircle size={14} weight="fill" />
      {message}
    </p>
  )
}

/**
 * Simple error text without icon.
 */
export function ErrorText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-sm text-destructive', className)}>{children}</p>
}
