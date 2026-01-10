/**
 * Error State Context
 *
 * Context for error state management.
 * Separated from the provider component to satisfy react-refresh/only-export-components.
 */

import { createContext } from 'react'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'
import type { ErrorStateManager } from './errorStateManager'

/**
 * Context value type
 */
export interface ErrorStateContextValue {
  manager: ErrorStateManager
  errors: EnhancedFormattedError[]
  addError: (error: EnhancedFormattedError) => void
  removeError: (id: string) => void
  clearTransient: () => void
  isDuplicate: (error: EnhancedFormattedError) => boolean
  getDuplicateCount: (signature: string) => number
}

/**
 * Error State Context
 */
export const ErrorStateContext = createContext<ErrorStateContextValue | null>(null)
