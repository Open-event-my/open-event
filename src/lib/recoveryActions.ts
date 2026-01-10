/**
 * Recovery Actions System
 *
 * Provides actionable recovery options for error handling.
 * Implements handlers for different recovery action types: retry, navigate, focus, countdown, custom.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import type { RecoveryAction, RecoveryActionType, ErrorCategory } from './errorFormatter'

/**
 * Configuration for retry operations with exponential backoff
 * Requirements: 2.2
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number
  /** Base delay in milliseconds */
  baseDelay: number
  /** Maximum delay in milliseconds */
  maxDelay: number
  /** Backoff multiplier */
  backoffMultiplier: number
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
}

/**
 * State for tracking retry attempts
 */
export interface RetryState {
  /** Current attempt number (0-indexed) */
  attemptCount: number
  /** Last error encountered */
  lastError: Error | null
  /** Whether max attempts have been reached */
  maxAttemptsReached: boolean
  /** Next retry delay in milliseconds */
  nextRetryDelay: number
}

/**
 * Result of executing a recovery action
 */
export interface RecoveryActionResult {
  /** Whether the action was successful */
  success: boolean
  /** Error message if action failed */
  error?: string
  /** Whether to retry the action */
  shouldRetry?: boolean
  /** Delay before retry in milliseconds */
  retryDelay?: number
}

/**
 * Handler function type for recovery actions
 */
export type RecoveryActionHandler = (
  action: RecoveryAction,
  context?: RecoveryActionContext
) => Promise<RecoveryActionResult>

/**
 * Context provided to recovery action handlers
 */
export interface RecoveryActionContext {
  /** Navigation function for 'navigate' type */
  navigate?: (path: string) => void
  /** Original failed operation for 'retry' type */
  retryOperation?: () => Promise<unknown>
  /** Current retry state */
  retryState?: RetryState
  /** Retry configuration */
  retryConfig?: RetryConfig
}

/**
 * Calculate exponential backoff delay for retry operations
 * Requirements: 2.2
 *
 * Formula: delay = baseDelay * (backoffMultiplier ^ attempt), capped at maxDelay
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 *
 * @example
 * ```typescript
 * // With default config (baseDelay=1000, multiplier=2, maxDelay=30000)
 * calculateBackoffDelay(0, config) // 1000ms
 * calculateBackoffDelay(1, config) // 2000ms
 * calculateBackoffDelay(2, config) // 4000ms
 * calculateBackoffDelay(5, config) // 30000ms (capped)
 * ```
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const { baseDelay, backoffMultiplier, maxDelay } = config

  // Calculate exponential delay
  const delay = baseDelay * Math.pow(backoffMultiplier, attempt)

  // Cap at maximum delay
  return Math.min(delay, maxDelay)
}

/**
 * Create initial retry state
 */
export function createRetryState(config: RetryConfig = DEFAULT_RETRY_CONFIG): RetryState {
  return {
    attemptCount: 0,
    lastError: null,
    maxAttemptsReached: false,
    nextRetryDelay: calculateBackoffDelay(0, config),
  }
}

/**
 * Update retry state after a failed attempt
 */
export function updateRetryState(
  state: RetryState,
  error: Error,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryState {
  const newAttemptCount = state.attemptCount + 1
  const maxAttemptsReached = newAttemptCount >= config.maxAttempts

  return {
    attemptCount: newAttemptCount,
    lastError: error,
    maxAttemptsReached,
    nextRetryDelay: maxAttemptsReached ? 0 : calculateBackoffDelay(newAttemptCount, config),
  }
}

/**
 * Execute an operation with exponential backoff retry
 * Requirements: 2.2
 *
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param onRetry - Optional callback called before each retry with current state
 * @returns Result of the operation
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => api.saveData(data),
 *   { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 },
 *   (state) => console.log(`Retry attempt ${state.attemptCount}`)
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (state: RetryState) => void
): Promise<T> {
  let state = createRetryState(config)

  while (!state.maxAttemptsReached) {
    try {
      return await operation()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      state = updateRetryState(state, err, config)

      if (state.maxAttemptsReached) {
        throw err
      }

      // Notify about retry
      onRetry?.(state)

      // Wait before retrying
      await sleep(state.nextRetryDelay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw state.lastError || new Error('Max retry attempts reached')
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Handler for 'retry' type recovery actions
 * Requirements: 2.2
 */
export const handleRetryAction: RecoveryActionHandler = async (_action, context) => {
  if (!context?.retryOperation) {
    return {
      success: false,
      error: 'No retry operation provided',
    }
  }

  const config = context.retryConfig || DEFAULT_RETRY_CONFIG
  let state = context.retryState || createRetryState(config)

  try {
    await context.retryOperation()
    return { success: true }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    state = updateRetryState(state, err, config)

    return {
      success: false,
      error: err.message,
      shouldRetry: !state.maxAttemptsReached,
      retryDelay: state.nextRetryDelay,
    }
  }
}

/**
 * Handler for 'navigate' type recovery actions
 * Requirements: 2.3
 */
export const handleNavigateAction: RecoveryActionHandler = async (action, context) => {
  if (!action.path) {
    return {
      success: false,
      error: 'No navigation path provided',
    }
  }

  if (!context?.navigate) {
    // Fallback to window.location if no navigate function provided
    if (typeof window !== 'undefined') {
      window.location.href = action.path
      return { success: true }
    }
    return {
      success: false,
      error: 'No navigation function available',
    }
  }

  try {
    context.navigate(action.path)
    return { success: true }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    return {
      success: false,
      error: err.message,
    }
  }
}

/**
 * Handler for 'focus' type recovery actions
 * Requirements: 2.4
 */
export const handleFocusAction: RecoveryActionHandler = async (action) => {
  if (!action.selector) {
    // Try to focus the first invalid field
    if (typeof document !== 'undefined') {
      const invalidField = document.querySelector<HTMLElement>(
        '[aria-invalid="true"], .error, .invalid, input:invalid, select:invalid, textarea:invalid'
      )
      if (invalidField) {
        invalidField.focus()
        invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return { success: true }
      }
    }
    return {
      success: false,
      error: 'No element to focus',
    }
  }

  if (typeof document === 'undefined') {
    return {
      success: false,
      error: 'Document not available',
    }
  }

  const element = document.querySelector<HTMLElement>(action.selector)
  if (!element) {
    return {
      success: false,
      error: `Element not found: ${action.selector}`,
    }
  }

  try {
    element.focus()
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return { success: true }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    return {
      success: false,
      error: err.message,
    }
  }
}

/**
 * Handler for 'countdown' type recovery actions
 * Requirements: 2.6
 *
 * Note: This handler just validates the countdown configuration.
 * The actual countdown UI is handled by the useCountdown hook.
 */
export const handleCountdownAction: RecoveryActionHandler = async (action) => {
  if (!action.countdownSeconds || action.countdownSeconds <= 0) {
    return {
      success: false,
      error: 'Invalid countdown duration',
    }
  }

  // Countdown actions are handled by the UI component
  // This handler just validates the configuration
  return {
    success: true,
  }
}

/**
 * Handler for 'custom' type recovery actions
 * Requirements: 2.5
 */
export const handleCustomAction: RecoveryActionHandler = async (action) => {
  if (!action.handler) {
    return {
      success: false,
      error: 'No custom handler provided',
    }
  }

  try {
    await action.handler()
    return { success: true }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    return {
      success: false,
      error: err.message,
    }
  }
}

/**
 * Map of action types to their handlers
 */
const actionHandlers: Record<RecoveryActionType, RecoveryActionHandler> = {
  retry: handleRetryAction,
  navigate: handleNavigateAction,
  focus: handleFocusAction,
  countdown: handleCountdownAction,
  custom: handleCustomAction,
}

/**
 * Execute a recovery action
 * Requirements: 2.1
 *
 * @param action - The recovery action to execute
 * @param context - Optional context for the action
 * @returns Result of the action execution
 *
 * @example
 * ```typescript
 * const result = await executeRecoveryAction(
 *   { type: 'retry', label: 'Try Again' },
 *   { retryOperation: () => api.saveData(data) }
 * )
 * if (result.success) {
 *   console.log('Recovery successful!')
 * }
 * ```
 */
export async function executeRecoveryAction(
  action: RecoveryAction,
  context?: RecoveryActionContext
): Promise<RecoveryActionResult> {
  const handler = actionHandlers[action.type]

  if (!handler) {
    return {
      success: false,
      error: `Unknown action type: ${action.type}`,
    }
  }

  return handler(action, context)
}

/**
 * Get the appropriate recovery actions for an error category
 * This is a re-export from errorFormatter for convenience
 * Requirements: 2.1
 */
export { type RecoveryAction, type RecoveryActionType, type ErrorCategory }

/**
 * Default recovery actions by error category
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
export const CATEGORY_RECOVERY_ACTIONS: Record<ErrorCategory, RecoveryAction[]> = {
  auth: [{ label: 'Sign In', type: 'navigate', path: '/auth/signin' }],
  network: [{ label: 'Retry', type: 'retry' }],
  validation: [{ label: 'Review', type: 'focus' }],
  permission: [
    { label: 'Request Access', type: 'custom' },
    { label: 'Contact Support', type: 'navigate', path: '/support' },
  ],
  notFound: [{ label: 'Go Back', type: 'navigate', path: '/' }],
  rateLimit: [{ label: 'Wait', type: 'countdown', countdownSeconds: 60 }],
  payment: [
    { label: 'Update Payment', type: 'navigate', path: '/settings/payment' },
    { label: 'Try Again', type: 'retry' },
  ],
  server: [{ label: 'Try Again', type: 'retry' }],
  unknown: [{ label: 'Try Again', type: 'retry' }],
}

/**
 * Check if an error category has recovery actions
 */
export function hasRecoveryActions(category: ErrorCategory): boolean {
  const actions = CATEGORY_RECOVERY_ACTIONS[category]
  return actions !== undefined && actions.length > 0
}

/**
 * Get recovery actions for an error category
 */
export function getRecoveryActionsForCategory(category: ErrorCategory): RecoveryAction[] {
  return CATEGORY_RECOVERY_ACTIONS[category] || []
}
