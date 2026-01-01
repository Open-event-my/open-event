/**
 * Backend Error Logging Utility
 *
 * Provides structured error logging for Convex backend functions.
 * Errors are logged with context and can be integrated with external
 * monitoring services via webhooks.
 *
 * Integrates with Sentry for production error tracking.
 */

import type { MutationCtx, QueryCtx, ActionCtx } from '../_generated/server'
import {
  initSentry,
  captureError as sentryCaptureError,
  captureMessage as sentryCaptureMessage,
} from './sentry'

// Initialize Sentry on module load
initSentry()

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  /** User ID if available */
  userId?: string
  /** Function or operation name */
  operation?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

interface ErrorLogEntry {
  level: LogLevel
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context: LogContext
  timestamp: number
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  error?: Error,
  context: LogContext = {}
): ErrorLogEntry {
  return {
    level,
    message,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
    context,
    timestamp: Date.now(),
  }
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: ErrorLogEntry): string {
  const timestamp = new Date(entry.timestamp).toISOString()
  const contextStr =
    Object.keys(entry.context).length > 0 ? ` | ${JSON.stringify(entry.context)}` : ''

  if (entry.error) {
    return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}\n  Error: ${entry.error.name}: ${entry.error.message}`
  }

  return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
}

/**
 * Logger class for backend functions
 */
export class Logger {
  private context: LogContext

  constructor(context: LogContext = {}) {
    this.context = context
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
      metadata: {
        ...this.context.metadata,
        ...additionalContext.metadata,
      },
    })
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, metadata?: Record<string, unknown>) {
    const entry = createLogEntry('debug', message, undefined, {
      ...this.context,
      metadata: { ...this.context.metadata, ...metadata },
    })
    console.debug(formatLogEntry(entry))
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, unknown>) {
    const entry = createLogEntry('info', message, undefined, {
      ...this.context,
      metadata: { ...this.context.metadata, ...metadata },
    })
    console.info(formatLogEntry(entry))
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, unknown>) {
    const entry = createLogEntry('warn', message, undefined, {
      ...this.context,
      metadata: { ...this.context.metadata, ...metadata },
    })
    console.warn(formatLogEntry(entry))

    // Send warnings to Sentry as well
    sentryCaptureMessage(message, 'warning')
  }

  /**
   * Log error with optional Error object
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    const entry = createLogEntry('error', message, error, {
      ...this.context,
      metadata: { ...this.context.metadata, ...metadata },
    })
    console.error(formatLogEntry(entry))

    // Send to Sentry for production error tracking
    if (error) {
      sentryCaptureError(error, {
        ...this.context,
        ...metadata,
        message,
      })
    } else {
      sentryCaptureMessage(message, 'error')
    }

    // In production, you could send this to an external service
    // e.g., via a webhook or Convex action
    if (error?.stack) {
      console.error('Stack trace:', error.stack)
    }
  }
}

/**
 * Create a logger for a specific operation
 */
export function createLogger(operation: string, userId?: string): Logger {
  return new Logger({ operation, userId })
}

/**
 * Wrap an async function with error logging
 */
export async function withErrorLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  userId?: string
): Promise<T> {
  const logger = createLogger(operation, userId)

  try {
    const result = await fn()
    return result
  } catch (error) {
    logger.error(`Operation failed: ${operation}`, error as Error)
    throw error
  }
}

/**
 * Safe error wrapper that returns a result object instead of throwing
 */
export async function safeExecute<T>(
  operation: string,
  fn: () => Promise<T>,
  userId?: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const logger = createLogger(operation, userId)

  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Operation failed: ${operation}`, error as Error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Extract user ID from context for logging
 */
export function getUserIdFromCtx(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: QueryCtx | MutationCtx | ActionCtx
): string | undefined {
  // This could be enhanced to extract user ID from session
  // For now, it's a placeholder for future integration
  return undefined
}

/**
 * Log API request (useful for HTTP handlers)
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  const logger = createLogger(`API:${path}`)
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

  const message = `${method} ${path} - ${statusCode} (${durationMs}ms)`

  switch (level) {
    case 'error':
      logger.error(message, undefined, metadata)
      break
    case 'warn':
      logger.warn(message, metadata)
      break
    default:
      logger.info(message, metadata)
  }
}
