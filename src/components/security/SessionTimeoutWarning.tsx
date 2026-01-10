/**
 * Session Timeout Warning Component
 * Displays a warning dialog when session is about to expire
 */

import { useState, useMemo } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

export function SessionTimeoutWarning() {
  const [dismissed, setDismissed] = useState(false)
  const { timeRemaining, isNearTimeout, resetTimer } = useSessionTimeout({
    onWarning: () => setDismissed(false),
    onTimeout: () => setDismissed(true),
  })

  // Derive showWarning from isNearTimeout and dismissed state
  const showWarning = useMemo(() => {
    return isNearTimeout && !dismissed
  }, [isNearTimeout, dismissed])

  // Format time remaining as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleContinue = () => {
    resetTimer()
    setDismissed(true)
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={(open) => !open && setDismissed(true)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in {formatTime(timeRemaining)} due to inactivity. You will be
            automatically signed out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleContinue}>Continue Session</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
