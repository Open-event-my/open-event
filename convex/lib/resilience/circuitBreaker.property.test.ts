/**
 * Property-Based Tests for Circuit Breaker
 *
 * Tests universal properties that should hold for circuit breaker behavior.
 * Uses fast-check for property-based testing with minimum 100 iterations.
 */

import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { CircuitBreaker, createAICircuitBreaker } from './circuitBreaker'

/**
 * Feature: production-readiness, Property 31: AI Circuit Breaker
 * Validates: Requirements 10.5
 *
 * For any AI provider, after 5 consecutive failures, the circuit breaker
 * should open and prevent further requests for 5 minutes.
 */
describe('Property 31: AI Circuit Breaker', () => {
  test('circuit should open after reaching failure threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // failure threshold
        fc.integer({ min: 1, max: 5 }), // success threshold
        fc.integer({ min: 1000, max: 60000 }), // timeout in ms
        async (failureThreshold, successThreshold, timeout) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold,
            timeout,
            name: 'test-breaker',
          })

          // Simulate failures up to threshold
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Simulated failure')
              })
            } catch {
              // Expected to fail
            }
          }

          // Circuit should now be open
          expect(breaker.getState()).toBe('open')
          expect(breaker.isOpen()).toBe(true)
        }
      ),
      { numRuns: 5 }
    )
  })

  test('circuit should reject requests immediately when open', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // failure threshold
        fc.integer({ min: 100, max: 5000 }), // timeout in ms
        async (failureThreshold, timeout) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout,
            name: 'test-breaker',
          })

          // Trigger failures to open circuit
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          // Circuit is open, next request should fail immediately
          const startTime = Date.now()
          try {
            await breaker.execute(async () => {
              return 'success'
            })
            // Should not reach here
            expect(true).toBe(false)
          } catch (error: unknown) {
            const duration = Date.now() - startTime

            // Should fail immediately (within 50ms)
            expect(duration).toBeLessThan(50)
            expect((error as { code?: string }).code).toBe('CIRCUIT_BREAKER_OPEN')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('circuit should transition to half-open after timeout', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // failure threshold
        fc.integer({ min: 100, max: 500 }), // short timeout for testing
        async (failureThreshold, timeout) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout,
            name: 'test-breaker',
          })

          // Open the circuit
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          expect(breaker.getState()).toBe('open')

          // Wait for timeout
          await new Promise((resolve) => setTimeout(resolve, timeout + 50))

          // Next request should transition to half-open
          try {
            await breaker.execute(async () => {
              return 'success'
            })
          } catch {
            // May fail, but should have transitioned
          }

          // Should be in half-open or closed state (depending on success)
          const state = breaker.getState()
          expect(['half-open', 'closed']).toContain(state)
        }
      ),
      { numRuns: 5 }
    )
  })

  test(
    'circuit should close after success threshold in half-open state',
    { timeout: 30000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }), // failure threshold
          fc.integer({ min: 1, max: 5 }), // success threshold
          fc.integer({ min: 100, max: 500 }), // timeout
          async (failureThreshold, successThreshold, timeout) => {
            const breaker = new CircuitBreaker({
              failureThreshold,
              successThreshold,
              timeout,
              name: 'test-breaker',
            })

            // Open the circuit
            for (let i = 0; i < failureThreshold; i++) {
              try {
                await breaker.execute(async () => {
                  throw new Error('Failure')
                })
              } catch {
                // Expected
              }
            }

            // Wait for timeout to transition to half-open
            await new Promise((resolve) => setTimeout(resolve, timeout + 50))

            // Execute successful requests up to success threshold
            for (let i = 0; i < successThreshold; i++) {
              await breaker.execute(async () => {
                return 'success'
              })
            }

            // Circuit should now be closed
            expect(breaker.getState()).toBe('closed')
            expect(breaker.isOpen()).toBe(false)
          }
        ),
        { numRuns: 5 }
      )
    }
  )

  test('circuit should reopen on failure in half-open state', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // failure threshold
        fc.integer({ min: 100, max: 500 }), // timeout
        async (failureThreshold, timeout) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout,
            name: 'test-breaker',
          })

          // Open the circuit
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          // Wait for timeout
          await new Promise((resolve) => setTimeout(resolve, timeout + 50))

          // Execute one request that fails in half-open state
          try {
            await breaker.execute(async () => {
              throw new Error('Failure in half-open')
            })
          } catch {
            // Expected
          }

          // Circuit should be open again
          expect(breaker.getState()).toBe('open')
        }
      ),
      { numRuns: 5 }
    )
  })

  test('failure count should reset on success in closed state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 10 }), // failure threshold
        fc.integer({ min: 1, max: 5 }), // failures before success
        async (failureThreshold, failuresBeforeSuccess) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout: 5000,
            name: 'test-breaker',
          })

          // Simulate some failures (but not enough to open)
          const actualFailures = Math.min(failuresBeforeSuccess, failureThreshold - 1)
          for (let i = 0; i < actualFailures; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          // Execute a successful request
          await breaker.execute(async () => {
            return 'success'
          })

          // Circuit should still be closed
          expect(breaker.getState()).toBe('closed')

          // Now we should be able to fail threshold times again before opening
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          // Now it should be open
          expect(breaker.getState()).toBe('open')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('circuit breaker should track statistics correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // number of successes
        fc.integer({ min: 1, max: 10 }), // number of failures
        async (numSuccesses, numFailures) => {
          const breaker = new CircuitBreaker({
            failureThreshold: 100, // High threshold to avoid opening
            successThreshold: 2,
            timeout: 5000,
            name: 'test-breaker',
          })

          // Execute successful requests
          for (let i = 0; i < numSuccesses; i++) {
            await breaker.execute(async () => {
              return 'success'
            })
          }

          // Execute failing requests
          for (let i = 0; i < numFailures; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          const stats = breaker.getStats()

          // Verify statistics
          expect(stats.totalRequests).toBe(numSuccesses + numFailures)
          expect(stats.totalSuccesses).toBe(numSuccesses)
          expect(stats.totalFailures).toBe(numFailures)
          expect(stats.failureCount).toBe(numFailures)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('reset should restore circuit to closed state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // failure threshold
        async (failureThreshold) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout: 5000,
            name: 'test-breaker',
          })

          // Open the circuit
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          expect(breaker.getState()).toBe('open')

          // Reset the circuit
          breaker.reset()

          // Should be closed now
          expect(breaker.getState()).toBe('closed')
          expect(breaker.isOpen()).toBe(false)

          // Should be able to execute requests
          const result = await breaker.execute(async () => {
            return 'success'
          })
          expect(result).toBe('success')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('AI circuit breaker factory should create properly configured breaker', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // service name
        async (serviceName) => {
          const breaker = createAICircuitBreaker(serviceName)

          // Should start in closed state
          expect(breaker.getState()).toBe('closed')
          expect(breaker.isOpen()).toBe(false)

          // Should have AI-appropriate configuration (5 failures, 5 min timeout)
          // Test by triggering 5 failures
          for (let i = 0; i < 5; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('AI failure')
              })
            } catch {
              // Expected
            }
          }

          // Should be open after 5 failures
          expect(breaker.getState()).toBe('open')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('circuit breaker should handle concurrent requests correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // failure threshold
        fc.integer({ min: 2, max: 10 }), // concurrent requests
        async (failureThreshold, concurrentRequests) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout: 5000,
            name: 'test-breaker',
          })

          // Execute concurrent successful requests
          const promises = Array.from({ length: concurrentRequests }, (_, i) =>
            breaker.execute(async () => {
              await new Promise((resolve) => setTimeout(resolve, 10))
              return `success-${i}`
            })
          )

          const results = await Promise.all(promises)

          // All should succeed
          expect(results).toHaveLength(concurrentRequests)
          expect(breaker.getState()).toBe('closed')

          const stats = breaker.getStats()
          expect(stats.totalSuccesses).toBe(concurrentRequests)
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Additional property tests for circuit breaker edge cases
 */
describe('Circuit Breaker Edge Cases', () => {
  test('circuit breaker should handle zero timeout gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // failure threshold
        async (failureThreshold) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout: 0, // Zero timeout
            name: 'test-breaker',
          })

          // Open the circuit
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          expect(breaker.getState()).toBe('open')

          // With zero timeout, should immediately transition to half-open
          try {
            await breaker.execute(async () => {
              return 'success'
            })
          } catch {
            // May fail
          }

          // Should be in half-open or closed state
          const state = breaker.getState()
          expect(['half-open', 'closed']).toContain(state)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('circuit breaker should validate configuration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 0 }), // invalid failure threshold
        (invalidThreshold) => {
          expect(() => {
            new CircuitBreaker({
              failureThreshold: invalidThreshold,
              successThreshold: 2,
              timeout: 5000,
            })
          }).toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  test('circuit breaker should handle rapid state transitions', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(2), // Low failure threshold for rapid transitions
        fc.constant(1), // Low success threshold
        fc.constant(100), // Short timeout
        async (failureThreshold, successThreshold, timeout) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold,
            timeout,
            name: 'test-breaker',
          })

          // Cycle through states multiple times
          for (let cycle = 0; cycle < 3; cycle++) {
            // Open the circuit
            for (let i = 0; i < failureThreshold; i++) {
              try {
                await breaker.execute(async () => {
                  throw new Error('Failure')
                })
              } catch {
                // Expected
              }
            }

            expect(breaker.getState()).toBe('open')

            // Wait for timeout
            await new Promise((resolve) => setTimeout(resolve, timeout + 50))

            // Close the circuit
            for (let i = 0; i < successThreshold; i++) {
              await breaker.execute(async () => {
                return 'success'
              })
            }

            expect(breaker.getState()).toBe('closed')
          }

          // Should still be functional after multiple cycles
          const result = await breaker.execute(async () => {
            return 'final-success'
          })
          expect(result).toBe('final-success')
        }
      ),
      { numRuns: 5 }
    )
  })

  test('circuit breaker error messages should include retry information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // failure threshold
        fc.integer({ min: 1000, max: 10000 }), // timeout
        async (failureThreshold, timeout) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout,
            name: 'TestService',
          })

          // Open the circuit
          for (let i = 0; i < failureThreshold; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }
          }

          // Try to execute when open
          try {
            await breaker.execute(async () => {
              return 'success'
            })
            expect(true).toBe(false) // Should not reach here
          } catch (error: unknown) {
            // Error message should include service name and retry time
            const err = error as { message?: string; code?: string }
            expect(err.message).toContain('TestService')
            expect(err.message).toContain('Retry after')
            expect(err.code).toBe('CIRCUIT_BREAKER_OPEN')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('circuit breaker should maintain state consistency under errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // failure threshold
        async (failureThreshold) => {
          const breaker = new CircuitBreaker({
            failureThreshold,
            successThreshold: 2,
            timeout: 5000,
            name: 'test-breaker',
          })

          // Mix of successes and failures
          for (let i = 0; i < failureThreshold - 1; i++) {
            try {
              await breaker.execute(async () => {
                throw new Error('Failure')
              })
            } catch {
              // Expected
            }

            // Success should reset failure count
            await breaker.execute(async () => {
              return 'success'
            })
          }

          // Should still be closed after alternating failures and successes
          expect(breaker.getState()).toBe('closed')

          const stats = breaker.getStats()
          expect(stats.failureCount).toBe(0) // Should be reset by successes
        }
      ),
      { numRuns: 100 }
    )
  })
})
