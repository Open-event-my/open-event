/**
 * Property-Based Tests for Structured Logger
 * 
 * Feature: production-readiness, Property 7: Structured Log Format
 * Validates: Requirements 2.2
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { StructuredLogger, type LogLevel, type LogEntry } from './logger';

describe('StructuredLogger - Property Tests', () => {
  /**
   * Property 7: Structured Log Format
   * For any log entry created by the system, it should contain the required fields:
   * level, message, timestamp, and context object.
   */
  test('all log entries contain required fields (level, message, timestamp, context)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<LogLevel>('debug', 'info', 'warn', 'error'),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
        (level, message, context) => {
          const logger = new StructuredLogger();
          
          // Create log entry using the appropriate method
          let entry: LogEntry;
          switch (level) {
            case 'debug':
              entry = logger.createEntry('debug', message, context || {});
              break;
            case 'info':
              entry = logger.createEntry('info', message, context || {});
              break;
            case 'warn':
              entry = logger.createEntry('warn', message, context || {});
              break;
            case 'error':
              entry = logger.createEntry('error', message, context || {});
              break;
          }
          
          // Verify all required fields are present
          expect(entry).toHaveProperty('level');
          expect(entry).toHaveProperty('message');
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('context');
          
          // Verify field types
          expect(typeof entry.level).toBe('string');
          expect(typeof entry.message).toBe('string');
          expect(typeof entry.timestamp).toBe('number');
          expect(typeof entry.context).toBe('object');
          
          // Verify level is one of the valid values
          expect(['debug', 'info', 'warn', 'error']).toContain(entry.level);
          
          // Verify timestamp is a valid timestamp
          expect(entry.timestamp).toBeGreaterThan(0);
          expect(entry.timestamp).toBeLessThanOrEqual(Date.now());
          
          // Verify message matches input
          expect(entry.message).toBe(message);
          
          // Verify level matches input
          expect(entry.level).toBe(level);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('log entries with userId include userId field', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<LogLevel>('debug', 'info', 'warn', 'error'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (level, message, userId) => {
          const logger = new StructuredLogger();
          const entry = logger.createEntry(level, message, { userId });
          
          // Verify userId is present and matches
          expect(entry.userId).toBe(userId);
          expect(entry.context).toHaveProperty('userId', userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('log entries with requestId include requestId field', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<LogLevel>('debug', 'info', 'warn', 'error'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (level, message, requestId) => {
          const logger = new StructuredLogger();
          const entry = logger.createEntry(level, message, { requestId });
          
          // Verify requestId is present and matches
          expect(entry.requestId).toBe(requestId);
          expect(entry.context).toHaveProperty('requestId', requestId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('child loggers inherit parent context', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), fc.string()),
        fc.dictionary(fc.string(), fc.string()),
        fc.string({ minLength: 1, maxLength: 100 }),
        (parentContext, childContext, message) => {
          const parentLogger = new StructuredLogger(parentContext);
          const childLogger = parentLogger.child(childContext);
          
          const entry = childLogger.createEntry('info', message, {});
          
          // Verify parent context is present (unless overridden by child)
          Object.keys(parentContext).forEach(key => {
            // If child context has the same key, it should override parent
            if (key in childContext) {
              expect(entry.context).toHaveProperty(key, childContext[key]);
            } else {
              expect(entry.context).toHaveProperty(key, parentContext[key]);
            }
          });
          
          // Verify all child context is present
          Object.keys(childContext).forEach(key => {
            expect(entry.context).toHaveProperty(key, childContext[key]);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('error logs include error information in context', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        (message, errorName, errorMessage) => {
          const logger = new StructuredLogger();
          const error = new Error(errorMessage);
          error.name = errorName;
          
          const entry = logger.createEntry('error', message, { error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }});
          
          // Verify error information is in context
          expect(entry.context).toHaveProperty('error');
          const errorContext = entry.context.error as any;
          expect(errorContext).toHaveProperty('name', errorName);
          expect(errorContext).toHaveProperty('message', errorMessage);
          expect(errorContext).toHaveProperty('stack');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('context is always an object, never null or undefined', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<LogLevel>('debug', 'info', 'warn', 'error'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
        (level, message, context) => {
          const logger = new StructuredLogger();
          const entry = logger.createEntry(level, message, context || undefined);
          
          // Verify context is always an object
          expect(entry.context).toBeDefined();
          expect(entry.context).not.toBeNull();
          expect(typeof entry.context).toBe('object');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('timestamps are monotonically increasing for sequential logs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 10 }),
        (messages) => {
          const logger = new StructuredLogger();
          const entries = messages.map(msg => logger.createEntry('info', msg, {}));
          
          // Verify timestamps are in order (allowing for same timestamp due to speed)
          for (let i = 1; i < entries.length; i++) {
            expect(entries[i].timestamp).toBeGreaterThanOrEqual(entries[i - 1].timestamp);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('log level is preserved exactly as provided', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<LogLevel>('debug', 'info', 'warn', 'error'),
        fc.string({ minLength: 1, maxLength: 100 }),
        (level, message) => {
          const logger = new StructuredLogger();
          const entry = logger.createEntry(level, message, {});
          
          // Verify level is exactly as provided (no transformation)
          expect(entry.level).toBe(level);
        }
      ),
      { numRuns: 100 }
    );
  });
});
