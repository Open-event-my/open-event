/**
 * Property-Based Tests for Optimistic State Management
 *
 * Tests Property 40: Optimistic UI Updates with Rollback
 * **Validates: Requirements 11.8**
 *
 * For any mutation operation with optimistic updates, if the operation fails,
 * the UI should roll back to the previous state and display an error.
 */

import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import {
  useOptimisticState,
  useOptimisticList,
  useOptimisticToggle,
  useOptimisticCounter,
} from './useOptimisticState'

describe('Optimistic State Management - Property Tests', () => {
  /**
   * Feature: production-readiness, Property 40: Optimistic UI Updates with Rollback
   * Validates: Requirements 11.8
   *
   * For any mutation operation with optimistic updates, if the operation fails,
   * the UI should roll back to the previous state and display an error.
   */
  describe('Property 40: Optimistic UI Updates with Rollback', () => {
    it('should immediately update value when optimisticUpdate is called', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (initialValue, newValue) => {
            fc.pre(initialValue !== newValue) // Ensure values are different

            const { result } = renderHook(() => useOptimisticState(initialValue))

            expect(result.current.value).toBe(initialValue)
            expect(result.current.isPending).toBe(false)

            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            // Value should be updated immediately
            expect(result.current.value).toBe(newValue)
            expect(result.current.isPending).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should rollback to previous value when rollback is called', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (initialValue, newValue, errorMessage) => {
            fc.pre(initialValue !== newValue)

            const { result } = renderHook(() => useOptimisticState(initialValue))

            // Apply optimistic update
            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            expect(result.current.value).toBe(newValue)

            // Rollback
            act(() => {
              result.current.rollback(errorMessage)
            })

            // Should be back to initial value
            expect(result.current.value).toBe(initialValue)
            expect(result.current.isPending).toBe(false)
            expect(result.current.wasRolledBack).toBe(true)
            expect(result.current.error?.message).toBe(errorMessage)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should confirm optimistic update when confirm is called', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (initialValue, newValue) => {
            fc.pre(initialValue !== newValue)

            const { result } = renderHook(() => useOptimisticState(initialValue))

            // Apply optimistic update
            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            expect(result.current.isPending).toBe(true)

            // Confirm
            act(() => {
              result.current.confirm()
            })

            // Value should remain the new value
            expect(result.current.value).toBe(newValue)
            expect(result.current.isPending).toBe(false)
            expect(result.current.wasRolledBack).toBe(false)
            expect(result.current.error).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should execute async operation and rollback on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (initialValue, newValue, errorMessage) => {
            fc.pre(initialValue !== newValue)

            const { result } = renderHook(() => useOptimisticState(initialValue))

            // Execute with failing operation
            const errorHolder: { error?: Error } = {}
            await act(async () => {
              try {
                await result.current.execute(newValue, async () => {
                  throw new Error(errorMessage)
                })
              } catch (err) {
                errorHolder.error = err as Error
              }
            })

            // Should have rolled back
            expect(result.current.value).toBe(initialValue)
            expect(result.current.isPending).toBe(false)
            expect(result.current.wasRolledBack).toBe(true)
            expect(result.current.error?.message).toBe(errorMessage)
            expect(errorHolder.error?.message).toBe(errorMessage)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should execute async operation and confirm on success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (initialValue, newValue, returnValue) => {
            fc.pre(initialValue !== newValue)

            const { result } = renderHook(() => useOptimisticState(initialValue))

            let operationResult: string | null = null
            await act(async () => {
              operationResult = await result.current.execute(newValue, async () => {
                return returnValue
              })
            })

            // Should have confirmed
            expect(result.current.value).toBe(newValue)
            expect(result.current.isPending).toBe(false)
            expect(result.current.wasRolledBack).toBe(false)
            expect(result.current.error).toBeNull()
            expect(operationResult).toBe(returnValue)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should call onRollback callback when rollback occurs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (initialValue, newValue) => {
            fc.pre(initialValue !== newValue)

            const onRollback = vi.fn()
            const { result } = renderHook(() => useOptimisticState(initialValue, { onRollback }))

            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            act(() => {
              result.current.rollback('error')
            })

            expect(onRollback).toHaveBeenCalledTimes(1)
            expect(onRollback).toHaveBeenCalledWith(initialValue, expect.any(Error))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should call onSuccess callback when confirmed', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (initialValue, newValue) => {
            fc.pre(initialValue !== newValue)

            const onSuccess = vi.fn()
            const { result } = renderHook(() => useOptimisticState(initialValue, { onSuccess }))

            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            act(() => {
              result.current.confirm()
            })

            expect(onSuccess).toHaveBeenCalledTimes(1)
            expect(onSuccess).toHaveBeenCalledWith(newValue)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Optimistic Toggle', () => {
    it('should toggle value and rollback on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (initialValue, errorMessage) => {
            const { result } = renderHook(() => useOptimisticToggle(initialValue))

            expect(result.current.value).toBe(initialValue)

            // Toggle with failing operation
            await act(async () => {
              try {
                await result.current.toggle(async () => {
                  throw new Error(errorMessage)
                })
              } catch {
                // Expected
              }
            })

            // Should have rolled back to initial value
            expect(result.current.value).toBe(initialValue)
            expect(result.current.wasRolledBack).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should toggle value and confirm on success', async () => {
      await fc.assert(
        fc.asyncProperty(fc.boolean(), async (initialValue) => {
          const { result } = renderHook(() => useOptimisticToggle(initialValue))

          await act(async () => {
            await result.current.toggle(async () => {
              return 'success'
            })
          })

          // Should have toggled
          expect(result.current.value).toBe(!initialValue)
          expect(result.current.wasRolledBack).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Optimistic Counter', () => {
    it('should increment and rollback on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          async (initialValue, incrementAmount) => {
            const { result } = renderHook(() => useOptimisticCounter(initialValue))

            await act(async () => {
              try {
                await result.current.increment(async () => {
                  throw new Error('Failed')
                }, incrementAmount)
              } catch {
                // Expected
              }
            })

            // Should have rolled back
            expect(result.current.value).toBe(initialValue)
            expect(result.current.wasRolledBack).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should increment and confirm on success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          async (initialValue, incrementAmount) => {
            const { result } = renderHook(() => useOptimisticCounter(initialValue))

            await act(async () => {
              await result.current.increment(async () => {
                return 'success'
              }, incrementAmount)
            })

            // Should have incremented
            expect(result.current.value).toBe(initialValue + incrementAmount)
            expect(result.current.wasRolledBack).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should decrement and rollback on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 1, max: 50 }),
          async (initialValue, decrementAmount) => {
            const { result } = renderHook(() => useOptimisticCounter(initialValue))

            await act(async () => {
              try {
                await result.current.decrement(async () => {
                  throw new Error('Failed')
                }, decrementAmount)
              } catch {
                // Expected
              }
            })

            // Should have rolled back
            expect(result.current.value).toBe(initialValue)
            expect(result.current.wasRolledBack).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Optimistic List', () => {
    it('should add item and rollback on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({ id: fc.string(), name: fc.string() }), {
            minLength: 0,
            maxLength: 5,
          }),
          fc.record({ id: fc.string(), name: fc.string() }),
          async (initialItems, newItem) => {
            const { result } = renderHook(() => useOptimisticList(initialItems))

            const initialLength = initialItems.length

            await act(async () => {
              try {
                await result.current.addItem(newItem, async () => {
                  throw new Error('Failed')
                })
              } catch {
                // Expected
              }
            })

            // Should have rolled back
            expect(result.current.items.length).toBe(initialLength)
            expect(result.current.wasRolledBack).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should add item and confirm on success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({ id: fc.string(), name: fc.string() }), {
            minLength: 0,
            maxLength: 5,
          }),
          fc.record({ id: fc.string(), name: fc.string() }),
          async (initialItems, newItem) => {
            const { result } = renderHook(() => useOptimisticList(initialItems))

            const initialLength = initialItems.length

            await act(async () => {
              await result.current.addItem(newItem, async () => {
                return 'success'
              })
            })

            // Should have added item
            expect(result.current.items.length).toBe(initialLength + 1)
            expect(result.current.wasRolledBack).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove item and rollback on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({ id: fc.string(), name: fc.string() }), {
            minLength: 1,
            maxLength: 5,
          }),
          async (initialItems) => {
            const { result } = renderHook(() => useOptimisticList(initialItems))

            const initialLength = initialItems.length
            const itemToRemove = initialItems[0]

            await act(async () => {
              try {
                await result.current.removeItem(itemToRemove.id, async () => {
                  throw new Error('Failed')
                })
              } catch {
                // Expected
              }
            })

            // Should have rolled back
            expect(result.current.items.length).toBe(initialLength)
            expect(result.current.wasRolledBack).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('State Invariants', () => {
    it('should never have isPending true after confirm or rollback', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.boolean(),
          (initialValue, newValue, shouldConfirm) => {
            fc.pre(initialValue !== newValue)

            const { result } = renderHook(() => useOptimisticState(initialValue))

            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            expect(result.current.isPending).toBe(true)

            act(() => {
              if (shouldConfirm) {
                result.current.confirm()
              } else {
                result.current.rollback('error')
              }
            })

            // isPending should always be false after confirm or rollback
            expect(result.current.isPending).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have wasRolledBack true only after rollback', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (initialValue, newValue) => {
            fc.pre(initialValue !== newValue)

            const { result } = renderHook(() => useOptimisticState(initialValue))

            // Initially false
            expect(result.current.wasRolledBack).toBe(false)

            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            // Still false during pending
            expect(result.current.wasRolledBack).toBe(false)

            act(() => {
              result.current.confirm()
            })

            // Still false after confirm
            expect(result.current.wasRolledBack).toBe(false)

            // Now test rollback
            act(() => {
              result.current.optimisticUpdate('another value')
            })

            act(() => {
              result.current.rollback('error')
            })

            // Now should be true
            expect(result.current.wasRolledBack).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have error only after rollback', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (initialValue, newValue, errorMessage) => {
            fc.pre(initialValue !== newValue)

            const { result } = renderHook(() => useOptimisticState(initialValue))

            // Initially null
            expect(result.current.error).toBeNull()

            act(() => {
              result.current.optimisticUpdate(newValue)
            })

            // Still null during pending
            expect(result.current.error).toBeNull()

            act(() => {
              result.current.rollback(errorMessage)
            })

            // Now should have error
            expect(result.current.error).not.toBeNull()
            expect(result.current.error?.message).toBe(errorMessage)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
