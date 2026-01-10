/**
 * Error State Hooks
 *
 * Hooks for accessing error state from the ErrorStateContext.
 */

import { useContext, useRef, useEffect } from 'react'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'
import {
  ErrorStateContext,
  type ErrorStateContextValue,
} from '@/contexts/ErrorStateContext.context'

/**
 * Hook to access error state
 * Requirements: 7.3, 7.4, 7.5, 7.6
 *
 * @returns Error state context value
 * @throws Error if used outside of ErrorStateProvider
 */
export function useErrorState(): ErrorStateContextValue {
  const context = useContext(ErrorStateContext)

  if (context === null) {
    throw new Error('useErrorState must be used within an ErrorStateProvider')
  }

  return context
}

/**
 * Hook to get just the errors array (for components that only need to display errors)
 *
 * @returns Array of current errors sorted by timestamp (newest first)
 */
export function useErrors(): EnhancedFormattedError[] {
  const { errors } = useErrorState()
  return errors
}

/**
 * Hook to get error management functions (for components that need to add/remove errors)
 *
 * @returns Object with addError, removeError, and clearTransient functions
 */
export function useErrorActions() {
  const { addError, removeError, clearTransient } = useErrorState()
  return { addError, removeError, clearTransient }
}

/**
 * Hook to automatically clear transient errors on route changes
 * Requirements: 7.4
 */
export function useClearErrorsOnNavigation(): void {
  const { clearTransient } = useErrorState()
  const previousPathRef = useRef<string | null>(null)

  useEffect(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : null

    if (previousPathRef.current !== null && previousPathRef.current !== currentPath) {
      clearTransient()
    }

    previousPathRef.current = currentPath
  })
}

/**
 * Hook to clear transient errors based on pathname changes
 * Requirements: 7.4
 */
export function useLocationBasedErrorClear(pathname: string): void {
  const { clearTransient } = useErrorState()
  const previousPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (previousPathRef.current !== null && previousPathRef.current !== pathname) {
      clearTransient()
    }
    previousPathRef.current = pathname
  }, [pathname, clearTransient])
}
