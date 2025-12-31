/**
 * Input Sanitizer Service
 * 
 * Provides HTML sanitization and input validation to prevent XSS attacks
 * and ensure data integrity.
 * 
 * Requirements: 1.3, 1.8
 */

import { SANITIZER_CONFIG, VALIDATION_PATTERNS } from './config';
import type { 
  SanitizerConfig, 
  SanitizationOptions, 
  ValidationResult, 
  ValidationError,
  ValidationSchema 
} from './types';

/**
 * InputSanitizer class
 * 
 * Handles sanitization of user-generated content to prevent XSS attacks
 * and validates input according to defined schemas.
 */
export class InputSanitizer {
  private config: SanitizerConfig;

  constructor(config: Partial<SanitizerConfig> = {}) {
    this.config = {
      allowedTags: config.allowedTags || [...SANITIZER_CONFIG.allowedTags],
      allowedAttributes: config.allowedAttributes || Object.fromEntries(
        Object.entries(SANITIZER_CONFIG.allowedAttributes).map(([k, v]) => [k, [...v]])
      ),
      maxLength: config.maxLength || SANITIZER_CONFIG.maxLength,
    };
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   * 
   * Removes or escapes potentially dangerous HTML elements and attributes
   * while preserving safe formatting.
   * 
   * @param input - Raw HTML string from user
   * @param options - Optional sanitization options
   * @returns Sanitized HTML string
   */
  sanitizeHTML(input: string, options: SanitizationOptions = {}): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const allowedTags = options.allowedTags || this.config.allowedTags;
    const allowedAttributes = options.allowedAttributes || this.config.allowedAttributes;
    const maxLength = options.maxLength || this.config.maxLength;

    // Truncate if too long
    let sanitized = input.slice(0, maxLength);

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: protocol (except for images if explicitly allowed)
    if (!allowedTags.includes('img')) {
      sanitized = sanitized.replace(/data:/gi, '');
    }

    // Remove vbscript: protocol
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Remove style tags and their content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove inline styles
    sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');

    // Remove iframe, object, embed tags
    sanitized = sanitized.replace(/<(iframe|object|embed|applet|meta|link|base)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
    sanitized = sanitized.replace(/<(iframe|object|embed|applet|meta|link|base)[^>]*>/gi, '');

    // Filter tags - remove tags not in allowedTags
    if (options.stripTags || allowedTags.length === 0) {
      // Strip all HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    } else {
      // Remove disallowed tags but keep their content
      sanitized = this.filterTags(sanitized, allowedTags, allowedAttributes);
    }

    // Escape any remaining HTML entities if escapeHtml option is set
    if (options.escapeHtml) {
      sanitized = this.escapeHTML(sanitized);
    }

    return sanitized.trim();
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
      return '';
    }

    const limit = maxLength || this.config.maxLength;

    // Remove null bytes and replace with space
    let sanitized = input.replace(/\0/g, ' ');

    // Remove other control characters except newlines and tabs, replace with space
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

    // Normalize whitespace (collapse multiple spaces)
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Truncate if too long
    sanitized = sanitized.slice(0, limit);

    return sanitized.trim();
  }

  /**
   * Validate input against a schema
   * 
   * @param input - Input data to validate
   * @param schema - Validation schema
   * @returns Validation result with errors if any
   */
  validateInput(input: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = input[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: rules.message || `${field} is required`,
          code: 'REQUIRED',
        });
        continue;
      }

      // Skip validation if field is not required and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({
              field,
              message: rules.message || `${field} must be a string`,
              code: 'INVALID_TYPE',
            });
            break;
          }

          // String length validation
          if (rules.minLength && value.length < rules.minLength) {
            errors.push({
              field,
              message: rules.message || `${field} must be at least ${rules.minLength} characters`,
              code: 'MIN_LENGTH',
            });
          }

          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({
              field,
              message: rules.message || `${field} must be at most ${rules.maxLength} characters`,
              code: 'MAX_LENGTH',
            });
          }

          // Pattern validation
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} has invalid format`,
              code: 'INVALID_FORMAT',
            });
          }
          break;

        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a number`,
              code: 'INVALID_TYPE',
            });
            break;
          }

          // Number range validation
          if (rules.min !== undefined && value < rules.min) {
            errors.push({
              field,
              message: rules.message || `${field} must be at least ${rules.min}`,
              code: 'MIN_VALUE',
            });
          }

          if (rules.max !== undefined && value > rules.max) {
            errors.push({
              field,
              message: rules.message || `${field} must be at most ${rules.max}`,
              code: 'MAX_VALUE',
            });
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              field,
              message: rules.message || `${field} must be a boolean`,
              code: 'INVALID_TYPE',
            });
          }
          break;

        case 'email':
          if (typeof value !== 'string' || !VALIDATION_PATTERNS.email.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a valid email address`,
              code: 'INVALID_EMAIL',
            });
          }
          break;

        case 'url':
          if (typeof value !== 'string' || !VALIDATION_PATTERNS.url.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a valid URL`,
              code: 'INVALID_URL',
            });
          }
          break;

        case 'phone':
          if (typeof value !== 'string' || !VALIDATION_PATTERNS.phone.test(value)) {
            errors.push({
              field,
              message: rules.message || `${field} must be a valid phone number`,
              code: 'INVALID_PHONE',
            });
          }
          break;
      }

      // Custom validation
      if (rules.custom && typeof value !== 'undefined') {
        try {
          if (!rules.custom(value)) {
            errors.push({
              field,
              message: rules.message || `${field} failed custom validation`,
              code: 'CUSTOM_VALIDATION',
            });
          }
        } catch (error) {
          errors.push({
            field,
            message: rules.message || `${field} validation error`,
            code: 'VALIDATION_ERROR',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Filter HTML tags and attributes
   * 
   * @param html - HTML string
   * @param allowedTags - List of allowed tag names
   * @param allowedAttributes - Map of tag names to allowed attributes
   * @returns Filtered HTML string
   */
  private filterTags(
    html: string,
    allowedTags: string[],
    allowedAttributes: Record<string, string[]>
  ): string {
    // Simple tag filtering using regex
    // This is a basic implementation - for production, consider using a proper HTML parser
    
    return html.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tagName, attributes) => {
      const tag = tagName.toLowerCase();
      
      // Check if tag is allowed
      if (!allowedTags.includes(tag)) {
        return ''; // Remove disallowed tags
      }

      // Filter attributes
      const allowedAttrs = allowedAttributes[tag] || [];
      if (allowedAttrs.length === 0 && attributes.trim()) {
        // No attributes allowed for this tag
        return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
      }

      // Parse and filter attributes
      const filteredAttrs = this.filterAttributes(attributes, allowedAttrs);
      
      if (match.startsWith('</')) {
        return `</${tag}>`;
      }
      
      return filteredAttrs ? `<${tag} ${filteredAttrs}>` : `<${tag}>`;
    });
  }

  /**
   * Filter HTML attributes
   * 
   * @param attributes - Attribute string from HTML tag
   * @param allowedAttributes - List of allowed attribute names
   * @returns Filtered attribute string
   */
  private filterAttributes(attributes: string, allowedAttributes: string[]): string {
    if (!attributes || allowedAttributes.length === 0) {
      return '';
    }

    // Parse attributes (simple regex-based approach)
    const attrRegex = /([a-z][a-z0-9-]*)\s*=\s*["']([^"']*)["']/gi;
    const filtered: string[] = [];
    let match;

    while ((match = attrRegex.exec(attributes)) !== null) {
      const [, attrName, attrValue] = match;
      
      if (allowedAttributes.includes(attrName.toLowerCase())) {
        // Additional validation for href attributes
        if (attrName.toLowerCase() === 'href') {
          // Only allow http, https, and mailto protocols
          if (/^(https?:\/\/|mailto:)/i.test(attrValue)) {
            filtered.push(`${attrName}="${this.escapeAttribute(attrValue)}"`);
          }
        } else {
          filtered.push(`${attrName}="${this.escapeAttribute(attrValue)}"`);
        }
      }
    }

    return filtered.join(' ');
  }

  /**
   * Escape HTML entities
   * 
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHTML(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char);
  }

  /**
   * Escape HTML attribute value
   * 
   * @param value - Attribute value to escape
   * @returns Escaped attribute value
   */
  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

/**
 * Default sanitizer instance
 */
export const sanitizer = new InputSanitizer();

/**
 * Convenience functions using default sanitizer
 */
export const sanitizeHTML = (input: string, options?: SanitizationOptions): string => {
  return sanitizer.sanitizeHTML(input, options);
};

export const sanitizeText = (input: string, maxLength?: number): string => {
  return sanitizer.sanitizeText(input, maxLength);
};

export const validateInput = (input: Record<string, unknown>, schema: ValidationSchema): ValidationResult => {
  return sanitizer.validateInput(input, schema);
};
