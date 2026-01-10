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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setUser(user: { id: string; email?: string; name?: string } | null) {
  // No-op when Sentry is disabled
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  category: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  data?: Record<string, unknown>
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
