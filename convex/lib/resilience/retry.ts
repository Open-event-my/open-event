/**
 * Retry Service for Transient Failures
 *
 * Provides a general-purpose retry mechanism with exponential backoff
 * for handling transient failures across the application.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry attempts (default: 3)
 * - Transient vs permanent error detection
 * - Customizable error classification
 * - Detailed logging and metrics
 *
 * Requirements: 11.6
 */

import { logger } from '../monitoring/logger'
import { metricsCollector } from '../monitoring/metrics'

// ============================================================================
// Types
// ============================================================================

/**
 * Error classification for retry decisions
 */
export type ErrorType = 'transient' | 'permanent' | 'unknown'

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries: number

  /**
   * Base delay in milliseconds for exponential backoff
   * @default 1000
   */
  baseDelay: number

  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay: number

  /**
   * Whether to add jitter to delays
   * @default true
   */
  useJitter: boolean

  /**
   * Custom function to classify errors
   */
  classifyError?: (error: Error) => ErrorType

  /**
   * Operation name for logging/metrics
   */
  operationName?: string

  /**
   * Callback before each retry attempt
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: number
  totalDuration: number
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<
  Omit<RetryConfig, 'classifyError' | 'operationName' | 'onRetry'>
> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  useJitter: true,
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Patterns that indicate transient errors (should be retried)
 */
const TRANSIENT_ERROR_PATTERNS = [
  // Network errors
  'timeout',
  'network',
  'econnreset',
  'econnrefused',
  'enotfound',
  'etimedout',
  'socket hang up',
  'connection reset',
  'connection refused',
  'dns lookup failed',
  'failed to fetch',
  'network request failed',
  'offline',

  // HTTP status codes indicating transient issues
  '429', // Too Many Requests
  '500', // Internal Server Error
  '502', // Bad Gateway
  '503', // Service Unavailable
  '504', // Gateway Timeout

  // Service-specific transient errors
  'rate limit',
  'temporarily unavailable',
  'service unavailable',
  'try again',
  'overloaded',
  'capacity',
  'throttl',
  'busy',
]

/**
 * Patterns that indicate permanent errors (should NOT be retried)
 */
const PERMANENT_ERROR_PATTERNS = [
  // Client errors
  '400', // Bad Request
  '401', // Unauthorized
  '403', // Forbidden
  '404', // Not Found
  '405', // Method Not Allowed
  '409', // Conflict
  '410', // Gone
  '422', // Unprocessable Entity

  // Validation errors
  'validation',
  'invalid',
  'malformed',
  'bad request',
  'unauthorized',
  'forbidden',
  'not found',
  'permission denied',
  'access denied',

  // Business logic errors
  'already exists',
  'duplicate',
  'constraint violation',
]

/**
 * Classify an error as transient, permanent, or unknown
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase()
  const name = error.name.toLowerCase()
  const combined = `${name} ${message}`

  // Check for permanent errors first (more specific)
  for (const pattern of PERMANENT_ERROR_PATTERNS) {
    if (combined.includes(pattern)) {
      return 'permanent'
    }
  }

  // Check for transient errors
  for (const pattern of TRANSIENT_ERROR_PATTERNS) {
    if (combined.includes(pattern)) {
      return 'transient'
    }
  }

  return 'unknown'
}

/**
 * Check if an error is transient (should be retried)
 */
export function isTransientError(
  error: Error,
  customClassifier?: (error: Error) => ErrorType
): boolean {
  const classifier = customClassifier || classifyError
  const errorType = classifier(error)

  // Retry transient errors and unknown errors (conservative approach)
  return errorType === 'transient' || errorType === 'unknown'
}

/**
 * Check if an error is permanent (should NOT be retried)
 */
export function isPermanentError(
  error: Error,
  customClassifier?: (error: Error) => ErrorType
): boolean {
  const classifier = customClassifier || classifyError
  return classifier(error) === 'permanent'
}

// ============================================================================
// Delay Calculation
// ============================================================================

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  useJitter: boolean
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay)

  // Add jitter (±25%) to prevent thundering herd
  if (useJitter) {
    const jitterRange = cappedDelay * 0.25
    const jitter = (Math.random() * 2 - 1) * jitterRange
    return Math.floor(cappedDelay + jitter)
  }

  return cappedDelay
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================================================
// Retry Functions
// ============================================================================

/**
 * Execute a function with automatic retry on transient failures
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns The result of the function or throws after all retries exhausted
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetchData(url),
 *   { maxRetries: 3, operationName: 'fetchData' }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    baseDelay = DEFAULT_RETRY_CONFIG.baseDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    useJitter = DEFAULT_RETRY_CONFIG.useJitter,
    classifyError: customClassifier,
    operationName = 'operation',
    onRetry,
  } = config

  let lastError: Error | undefined
  const startTime = Date.now()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()

      // Log success after retries
      if (attempt > 0) {
        logger.info('Operation succeeded after retry', {
          operation: operationName,
          attempts: attempt + 1,
          totalDuration: Date.now() - startTime,
        })

        metricsCollector.recordCounter('retry.success', 1, {
          operation: operationName,
          attempts: String(attempt + 1),
        })
      }

      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      const shouldRetry = attempt < maxRetries && isTransientError(lastError, customClassifier)

      if (!shouldRetry) {
        // Log permanent failure or max retries reached
        logger.error('Operation failed permanently', lastError, {
          operation: operationName,
          attempts: attempt + 1,
          errorType: classifyError(lastError),
          totalDuration: Date.now() - startTime,
        })

        metricsCollector.recordCounter('retry.failure', 1, {
          operation: operationName,
          attempts: String(attempt + 1),
          errorType: classifyError(lastError),
        })

        throw lastError
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, baseDelay, maxDelay, useJitter)

      // Log retry attempt
      logger.info('Retrying operation after transient failure', {
        operation: operationName,
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: lastError.message,
      })

      metricsCollector.recordCounter('retry.attempt', 1, {
        operation: operationName,
        attempt: String(attempt + 1),
      })

      // Call onRetry callback if provided
      onRetry?.(lastError, attempt + 1, delay)

      // Wait before retrying
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Max retries exceeded')
}

/**
 * Execute a function with retry and return detailed result
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns Detailed result including success status, attempts, and duration
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  let attempts = 0

  const wrappedConfig: Partial<RetryConfig> = {
    ...config,
    onRetry: (error, attempt, delay) => {
      attempts = attempt
      config.onRetry?.(error, attempt, delay)
    },
  }

  try {
    const result = await retryWithBackoff(fn, wrappedConfig)
    return {
      success: true,
      result,
      attempts: attempts + 1,
      totalDuration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attempts: attempts + 1,
      totalDuration: Date.now() - startTime,
    }
  }
}

/**
 * Create a retry wrapper for a function
 *
 * @param fn - The async function to wrap
 * @param config - Retry configuration
 * @returns A wrapped function that automatically retries on transient failures
 *
 * @example
 * ```typescript
 * const fetchWithRetry = withRetry(
 *   (url: string) => fetch(url),
 *   { maxRetries: 3 }
 * );
 *
 * const response = await fetchWithRetry('https://api.example.com/data');
 * ```
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retryWithBackoff(() => fn(...args), config)
}

/**
 * Retry service class for more complex retry scenarios
 */
export class RetryService {
  private config: Required<Omit<RetryConfig, 'classifyError' | 'operationName' | 'onRetry'>>
  private customClassifier?: (error: Error) => ErrorType

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries,
      baseDelay: config.baseDelay ?? DEFAULT_RETRY_CONFIG.baseDelay,
      maxDelay: config.maxDelay ?? DEFAULT_RETRY_CONFIG.maxDelay,
      useJitter: config.useJitter ?? DEFAULT_RETRY_CONFIG.useJitter,
    }
    this.customClassifier = config.classifyError
  }

  /**
   * Execute with retry
   */
  async execute<T>(
    fn: () => Promise<T>,
    operationName?: string,
    onRetry?: (error: Error, attempt: number, delay: number) => void
  ): Promise<T> {
    return retryWithBackoff(fn, {
      ...this.config,
      classifyError: this.customClassifier,
      operationName,
      onRetry,
    })
  }

  /**
   * Execute with detailed result
   */
  async executeWithResult<T>(
    fn: () => Promise<T>,
    operationName?: string
  ): Promise<RetryResult<T>> {
    return retryWithResult(fn, {
      ...this.config,
      classifyError: this.customClassifier,
      operationName,
    })
  }

  /**
   * Check if an error is transient
   */
  isTransient(error: Error): boolean {
    return isTransientError(error, this.customClassifier)
  }

  /**
   * Check if an error is permanent
   */
  isPermanent(error: Error): boolean {
    return isPermanentError(error, this.customClassifier)
  }

  /**
   * Get current configuration
   */
  getConfig(): typeof this.config {
    return { ...this.config }
  }
}

/**
 * Default retry service instance
 */
export const retryService = new RetryService()

/**
 * Create a retry service with custom configuration
 */
export function createRetryService(config: Partial<RetryConfig> = {}): RetryService {
  return new RetryService(config)
}
