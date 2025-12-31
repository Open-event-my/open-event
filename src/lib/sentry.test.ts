/**
 * Unit tests for Sentry initialization
 *
 * Validates: Requirements 2.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Sentry from '@sentry/react'

// Mock Sentry module
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}))

describe('Sentry Frontend Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear module cache to allow re-importing
    vi.resetModules()
  })

  afterEach(() => {
    // Clean up environment variables
    delete import.meta.env.VITE_SENTRY_DSN
  })

  it('should initialize Sentry when DSN is provided', async () => {
    // Set DSN in environment
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'
    import.meta.env.PROD = false

    // Import module to trigger initialization
    const { initSentry } = await import('./sentry')
    initSentry()

    // Verify Sentry.init was called
    expect(Sentry.init).toHaveBeenCalledTimes(1)
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test@sentry.io/123',
        environment: expect.any(String),
      })
    )
  })

  it('should not initialize Sentry when DSN is not provided', async () => {
    // No DSN in environment
    delete import.meta.env.VITE_SENTRY_DSN

    // Import module to trigger initialization
    const { initSentry } = await import('./sentry')
    initSentry()

    // Verify Sentry.init was not called
    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('should configure performance monitoring with correct sample rates', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'
    import.meta.env.PROD = true

    const { initSentry } = await import('./sentry')
    initSentry()

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.1, // 10% in production
      })
    )
  })

  it('should include browser tracing and replay integrations', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { initSentry } = await import('./sentry')
    initSentry()

    expect(Sentry.browserTracingIntegration).toHaveBeenCalled()
    expect(Sentry.replayIntegration).toHaveBeenCalled()
  })

  it('should capture errors with context', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { captureError } = await import('./sentry')
    const testError = new Error('Test error')
    const context = { userId: '123', action: 'test' }

    captureError(testError, context)

    expect(Sentry.captureException).toHaveBeenCalledWith(testError, {
      extra: context,
    })
  })

  it('should capture messages with correct level', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { captureMessage } = await import('./sentry')

    captureMessage('Test message', 'warning')

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'warning')
  })

  it('should set user context', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { setUser } = await import('./sentry')
    const user = { id: '123', email: 'test@example.com', name: 'Test User' }

    setUser(user)

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: '123',
      email: 'test@example.com',
      username: 'Test User',
    })
  })

  it('should clear user context when null is passed', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { setUser } = await import('./sentry')

    setUser(null)

    expect(Sentry.setUser).toHaveBeenCalledWith(null)
  })

  it('should add breadcrumbs for tracking', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { addBreadcrumb } = await import('./sentry')

    addBreadcrumb('User clicked button', 'ui', { buttonId: 'submit' })

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'User clicked button',
      category: 'ui',
      data: { buttonId: 'submit' },
      level: 'info',
    })
  })

  it('should filter out known non-errors', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { initSentry } = await import('./sentry')
    initSentry()

    const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const beforeSend = initCall.beforeSend

    // Test filtering of network errors
    const networkError = new TypeError('Failed to fetch')
    const result = beforeSend({}, { originalException: networkError })
    expect(result).toBeNull()

    // Test filtering of AbortError
    const abortError = new DOMException('Aborted', 'AbortError')
    const result2 = beforeSend({}, { originalException: abortError })
    expect(result2).toBeNull()

    // Test filtering of ResizeObserver errors
    const resizeError = new Error('ResizeObserver loop limit exceeded')
    const result3 = beforeSend({}, { originalException: resizeError })
    expect(result3).toBeNull()
  })

  it('should not filter out real errors', async () => {
    import.meta.env.VITE_SENTRY_DSN = 'https://test@sentry.io/123'

    const { initSentry } = await import('./sentry')
    initSentry()

    const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const beforeSend = initCall.beforeSend

    // Test that real errors pass through
    const realError = new Error('Real application error')
    const event = { message: 'Error occurred' }
    const result = beforeSend(event, { originalException: realError })
    expect(result).toEqual(event)
  })
})
