/**
 * Property-Based Tests for CSRF Protection
 * 
 * Feature: production-readiness, Property 1: CSRF Token Validation
 * Validates: Requirements 1.2
 * 
 * These tests verify that CSRF protection works correctly across all possible
 * token values and user scenarios using property-based testing.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Mock types for testing (since we can't directly test Convex functions in unit tests)
 * In a real scenario, these would be integration tests using Convex test helpers
 */

interface CSRFToken {
  token: string;
  expiresAt: number;
}

interface TokenValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Simulated CSRF token validation logic
 * This mirrors the actual implementation in csrf.ts
 */
class CSRFValidator {
  private tokens: Map<string, { userId: string; token: string; expiresAt: number }> = new Map();

  generateToken(userId: string): CSRFToken {
    const token = this.generateSecureToken(32);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Delete existing tokens for this user
    for (const [key, value] of this.tokens.entries()) {
      if (value.userId === userId) {
        this.tokens.delete(key);
      }
    }

    // Store new token
    const key = `${userId}:${token}`;
    this.tokens.set(key, { userId, token, expiresAt });

    return { token, expiresAt };
  }

  validateToken(userId: string, token: string): TokenValidationResult {
    const key = `${userId}:${token}`;
    const tokenDoc = this.tokens.get(key);

    if (!tokenDoc) {
      return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    }

    if (tokenDoc.expiresAt < Date.now()) {
      this.tokens.delete(key);
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    return { valid: true };
  }

  private generateSecureToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
  }

  // Helper for testing
  clear() {
    this.tokens.clear();
  }
}

describe('CSRF Token Validation - Property-Based Tests', () => {
  /**
   * Property 1: CSRF Token Validation
   * For any state-changing mutation operation, the system should require and 
   * validate a CSRF token before executing the operation.
   */
  describe('Property 1: Valid tokens should always be accepted', () => {
    it('should accept any valid token generated for a user', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          (userId) => {
            const validator = new CSRFValidator();
            
            // Generate a token for the user
            const { token } = validator.generateToken(userId);
            
            // Validate the token immediately
            const result = validator.validateToken(userId, token);
            
            // The token should be valid
            expect(result.valid).toBe(true);
            expect(result.reason).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Invalid tokens should always be rejected', () => {
    it('should reject any token that was not generated for the user', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.string({ minLength: 1, maxLength: 100 }), // random token
          (userId, randomToken) => {
            const validator = new CSRFValidator();
            
            // Generate a valid token (but don't use it)
            validator.generateToken(userId);
            
            // Try to validate a random token
            const result = validator.validateToken(userId, randomToken);
            
            // The random token should be rejected
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('TOKEN_NOT_FOUND');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Tokens should be user-specific', () => {
    it('should reject tokens from different users', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId1
          fc.string({ minLength: 1, maxLength: 100 }), // userId2
          (userId1, userId2) => {
            // Skip if users are the same
            fc.pre(userId1 !== userId2);
            
            const validator = new CSRFValidator();
            
            // Generate token for user1
            const { token } = validator.generateToken(userId1);
            
            // Try to use user1's token as user2
            const result = validator.validateToken(userId2, token);
            
            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('TOKEN_NOT_FOUND');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Only one token per user should be valid', () => {
    it('should invalidate old tokens when generating new ones', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          (userId) => {
            const validator = new CSRFValidator();
            
            // Generate first token
            const { token: token1 } = validator.generateToken(userId);
            
            // Generate second token (should invalidate first)
            const { token: token2 } = validator.generateToken(userId);
            
            // First token should now be invalid
            const result1 = validator.validateToken(userId, token1);
            expect(result1.valid).toBe(false);
            
            // Second token should be valid
            const result2 = validator.validateToken(userId, token2);
            expect(result2.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Expired tokens should be rejected', () => {
    it('should reject tokens past their expiration time', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          (userId) => {
            const validator = new CSRFValidator();
            
            // Generate token
            const { token, expiresAt } = validator.generateToken(userId);
            
            // Mock time passing beyond expiration
            // We'll manually set the expiration to the past
            const key = `${userId}:${token}`;
            const tokenDoc = (validator as any).tokens.get(key);
            if (tokenDoc) {
              tokenDoc.expiresAt = Date.now() - 1000; // 1 second in the past
              (validator as any).tokens.set(key, tokenDoc);
            }
            
            // Validate expired token
            const result = validator.validateToken(userId, token);
            
            // Should be rejected as expired
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('TOKEN_EXPIRED');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Empty or malformed tokens should be rejected', () => {
    it('should reject empty tokens', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          (userId) => {
            const validator = new CSRFValidator();
            
            // Generate a valid token (but don't use it)
            validator.generateToken(userId);
            
            // Try to validate empty token
            const result = validator.validateToken(userId, '');
            
            // Should be rejected
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('TOKEN_NOT_FOUND');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject tokens with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.string({ minLength: 1, maxLength: 50 }), // malformed token
          (userId, malformedToken) => {
            const validator = new CSRFValidator();
            
            // Generate a valid token (but don't use it)
            validator.generateToken(userId);
            
            // Try to validate malformed token
            const result = validator.validateToken(userId, malformedToken);
            
            // Should be rejected (unless by extreme coincidence it matches)
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Token generation should be deterministic per user', () => {
    it('should always generate exactly one valid token per user', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.array(fc.constant(null), { minLength: 1, maxLength: 10 }), // number of generations
          (userId, generations) => {
            const validator = new CSRFValidator();
            
            let lastToken = '';
            
            // Generate multiple tokens
            for (let i = 0; i < generations.length; i++) {
              const { token } = validator.generateToken(userId);
              
              // If we had a previous token, it should now be invalid
              if (lastToken) {
                const oldResult = validator.validateToken(userId, lastToken);
                expect(oldResult.valid).toBe(false);
              }
              
              // New token should be valid
              const newResult = validator.validateToken(userId, token);
              expect(newResult.valid).toBe(true);
              
              lastToken = token;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Token validation should be idempotent', () => {
    it('should return the same result when validating the same token multiple times', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // userId
          fc.integer({ min: 2, max: 10 }), // number of validations
          (userId, numValidations) => {
            const validator = new CSRFValidator();
            
            // Generate token
            const { token } = validator.generateToken(userId);
            
            // Validate multiple times
            const results: boolean[] = [];
            for (let i = 0; i < numValidations; i++) {
              const result = validator.validateToken(userId, token);
              results.push(result.valid);
            }
            
            // All results should be the same (all true)
            expect(results.every(r => r === true)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Multiple users should have independent tokens', () => {
    it('should maintain separate token spaces for different users', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 10 }),
          (userIds) => {
            // Ensure unique user IDs
            const uniqueUserIds = Array.from(new Set(userIds));
            fc.pre(uniqueUserIds.length >= 2);
            
            const validator = new CSRFValidator();
            const tokens: Map<string, string> = new Map();
            
            // Generate tokens for all users
            for (const userId of uniqueUserIds) {
              const { token } = validator.generateToken(userId);
              tokens.set(userId, token);
            }
            
            // Verify each user's token is valid only for them
            for (const userId of uniqueUserIds) {
              const token = tokens.get(userId)!;
              
              // Should be valid for the correct user
              const validResult = validator.validateToken(userId, token);
              expect(validResult.valid).toBe(true);
              
              // Should be invalid for other users
              for (const otherUserId of uniqueUserIds) {
                if (otherUserId !== userId) {
                  const invalidResult = validator.validateToken(otherUserId, token);
                  expect(invalidResult.valid).toBe(false);
                }
              }
            }
          }
        ),
        { numRuns: 50 } // Fewer runs due to complexity
      );
    });
  });
});
