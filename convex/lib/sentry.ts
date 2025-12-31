/**
 * Sentry Error Tracking Stub for Convex Backend
 *
 * This is a stub implementation that provides no-op functions.
 * Sentry integration for Convex backend requires Node.js runtime
 * which is only available in Convex actions with "use node" directive.
 *
 * For production error tracking, use the frontend Sentry integration
 * or create a dedicated action file with "use node" for server-side tracking.
 */

let initialized = false

/**
 * Initialize Sentry for backend error tracking (no-op in edge runtime)
 */
export function initSentry() {
  if (initialized) return
  initialized = true
  console.log('[Sentry Backend] Sentry integration disabled in edge runtime')
}

/**
 * Capture an error (no-op in edge runtime)
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  // Log to console instead of Sentry in edge runtime
  console.error('[Sentry Backend] Error captured:', error.message, context)
}

/**
 * Capture a message (no-op in edge runtime)
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  console.log(`[Sentry Backend] ${level.toUpperCase()}: ${message}`)
}

/**
 * Set user context (no-op in edge runtime)
 */
export function setUser(_user: { id: string; email?: string } | null): void {
  void _user // Intentionally unused - no-op in edge runtime
}

/**
 * Add a breadcrumb (no-op in edge runtime)
 */
export function addBreadcrumb(_breadcrumb: {
  category: string
  message: string
  level?: 'info' | 'warning' | 'error'
  data?: Record<string, unknown>
}): void {
  void _breadcrumb // Intentionally unused - no-op in edge runtime
}
