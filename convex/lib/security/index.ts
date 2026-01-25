/**
 * Security Infrastructure
 *
 * Central export point for all security-related modules
 */

// Configuration
export * from './config'

// Types - explicitly export to avoid conflicts
export type {
  CSRFToken as CSRFTokenType,
  CSRFConfig,
  RateLimitResult,
  RateLimitConfig,
  RateLimitEntry,
  SanitizerConfig,
  ValidationResult,
  ValidationError,
  EncryptionConfig as EncryptionConfigType,
  EncryptedData as EncryptedDataType,
  SessionData,
  SecurityContext,
  ValidationSchema,
  SanitizationOptions,
  SecurityEvent,
  PasswordValidationResult,
  LockoutStatus,
  SecurityAuditEntry,
} from './types'

// CSRF utilities
export {
  generateCSRFToken,
  validateCSRFToken,
  rotateCSRFToken,
  cleanupExpiredTokens,
  requireValidCSRFToken,
  withCSRFProtection,
  CSRF_CONFIG,
} from './csrf'

// Sanitizer utilities
export { InputSanitizer, sanitizer, sanitizeHTML, sanitizeText, validateInput } from './sanitizer'

// Rate limiter utilities
export {
  RateLimiter,
  DEFAULT_RATE_LIMITS,
  generateRateLimitKey,
  withRateLimit,
} from './rateLimiter'

// Encryption utilities
export { EncryptionService, encryptionService, encryptAPIKey, decryptAPIKey } from './encryption'

export * from './requestSizeValidator'

// Organization permission utilities
export {
  // Types
  type OrganizationRole,
  type PermissionCheckResult,
  type BillingPermissionResult,
  // Constants
  ROLE_HIERARCHY,
  BILLING_ROLES,
  EVENT_MANAGEMENT_ROLES,
  MEMBER_MANAGEMENT_ROLES,
  // Permission checkers
  hasMinimumRole,
  isRoleAllowed,
  getOrganizationMembership,
  checkBillingPermission,
  checkEventManagementPermission,
  checkMemberManagementPermission,
  canInviteToRole,
  canChangeRole,
  // Safe error messages
  getGenericPermissionError,
  getSafeBillingError,
} from './permissions'
