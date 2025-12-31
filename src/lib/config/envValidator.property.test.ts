/**
 * Property-Based Tests for Environment Validator
 *
 * Feature: production-readiness, Property 26: Configuration Validation Error Messages
 * Validates: Requirements 9.2
 *
 * These tests verify that the environment validator provides clear error messages
 * for any missing or invalid configuration values.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { EnvironmentValidator } from './envValidator'

// Store original env values for restoration
let originalEnv: Record<string, string | undefined>

// Helper to set environment variables
const setEnvVar = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete (import.meta.env as Record<string, unknown>)[key]
  } else {
    ;(import.meta.env as Record<string, unknown>)[key] = value
  }
}

// Arbitraries for generating test data
const validUrlArbitrary = fc.webUrl({ validSchemes: ['https'] })

// Generate strings that are definitely not valid URLs
// Avoid strings that could be interpreted as URL schemes (like "A:")
const invalidUrlArbitrary = fc.oneof(
  fc.constant('not-a-url'),
  fc.constant('invalid'),
  fc.constant('just-text'),
  fc.constant('missing-protocol.com'),
  fc
    .string({ minLength: 1, maxLength: 10 })
    .map((s) => `invalid_${s.replace(/[^a-zA-Z0-9]/g, 'x')}`)
)

const validStripeKeyArbitrary = fc
  .string({ minLength: 5, maxLength: 30 })
  .map((s) => `pk_${s.replace(/[^a-zA-Z0-9_]/g, 'x')}`)

const invalidStripeKeyArbitrary = fc.oneof(
  fc.constant('sk_test_123'),
  fc.constant('invalid_key'),
  fc.constant('not_pk_key'),
  fc.string({ minLength: 5, maxLength: 30 }).filter((s) => !s.startsWith('pk_'))
)

describe('Environment Validator - Property Tests', () => {
  beforeEach(() => {
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
      setEnvVar(key, value)
    })
  })

  describe('Property 26: Configuration Validation Error Messages', () => {
    /**
     * Property: For any missing required configuration value, the validation
     * should fail with an error message that identifies the missing field.
     */
    it('should provide clear error message identifying missing required field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const validator = new EnvironmentValidator()

          // Remove required VITE_CONVEX_URL
          setEnvVar('VITE_CONVEX_URL', undefined)
          setEnvVar('VITE_SENTRY_DSN', undefined)
          setEnvVar('VITE_STRIPE_PUBLIC_KEY', undefined)

          const result = validator.validate(false)

          // Validation should fail
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)

          // Error should identify the problematic field
          const convexError = result.errors!.find((e) => e.field === 'VITE_CONVEX_URL')
          expect(convexError).toBeDefined()
          expect(convexError!.message).toBeTruthy()
          expect(convexError!.message.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any invalid URL format in VITE_CONVEX_URL, the validation
     * should fail with an error message indicating the URL is invalid.
     */
    it('should provide clear error message for invalid VITE_CONVEX_URL format', async () => {
      await fc.assert(
        fc.asyncProperty(invalidUrlArbitrary, async (invalidUrl) => {
          const validator = new EnvironmentValidator()

          // Set invalid URL
          setEnvVar('VITE_CONVEX_URL', invalidUrl)
          setEnvVar('VITE_SENTRY_DSN', undefined)
          setEnvVar('VITE_STRIPE_PUBLIC_KEY', undefined)

          const result = validator.validate(false)

          // Validation should fail
          expect(result.success).toBe(false)
          expect(result.errors).toBeDefined()

          // Error should identify the problematic field and indicate URL issue
          const urlError = result.errors!.find((e) => e.field === 'VITE_CONVEX_URL')
          expect(urlError).toBeDefined()
          expect(urlError!.message.toLowerCase()).toMatch(/url|invalid/i)
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any invalid Stripe key format (not starting with pk_),
     * the validation should fail with a clear error message.
     */
    it('should provide clear error message for invalid VITE_STRIPE_PUBLIC_KEY format', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          invalidStripeKeyArbitrary,
          async (validUrl, invalidKey) => {
            const validator = new EnvironmentValidator()

            // Set valid URL but invalid Stripe key
            setEnvVar('VITE_CONVEX_URL', validUrl)
            setEnvVar('VITE_SENTRY_DSN', undefined)
            setEnvVar('VITE_STRIPE_PUBLIC_KEY', invalidKey)

            const result = validator.validate(false)

            // Validation should fail
            expect(result.success).toBe(false)
            expect(result.errors).toBeDefined()

            // Error should identify the Stripe key field
            const stripeError = result.errors!.find((e) => e.field === 'VITE_STRIPE_PUBLIC_KEY')
            expect(stripeError).toBeDefined()
            expect(stripeError!.message).toContain('pk_')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any invalid Sentry DSN format (not a valid URL),
     * the validation should fail with a clear error message.
     */
    it('should provide clear error message for invalid VITE_SENTRY_DSN format', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          invalidUrlArbitrary,
          async (validConvexUrl, invalidDsn) => {
            const validator = new EnvironmentValidator()

            // Set valid Convex URL but invalid Sentry DSN
            setEnvVar('VITE_CONVEX_URL', validConvexUrl)
            setEnvVar('VITE_SENTRY_DSN', invalidDsn)
            setEnvVar('VITE_STRIPE_PUBLIC_KEY', undefined)

            const result = validator.validate(false)

            // Validation should fail
            expect(result.success).toBe(false)
            expect(result.errors).toBeDefined()

            // Error should identify the Sentry DSN field
            const sentryError = result.errors!.find((e) => e.field === 'VITE_SENTRY_DSN')
            expect(sentryError).toBeDefined()
            expect(sentryError!.message.toLowerCase()).toMatch(/url|invalid/i)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any valid configuration, validation should succeed
     * and return the validated configuration data.
     */
    it('should succeed with valid configuration and return config data', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (validUrl) => {
          const validator = new EnvironmentValidator()

          // Set valid configuration
          setEnvVar('VITE_CONVEX_URL', validUrl)
          setEnvVar('VITE_SENTRY_DSN', undefined)
          setEnvVar('VITE_STRIPE_PUBLIC_KEY', undefined)

          const result = validator.validate(false)

          // Validation should succeed
          expect(result.success).toBe(true)
          expect(result.data).toBeDefined()
          expect(result.data!.VITE_CONVEX_URL).toBe(validUrl)
          expect(result.errors).toBeUndefined()
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any valid full configuration (all fields), validation
     * should succeed and return all config values.
     */
    it('should succeed with all valid optional fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUrlArbitrary,
          validUrlArbitrary,
          validStripeKeyArbitrary,
          async (convexUrl, sentryDsn, stripeKey) => {
            const validator = new EnvironmentValidator()

            // Set all valid configuration
            setEnvVar('VITE_CONVEX_URL', convexUrl)
            setEnvVar('VITE_SENTRY_DSN', sentryDsn)
            setEnvVar('VITE_STRIPE_PUBLIC_KEY', stripeKey)

            const result = validator.validate(false)

            // Validation should succeed
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data!.VITE_CONVEX_URL).toBe(convexUrl)
            expect(result.data!.VITE_SENTRY_DSN).toBe(sentryDsn)
            expect(result.data!.VITE_STRIPE_PUBLIC_KEY).toBe(stripeKey)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property: When throwOnError is true and validation fails, the thrown
     * error message should contain information about the problematic field.
     */
    it('should throw error with field information when throwOnError is true', async () => {
      await fc.assert(
        fc.asyncProperty(invalidUrlArbitrary, async (invalidUrl) => {
          const validator = new EnvironmentValidator()

          // Set invalid configuration
          setEnvVar('VITE_CONVEX_URL', invalidUrl)
          setEnvVar('VITE_SENTRY_DSN', undefined)
          setEnvVar('VITE_STRIPE_PUBLIC_KEY', undefined)

          // Should throw with field information
          let thrownError: Error | null = null
          try {
            validator.validate(true)
          } catch (e) {
            thrownError = e as Error
          }

          expect(thrownError).not.toBeNull()
          expect(thrownError!.message).toContain('VITE_CONVEX_URL')
          expect(thrownError!.message).toContain('Configuration Error')
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any validation failure, getValidationErrors() should
     * return a non-empty array with error details.
     */
    it('should store validation errors accessible via getValidationErrors()', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          const validator = new EnvironmentValidator()

          // Remove required field
          setEnvVar('VITE_CONVEX_URL', undefined)
          setEnvVar('VITE_SENTRY_DSN', undefined)
          setEnvVar('VITE_STRIPE_PUBLIC_KEY', undefined)

          validator.validate(false)

          const errors = validator.getValidationErrors()

          // Should have stored errors
          expect(errors).toBeDefined()
          expect(errors.length).toBeGreaterThan(0)

          // Each error should have field and message
          errors.forEach((error) => {
            expect(error.field).toBeTruthy()
            expect(error.message).toBeTruthy()
          })
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: For any successful validation, getValidationErrors() should
     * return an empty array.
     */
    it('should clear validation errors after successful validation', async () => {
      await fc.assert(
        fc.asyncProperty(validUrlArbitrary, async (validUrl) => {
          const validator = new EnvironmentValidator()

          // First, cause a validation failure
          setEnvVar('VITE_CONVEX_URL', undefined)
          validator.validate(false)
          expect(validator.getValidationErrors().length).toBeGreaterThan(0)

          // Then, validate with valid config
          setEnvVar('VITE_CONVEX_URL', validUrl)
          setEnvVar('VITE_SENTRY_DSN', undefined)
          setEnvVar('VITE_STRIPE_PUBLIC_KEY', undefined)
          validator.validate(false)

          // Errors should be cleared
          expect(validator.getValidationErrors()).toEqual([])
        }),
        { numRuns: 100 }
      )
    })

    /**
     * Property: Error messages should not expose sensitive configuration values
     * (values should be redacted).
     */
    it('should redact sensitive values in error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 30 }).map((s) => s.replace(/[^a-zA-Z0-9_]/g, 'x')),
          async (sensitiveKey) => {
            const validator = new EnvironmentValidator()

            // Set invalid Stripe key (doesn't start with pk_)
            setEnvVar('VITE_CONVEX_URL', 'https://valid.convex.cloud')
            setEnvVar('VITE_SENTRY_DSN', undefined)
            setEnvVar('VITE_STRIPE_PUBLIC_KEY', sensitiveKey)

            const result = validator.validate(false)

            // If validation failed due to Stripe key
            if (!result.success && result.errors) {
              const stripeError = result.errors.find((e) => e.field === 'VITE_STRIPE_PUBLIC_KEY')
              if (stripeError && stripeError.received) {
                // The actual value should be redacted
                expect(stripeError.received).toBe('[REDACTED]')
                expect(stripeError.received).not.toBe(sensitiveKey)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
