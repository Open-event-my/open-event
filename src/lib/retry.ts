/**
 * Frontend Retry Utilities
 * 
 * Provides retry mechanisms for frontend operations with exponential backoff.
 * Designed for use in React components and hooks.
 * 
 * Features:
 * - Exponential backoff with jitter
 * - Transient vs permanent error detection
 * - Configurable retry attempts (default: 3)
 * - AbortController support for cancellation
 * 
 * Requirements: 11.6
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Error classification for retry decisions
 */
export type ErrorType = 'transient' | 'permanent' | 'unknown';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries: number;
  
  /**
   * Base delay in milliseconds for exponential backoff
   * @default 1000
   */
  baseDelay: number;
  
  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay: number;
  
  /**
   * Whether to add jitter to delays
   * @default true
   */
  useJitter: boolean;
  
  /**
   * Custom function to classify errors
   */
  classifyError?: (error: Error) => ErrorType;
  
  /**
   * AbortSignal for cancellation
   */
  signal?: AbortSignal;
  
  /**
   * Callback before each retry attempt
   */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  cancelled: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'classifyError' | 'signal' | 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  useJitter: true,
};

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
  'failed to fetch',
  'network request failed',
  'offline',
  'connection',
  'socket',
  'dns',
  'econnreset',
  'econnrefused',
  'enotfound',
  'etimedout',
  
  // HTTP status codes indicating transient issues
  '429',
  '500',
  '502',
  '503',
  '504',
  
  // Service-specific transient errors
  'rate limit',
  'temporarily unavailable',
  'service unavailable',
  'try again',
  'overloaded',
  'throttl',
  'busy',
];

/**
 * Patterns that indicate permanent errors (should NOT be retried)
 */
const PERMANENT_ERROR_PATTERNS = [
  // Client errors
  '400',
  '401',
  '403',
  '404',
  '405',
  '409',
  '410',
  '422',
  
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
];

/**
 * Classify an error as transient, permanent, or unknown
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  const combined = `${name} ${message}`;
  
  // Check for permanent errors first
  for (const pattern of PERMANENT_ERROR_PATTERNS) {
    if (combined.includes(pattern)) {
      return 'permanent';
    }
  }
  
  // Check for transient errors
  for (const pattern of TRANSIENT_ERROR_PATTERNS) {
    if (combined.includes(pattern)) {
      return 'transient';
    }
  }
  
  return 'unknown';
}

/**
 * Check if an error is transient (should be retried)
 */
export function isTransientError(error: Error, customClassifier?: (error: Error) => ErrorType): boolean {
  const classifier = customClassifier || classifyError;
  const errorType = classifier(error);
  return errorType === 'transient' || errorType === 'unknown';
}

/**
 * Check if an error is permanent (should NOT be retried)
 */
export function isPermanentError(error: Error, customClassifier?: (error: Error) => ErrorType): boolean {
  const classifier = customClassifier || classifyError;
  return classifier(error) === 'permanent';
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
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  if (useJitter) {
    const jitterRange = cappedDelay * 0.25;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    return Math.floor(cappedDelay + jitter);
  }
  
  return cappedDelay;
}

/**
 * Sleep for specified milliseconds with optional abort support
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    
    const timeoutId = setTimeout(resolve, ms);
    
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

// ============================================================================
// Retry Functions
// ============================================================================

/**
 * Execute a function with automatic retry on transient failures
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
    signal,
    onRetry,
  } = config;
  
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if cancelled
      if (lastError.name === 'AbortError') {
        throw lastError;
      }
      
      // Check if we should retry
      const shouldRetry = attempt < maxRetries && isTransientError(lastError, customClassifier);
      
      if (!shouldRetry) {
        throw lastError;
      }
      
      // Calculate delay for next retry
      const delay = calculateDelay(attempt, baseDelay, maxDelay, useJitter);
      
      // Call onRetry callback
      onRetry?.(lastError, attempt + 1, delay);
      
      // Wait before retrying
      await sleep(delay, signal);
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Execute a function with retry and return detailed result
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;
  
  const wrappedConfig: Partial<RetryConfig> = {
    ...config,
    onRetry: (error, attempt, delay) => {
      attempts = attempt;
      config.onRetry?.(error, attempt, delay);
    },
  };
  
  try {
    const result = await retryWithBackoff(fn, wrappedConfig);
    return {
      success: true,
      result,
      attempts: attempts + 1,
      totalDuration: Date.now() - startTime,
      cancelled: false,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return {
      success: false,
      error: err,
      attempts: attempts + 1,
      totalDuration: Date.now() - startTime,
      cancelled: err.name === 'AbortError',
    };
  }
}

/**
 * Create a retry wrapper for a function
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retryWithBackoff(() => fn(...args), config);
}
