/**
 * Configuration Module
 *
 * Exports environment validation and configuration utilities
 */

export {
  EnvironmentValidator,
  envValidator,
  initializeEnvironment,
  getEnvVar,
  clientEnvSchema,
  type ClientEnv,
  type Environment,
  type ValidationResult,
  type ValidationError,
  type ConfigHealthStatus,
  type ConfigCheck,
} from './envValidator'

export {
  getEnvironmentConfig,
  isFeatureEnabled,
  getConfigSection,
  type EnvironmentConfig,
} from './environmentConfig'

export {
  checkFrontendHealth,
  checkBackendHealth,
  checkCombinedHealth,
  formatHealthStatus,
  type BackendHealthResponse,
  type CombinedHealthStatus,
} from './healthCheck'
