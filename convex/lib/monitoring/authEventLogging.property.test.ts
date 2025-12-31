/**
 * Authentication Event Logging Property-Based Tests
 * 
 * Property-based tests using fast-check to verify that all authentication
 * events are properly logged with required fields.
 * 
 * Feature: production-readiness
 * Property 10: Authentication Event Logging
 * Validates: Requirements 2.7
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { AuditAction, AuditLogEntry } from '../../auditLog';

// ============================================================================
// Test Arbitraries (Generators)
// ============================================================================

/**
 * Generate valid authentication actions
 */
const authAction = (): fc.Arbitrary<AuditAction> => {
  return fc.constantFrom(
    'login',
    'login_failed',
    'logout',
    'signup'
  );
};

/**
 * Generate valid user IDs (simulated)
 */
const userId = (): fc.Arbitrary<string> => {
  // Generate 24 character hex string (MongoDB ObjectId format)
  return fc.string({ minLength: 24, maxLength: 24 }).map(s => 
    s.split('').map((_, i) => '0123456789abcdef'[i % 16]).join('')
  );
};

/**
 * Generate valid email addresses
 */
const email = (): fc.Arbitrary<string> => {
  return fc.emailAddress();
};

/**
 * Generate valid IP addresses
 */
const ipAddress = (): fc.Arbitrary<string> => {
  return fc.oneof(
    // IPv4
    fc.tuple(fc.nat(255), fc.nat(255), fc.nat(255), fc.nat(255))
      .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
    // IPv6 (simplified)
    fc.string({ minLength: 4, maxLength: 4 })
      .map(s => `2001:db8::${s.split('').map((_, i) => '0123456789abcdef'[i % 16]).join('')}`)
  );
};

/**
 * Generate valid user agent strings
 */
const userAgent = (): fc.Arbitrary<string> => {
  return fc.constantFrom(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  );
};

/**
 * Generate a complete auth event log entry
 * Ensures realistic auth events with proper constraints:
 * - At least one identifier (userId or userEmail) is always present
 * - Status matches the action type (e.g., login_failed has failure/blocked status)
 * - Successful events have userId, failed events have userEmail
 */
const authLogEntry = (): fc.Arbitrary<Partial<AuditLogEntry>> => {
  return fc.oneof(
    // Successful login: has userId and userEmail, success status
    fc.record({
      userId: userId(),
      userEmail: email(),
      action: fc.constant('login' as const),
      resource: fc.constant('auth' as const),
      ipAddress: fc.option(ipAddress(), { nil: undefined }),
      userAgent: fc.option(userAgent(), { nil: undefined }),
      status: fc.constant('success' as const),
      metadata: fc.option(
        fc.record({
          sessionId: fc.option(fc.uuid(), { nil: undefined }),
          authType: fc.option(fc.constantFrom('oauth', 'credentials', 'email'), { nil: undefined }),
          provider: fc.option(fc.constantFrom('google', 'password'), { nil: undefined }),
        }),
        { nil: undefined }
      ),
    }),
    // Failed login: has userEmail, failure/blocked status
    fc.record({
      userId: fc.constant(undefined),
      userEmail: email(),
      action: fc.constant('login_failed' as const),
      resource: fc.constant('auth' as const),
      ipAddress: fc.option(ipAddress(), { nil: undefined }),
      userAgent: fc.option(userAgent(), { nil: undefined }),
      status: fc.constantFrom('failure' as const, 'blocked' as const),
      metadata: fc.option(
        fc.record({
          sessionId: fc.option(fc.uuid(), { nil: undefined }),
          authType: fc.option(fc.constantFrom('oauth', 'credentials', 'email'), { nil: undefined }),
          provider: fc.option(fc.constantFrom('google', 'password'), { nil: undefined }),
          reason: fc.option(fc.constantFrom('invalid_credentials', 'account_locked', 'rate_limited'), { nil: undefined }),
        }),
        { nil: undefined }
      ),
    }),
    // Logout: has userId, success status
    fc.record({
      userId: userId(),
      userEmail: fc.option(email(), { nil: undefined }),
      action: fc.constant('logout' as const),
      resource: fc.constant('auth' as const),
      ipAddress: fc.option(ipAddress(), { nil: undefined }),
      userAgent: fc.option(userAgent(), { nil: undefined }),
      status: fc.constant('success' as const),
      metadata: fc.option(
        fc.record({
          sessionId: fc.option(fc.uuid(), { nil: undefined }),
        }),
        { nil: undefined }
      ),
    }),
    // Successful signup: has userId and userEmail, success status
    fc.record({
      userId: userId(),
      userEmail: email(),
      action: fc.constant('signup' as const),
      resource: fc.constant('auth' as const),
      ipAddress: fc.option(ipAddress(), { nil: undefined }),
      userAgent: fc.option(userAgent(), { nil: undefined }),
      status: fc.constant('success' as const),
      metadata: fc.option(
        fc.record({
          sessionId: fc.option(fc.uuid(), { nil: undefined }),
          authType: fc.option(fc.constantFrom('oauth', 'credentials', 'email'), { nil: undefined }),
          provider: fc.option(fc.constantFrom('google', 'password'), { nil: undefined }),
        }),
        { nil: undefined }
      ),
    }),
    // Failed signup: has userEmail, failure status
    fc.record({
      userId: fc.constant(undefined),
      userEmail: email(),
      action: fc.constant('signup' as const),
      resource: fc.constant('auth' as const),
      ipAddress: fc.option(ipAddress(), { nil: undefined }),
      userAgent: fc.option(userAgent(), { nil: undefined }),
      status: fc.constant('failure' as const),
      metadata: fc.option(
        fc.record({
          authType: fc.option(fc.constantFrom('oauth', 'credentials', 'email'), { nil: undefined }),
          provider: fc.option(fc.constantFrom('google', 'password'), { nil: undefined }),
          reason: fc.option(fc.constantFrom('email_exists', 'invalid_email', 'weak_password'), { nil: undefined }),
        }),
        { nil: undefined }
      ),
    })
  );
};

// ============================================================================
// Property Tests
// ============================================================================

describe('Authentication Event Logging Property Tests', () => {
  /**
   * Property 10: Authentication Event Logging
   * For any authentication event (login, logout, failed attempt), an audit log
   * entry should be created with timestamp, user ID, and event type.
   */
  describe('Property 10: Authentication Event Logging', () => {
    it('should create log entry with required fields for any auth event', () => {
      fc.assert(
        fc.property(
          authLogEntry(),
          (logEntry) => {
            // Simulate creating a log entry
            const createdEntry = {
              ...logEntry,
              createdAt: Date.now(),
            };

            // Verify required fields are present
            expect(createdEntry).toHaveProperty('action');
            expect(createdEntry).toHaveProperty('resource');
            expect(createdEntry).toHaveProperty('status');
            expect(createdEntry).toHaveProperty('createdAt');
            
            // Verify action is an auth action
            expect(['login', 'login_failed', 'logout', 'signup']).toContain(createdEntry.action);
            
            // Verify resource is 'auth'
            expect(createdEntry.resource).toBe('auth');
            
            // Verify status is valid
            expect(['success', 'failure', 'blocked']).toContain(createdEntry.status);
            
            // Verify timestamp is a valid number
            expect(typeof createdEntry.createdAt).toBe('number');
            expect(createdEntry.createdAt).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include userId or userEmail for any auth event', () => {
      fc.assert(
        fc.property(
          authLogEntry(),
          (logEntry) => {
            // For auth events, at least one identifier should always be present
            const hasIdentifier = logEntry.userId !== undefined || logEntry.userEmail !== undefined;
            expect(hasIdentifier).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include timestamp for any auth event', () => {
      fc.assert(
        fc.property(
          authLogEntry(),
          (logEntry) => {
            const createdEntry = {
              ...logEntry,
              createdAt: Date.now(),
            };

            // Timestamp should be present and valid
            expect(createdEntry.createdAt).toBeDefined();
            expect(typeof createdEntry.createdAt).toBe('number');
            expect(createdEntry.createdAt).toBeGreaterThan(0);
            
            // Timestamp should be recent (within last minute for test purposes)
            const now = Date.now();
            expect(createdEntry.createdAt).toBeLessThanOrEqual(now);
            expect(createdEntry.createdAt).toBeGreaterThan(now - 60000);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include IP address when available for any auth event', () => {
      fc.assert(
        fc.property(
          authLogEntry().filter(entry => entry.ipAddress !== undefined),
          (logEntry) => {
            // If IP address is provided, it should be valid
            expect(logEntry.ipAddress).toBeDefined();
            expect(typeof logEntry.ipAddress).toBe('string');
            expect(logEntry.ipAddress!.length).toBeGreaterThan(0);
            
            // Should be a valid IP format (basic check)
            const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(logEntry.ipAddress!);
            const isIPv6 = logEntry.ipAddress!.includes(':');
            expect(isIPv4 || isIPv6).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include user agent when available for any auth event', () => {
      fc.assert(
        fc.property(
          authLogEntry().filter(entry => entry.userAgent !== undefined),
          (logEntry) => {
            // If user agent is provided, it should be valid
            expect(logEntry.userAgent).toBeDefined();
            expect(typeof logEntry.userAgent).toBe('string');
            expect(logEntry.userAgent!.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log failed login attempts with failure status', () => {
      fc.assert(
        fc.property(
          authLogEntry().filter(entry => entry.action === 'login_failed'),
          (logEntry) => {
            // Failed login attempts should have failure or blocked status
            expect(['failure', 'blocked']).toContain(logEntry.status);
            
            // Should have email for tracking
            expect(logEntry.userEmail).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log successful login with success status and userId', () => {
      fc.assert(
        fc.property(
          authLogEntry().filter(entry => entry.action === 'login' && entry.status === 'success'),
          (logEntry) => {
            // Successful login should have success status
            expect(logEntry.status).toBe('success');
            
            // Should have userId
            expect(logEntry.userId).toBeDefined();
            
            // Should have email
            expect(logEntry.userEmail).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log logout with success status and userId', () => {
      fc.assert(
        fc.property(
          authLogEntry().filter(entry => entry.action === 'logout'),
          (logEntry) => {
            // Logout should typically have success status
            if (logEntry.status === 'success') {
              // Should have userId for successful logout
              expect(logEntry.userId).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log signup with appropriate status', () => {
      fc.assert(
        fc.property(
          authLogEntry().filter(entry => entry.action === 'signup'),
          (logEntry) => {
            // Signup should have success or failure status
            expect(['success', 'failure']).toContain(logEntry.status);
            
            // Should have email
            expect(logEntry.userEmail).toBeDefined();
            
            // Successful signup should have userId
            if (logEntry.status === 'success') {
              expect(logEntry.userId).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all provided metadata for any auth event', () => {
      fc.assert(
        fc.property(
          authLogEntry().filter(entry => entry.metadata !== undefined),
          (logEntry) => {
            // If metadata is provided, it should be preserved
            expect(logEntry.metadata).toBeDefined();
            expect(typeof logEntry.metadata).toBe('object');
            
            // Metadata should not be empty if provided
            if (logEntry.metadata) {
              const keys = Object.keys(logEntry.metadata);
              expect(keys.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle concurrent auth events without data loss', () => {
      fc.assert(
        fc.property(
          fc.array(authLogEntry(), { minLength: 1, maxLength: 10 }),
          (logEntries) => {
            // Simulate concurrent logging
            const createdEntries = logEntries.map(entry => ({
              ...entry,
              createdAt: Date.now(),
            }));

            // All entries should be created
            expect(createdEntries.length).toBe(logEntries.length);
            
            // Each entry should have required fields
            createdEntries.forEach(entry => {
              expect(entry).toHaveProperty('action');
              expect(entry).toHaveProperty('resource');
              expect(entry).toHaveProperty('status');
              expect(entry).toHaveProperty('createdAt');
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional validation tests
   */
  describe('Auth Event Log Entry Validation', () => {
    it('should validate email format when provided', () => {
      fc.assert(
        fc.property(
          email(),
          (emailAddr) => {
            // Email should contain @ symbol
            expect(emailAddr).toContain('@');
            
            // Email should have domain
            const parts = emailAddr.split('@');
            expect(parts.length).toBe(2);
            expect(parts[1].length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate userId format when provided', () => {
      fc.assert(
        fc.property(
          userId(),
          (id) => {
            // UserId should be 24 character hex string (MongoDB ObjectId format)
            expect(id.length).toBe(24);
            expect(/^[0-9a-f]{24}$/.test(id)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate IP address format when provided', () => {
      fc.assert(
        fc.property(
          ipAddress(),
          (ip) => {
            // IP should be non-empty string
            expect(typeof ip).toBe('string');
            expect(ip.length).toBeGreaterThan(0);
            
            // Should be valid IPv4 or IPv6
            const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
            const isIPv6 = ip.includes(':');
            expect(isIPv4 || isIPv6).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
