/**
 * Security Utilities Tests
 *
 * Unit tests for common security utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  generateSecureToken,
  generateSecureId,
  constantTimeCompare,
  isValidEmail,
  isValidUrl,
  isValidPhone,
  escapeHtml,
  containsDangerousPatterns,
  truncateString,
  generateRateLimitKey,
  isExpired,
  calculateBackoffDelay,
  redactSensitiveInfo,
  isInRange,
  normalizeString,
} from './utils'

describe('Security Utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate a token of the specified length', () => {
      const token = generateSecureToken(32)
      expect(token).toHaveLength(64) // 32 bytes = 64 hex characters
    })

    it('should generate different tokens on each call', () => {
      const token1 = generateSecureToken(16)
      const token2 = generateSecureToken(16)
      expect(token1).not.toBe(token2)
    })
  })

  describe('generateSecureId', () => {
    it('should generate a secure ID', () => {
      const id = generateSecureId()
      expect(id).toHaveLength(32) // 16 bytes = 32 hex characters
    })
  })

  describe('constantTimeCompare', () => {
    it('should return true for equal strings', () => {
      expect(constantTimeCompare('hello', 'hello')).toBe(true)
    })

    it('should return false for different strings', () => {
      expect(constantTimeCompare('hello', 'world')).toBe(false)
    })

    it('should return false for strings of different lengths', () => {
      expect(constantTimeCompare('hello', 'hello world')).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
    })
  })

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://www.example.com/path')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
      expect(isValidPhone('+1234567890')).toBe(true)
      expect(isValidPhone('+447911123456')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('not a phone')).toBe(false)
      expect(isValidPhone('')).toBe(false)
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      )
      expect(escapeHtml('Hello & goodbye')).toBe('Hello &amp; goodbye')
    })
  })

  describe('containsDangerousPatterns', () => {
    it('should detect dangerous patterns', () => {
      expect(containsDangerousPatterns('<script>alert(1)</script>')).toBe(true)
      expect(containsDangerousPatterns('javascript:alert(1)')).toBe(true)
      expect(containsDangerousPatterns('<img onerror="alert(1)">')).toBe(true)
      expect(containsDangerousPatterns('<iframe src="evil.com"></iframe>')).toBe(true)
    })

    it('should not flag safe content', () => {
      expect(containsDangerousPatterns('Hello world')).toBe(false)
      expect(containsDangerousPatterns('<p>Safe paragraph</p>')).toBe(false)
    })
  })

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('Hello world', 8)).toBe('Hello...')
      expect(truncateString('Hello world', 8, '…')).toBe('Hello w…')
    })

    it('should not truncate short strings', () => {
      expect(truncateString('Hello', 10)).toBe('Hello')
    })
  })

  describe('generateRateLimitKey', () => {
    it('should generate key with user ID', () => {
      expect(generateRateLimitKey('user123', undefined)).toBe('rate_limit:user:user123')
    })

    it('should generate key with IP address', () => {
      expect(generateRateLimitKey(undefined, '192.168.1.1')).toBe('rate_limit:ip:192.168.1.1')
    })

    it('should generate key with both user ID and IP', () => {
      expect(generateRateLimitKey('user123', '192.168.1.1')).toBe(
        'rate_limit:user:user123:ip:192.168.1.1'
      )
    })

    it('should use custom prefix', () => {
      expect(generateRateLimitKey('user123', undefined, 'api')).toBe('api:user:user123')
    })
  })

  describe('isExpired', () => {
    it('should detect expired timestamps', () => {
      const pastTimestamp = Date.now() - 10000 // 10 seconds ago
      expect(isExpired(pastTimestamp, 5000)).toBe(true) // 5 second expiration
    })

    it('should detect non-expired timestamps', () => {
      const recentTimestamp = Date.now() - 1000 // 1 second ago
      expect(isExpired(recentTimestamp, 5000)).toBe(false) // 5 second expiration
    })
  })

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateBackoffDelay(0, 1000)).toBeGreaterThanOrEqual(750)
      expect(calculateBackoffDelay(0, 1000)).toBeLessThanOrEqual(1250)

      expect(calculateBackoffDelay(1, 1000)).toBeGreaterThanOrEqual(1500)
      expect(calculateBackoffDelay(1, 1000)).toBeLessThanOrEqual(2500)
    })

    it('should respect maximum delay', () => {
      const delay = calculateBackoffDelay(10, 1000, 5000)
      expect(delay).toBeLessThanOrEqual(6250) // max + 25% jitter
    })
  })

  describe('redactSensitiveInfo', () => {
    it('should redact email addresses', () => {
      expect(redactSensitiveInfo('Contact: user@example.com')).toBe('Contact: [REDACTED]')
    })

    it('should redact phone numbers', () => {
      expect(redactSensitiveInfo('Call: 555-123-4567')).toBe('Call: [REDACTED]')
    })

    it('should redact credit card numbers', () => {
      expect(redactSensitiveInfo('Card: 4532-1234-5678-9010')).toBe('Card: [REDACTED]')
    })

    it('should redact long alphanumeric strings (potential API keys)', () => {
      // The pattern matches 20+ character alphanumeric strings
      const text = 'Key: abcdefghijklmnopqrstuvwxyz123456789012345'
      const redacted = redactSensitiveInfo(text)
      expect(redacted).toBe('Key: [REDACTED]')
    })
  })

  describe('isInRange', () => {
    it('should check if value is in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true)
      expect(isInRange(1, 1, 10)).toBe(true)
      expect(isInRange(10, 1, 10)).toBe(true)
      expect(isInRange(0, 1, 10)).toBe(false)
      expect(isInRange(11, 1, 10)).toBe(false)
    })
  })

  describe('normalizeString', () => {
    it('should normalize strings', () => {
      expect(normalizeString('  Hello   World  ')).toBe('hello world')
      expect(normalizeString('UPPERCASE')).toBe('uppercase')
      expect(normalizeString('Multiple   Spaces')).toBe('multiple spaces')
    })
  })
})
