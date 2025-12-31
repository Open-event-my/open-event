/**
 * Health Check Tests
 *
 * Tests for configuration health check utilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  checkFrontendHealth,
  checkBackendHealth,
  checkCombinedHealth,
  formatHealthStatus,
  type CombinedHealthStatus,
} from './healthCheck'

// Mock fetch for backend health checks
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('healthCheck', () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    originalEnv = {
      VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    }
    mockFetch.mockReset()
  })

  afterEach(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete (import.meta.env as Record<string, unknown>)[key]
      } else {
        ;(import.meta.env as Record<string, unknown>)[key] = value
      }
    })
  })

  describe('checkFrontendHealth()', () => {
    it('should return health status with checks array', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'

      const health = checkFrontendHealth()

      expect(health).toHaveProperty('healthy')
      expect(health).toHaveProperty('environment')
      expect(health).toHaveProperty('timestamp')
      expect(health).toHaveProperty('checks')
      expect(Array.isArray(health.checks)).toBe(true)
    })

    it('should return healthy when required vars are set', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'

      const health = checkFrontendHealth()

      expect(health.healthy).toBe(true)
    })

    it('should return unhealthy when required vars are missing', () => {
      delete (import.meta.env as Record<string, unknown>).VITE_CONVEX_URL

      const health = checkFrontendHealth()

      expect(health.healthy).toBe(false)
    })

    it('should include timestamp in response', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      const before = Date.now()

      const health = checkFrontendHealth()

      expect(health.timestamp).toBeGreaterThanOrEqual(before)
      expect(health.timestamp).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('checkBackendHealth()', () => {
    it('should return null when no convex URL is available', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_CONVEX_URL

      const health = await checkBackendHealth()

      expect(health).toBeNull()
    })

    it('should call the correct endpoint', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            healthy: true,
            environment: 'production',
            timestamp: Date.now(),
            checks: [],
            summary: { total: 0, passed: 0, warnings: 0, failed: 0 },
          },
        }),
      })

      await checkBackendHealth()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.convex.site/api/health/config',
        expect.objectContaining({
          method: 'GET',
        })
      )
    })

    it('should return backend health data on success', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      const mockData = {
        healthy: true,
        environment: 'production',
        timestamp: Date.now(),
        checks: [
          { name: 'OPENAI_API_KEY', status: 'pass', message: 'Configured', required: false },
        ],
        summary: { total: 1, passed: 1, warnings: 0, failed: 0 },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const health = await checkBackendHealth()

      expect(health).toEqual(mockData)
    })

    it('should return null on fetch error', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const health = await checkBackendHealth()

      expect(health).toBeNull()
    })

    it('should return null on non-ok response', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const health = await checkBackendHealth()

      expect(health).toBeNull()
    })

    it('should use provided convex URL over env var', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://env.convex.cloud'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            healthy: true,
            environment: 'production',
            timestamp: Date.now(),
            checks: [],
            summary: { total: 0, passed: 0, warnings: 0, failed: 0 },
          },
        }),
      })

      await checkBackendHealth('https://custom.convex.cloud')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.convex.site/api/health/config',
        expect.any(Object)
      )
    })
  })

  describe('checkCombinedHealth()', () => {
    it('should return combined frontend and backend health', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            healthy: true,
            environment: 'production',
            timestamp: Date.now(),
            checks: [],
            summary: { total: 0, passed: 0, warnings: 0, failed: 0 },
          },
        }),
      })

      const health = await checkCombinedHealth()

      expect(health).toHaveProperty('frontend')
      expect(health).toHaveProperty('backend')
      expect(health).toHaveProperty('overall')
    })

    it('should be healthy when both frontend and backend are healthy', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            healthy: true,
            environment: 'production',
            timestamp: Date.now(),
            checks: [],
            summary: { total: 0, passed: 0, warnings: 0, failed: 0 },
          },
        }),
      })

      const health = await checkCombinedHealth()

      expect(health.overall.healthy).toBe(true)
    })

    it('should be unhealthy when frontend is unhealthy', async () => {
      delete (import.meta.env as Record<string, unknown>).VITE_CONVEX_URL

      const health = await checkCombinedHealth()

      expect(health.overall.healthy).toBe(false)
    })

    it('should be unhealthy when backend is unhealthy', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            healthy: false,
            environment: 'production',
            timestamp: Date.now(),
            checks: [],
            summary: { total: 0, passed: 0, warnings: 0, failed: 0 },
          },
        }),
      })

      const health = await checkCombinedHealth()

      expect(health.overall.healthy).toBe(false)
    })

    it('should assume backend healthy when check fails', async () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const health = await checkCombinedHealth()

      // Frontend is healthy, backend check failed but assumed healthy
      expect(health.backend).toBeNull()
      expect(health.overall.healthy).toBe(true)
    })
  })

  describe('formatHealthStatus()', () => {
    it('should format healthy status correctly', () => {
      const status: CombinedHealthStatus = {
        frontend: {
          healthy: true,
          environment: 'development',
          timestamp: Date.now(),
          checks: [
            { name: 'VITE_CONVEX_URL', status: 'pass', message: 'Configured', required: true },
          ],
        },
        backend: null,
        overall: {
          healthy: true,
          timestamp: Date.now(),
        },
      }

      const formatted = formatHealthStatus(status)

      expect(formatted).toContain('✅ Healthy')
      expect(formatted).toContain('Frontend Configuration')
      expect(formatted).toContain('VITE_CONVEX_URL')
    })

    it('should format unhealthy status correctly', () => {
      const status: CombinedHealthStatus = {
        frontend: {
          healthy: false,
          environment: 'development',
          timestamp: Date.now(),
          checks: [
            { name: 'VITE_CONVEX_URL', status: 'fail', message: 'Missing', required: true },
          ],
        },
        backend: null,
        overall: {
          healthy: false,
          timestamp: Date.now(),
        },
      }

      const formatted = formatHealthStatus(status)

      expect(formatted).toContain('❌ Unhealthy')
      expect(formatted).toContain('❌ VITE_CONVEX_URL')
    })

    it('should include backend checks when available', () => {
      const status: CombinedHealthStatus = {
        frontend: {
          healthy: true,
          environment: 'development',
          timestamp: Date.now(),
          checks: [],
        },
        backend: {
          healthy: true,
          environment: 'production',
          timestamp: Date.now(),
          checks: [
            { name: 'OPENAI_API_KEY', status: 'pass', message: 'Configured', required: false },
          ],
          summary: { total: 1, passed: 1, warnings: 0, failed: 0 },
        },
        overall: {
          healthy: true,
          timestamp: Date.now(),
        },
      }

      const formatted = formatHealthStatus(status)

      expect(formatted).toContain('Backend Configuration')
      expect(formatted).toContain('OPENAI_API_KEY')
    })

    it('should show warning icon for warn status', () => {
      const status: CombinedHealthStatus = {
        frontend: {
          healthy: true,
          environment: 'development',
          timestamp: Date.now(),
          checks: [
            { name: 'VITE_SENTRY_DSN', status: 'warn', message: 'Not configured', required: false },
          ],
        },
        backend: null,
        overall: {
          healthy: true,
          timestamp: Date.now(),
        },
      }

      const formatted = formatHealthStatus(status)

      expect(formatted).toContain('⚠️ VITE_SENTRY_DSN')
    })
  })
})
