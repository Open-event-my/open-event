/**
 * Sentry Error Tracking Configuration
 *
 * Initialize Sentry for error tracking and performance monitoring.
 * Set VITE_SENTRY_DSN in your environment to enable.
 */

import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN provided, error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE, // 'development' | 'production'

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay (optional, can be enabled later)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 0,

    // Filter out known non-errors
    beforeSend(event, hint) {
      const error = hint.originalException

      // Ignore network errors that are expected
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return null
      }

      // Ignore aborted requests
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null
      }

      // Ignore ResizeObserver loop errors (browser bug, harmless)
      if (error instanceof Error && error.message.includes('ResizeObserver')) {
        return null
      }

      return event
    },

    // Integrations
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  })

  console.log('[Sentry] Initialized error tracking')
}

/**
 * Capture an error with additional context
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    console.error('[Error]', error, context)
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}]`, message)
    return
  }

  Sentry.captureMessage(message, level)
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; name?: string } | null) {
  if (!SENTRY_DSN) return

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  if (!SENTRY_DSN) return

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}

// Re-export Sentry for advanced usage
export { Sentry }
