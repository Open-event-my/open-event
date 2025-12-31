/**
 * Security Utilities
 * 
 * Common utility functions for security operations
 */

import { VALIDATION_PATTERNS } from './config';

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the string in bytes
 * @returns Hex-encoded random string
 */
export function generateSecureToken(length: number = 32): string {
  // In Convex, we'll use crypto.randomBytes equivalent
  // For now, using a simple implementation that works in both environments
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random ID
 * @returns Random ID string
 */
export function generateSecureId(): string {
  return generateSecureToken(16);
}

/**
 * Hash a string using SHA-256
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export async function hashString(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  return VALIDATION_PATTERNS.email.test(email);
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid URL format
 */
export function isValidUrl(url: string): boolean {
  return VALIDATION_PATTERNS.url.test(url);
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns True if valid phone format
 */
export function isValidPhone(phone: string): boolean {
  return VALIDATION_PATTERNS.phone.test(phone);
}

/**
 * Sanitize a string for safe display (basic escaping)
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, char => htmlEscapes[char] || char);
}

/**
 * Check if a string contains potentially dangerous patterns
 * @param str - String to check
 * @returns True if string contains dangerous patterns
 */
export function containsDangerousPatterns(str: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Truncate a string to a maximum length
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate a rate limit key from user ID and/or IP address
 * @param userId - User ID (optional)
 * @param ipAddress - IP address (optional)
 * @param prefix - Key prefix
 * @returns Rate limit key
 */
export function generateRateLimitKey(
  userId: string | undefined,
  ipAddress: string | undefined,
  prefix: string = 'rate_limit'
): string {
  const parts = [prefix];
  
  if (userId) {
    parts.push(`user:${userId}`);
  }
  
  if (ipAddress) {
    parts.push(`ip:${ipAddress}`);
  }
  
  return parts.join(':');
}

/**
 * Check if a timestamp is expired
 * @param timestamp - Timestamp to check (milliseconds)
 * @param expirationMs - Expiration time in milliseconds
 * @returns True if expired
 */
export function isExpired(timestamp: number, expirationMs: number): boolean {
  return Date.now() > timestamp + expirationMs;
}

/**
 * Get the current timestamp in milliseconds
 * @returns Current timestamp
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Sleep for a specified duration (for rate limiting, backoff, etc.)
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Redact sensitive information from a string
 * @param str - String to redact
 * @param patterns - Patterns to redact (default: common sensitive patterns)
 * @returns Redacted string
 */
export function redactSensitiveInfo(
  str: string,
  patterns: RegExp[] = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
    /\b[A-Za-z0-9]{20,}\b/g, // API keys/tokens
  ]
): string {
  let redacted = str;
  
  patterns.forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });
  
  return redacted;
}

/**
 * Extract IP address from request headers
 * @param headers - Request headers
 * @returns IP address or undefined
 */
export function extractIpAddress(headers: Record<string, string | undefined>): string | undefined {
  // Check common headers for IP address
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
  ];
  
  for (const header of ipHeaders) {
    const value = headers[header];
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return value.split(',')[0].trim();
    }
  }
  
  return undefined;
}

/**
 * Validate that a value is within a numeric range
 * @param value - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns True if within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Normalize a string for comparison (lowercase, trim, remove extra spaces)
 * @param str - String to normalize
 * @returns Normalized string
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}
