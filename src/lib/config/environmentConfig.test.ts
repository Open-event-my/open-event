/**
 * Environment Configuration Tests
 *
 * Tests for environment-specific configuration settings.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getEnvironmentConfig, isFeatureEnabled, getConfigSection } from './environmentConfig'

describe('environmentConfig', () => {
  let originalMode: string | undefined

  beforeEach(() => {
    originalMode = import.meta.env.MODE
  })

  afterEach(() => {
    if (originalMode === undefined) {
      delete (import.meta.env as Record<string, unknown>).MODE
    } else {
      ;(import.meta.env as Record<string, unknown>).MODE = originalMode
    }
  })

  describe('getEnvironmentConfig()', () => {
    it('should return development config for development mode', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      const config = getEnvironmentConfig()

      expect(config.environment).toBe('development')
      expect(config.features.debugMode).toBe(true)
      expect(config.logging.level).toBe('debug')
    })

    it('should return staging config for staging mode', () => {
      const config = getEnvironmentConfig('staging')

      expect(config.environment).toBe('staging')
      expect(config.features.debugMode).toBe(true)
      expect(config.features.errorTracking).toBe(true)
      expect(config.logging.level).toBe('info')
    })

    it('should return production config for production mode', () => {
      const config = getEnvironmentConfig('production')

      expect(config.environment).toBe('production')
      expect(config.features.debugMode).toBe(false)
      expect(config.features.errorTracking).toBe(true)
      expect(config.logging.level).toBe('warn')
      expect(config.logging.console).toBe(false)
    })

    it('should return test config for test mode', () => {
      const config = getEnvironmentConfig('test')

      expect(config.environment).toBe('test')
      expect(config.features.debugMode).toBe(false)
      expect(config.features.errorTracking).toBe(false)
      expect(config.logging.level).toBe('error')
      expect(config.api.timeout).toBe(5000) // Shorter for tests
    })

    it('should use environment override when provided', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      const config = getEnvironmentConfig('production')

      expect(config.environment).toBe('production')
    })
  })

  describe('environment-specific settings', () => {
    it('should have longer session timeout in development', () => {
      const devConfig = getEnvironmentConfig('development')
      const prodConfig = getEnvironmentConfig('production')

      expect(devConfig.session.timeout).toBeGreaterThan(prodConfig.session.timeout)
    })

    it('should have 15-minute session timeout in production (security requirement)', () => {
      const config = getEnvironmentConfig('production')

      expect(config.session.timeout).toBe(900000) // 15 minutes in ms
    })

    it('should have higher rate limits in development', () => {
      const devConfig = getEnvironmentConfig('development')
      const prodConfig = getEnvironmentConfig('production')

      expect(devConfig.rateLimit.maxRequests).toBeGreaterThan(prodConfig.rateLimit.maxRequests)
    })

    it('should have shorter cache TTL in development', () => {
      const devConfig = getEnvironmentConfig('development')
      const prodConfig = getEnvironmentConfig('production')

      expect(devConfig.cache.defaultTTL).toBeLessThan(prodConfig.cache.defaultTTL)
    })

    it('should disable console logging in production', () => {
      const config = getEnvironmentConfig('production')

      expect(config.logging.console).toBe(false)
    })

    it('should enable console logging in development', () => {
      const config = getEnvironmentConfig('development')

      expect(config.logging.console).toBe(true)
    })
  })

  describe('isFeatureEnabled()', () => {
    it('should return true for enabled features', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      expect(isFeatureEnabled('debugMode')).toBe(true)
    })

    it('should return false for disabled features', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'production'

      expect(isFeatureEnabled('debugMode')).toBe(false)
    })

    it('should check errorTracking feature', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'production'

      expect(isFeatureEnabled('errorTracking')).toBe(true)
    })

    it('should check analytics feature', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'test'

      expect(isFeatureEnabled('analytics')).toBe(false)
    })
  })

  describe('getConfigSection()', () => {
    it('should return api configuration section', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      const apiConfig = getConfigSection('api')

      expect(apiConfig.timeout).toBeDefined()
      expect(apiConfig.retryAttempts).toBeDefined()
      expect(apiConfig.retryBaseDelay).toBeDefined()
    })

    it('should return logging configuration section', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      const loggingConfig = getConfigSection('logging')

      expect(loggingConfig.level).toBeDefined()
      expect(loggingConfig.timestamps).toBeDefined()
      expect(loggingConfig.console).toBeDefined()
    })

    it('should return cache configuration section', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      const cacheConfig = getConfigSection('cache')

      expect(cacheConfig.defaultTTL).toBeDefined()
      expect(cacheConfig.maxSize).toBeDefined()
    })

    it('should return session configuration section', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      const sessionConfig = getConfigSection('session')

      expect(sessionConfig.timeout).toBeDefined()
      expect(sessionConfig.warningBefore).toBeDefined()
    })

    it('should return rateLimit configuration section', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      const rateLimitConfig = getConfigSection('rateLimit')

      expect(rateLimitConfig.maxRequests).toBeDefined()
      expect(rateLimitConfig.windowMs).toBeDefined()
    })
  })

  describe('configuration completeness', () => {
    const environments = ['development', 'staging', 'production', 'test'] as const

    environments.forEach((env) => {
      it(`should have all required sections for ${env} environment`, () => {
        const config = getEnvironmentConfig(env)

        expect(config.environment).toBe(env)
        expect(config.api).toBeDefined()
        expect(config.logging).toBeDefined()
        expect(config.features).toBeDefined()
        expect(config.cache).toBeDefined()
        expect(config.session).toBeDefined()
        expect(config.rateLimit).toBeDefined()
      })
    })
  })
})
