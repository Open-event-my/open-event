/**
 * Session Timeout Warning Component
 * Displays a warning dialog when session is about to expire
 */

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

export function SessionTimeoutWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const { timeRemaining, isNearTimeout, resetTimer } = useSessionTimeout({
    onWarning: () => setShowWarning(true),
    onTimeout: () => setShowWarning(false),
  });

  // Close warning when user is no longer near timeout
  useEffect(() => {
    if (!isNearTimeout) {
      setShowWarning(false);
    }
  }, [isNearTimeout]);

  // Format time remaining as MM:SS
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleContinue = () => {
    resetTimer();
    setShowWarning(false);
  };

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in {formatTime(timeRemaining)} due to inactivity.
            You will be automatically signed out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleContinue}>
            Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
