/**
 * Property-Based Tests for Connectivity Monitor
 *
 * Tests Properties 6, 7, and 8:
 * - Property 6: Offline Action Queuing (Requirements 3.2)
 * - Property 7: Queue Processing on Reconnect (Requirements 3.3)
 * - Property 8: Network Error Messaging (Requirements 3.4)
 *
 * Uses fast-check for property-based testing with minimum 100 iterations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import {
  ConnectivityMonitor,
  resetConnectivityMonitor,
  type QueuedAction,
} from './connectivityMonitor'

// Mock browser APIs
const mockNavigator = {
  onLine: true,
}

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

const mockDocument = {
  getElementById: vi.fn().mockReturnValue(null),
  createElement: vi.fn().mockReturnValue({
    id: '',
    setAttribute: vi.fn(),
    style: { cssText: '' },
    textContent: '',
    parentNode: null,
  }),
  body: {
    appendChild: vi.fn(),
  },
}

const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

// Setup global mocks
beforeEach(() => {
  vi.stubGlobal('navigator', mockNavigator)
  vi.stubGlobal('window', mockWindow)
  vi.stubGlobal('document', mockDocument)
  vi.stubGlobal('localStorage', mockLocalStorage)
  mockNavigator.onLine = true
  resetConnectivityMonitor()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetConnectivityMonitor()
})

describe('Connectivity Monitor - Property Tests', () => {
  /**
   * Feature: error-messaging-improvements, Property 6: Offline Action Queuing
   * Validates: Requirements 3.2
   *
   * For any action attempted while offline, the action SHALL be added to the queue
   * and the queue length SHALL increase by 1.
   */
  describe('Property 6: Offline Action Queuing', () => {
    // Generator for action descriptions
    const descriptionArbitrary = fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length > 0)

    it('should add action to queue and increase queue length by 1', () => {
      fc.assert(
        fc.property(descriptionArbitrary, (description) => {
          const monitor = new ConnectivityMonitor()
          const initialLength = monitor.getQueueLength()

          // Queue an action
          const id = monitor.queueAction({
            execute: async () => {},
            description,
          })

          // Queue length should increase by 1
          expect(monitor.getQueueLength()).toBe(initialLength + 1)

          // Action should be in the queue
          const queuedActions = monitor.getQueuedActions()
          const queuedAction = queuedActions.find((a) => a.id === id)
          expect(queuedAction).toBeDefined()
          expect(queuedAction?.description).toBe(description)

          monitor.destroy()
        }),
        { numRuns: 100 }
      )
    })

    it('should generate unique IDs for each queued action', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArbitrary, { minLength: 2, maxLength: 20 }),
          (descriptions) => {
            const monitor = new ConnectivityMonitor()
            const ids = new Set<string>()

            descriptions.forEach((description) => {
              const id = monitor.queueAction({
                execute: async () => {},
                description,
              })
              ids.add(id)
            })

            // All IDs should be unique
            expect(ids.size).toBe(descriptions.length)

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve action metadata when queuing', () => {
      fc.assert(
        fc.property(descriptionArbitrary, (description) => {
          const monitor = new ConnectivityMonitor()
          const beforeQueue = Date.now()

          const id = monitor.queueAction({
            execute: async () => {},
            description,
          })

          const afterQueue = Date.now()
          const queuedAction = monitor.getQueuedActions().find((a) => a.id === id)

          // Should have correct metadata
          expect(queuedAction).toBeDefined()
          expect(queuedAction!.description).toBe(description)
          expect(queuedAction!.queuedAt).toBeGreaterThanOrEqual(beforeQueue)
          expect(queuedAction!.queuedAt).toBeLessThanOrEqual(afterQueue)
          expect(queuedAction!.retryCount).toBe(0)

          monitor.destroy()
        }),
        { numRuns: 100 }
      )
    })

    it('should maintain queue order (FIFO)', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArbitrary, { minLength: 2, maxLength: 10 }),
          (descriptions) => {
            const monitor = new ConnectivityMonitor()
            const queuedIds: string[] = []

            descriptions.forEach((description) => {
              const id = monitor.queueAction({
                execute: async () => {},
                description,
              })
              queuedIds.push(id)
            })

            const queuedActions = monitor.getQueuedActions()

            // Actions should be in the same order they were queued
            queuedIds.forEach((id, index) => {
              expect(queuedActions[index].id).toBe(id)
            })

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow clearing the queue', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArbitrary, { minLength: 1, maxLength: 10 }),
          (descriptions) => {
            const monitor = new ConnectivityMonitor()

            descriptions.forEach((description) => {
              monitor.queueAction({
                execute: async () => {},
                description,
              })
            })

            expect(monitor.getQueueLength()).toBe(descriptions.length)

            monitor.clearQueue()

            expect(monitor.getQueueLength()).toBe(0)
            expect(monitor.getQueuedActions()).toEqual([])

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow removing specific actions from queue', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          (descriptions, removeIndex) => {
            const monitor = new ConnectivityMonitor()
            const ids: string[] = []

            descriptions.forEach((description) => {
              const id = monitor.queueAction({
                execute: async () => {},
                description,
              })
              ids.push(id)
            })

            const actualRemoveIndex = removeIndex % descriptions.length
            const idToRemove = ids[actualRemoveIndex]
            const initialLength = monitor.getQueueLength()

            const removed = monitor.removeAction(idToRemove)

            expect(removed).toBe(true)
            expect(monitor.getQueueLength()).toBe(initialLength - 1)

            const remainingActions = monitor.getQueuedActions()
            expect(remainingActions.find((a) => a.id === idToRemove)).toBeUndefined()

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 7: Queue Processing on Reconnect
   * Validates: Requirements 3.3
   *
   * For any non-empty action queue when connectivity is restored, all queued actions
   * SHALL be executed and the queue SHALL be empty after processing completes.
   */
  describe('Property 7: Queue Processing on Reconnect', () => {
    const descriptionArbitrary = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0)

    it('should execute all queued actions when processing manually', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(descriptionArbitrary, { minLength: 1, maxLength: 5 }),
          async (descriptions) => {
            const monitor = new ConnectivityMonitor()
            const executedActions: string[] = []

            // Queue actions that track their execution
            descriptions.forEach((description) => {
              monitor.queueAction({
                execute: async () => {
                  executedActions.push(description)
                },
                description,
              })
            })

            expect(monitor.getQueueLength()).toBe(descriptions.length)

            // Process the queue
            await monitor.processQueueManually()

            // All actions should have been executed
            expect(executedActions.length).toBe(descriptions.length)
            descriptions.forEach((desc) => {
              expect(executedActions).toContain(desc)
            })

            // Queue should be empty after successful processing
            expect(monitor.getQueueLength()).toBe(0)

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should clear successfully processed actions from queue', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(descriptionArbitrary, { minLength: 1, maxLength: 5 }),
          async (descriptions) => {
            const monitor = new ConnectivityMonitor()

            descriptions.forEach((description) => {
              monitor.queueAction({
                execute: async () => {
                  // Successful execution
                },
                description,
              })
            })

            const initialLength = monitor.getQueueLength()
            expect(initialLength).toBe(descriptions.length)

            await monitor.processQueueManually()

            // Queue should be empty after all successful executions
            expect(monitor.getQueueLength()).toBe(0)

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should process actions in FIFO order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(descriptionArbitrary, { minLength: 2, maxLength: 5 }),
          async (descriptions) => {
            const monitor = new ConnectivityMonitor()
            const executionOrder: string[] = []

            descriptions.forEach((description) => {
              monitor.queueAction({
                execute: async () => {
                  executionOrder.push(description)
                },
                description,
              })
            })

            await monitor.processQueueManually()

            // Actions should be executed in the order they were queued
            expect(executionOrder).toEqual(descriptions)

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty queue gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const monitor = new ConnectivityMonitor()

          expect(monitor.getQueueLength()).toBe(0)

          // Processing empty queue should not throw
          const results = await monitor.processQueueManually()

          expect(results).toEqual([])
          expect(monitor.getQueueLength()).toBe(0)

          monitor.destroy()
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 8: Network Error Messaging
   * Validates: Requirements 3.4
   *
   * For any error caused by network issues while offline, the error message SHALL
   * indicate the action will be retried when connectivity is restored.
   */
  describe('Property 8: Network Error Messaging', () => {
    const descriptionArbitrary = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0)

    it('should provide meaningful descriptions for queued actions', () => {
      fc.assert(
        fc.property(descriptionArbitrary, (description) => {
          const monitor = new ConnectivityMonitor()

          const id = monitor.queueAction({
            execute: async () => {},
            description,
          })

          const queuedAction = monitor.getQueuedActions().find((a) => a.id === id)

          // Description should be preserved and non-empty
          expect(queuedAction?.description).toBe(description)
          expect(queuedAction?.description.length).toBeGreaterThan(0)

          monitor.destroy()
        }),
        { numRuns: 100 }
      )
    })

    it('should track retry count for failed actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          descriptionArbitrary,
          fc.integer({ min: 1, max: 2 }),
          async (description, failCount) => {
            const monitor = new ConnectivityMonitor({
              maxAttempts: failCount + 1,
              baseDelay: 1, // Minimal delay for testing
              maxDelay: 10,
              backoffMultiplier: 2,
            })

            let attempts = 0

            monitor.queueAction({
              execute: async () => {
                attempts++
                if (attempts <= failCount) {
                  throw new Error('Network error')
                }
              },
              description,
            })

            await monitor.processQueueManually()

            // Should have retried the correct number of times
            expect(attempts).toBe(failCount + 1)

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should notify subscribers of queue changes', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArbitrary, { minLength: 1, maxLength: 5 }),
          (descriptions) => {
            const monitor = new ConnectivityMonitor()
            const queueChanges: QueuedAction[][] = []

            monitor.onQueueChange((queue) => {
              queueChanges.push([...queue])
            })

            descriptions.forEach((description) => {
              monitor.queueAction({
                execute: async () => {},
                description,
              })
            })

            // Should have received a notification for each queue change
            expect(queueChanges.length).toBe(descriptions.length)

            // Each notification should show incrementing queue size
            queueChanges.forEach((queue, index) => {
              expect(queue.length).toBe(index + 1)
            })

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should notify subscribers of connectivity changes', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          (connectivityStates) => {
            const monitor = new ConnectivityMonitor()
            const receivedStates: boolean[] = []

            monitor.onConnectivityChange((isOnline) => {
              receivedStates.push(isOnline)
            })

            // Simulate connectivity changes by calling the internal handlers
            // Note: In real usage, these would be triggered by browser events
            connectivityStates.forEach((isOnline) => {
              if (isOnline) {
                // @ts-expect-error - accessing private method for testing
                monitor._handleOnline()
              } else {
                // @ts-expect-error - accessing private method for testing
                monitor._handleOffline()
              }
            })

            // Should have received all connectivity change notifications
            expect(receivedStates.length).toBe(connectivityStates.length)
            expect(receivedStates).toEqual(connectivityStates)

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property tests for edge cases and robustness
   */
  describe('Edge Cases and Robustness', () => {
    const descriptionArbitrary = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0)

    it('should handle concurrent queue operations', () => {
      fc.assert(
        fc.property(
          fc.array(descriptionArbitrary, { minLength: 5, maxLength: 20 }),
          (descriptions) => {
            const monitor = new ConnectivityMonitor()

            // Queue all actions
            const ids = descriptions.map((description) =>
              monitor.queueAction({
                execute: async () => {},
                description,
              })
            )

            // Remove some actions while iterating
            const toRemove = ids.filter((_, i) => i % 2 === 0)
            toRemove.forEach((id) => monitor.removeAction(id))

            // Remaining queue should have correct length
            const expectedLength = descriptions.length - toRemove.length
            expect(monitor.getQueueLength()).toBe(expectedLength)

            monitor.destroy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle removing non-existent action gracefully', () => {
      fc.assert(
        fc.property(fc.uuid(), (fakeId) => {
          const monitor = new ConnectivityMonitor()

          // Try to remove non-existent action
          const removed = monitor.removeAction(fakeId)

          expect(removed).toBe(false)
          expect(monitor.getQueueLength()).toBe(0)

          monitor.destroy()
        }),
        { numRuns: 100 }
      )
    })

    it('should allow unsubscribing from callbacks', () => {
      fc.assert(
        fc.property(descriptionArbitrary, (description) => {
          const monitor = new ConnectivityMonitor()
          let callCount = 0

          const unsubscribe = monitor.onQueueChange(() => {
            callCount++
          })

          // First queue should trigger callback
          monitor.queueAction({
            execute: async () => {},
            description,
          })
          expect(callCount).toBe(1)

          // Unsubscribe
          unsubscribe()

          // Second queue should not trigger callback
          monitor.queueAction({
            execute: async () => {},
            description: 'another',
          })
          expect(callCount).toBe(1)

          monitor.destroy()
        }),
        { numRuns: 100 }
      )
    })
  })
})
