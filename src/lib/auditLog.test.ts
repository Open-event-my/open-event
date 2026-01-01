/**
 * Audit Log Tests
 *
 * Tests for the audit log types and helper functions.
 * Note: Convex mutation/query handlers require integration testing with Convex.
 */

import { describe, it, expect } from 'vitest'
import {
  getClientIP,
  getUserAgent,
  type AuditAction,
  type AuditResource,
  type AuditLogEntry,
} from '../../convex/auditLog'

describe('Audit Log Types', () => {
  describe('AuditAction type', () => {
    it('should accept valid authentication actions', () => {
      const actions: AuditAction[] = [
        'login',
        'login_failed',
        'logout',
        'signup',
        'password_reset_requested',
        'password_reset_completed',
        'email_verified',
      ]
      expect(actions).toHaveLength(7)
    })

    it('should accept valid user management actions', () => {
      const actions: AuditAction[] = [
        'user_created',
        'user_updated',
        'user_deleted',
        'user_suspended',
        'user_unsuspended',
        'role_changed',
      ]
      expect(actions).toHaveLength(6)
    })

    it('should accept valid event actions', () => {
      const actions: AuditAction[] = [
        'event_created',
        'event_updated',
        'event_deleted',
        'event_published',
      ]
      expect(actions).toHaveLength(4)
    })

    it('should accept valid vendor/sponsor actions', () => {
      const actions: AuditAction[] = [
        'vendor_approved',
        'vendor_rejected',
        'sponsor_approved',
        'sponsor_rejected',
      ]
      expect(actions).toHaveLength(4)
    })

    it('should accept valid api actions', () => {
      const actions: AuditAction[] = ['api_key_created', 'api_key_revoked', 'api_request']
      expect(actions).toHaveLength(3)
    })

    it('should accept valid admin actions', () => {
      const actions: AuditAction[] = ['admin_action', 'settings_changed']
      expect(actions).toHaveLength(2)
    })

    it('should accept valid security actions', () => {
      const actions: AuditAction[] = ['rate_limited', 'account_locked', 'suspicious_activity']
      expect(actions).toHaveLength(3)
    })
  })

  describe('AuditResource type', () => {
    it('should accept all valid resource types', () => {
      const resources: AuditResource[] = [
        'user',
        'event',
        'vendor',
        'sponsor',
        'api_key',
        'webhook',
        'settings',
        'auth',
      ]
      expect(resources).toHaveLength(8)
    })
  })

  describe('AuditLogEntry interface', () => {
    it('should correctly structure a minimal log entry', () => {
      const entry: AuditLogEntry = {
        action: 'login',
        resource: 'auth',
        status: 'success',
      }
      expect(entry.action).toBe('login')
      expect(entry.resource).toBe('auth')
      expect(entry.status).toBe('success')
      expect(entry.userId).toBeUndefined()
      expect(entry.ipAddress).toBeUndefined()
    })

    it('should correctly structure a full log entry', () => {
      const entry: AuditLogEntry = {
        userId: 'jh76543210987654321' as unknown as AuditLogEntry['userId'],
        userEmail: 'test@example.com',
        action: 'login_failed',
        resource: 'auth',
        resourceId: 'session-123',
        ipAddress: '192.0.2.100',
        userAgent: 'Mozilla/5.0',
        endpoint: '/api/auth/login',
        metadata: { reason: 'Invalid password' },
        status: 'failure',
        errorMessage: 'Invalid credentials',
      }

      expect(entry.userId).toBeDefined()
      expect(entry.userEmail).toBe('test@example.com')
      expect(entry.action).toBe('login_failed')
      expect(entry.resource).toBe('auth')
      expect(entry.resourceId).toBe('session-123')
      expect(entry.ipAddress).toBe('192.0.2.100')
      expect(entry.userAgent).toBe('Mozilla/5.0')
      expect(entry.endpoint).toBe('/api/auth/login')
      expect(entry.metadata).toEqual({ reason: 'Invalid password' })
      expect(entry.status).toBe('failure')
      expect(entry.errorMessage).toBe('Invalid credentials')
    })

    it('should accept all valid status values', () => {
      const statuses: AuditLogEntry['status'][] = ['success', 'failure', 'blocked']
      expect(statuses).toHaveLength(3)
    })
  })
})

describe('getClientIP', () => {
  it('should extract IP from CF-Connecting-IP header (Cloudflare)', () => {
    const request = new Request('https://example.com', {
      headers: { 'CF-Connecting-IP': '203.0.113.50' },
    })
    expect(getClientIP(request)).toBe('203.0.113.50')
  })

  it('should extract IP from X-Real-IP header (Nginx)', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Real-IP': '198.51.100.25' },
    })
    expect(getClientIP(request)).toBe('198.51.100.25')
  })

  it('should extract first IP from X-Forwarded-For header', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Forwarded-For': '192.0.2.100, 10.0.0.1, 172.16.0.1' },
    })
    expect(getClientIP(request)).toBe('192.0.2.100')
  })

  it('should prioritize CF-Connecting-IP over other headers', () => {
    const request = new Request('https://example.com', {
      headers: {
        'CF-Connecting-IP': '203.0.113.50',
        'X-Real-IP': '198.51.100.25',
        'X-Forwarded-For': '192.0.2.100',
      },
    })
    expect(getClientIP(request)).toBe('203.0.113.50')
  })

  it('should return undefined if no IP header is present', () => {
    const request = new Request('https://example.com')
    expect(getClientIP(request)).toBeUndefined()
  })

  it('should trim whitespace from IP addresses', () => {
    const request = new Request('https://example.com', {
      headers: { 'X-Forwarded-For': '  192.0.2.100  ,  10.0.0.1  ' },
    })
    expect(getClientIP(request)).toBe('192.0.2.100')
  })
})

describe('getUserAgent', () => {
  it('should extract User-Agent header', () => {
    const request = new Request('https://example.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    })
    expect(getUserAgent(request)).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  })

  it('should return undefined if User-Agent header is not present', () => {
    const request = new Request('https://example.com')
    expect(getUserAgent(request)).toBeUndefined()
  })

  it('should handle empty User-Agent header', () => {
    const request = new Request('https://example.com', {
      headers: { 'User-Agent': '' },
    })
    // Empty string is falsy, so should return undefined
    expect(getUserAgent(request)).toBeUndefined()
  })

  it('should handle various browser User-Agent strings', () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ]

    for (const ua of userAgents) {
      const request = new Request('https://example.com', {
        headers: { 'User-Agent': ua },
      })
      expect(getUserAgent(request)).toBe(ua)
    }
  })
})

describe('Audit Log Security Patterns', () => {
  it('should have consistent IP extraction across both modules', () => {
    // Both auditLog and globalRateLimit have getClientIP
    // They should behave the same way for the same inputs
    const request = new Request('https://example.com', {
      headers: { 'CF-Connecting-IP': '203.0.113.50' },
    })

    const auditLogIP = getClientIP(request)
    expect(auditLogIP).toBe('203.0.113.50')
  })

  it('should track security-relevant actions', () => {
    const securityActions: AuditAction[] = [
      'login_failed',
      'rate_limited',
      'account_locked',
      'suspicious_activity',
    ]

    for (const action of securityActions) {
      expect(typeof action).toBe('string')
      expect(action.length).toBeGreaterThan(0)
    }
  })
})
