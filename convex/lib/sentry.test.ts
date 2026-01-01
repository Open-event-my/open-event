/**
 * Unit tests for Sentry backend initialization
 *
 * Validates: Requirements 2.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @sentry/node module
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}))

describe('Sentry Backend Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Clear environment variables
    delete process.env.SENTRY_DSN
    delete process.env.CONVEX_CLOUD_URL
  })

  it('should initialize Sentry when DSN is provided', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'
    // Explicitly set to undefined to ensure development environment
    delete process.env.CONVEX_CLOUD_URL

    const Sentry = await import('@sentry/node')
    const { initSentry } = await import('./sentry')

    initSentry()

    expect(Sentry.init).toHaveBeenCalledTimes(1)
    const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(initCall).toMatchObject({
      dsn: 'https://test@sentry.io/123',
      environment: expect.stringMatching(/development|production/),
      tracesSampleRate: expect.any(Number),
    })
  })

  it('should not initialize Sentry when DSN is not provided', async () => {
    delete process.env.SENTRY_DSN

    const Sentry = await import('@sentry/node')
    const { initSentry } = await import('./sentry')

    initSentry()

    expect(Sentry.init).not.toHaveBeenCalled()
  })

  it('should set environment to production when CONVEX_CLOUD_URL is present', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'
    process.env.CONVEX_CLOUD_URL = 'https://my-app.convex.cloud'

    const Sentry = await import('@sentry/node')
    const { initSentry } = await import('./sentry')

    initSentry()

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'production',
      })
    )
  })

  it('should configure performance monitoring with correct sample rates', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'
    process.env.CONVEX_CLOUD_URL = 'https://my-app.convex.cloud'

    const Sentry = await import('@sentry/node')
    const { initSentry } = await import('./sentry')

    initSentry()

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.1, // 10% in production
      })
    )
  })

  it('should only initialize once even if called multiple times', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { initSentry } = await import('./sentry')

    initSentry()
    initSentry()
    initSentry()

    expect(Sentry.init).toHaveBeenCalledTimes(1)
  })

  it('should capture errors with context', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { captureError } = await import('./sentry')

    const testError = new Error('Backend error')
    const context = { operation: 'createEvent', userId: '123' }

    captureError(testError, context)

    expect(Sentry.captureException).toHaveBeenCalledWith(testError, {
      extra: context,
    })
  })

  it('should capture messages with correct level', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { captureMessage } = await import('./sentry')

    captureMessage('Backend warning', 'warning')

    expect(Sentry.captureMessage).toHaveBeenCalledWith('Backend warning', 'warning')
  })

  it('should set user context', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { setUser } = await import('./sentry')

    const user = { id: '123', email: 'test@example.com' }

    setUser(user)

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: '123',
      email: 'test@example.com',
    })
  })

  it('should clear user context when null is passed', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { setUser } = await import('./sentry')

    setUser(null)

    expect(Sentry.setUser).toHaveBeenCalledWith(null)
  })

  it('should add breadcrumbs for tracking operations', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { addBreadcrumb } = await import('./sentry')

    addBreadcrumb('Event created', 'database', { eventId: 'evt_123' })

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      message: 'Event created',
      category: 'database',
      data: { eventId: 'evt_123' },
      level: 'info',
    })
  })

  it('should filter out validation errors', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { initSentry } = await import('./sentry')

    initSentry()

    const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const beforeSend = initCall.beforeSend

    // Test filtering of validation errors
    const validationError = new Error('validation failed')
    const result = beforeSend({}, { originalException: validationError })
    expect(result).toBeNull()

    // Test filtering of invalid errors
    const invalidError = new Error('invalid input provided')
    const result2 = beforeSend({}, { originalException: invalidError })
    expect(result2).toBeNull()
  })

  it('should not filter out real backend errors', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123'

    const Sentry = await import('@sentry/node')
    const { initSentry } = await import('./sentry')

    initSentry()

    const initCall = (Sentry.init as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const beforeSend = initCall.beforeSend

    // Test that real errors pass through
    const realError = new Error('Database connection failed')
    const event = { message: 'Error occurred' }
    const result = beforeSend(event, { originalException: realError })
    expect(result).toEqual(event)
  })

  it('should log to console when DSN is not provided', async () => {
    delete process.env.SENTRY_DSN

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { captureError } = await import('./sentry')

    const testError = new Error('Test error')
    captureError(testError, { test: true })

    expect(consoleSpy).toHaveBeenCalledWith('[Backend Error]', testError, { test: true })

    consoleSpy.mockRestore()
  })
})
