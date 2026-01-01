/**
 * Security Configuration Constants
 *
 * This file contains all security-related configuration constants
 * for the production readiness security infrastructure.
 */

/**
 * CSRF Protection Configuration
 */
export const CSRF_CONFIG = {
  // Length of CSRF token in bytes (32 bytes = 256 bits)
  tokenLength: 32,

  // Cookie name for CSRF token
  cookieName: 'csrf_token',

  // Header name for CSRF token
  headerName: 'X-CSRF-Token',

  // Token expiration time in milliseconds (1 hour)
  tokenExpirationMs: 60 * 60 * 1000,
} as const

/**
 * Input Sanitization Configuration
 */
export const SANITIZER_CONFIG = {
  // Allowed HTML tags for user-generated content
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    'a',
    'ul',
    'ol',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'code',
    'pre',
  ],

  // Allowed attributes per tag
  allowedAttributes: {
    a: ['href', 'title', 'target'],
    img: ['src', 'alt', 'title'],
  },

  // Maximum length for text inputs
  maxLength: 10000,

  // Maximum length for long text (descriptions, etc.)
  maxLongTextLength: 50000,
} as const

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Default rate limit window in milliseconds (1 minute)
  defaultWindowMs: 60 * 1000,

  // Default maximum requests per window
  defaultMaxRequests: 100,

  // Rate limits for specific endpoint types
  endpoints: {
    // Authentication endpoints (stricter limits)
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    },

    // Public API endpoints
    public: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60,
    },

    // Authenticated API endpoints
    authenticated: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },

    // AI agent endpoints (higher limits for interactive use)
    ai: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
    },

    // Data export endpoints (very strict)
    export: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
    },
  },
} as const

/**
 * Request Size Limits Configuration
 */
export const REQUEST_SIZE_CONFIG = {
  // Maximum request body size in bytes (10MB)
  maxBodySize: 10 * 1024 * 1024,

  // Maximum file upload size in bytes (50MB)
  maxFileSize: 50 * 1024 * 1024,

  // Maximum JSON payload size in bytes (1MB)
  maxJsonSize: 1 * 1024 * 1024,
} as const

/**
 * Encryption Configuration
 */
export const ENCRYPTION_CONFIG = {
  // Encryption algorithm
  algorithm: 'aes-256-gcm' as const,

  // Key derivation function
  keyDerivation: 'pbkdf2' as const,

  // PBKDF2 iterations
  pbkdf2Iterations: 100000,

  // Salt length in bytes
  saltLength: 32,

  // IV (Initialization Vector) length in bytes
  ivLength: 16,

  // Auth tag length in bytes (for GCM mode)
  authTagLength: 16,
} as const

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  // Session timeout in milliseconds (15 minutes)
  timeoutMs: 15 * 60 * 1000,

  // Session cookie name
  cookieName: 'session_id',

  // Session cookie options
  cookieOptions: {
    httpOnly: true,
    secure: true, // Only send over HTTPS
    sameSite: 'strict' as const,
  },
} as const

/**
 * Security Headers Configuration
 */
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.convex.cloud https://api.openai.com https://api.stripe.com",
    "frame-ancestors 'none'",
  ].join('; '),

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

  // Strict Transport Security (HSTS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
} as const

/**
 * Password Policy Configuration
 */
export const PASSWORD_CONFIG = {
  // Minimum password length
  minLength: 8,

  // Maximum password length
  maxLength: 128,

  // Require uppercase letter
  requireUppercase: true,

  // Require lowercase letter
  requireLowercase: true,

  // Require number
  requireNumber: true,

  // Require special character
  requireSpecial: true,

  // Special characters allowed
  specialCharacters: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const

/**
 * Account Lockout Configuration
 */
export const LOCKOUT_CONFIG = {
  // Maximum failed login attempts before lockout
  maxAttempts: 5,

  // Lockout duration in milliseconds (30 minutes)
  lockoutDurationMs: 30 * 60 * 1000,

  // Time window for counting failed attempts (15 minutes)
  attemptWindowMs: 15 * 60 * 1000,
} as const

/**
 * Validation Patterns
 */
export const VALIDATION_PATTERNS = {
  // Email validation pattern
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // URL validation pattern
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,

  // Phone number validation pattern (international format)
  phone: /^\+?[1-9]\d{1,14}$/,

  // Alphanumeric with spaces
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,

  // Slug pattern (URL-safe)
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const

/**
 * Environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    isDevelopment,
    isProduction,

    // Disable certain security features in development
    csrfEnabled: isProduction,
    rateLimitEnabled: isProduction,
    secureHeadersEnabled: isProduction,

    // Logging level
    logLevel: isDevelopment ? 'debug' : 'info',
  }
}
