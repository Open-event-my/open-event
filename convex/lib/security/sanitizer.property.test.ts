/**
 * Input Sanitizer Property-Based Tests
 *
 * Property-based tests using fast-check to verify sanitization
 * works correctly across all possible inputs.
 *
 * SECURITY NOTE: The sanitizer uses HTML entity encoding as the primary
 * defense against XSS attacks. All HTML is escaped (< becomes &lt;, etc.),
 * making tags non-executable rather than removing them.
 *
 * Feature: production-readiness
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { InputSanitizer } from './sanitizer'

describe('InputSanitizer Property Tests', () => {
  const sanitizer = new InputSanitizer()

  /**
   * Property 2: XSS Prevention Through Sanitization
   * Validates: Requirements 1.3
   *
   * For any user-generated content that is rendered in the UI,
   * the system should sanitize the content by escaping HTML entities,
   * making potentially malicious scripts non-executable.
   */
  describe('Property 2: XSS Prevention Through Sanitization', () => {
    it('should escape all script tags from any input (< becomes &lt;)', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (before, after) => {
          const input = `${before}<script>alert('XSS')</script>${after}`
          const result = sanitizer.sanitizeHTML(input)

          // Verify script tags are escaped (not executable)
          // The < character should be escaped to &lt;
          expect(result).not.toMatch(/<script/i)
          expect(result).toContain('&lt;script')
        }),
        { numRuns: 100 }
      )
    })

    it('should escape all HTML tags making them non-executable', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('div', 'span', 'a', 'img', 'iframe', 'script', 'style'),
          fc.string(),
          (tagName, content) => {
            const input = `<${tagName}>${content}</${tagName}>`
            const result = sanitizer.sanitizeHTML(input)

            // Verify the opening < is escaped
            expect(result).not.toContain(`<${tagName}`)
            expect(result).toContain(`&lt;${tagName}`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should escape event handlers making them non-executable', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('onclick', 'onerror', 'onload', 'onmouseover', 'onfocus'),
          fc.string(),
          (eventHandler, content) => {
            const input = `<div ${eventHandler}="alert('XSS')">${content}</div>`
            const result = sanitizer.sanitizeHTML(input)

            // The tag structure is escaped, making the event handler harmless
            // The < is escaped to &lt;, so the browser won't parse it as HTML
            expect(result).not.toContain('<div')
            expect(result).toContain('&lt;div')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should escape style tags from any input', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (before, after) => {
          const input = `${before}<style>body { display: none; }</style>${after}`
          const result = sanitizer.sanitizeHTML(input)

          // Verify style tags are escaped
          expect(result).not.toMatch(/<style/i)
          expect(result).toContain('&lt;style')
        }),
        { numRuns: 100 }
      )
    })

    it('should escape iframe tags from any input', () => {
      fc.assert(
        fc.property(fc.string(), fc.webUrl(), fc.string(), (before, url, after) => {
          const input = `${before}<iframe src="${url}"></iframe>${after}`
          const result = sanitizer.sanitizeHTML(input)

          // Verify iframe tags are escaped
          expect(result).not.toMatch(/<iframe/i)
          expect(result).toContain('&lt;iframe')
        }),
        { numRuns: 100 }
      )
    })

    it('should escape object and embed tags from any input', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('object', 'embed', 'applet'),
          fc.string(),
          (tagName, content) => {
            const input = `<${tagName}>${content}</${tagName}>`
            const result = sanitizer.sanitizeHTML(input)

            // Verify dangerous tags are escaped
            expect(result).not.toMatch(new RegExp(`<${tagName}`, 'i'))
            expect(result).toContain(`&lt;${tagName}`)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should escape multiple XSS vectors in any combination', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), fc.string(), (text1, text2, text3) => {
          const input = `
              ${text1}
              <script>alert('XSS')</script>
              ${text2}
              <img src="x" onerror="alert('XSS')">
              ${text3}
              <a href="javascript:void(0)">Click</a>
              <iframe src="evil.com"></iframe>
            `
          const result = sanitizer.sanitizeHTML(input)

          // Verify all HTML tags are escaped (< becomes &lt;)
          expect(result).not.toMatch(/<script/i)
          expect(result).not.toMatch(/<img/i)
          expect(result).not.toMatch(/<a /i)
          expect(result).not.toMatch(/<iframe/i)
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve text content while escaping HTML structure', () => {
      fc.assert(
        fc.property(
          // Filter out characters that get escaped: < > & " ' ` = /
          fc
            .string({ minLength: 1 })
            .filter(
              (s) =>
                !s.includes('<') &&
                !s.includes('>') &&
                !s.includes('&') &&
                !s.includes('"') &&
                !s.includes("'") &&
                !s.includes('`') &&
                !s.includes('=') &&
                !s.includes('/')
            ),
          (safeContent) => {
            const input = `<p>${safeContent}</p><script>alert('XSS')</script>`
            const result = sanitizer.sanitizeHTML(input)

            // Verify safe text content is preserved (alphanumeric and safe chars)
            expect(result).toContain(safeContent)
            // Verify HTML tags are escaped
            expect(result).not.toMatch(/<script/i)
            expect(result).not.toMatch(/<p>/i)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle nested XSS attempts', () => {
      fc.assert(
        fc.property(fc.string(), (content) => {
          const input = `<div><script><script>alert('XSS')</script></script></div>${content}`
          const result = sanitizer.sanitizeHTML(input)

          // Verify nested scripts are escaped
          expect(result).not.toMatch(/<script/i)
          expect(result).toContain('&lt;script')
        }),
        { numRuns: 100 }
      )
    })

    it('should sanitize any string without throwing errors', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          // Should not throw
          expect(() => sanitizer.sanitizeHTML(input)).not.toThrow()

          const result = sanitizer.sanitizeHTML(input)
          // Result should be a string
          expect(typeof result).toBe('string')
        }),
        { numRuns: 100 }
      )
    })

    it('should handle extremely long inputs with XSS attempts', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 100, maxLength: 20000 }), (longString) => {
          const input = `${longString}<script>alert('XSS')</script>`
          const result = sanitizer.sanitizeHTML(input)

          // Verify XSS is escaped even in long strings
          expect(result).not.toMatch(/<script/i)
          // Verify result is truncated to max length
          expect(result.length).toBeLessThanOrEqual(10000)
        }),
        { numRuns: 100 }
      )
    })

    it('should escape all dangerous protocols in href attributes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('javascript:', 'vbscript:', 'data:text/html'),
          fc.string(),
          (protocol, content) => {
            const input = `<a href="${protocol}alert('XSS')">${content}</a>`
            const result = sanitizer.sanitizeHTML(input)

            // The entire tag is escaped, making the protocol harmless
            expect(result).not.toContain('<a ')
            expect(result).toContain('&lt;a')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle case variations of XSS vectors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('SCRIPT', 'Script', 'sCrIpT', 'script'),
          fc.string(),
          (scriptCase, content) => {
            const input = `<${scriptCase}>alert('XSS')</${scriptCase}>${content}`
            const result = sanitizer.sanitizeHTML(input)

            // Verify script tags are escaped regardless of case
            expect(result).not.toMatch(/<script/i)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle malformed HTML with XSS attempts', () => {
      fc.assert(
        fc.property(fc.string(), (content) => {
          const input = `<script<script>alert('XSS')</script>${content}`
          const result = sanitizer.sanitizeHTML(input)

          // Should handle malformed HTML without crashing
          expect(typeof result).toBe('string')
          // Should still escape script tags
          expect(result).not.toMatch(/<script/i)
        }),
        { numRuns: 100 }
      )
    })

    it('should escape special HTML characters', () => {
      fc.assert(
        fc.property(fc.string(), (content) => {
          const input = `<div>${content}</div>`
          const result = sanitizer.sanitizeHTML(input)

          // All < and > should be escaped
          expect(result).not.toContain('<div>')
          expect(result).not.toContain('</div>')
          expect(result).toContain('&lt;div&gt;')
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property 6: Input Validation and Sanitization
   * Validates: Requirements 1.8
   *
   * For any API endpoint accepting user input, invalid or malicious
   * input should be rejected with a clear validation error before
   * any processing occurs.
   */
  describe('Property 6: Input Validation and Sanitization', () => {
    it('should validate required fields for any input', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.option(fc.string(), { nil: undefined }),
            email: fc.option(fc.string(), { nil: undefined }),
          }),
          (input) => {
            const schema = {
              name: { type: 'string' as const, required: true },
              email: { type: 'email' as const, required: true },
            }

            const result = sanitizer.validateInput(input, schema)

            // If fields are missing, validation should fail
            if (!input.name || !input.email) {
              expect(result.valid).toBe(false)
              expect(result.errors.length).toBeGreaterThan(0)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate string length constraints for any input', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const schema = {
            field: { type: 'string' as const, required: true, minLength: 5, maxLength: 10 },
          }

          const result = sanitizer.validateInput({ field: value }, schema)

          // Validation should fail if length is outside bounds or empty
          if (value.length === 0 || value.length < 5 || value.length > 10) {
            expect(result.valid).toBe(false)
          } else {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should validate number ranges for any input', () => {
      fc.assert(
        fc.property(fc.integer(), (value) => {
          const schema = {
            age: { type: 'number' as const, min: 18, max: 100 },
          }

          const result = sanitizer.validateInput({ age: value }, schema)

          // Validation should fail if number is outside range
          if (value < 18 || value > 100) {
            expect(result.valid).toBe(false)
          } else {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should validate email format for any input', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const schema = {
            email: { type: 'email' as const, required: true },
          }

          const result = sanitizer.validateInput({ email: value }, schema)

          // Should validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (value.length === 0 || !emailRegex.test(value)) {
            expect(result.valid).toBe(false)
          } else {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should sanitize text input removing control characters', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitizer.sanitizeText(input)

          // Result should not contain null bytes
          expect(result).not.toContain('\0')
          // Result should be a string
          expect(typeof result).toBe('string')
          // Result should not exceed max length
          expect(result.length).toBeLessThanOrEqual(10000)
        }),
        { numRuns: 100 }
      )
    })

    it('should handle validation of mixed valid and invalid fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            validEmail: fc.constant('test@example.com'),
            invalidEmail: fc.string(),
            validAge: fc.integer({ min: 18, max: 100 }),
            invalidAge: fc.integer({ min: -100, max: 10 }),
          }),
          (input) => {
            const schema = {
              validEmail: { type: 'email' as const },
              invalidEmail: { type: 'email' as const },
              validAge: { type: 'number' as const, min: 18, max: 100 },
              invalidAge: { type: 'number' as const, min: 18, max: 100 },
            }

            const result = sanitizer.validateInput(input, schema)

            // Should detect invalid fields
            if (result.errors.length > 0) {
              // Errors should have proper structure
              result.errors.forEach((error) => {
                expect(error).toHaveProperty('field')
                expect(error).toHaveProperty('message')
                expect(error).toHaveProperty('code')
              })
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate URL format for any input', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const schema = {
            website: { type: 'url' as const, required: true },
          }

          const result = sanitizer.validateInput({ website: value }, schema)

          // Should validate URL format
          const urlRegex = /^https?:\/\//i
          if (value.length === 0 || !urlRegex.test(value)) {
            expect(result.valid).toBe(false)
          } else {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should handle custom validation functions for any input', () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          const schema = {
            username: {
              type: 'string' as const,
              required: true,
              custom: (val: unknown) => typeof val === 'string' && val.length >= 3,
            },
          }

          const result = sanitizer.validateInput({ username: value }, schema)

          // Custom validation should be applied
          if (value.length === 0 || value.length < 3) {
            expect(result.valid).toBe(false)
          } else {
            expect(result.valid).toBe(true)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should not throw errors for any input during validation', () => {
      fc.assert(
        fc.property(fc.anything(), (value) => {
          const schema = {
            field: { type: 'string' as const },
          }

          // Should not throw for any input
          expect(() => sanitizer.validateInput({ field: value }, schema)).not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should truncate text to maximum length for any input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 100 }),
          fc.integer({ min: 10, max: 100 }),
          (input, maxLength) => {
            const result = sanitizer.sanitizeText(input, maxLength)

            // Result should not exceed specified max length
            expect(result.length).toBeLessThanOrEqual(maxLength)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
