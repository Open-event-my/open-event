import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface AsyncActionOptions {
  successMessage?: string
  errorMessage?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * A reusable hook for handling async actions with loading state and toast notifications.
 * Eliminates duplicate try-catch-toast patterns across the codebase.
 *
 * @example
 * const { isLoading, execute } = useAsyncAction()
 *
 * const handleApprove = (id: string) => {
 *   execute(() => approveMutation({ id }), {
 *     successMessage: 'Item approved successfully',
 *   })
 * }
 */
export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(
    async <T>(action: () => Promise<T>, options: AsyncActionOptions = {}): Promise<T | null> => {
      const { successMessage, errorMessage, onSuccess, onError } = options
      setIsLoading(true)
      try {
        const result = await action()
        if (successMessage) toast.success(successMessage)
        onSuccess?.()
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred'
        toast.error(errorMessage || message)
        onError?.(error instanceof Error ? error : new Error(message))
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return { isLoading, execute }
}

/**
 * A variant that accepts multiple named actions for components with several async operations.
 *
 * @example
 * const { loadingStates, execute } = useAsyncActions()
 *
 * const handleApprove = (id: string) => {
 *   execute('approve', () => approveMutation({ id }), {
 *     successMessage: 'Approved',
 *   })
 * }
 *
 * const handleReject = (id: string, reason: string) => {
 *   execute('reject', () => rejectMutation({ id, reason }), {
 *     successMessage: 'Rejected',
 *   })
 * }
 *
 * // Check loading state: loadingStates.approve, loadingStates.reject
 */
export function useAsyncActions<T extends string>() {
  const [loadingStates, setLoadingStates] = useState<Record<T, boolean>>({} as Record<T, boolean>)

  const execute = useCallback(
    async <R>(
      actionName: T,
      action: () => Promise<R>,
      options: AsyncActionOptions = {}
    ): Promise<R | null> => {
      const { successMessage, errorMessage, onSuccess, onError } = options
      setLoadingStates((prev) => ({ ...prev, [actionName]: true }))
      try {
        const result = await action()
        if (successMessage) toast.success(successMessage)
        onSuccess?.()
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred'
        toast.error(errorMessage || message)
        onError?.(error instanceof Error ? error : new Error(message))
        return null
      } finally {
        setLoadingStates((prev) => ({ ...prev, [actionName]: false }))
      }
    },
    []
  )

  const isLoading = useCallback(
    (actionName: T) => loadingStates[actionName] ?? false,
    [loadingStates]
  )

  return { loadingStates, isLoading, execute }
}
