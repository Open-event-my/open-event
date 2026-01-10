/**
 * Sentry Error Tracking Configuration
 *
 * TEMPORARILY DISABLED: @sentry/react is not compatible with React 19.
 * The import itself patches React internals and causes errors.
 * TODO: Re-enable when Sentry releases React 19 compatible version.
 */

export function initSentry() {
  console.log('[Sentry] Disabled - waiting for React 19 compatibility')
}

/**
 * Capture an error with additional context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error, context)
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  console.log(`[${level.toUpperCase()}]`, message)
}

/**
 * Set user context for error tracking
 */
export function setUser(
  _user: { id: string; email?: string; name?: string } | null // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  // No-op when Sentry is disabled
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  _message: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  _category: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  _data?: Record<string, unknown> // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  // No-op when Sentry is disabled
}

// Placeholder Sentry object for compatibility
export const Sentry = {
  captureException: (error: Error) => console.error('[Sentry disabled]', error),
  captureMessage: (message: string) => console.log('[Sentry disabled]', message),
  setUser: () => {},
  addBreadcrumb: () => {},
}
