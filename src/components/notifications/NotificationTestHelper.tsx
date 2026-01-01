/**
 * Notification Test Helper
 *
 * This component provides a button to create test notifications.
 * It should only be visible in development/test environments.
 *
 * Usage: Add to dashboard or settings page for testing
 */

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Bell } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function NotificationTestHelper() {
  const [creating, setCreating] = useState(false)
  const createTestNotification = useMutation(api.notifications.createTestNotification)

  const handleCreateTest = async () => {
    if (creating) return

    setCreating(true)
    try {
      await createTestNotification()
      toast.success('Test notification created!')
    } catch (error) {
      console.error('Failed to create test notification:', error)
      toast.error('Failed to create test notification')
    } finally {
      setCreating(false)
    }
  }

  // Only show in development or test environments
  if (process.env.NODE_ENV === 'production' && !window.location.hostname.includes('localhost')) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleCreateTest}
        disabled={creating}
        variant="outline"
        size="sm"
        className="shadow-lg"
        data-testid="create-test-notification"
      >
        <Bell size={16} weight="duotone" className="mr-2" />
        {creating ? 'Creating...' : 'Create Test Notification'}
      </Button>
    </div>
  )
}
