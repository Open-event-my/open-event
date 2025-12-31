/**
 * Security Headers Tests
 * Tests that all required security headers are configured
 *
 * Requirements: 1.9, 1.10
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Security Headers Configuration', () => {
  // Read vite.config.ts as text to verify headers are configured
  const viteConfigPath = join(process.cwd(), 'vite.config.ts')
  const viteConfigContent = readFileSync(viteConfigPath, 'utf-8')

  describe('Development Server Headers', () => {
    it('should have Content-Security-Policy header configured', () => {
      expect(viteConfigContent).toContain('Content-Security-Policy')
      expect(viteConfigContent).toContain("default-src 'self'")
    })

    it('should have X-Frame-Options header set to DENY', () => {
      expect(viteConfigContent).toContain('X-Frame-Options')
      expect(viteConfigContent).toContain('DENY')
    })

    it('should have X-Content-Type-Options header set to nosniff', () => {
      expect(viteConfigContent).toContain('X-Content-Type-Options')
      expect(viteConfigContent).toContain('nosniff')
    })

    it('should have Referrer-Policy header configured', () => {
      expect(viteConfigContent).toContain('Referrer-Policy')
      expect(viteConfigContent).toContain('strict-origin-when-cross-origin')
    })

    it('should have Permissions-Policy header configured', () => {
      expect(viteConfigContent).toContain('Permissions-Policy')
      expect(viteConfigContent).toContain('geolocation=()')
      expect(viteConfigContent).toContain('microphone=()')
      expect(viteConfigContent).toContain('camera=()')
    })

    it('should have HSTS header commented out in development', () => {
      // HSTS should be commented in server config but active in preview
      const serverSection = viteConfigContent.match(/server:\s*{[^}]*headers:[^}]*}/s)?.[0] || ''
      expect(serverSection).toContain('// ')
      expect(serverSection).toContain('Strict-Transport-Security')
    })
  })

  describe('Preview Server Headers', () => {
    it('should have preview headers section', () => {
      expect(viteConfigContent).toContain('preview:')
      expect(viteConfigContent).toContain('headers:')
    })

    it('should have Content-Security-Policy in preview', () => {
      const previewSection = viteConfigContent.match(/preview:\s*{[^}]*headers:[^}]*}/s)?.[0] || ''
      expect(previewSection).toContain('Content-Security-Policy')
    })

    it('should have HSTS header in preview/production', () => {
      const previewSection = viteConfigContent.match(/preview:\s*{[^}]*headers:[^}]*}/s)?.[0] || ''
      expect(previewSection).toContain('Strict-Transport-Security')
      expect(previewSection).toContain('max-age=31536000')
      expect(previewSection).toContain('includeSubDomains')
    })
  })

  describe('Content Security Policy Details', () => {
    it('should restrict script sources appropriately', () => {
      expect(viteConfigContent).toContain("script-src 'self'")
      expect(viteConfigContent).toContain('https://cdn.jsdelivr.net')
    })

    it('should restrict style sources appropriately', () => {
      expect(viteConfigContent).toContain("style-src 'self' 'unsafe-inline'")
    })

    it('should allow necessary image sources', () => {
      expect(viteConfigContent).toContain("img-src 'self' data: https: blob:")
    })

    it('should restrict connection sources to trusted domains', () => {
      expect(viteConfigContent).toContain('connect-src')
      expect(viteConfigContent).toContain('https://*.convex.cloud')
      expect(viteConfigContent).toContain('https://api.openai.com')
      expect(viteConfigContent).toContain('https://api.stripe.com')
    })

    it('should prevent framing with frame-ancestors', () => {
      expect(viteConfigContent).toContain("frame-ancestors 'none'")
    })

    it('should restrict base URI', () => {
      expect(viteConfigContent).toContain("base-uri 'self'")
    })

    it('should restrict form actions', () => {
      expect(viteConfigContent).toContain("form-action 'self'")
    })
  })

  describe('Security Headers Best Practices', () => {
    it('should have all critical security headers', () => {
      const criticalHeaders = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ]

      criticalHeaders.forEach((header) => {
        expect(viteConfigContent).toContain(header)
      })
    })

    it('should configure headers for both server and preview', () => {
      expect(viteConfigContent).toContain('server:')
      expect(viteConfigContent).toContain('preview:')

      // Both should have headers
      const serverMatch = viteConfigContent.match(/server:\s*{[^}]*headers:/s)
      const previewMatch = viteConfigContent.match(/preview:\s*{[^}]*headers:/s)

      expect(serverMatch).toBeTruthy()
      expect(previewMatch).toBeTruthy()
    })
  })
})
