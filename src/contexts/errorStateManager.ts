/**
 * Error State Manager
 *
 * Core error state management logic with deduplication, persistence, and ordering.
 *
 * Requirements: 7.2, 7.3, 7.4, 7.5, 7.6
 */

import type { EnhancedFormattedError } from '@/lib/errorFormatter'

/**
 * Error state containing all active errors and metadata
 */
export interface ErrorState {
  /** Active errors keyed by ID */
  errors: Map<string, EnhancedFormattedError>
  /** Count of duplicate occurrences per error signature */
  duplicateCounts: Map<string, number>
  /** Errors that persist across navigation */
  persistentErrors: Set<string>
}

/**
 * Error State Manager interface
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export interface ErrorStateManager {
  /** Add a new error */
  addError(error: EnhancedFormattedError): void
  /** Remove an error by ID */
  removeError(id: string): void
  /** Clear all transient errors (on navigation) */
  clearTransient(): void
  /** Get all active errors sorted by timestamp (newest first) */
  getErrors(): EnhancedFormattedError[]
  /** Check if an error with same signature exists */
  isDuplicate(error: EnhancedFormattedError): boolean
  /** Get duplicate count for an error signature */
  getDuplicateCount(signature: string): number
  /** Increment duplicate count */
  incrementDuplicate(signature: string): number
  /** Subscribe to error state changes */
  subscribe(callback: () => void): () => void
  /** Get the current snapshot of errors */
  getSnapshot(): EnhancedFormattedError[]
}

/**
 * Generate a signature for error deduplication
 * Errors with the same signature are considered duplicates
 * Requirements: 7.2
 *
 * @param error - The error to generate a signature for
 * @returns A string signature for deduplication
 */
export function getErrorSignature(error: EnhancedFormattedError): string {
  return `${error.category}:${error.message}:${error.context?.action || 'unknown'}`
}

import type { ErrorCategory } from '@/lib/errorFormatter'

/**
 * Determine if an error category should persist across navigation
 * Requirements: 7.4
 */
function shouldPersistCategory(category: ErrorCategory): boolean {
  return category === 'auth' || category === 'permission'
}

/**
 * Create an Error State Manager instance
 * Requirements: 7.3, 7.4, 7.5, 7.6
 */
export function createErrorStateManager(): ErrorStateManager {
  const state: ErrorState = {
    errors: new Map(),
    duplicateCounts: new Map(),
    persistentErrors: new Set(),
  }

  const subscribers = new Set<() => void>()
  let cachedErrors: EnhancedFormattedError[] | null = null

  function notifySubscribers(): void {
    cachedErrors = null
    subscribers.forEach((callback) => callback())
  }

  function getErrors(): EnhancedFormattedError[] {
    if (cachedErrors !== null) {
      return cachedErrors
    }
    const errors = Array.from(state.errors.values())
    errors.sort((a, b) => b.timestamp - a.timestamp)
    cachedErrors = errors
    return errors
  }

  function isDuplicate(error: EnhancedFormattedError): boolean {
    const signature = getErrorSignature(error)
    for (const existingError of state.errors.values()) {
      if (getErrorSignature(existingError) === signature) {
        return true
      }
    }
    return false
  }

  function getDuplicateCount(signature: string): number {
    return state.duplicateCounts.get(signature) || 0
  }

  function incrementDuplicate(signature: string): number {
    const currentCount = state.duplicateCounts.get(signature) || 1
    const newCount = currentCount + 1
    state.duplicateCounts.set(signature, newCount)
    notifySubscribers()
    return newCount
  }

  function addError(error: EnhancedFormattedError): void {
    const signature = getErrorSignature(error)
    if (isDuplicate(error)) {
      incrementDuplicate(signature)
      return
    }
    state.errors.set(error.id, error)
    state.duplicateCounts.set(signature, 1)
    if (error.persistent || shouldPersistCategory(error.category)) {
      state.persistentErrors.add(error.id)
    }
    notifySubscribers()
  }

  function removeError(id: string): void {
    const error = state.errors.get(id)
    if (!error) return
    const signature = getErrorSignature(error)
    state.errors.delete(id)
    let hasOtherWithSameSignature = false
    for (const e of state.errors.values()) {
      if (getErrorSignature(e) === signature) {
        hasOtherWithSameSignature = true
        break
      }
    }
    if (!hasOtherWithSameSignature) {
      state.duplicateCounts.delete(signature)
    }
    state.persistentErrors.delete(id)
    notifySubscribers()
  }

  function clearTransient(): void {
    const idsToRemove: string[] = []
    for (const [id, error] of state.errors) {
      if (state.persistentErrors.has(id)) continue
      if (error.persistent) continue
      if (shouldPersistCategory(error.category)) continue
      idsToRemove.push(id)
    }
    for (const id of idsToRemove) {
      const error = state.errors.get(id)
      if (error) {
        const signature = getErrorSignature(error)
        state.errors.delete(id)
        let hasOtherWithSameSignature = false
        for (const e of state.errors.values()) {
          if (getErrorSignature(e) === signature) {
            hasOtherWithSameSignature = true
            break
          }
        }
        if (!hasOtherWithSameSignature) {
          state.duplicateCounts.delete(signature)
        }
      }
    }
    if (idsToRemove.length > 0) {
      notifySubscribers()
    }
  }

  function subscribe(callback: () => void): () => void {
    subscribers.add(callback)
    return () => {
      subscribers.delete(callback)
    }
  }

  function getSnapshot(): EnhancedFormattedError[] {
    return getErrors()
  }

  return {
    addError,
    removeError,
    clearTransient,
    getErrors,
    isDuplicate,
    getDuplicateCount,
    incrementDuplicate,
    subscribe,
    getSnapshot,
  }
}
