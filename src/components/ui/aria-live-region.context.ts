/**
 * ARIA Live Region Context
 *
 * Context for ARIA live region functionality.
 * Separated from the provider component to satisfy react-refresh/only-export-components.
 */

import { createContext } from 'react'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'
import type { AriaLivePoliteness } from './aria-live-region.utils'

/**
 * Context value for ARIA live region
 */
export interface AriaLiveContextValue {
  announce: (message: string, politeness?: AriaLivePoliteness) => void
  announceError: (error: EnhancedFormattedError) => void
  clearAnnouncements: () => void
}

/**
 * ARIA Live Context
 */
export const AriaLiveContext = createContext<AriaLiveContextValue | null>(null)
