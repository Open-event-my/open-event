/**
 * Security Types
 *
 * TypeScript type definitions for security infrastructure
 */

/**
 * CSRF Token
 */
export interface CSRFToken {
  token: string
  userId: string
  expiresAt: number
  createdAt: number
}

/**
 * CSRF Configuration
 */
export interface CSRFConfig {
  tokenLength: number
  cookieName: string
  headerName: string
  tokenExpirationMs: number
}

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (userId?: string, ip?: string) => string
}

/**
 * Rate Limit Entry (stored in database)
 */
export interface RateLimitEntry {
  key: string
  count: number
  windowStart: number
  windowEnd: number
}

/**
 * Sanitizer Configuration
 */
export interface SanitizerConfig {
  allowedTags: string[]
  allowedAttributes: Record<string, string[]>
  maxLength: number
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Encryption Configuration
 */
export interface EncryptionConfig {
  algorithm: string
  keyDerivation: string
  pbkdf2Iterations: number
  saltLength: number
  ivLength: number
  authTagLength: number
}

/**
 * Encrypted Data
 */
export interface EncryptedData {
  ciphertext: string
  iv: string
  salt: string
  authTag: string
}

/**
 * Session Data
 */
export interface SessionData {
  userId: string
  lastActivity: number
  createdAt: number
  ipAddress?: string
  userAgent?: string
}

/**
 * Security Context
 */
export interface SecurityContext {
  userId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  csrfToken?: string
}

/**
 * Input Validation Schema
 */
export interface ValidationSchema {
  [field: string]: {
    type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'phone'
    required?: boolean
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    pattern?: RegExp
    custom?: (value: unknown) => boolean
    message?: string
  }
}

/**
 * Sanitization Options
 */
export interface SanitizationOptions {
  allowedTags?: string[]
  allowedAttributes?: Record<string, string[]>
  stripTags?: boolean
  escapeHtml?: boolean
  maxLength?: number
}

/**
 * Security Event
 */
export interface SecurityEvent {
  type:
    | 'csrf_violation'
    | 'rate_limit_exceeded'
    | 'invalid_input'
    | 'auth_failure'
    | 'suspicious_activity'
  userId?: string
  ipAddress?: string
  userAgent?: string
  timestamp: number
  details: Record<string, unknown>
}

/**
 * Password Validation Result
 */
export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

/**
 * Account Lockout Status
 */
export interface LockoutStatus {
  locked: boolean
  attempts: number
  lockedUntil?: number
  remainingAttempts: number
}

/**
 * Security Audit Entry
 */
export interface SecurityAuditEntry {
  eventType: string
  userId?: string
  ipAddress?: string
  userAgent?: string
  timestamp: number
  success: boolean
  details: Record<string, unknown>
}
