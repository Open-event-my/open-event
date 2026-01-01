import { useState, useCallback, useRef } from 'react'

/**
 * State for optimistic updates
 */
export interface OptimisticState<T> {
  /** Current value (may be optimistic) */
  value: T
  /** Whether an optimistic update is pending */
  isPending: boolean
  /** Whether the last update was rolled back */
  wasRolledBack: boolean
  /** Error from the last failed update */
  error: Error | null
}

/**
 * Options for useOptimisticState hook
 */
export interface UseOptimisticStateOptions<T> {
  /** Callback when rollback occurs */
  onRollback?: (previousValue: T, error: Error) => void
  /** Callback when update succeeds */
  onSuccess?: (newValue: T) => void
}

/**
 * Return type for useOptimisticState hook
 */
export interface UseOptimisticStateReturn<T> extends OptimisticState<T> {
  /** Apply an optimistic update */
  optimisticUpdate: (newValue: T) => void
  /** Confirm the optimistic update (server confirmed) */
  confirm: () => void
  /** Rollback to previous value (server rejected) */
  rollback: (error?: Error | string) => void
  /** Reset to a new value (e.g., from server) */
  reset: (value: T) => void
  /** Execute an async operation with automatic optimistic update and rollback */
  execute: <R>(newValue: T, operation: () => Promise<R>) => Promise<R>
}

/**
 * Hook for managing optimistic state updates with automatic rollback.
 *
 * Features:
 * - Immediate UI update before server confirmation
 * - Automatic rollback on failure
 * - Tracks pending state and rollback status
 * - Execute helper for async operations
 *
 * @example
 * ```tsx
 * function TodoItem({ todo }) {
 *   const { value, isPending, execute } = useOptimisticState(todo.completed)
 *
 *   const handleToggle = async () => {
 *     await execute(!value, async () => {
 *       await updateTodo({ id: todo.id, completed: !value })
 *     })
 *   }
 *
 *   return (
 *     <Checkbox
 *       checked={value}
 *       onChange={handleToggle}
 *       disabled={isPending}
 *     />
 *   )
 * }
 * ```
 *
 * **Validates: Requirements 11.8** - Implement optimistic UI updates with rollback
 */
export function useOptimisticState<T>(
  initialValue: T,
  options: UseOptimisticStateOptions<T> = {}
): UseOptimisticStateReturn<T> {
  const { onRollback, onSuccess } = options

  const [state, setState] = useState<OptimisticState<T>>({
    value: initialValue,
    isPending: false,
    wasRolledBack: false,
    error: null,
  })

  // Store previous value for rollback
  const previousValueRef = useRef<T>(initialValue)

  const optimisticUpdate = useCallback(
    (newValue: T) => {
      previousValueRef.current = state.value
      setState({
        value: newValue,
        isPending: true,
        wasRolledBack: false,
        error: null,
      })
    },
    [state.value]
  )

  const confirm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPending: false,
      wasRolledBack: false,
      error: null,
    }))
    onSuccess?.(state.value)
  }, [state.value, onSuccess])

  const rollback = useCallback(
    (error?: Error | string) => {
      const errorObj = error
        ? typeof error === 'string'
          ? new Error(error)
          : error
        : new Error('Operation failed')

      const previousValue = previousValueRef.current

      setState({
        value: previousValue,
        isPending: false,
        wasRolledBack: true,
        error: errorObj,
      })

      onRollback?.(previousValue, errorObj)
    },
    [onRollback]
  )

  const reset = useCallback((value: T) => {
    previousValueRef.current = value
    setState({
      value,
      isPending: false,
      wasRolledBack: false,
      error: null,
    })
  }, [])

  const execute = useCallback(
    async <R>(newValue: T, operation: () => Promise<R>): Promise<R> => {
      optimisticUpdate(newValue)

      try {
        const result = await operation()
        confirm()
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        rollback(error)
        throw error
      }
    },
    [optimisticUpdate, confirm, rollback]
  )

  return {
    ...state,
    optimisticUpdate,
    confirm,
    rollback,
    reset,
    execute,
  }
}

/**
 * Hook for managing optimistic updates on arrays (add, remove, update items).
 *
 * @example
 * ```tsx
 * function TodoList() {
 *   const todos = useQuery(api.todos.list)
 *   const { items, addItem, removeItem, updateItem } = useOptimisticList(todos ?? [])
 *
 *   const handleAdd = async (text: string) => {
 *     const tempId = `temp-${Date.now()}`
 *     await addItem(
 *       { id: tempId, text, completed: false },
 *       async () => {
 *         const newTodo = await createTodo({ text })
 *         return newTodo
 *       }
 *     )
 *   }
 *
 *   return <ul>{items.map(todo => <TodoItem key={todo.id} todo={todo} />)}</ul>
 * }
 * ```
 */
export function useOptimisticList<T extends { id?: string; _id?: string }>(
  initialItems: T[],
  options: UseOptimisticStateOptions<T[]> = {}
) {
  const {
    value: items,
    isPending,
    wasRolledBack,
    error,
    execute,
    reset,
  } = useOptimisticState(initialItems, options)

  const getItemId = useCallback((item: T): string => {
    return (item.id ?? item._id ?? '') as string
  }, [])

  const addItem = useCallback(
    async <R>(item: T, operation: () => Promise<R>): Promise<R> => {
      return execute([...items, item], operation)
    },
    [items, execute]
  )

  const removeItem = useCallback(
    async <R>(itemId: string, operation: () => Promise<R>): Promise<R> => {
      return execute(
        items.filter((item) => getItemId(item) !== itemId),
        operation
      )
    },
    [items, execute, getItemId]
  )

  const updateItem = useCallback(
    async <R>(itemId: string, updates: Partial<T>, operation: () => Promise<R>): Promise<R> => {
      return execute(
        items.map((item) => (getItemId(item) === itemId ? { ...item, ...updates } : item)),
        operation
      )
    },
    [items, execute, getItemId]
  )

  return {
    items,
    isPending,
    wasRolledBack,
    error,
    addItem,
    removeItem,
    updateItem,
    reset,
  }
}

/**
 * Hook for managing optimistic toggle state (boolean).
 *
 * @example
 * ```tsx
 * function LikeButton({ postId, initialLiked }) {
 *   const { value: isLiked, isPending, toggle } = useOptimisticToggle(initialLiked)
 *
 *   const handleClick = () => {
 *     toggle(async () => {
 *       await toggleLike({ postId })
 *     })
 *   }
 *
 *   return (
 *     <Button onClick={handleClick} disabled={isPending}>
 *       {isLiked ? '❤️' : '🤍'}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useOptimisticToggle(
  initialValue: boolean,
  options: UseOptimisticStateOptions<boolean> = {}
) {
  const { value, isPending, wasRolledBack, error, execute, reset } = useOptimisticState(
    initialValue,
    options
  )

  const toggle = useCallback(
    async <R>(operation: () => Promise<R>): Promise<R> => {
      return execute(!value, operation)
    },
    [value, execute]
  )

  const setTrue = useCallback(
    async <R>(operation: () => Promise<R>): Promise<R> => {
      if (value) {
        return operation() // Already true, just run operation
      }
      return execute(true, operation)
    },
    [value, execute]
  )

  const setFalse = useCallback(
    async <R>(operation: () => Promise<R>): Promise<R> => {
      if (!value) {
        return operation() // Already false, just run operation
      }
      return execute(false, operation)
    },
    [value, execute]
  )

  return {
    value,
    isPending,
    wasRolledBack,
    error,
    toggle,
    setTrue,
    setFalse,
    reset,
  }
}

/**
 * Hook for managing optimistic counter state.
 *
 * @example
 * ```tsx
 * function LikeCounter({ postId, initialCount }) {
 *   const { value: count, isPending, increment, decrement } = useOptimisticCounter(initialCount)
 *
 *   const handleLike = () => {
 *     increment(async () => {
 *       await likePost({ postId })
 *     })
 *   }
 *
 *   return <span>{count} likes</span>
 * }
 * ```
 */
export function useOptimisticCounter(
  initialValue: number,
  options: UseOptimisticStateOptions<number> = {}
) {
  const { value, isPending, wasRolledBack, error, execute, reset } = useOptimisticState(
    initialValue,
    options
  )

  const increment = useCallback(
    async <R>(operation: () => Promise<R>, amount: number = 1): Promise<R> => {
      return execute(value + amount, operation)
    },
    [value, execute]
  )

  const decrement = useCallback(
    async <R>(operation: () => Promise<R>, amount: number = 1): Promise<R> => {
      return execute(value - amount, operation)
    },
    [value, execute]
  )

  const set = useCallback(
    async <R>(newValue: number, operation: () => Promise<R>): Promise<R> => {
      return execute(newValue, operation)
    },
    [execute]
  )

  return {
    value,
    isPending,
    wasRolledBack,
    error,
    increment,
    decrement,
    set,
    reset,
  }
}

// Types are already exported above via interface declarations
