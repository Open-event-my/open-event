/**
 * Input Sanitizer Unit Tests
 * 
 * Tests for the InputSanitizer class to verify HTML sanitization,
 * text sanitization, and input validation functionality.
 */

import { describe, it, expect } from 'vitest';
import { InputSanitizer, sanitizeHTML, sanitizeText, validateInput } from './sanitizer';

describe('InputSanitizer', () => {
  const sanitizer = new InputSanitizer();

  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove style tags', () => {
      const input = '<p>Text</p><style>body { display: none; }</style>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).not.toContain('<style');
      expect(result).not.toContain('display: none');
    });

    it('should remove inline styles', () => {
      const input = '<div style="display:none">Hidden</div>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).not.toContain('style=');
    });

    it('should remove iframe tags', () => {
      const input = '<p>Text</p><iframe src="evil.com"></iframe>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('evil.com');
    });

    it('should preserve allowed tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should preserve allowed attributes', () => {
      const input = '<a href="https://example.com" title="Example">Link</a>';
      const result = sanitizer.sanitizeHTML(input);
      expect(result).toContain('href=');
      expect(result).toContain('https://example.com');
      expect(result).toContain('title=');
    });

    it('should strip all tags when stripTags option is true', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizer.sanitizeHTML(input, { stripTags: true });
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toBe('Hello World');
    });

    it('should truncate long input', () => {
      const input = 'a'.repeat(20000);
      const result = sanitizer.sanitizeHTML(input);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should handle empty input', () => {
      expect(sanitizer.sanitizeHTML('')).toBe('');
      expect(sanitizer.sanitizeHTML(null as any)).toBe('');
      expect(sanitizer.sanitizeHTML(undefined as any)).toBe('');
    });

    it('should escape HTML when escapeHtml option is true', () => {
      const input = '<p>Test & "quotes"</p>';
      const result = sanitizer.sanitizeHTML(input, { escapeHtml: true });
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('should remove multiple XSS vectors in one input', () => {
      const input = `
        <script>alert('XSS')</script>
        <img src="x" onerror="alert('XSS')">
        <a href="javascript:alert('XSS')">Click</a>
        <div onclick="alert('XSS')">Click</div>
        <iframe src="evil.com"></iframe>
      `;
      const result = sanitizer.sanitizeHTML(input);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('<iframe');
    });
  });

  describe('sanitizeText', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\0World';
      const result = sanitizer.sanitizeText(input);
      expect(result).not.toContain('\0');
      expect(result).toBe('Hello World');
    });

    it('should remove control characters', () => {
      const input = 'Hello\x01\x02\x03World';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should normalize whitespace', () => {
      const input = 'Hello    World   Test';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('Hello World Test');
    });

    it('should truncate long text', () => {
      const input = 'a'.repeat(20000);
      const result = sanitizer.sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should handle empty input', () => {
      expect(sanitizer.sanitizeText('')).toBe('');
      expect(sanitizer.sanitizeText(null as any)).toBe('');
      expect(sanitizer.sanitizeText(undefined as any)).toBe('');
    });

    it('should respect custom maxLength', () => {
      const input = 'a'.repeat(1000);
      const result = sanitizer.sanitizeText(input, 100);
      expect(result.length).toBe(100);
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = sanitizer.sanitizeText(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('validateInput', () => {
    it('should validate required fields', () => {
      const input = { name: '' };
      const schema = {
        name: { type: 'string' as const, required: true },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('should validate string type', () => {
      const input = { name: 123 };
      const schema = {
        name: { type: 'string' as const },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate string length', () => {
      const input = { name: 'ab' };
      const schema = {
        name: { type: 'string' as const, minLength: 3, maxLength: 10 },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MIN_LENGTH');
    });

    it('should validate number type', () => {
      const input = { age: '25' };
      const schema = {
        age: { type: 'number' as const },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate number range', () => {
      const input = { age: 5 };
      const schema = {
        age: { type: 'number' as const, min: 18, max: 100 },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MIN_VALUE');
    });

    it('should validate email format', () => {
      const input = { email: 'invalid-email' };
      const schema = {
        email: { type: 'email' as const },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_EMAIL');
    });

    it('should validate URL format', () => {
      const input = { website: 'not-a-url' };
      const schema = {
        website: { type: 'url' as const },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_URL');
    });

    it('should validate phone format', () => {
      const input = { phone: 'abc123' };
      const schema = {
        phone: { type: 'phone' as const },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_PHONE');
    });

    it('should validate boolean type', () => {
      const input = { active: 'true' };
      const schema = {
        active: { type: 'boolean' as const },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate with custom validator', () => {
      const input = { username: 'admin' };
      const schema = {
        username: {
          type: 'string' as const,
          custom: (value: unknown) => value !== 'admin',
          message: 'Username cannot be admin',
        },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('CUSTOM_VALIDATION');
    });

    it('should pass validation for valid input', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        active: true,
      };
      const schema = {
        name: { type: 'string' as const, required: true, minLength: 2 },
        email: { type: 'email' as const, required: true },
        age: { type: 'number' as const, min: 18, max: 100 },
        active: { type: 'boolean' as const },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation for optional empty fields', () => {
      const input = { name: 'John' };
      const schema = {
        name: { type: 'string' as const, required: true },
        email: { type: 'email' as const, required: false },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(true);
    });

    it('should validate pattern matching', () => {
      const input = { code: 'ABC-123' };
      const schema = {
        code: { type: 'string' as const, pattern: /^[A-Z]{3}-\d{3}$/ },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(true);
    });

    it('should fail pattern validation', () => {
      const input = { code: 'invalid' };
      const schema = {
        code: { type: 'string' as const, pattern: /^[A-Z]{3}-\d{3}$/ },
      };
      const result = sanitizer.validateInput(input, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });
  });

  describe('convenience functions', () => {
    it('should export sanitizeHTML convenience function', () => {
      const input = '<script>alert("XSS")</script><p>Safe</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script');
      expect(result).toContain('Safe');
    });

    it('should export sanitizeText convenience function', () => {
      const input = 'Hello\0World';
      const result = sanitizeText(input);
      expect(result).toBe('Hello World');
    });

    it('should export validateInput convenience function', () => {
      const input = { email: 'test@example.com' };
      const schema = { email: { type: 'email' as const } };
      const result = validateInput(input, schema);
      expect(result.valid).toBe(true);
    });
  });
});
