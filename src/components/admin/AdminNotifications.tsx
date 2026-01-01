/**
 * Admin Notifications Component
 *
 * Bell icon with dropdown showing recent admin notifications.
 * Includes unread badge, categorized list, and mark-as-read functionality.
 */

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatters'
import {
  Bell,
  ShieldWarning,
  ClipboardText,
  Flag,
  Warning,
  Check,
  Spinner,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type NotificationType =
  | 'security_alert'
  | 'new_application'
  | 'flagged_content'
  | 'user_report'
  | 'system_alert'

const notificationConfig: Record<
  NotificationType,
  { icon: typeof Bell; color: string; label: string }
> = {
  security_alert: {
    icon: ShieldWarning,
    color: 'text-red-500',
    label: 'Security',
  },
  new_application: {
    icon: ClipboardText,
    color: 'text-blue-500',
    label: 'Application',
  },
  flagged_content: {
    icon: Flag,
    color: 'text-amber-500',
    label: 'Flagged',
  },
  user_report: {
    icon: Warning,
    color: 'text-orange-500',
    label: 'Report',
  },
  system_alert: {
    icon: Warning,
    color: 'text-purple-500',
    label: 'System',
  },
}

const severityConfig: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-zinc-500/10', text: 'text-zinc-600' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-600' },
  high: { bg: 'bg-red-500/10', text: 'text-red-600' },
}

export function AdminNotifications() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = useQuery(api.adminNotifications.getUnreadCount)
  const notifications = useQuery(api.adminNotifications.list, { limit: 10 })
  const markAsRead = useMutation(api.adminNotifications.markAsRead)
  const markAllAsRead = useMutation(api.adminNotifications.markAllAsRead)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead({ id: notificationId as never })
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingRead(true)
    try {
      await markAllAsRead({})
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setIsMarkingRead(false)
    }
  }

  const totalUnread = unreadCount?.total ?? 0
  const hasHighSeverity = (unreadCount?.high_severity ?? 0) > 0

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg text-muted-foreground',
          'hover:text-foreground hover:bg-muted transition-colors cursor-pointer',
          isOpen && 'bg-muted text-foreground'
        )}
        aria-label="Notifications"
      >
        <Bell size={20} weight="duotone" />
        {/* Unread badge */}
        {totalUnread > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1',
              'flex items-center justify-center',
              'text-[10px] font-bold rounded-full',
              hasHighSeverity ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white'
            )}
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell size={18} weight="duotone" className="text-primary" />
              <span className="font-semibold text-sm">Notifications</span>
              {totalUnread > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalUnread} new
                </Badge>
              )}
            </div>
            {totalUnread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
              >
                {isMarkingRead ? (
                  <Spinner size={14} className="animate-spin" />
                ) : (
                  <>
                    <Check size={14} className="mr-1" />
                    Mark all read
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications && notifications.length > 0 ? (
              notifications.map((notification) => {
                const config = notificationConfig[notification.type as NotificationType]
                const severity = severityConfig[notification.severity] || severityConfig.low
                const Icon = config?.icon || Bell

                return (
                  <div
                    key={notification._id}
                    className={cn(
                      'px-4 py-3 border-b border-border last:border-b-0 transition-colors',
                      'hover:bg-muted/50 cursor-pointer',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                          severity.bg
                        )}
                      >
                        <Icon size={16} weight="duotone" className={config?.color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium line-clamp-1',
                              !notification.read && 'text-foreground'
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2 h-2 mt-1.5 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] h-5', severity.bg, severity.text)}
                          >
                            {notification.severity}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications && notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
