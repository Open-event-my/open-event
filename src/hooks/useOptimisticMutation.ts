import { useState, useCallback, useRef } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/types/errors'
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server'

interface OptimisticMutationOptions<Args, Result> {
  /**
   * Called immediately when mutation starts.
   * Use this to update local state optimistically.
   */
  onMutate?: (args: Args) => void | (() => void)

  /**
   * Called when mutation succeeds.
   */
  onSuccess?: (result: Result, args: Args) => void

  /**
   * Called when mutation fails.
   * If onMutate returned a rollback function, it will be called before onError.
   */
  onError?: (error: Error, args: Args) => void

  /**
   * Success message to show in toast.
   */
  successMessage?: string

  /**
   * Error message to show in toast. Falls back to error message from server.
   */
  errorMessage?: string

  /**
   * Whether to show loading toast during mutation.
   * @default false
   */
  showLoadingToast?: boolean

  /**
   * Loading message to show in toast.
   * @default "Saving..."
   */
  loadingMessage?: string
}

interface OptimisticMutationState {
  isLoading: boolean
  error: Error | null
  isSuccess: boolean
}

/**
 * A hook that wraps Convex mutations with optimistic update support.
 *
 * Features:
 * - Immediate UI update before server confirmation
 * - Automatic rollback on failure
 * - Toast notifications for success/error
 * - Loading state management
 *
 * @example
 * ```tsx
 * const { mutate, isLoading } = useOptimisticMutation(
 *   api.events.deleteEvent,
 *   {
 *     onMutate: (args) => {
 *       // Store previous value for rollback
 *       const prevEvents = [...events]
 *       // Optimistically remove from list
 *       setEvents(events.filter(e => e._id !== args.eventId))
 *       // Return rollback function
 *       return () => setEvents(prevEvents)
 *     },
 *     successMessage: 'Event deleted',
 *   }
 * )
 *
 * <Button onClick={() => mutate({ eventId })} disabled={isLoading}>
 *   Delete
 * </Button>
 * ```
 */
export function useOptimisticMutation<Mutation extends FunctionReference<'mutation'>>(
  mutation: Mutation,
  options: OptimisticMutationOptions<FunctionArgs<Mutation>, FunctionReturnType<Mutation>> = {}
) {
  const mutationFn = useMutation(mutation)
  const [state, setState] = useState<OptimisticMutationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  })

  // Store rollback function in ref to avoid stale closures
  const rollbackRef = useRef<(() => void) | null>(null)
  const loadingToastRef = useRef<string | number | null>(null)

  const mutate = useCallback(
    async (args: FunctionArgs<Mutation>) => {
      const {
        onMutate,
        onSuccess,
        onError,
        successMessage,
        errorMessage,
        showLoadingToast,
        loadingMessage = 'Saving...',
      } = options

      // Reset state
      setState({ isLoading: true, error: null, isSuccess: false })

      // Execute optimistic update
      if (onMutate) {
        const rollback = onMutate(args)
        if (typeof rollback === 'function') {
          rollbackRef.current = rollback
        }
      }

      // Show loading toast if requested
      if (showLoadingToast) {
        loadingToastRef.current = toast.loading(loadingMessage)
      }

      try {
        const result = await mutationFn(args)

        // Dismiss loading toast
        if (loadingToastRef.current) {
          toast.dismiss(loadingToastRef.current)
          loadingToastRef.current = null
        }

        // Clear rollback since we succeeded
        rollbackRef.current = null

        setState({ isLoading: false, error: null, isSuccess: true })

        if (successMessage) {
          toast.success(successMessage)
        }

        onSuccess?.(result, args)

        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(getErrorMessage(err))

        // Dismiss loading toast
        if (loadingToastRef.current) {
          toast.dismiss(loadingToastRef.current)
          loadingToastRef.current = null
        }

        // Execute rollback if we have one
        if (rollbackRef.current) {
          rollbackRef.current()
          rollbackRef.current = null
        }

        setState({ isLoading: false, error, isSuccess: false })

        toast.error(errorMessage || error.message)

        onError?.(error, args)

        throw error
      }
    },
    [mutationFn, options]
  )

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, isSuccess: false })
    rollbackRef.current = null
  }, [])

  return {
    mutate,
    mutateAsync: mutate,
    reset,
    ...state,
  }
}

export type { OptimisticMutationOptions, OptimisticMutationState }
