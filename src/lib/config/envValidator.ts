/**
 * Environment Variable Validator
 *
 * Validates all required environment variables on application startup.
 * Uses Zod for schema validation with clear error messages.
 *
 * @module envValidator
 */

import { z } from 'zod'

/**
 * Environment types supported by the application
 */
export type Environment = 'development' | 'staging' | 'production' | 'test'

/**
 * Schema for client-side (VITE_) environment variables
 * These are exposed to the browser and must be prefixed with VITE_
 */
export const clientEnvSchema = z.object({
  // Required: Convex deployment URL
  VITE_CONVEX_URL: z
    .string()
    .url('VITE_CONVEX_URL must be a valid URL (e.g., https://your-project.convex.cloud)'),

  // Optional: Sentry DSN for error tracking
  VITE_SENTRY_DSN: z
    .string()
    .url('VITE_SENTRY_DSN must be a valid URL')
    .optional(),

  // Optional: Stripe public key for payments
  VITE_STRIPE_PUBLIC_KEY: z
    .string()
    .startsWith('pk_', 'VITE_STRIPE_PUBLIC_KEY must start with "pk_"')
    .optional(),
})

/**
 * Inferred type for client environment variables
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>

/**
 * Validation result containing either success data or error details
 */
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
}

/**
 * Individual validation error with field and message
 */
export interface ValidationError {
  field: string
  message: string
  received?: string
}

/**
 * Configuration health status
 */
export interface ConfigHealthStatus {
  healthy: boolean
  environment: Environment
  timestamp: number
  checks: ConfigCheck[]
}

/**
 * Individual configuration check result
 */
export interface ConfigCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  required: boolean
}

/**
 * Environment Validator class for validating and managing environment configuration
 */
export class EnvironmentValidator {
  private validated = false
  private cachedConfig: ClientEnv | null = null
  private validationErrors: ValidationError[] = []

  /**
   * Get the current environment mode
   */
  getEnvironment(): Environment {
    const mode = import.meta.env.MODE
    if (mode === 'development' || mode === 'staging' || mode === 'production' || mode === 'test') {
      return mode
    }
    return 'development'
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.getEnvironment() === 'production'
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === 'development'
  }

  /**
   * Validate all environment variables
   * @throws Error if validation fails and throwOnError is true
   */
  validate(throwOnError = true): ValidationResult<ClientEnv> {
    const envVars = {
      VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
    }

    const result = clientEnvSchema.safeParse(envVars)

    if (result.success) {
      this.validated = true
      this.cachedConfig = result.data
      this.validationErrors = []
      return { success: true, data: result.data }
    }

    // Parse Zod errors into our format
    const zodErrors = result.error.issues
    const errors: ValidationError[] = zodErrors.map((err) => ({
      field: err.path.join('.') || 'unknown',
      message: err.message,
      received: typeof envVars[err.path[0] as keyof typeof envVars] === 'string'
        ? '[REDACTED]'
        : String(envVars[err.path[0] as keyof typeof envVars]),
    }))

    this.validationErrors = errors

    if (throwOnError) {
      const errorMessage = this.formatValidationErrors(errors)
      throw new Error(errorMessage)
    }

    return { success: false, errors }
  }

  /**
   * Format validation errors into a readable message
   */
  private formatValidationErrors(errors: ValidationError[]): string {
    const header = '❌ Environment Configuration Error\n'
    const separator = '─'.repeat(50) + '\n'
    const errorLines = errors.map(
      (err) => `  • ${err.field}: ${err.message}`
    ).join('\n')
    const footer = '\n' + separator + 'Please check your .env file and ensure all required variables are set.'

    return header + separator + errorLines + footer
  }

  /**
   * Get validated configuration
   * @throws Error if validate() hasn't been called or validation failed
   */
  getConfig(): ClientEnv {
    if (!this.validated || !this.cachedConfig) {
      throw new Error(
        'Environment not validated. Call validate() first before accessing configuration.'
      )
    }
    return this.cachedConfig
  }

  /**
   * Get validation errors from the last validation attempt
   */
  getValidationErrors(): ValidationError[] {
    return [...this.validationErrors]
  }

  /**
   * Check if environment has been validated successfully
   */
  isValidated(): boolean {
    return this.validated
  }

  /**
   * Perform a health check on the configuration
   */
  healthCheck(): ConfigHealthStatus {
    const checks: ConfigCheck[] = []
    const env = this.getEnvironment()

    // Check required variables
    checks.push({
      name: 'VITE_CONVEX_URL',
      status: import.meta.env.VITE_CONVEX_URL ? 'pass' : 'fail',
      message: import.meta.env.VITE_CONVEX_URL
        ? 'Convex URL configured'
        : 'Missing Convex URL - application will not function',
      required: true,
    })

    // Check optional but recommended variables
    checks.push({
      name: 'VITE_SENTRY_DSN',
      status: import.meta.env.VITE_SENTRY_DSN ? 'pass' : 'warn',
      message: import.meta.env.VITE_SENTRY_DSN
        ? 'Sentry error tracking configured'
        : 'Sentry not configured - errors will not be tracked',
      required: false,
    })

    checks.push({
      name: 'VITE_STRIPE_PUBLIC_KEY',
      status: import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 'pass' : 'warn',
      message: import.meta.env.VITE_STRIPE_PUBLIC_KEY
        ? 'Stripe payments configured'
        : 'Stripe not configured - payments will not work',
      required: false,
    })

    // Production-specific checks
    if (env === 'production') {
      if (!import.meta.env.VITE_SENTRY_DSN) {
        const sentryCheck = checks.find((c) => c.name === 'VITE_SENTRY_DSN')
        if (sentryCheck) {
          sentryCheck.status = 'fail'
          sentryCheck.message = 'Sentry is required in production for error tracking'
          sentryCheck.required = true
        }
      }
    }

    const healthy = checks.every(
      (check) => check.status === 'pass' || (!check.required && check.status === 'warn')
    )

    return {
      healthy,
      environment: env,
      timestamp: Date.now(),
      checks,
    }
  }

  /**
   * Reset the validator state (useful for testing)
   */
  reset(): void {
    this.validated = false
    this.cachedConfig = null
    this.validationErrors = []
  }
}

// Singleton instance for application-wide use
export const envValidator = new EnvironmentValidator()

/**
 * Initialize and validate environment on application startup
 * Call this early in your application bootstrap
 */
export function initializeEnvironment(): ClientEnv {
  const result = envValidator.validate(false)

  if (!result.success) {
    // Log errors to console for debugging
    console.error('Environment validation failed:')
    result.errors?.forEach((err) => {
      console.error(`  - ${err.field}: ${err.message}`)
    })

    // In development, show a warning but continue
    if (envValidator.isDevelopment()) {
      console.warn('⚠️ Running with invalid environment configuration in development mode')
      return {} as ClientEnv
    }

    // In production, fail fast
    throw new Error(
      `Environment validation failed: ${result.errors?.map((e) => e.message).join(', ')}`
    )
  }

  return result.data!
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVar<K extends keyof ClientEnv>(key: K): ClientEnv[K] | undefined {
  if (envValidator.isValidated()) {
    return envValidator.getConfig()[key]
  }
  return import.meta.env[key] as ClientEnv[K] | undefined
}
