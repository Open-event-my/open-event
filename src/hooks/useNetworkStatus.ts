import { useState, useEffect, useCallback } from 'react'

type ConnectionType = 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'unknown'

interface NetworkStatus {
  /**
   * Whether the browser reports being online.
   */
  isOnline: boolean

  /**
   * Whether the connection is considered slow (3g or below).
   */
  isSlowConnection: boolean

  /**
   * The effective connection type if available.
   */
  connectionType: ConnectionType

  /**
   * Estimated downlink speed in Mbps (if available).
   */
  downlink: number | null

  /**
   * Estimated round-trip time in ms (if available).
   */
  rtt: number | null

  /**
   * Whether data saver mode is enabled (if available).
   */
  saveData: boolean
}

// Extend Navigator interface for Network Information API
interface NetworkInformation {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
  downlink: number
  rtt: number
  saveData: boolean
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

/**
 * Get the Network Information API connection object if available.
 */
function getConnection(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null

  const nav = navigator as NavigatorWithConnection
  return nav.connection || nav.mozConnection || nav.webkitConnection || null
}

/**
 * A hook that monitors network connectivity status.
 *
 * Features:
 * - Online/offline detection
 * - Connection type detection (wifi, 4g, 3g, etc.)
 * - Slow connection detection
 * - Data saver mode awareness
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOnline, isSlowConnection, connectionType } = useNetworkStatus()
 *
 *   if (!isOnline) {
 *     return <OfflineBanner />
 *   }
 *
 *   if (isSlowConnection) {
 *     // Load lower quality images, etc.
 *   }
 *
 *   return <Content />
 * }
 * ```
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    const connection = getConnection()
    const effectiveType = connection?.effectiveType

    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSlowConnection: effectiveType ? ['slow-2g', '2g', '3g'].includes(effectiveType) : false,
      connectionType: effectiveType || 'unknown',
      downlink: connection?.downlink ?? null,
      rtt: connection?.rtt ?? null,
      saveData: connection?.saveData ?? false,
    }
  })

  const updateStatus = useCallback(() => {
    const connection = getConnection()
    const effectiveType = connection?.effectiveType

    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection: effectiveType ? ['slow-2g', '2g', '3g'].includes(effectiveType) : false,
      connectionType: effectiveType || 'unknown',
      downlink: connection?.downlink ?? null,
      rtt: connection?.rtt ?? null,
      saveData: connection?.saveData ?? false,
    })
  }, [])

  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    // Listen for connection changes
    const connection = getConnection()
    if (connection) {
      connection.addEventListener('change', updateStatus)
    }

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)

      if (connection) {
        connection.removeEventListener('change', updateStatus)
      }
    }
  }, [updateStatus])

  return status
}

/**
 * A simpler hook that just returns whether the user is online.
 *
 * @example
 * ```tsx
 * const isOnline = useIsOnline()
 * ```
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

export type { NetworkStatus, ConnectionType }
