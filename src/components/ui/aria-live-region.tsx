/**
 * ARIA Live Region Component
 *
 * Provides accessible announcements for screen readers when errors occur.
 * Supports different politeness levels based on error criticality.
 *
 * Requirements: 6.1
 */

import { useCallback, useState, useRef, useEffect, type ReactNode } from 'react'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'
import { getPolitenessForCategory, type AriaLivePoliteness } from './aria-live-region.utils'
import { AriaLiveContext } from './aria-live-region.context'

/**
 * Announcement to be made to screen readers
 */
export interface Announcement {
  id: string
  message: string
  politeness: AriaLivePoliteness
  timestamp: number
}

/**
 * Default delay before clearing announcements (in ms)
 */
const ANNOUNCEMENT_CLEAR_DELAY = 5000

/**
 * Props for AriaLiveProvider
 */
interface AriaLiveProviderProps {
  children: ReactNode
  clearDelay?: number
}

/**
 * ARIA Live Region Provider
 *
 * Provides a context for making accessible announcements to screen readers.
 * Should be placed near the root of your app.
 *
 * Requirements: 6.1
 */
export function AriaLiveProvider({
  children,
  clearDelay = ANNOUNCEMENT_CLEAR_DELAY,
}: AriaLiveProviderProps) {
  const [assertiveMessage, setAssertiveMessage] = useState('')
  const [politeMessage, setPoliteMessage] = useState('')

  const assertiveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const politeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (assertiveTimeoutRef.current) {
        clearTimeout(assertiveTimeoutRef.current)
      }
      if (politeTimeoutRef.current) {
        clearTimeout(politeTimeoutRef.current)
      }
    }
  }, [])

  const announce = useCallback(
    (message: string, politeness: AriaLivePoliteness = 'polite') => {
      if (politeness === 'assertive') {
        if (assertiveTimeoutRef.current) {
          clearTimeout(assertiveTimeoutRef.current)
        }
        setAssertiveMessage(message)
        assertiveTimeoutRef.current = setTimeout(() => {
          setAssertiveMessage('')
        }, clearDelay)
      } else {
        if (politeTimeoutRef.current) {
          clearTimeout(politeTimeoutRef.current)
        }
        setPoliteMessage(message)
        politeTimeoutRef.current = setTimeout(() => {
          setPoliteMessage('')
        }, clearDelay)
      }
    },
    [clearDelay]
  )

  const announceError = useCallback(
    (error: EnhancedFormattedError) => {
      const politeness = getPolitenessForCategory(error.category)
      let message = `Error: ${error.message}`
      if (error.suggestions && error.suggestions.length > 0) {
        message += `. ${error.suggestions[0]}`
      }
      announce(message, politeness)
    },
    [announce]
  )

  const clearAnnouncements = useCallback(() => {
    if (assertiveTimeoutRef.current) {
      clearTimeout(assertiveTimeoutRef.current)
    }
    if (politeTimeoutRef.current) {
      clearTimeout(politeTimeoutRef.current)
    }
    setAssertiveMessage('')
    setPoliteMessage('')
  }, [])

  const value = {
    announce,
    announceError,
    clearAnnouncements,
  }

  return (
    <AriaLiveContext.Provider value={value}>
      {children}

      <div
        id="aria-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {assertiveMessage}
      </div>

      <div
        id="aria-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {politeMessage}
      </div>
    </AriaLiveContext.Provider>
  )
}

export default AriaLiveProvider
