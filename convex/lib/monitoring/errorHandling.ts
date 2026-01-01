/**
 * Error Handling Integration with Alerting
 *
 * Integrates the alert manager with error handling to automatically
 * send alerts for critical errors.
 */

import { logger } from './logger'
import { sendCriticalErrorAlert, sendWarningAlert } from './alerts'
import type { MutationCtx, QueryCtx, ActionCtx } from '../../_generated/server'

/**
 * Union type for all Convex context types
 */
type ConvexCtx = MutationCtx | QueryCtx | ActionCtx

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'database'
  | 'external_api'
  | 'payment'
  | 'ai_service'
  | 'system'
  | 'unknown'

/**
 * Error context for enhanced logging and alerting
 */
export interface ErrorContext {
  userId?: string
  organizationId?: string
  functionName?: string
  endpoint?: string
  requestId?: string
  [key: string]: unknown
}

/**
 * Determine if an error is critical based on its characteristics
 */
export function isCriticalError(error: unknown, category?: ErrorCategory): boolean {
  // Database errors are always critical
  if (category === 'database') {
    return true
  }

  // Payment errors are always critical
  if (category === 'payment') {
    return true
  }

  // System errors are always critical
  if (category === 'system') {
    return true
  }

  // Check error message for critical keywords
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const criticalKeywords = [
      'database',
      'connection',
      'timeout',
      'payment',
      'transaction',
      'critical',
      'fatal',
      'crash',
      'corruption',
    ]

    return criticalKeywords.some((keyword) => message.includes(keyword))
  }

  return false
}

/**
 * Determine error severity
 */
export function getErrorSeverity(error: unknown, category?: ErrorCategory): ErrorSeverity {
  if (isCriticalError(error, category)) {
    return 'critical'
  }

  // Payment and database errors that aren't critical are still high severity
  if (category === 'payment' || category === 'database') {
    return 'high'
  }

  // External API and AI service errors are medium severity
  if (category === 'external_api' || category === 'ai_service') {
    return 'medium'
  }

  // Validation and authorization errors are low severity
  if (category === 'validation' || category === 'authorization') {
    return 'low'
  }

  return 'medium'
}

/**
 * Handle an error with logging and alerting
 *
 * This function:
 * 1. Logs the error with structured logging
 * 2. Sends alerts for critical errors
 * 3. Returns a user-friendly error message
 */
export async function handleErrorWithAlerting(
  error: unknown,
  context: ErrorContext,
  category?: ErrorCategory
): Promise<string> {
  const severity = getErrorSeverity(error, category)
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Log the error
  logger.error('Error occurred', error, {
    ...context,
    category,
    severity,
  })

  // Send alert for critical errors
  if (severity === 'critical') {
    try {
      await sendCriticalErrorAlert(`Critical Error: ${category || 'Unknown'}`, error, {
        ...context,
        category,
        errorMessage,
      })
    } catch (alertError) {
      // Don't let alert failures prevent error handling
      logger.error('Failed to send critical error alert', alertError, {
        originalError: errorMessage,
      })
    }
  }

  // Send warning for high severity errors
  if (severity === 'high') {
    try {
      await sendWarningAlert(`High Severity Error: ${category || 'Unknown'}`, errorMessage, {
        ...context,
        category,
      })
    } catch (alertError) {
      logger.error('Failed to send warning alert', alertError, {
        originalError: errorMessage,
      })
    }
  }

  // Return user-friendly error message
  return getUserFriendlyErrorMessage(error, category)
}

/**
 * Get a user-friendly error message
 */
function getUserFriendlyErrorMessage(_error: unknown, category?: ErrorCategory): string {
  // Don't expose internal error details to users
  switch (category) {
    case 'authentication':
      return 'Authentication failed. Please try logging in again.'
    case 'authorization':
      return 'You do not have permission to perform this action.'
    case 'validation':
      return 'Please check your input and try again.'
    case 'database':
      return 'A database error occurred. Please try again later.'
    case 'external_api':
      return 'An external service is temporarily unavailable. Please try again later.'
    case 'payment':
      return 'Payment processing failed. Please try again or contact support.'
    case 'ai_service':
      return 'AI service is temporarily unavailable. Please try again later.'
    case 'system':
      return 'A system error occurred. Our team has been notified.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Wrapper for async operations with error handling and alerting
 *
 * @example
 * ```ts
 * const result = await withErrorHandlingAndAlerting(
 *   async () => {
 *     return await database.createEvent(data);
 *   },
 *   { userId: 'user123', functionName: 'createEvent' },
 *   'database'
 * );
 * ```
 */
export async function withErrorHandlingAndAlerting<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  category?: ErrorCategory
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const userMessage = await handleErrorWithAlerting(error, context, category)

    // Re-throw with user-friendly message
    throw new Error(userMessage)
  }
}

/**
 * Create an error handler middleware for Convex functions
 *
 * @example
 * ```ts
 * export const myMutation = mutation({
 *   handler: withErrorHandler(async (ctx, args) => {
 *     // Your mutation logic
 *   }, 'database')
 * });
 * ```
 */
export function withErrorHandler<TCtx extends ConvexCtx, TArgs, TResult>(
  handler: (ctx: TCtx, args: TArgs) => Promise<TResult>,
  category?: ErrorCategory
) {
  return async (ctx: TCtx, args: TArgs): Promise<TResult> => {
    const context: ErrorContext = {
      userId: (ctx as { auth?: { userId?: string } }).auth?.userId,
      functionName: (ctx as { functionName?: string }).functionName,
      requestId: (ctx as { requestId?: string }).requestId,
    }

    return withErrorHandlingAndAlerting(() => handler(ctx, args), context, category)
  }
}

/**
 * Alert routing rules based on error category and severity
 */
export interface AlertRoutingRule {
  category: ErrorCategory
  minSeverity: ErrorSeverity
  channels: ('email' | 'slack' | 'pagerduty')[]
}

/**
 * Default alert routing rules
 */
export const DEFAULT_ALERT_ROUTING: AlertRoutingRule[] = [
  {
    category: 'payment',
    minSeverity: 'high',
    channels: ['email', 'slack', 'pagerduty'],
  },
  {
    category: 'database',
    minSeverity: 'high',
    channels: ['email', 'slack', 'pagerduty'],
  },
  {
    category: 'system',
    minSeverity: 'critical',
    channels: ['email', 'slack', 'pagerduty'],
  },
  {
    category: 'external_api',
    minSeverity: 'critical',
    channels: ['email', 'slack'],
  },
  {
    category: 'ai_service',
    minSeverity: 'critical',
    channels: ['email', 'slack'],
  },
]

/**
 * Get alert channels for a given error category and severity
 */
export function getAlertChannels(
  category: ErrorCategory,
  severity: ErrorSeverity
): ('email' | 'slack' | 'pagerduty')[] {
  const severityOrder: ErrorSeverity[] = ['low', 'medium', 'high', 'critical']
  const severityLevel = severityOrder.indexOf(severity)

  for (const rule of DEFAULT_ALERT_ROUTING) {
    if (rule.category === category) {
      const minSeverityLevel = severityOrder.indexOf(rule.minSeverity)
      if (severityLevel >= minSeverityLevel) {
        return rule.channels
      }
    }
  }

  // Default channels for critical errors
  if (severity === 'critical') {
    return ['email', 'slack', 'pagerduty']
  }

  // Default channels for high severity
  if (severity === 'high') {
    return ['email', 'slack']
  }

  // Default channel for medium/low severity
  return ['email']
}
