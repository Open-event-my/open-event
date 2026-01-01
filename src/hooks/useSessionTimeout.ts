/**
 * useSessionTimeout Hook
 * React hook to integrate session timeout with authentication
 */

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSessionManager, type SessionConfig } from '@/lib/security/sessionManager'

export interface UseSessionTimeoutOptions {
  config?: Partial<SessionConfig>
  onWarning?: () => void
  onTimeout?: () => void
}

export interface UseSessionTimeoutReturn {
  timeRemaining: number
  isNearTimeout: boolean
  isTimedOut: boolean
  resetTimer: () => void
}

/**
 * Hook to manage session timeout
 * Automatically signs out user when session expires
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}): UseSessionTimeoutReturn {
  const { isAuthenticated, signOut } = useAuth()
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isNearTimeout, setIsNearTimeout] = useState(false)
  const [isTimedOut, setIsTimedOut] = useState(false)

  const sessionManager = getSessionManager(options.config)

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    setIsTimedOut(true)

    // Call custom timeout handler if provided
    if (options.onTimeout) {
      options.onTimeout()
    }

    // Sign out the user
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out on session timeout:', error)
    }
  }, [signOut, options])

  // Handle session warning
  const handleWarning = useCallback(() => {
    setIsNearTimeout(true)

    // Call custom warning handler if provided
    if (options.onWarning) {
      options.onWarning()
    }
  }, [options])

  // Handle activity
  const handleActivity = useCallback(() => {
    setIsNearTimeout(false)
    setIsTimedOut(false)
  }, [])

  // Reset timer manually
  const resetTimer = useCallback(() => {
    sessionManager.resetTimer()
    setIsNearTimeout(false)
    setIsTimedOut(false)
  }, [sessionManager])

  // Update time remaining periodically
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const interval = setInterval(() => {
      const remaining = sessionManager.getTimeRemaining()
      setTimeRemaining(remaining)
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [isAuthenticated, sessionManager])

  // Start/stop session manager based on authentication
  useEffect(() => {
    if (isAuthenticated) {
      sessionManager.start()

      // Register event handlers
      const unsubscribeTimeout = sessionManager.on((event) => {
        if (event === 'timeout') {
          handleTimeout()
        } else if (event === 'warning') {
          handleWarning()
        } else if (event === 'activity') {
          handleActivity()
        }
      })

      return () => {
        unsubscribeTimeout()
        sessionManager.stop()
      }
    }
  }, [isAuthenticated, sessionManager, handleTimeout, handleWarning, handleActivity])

  return {
    timeRemaining,
    isNearTimeout,
    isTimedOut,
    resetTimer,
  }
}
