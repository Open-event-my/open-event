/**
 * Enhanced Offline Banner Component
 *
 * Displays a persistent banner when offline with:
 * - Queued action count
 * - List of available vs unavailable features
 * - ARIA announcements for accessibility
 *
 * Requirements: 3.1, 3.6
 */

import React, { useState, useEffect, useMemo } from 'react'
import { WifiSlash, X, Queue, Check, Warning, CaretDown, CaretUp } from '@phosphor-icons/react'
import { useIsOnline } from '@/hooks/useNetworkStatus'
import { getConnectivityMonitor, type QueuedAction } from '@/lib/connectivityMonitor'
import { cn } from '@/lib/utils'
import {
  DEFAULT_FEATURE_AVAILABILITY,
  type FeatureAvailability,
} from './enhanced-offline-banner.constants'

/**
 * Props for EnhancedOfflineBanner
 */
export interface EnhancedOfflineBannerProps {
  /** Additional class name */
  className?: string
  /** Whether the banner can be dismissed */
  dismissible?: boolean
  /** Custom message to display */
  message?: string
  /** Position of the banner */
  position?: 'top' | 'bottom'
  /** Custom feature availability list */
  features?: FeatureAvailability[]
  /** Whether to show the feature list */
  showFeatures?: boolean
  /** Whether to show the queued action count */
  showQueueCount?: boolean
}

/**
 * Enhanced Offline Banner Component
 *
 * Features:
 * - Persistent display when offline
 * - Shows queued action count
 * - Lists available vs unavailable features
 * - Collapsible feature list
 * - ARIA announcements
 *
 * Requirements: 3.1, 3.6
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <EnhancedOfflineBanner
 *         position="top"
 *         showFeatures
 *         showQueueCount
 *       />
 *       <Routes>...</Routes>
 *     </>
 *   )
 * }
 * ```
 */
export function EnhancedOfflineBanner({
  className,
  dismissible = false,
  message = "You're offline",
  position = 'bottom',
  features = DEFAULT_FEATURE_AVAILABILITY,
  showFeatures = true,
  showQueueCount = true,
}: EnhancedOfflineBannerProps) {
  const isOnline = useIsOnline()
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>(() => {
    // Initialize with current queued actions
    return getConnectivityMonitor().getQueuedActions()
  })
  const [showBannerDelayed, setShowBannerDelayed] = useState(false)

  // Track previous online state to detect transitions using a ref
  const prevIsOnlineRef = React.useRef(isOnline)

  // Use a key to force reset of dismissed/expanded state when going online
  // This avoids calling setState in effect by using key-based remounting
  const [resetKey, setResetKey] = useState(0)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Get queued actions from connectivity monitor
  useEffect(() => {
    const monitor = getConnectivityMonitor()

    // Subscribe to queue changes
    const unsubscribe = monitor.onQueueChange((actions) => {
      setQueuedActions(actions)
    })

    return unsubscribe
  }, [])

  // Detect online transition and update reset key
  // The setState here is intentional - we need to reset UI state when connectivity changes
  // This is a valid pattern for syncing with external state (network status)
  React.useLayoutEffect(() => {
    const wasOffline = !prevIsOnlineRef.current
    const isNowOnline = isOnline

    if (wasOffline && isNowOnline) {
      // Use layout effect to batch state updates before paint
      setResetKey((k) => k + 1)
      setIsDismissed(false)
      setIsExpanded(false)
    }

    prevIsOnlineRef.current = isOnline
  }, [isOnline])

  // Animate banner in with delay
  useEffect(() => {
    if (!isOnline && !isDismissed) {
      const timer = setTimeout(() => setShowBannerDelayed(true), 500)
      return () => {
        clearTimeout(timer)
        setShowBannerDelayed(false)
      }
    }
    return undefined
  }, [isOnline, isDismissed, resetKey])

  // Compute showBanner from derived state
  const showBanner = !isOnline && !isDismissed && showBannerDelayed

  // Separate features into available and unavailable
  const { availableFeatures, unavailableFeatures } = useMemo(() => {
    return {
      availableFeatures: features.filter((f) => f.availableOffline),
      unavailableFeatures: features.filter((f) => !f.availableOffline),
    }
  }, [features])

  const queueCount = queuedActions.length

  if (isOnline || isDismissed || !showBanner) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed left-0 right-0 z-50 flex items-center justify-center px-4',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-lg shadow-lg overflow-hidden',
          'bg-amber-500 text-white',
          position === 'top' ? 'mt-4' : 'mb-4'
        )}
      >
        {/* Main banner content */}
        <div className="flex items-center gap-3 px-4 py-3">
          <WifiSlash size={20} weight="bold" className="shrink-0" aria-hidden="true" />

          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{message}</span>

            {/* Queued action count */}
            {/* Requirements: 3.6 - Show queued action count */}
            {showQueueCount && queueCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                <Queue size={12} aria-hidden="true" />
                {queueCount} pending {queueCount === 1 ? 'action' : 'actions'}
              </span>
            )}
          </div>

          {/* Expand/collapse button for features */}
          {showFeatures && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Hide feature availability' : 'Show feature availability'}
            >
              {isExpanded ? (
                <CaretUp size={16} weight="bold" />
              ) : (
                <CaretDown size={16} weight="bold" />
              )}
            </button>
          )}

          {/* Dismiss button */}
          {dismissible && (
            <button
              onClick={() => setIsDismissed(true)}
              className="shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss offline banner"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        {/* Expanded feature list */}
        {/* Requirements: 3.6 - List available vs unavailable features */}
        {showFeatures && isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-white/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Available features */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-80">
                  Available Offline
                </h4>
                <ul className="space-y-1">
                  {availableFeatures.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-2 text-sm">
                      <Check
                        size={14}
                        weight="bold"
                        className="text-green-200"
                        aria-hidden="true"
                      />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Unavailable features */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-80">
                  Requires Connection
                </h4>
                <ul className="space-y-1">
                  {unavailableFeatures.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-2 text-sm opacity-70">
                      <Warning
                        size={14}
                        weight="bold"
                        className="text-amber-200"
                        aria-hidden="true"
                      />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Queued actions list */}
            {showQueueCount && queueCount > 0 && (
              <div className="mt-4 pt-3 border-t border-white/20">
                <h4 className="text-xs font-semibold uppercase tracking-wide mb-2 opacity-80">
                  Pending Actions ({queueCount})
                </h4>
                <ul className="space-y-1">
                  {queuedActions.slice(0, 5).map((action) => (
                    <li key={action.id} className="flex items-center gap-2 text-sm">
                      <Queue size={14} className="opacity-70" aria-hidden="true" />
                      <span className="truncate">{action.description}</span>
                    </li>
                  ))}
                  {queueCount > 5 && (
                    <li className="text-xs opacity-70">...and {queueCount - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact offline indicator with queue count
 */
export function OfflineIndicatorWithQueue({ className }: { className?: string }) {
  const isOnline = useIsOnline()
  const [queueCount, setQueueCount] = useState(() => {
    // Initialize with current queue length
    return getConnectivityMonitor().getQueueLength()
  })

  useEffect(() => {
    const monitor = getConnectivityMonitor()

    const unsubscribe = monitor.onQueueChange((actions) => {
      setQueueCount(actions.length)
    })

    return unsubscribe
  }, [])

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
      <WifiSlash size={12} weight="bold" aria-hidden="true" />
      <span>Offline</span>
      {queueCount > 0 && (
        <span className="px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
          {queueCount}
        </span>
      )}
    </div>
  )
}

export default EnhancedOfflineBanner
