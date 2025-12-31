import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Loading state for async operations
 */
export interface LoadingState {
  /** Whether the operation is currently loading */
  isLoading: boolean
  /** Whether the operation has started at least once */
  hasStarted: boolean
  /** Whether the operation completed successfully */
  isSuccess: boolean
  /** Whether the operation failed */
  isError: boolean
  /** Error message if operation failed */
  error: Error | null
  /** Timestamp when loading started */
  startedAt: number | null
  /** Duration of the operation in milliseconds */
  duration: number | null
}

/**
 * Options for useLoadingState hook
 */
export interface UseLoadingStateOptions {
  /** Minimum loading time in ms to prevent flash of loading state */
  minLoadingTime?: number
  /** Callback when loading starts */
  onLoadingStart?: () => void
  /** Callback when loading ends */
  onLoadingEnd?: (success: boolean, duration: number) => void
}

/**
 * Return type for useLoadingState hook
 */
export interface UseLoadingStateReturn extends LoadingState {
  /** Start loading state */
  startLoading: () => void
  /** End loading with success */
  endSuccess: () => void
  /** End loading with error */
  endError: (error: Error | string) => void
  /** Reset to initial state */
  reset: () => void
  /** Execute an async function with automatic loading state management */
  execute: <T>(fn: () => Promise<T>) => Promise<T>
}

const initialState: LoadingState = {
  isLoading: false,
  hasStarted: false,
  isSuccess: false,
  isError: false,
  error: null,
  startedAt: null,
  duration: null,
}

/**
 * Hook for managing loading states for async operations.
 * 
 * Features:
 * - Tracks loading, success, and error states
 * - Minimum loading time to prevent flash of loading state
 * - Duration tracking for performance monitoring
 * - Automatic state management with execute() helper
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isLoading, isError, error, execute } = useLoadingState()
 *   
 *   const handleSubmit = async () => {
 *     await execute(async () => {
 *       await api.submitData(data)
 *     })
 *   }
 *   
 *   return (
 *     <Button onClick={handleSubmit} disabled={isLoading}>
 *       {isLoading ? 'Submitting...' : 'Submit'}
 *     </Button>
 *   )
 * }
 * ```
 * 
 * **Validates: Requirements 11.7** - Show loading states for all async operations
 */
export function useLoadingState(options: UseLoadingStateOptions = {}): UseLoadingStateReturn {
  const { minLoadingTime = 0, onLoadingStart, onLoadingEnd } = options
  
  const [state, setState] = useState<LoadingState>(initialState)
  const startTimeRef = useRef<number | null>(null)
  const minLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (minLoadingTimeoutRef.current) {
        clearTimeout(minLoadingTimeoutRef.current)
      }
    }
  }, [])

  const startLoading = useCallback(() => {
    const now = Date.now()
    startTimeRef.current = now
    
    setState({
      isLoading: true,
      hasStarted: true,
      isSuccess: false,
      isError: false,
      error: null,
      startedAt: now,
      duration: null,
    })
    
    onLoadingStart?.()
  }, [onLoadingStart])

  const endWithState = useCallback((success: boolean, error: Error | null = null) => {
    const endTime = Date.now()
    const duration = startTimeRef.current ? endTime - startTimeRef.current : 0
    const remainingMinTime = minLoadingTime - duration

    const updateState = () => {
      if (!isMountedRef.current) return
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: success,
        isError: !success,
        error,
        duration,
      }))
      
      onLoadingEnd?.(success, duration)
    }

    // If we haven't met minimum loading time, wait
    if (remainingMinTime > 0) {
      minLoadingTimeoutRef.current = setTimeout(updateState, remainingMinTime)
    } else {
      updateState()
    }
  }, [minLoadingTime, onLoadingEnd])

  const endSuccess = useCallback(() => {
    endWithState(true)
  }, [endWithState])

  const endError = useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    endWithState(false, errorObj)
  }, [endWithState])

  const reset = useCallback(() => {
    if (minLoadingTimeoutRef.current) {
      clearTimeout(minLoadingTimeoutRef.current)
    }
    startTimeRef.current = null
    setState(initialState)
  }, [])

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    startLoading()
    try {
      const result = await fn()
      endSuccess()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      endError(error)
      throw error
    }
  }, [startLoading, endSuccess, endError])

  return {
    ...state,
    startLoading,
    endSuccess,
    endError,
    reset,
    execute,
  }
}

/**
 * Hook for managing multiple named loading states.
 * Useful for components with multiple async operations.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getState, execute } = useMultipleLoadingStates()
 *   
 *   const handleSave = () => execute('save', () => api.save(data))
 *   const handleDelete = () => execute('delete', () => api.delete(id))
 *   
 *   return (
 *     <>
 *       <Button disabled={getState('save').isLoading}>
 *         {getState('save').isLoading ? 'Saving...' : 'Save'}
 *       </Button>
 *       <Button disabled={getState('delete').isLoading}>
 *         {getState('delete').isLoading ? 'Deleting...' : 'Delete'}
 *       </Button>
 *     </>
 *   )
 * }
 * ```
 */
export function useMultipleLoadingStates<T extends string>() {
  const [states, setStates] = useState<Record<T, LoadingState>>({} as Record<T, LoadingState>)

  const getState = useCallback((key: T): LoadingState => {
    return states[key] ?? initialState
  }, [states])

  const startLoading = useCallback((key: T) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: true,
        hasStarted: true,
        isSuccess: false,
        isError: false,
        error: null,
        startedAt: Date.now(),
        duration: null,
      },
    }))
  }, [])

  const endSuccess = useCallback((key: T) => {
    setStates(prev => {
      const current = prev[key]
      const duration = current?.startedAt ? Date.now() - current.startedAt : 0
      return {
        ...prev,
        [key]: {
          ...current,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null,
          duration,
        },
      }
    })
  }, [])

  const endError = useCallback((key: T, error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    setStates(prev => {
      const current = prev[key]
      const duration = current?.startedAt ? Date.now() - current.startedAt : 0
      return {
        ...prev,
        [key]: {
          ...current,
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorObj,
          duration,
        },
      }
    })
  }, [])

  const reset = useCallback((key: T) => {
    setStates(prev => ({
      ...prev,
      [key]: initialState,
    }))
  }, [])

  const execute = useCallback(async <R>(key: T, fn: () => Promise<R>): Promise<R> => {
    startLoading(key)
    try {
      const result = await fn()
      endSuccess(key)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      endError(key, error)
      throw error
    }
  }, [startLoading, endSuccess, endError])

  const isAnyLoading = useCallback(() => {
    return Object.values(states).some((s) => (s as LoadingState).isLoading)
  }, [states])

  return {
    states,
    getState,
    startLoading,
    endSuccess,
    endError,
    reset,
    execute,
    isAnyLoading,
  }
}

// Re-export the LoadingState interface for convenience
export type { LoadingState as LoadingStateType }
