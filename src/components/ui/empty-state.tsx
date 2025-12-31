import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  CalendarBlank,
  Users,
  Storefront,
  Briefcase,
  ListChecks,
  ChartLine,
  Bell,
  MagnifyingGlass,
  FolderOpen,
  Plus,
  type Icon,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type EmptyVariant =
  | 'generic'
  | 'events'
  | 'vendors'
  | 'sponsors'
  | 'tasks'
  | 'analytics'
  | 'notifications'
  | 'search'
  | 'files'
  | 'attendees'

interface EmptyStateProps {
  /**
   * The entity type. Determines icon and default messaging.
   * @default 'generic'
   */
  variant?: EmptyVariant
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
   * Primary action button configuration.
   */
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  /**
   * Secondary action button configuration.
   */
  secondaryAction?: {
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
  /**
   * Children to render below the message.
   */
  children?: ReactNode
}

interface VariantConfig {
  icon: Icon
  title: string
  message: string
  actionLabel?: string
}

const variantConfigs: Record<EmptyVariant, VariantConfig> = {
  generic: {
    icon: FolderOpen,
    title: 'Nothing here yet',
    message: 'Get started by adding your first item.',
    actionLabel: 'Add New',
  },
  events: {
    icon: CalendarBlank,
    title: 'No events yet',
    message: 'Create your first event to start managing your venue bookings, vendors, and sponsors.',
    actionLabel: 'Create Event',
  },
  vendors: {
    icon: Storefront,
    title: 'No vendors found',
    message: 'Add vendors to your event or search for vendors in the marketplace.',
    actionLabel: 'Add Vendor',
  },
  sponsors: {
    icon: Briefcase,
    title: 'No sponsors yet',
    message: 'Connect with sponsors to fund your event and build partnerships.',
    actionLabel: 'Find Sponsors',
  },
  tasks: {
    icon: ListChecks,
    title: 'All caught up!',
    message: 'No tasks to display. Create a new task to stay organized.',
    actionLabel: 'Add Task',
  },
  analytics: {
    icon: ChartLine,
    title: 'No data available',
    message: 'Analytics will appear here once you have event activity.',
  },
  notifications: {
    icon: Bell,
    title: 'No notifications',
    message: "You're all caught up! New notifications will appear here.",
  },
  search: {
    icon: MagnifyingGlass,
    title: 'No results found',
    message: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  files: {
    icon: FolderOpen,
    title: 'No files uploaded',
    message: 'Upload files to attach them to your event.',
    actionLabel: 'Upload File',
  },
  attendees: {
    icon: Users,
    title: 'No attendees yet',
    message: 'Attendees will appear here once they register for your event.',
    actionLabel: 'Add Attendee',
  },
}

const sizeStyles = {
  sm: {
    container: 'py-6',
    iconWrapper: 'w-10 h-10',
    icon: 20,
    title: 'text-sm font-medium',
    message: 'text-xs',
    button: 'sm' as const,
  },
  default: {
    container: 'py-12',
    iconWrapper: 'w-14 h-14',
    icon: 28,
    title: 'text-base font-medium',
    message: 'text-sm',
    button: 'default' as const,
  },
  lg: {
    container: 'py-16',
    iconWrapper: 'w-20 h-20',
    icon: 40,
    title: 'text-lg font-semibold',
    message: 'text-base',
    button: 'lg' as const,
  },
}

/**
 * A consistent empty state display component for different entity types.
 *
 * @example
 * ```tsx
 * // Events empty state
 * <EmptyState
 *   variant="events"
 *   action={{
 *     label: 'Create Event',
 *     onClick: () => navigate('/dashboard/events/new'),
 *   }}
 * />
 *
 * // Search results empty state
 * <EmptyState
 *   variant="search"
 *   message="No vendors match your search criteria."
 * />
 *
 * // Custom empty state
 * <EmptyState
 *   icon={<Package size={32} />}
 *   title="No orders yet"
 *   message="Your orders will appear here."
 * />
 * ```
 */
export function EmptyState({
  variant = 'generic',
  title,
  message,
  icon,
  action,
  secondaryAction,
  size = 'default',
  className,
  children,
}: EmptyStateProps) {
  const config = variantConfigs[variant]
  const styles = sizeStyles[size]
  const IconComponent = config.icon

  const displayTitle = title ?? config.title
  const displayMessage = message ?? config.message

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center mb-4 rounded-full bg-muted/50',
          styles.iconWrapper
        )}
      >
        {icon ?? (
          <IconComponent size={styles.icon} weight="duotone" className="text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <h3 className={cn('text-foreground mb-1', styles.title)}>{displayTitle}</h3>

      {/* Message */}
      <p className={cn('text-muted-foreground mb-6 max-w-md', styles.message)}>{displayMessage}</p>

      {/* Children */}
      {children}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button size={styles.button} onClick={action.onClick}>
              {action.icon ?? <Plus size={16} className="mr-2" />}
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button size={styles.button} variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A minimal inline empty state for tables and small areas.
 */
export function EmptyTableRow({
  colSpan,
  message = 'No items to display',
  className,
}: {
  colSpan: number
  message?: string
  className?: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('px-4 py-8 text-center text-muted-foreground', className)}>
        {message}
      </td>
    </tr>
  )
}

/**
 * A compact empty state for sidebars and narrow containers.
 */
export function EmptyStateCompact({
  icon,
  message,
  className,
}: {
  icon?: ReactNode
  message: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center text-center py-6 px-4', className)}>
      {icon && <div className="mb-2 text-muted-foreground">{icon}</div>}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
