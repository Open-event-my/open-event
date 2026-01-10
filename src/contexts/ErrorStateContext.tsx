/**
 * Error State Manager Context
 *
 * Manages error state with deduplication, persistence, and ordering.
 * Provides React context for accessing and managing errors across the application.
 *
 * Requirements: 7.2, 7.3, 7.4, 7.5, 7.6
 */

import React, { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'
import { createErrorStateManager, type ErrorStateManager } from './errorStateManager'
import { ErrorStateContext } from './ErrorStateContext.context'

/**
 * Props for ErrorStateProvider
 */
interface ErrorStateProviderProps {
  children: React.ReactNode
  manager?: ErrorStateManager
}

/**
 * Error State Provider Component
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export function ErrorStateProvider({ children, manager: customManager }: ErrorStateProviderProps) {
  const manager = useMemo(() => {
    return customManager || createErrorStateManager()
  }, [customManager])

  const errors = useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot)

  const addError = useCallback(
    (error: EnhancedFormattedError) => manager.addError(error),
    [manager]
  )

  const removeError = useCallback((id: string) => manager.removeError(id), [manager])

  const clearTransient = useCallback(() => manager.clearTransient(), [manager])

  const isDuplicate = useCallback(
    (error: EnhancedFormattedError) => manager.isDuplicate(error),
    [manager]
  )

  const getDuplicateCount = useCallback(
    (signature: string) => manager.getDuplicateCount(signature),
    [manager]
  )

  const value = useMemo(
    () => ({
      manager,
      errors,
      addError,
      removeError,
      clearTransient,
      isDuplicate,
      getDuplicateCount,
    }),
    [manager, errors, addError, removeError, clearTransient, isDuplicate, getDuplicateCount]
  )

  return <ErrorStateContext.Provider value={value}>{children}</ErrorStateContext.Provider>
}
