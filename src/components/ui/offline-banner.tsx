/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react'
import { WifiSlash, X } from '@phosphor-icons/react'
import { useIsOnline } from '@/hooks/useNetworkStatus'
import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  /**
   * Additional class name.
   */
  className?: string
  /**
   * Whether the banner can be dismissed.
   * @default false
   */
  dismissible?: boolean
  /**
   * Custom message to display.
   */
  message?: string
  /**
   * Position of the banner.
   * @default 'bottom'
   */
  position?: 'top' | 'bottom'
}

/**
 * A banner that appears when the user goes offline.
 *
 * Features:
 * - Automatic detection of online/offline status
 * - Smooth animation
 * - Optional dismiss button
 * - Customizable position and message
 *
 * @example
 * ```tsx
 * // In App.tsx or layout component
 * function App() {
 *   return (
 *     <>
 *       <OfflineBanner />
 *       <Routes>...</Routes>
 *     </>
 *   )
 * }
 *
 * // Dismissible banner at top
 * <OfflineBanner position="top" dismissible />
 * ```
 */
export function OfflineBanner({
  className,
  dismissible = false,
  message = "You're offline. Changes will sync when you reconnect.",
  position = 'bottom',
}: OfflineBannerProps) {
  const isOnline = useIsOnline()
  const [isDismissed, setIsDismissed] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  // Reset dismiss state when coming back online
  // This is intentional - we want to reset the dismiss state when the user comes back online
  useEffect(() => {
    if (isOnline) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset on reconnect
      setIsDismissed(false)
    }
  }, [isOnline])

  // Animate banner in/out
  useEffect(() => {
    if (!isOnline && !isDismissed) {
      // Small delay before showing to avoid flash on quick connection drops
      const timer = setTimeout(() => setShowBanner(true), 500)
      return () => clearTimeout(timer)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hide on reconnect
      setShowBanner(false)
    }
  }, [isOnline, isDismissed])

  if (isOnline || isDismissed || !showBanner) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 flex items-center justify-center px-4',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
          'bg-amber-500 text-white',
          position === 'top' ? 'mt-4 rounded-t-none' : 'mb-4 rounded-b-none'
        )}
      >
        <WifiSlash size={20} weight="bold" className="shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * A compact inline offline indicator.
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const isOnline = useIsOnline()

  if (isOnline) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'text-xs font-medium',
        className
      )}
    >
      <WifiSlash size={12} weight="bold" />
      Offline
    </div>
  )
}

/**
 * Shows online status with a dot indicator.
 */
export function ConnectionStatus({ className }: { className?: string }) {
  const isOnline = useIsOnline()

  return (
    <div className={cn('inline-flex items-center gap-2 text-xs', className)}>
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isOnline ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
        )}
      />
      <span className="text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  )
}

/**
 * Hook to show a toast when connection status changes.
 */
export function useConnectionToast() {
  const isOnline = useIsOnline()
  const [wasOnline, setWasOnline] = useState(true)

  useEffect(() => {
    // Import toast dynamically to avoid circular dependencies
    import('sonner').then(({ toast }) => {
      if (!isOnline && wasOnline) {
        toast.warning("You're offline", {
          description: 'Changes will sync when you reconnect.',
          duration: Infinity,
          id: 'offline-status',
        })
      } else if (isOnline && !wasOnline) {
        toast.dismiss('offline-status')
        toast.success("You're back online", {
          description: 'Your changes are syncing.',
          duration: 3000,
        })
      }
      setWasOnline(isOnline)
    })
  }, [isOnline, wasOnline])
}
