/**
 * Environment-Specific Configuration
 *
 * Provides different configuration values based on the current environment.
 * Supports development, staging, production, and test environments.
 *
 * @module environmentConfig
 */

import type { Environment } from './envValidator'

/**
 * Environment-specific configuration settings
 */
export interface EnvironmentConfig {
  /** Current environment name */
  environment: Environment

  /** API and service configuration */
  api: {
    /** Request timeout in milliseconds */
    timeout: number
    /** Number of retry attempts for failed requests */
    retryAttempts: number
    /** Base delay for exponential backoff (ms) */
    retryBaseDelay: number
  }

  /** Logging configuration */
  logging: {
    /** Minimum log level to output */
    level: 'debug' | 'info' | 'warn' | 'error'
    /** Whether to include timestamps in logs */
    timestamps: boolean
    /** Whether to log to console */
    console: boolean
  }

  /** Feature flags */
  features: {
    /** Enable debug mode features */
    debugMode: boolean
    /** Enable performance monitoring */
    performanceMonitoring: boolean
    /** Enable error tracking (Sentry) */
    errorTracking: boolean
    /** Enable analytics */
    analytics: boolean
  }

  /** Cache configuration */
  cache: {
    /** Default TTL for cached items (ms) */
    defaultTTL: number
    /** Maximum cache size (items) */
    maxSize: number
  }

  /** Session configuration */
  session: {
    /** Session timeout in milliseconds */
    timeout: number
    /** Warning before timeout (ms) */
    warningBefore: number
  }

  /** Rate limiting configuration */
  rateLimit: {
    /** Maximum requests per window */
    maxRequests: number
    /** Window size in milliseconds */
    windowMs: number
  }
}

/**
 * Development environment configuration
 */
const developmentConfig: EnvironmentConfig = {
  environment: 'development',
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryBaseDelay: 1000,
  },
  logging: {
    level: 'debug',
    timestamps: true,
    console: true,
  },
  features: {
    debugMode: true,
    performanceMonitoring: false,
    errorTracking: false,
    analytics: false,
  },
  cache: {
    defaultTTL: 60000, // 1 minute
    maxSize: 100,
  },
  session: {
    timeout: 3600000, // 1 hour (longer for dev)
    warningBefore: 300000, // 5 minutes
  },
  rateLimit: {
    maxRequests: 1000, // Higher limit for dev
    windowMs: 60000,
  },
}

/**
 * Staging environment configuration
 */
const stagingConfig: EnvironmentConfig = {
  environment: 'staging',
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryBaseDelay: 1000,
  },
  logging: {
    level: 'info',
    timestamps: true,
    console: true,
  },
  features: {
    debugMode: true,
    performanceMonitoring: true,
    errorTracking: true,
    analytics: true,
  },
  cache: {
    defaultTTL: 300000, // 5 minutes
    maxSize: 500,
  },
  session: {
    timeout: 1800000, // 30 minutes
    warningBefore: 300000,
  },
  rateLimit: {
    maxRequests: 200,
    windowMs: 60000,
  },
}

/**
 * Production environment configuration
 */
const productionConfig: EnvironmentConfig = {
  environment: 'production',
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryBaseDelay: 1000,
  },
  logging: {
    level: 'warn',
    timestamps: true,
    console: false, // Use structured logging in production
  },
  features: {
    debugMode: false,
    performanceMonitoring: true,
    errorTracking: true,
    analytics: true,
  },
  cache: {
    defaultTTL: 600000, // 10 minutes
    maxSize: 1000,
  },
  session: {
    timeout: 900000, // 15 minutes (security requirement)
    warningBefore: 120000, // 2 minutes
  },
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000,
  },
}

/**
 * Test environment configuration
 */
const testConfig: EnvironmentConfig = {
  environment: 'test',
  api: {
    timeout: 5000, // Shorter for tests
    retryAttempts: 1,
    retryBaseDelay: 100,
  },
  logging: {
    level: 'error', // Only errors in tests
    timestamps: false,
    console: false,
  },
  features: {
    debugMode: false,
    performanceMonitoring: false,
    errorTracking: false,
    analytics: false,
  },
  cache: {
    defaultTTL: 1000, // Very short for tests
    maxSize: 10,
  },
  session: {
    timeout: 60000, // 1 minute for tests
    warningBefore: 10000,
  },
  rateLimit: {
    maxRequests: 10000, // High limit for tests
    windowMs: 1000,
  },
}

/**
 * Map of environment names to their configurations
 */
const configMap: Record<Environment, EnvironmentConfig> = {
  development: developmentConfig,
  staging: stagingConfig,
  production: productionConfig,
  test: testConfig,
}

/**
 * Get the configuration for the current or specified environment
 *
 * @param env - Optional environment override
 * @returns Environment-specific configuration
 */
export function getEnvironmentConfig(env?: Environment): EnvironmentConfig {
  const currentEnv = env || getCurrentEnvironment()
  return configMap[currentEnv] || developmentConfig
}

/**
 * Get the current environment from Vite's mode
 */
function getCurrentEnvironment(): Environment {
  const mode = import.meta.env.MODE
  if (mode === 'development' || mode === 'staging' || mode === 'production' || mode === 'test') {
    return mode
  }
  return 'development'
}

/**
 * Check if a feature is enabled in the current environment
 *
 * @param feature - Feature name to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
  const config = getEnvironmentConfig()
  return config.features[feature]
}

/**
 * Get a specific configuration section
 *
 * @param section - Configuration section name
 * @returns The configuration section
 */
export function getConfigSection<K extends keyof EnvironmentConfig>(
  section: K
): EnvironmentConfig[K] {
  const config = getEnvironmentConfig()
  return config[section]
}
