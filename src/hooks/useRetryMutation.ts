import { useState, useCallback, useRef } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/types/errors'
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server'

interface RetryMutationOptions<Args, Result> {
  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  maxRetries?: number

  /**
   * Initial delay between retries in milliseconds.
   * Will use exponential backoff (delay * 2^attempt).
   * @default 1000
   */
  retryDelay?: number

  /**
   * Whether to only retry on network errors (not server errors like 400/500).
   * @default true
   */
  retryOnlyNetworkErrors?: boolean

  /**
   * Called when mutation succeeds (after any retries).
   */
  onSuccess?: (result: Result, args: Args) => void

  /**
   * Called when mutation fails after all retries.
   */
  onError?: (error: Error, args: Args, attempts: number) => void

  /**
   * Called before each retry attempt.
   */
  onRetry?: (error: Error, attempt: number, maxRetries: number) => void

  /**
   * Success message to show in toast.
   */
  successMessage?: string

  /**
   * Error message to show in toast. Falls back to error message from server.
   */
  errorMessage?: string
}

interface RetryMutationState {
  isLoading: boolean
  isRetrying: boolean
  retryCount: number
  error: Error | null
  isSuccess: boolean
}

/**
 * Check if an error is likely a network error that should be retried.
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  // Common network error patterns
  const networkPatterns = [
    'network',
    'fetch',
    'timeout',
    'connection',
    'offline',
    'failed to fetch',
    'network request failed',
    'econnrefused',
    'enotfound',
    'etimedout',
  ]

  return networkPatterns.some((pattern) => message.includes(pattern))
}

/**
 * Check if an error is a server error that should not be retried.
 */
function isServerError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()

  // Server error patterns (4xx, 5xx status codes typically in message)
  const serverPatterns = [
    'unauthorized',
    'forbidden',
    'not found',
    'bad request',
    'validation',
    'invalid',
  ]

  return serverPatterns.some((pattern) => message.includes(pattern))
}

/**
 * A hook that wraps Convex mutations with automatic retry logic for network failures.
 *
 * Features:
 * - Exponential backoff (1s, 2s, 4s)
 * - Only retry on network errors by default
 * - Show "Retrying..." indicator
 * - Give up after max retries with helpful message
 *
 * @example
 * ```tsx
 * const { mutate, isLoading, isRetrying, retryCount } = useRetryMutation(
 *   api.events.createEvent,
 *   {
 *     maxRetries: 3,
 *     successMessage: 'Event created',
 *   }
 * )
 *
 * <Button onClick={() => mutate({ name: 'New Event' })} disabled={isLoading}>
 *   {isRetrying ? `Retrying (${retryCount}/3)...` : isLoading ? 'Creating...' : 'Create'}
 * </Button>
 * ```
 */
export function useRetryMutation<Mutation extends FunctionReference<'mutation'>>(
  mutation: Mutation,
  options: RetryMutationOptions<FunctionArgs<Mutation>, FunctionReturnType<Mutation>> = {}
) {
  const mutationFn = useMutation(mutation)
  const [state, setState] = useState<RetryMutationState>({
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
    error: null,
    isSuccess: false,
  })

  // Use ref to track if mutation is cancelled
  const cancelledRef = useRef(false)
  const retryToastRef = useRef<string | number | null>(null)

  const mutate = useCallback(
    async (args: FunctionArgs<Mutation>) => {
      const {
        maxRetries = 3,
        retryDelay = 1000,
        retryOnlyNetworkErrors = true,
        onSuccess,
        onError,
        onRetry,
        successMessage,
        errorMessage,
      } = options

      cancelledRef.current = false

      setState({
        isLoading: true,
        isRetrying: false,
        retryCount: 0,
        error: null,
        isSuccess: false,
      })

      let lastError: Error | null = null
      let attempts = 0

      while (attempts <= maxRetries) {
        // Check if cancelled
        if (cancelledRef.current) {
          setState((prev) => ({ ...prev, isLoading: false, isRetrying: false }))
          return
        }

        try {
          const result = await mutationFn(args)

          // Dismiss retry toast
          if (retryToastRef.current) {
            toast.dismiss(retryToastRef.current)
            retryToastRef.current = null
          }

          setState({
            isLoading: false,
            isRetrying: false,
            retryCount: 0,
            error: null,
            isSuccess: true,
          })

          if (successMessage) {
            toast.success(successMessage)
          }

          onSuccess?.(result, args)

          return result
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(getErrorMessage(err))
          attempts++

          // Check if we should retry
          const shouldRetry =
            attempts <= maxRetries &&
            (!retryOnlyNetworkErrors || (isNetworkError(err) && !isServerError(err)))

          if (shouldRetry) {
            // Calculate delay with exponential backoff
            const delay = retryDelay * Math.pow(2, attempts - 1)

            setState((prev) => ({
              ...prev,
              isRetrying: true,
              retryCount: attempts,
            }))

            // Show retry toast
            if (retryToastRef.current) {
              toast.dismiss(retryToastRef.current)
            }
            retryToastRef.current = toast.loading(
              `Connection issue. Retrying (${attempts}/${maxRetries})...`
            )

            onRetry?.(lastError, attempts, maxRetries)

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay))
          } else {
            // No more retries - fail
            break
          }
        }
      }

      // Dismiss retry toast
      if (retryToastRef.current) {
        toast.dismiss(retryToastRef.current)
        retryToastRef.current = null
      }

      // All retries exhausted
      setState({
        isLoading: false,
        isRetrying: false,
        retryCount: attempts,
        error: lastError,
        isSuccess: false,
      })

      const finalMessage =
        errorMessage ||
        (attempts > 1
          ? `Failed after ${attempts} attempts: ${lastError?.message}`
          : lastError?.message || 'An error occurred')

      toast.error(finalMessage)

      onError?.(lastError!, args, attempts)

      throw lastError
    },
    [mutationFn, options]
  )

  const cancel = useCallback(() => {
    cancelledRef.current = true
    if (retryToastRef.current) {
      toast.dismiss(retryToastRef.current)
      retryToastRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    cancel()
    setState({
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      error: null,
      isSuccess: false,
    })
  }, [cancel])

  return {
    mutate,
    mutateAsync: mutate,
    cancel,
    reset,
    ...state,
  }
}

export { isNetworkError, isServerError }
export type { RetryMutationOptions, RetryMutationState }
