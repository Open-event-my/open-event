/**
 * Property-Based Tests for Analytics Data Anonymization
 *
 * Feature: production-readiness, Property 18: Analytics Data Anonymization
 * Validates: Requirements 3.8
 *
 * These tests verify that PII is properly anonymized in analytics data
 * across all possible inputs using property-based testing.
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  hashValue,
  anonymizeEmail,
  anonymizeIPAddress,
  anonymizeUserAgent,
  anonymizePII,
  removePII,
  anonymizeUserForAnalytics,
  anonymizeEventForAnalytics,
  anonymizeSessionForAnalytics,
  containsPII,
} from './analyticsAnonymization'

describe('Analytics Data Anonymization - Property Tests', () => {
  /**
   * Property 18: Analytics Data Anonymization
   * For any data used in analytics, personally identifiable information
   * (email, name, IP address) should be anonymized or hashed.
   */

  describe('Property 18.1: Email Anonymization', () => {
    it('should hash all email addresses consistently', () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const result = anonymizeEmail(email)

          // Email should be hashed
          expect(result.emailHash).toBeDefined()
          expect(result.emailHash).not.toBe(email)

          // Hash should be consistent
          const result2 = anonymizeEmail(email)
          expect(result.emailHash).toBe(result2.emailHash)

          // Hash should be a hex string (64 characters for SHA-256)
          if (result.emailHash) {
            expect(result.emailHash.length).toBe(64)
            expect(result.emailHash).toMatch(/^[a-f0-9]{64}$/)
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve email domain for analytics', () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          const result = anonymizeEmail(email)
          const expectedDomain = email.split('@')[1]

          // Domain should be preserved
          expect(result.emailDomain).toBe(expectedDomain)
        }),
        { numRuns: 100 }
      )
    })

    it('should handle empty or null emails gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant(''), fc.constant(null), fc.constant(undefined)),
          (email) => {
            const result = anonymizeEmail(email as string | null | undefined)

            // Should return empty object for invalid emails
            expect(result.emailHash).toBeUndefined()
            expect(result.emailDomain).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.2: Name Anonymization', () => {
    it('should hash all names consistently', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (name) => {
          const hash1 = hashValue(name)
          const hash2 = hashValue(name)

          // Hash should be consistent
          expect(hash1).toBe(hash2)

          // Hash should not equal original name (it's a hex string, so may contain characters from the original)
          if (hash1) {
            expect(hash1).not.toBe(name)
            expect(hash1.length).toBeGreaterThan(name.length) // SHA-256 produces 64 hex chars
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should produce different hashes for different names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (name1, name2) => {
            fc.pre(name1 !== name2) // Only test different names

            const hash1 = hashValue(name1)
            const hash2 = hashValue(name2)

            // Different names should produce different hashes
            expect(hash1).not.toBe(hash2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.3: IP Address Anonymization', () => {
    it('should hash all IP addresses', () => {
      fc.assert(
        fc.property(fc.ipV4(), (ip) => {
          const result = anonymizeIPAddress(ip)

          // IP should be hashed
          expect(result.ipAddressHash).toBeDefined()
          expect(result.ipAddressHash).not.toBe(ip)

          // Original IP should not appear in hash
          expect(result.ipAddressHash).not.toContain(ip)
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve IP prefix for geographic analytics', () => {
      fc.assert(
        fc.property(fc.ipV4(), (ip) => {
          const result = anonymizeIPAddress(ip)
          const parts = ip.split('.')

          // First two octets should be preserved
          if (parts.length >= 2) {
            const expectedPrefix = `${parts[0]}.${parts[1]}`
            expect(result.ipPrefix).toBe(expectedPrefix)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.4: User Agent Anonymization', () => {
    it('should hash user agent strings', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10, maxLength: 200 }), (userAgent) => {
          const result = anonymizeUserAgent(userAgent)

          // User agent should be hashed
          expect(result.userAgentHash).toBeDefined()
          expect(result.userAgentHash).not.toBe(userAgent)
        }),
        { numRuns: 100 }
      )
    })

    it('should extract browser and OS info without exposing full user agent', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) Firefox/89.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/91.0.864.59'
          ),
          (userAgent) => {
            const result = anonymizeUserAgent(userAgent)

            // Should extract browser and OS
            expect(result.browser).toBeDefined()
            expect(result.os).toBeDefined()

            // Should not expose full user agent
            expect(result.browser).not.toBe(userAgent)
            expect(result.os).not.toBe(userAgent)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.5: Complete PII Anonymization', () => {
    it('should anonymize all PII fields in an object', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0), // Exclude whitespace-only
            phone: fc.string({ minLength: 10, maxLength: 15 }).filter((s) => s.trim().length > 0), // Exclude whitespace-only
            ipAddress: fc.ipV4(),
          }),
          (pii) => {
            const anonymized = anonymizePII(pii)

            // All PII should be hashed
            expect(anonymized.emailHash).toBeDefined()
            expect(anonymized.nameHash).toBeDefined()
            expect(anonymized.phoneHash).toBeDefined()
            expect(anonymized.ipAddressHash).toBeDefined()

            // Original values should not equal hashes (hashes are longer hex strings)
            expect(anonymized.emailHash).not.toBe(pii.email)
            expect(anonymized.nameHash).not.toBe(pii.name)
            expect(anonymized.phoneHash).not.toBe(pii.phone)
            expect(anonymized.ipAddressHash).not.toBe(pii.ipAddress)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.6: PII Removal', () => {
    it('should remove all PII fields from objects', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            role: fc.constantFrom('organizer', 'admin', 'superadmin'),
            status: fc.constantFrom('active', 'suspended'),
          }),
          (obj) => {
            const cleaned = removePII(obj)

            // PII fields should be removed
            expect(cleaned).not.toHaveProperty('email')
            expect(cleaned).not.toHaveProperty('name')
            expect(cleaned).not.toHaveProperty('phone')

            // Non-PII fields should be preserved
            expect(cleaned.role).toBe(obj.role)
            expect(cleaned.status).toBe(obj.status)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.7: User Analytics Anonymization', () => {
    it('should anonymize user data for analytics', () => {
      fc.assert(
        fc.property(
          fc.record({
            _id: fc.string({ minLength: 10, maxLength: 20 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            role: fc.constantFrom('organizer', 'admin', 'superadmin'),
            status: fc.constantFrom('active', 'suspended'),
            createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
          }),
          (user) => {
            const anonymized = anonymizeUserForAnalytics(user)

            // Should have userId but not original email/name/phone
            expect(anonymized.userId).toBe(user._id)
            expect(anonymized).not.toHaveProperty('email')
            expect(anonymized).not.toHaveProperty('name')
            expect(anonymized).not.toHaveProperty('phone')

            // Should have hashed versions
            expect(anonymized.emailHash).toBeDefined()
            expect(anonymized.nameHash).toBeDefined()
            expect(anonymized.phoneHash).toBeDefined()

            // Should preserve non-PII fields
            expect(anonymized.role).toBe(user.role)
            expect(anonymized.status).toBe(user.status)
            expect(anonymized.createdAt).toBe(user.createdAt)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.8: Event Analytics Anonymization', () => {
    it('should anonymize event data for analytics', () => {
      fc.assert(
        fc.property(
          fc.record({
            _id: fc.string({ minLength: 10, maxLength: 20 }),
            organizerId: fc.string({ minLength: 10, maxLength: 20 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            status: fc.constantFrom('draft', 'planning', 'active', 'completed', 'cancelled'),
            eventType: fc.constantFrom('conference', 'workshop', 'meetup', 'hackathon'),
            budget: fc.integer({ min: 0, max: 1000000 }),
            expectedAttendees: fc.integer({ min: 0, max: 10000 }),
            createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
          }),
          (event) => {
            const anonymized = anonymizeEventForAnalytics(event)

            // Should have eventId but not title (which might contain PII)
            expect(anonymized.eventId).toBe(event._id)
            expect(anonymized).not.toHaveProperty('title')

            // Organizer ID should be hashed
            expect(anonymized.organizerIdHash).toBeDefined()
            expect(anonymized.organizerIdHash).not.toBe(event.organizerId)

            // Should preserve non-PII metrics
            expect(anonymized.status).toBe(event.status)
            expect(anonymized.eventType).toBe(event.eventType)
            expect(anonymized.budget).toBe(event.budget)
            expect(anonymized.expectedAttendees).toBe(event.expectedAttendees)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.9: Session Analytics Anonymization', () => {
    it('should anonymize session data for analytics', () => {
      fc.assert(
        fc.property(
          fc.record({
            _id: fc.string({ minLength: 10, maxLength: 20 }),
            userId: fc.string({ minLength: 10, maxLength: 20 }),
            ipAddress: fc.ipV4(),
            userAgent: fc.string({ minLength: 10, maxLength: 200 }),
            createdAt: fc.integer({ min: 1000000000000, max: Date.now() }),
            expiresAt: fc.integer({ min: 1000000000000, max: Date.now() + 86400000 }),
          }),
          (session) => {
            const anonymized = anonymizeSessionForAnalytics(session)

            // Should have sessionId but not original IP/UA
            expect(anonymized.sessionId).toBe(session._id)
            expect(anonymized).not.toHaveProperty('ipAddress')
            expect(anonymized).not.toHaveProperty('userAgent')

            // User ID should be hashed
            expect(anonymized.userIdHash).toBeDefined()
            expect(anonymized.userIdHash).not.toBe(session.userId)

            // IP and UA should be hashed
            expect(anonymized.ipAddressHash).toBeDefined()
            expect(anonymized.userAgentHash).toBeDefined()

            // Should extract browser and OS
            expect(anonymized.browser).toBeDefined()
            expect(anonymized.os).toBeDefined()

            // Should preserve timestamps
            expect(anonymized.createdAt).toBe(session.createdAt)
            expect(anonymized.expiresAt).toBe(session.expiresAt)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.10: PII Detection', () => {
    it('should detect email addresses as PII', () => {
      fc.assert(
        fc.property(fc.emailAddress(), (email) => {
          expect(containsPII(email)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should detect phone numbers as PII', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('123-456-7890', '123.456.7890', '123 456 7890', '1234567890'),
          (phone) => {
            expect(containsPII(phone)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should detect IP addresses as PII', () => {
      fc.assert(
        fc.property(fc.ipV4(), (ip) => {
          expect(containsPII(ip)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should not flag non-PII strings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('conference', 'workshop', 'active', 'completed', 'organizer'),
          (str) => {
            expect(containsPII(str)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.11: Hash Consistency', () => {
    it('should produce consistent hashes for the same input', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (input) => {
          const hash1 = hashValue(input)
          const hash2 = hashValue(input)
          const hash3 = hashValue(input)

          // All hashes should be identical
          expect(hash1).toBe(hash2)
          expect(hash2).toBe(hash3)
        }),
        { numRuns: 100 }
      )
    })

    it('should be case-insensitive for consistency', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (input) => {
          const hash1 = hashValue(input.toLowerCase())
          const hash2 = hashValue(input.toUpperCase())

          // Hashes should be the same regardless of case
          expect(hash1).toBe(hash2)
        }),
        { numRuns: 100 }
      )
    })
  })
})
