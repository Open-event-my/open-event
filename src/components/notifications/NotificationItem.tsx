import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { X, Clock, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Doc } from '../../../convex/_generated/dataModel'

/**
 * Format a timestamp to a relative time string
 */
function formatRelativeTime(timestamp: number, now: number): string {
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

interface NotificationItemProps {
  notification: Doc<'notifications'>
  onMarkAsRead: () => void
  onDelete: () => void
  onClose?: () => void
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClose,
}: NotificationItemProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    // Mark as read if unread
    if (!notification.read) {
      onMarkAsRead()
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      navigate(notification.actionUrl)
      onClose?.()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  // Memoize the relative time calculation
  const formattedTime = useMemo(
    // eslint-disable-next-line react-hooks/purity -- Date.now() used for relative time display
    () => formatRelativeTime(notification.createdAt, Date.now()),
    [notification.createdAt]
  )

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'vendor_application':
      case 'sponsor_application':
        return '📋'
      case 'task_deadline':
        return '⏰'
      case 'event_reminder':
        return '📅'
      case 'budget_threshold':
        return '💰'
      case 'application_approved':
        return '✅'
      case 'application_rejected':
        return 'ℹ️'
      case 'event_published':
        return '🎉'
      case 'team_invitation':
        return '👥'
      default:
        return '🔔'
    }
  }

  return (
    <div
      className={cn(
        'relative p-4 hover:bg-muted/50 transition-colors cursor-pointer group',
        !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
      )}
      onClick={handleClick}
      data-testid="notification-item"
      data-read={notification.read}
      data-action-url={notification.actionUrl || undefined}
      data-action-label={notification.actionLabel || undefined}
      data-notification-type={notification.type}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-600"
          data-testid="unread-indicator"
          aria-label="Unread"
        />
      )}

      <div className="flex gap-3 pl-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 text-2xl"
          data-testid="notification-icon"
          aria-label={`${notification.type} notification`}
        >
          {getNotificationIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                'text-sm font-medium line-clamp-1',
                !notification.read && 'font-semibold'
              )}
              data-testid="notification-title"
            >
              {notification.title}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={handleDelete}
              data-testid="delete-notification"
              aria-label="Delete notification"
            >
              <X size={16} />
            </Button>
          </div>

          <p
            className="text-sm text-muted-foreground mt-1 line-clamp-2"
            data-testid="notification-message"
          >
            {notification.message}
          </p>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span data-testid="notification-time">{formattedTime}</span>
            </div>
            {notification.read && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle size={12} />
                <span>Read</span>
              </div>
            )}
          </div>

          {notification.actionLabel && notification.actionUrl && (
            <div className="mt-2">
              <span
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                data-testid="notification-action"
              >
                {notification.actionLabel} →
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
