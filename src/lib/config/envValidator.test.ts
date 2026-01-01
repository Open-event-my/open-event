/**
 * Environment Validator Tests
 *
 * Tests for environment variable validation and configuration health checks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EnvironmentValidator, clientEnvSchema } from './envValidator'

describe('EnvironmentValidator', () => {
  let validator: EnvironmentValidator
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    validator = new EnvironmentValidator()
    // Store original env values
    originalEnv = {
      VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
      MODE: import.meta.env.MODE,
    }
  })

  afterEach(() => {
    // Restore original env values
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete (import.meta.env as Record<string, unknown>)[key]
      } else {
        ;(import.meta.env as Record<string, unknown>)[key] = value
      }
    })
    validator.reset()
  })

  describe('validate()', () => {
    it('should pass validation with valid VITE_CONVEX_URL', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'

      const result = validator.validate(false)

      expect(result.success).toBe(true)
      expect(result.data?.VITE_CONVEX_URL).toBe('https://test.convex.cloud')
    })

    it('should fail validation when VITE_CONVEX_URL is missing', () => {
      delete (import.meta.env as Record<string, unknown>).VITE_CONVEX_URL

      const result = validator.validate(false)

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.some((e) => e.field === 'VITE_CONVEX_URL')).toBe(true)
    })

    it('should fail validation when VITE_CONVEX_URL is not a valid URL', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'not-a-url'

      const result = validator.validate(false)

      expect(result.success).toBe(false)
      expect(result.errors?.some((e) => e.field === 'VITE_CONVEX_URL')).toBe(true)
    })

    it('should throw error when throwOnError is true and validation fails', () => {
      delete (import.meta.env as Record<string, unknown>).VITE_CONVEX_URL

      expect(() => validator.validate(true)).toThrow('Environment Configuration Error')
    })

    it('should validate optional VITE_SENTRY_DSN when provided', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      ;(import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = 'https://test@sentry.io/123'

      const result = validator.validate(false)

      expect(result.success).toBe(true)
      expect(result.data?.VITE_SENTRY_DSN).toBe('https://test@sentry.io/123')
    })

    it('should fail when VITE_SENTRY_DSN is not a valid URL', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      ;(import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN = 'invalid-dsn'

      const result = validator.validate(false)

      expect(result.success).toBe(false)
      expect(result.errors?.some((e) => e.field === 'VITE_SENTRY_DSN')).toBe(true)
    })

    it('should validate VITE_STRIPE_PUBLIC_KEY starts with pk_', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      ;(import.meta.env as Record<string, unknown>).VITE_STRIPE_PUBLIC_KEY = 'pk_test_123'

      const result = validator.validate(false)

      expect(result.success).toBe(true)
      expect(result.data?.VITE_STRIPE_PUBLIC_KEY).toBe('pk_test_123')
    })

    it('should fail when VITE_STRIPE_PUBLIC_KEY does not start with pk_', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      ;(import.meta.env as Record<string, unknown>).VITE_STRIPE_PUBLIC_KEY = 'sk_test_123'

      const result = validator.validate(false)

      expect(result.success).toBe(false)
      expect(result.errors?.some((e) => e.field === 'VITE_STRIPE_PUBLIC_KEY')).toBe(true)
    })
  })

  describe('getConfig()', () => {
    it('should return config after successful validation', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      validator.validate(false)

      const config = validator.getConfig()

      expect(config.VITE_CONVEX_URL).toBe('https://test.convex.cloud')
    })

    it('should throw error if validate() was not called', () => {
      expect(() => validator.getConfig()).toThrow('Environment not validated')
    })
  })

  describe('healthCheck()', () => {
    it('should return healthy status when all required vars are set', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'

      const health = validator.healthCheck()

      expect(health.healthy).toBe(true)
      expect(health.checks.find((c) => c.name === 'VITE_CONVEX_URL')?.status).toBe('pass')
    })

    it('should return unhealthy status when required vars are missing', () => {
      delete (import.meta.env as Record<string, unknown>).VITE_CONVEX_URL

      const health = validator.healthCheck()

      expect(health.healthy).toBe(false)
      expect(health.checks.find((c) => c.name === 'VITE_CONVEX_URL')?.status).toBe('fail')
    })

    it('should return warn status for optional vars that are missing', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      delete (import.meta.env as Record<string, unknown>).VITE_SENTRY_DSN

      const health = validator.healthCheck()

      expect(health.healthy).toBe(true) // Still healthy because Sentry is optional
      expect(health.checks.find((c) => c.name === 'VITE_SENTRY_DSN')?.status).toBe('warn')
    })

    it('should include timestamp in health check', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      const before = Date.now()

      const health = validator.healthCheck()

      expect(health.timestamp).toBeGreaterThanOrEqual(before)
      expect(health.timestamp).toBeLessThanOrEqual(Date.now())
    })

    it('should include environment in health check', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'

      const health = validator.healthCheck()

      expect(['development', 'staging', 'production', 'test']).toContain(health.environment)
    })
  })

  describe('getEnvironment()', () => {
    it('should return development for development mode', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      expect(validator.getEnvironment()).toBe('development')
    })

    it('should return production for production mode', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'production'

      expect(validator.getEnvironment()).toBe('production')
    })

    it('should return development for unknown mode', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'unknown'

      expect(validator.getEnvironment()).toBe('development')
    })
  })

  describe('isProduction() and isDevelopment()', () => {
    it('should return true for isProduction in production mode', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'production'

      expect(validator.isProduction()).toBe(true)
      expect(validator.isDevelopment()).toBe(false)
    })

    it('should return true for isDevelopment in development mode', () => {
      ;(import.meta.env as Record<string, unknown>).MODE = 'development'

      expect(validator.isDevelopment()).toBe(true)
      expect(validator.isProduction()).toBe(false)
    })
  })

  describe('reset()', () => {
    it('should reset validation state', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      validator.validate(false)
      expect(validator.isValidated()).toBe(true)

      validator.reset()

      expect(validator.isValidated()).toBe(false)
      expect(() => validator.getConfig()).toThrow()
    })
  })

  describe('getValidationErrors()', () => {
    it('should return empty array after successful validation', () => {
      ;(import.meta.env as Record<string, unknown>).VITE_CONVEX_URL = 'https://test.convex.cloud'
      validator.validate(false)

      expect(validator.getValidationErrors()).toEqual([])
    })

    it('should return errors after failed validation', () => {
      delete (import.meta.env as Record<string, unknown>).VITE_CONVEX_URL
      validator.validate(false)

      const errors = validator.getValidationErrors()
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].field).toBe('VITE_CONVEX_URL')
    })
  })
})

describe('clientEnvSchema', () => {
  it('should validate correct environment variables', () => {
    const result = clientEnvSchema.safeParse({
      VITE_CONVEX_URL: 'https://test.convex.cloud',
      VITE_SENTRY_DSN: 'https://test@sentry.io/123',
      VITE_STRIPE_PUBLIC_KEY: 'pk_test_123',
    })

    expect(result.success).toBe(true)
  })

  it('should allow optional fields to be undefined', () => {
    const result = clientEnvSchema.safeParse({
      VITE_CONVEX_URL: 'https://test.convex.cloud',
    })

    expect(result.success).toBe(true)
  })
})
