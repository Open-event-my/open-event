/**
 * Input Sanitizer Service
 *
 * Provides HTML sanitization and input validation to prevent XSS attacks
 * and ensure data integrity.
 *
 * SECURITY NOTE: This implementation uses HTML entity encoding as the primary
 * defense against XSS attacks. Regex-based HTML filtering is fundamentally
 * insecure and should not be used for security-critical sanitization.
 *
 * Requirements: 1.3, 1.8
 */

import { SANITIZER_CONFIG, VALIDATION_PATTERNS } from './config'
import type {
  SanitizerConfig,
  SanitizationOptions,
  ValidationResult,
  ValidationError,
  ValidationSchema,
} from './types'

/**
 * HTML entity map for escaping dangerous characters
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML entities - the ONLY secure way to handle untrusted HTML
 * This converts all potentially dangerous characters to their HTML entity equivalents
 */
function escapeHtmlEntities(text: string): string {
  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] || char)
}

/**
 * InputSanitizer class
 *
 * Handles sanitization of user-generated content to prevent XSS attacks
 * and validates input according to defined schemas.
 */
export class InputSanitizer {
  private config: SanitizerConfig

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = {
      allowedTags: config.allowedTags || [...SANITIZER_CONFIG.allowedTags],
      allowedAttributes:
        config.allowedAttributes ||
        Object.fromEntries(
          Object.entries(SANITIZER_CONFIG.allowedAttributes).map(([k, v]) => [k, [...v]])
        ),
      maxLength: config.maxLength || SANITIZER_CONFIG.maxLength,
    }
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   *
   * SECURITY: This method escapes ALL HTML by default. The allowedTags option
   * only works when combined with a proper HTML parser on the client side.
   * For server-side sanitization, all HTML is escaped to prevent XSS.
   *
   * @param input - Raw HTML string from user
   * @param options - Optional sanitization options
   * @returns Sanitized string with HTML entities escaped
   */
  sanitizeHTML(input: string, options: SanitizationOptions = {}): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    const maxLength = options.maxLength || this.config.maxLength

    // Truncate if too long
    let sanitized = input.slice(0, maxLength)

    // SECURITY: Always escape HTML entities - this is the only secure approach
    // Regex-based filtering is fundamentally insecure and can be bypassed
    sanitized = escapeHtmlEntities(sanitized)

    return sanitized.trim()
  }

  /**
   * Sanitize plain text input
   *
   * Removes control characters and normalizes whitespace
   *
   * @param input - Raw text string from user
   * @param maxLength - Maximum allowed length
   * @returns Sanitized text string
   */
  sanitizeText(input: string, maxLength?: number): string {
    if (!input || typeof input !== 'string') {
      return ''
    }

    const limit = maxLength || this.config.maxLength

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '')

    // Remove other control characters except newlines and tabs
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

    // Normalize whitespace (collapse multiple spaces, but preserve newlines)
    sanitized = sanitized.replace(/[^\S\n]+/g, ' ')

    // Truncate if too long
    sanitized = sanitized.slice(0, limit)

    return sanitized.trim()
  }

  /**
   * Validate input against a schema
   *
   * @param input - Input data to validate
   * @param schema - Validation schema
   * @returns Validation result with errors if any
   */
  validateInput(input: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = input[field]

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: rules.message || `${field} is required`,
          code: 'REQUIRED',
        })
        continue
      }

      // Skip validation if field is not required and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue
      }

      // Type validation
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({
              field,
              message: rules.message || `${field} must be a string`,
              code: 'INVALID_TYPE',
            })
            break
          }

          // String length validation
          if (rules.minLength && value.length < rules.minLength) {
            errors.push({
              field,
              message: rules.message || `${field} must be at least ${rules.minLength} characters`,
              code: 'MIN_LENGTH',
            })
          }

          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({
              field,
              message: rules.message || `${field} must be at most ${rules.maxLength} characters`,
              code: 'MAX_LENGTH',
            })
          }

          // Pattern validation
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} has invalid format`,
              code: 'INVALID_FORMAT',
            })
          }
          break

        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a number`,
              code: 'INVALID_TYPE',
            })
            break
          }

          // Number range validation
          if (rules.min !== undefined && value < rules.min) {
            errors.push({
              field,
              message: rules.message || `${field} must be at least ${rules.min}`,
              code: 'MIN_VALUE',
            })
          }

          if (rules.max !== undefined && value > rules.max) {
            errors.push({
              field,
              message: rules.message || `${field} must be at most ${rules.max}`,
              code: 'MAX_VALUE',
            })
          }
          break

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              field,
              message: rules.message || `${field} must be a boolean`,
              code: 'INVALID_TYPE',
            })
          }
          break

        case 'email':
          if (typeof value !== 'string' || !VALIDATION_PATTERNS.email.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a valid email address`,
              code: 'INVALID_EMAIL',
            })
          }
          break

        case 'url':
          if (typeof value !== 'string' || !VALIDATION_PATTERNS.url.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a valid URL`,
              code: 'INVALID_URL',
            })
          }
          break

        case 'phone':
          if (typeof value !== 'string' || !VALIDATION_PATTERNS.phone.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a valid phone number`,
              code: 'INVALID_PHONE',
            })
          }
          break
      }

      // Custom validation
      if (rules.custom && typeof value !== 'undefined') {
        try {
          if (!rules.custom(value)) {
            errors.push({
              field,
              message: rules.message || `${field} failed custom validation`,
              code: 'CUSTOM_VALIDATION',
            })
          }
        } catch {
          errors.push({
            field,
            message: rules.message || `${field} validation error`,
            code: 'VALIDATION_ERROR',
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

/**
 * Default sanitizer instance
 */
export const sanitizer = new InputSanitizer()

/**
 * Convenience functions using default sanitizer
 */
export const sanitizeHTML = (input: string, options?: SanitizationOptions): string => {
  return sanitizer.sanitizeHTML(input, options)
}

export const sanitizeText = (input: string, maxLength?: number): string => {
  return sanitizer.sanitizeText(input, maxLength)
}

export const validateInput = (
  input: Record<string, unknown>,
  schema: ValidationSchema
): ValidationResult => {
  return sanitizer.validateInput(input, schema)
}
