/**
 * React Hook for Connectivity Monitor
 *
 * Provides React integration for the connectivity monitor service.
 * Tracks online/offline status and manages action queuing.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ConnectivityMonitor,
  getConnectivityMonitor,
  type QueuedAction,
} from '../lib/connectivityMonitor'

/**
 * Hook return type
 */
export interface UseConnectivityMonitorResult {
  /** Current online status */
  isOnline: boolean
  /** Number of queued actions */
  queuedCount: number
  /** List of queued actions */
  queuedActions: QueuedAction[]
  /** Queue an action for when online */
  queueAction: (action: Omit<QueuedAction, 'id' | 'queuedAt' | 'retryCount'>) => string
  /** Clear all queued actions */
  clearQueue: () => void
  /** Remove a specific action from the queue */
  removeAction: (id: string) => boolean
  /** Manually process the queue */
  processQueue: () => Promise<void>
}

/**
 * Hook for using the connectivity monitor
 *
 * @param monitor - Optional custom monitor instance (uses global by default)
 * @returns Connectivity state and queue management functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOnline, queuedCount, queueAction } = useConnectivityMonitor()
 *
 *   const handleSave = async () => {
 *     if (!isOnline) {
 *       queueAction({
 *         execute: () => api.saveData(data),
 *         description: 'Save data'
 *       })
 *       return
 *     }
 *     await api.saveData(data)
 *   }
 *
 *   return (
 *     <div>
 *       {!isOnline && <OfflineBanner queuedCount={queuedCount} />}
 *       <button onClick={handleSave}>Save</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useConnectivityMonitor(
  monitor?: ConnectivityMonitor
): UseConnectivityMonitorResult {
  const connectivityMonitor = useMemo(() => monitor || getConnectivityMonitor(), [monitor])

  const [isOnline, setIsOnline] = useState(() => connectivityMonitor.isOnline)
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>(() =>
    connectivityMonitor.getQueuedActions()
  )

  // Subscribe to connectivity changes
  useEffect(() => {
    const unsubscribeConnectivity = connectivityMonitor.onConnectivityChange((online) => {
      setIsOnline(online)
    })

    const unsubscribeQueue = connectivityMonitor.onQueueChange((queue) => {
      setQueuedActions(queue)
    })

    return () => {
      unsubscribeConnectivity()
      unsubscribeQueue()
    }
  }, [connectivityMonitor])

  const queueAction = useCallback(
    (action: Omit<QueuedAction, 'id' | 'queuedAt' | 'retryCount'>) => {
      return connectivityMonitor.queueAction(action)
    },
    [connectivityMonitor]
  )

  const clearQueue = useCallback(() => {
    connectivityMonitor.clearQueue()
  }, [connectivityMonitor])

  const removeAction = useCallback(
    (id: string) => {
      return connectivityMonitor.removeAction(id)
    },
    [connectivityMonitor]
  )

  const processQueue = useCallback(async () => {
    await connectivityMonitor.processQueueManually()
  }, [connectivityMonitor])

  return {
    isOnline,
    queuedCount: queuedActions.length,
    queuedActions,
    queueAction,
    clearQueue,
    removeAction,
    processQueue,
  }
}

/**
 * Simple hook that just returns online status
 * Lighter weight alternative when queue management isn't needed
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useIsConnected()
 *   return <div>{isOnline ? 'Online' : 'Offline'}</div>
 * }
 * ```
 */
export function useIsConnected(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const monitor = getConnectivityMonitor()
    const unsubscribe = monitor.onConnectivityChange(setIsOnline)
    return unsubscribe
  }, [])

  return isOnline
}

export type { QueuedAction }
