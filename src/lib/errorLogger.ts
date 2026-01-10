/**
 * Error Logger
 *
 * Enhanced error logging for development and production environments.
 * Integrates with Sentry for production error tracking and provides
 * detailed console logging for development.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import * as Sentry from '@sentry/react'
import {
  formatErrorWithContext,
  sanitizePII,
  type ErrorContext,
  type EnhancedFormattedError,
  type ErrorCategory,
} from './errorFormatter'

/**
 * Log levels for error logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Error log entry with full context
 * Requirements: 8.1, 8.3
 */
export interface ErrorLogEntry {
  /** Unique error ID for correlation */
  errorId: string
  /** Timestamp when error occurred */
  timestamp: string
  /** Log level */
  level: LogLevel
  /** Error category */
  category: ErrorCategory
  /** User-friendly message */
  message: string
  /** Technical error details (dev only) */
  technicalDetails?: {
    name: string
    message: string
    stack?: string
  }
  /** Context about what action was being performed */
  context?: ErrorContext
  /** Component stack (React) */
  componentStack?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Check if we're in development mode
 */
const isDev = import.meta.env.DEV

/**
 * Check if Sentry is configured
 */
const hasSentry = !!import.meta.env.VITE_SENTRY_DSN

/**
 * Console styling for development logs
 */
const LOG_STYLES = {
  debug: 'color: #6b7280; font-weight: normal;',
  info: 'color: #3b82f6; font-weight: normal;',
  warn: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
  fatal: 'color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 4px;',
}

/**
 * Category colors for console output
 */
const CATEGORY_COLORS: Record<ErrorCategory, string> = {
  auth: '#f59e0b',
  network: '#f97316',
  validation: '#ef4444',
  permission: '#8b5cf6',
  notFound: '#64748b',
  rateLimit: '#eab308',
  payment: '#ec4899',
  server: '#dc2626',
  unknown: '#6b7280',
}

/**
 * Format timestamp for logging
 */
function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString()
}

/**
 * Format error for console output in development
 * Requirements: 8.1, 8.3
 */
function formatForConsole(entry: ErrorLogEntry): void {
  const categoryColor = CATEGORY_COLORS[entry.category]

  // Group header
  console.groupCollapsed(
    `%c[${entry.level.toUpperCase()}]%c [${entry.category}] ${entry.message}`,
    LOG_STYLES[entry.level],
    `color: ${categoryColor}; font-weight: bold;`
  )

  // Timestamp and ID
  console.log('%cTimestamp:', 'font-weight: bold;', entry.timestamp)
  console.log('%cError ID:', 'font-weight: bold;', entry.errorId)

  // Context
  if (entry.context) {
    console.log('%cContext:', 'font-weight: bold;')
    console.log('  Action:', entry.context.action)
    if (entry.context.component) {
      console.log('  Component:', entry.context.component)
    }
    if (entry.context.metadata) {
      console.log('  Metadata:', entry.context.metadata)
    }
  }

  // Technical details (dev only)
  if (entry.technicalDetails) {
    console.log('%cTechnical Details:', 'font-weight: bold; color: #ef4444;')
    console.log('  Name:', entry.technicalDetails.name)
    console.log('  Message:', entry.technicalDetails.message)
    if (entry.technicalDetails.stack) {
      console.log('%cStack Trace:', 'font-weight: bold; color: #ef4444;')
      console.log(entry.technicalDetails.stack)
    }
  }

  // Component stack
  if (entry.componentStack) {
    console.log('%cComponent Stack:', 'font-weight: bold; color: #8b5cf6;')
    console.log(entry.componentStack)
  }

  // Additional metadata
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    console.log('%cMetadata:', 'font-weight: bold;')
    console.table(entry.metadata)
  }

  console.groupEnd()
}

/**
 * Send error to Sentry with sanitized data
 * Requirements: 8.2, 8.4
 */
function sendToSentry(
  error: Error,
  entry: ErrorLogEntry,
  formattedError: EnhancedFormattedError
): void {
  if (!hasSentry) return

  // Sanitize all data before sending to Sentry
  const sanitizedContext = entry.context ? sanitizePII(entry.context) : undefined
  const sanitizedMetadata = entry.metadata ? sanitizePII(entry.metadata) : undefined

  Sentry.withScope((scope) => {
    // Set error ID for correlation with user reports
    scope.setTag('error_id', entry.errorId)
    scope.setTag('error_category', entry.category)
    scope.setLevel(mapLogLevelToSentry(entry.level))

    // Add context
    if (sanitizedContext) {
      scope.setContext('error_context', sanitizedContext as Record<string, unknown>)
    }

    // Add formatted error info
    scope.setContext('formatted_error', {
      message: formattedError.message,
      category: formattedError.category,
      suggestions: formattedError.suggestions,
      requiresAcknowledgment: formattedError.requiresAcknowledgment,
      persistent: formattedError.persistent,
    })

    // Add sanitized metadata
    if (sanitizedMetadata) {
      scope.setExtras(sanitizedMetadata as Record<string, unknown>)
    }

    // Add component stack if available
    if (entry.componentStack) {
      scope.setContext('react', {
        componentStack: entry.componentStack,
      })
    }

    // Capture the error
    Sentry.captureException(error)
  })
}

/**
 * Map our log levels to Sentry severity levels
 */
function mapLogLevelToSentry(level: LogLevel): Sentry.SeverityLevel {
  switch (level) {
    case 'debug':
      return 'debug'
    case 'info':
      return 'info'
    case 'warn':
      return 'warning'
    case 'error':
      return 'error'
    case 'fatal':
      return 'fatal'
  }
}

/**
 * Determine log level based on error category
 */
function getLogLevelForCategory(category: ErrorCategory): LogLevel {
  switch (category) {
    case 'server':
      return 'error'
    case 'auth':
    case 'permission':
      return 'warn'
    case 'validation':
    case 'notFound':
      return 'info'
    case 'network':
    case 'rateLimit':
      return 'warn'
    case 'payment':
      return 'error'
    case 'unknown':
    default:
      return 'error'
  }
}

/**
 * Log an error with full context
 * Requirements: 8.1, 8.2, 8.3, 8.4
 *
 * @param error - The error to log
 * @param context - Optional context about what action was being performed
 * @param options - Additional logging options
 * @returns The formatted error for use in UI
 *
 * @example
 * ```typescript
 * try {
 *   await saveEvent(data)
 * } catch (error) {
 *   const formatted = logError(error, {
 *     action: 'save your event',
 *     component: 'EventForm'
 *   })
 *   showErrorToast(formatted)
 * }
 * ```
 */
export function logError(
  error: unknown,
  context?: ErrorContext,
  options?: {
    level?: LogLevel
    componentStack?: string
    metadata?: Record<string, unknown>
  }
): EnhancedFormattedError {
  // Format the error with context
  const formattedError = formatErrorWithContext(error, context)

  // Determine log level
  const level = options?.level || getLogLevelForCategory(formattedError.category)

  // Create log entry
  const entry: ErrorLogEntry = {
    errorId: formattedError.id,
    timestamp: formatTimestamp(),
    level,
    category: formattedError.category,
    message: formattedError.message,
    context,
    componentStack: options?.componentStack,
    metadata: options?.metadata,
  }

  // Add technical details in development
  if (isDev && error instanceof Error) {
    entry.technicalDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  // Log to console in development
  if (isDev) {
    formatForConsole(entry)
  }

  // Send to Sentry in production (or if configured in dev)
  if (hasSentry && error instanceof Error) {
    sendToSentry(error, entry, formattedError)
  }

  return formattedError
}

/**
 * Log a warning (non-error event)
 * Requirements: 8.1
 */
export function logWarning(
  message: string,
  context?: ErrorContext,
  metadata?: Record<string, unknown>
): void {
  const entry: ErrorLogEntry = {
    errorId: crypto.randomUUID?.() || `warn-${Date.now()}`,
    timestamp: formatTimestamp(),
    level: 'warn',
    category: 'unknown',
    message,
    context,
    metadata,
  }

  if (isDev) {
    formatForConsole(entry)
  }

  if (hasSentry) {
    Sentry.captureMessage(message, {
      level: 'warning',
      extra: sanitizePII(metadata || {}) as Record<string, unknown>,
    })
  }
}

/**
 * Log an info message
 * Requirements: 8.1
 */
export function logInfo(message: string, metadata?: Record<string, unknown>): void {
  if (isDev) {
    console.log(`%c[INFO]%c ${message}`, LOG_STYLES.info, 'color: inherit;', metadata || '')
  }
}

/**
 * Log a debug message (dev only)
 * Requirements: 8.1
 */
export function logDebug(message: string, metadata?: Record<string, unknown>): void {
  if (isDev) {
    console.log(`%c[DEBUG]%c ${message}`, LOG_STYLES.debug, 'color: inherit;', metadata || '')
  }
}

/**
 * Create a scoped logger for a specific component
 * Requirements: 8.3
 *
 * @example
 * ```typescript
 * const logger = createScopedLogger('EventForm')
 * logger.error(error, { action: 'save event' })
 * logger.info('Form submitted successfully')
 * ```
 */
export function createScopedLogger(component: string) {
  return {
    error: (
      error: unknown,
      context?: Omit<ErrorContext, 'component'>,
      metadata?: Record<string, unknown>
    ) =>
      logError(
        error,
        { ...context, component, action: context?.action || 'perform action' },
        { metadata }
      ),

    warn: (message: string, metadata?: Record<string, unknown>) =>
      logWarning(message, { component, action: 'warning' }, metadata),

    info: (message: string, metadata?: Record<string, unknown>) =>
      logInfo(`[${component}] ${message}`, metadata),

    debug: (message: string, metadata?: Record<string, unknown>) =>
      logDebug(`[${component}] ${message}`, metadata),
  }
}

/**
 * Error boundary error handler
 * Requirements: 8.1, 8.3
 *
 * Use this in React error boundaries to log errors with component stack
 */
export function logErrorBoundaryError(
  error: Error,
  errorInfo: { componentStack?: string }
): EnhancedFormattedError {
  return logError(
    error,
    { action: 'render component', component: 'ErrorBoundary' },
    {
      level: 'error',
      componentStack: errorInfo.componentStack,
    }
  )
}

/**
 * Query error handler
 * Requirements: 8.1
 *
 * Use this for React Query or similar data fetching errors
 */
export function logQueryError(
  error: unknown,
  queryKey: string | unknown[]
): EnhancedFormattedError {
  const keyString = Array.isArray(queryKey) ? queryKey.join('/') : queryKey

  return logError(
    error,
    { action: `fetch ${keyString}`, component: 'Query' },
    {
      metadata: { queryKey },
    }
  )
}

/**
 * Mutation error handler
 * Requirements: 8.1
 *
 * Use this for React Query mutations or similar data mutation errors
 */
export function logMutationError(
  error: unknown,
  mutationKey: string,
  variables?: unknown
): EnhancedFormattedError {
  return logError(
    error,
    { action: mutationKey, component: 'Mutation' },
    {
      metadata: { mutationKey, variables: sanitizePII(variables) },
    }
  )
}
