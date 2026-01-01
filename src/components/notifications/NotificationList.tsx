import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { NotificationItem } from './NotificationItem'
import type { Id } from '../../../convex/_generated/dataModel'

interface NotificationListProps {
  onClose?: () => void
}

export function NotificationList({ onClose }: NotificationListProps) {
  const notifications = useQuery(api.notifications.list, { limit: 20 })
  const markAsRead = useMutation(api.notifications.markAsRead)
  const removeNotification = useMutation(api.notifications.remove)

  if (!notifications) {
    return <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-sm">No notifications yet</p>
        <p className="text-xs mt-1">You'll be notified about important updates here</p>
      </div>
    )
  }

  const handleMarkAsRead = async (notificationId: Id<'notifications'>) => {
    try {
      await markAsRead({ notificationId })
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleDelete = async (notificationId: Id<'notifications'>) => {
    try {
      await removeNotification({ notificationId })
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification._id}
          notification={notification}
          onMarkAsRead={() => handleMarkAsRead(notification._id)}
          onDelete={() => handleDelete(notification._id)}
          onClose={onClose}
        />
      ))}
    </div>
  )
}
