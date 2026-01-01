import { useCallback } from 'react'

/**
 * Hook for managing arrays with toggle, add, and remove operations.
 * Useful for multi-select scenarios like selecting tiers, categories, etc.
 *
 * @example
 * const [tiers, setTiers] = useState<string[]>([])
 * const tierActions = useToggleArray(tiers, setTiers)
 *
 * // Toggle a tier
 * tierActions.toggle('gold')
 *
 * // Check if selected
 * tierActions.includes('gold') // true
 */
export function useToggleArray<T>(array: T[], setArray: React.Dispatch<React.SetStateAction<T[]>>) {
  /**
   * Toggle an item in the array.
   * If present, remove it. If absent, add it.
   */
  const toggle = useCallback(
    (item: T) => {
      setArray((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]))
    },
    [setArray]
  )

  /**
   * Add an item if not already present
   */
  const add = useCallback(
    (item: T) => {
      setArray((prev) => (prev.includes(item) ? prev : [...prev, item]))
    },
    [setArray]
  )

  /**
   * Remove an item from the array
   */
  const remove = useCallback(
    (item: T) => {
      setArray((prev) => prev.filter((i) => i !== item))
    },
    [setArray]
  )

  /**
   * Clear all items
   */
  const clear = useCallback(() => setArray([]), [setArray])

  /**
   * Set items to a specific array
   */
  const set = useCallback((items: T[]) => setArray(items), [setArray])

  /**
   * Check if an item is in the array
   */
  const includes = useCallback((item: T) => array.includes(item), [array])

  return {
    toggle,
    add,
    remove,
    clear,
    set,
    includes,
    items: array,
    isEmpty: array.length === 0,
    count: array.length,
  }
}

/**
 * Standalone toggle function for simple use cases
 */
export function toggleArrayItem<T>(array: T[], item: T): T[] {
  return array.includes(item) ? array.filter((i) => i !== item) : [...array, item]
}
