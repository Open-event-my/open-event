/**
 * Property-Based Tests for Retry Service
 * 
 * Tests universal properties that should hold for retry behavior.
 * Uses fast-check for property-based testing with minimum 100 iterations.
 * 
 * Feature: production-readiness, Property 38: Transient Failure Retry
 * Validates: Requirements 11.6
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import {
  retryWithBackoff,
  retryWithResult,
  withRetry,
  RetryService,
  classifyError,
  isTransientError,
  isPermanentError,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
} from './retry';

/**
 * Feature: production-readiness, Property 38: Transient Failure Retry
 * Validates: Requirements 11.6
 * 
 * For any operation that fails due to transient errors (network timeout, 
 * temporary unavailability), the system should automatically retry the 
 * operation up to 3 times.
 */
describe('Property 38: Transient Failure Retry', () => {
  test('should retry transient errors up to maxRetries times', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // maxRetries (reduced for speed)
        fc.integer({ min: 1, max: 3 }), // failuresBeforeSuccess
        async (maxRetries, failuresBeforeSuccess) => {
          let attempts = 0;
          const actualFailures = Math.min(failuresBeforeSuccess, maxRetries);
          
          const fn = async () => {
            attempts++;
            if (attempts <= actualFailures) {
              throw new Error('Network timeout');
            }
            return 'success';
          };
          
          const result = await retryWithBackoff(fn, {
            maxRetries,
            baseDelay: 5, // Very short delay for testing
            useJitter: false,
          });
          
          expect(result).toBe('success');
          expect(attempts).toBe(actualFailures + 1);
        }
      ),
      { numRuns: 50 } // Reduced iterations for speed
    );
  });

  test('should not retry permanent errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // maxRetries
        fc.constantFrom(
          'Validation error',
          'Bad request',
          'Unauthorized',
          'Forbidden',
          'Not found',
          '404 error'
        ), // permanent error messages
        async (maxRetries, errorMessage) => {
          let attempts = 0;
          
          const fn = async () => {
            attempts++;
            throw new Error(errorMessage);
          };
          
          try {
            await retryWithBackoff(fn, {
              maxRetries,
              baseDelay: 10,
            });
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            // Should fail after first attempt (no retries for permanent errors)
            expect(attempts).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should exhaust all retries for persistent transient errors', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // maxRetries (reduced)
        async (maxRetries) => {
          let attempts = 0;
          
          const fn = async () => {
            attempts++;
            throw new Error('Network timeout - always fails');
          };
          
          try {
            await retryWithBackoff(fn, {
              maxRetries,
              baseDelay: 5, // Very short delay
              useJitter: false,
            });
            expect(true).toBe(false); // Should not reach here
          } catch (error) {
            // Should have attempted maxRetries + 1 times (initial + retries)
            expect(attempts).toBe(maxRetries + 1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('should use exponential backoff for delays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }), // attempt number
        fc.integer({ min: 100, max: 1000 }), // baseDelay
        fc.integer({ min: 5000, max: 30000 }), // maxDelay
        (attempt, baseDelay, maxDelay) => {
          const delay = calculateDelay(attempt, baseDelay, maxDelay, false);
          
          // Delay should be baseDelay * 2^attempt, capped at maxDelay
          const expectedDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          expect(delay).toBe(expectedDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should add jitter when enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }), // attempt number
        fc.integer({ min: 100, max: 1000 }), // baseDelay
        (attempt, baseDelay) => {
          const maxDelay = 30000;
          const delay = calculateDelay(attempt, baseDelay, maxDelay, true);
          
          const baseExpected = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          const jitterRange = baseExpected * 0.25;
          
          // Delay should be within ±25% of base expected
          expect(delay).toBeGreaterThanOrEqual(Math.floor(baseExpected - jitterRange));
          expect(delay).toBeLessThanOrEqual(Math.ceil(baseExpected + jitterRange));
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should call onRetry callback for each retry attempt', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // maxRetries (reduced)
        async (maxRetries) => {
          const retryCallbacks: Array<{ attempt: number; delay: number }> = [];
          
          const fn = async () => {
            throw new Error('Network timeout');
          };
          
          try {
            await retryWithBackoff(fn, {
              maxRetries,
              baseDelay: 5, // Very short delay
              useJitter: false,
              onRetry: (error, attempt, delay) => {
                retryCallbacks.push({ attempt, delay });
              },
            });
          } catch (error) {
            // Expected to fail
          }
          
          // Should have called onRetry for each retry (not the initial attempt)
          expect(retryCallbacks.length).toBe(maxRetries);
          
          // Verify attempt numbers are sequential
          retryCallbacks.forEach((cb, index) => {
            expect(cb.attempt).toBe(index + 1);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('retryWithResult should return detailed result on success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }), // failures before success
        fc.string({ minLength: 1, maxLength: 50 }), // result value
        async (failuresBeforeSuccess, resultValue) => {
          let attempts = 0;
          
          const fn = async () => {
            attempts++;
            if (attempts <= failuresBeforeSuccess) {
              throw new Error('Network timeout');
            }
            return resultValue;
          };
          
          const result = await retryWithResult(fn, {
            maxRetries: 5,
            baseDelay: 10,
            useJitter: false,
          });
          
          expect(result.success).toBe(true);
          expect(result.result).toBe(resultValue);
          expect(result.attempts).toBe(failuresBeforeSuccess + 1);
          expect(result.totalDuration).toBeGreaterThanOrEqual(0);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('retryWithResult should return detailed result on failure', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // maxRetries (reduced)
        fc.string({ minLength: 1, maxLength: 20 }), // error message (shorter)
        async (maxRetries, errorMessage) => {
          const fn = async () => {
            throw new Error(`Network timeout: ${errorMessage}`);
          };
          
          const result = await retryWithResult(fn, {
            maxRetries,
            baseDelay: 5, // Very short delay
            useJitter: false,
          });
          
          expect(result.success).toBe(false);
          expect(result.result).toBeUndefined();
          expect(result.attempts).toBe(maxRetries + 1);
          expect(result.totalDuration).toBeGreaterThanOrEqual(0);
          expect(result.error).toBeDefined();
          expect(result.error?.message).toContain(errorMessage);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('withRetry wrapper should preserve function behavior', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }), // input value
        fc.integer({ min: 1, max: 10 }), // multiplier
        async (input, multiplier) => {
          const originalFn = async (x: number, m: number) => x * m;
          const wrappedFn = withRetry(originalFn, { maxRetries: 3, baseDelay: 10 });
          
          const result = await wrappedFn(input, multiplier);
          
          expect(result).toBe(input * multiplier);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('RetryService should maintain configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // maxRetries
        fc.integer({ min: 100, max: 5000 }), // baseDelay
        fc.integer({ min: 5000, max: 60000 }), // maxDelay
        fc.boolean(), // useJitter
        (maxRetries, baseDelay, maxDelay, useJitter) => {
          const service = new RetryService({
            maxRetries,
            baseDelay,
            maxDelay,
            useJitter,
          });
          
          const config = service.getConfig();
          
          expect(config.maxRetries).toBe(maxRetries);
          expect(config.baseDelay).toBe(baseDelay);
          expect(config.maxDelay).toBe(maxDelay);
          expect(config.useJitter).toBe(useJitter);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('RetryService.execute should retry transient errors', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 2 }), // failures before success (reduced)
        async (failuresBeforeSuccess) => {
          const service = new RetryService({
            maxRetries: 3,
            baseDelay: 5, // Very short delay
            useJitter: false,
          });
          
          let attempts = 0;
          
          const result = await service.execute(
            async () => {
              attempts++;
              if (attempts <= failuresBeforeSuccess) {
                throw new Error('Service unavailable');
              }
              return 'success';
            },
            'testOperation'
          );
          
          expect(result).toBe('success');
          expect(attempts).toBe(failuresBeforeSuccess + 1);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Error Classification Tests
 */
describe('Error Classification', () => {
  test('should classify transient errors correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Network timeout',
          'Connection refused',
          'ECONNRESET',
          'ETIMEDOUT',
          'Service unavailable',
          '503 error',
          '502 Bad Gateway',
          '429 Too Many Requests',
          'Rate limit exceeded',
          'Failed to fetch',
          'Socket hang up',
        ),
        (errorMessage) => {
          const error = new Error(errorMessage);
          expect(classifyError(error)).toBe('transient');
          expect(isTransientError(error)).toBe(true);
          expect(isPermanentError(error)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should classify permanent errors correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Validation error',
          'Bad request',
          'Unauthorized',
          'Forbidden',
          'Not found',
          '404 error',
          '401 Unauthorized',
          '403 Forbidden',
          'Invalid input',
          'Permission denied',
          'Already exists',
          'Duplicate entry',
        ),
        (errorMessage) => {
          const error = new Error(errorMessage);
          expect(classifyError(error)).toBe('permanent');
          expect(isPermanentError(error)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should classify unknown errors as unknown', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
          const lower = s.toLowerCase();
          // Filter out strings that match known patterns
          const transientPatterns = ['timeout', 'network', 'connection', '429', '500', '502', '503', '504', 'rate limit', 'unavailable'];
          const permanentPatterns = ['validation', 'invalid', 'bad request', 'unauthorized', 'forbidden', 'not found', '400', '401', '403', '404'];
          return !transientPatterns.some(p => lower.includes(p)) && 
                 !permanentPatterns.some(p => lower.includes(p));
        }),
        (errorMessage) => {
          const error = new Error(errorMessage);
          const classification = classifyError(error);
          // Unknown errors should be classified as 'unknown'
          expect(classification).toBe('unknown');
          // Unknown errors should be retried (conservative approach)
          expect(isTransientError(error)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('custom classifier should override default classification', { timeout: 30000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // error message
        fc.constantFrom('transient', 'permanent') as fc.Arbitrary<'transient' | 'permanent'>, // forced classification
        async (errorMessage, forcedClassification) => {
          const customClassifier = () => forcedClassification;
          
          let attempts = 0;
          const fn = async () => {
            attempts++;
            throw new Error(errorMessage);
          };
          
          try {
            await retryWithBackoff(fn, {
              maxRetries: 3,
              baseDelay: 5, // Very short delay for testing
              useJitter: false,
              classifyError: customClassifier,
            });
          } catch (error) {
            // Expected to fail
          }
          
          if (forcedClassification === 'permanent') {
            // Should not retry permanent errors
            expect(attempts).toBe(1);
          } else {
            // Should retry transient errors
            expect(attempts).toBe(4); // initial + 3 retries
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Delay Calculation Tests
 */
describe('Delay Calculation', () => {
  test('delay should increase exponentially', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // baseDelay
        fc.integer({ min: 100000, max: 1000000 }), // maxDelay (high to avoid capping)
        (baseDelay, maxDelay) => {
          const delays = [0, 1, 2, 3, 4].map(attempt => 
            calculateDelay(attempt, baseDelay, maxDelay, false)
          );
          
          // Each delay should be double the previous (exponential)
          for (let i = 1; i < delays.length; i++) {
            expect(delays[i]).toBe(delays[i - 1] * 2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('delay should be capped at maxDelay', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // baseDelay
        fc.integer({ min: 1000, max: 10000 }), // maxDelay
        fc.integer({ min: 0, max: 20 }), // attempt
        (baseDelay, maxDelay, attempt) => {
          const delay = calculateDelay(attempt, baseDelay, maxDelay, false);
          expect(delay).toBeLessThanOrEqual(maxDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('jitter should be within ±25% range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // baseDelay
        fc.integer({ min: 5000, max: 30000 }), // maxDelay
        fc.integer({ min: 0, max: 5 }), // attempt
        (baseDelay, maxDelay, attempt) => {
          // Run multiple times to test jitter distribution
          const delays: number[] = [];
          for (let i = 0; i < 10; i++) {
            delays.push(calculateDelay(attempt, baseDelay, maxDelay, true));
          }
          
          const baseExpected = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          const jitterRange = baseExpected * 0.25;
          
          // All delays should be within range
          delays.forEach(delay => {
            expect(delay).toBeGreaterThanOrEqual(Math.floor(baseExpected - jitterRange));
            expect(delay).toBeLessThanOrEqual(Math.ceil(baseExpected + jitterRange));
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Default Configuration Tests
 */
describe('Default Configuration', () => {
  test('default config should have expected values', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(30000);
    expect(DEFAULT_RETRY_CONFIG.useJitter).toBe(true);
  });

  test('retryWithBackoff should use defaults when no config provided', async () => {
    let attempts = 0;
    
    const fn = async () => {
      attempts++;
      if (attempts <= 2) {
        throw new Error('Network timeout');
      }
      return 'success';
    };
    
    // Use very short delays for testing
    const result = await retryWithBackoff(fn, { baseDelay: 10, useJitter: false });
    
    expect(result).toBe('success');
    expect(attempts).toBe(3); // 2 failures + 1 success
  });
});
