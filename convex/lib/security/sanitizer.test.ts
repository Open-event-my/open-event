/**
 * Input Sanitizer Unit Tests
 *
 * Tests for the InputSanitizer class to verify HTML sanitization,
 * text sanitization, and input validation functionality.
 *
 * SECURITY NOTE: The sanitizer now uses HTML entity encoding as the primary
 * defense against XSS attacks. All HTML is escaped, not filtered.
 */

import { describe, it, expect } from 'vitest'
import { InputSanitizer, sanitizeHTML, sanitizeText, validateInput } from './sanitizer'

describe('InputSanitizer', () => {
  const sanitizer = new InputSanitizer()

  describe('sanitizeHTML', () => {
    it('should escape script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script><p>World</p>'
      const result = sanitizer.sanitizeHTML(input)
      // Script tags should be escaped, not executed
      expect(result).toContain('&lt;script')
      expect(result).toContain('&lt;&#x2F;script&gt;')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('should escape event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>'
      const result = sanitizer.sanitizeHTML(input)
      // Event handlers should be escaped
      expect(result).toContain('onclick&#x3D;')
      expect(result).toContain('Click me')
    })

    it('should escape javascript: protocol in href', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>'
      const result = sanitizer.sanitizeHTML(input)
      // The entire tag structure should be escaped, making it safe
      // The < and > are escaped, so the browser won't parse it as HTML
      expect(result).toContain('&lt;a')
      expect(result).toContain('href&#x3D;')
      expect(result).toContain('Link')
      // Verify the tag is not executable (< is escaped)
      expect(result).not.toContain('<a')
    })

    it('should escape style tags', () => {
      const input = '<p>Text</p><style>body { display: none; }</style>'
      const result = sanitizer.sanitizeHTML(input)
      // Style tags should be escaped
      expect(result).toContain('&lt;style&gt;')
      expect(result).toContain('Text')
    })

    it('should escape inline styles', () => {
      const input = '<div style="display:none">Hidden</div>'
      const result = sanitizer.sanitizeHTML(input)
      // Style attribute should be escaped
      expect(result).toContain('style&#x3D;')
      expect(result).toContain('Hidden')
    })

    it('should escape iframe tags', () => {
      const input = '<p>Text</p><iframe src="evil.com"></iframe>'
      const result = sanitizer.sanitizeHTML(input)
      // iframe should be escaped
      expect(result).toContain('&lt;iframe')
      expect(result).toContain('Text')
    })

    it('should escape all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>'
      const result = sanitizer.sanitizeHTML(input)
      // All tags should be escaped
      expect(result).toContain('&lt;p&gt;')
      expect(result).toContain('&lt;strong&gt;')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('should escape attributes', () => {
      const input = '<a href="https://example.com" title="Example">Link</a>'
      const result = sanitizer.sanitizeHTML(input)
      // Attributes should be escaped
      expect(result).toContain('href&#x3D;')
      expect(result).toContain('Link')
    })

    it('should truncate long input', () => {
      const input = 'a'.repeat(20000)
      const result = sanitizer.sanitizeHTML(input)
      expect(result.length).toBeLessThanOrEqual(10000)
    })

    it('should handle empty input', () => {
      expect(sanitizer.sanitizeHTML('')).toBe('')
      expect(sanitizer.sanitizeHTML(null as unknown as string)).toBe('')
      expect(sanitizer.sanitizeHTML(undefined as unknown as string)).toBe('')
    })

    it('should escape special characters', () => {
      const input = '<p>Test & "quotes" \'apostrophe\'</p>'
      const result = sanitizer.sanitizeHTML(input)
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
      expect(result).toContain('&amp;')
      expect(result).toContain('&quot;')
      expect(result).toContain('&#x27;')
    })

    it('should escape multiple XSS vectors in one input', () => {
      const input = `
        <script>alert('XSS')</script>
        <img src="x" onerror="alert('XSS')">
        <a href="javascript:alert('XSS')">Click</a>
        <div onclick="alert('XSS')">Click</div>
        <iframe src="evil.com"></iframe>
      `
      const result = sanitizer.sanitizeHTML(input)
      // All dangerous content should be escaped - tags become text
      expect(result).toContain('&lt;script')
      expect(result).toContain('onerror&#x3D;')
      expect(result).toContain('onclick&#x3D;')
      expect(result).toContain('&lt;iframe')
      // Verify no actual HTML tags remain (< is escaped)
      expect(result).not.toContain('<script')
      expect(result).not.toContain('<img')
      expect(result).not.toContain('<a ')
      expect(result).not.toContain('<div')
      expect(result).not.toContain('<iframe')
    })
  })

  describe('sanitizeText', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\0World'
      const result = sanitizer.sanitizeText(input)
      expect(result).not.toContain('\0')
      expect(result).toBe('HelloWorld')
    })

    it('should remove control characters', () => {
      const input = 'Hello\x01\x02\x03World'
      const result = sanitizer.sanitizeText(input)
      expect(result).toBe('HelloWorld')
    })

    it('should normalize whitespace', () => {
      const input = 'Hello    World   Test'
      const result = sanitizer.sanitizeText(input)
      expect(result).toBe('Hello World Test')
    })

    it('should truncate long text', () => {
      const input = 'a'.repeat(20000)
      const result = sanitizer.sanitizeText(input)
      expect(result.length).toBeLessThanOrEqual(10000)
    })

    it('should handle empty input', () => {
      expect(sanitizer.sanitizeText('')).toBe('')
      expect(sanitizer.sanitizeText(null as unknown as string)).toBe('')
      expect(sanitizer.sanitizeText(undefined as unknown as string)).toBe('')
    })

    it('should respect custom maxLength', () => {
      const input = 'a'.repeat(1000)
      const result = sanitizer.sanitizeText(input, 100)
      expect(result.length).toBe(100)
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      const result = sanitizer.sanitizeText(input)
      expect(result).toBe('Hello World')
    })
  })

  describe('validateInput', () => {
    it('should validate required fields', () => {
      const input = { name: '' }
      const schema = {
        name: { type: 'string' as const, required: true },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('REQUIRED')
    })

    it('should validate string type', () => {
      const input = { name: 123 }
      const schema = {
        name: { type: 'string' as const },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_TYPE')
    })

    it('should validate string length', () => {
      const input = { name: 'ab' }
      const schema = {
        name: { type: 'string' as const, minLength: 3, maxLength: 10 },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('MIN_LENGTH')
    })

    it('should validate number type', () => {
      const input = { age: '25' }
      const schema = {
        age: { type: 'number' as const },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_TYPE')
    })

    it('should validate number range', () => {
      const input = { age: 5 }
      const schema = {
        age: { type: 'number' as const, min: 18, max: 100 },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('MIN_VALUE')
    })

    it('should validate email format', () => {
      const input = { email: 'invalid-email' }
      const schema = {
        email: { type: 'email' as const },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_EMAIL')
    })

    it('should validate URL format', () => {
      const input = { website: 'not-a-url' }
      const schema = {
        website: { type: 'url' as const },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_URL')
    })

    it('should validate phone format', () => {
      const input = { phone: 'abc123' }
      const schema = {
        phone: { type: 'phone' as const },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_PHONE')
    })

    it('should validate boolean type', () => {
      const input = { active: 'true' }
      const schema = {
        active: { type: 'boolean' as const },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_TYPE')
    })

    it('should validate with custom validator', () => {
      const input = { username: 'admin' }
      const schema = {
        username: {
          type: 'string' as const,
          custom: (value: unknown) => value !== 'admin',
          message: 'Username cannot be admin',
        },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('CUSTOM_VALIDATION')
    })

    it('should pass validation for valid input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        active: true,
      }
      const schema = {
        name: { type: 'string' as const, required: true, minLength: 2 },
        email: { type: 'email' as const, required: true },
        age: { type: 'number' as const, min: 18, max: 100 },
        active: { type: 'boolean' as const },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should skip validation for optional empty fields', () => {
      const input = { name: 'John' }
      const schema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: false },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(true)
    })

    it('should validate pattern matching', () => {
      const input = { code: 'ABC-123' }
      const schema = {
        code: { type: 'string' as const, pattern: /^[A-Z]{3}-\d{3}$/ },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(true)
    })

    it('should fail pattern validation', () => {
      const input = { code: 'invalid' }
      const schema = {
        code: { type: 'string' as const, pattern: /^[A-Z]{3}-\d{3}$/ },
      }
      const result = sanitizer.validateInput(input, schema)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_FORMAT')
    })
  })

  describe('convenience functions', () => {
    it('should export sanitizeHTML convenience function', () => {
      const input = '<script>alert("XSS")</script><p>Safe</p>'
      const result = sanitizeHTML(input)
      // Script should be escaped
      expect(result).toContain('&lt;script')
      expect(result).toContain('Safe')
    })

    it('should export sanitizeText convenience function', () => {
      const input = 'Hello\0World'
      const result = sanitizeText(input)
      expect(result).toBe('HelloWorld')
    })

    it('should export validateInput convenience function', () => {
      const input = { email: 'test@example.com' }
      const schema = { email: { type: 'email' as const } }
      const result = validateInput(input, schema)
      expect(result.valid).toBe(true)
    })
  })
})
