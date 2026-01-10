/**
 * ARIA Live Region Hooks
 *
 * Hooks for accessing ARIA live region functionality.
 */

import { useContext, useRef, useEffect } from 'react'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'
import {
  AriaLiveContext,
  type AriaLiveContextValue,
} from '@/components/ui/aria-live-region.context'

/**
 * Hook to access ARIA live region functionality
 *
 * @returns Functions to announce messages and errors
 * @throws Error if used outside of AriaLiveProvider
 */
export function useAriaLive(): AriaLiveContextValue {
  const context = useContext(AriaLiveContext)

  if (context === null) {
    throw new Error('useAriaLive must be used within an AriaLiveProvider')
  }

  return context
}

/**
 * Hook to announce errors automatically when they change
 *
 * @param errors - Array of errors to announce
 */
export function useAnnounceErrors(errors: EnhancedFormattedError[]): void {
  const { announceError } = useAriaLive()
  const previousErrorsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const currentIds = new Set(errors.map((e) => e.id))

    for (const error of errors) {
      if (!previousErrorsRef.current.has(error.id)) {
        announceError(error)
      }
    }

    previousErrorsRef.current = currentIds
  }, [errors, announceError])
}
