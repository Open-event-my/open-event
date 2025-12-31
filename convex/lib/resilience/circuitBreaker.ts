/**
 * Circuit Breaker Pattern Implementation
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when calling external services (especially AI APIs).
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests fail immediately
 * - HALF_OPEN: Testing if service recovered, limited requests allowed
 */

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerConfig {
  /**
   * Number of consecutive failures before opening the circuit
   * @default 5
   */
  failureThreshold: number

  /**
   * Number of consecutive successes in half-open state before closing
   * @default 2
   */
  successThreshold: number

  /**
   * Time in milliseconds to wait before transitioning from open to half-open
   * @default 300000 (5 minutes)
   */
  timeout: number

  /**
   * Optional name for logging and debugging
   */
  name?: string
}

export interface CircuitBreakerStats {
  state: CircuitState
  failureCount: number
  successCount: number
  lastFailureTime: number | null
  lastStateChange: number
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
}

/**
 * Circuit Breaker implementation for protecting against cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime: number | null = null
  private lastStateChange: number = Date.now()
  private totalRequests = 0
  private totalFailures = 0
  private totalSuccesses = 0
  private config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig) {
    this.config = config
    // Validate configuration
    if (config.failureThreshold < 1) {
      throw new Error('failureThreshold must be at least 1')
    }
    if (config.successThreshold < 1) {
      throw new Error('successThreshold must be at least 1')
    }
    if (config.timeout < 0) {
      throw new Error('timeout must be non-negative')
    }
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - The function to execute
   * @returns The result of the function
   * @throws Error if circuit is open or function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++

    // Check if we should transition from open to half-open
    if (this.state === 'open') {
      const timeSinceLastFailure = this.lastFailureTime
        ? Date.now() - this.lastFailureTime
        : Infinity

      if (timeSinceLastFailure >= this.config.timeout) {
        this.transitionTo('half-open')
      } else {
        const error = new Error(
          `Circuit breaker is open${this.config.name ? ` for ${this.config.name}` : ''}. ` +
            `Retry after ${Math.ceil((this.config.timeout - timeSinceLastFailure) / 1000)}s`
        ) as Error & { code: string }
        error.code = 'CIRCUIT_BREAKER_OPEN'
        throw error
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++
    this.failureCount = 0

    if (this.state === 'half-open') {
      this.successCount++

      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo('closed')
        this.successCount = 0
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.totalFailures++
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.successCount = 0

    if (this.state === 'half-open') {
      // Any failure in half-open state reopens the circuit
      this.transitionTo('open')
    } else if (this.state === 'closed') {
      // Check if we've hit the failure threshold
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo('open')
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState
    this.lastStateChange = Date.now()

    // Log state transition for debugging
    if (this.config.name) {
      console.log(
        `Circuit breaker "${this.config.name}" transitioned from ${oldState} to ${newState}`
      )
    }
  }

  /**
   * Get current state of the circuit breaker
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Get detailed statistics about the circuit breaker
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    }
  }

  /**
   * Manually reset the circuit breaker to closed state
   * Use with caution - typically only for testing or manual intervention
   */
  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = null
    this.lastStateChange = Date.now()

    if (this.config.name) {
      console.log(`Circuit breaker "${this.config.name}" manually reset`)
    }
  }

  /**
   * Check if the circuit breaker is currently allowing requests
   */
  isOpen(): boolean {
    if (this.state === 'open') {
      const timeSinceLastFailure = this.lastFailureTime
        ? Date.now() - this.lastFailureTime
        : Infinity

      // Check if we should transition to half-open
      if (timeSinceLastFailure >= this.config.timeout) {
        return false // Will transition to half-open on next execute
      }
      return true
    }
    return false
  }
}

/**
 * Create a circuit breaker with default configuration for AI services
 */
export function createAICircuitBreaker(name?: string): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 300000, // 5 minutes
    name: name || 'AI Service',
  })
}
