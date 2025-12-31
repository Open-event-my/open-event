/**
 * Resilience Testing Script
 * 
 * Comprehensive testing of all resilience features:
 * - Backup creation and restoration
 * - Circuit breaker behavior
 * - AI fallbacks and retries
 * - Failure simulation and recovery
 * 
 * This script validates that all resilience systems work correctly
 * under various failure scenarios.
 */

import { BackupService } from '../convex/lib/resilience/backup';
import { CircuitBreaker, createAICircuitBreaker } from '../convex/lib/resilience/circuitBreaker';
import { AIResilienceService } from '../convex/lib/resilience/aiResilience';
import type { AIConfig } from '../convex/lib/resilience/aiResilience';
import type { AIMessage } from '../convex/lib/ai/types';

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, duration?: number) {
  results.push({
    name,
    passed,
    error,
    duration: duration || 0,
  });
  
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}${duration ? ` (${duration}ms)` : ''}`);
  if (error) {
    console.log(`  Error: ${error}`);
  }
}

// ============================================================================
// Backup System Tests
// ============================================================================

async function testBackupCreation() {
  const startTime = Date.now();
  try {
    const service = new BackupService({ retention: 30, encryption: true });
    const backup = await service.createBackup();
    
    // Verify backup metadata
    if (!backup.id || !backup.timestamp || !backup.checksum) {
      throw new Error('Backup missing required metadata');
    }
    
    if (backup.status !== 'completed') {
      throw new Error(`Backup status is ${backup.status}, expected completed`);
    }
    
    if (!backup.encrypted) {
      throw new Error('Backup should be encrypted');
    }
    
    logTest('Backup Creation', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Backup Creation', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testBackupRetention() {
  const startTime = Date.now();
  try {
    const retentionDays = 30;
    const service = new BackupService({ retention: retentionDays });
    const backup = await service.createBackup();
    
    // Calculate expected expiration
    const expectedExpiration = backup.timestamp + retentionDays * 24 * 60 * 60 * 1000;
    const actualExpiration = backup.expiresAt;
    
    // Allow 1 second tolerance
    if (Math.abs(actualExpiration - expectedExpiration) > 1000) {
      throw new Error(`Backup expiration mismatch: expected ${expectedExpiration}, got ${actualExpiration}`);
    }
    
    logTest('Backup Retention Period', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Backup Retention Period', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testBackupEncryption() {
  const startTime = Date.now();
  try {
    const service = new BackupService({ encryption: true });
    const backup = await service.createBackup();
    
    if (!backup.encrypted) {
      throw new Error('Backup should be marked as encrypted');
    }
    
    if (!backup.location.endsWith('.enc')) {
      throw new Error('Encrypted backup should have .enc extension');
    }
    
    logTest('Backup Encryption', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Backup Encryption', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testBackupRestoration() {
  const startTime = Date.now();
  try {
    const service = new BackupService({ retention: 30, encryption: true });
    const backup = await service.createBackup();
    
    // Attempt restoration (will fail without database context, but should validate)
    try {
      await service.restoreBackup(backup.id);
      throw new Error('Restoration should fail without database context');
    } catch (error) {
      // Expected to fail with specific error
      if (!(error as Error).message.match(/requires database context|storage/i)) {
        throw error;
      }
    }
    
    logTest('Backup Restoration Validation', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Backup Restoration Validation', false, (error as Error).message, Date.now() - startTime);
  }
}

// ============================================================================
// Circuit Breaker Tests
// ============================================================================

async function testCircuitBreakerOpening() {
  const startTime = Date.now();
  try {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
      name: 'test-breaker',
    });
    
    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Simulated failure');
        });
      } catch (error) {
        // Expected
      }
    }
    
    // Circuit should be open
    if (breaker.getState() !== 'open') {
      throw new Error(`Circuit state is ${breaker.getState()}, expected open`);
    }
    
    if (!breaker.isOpen()) {
      throw new Error('Circuit should be open');
    }
    
    logTest('Circuit Breaker Opening', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Circuit Breaker Opening', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testCircuitBreakerRejection() {
  const startTime = Date.now();
  try {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 5000,
      name: 'test-breaker',
    });
    
    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch (error) {
        // Expected
      }
    }
    
    // Next request should be rejected immediately
    const requestStart = Date.now();
    try {
      await breaker.execute(async () => {
        return 'success';
      });
      throw new Error('Request should have been rejected');
    } catch (error: any) {
      const duration = Date.now() - requestStart;
      
      // Should fail immediately (within 50ms)
      if (duration > 50) {
        throw new Error(`Request took ${duration}ms, should be immediate`);
      }
      
      if (error.code !== 'CIRCUIT_BREAKER_OPEN') {
        throw new Error(`Wrong error code: ${error.code}`);
      }
    }
    
    logTest('Circuit Breaker Rejection', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Circuit Breaker Rejection', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testCircuitBreakerRecovery() {
  const startTime = Date.now();
  try {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      timeout: 200, // Short timeout for testing
      name: 'test-breaker',
    });
    
    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch (error) {
        // Expected
      }
    }
    
    if (breaker.getState() !== 'open') {
      throw new Error('Circuit should be open');
    }
    
    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Execute successful requests to close circuit
    for (let i = 0; i < 2; i++) {
      await breaker.execute(async () => {
        return 'success';
      });
    }
    
    // Circuit should be closed
    if (breaker.getState() !== 'closed') {
      throw new Error(`Circuit state is ${breaker.getState()}, expected closed`);
    }
    
    logTest('Circuit Breaker Recovery', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Circuit Breaker Recovery', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testAICircuitBreaker() {
  const startTime = Date.now();
  try {
    const breaker = createAICircuitBreaker('OpenAI');
    
    // Should start closed
    if (breaker.getState() !== 'closed') {
      throw new Error('AI circuit breaker should start closed');
    }
    
    // Trigger 5 failures (AI-specific threshold)
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('AI failure');
        });
      } catch (error) {
        // Expected
      }
    }
    
    // Should be open after 5 failures
    if (breaker.getState() !== 'open') {
      throw new Error('AI circuit breaker should be open after 5 failures');
    }
    
    logTest('AI Circuit Breaker Configuration', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('AI Circuit Breaker Configuration', false, (error as Error).message, Date.now() - startTime);
  }
}

// ============================================================================
// AI Resilience Tests
// ============================================================================

async function testAIFallback() {
  const startTime = Date.now();
  try {
    const credentials = {
      openai: 'test-key',
      anthropic: 'test-key',
      groq: 'test-key',
    };
    
    const service = new AIResilienceService(credentials, {
      defaultTimeout: 5000,
      maxRetries: 1,
      baseDelay: 100,
      cacheTTL: 60000,
      enableCaching: false,
      enableFallback: true,
      validateResponses: true,
    });
    
    const config: AIConfig = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      timeout: 1000,
      maxRetries: 1,
    };
    
    const messages: AIMessage[] = [
      { role: 'user', content: 'Test message' },
    ];
    
    // This will fail because we don't have real API keys
    // but it should return a fallback response
    const response = await service.callWithFallback(messages, [], config);
    
    if (!response) {
      throw new Error('Should return fallback response');
    }
    
    if (!response.content) {
      throw new Error('Fallback response should have content');
    }
    
    if (response.provider !== 'fallback') {
      throw new Error(`Provider should be 'fallback', got '${response.provider}'`);
    }
    
    logTest('AI Fallback on Unavailability', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('AI Fallback on Unavailability', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testAIResponseValidation() {
  const startTime = Date.now();
  try {
    const credentials = {
      openai: 'test-key',
      anthropic: 'test-key',
      groq: 'test-key',
    };
    
    const service = new AIResilienceService(credentials);
    
    // Test various response validations
    const testCases = [
      { content: '', expected: false, name: 'empty string' },
      { content: '   ', expected: false, name: 'whitespace only' },
      { content: 'error', expected: false, name: 'short error message' },
      { content: 'Valid response content', expected: true, name: 'valid content' },
      { content: 'A longer response that should be valid because it has enough content', expected: true, name: 'long valid content' },
    ];
    
    for (const testCase of testCases) {
      const isValid = (service as any).validateResponse(testCase.content);
      if (isValid !== testCase.expected) {
        throw new Error(`Validation failed for ${testCase.name}: expected ${testCase.expected}, got ${isValid}`);
      }
    }
    
    logTest('AI Response Validation', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('AI Response Validation', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testAIRetryBackoff() {
  const startTime = Date.now();
  try {
    const credentials = {
      openai: 'test-key',
      anthropic: 'test-key',
      groq: 'test-key',
    };
    
    const service = new AIResilienceService(credentials, {
      defaultTimeout: 5000,
      maxRetries: 3,
      baseDelay: 100,
      cacheTTL: 60000,
      enableCaching: false,
      enableFallback: false,
      validateResponses: false,
    });
    
    let attemptCount = 0;
    const failingFn = async () => {
      attemptCount++;
      throw new Error('Network timeout');
    };
    
    try {
      await service.retryWithBackoff(failingFn, 3);
    } catch (error) {
      // Expected to fail
    }
    
    // Should have attempted 3 times
    if (attemptCount !== 3) {
      throw new Error(`Expected 3 attempts, got ${attemptCount}`);
    }
    
    logTest('AI Retry with Exponential Backoff', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('AI Retry with Exponential Backoff', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testAITimeout() {
  const startTime = Date.now();
  try {
    const credentials = {
      openai: 'test-key',
      anthropic: 'test-key',
      groq: 'test-key',
    };
    
    const service = new AIResilienceService(credentials);
    
    const timeout = 200;
    const executionTime = 500;
    
    const slowFn = async () => {
      await new Promise(resolve => setTimeout(resolve, executionTime));
      return 'result';
    };
    
    const requestStart = Date.now();
    
    try {
      await (service as any).executeWithTimeout(slowFn, timeout);
      throw new Error('Should have timed out');
    } catch (error) {
      const elapsed = Date.now() - requestStart;
      
      if (!(error as Error).message.includes('timeout')) {
        throw new Error(`Wrong error: ${(error as Error).message}`);
      }
      
      // Should timeout close to configured timeout
      if (elapsed < timeout || elapsed > timeout + 200) {
        throw new Error(`Timeout took ${elapsed}ms, expected ~${timeout}ms`);
      }
    }
    
    logTest('AI Request Timeout', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('AI Request Timeout', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testAICaching() {
  const startTime = Date.now();
  try {
    const credentials = {
      openai: 'test-key',
      anthropic: 'test-key',
      groq: 'test-key',
    };
    
    const service = new AIResilienceService(credentials);
    
    const prompt = 'Test prompt for caching';
    const config: AIConfig = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      timeout: 5000,
      maxRetries: 3,
    };
    
    const response = {
      content: 'Test response',
      provider: 'openai',
      cached: false,
    };
    
    // Cache the response
    service.cacheResponse(prompt, config, response);
    
    // Retrieve from cache
    const cachedResponse = service.getCachedResponse(prompt, config);
    
    if (!cachedResponse) {
      throw new Error('Should return cached response');
    }
    
    if (cachedResponse.content !== response.content) {
      throw new Error('Cached content mismatch');
    }
    
    // Different prompt should not hit cache
    const notCached = service.getCachedResponse('Different prompt', config);
    if (notCached !== null) {
      throw new Error('Different prompt should not hit cache');
    }
    
    logTest('AI Response Caching', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('AI Response Caching', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testTransientErrorDetection() {
  const startTime = Date.now();
  try {
    const credentials = {
      openai: 'test-key',
      anthropic: 'test-key',
      groq: 'test-key',
    };
    
    const service = new AIResilienceService(credentials);
    
    const transientErrors = [
      'timeout',
      'network error',
      'ECONNRESET',
      'rate limit exceeded',
      '503 Service Unavailable',
    ];
    
    const nonTransientErrors = [
      'Invalid API key',
      'Authentication failed',
      'Permission denied',
    ];
    
    // Test transient errors
    for (const errorMsg of transientErrors) {
      const error = new Error(errorMsg);
      const isTransient = (service as any).isTransientError(error);
      if (!isTransient) {
        throw new Error(`${errorMsg} should be transient`);
      }
    }
    
    // Test non-transient errors
    for (const errorMsg of nonTransientErrors) {
      const error = new Error(errorMsg);
      const isTransient = (service as any).isTransientError(error);
      if (isTransient) {
        throw new Error(`${errorMsg} should not be transient`);
      }
    }
    
    logTest('Transient Error Detection', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Transient Error Detection', false, (error as Error).message, Date.now() - startTime);
  }
}

// ============================================================================
// Failure Simulation Tests
// ============================================================================

async function testConcurrentFailures() {
  const startTime = Date.now();
  try {
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 5000,
      name: 'concurrent-test',
    });
    
    // Simulate concurrent failures
    const failures = Array.from({ length: 10 }, (_, i) =>
      breaker.execute(async () => {
        if (i < 5) {
          throw new Error('Failure');
        }
        return 'success';
      }).catch(() => null)
    );
    
    await Promise.all(failures);
    
    // Circuit should be open after 5 failures
    if (breaker.getState() !== 'open') {
      throw new Error('Circuit should be open after concurrent failures');
    }
    
    logTest('Concurrent Failure Handling', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Concurrent Failure Handling', false, (error as Error).message, Date.now() - startTime);
  }
}

async function testRecoveryAfterFailures() {
  const startTime = Date.now();
  try {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 200,
      name: 'recovery-test',
    });
    
    // Cause failures
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch (error) {
        // Expected
      }
    }
    
    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Recover with successes
    for (let i = 0; i < 2; i++) {
      await breaker.execute(async () => {
        return 'success';
      });
    }
    
    // Should be closed and functional
    const result = await breaker.execute(async () => {
      return 'final-success';
    });
    
    if (result !== 'final-success') {
      throw new Error('Circuit should be functional after recovery');
    }
    
    logTest('Recovery After Failures', true, undefined, Date.now() - startTime);
  } catch (error) {
    logTest('Recovery After Failures', false, (error as Error).message, Date.now() - startTime);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n🧪 Running Resilience Tests\n');
  console.log('=' .repeat(60));
  
  console.log('\n📦 Backup System Tests');
  console.log('-'.repeat(60));
  await testBackupCreation();
  await testBackupRetention();
  await testBackupEncryption();
  await testBackupRestoration();
  
  console.log('\n⚡ Circuit Breaker Tests');
  console.log('-'.repeat(60));
  await testCircuitBreakerOpening();
  await testCircuitBreakerRejection();
  await testCircuitBreakerRecovery();
  await testAICircuitBreaker();
  
  console.log('\n🤖 AI Resilience Tests');
  console.log('-'.repeat(60));
  await testAIFallback();
  await testAIResponseValidation();
  await testAIRetryBackoff();
  await testAITimeout();
  await testAICaching();
  await testTransientErrorDetection();
  
  console.log('\n💥 Failure Simulation Tests');
  console.log('-'.repeat(60));
  await testConcurrentFailures();
  await testRecoveryAfterFailures();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\nTotal: ${total}`);
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${failed}\x1b[0m`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      if (r.error) {
        console.log(`    ${r.error}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});
