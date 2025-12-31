/**
 * Property-Based Tests for Request Size Validator
 * 
 * Feature: production-readiness, Property 3: Request Size Enforcement
 * Validates: Requirements 1.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateRequestSize,
  validateJsonSize,
  validateFileUploadSize,
  validateRequestSizeByContentType,
  createPayloadTooLargeResponse,
} from './requestSizeValidator';
import { REQUEST_SIZE_CONFIG } from './config';

/**
 * Helper to create a mock Request object with Content-Length header
 */
function createMockRequest(contentLength: number, contentType?: string): Request {
  const headers = new Headers();
  headers.set('Content-Length', contentLength.toString());
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  
  return new Request('https://example.com/api/test', {
    method: 'POST',
    headers,
    body: 'x'.repeat(Math.min(contentLength, 1000)), // Mock body
  });
}

describe('Request Size Validator - Property Tests', () => {
  /**
   * Property 3: Request Size Enforcement
   * For any incoming HTTP request, if the request size exceeds the configured limit,
   * the system should reject the request with a 413 status code.
   */
  describe('Property 3: Request Size Enforcement', () => {
    it('should reject all requests exceeding the maximum body size limit', () => {
      fc.assert(
        fc.property(
          // Generate request sizes that exceed the limit
          fc.integer({ min: REQUEST_SIZE_CONFIG.maxBodySize + 1, max: REQUEST_SIZE_CONFIG.maxBodySize * 2 }),
          (requestSize) => {
            const request = createMockRequest(requestSize);
            const result = validateRequestSize(request);
            
            // Verify the request is rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.size).toBe(requestSize);
            expect(result.limit).toBe(REQUEST_SIZE_CONFIG.maxBodySize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept all requests within the maximum body size limit', () => {
      fc.assert(
        fc.property(
          // Generate request sizes within the limit
          fc.integer({ min: 0, max: REQUEST_SIZE_CONFIG.maxBodySize }),
          (requestSize) => {
            const request = createMockRequest(requestSize);
            const result = validateRequestSize(request);
            
            // Verify the request is accepted
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject JSON payloads exceeding the JSON size limit', () => {
      fc.assert(
        fc.property(
          // Generate JSON payload sizes that exceed the JSON limit
          fc.integer({ min: REQUEST_SIZE_CONFIG.maxJsonSize + 1, max: REQUEST_SIZE_CONFIG.maxJsonSize * 2 }),
          (requestSize) => {
            const request = createMockRequest(requestSize, 'application/json');
            const result = validateJsonSize(request);
            
            // Verify the request is rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.size).toBe(requestSize);
            expect(result.limit).toBe(REQUEST_SIZE_CONFIG.maxJsonSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept JSON payloads within the JSON size limit', () => {
      fc.assert(
        fc.property(
          // Generate JSON payload sizes within the limit
          fc.integer({ min: 0, max: REQUEST_SIZE_CONFIG.maxJsonSize }),
          (requestSize) => {
            const request = createMockRequest(requestSize, 'application/json');
            const result = validateJsonSize(request);
            
            // Verify the request is accepted
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject file uploads exceeding the file upload size limit', () => {
      fc.assert(
        fc.property(
          // Generate file upload sizes that exceed the file limit
          fc.integer({ min: REQUEST_SIZE_CONFIG.maxFileSize + 1, max: REQUEST_SIZE_CONFIG.maxFileSize + 10 * 1024 * 1024 }),
          (requestSize) => {
            const request = createMockRequest(requestSize, 'multipart/form-data');
            const result = validateFileUploadSize(request);
            
            // Verify the request is rejected
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.size).toBe(requestSize);
            expect(result.limit).toBe(REQUEST_SIZE_CONFIG.maxFileSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept file uploads within the file upload size limit', () => {
      fc.assert(
        fc.property(
          // Generate file upload sizes within the limit
          fc.integer({ min: 0, max: REQUEST_SIZE_CONFIG.maxFileSize }),
          (requestSize) => {
            const request = createMockRequest(requestSize, 'multipart/form-data');
            const result = validateFileUploadSize(request);
            
            // Verify the request is accepted
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 413 status code for oversized requests', () => {
      fc.assert(
        fc.property(
          // Generate request sizes that exceed the limit
          fc.integer({ min: REQUEST_SIZE_CONFIG.maxBodySize + 1, max: REQUEST_SIZE_CONFIG.maxBodySize * 2 }),
          (requestSize) => {
            const request = createMockRequest(requestSize);
            const validation = validateRequestSize(request);
            
            // Create the 413 response
            const response = createPayloadTooLargeResponse(validation);
            
            // Verify the response has 413 status
            expect(response.status).toBe(413);
            expect(response.headers.get('Content-Type')).toBe('application/json');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate by content type correctly for all content types', () => {
      fc.assert(
        fc.property(
          // Generate various content types and sizes
          fc.record({
            contentType: fc.constantFrom(
              'application/json',
              'multipart/form-data',
              'text/plain',
              'application/xml',
              'application/octet-stream'
            ),
            size: fc.integer({ min: 0, max: REQUEST_SIZE_CONFIG.maxFileSize + 1024 * 1024 }),
          }),
          ({ contentType, size }) => {
            const request = createMockRequest(size, contentType);
            const result = validateRequestSizeByContentType(request);
            
            // Determine expected limit based on content type
            let expectedLimit: number;
            if (contentType === 'application/json') {
              expectedLimit = REQUEST_SIZE_CONFIG.maxJsonSize;
            } else if (contentType === 'multipart/form-data') {
              expectedLimit = REQUEST_SIZE_CONFIG.maxFileSize;
            } else {
              expectedLimit = REQUEST_SIZE_CONFIG.maxBodySize;
            }
            
            // Verify validation result matches expected limit
            if (size > expectedLimit) {
              expect(result.valid).toBe(false);
              expect(result.limit).toBe(expectedLimit);
            } else {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle requests without Content-Length header gracefully', () => {
      fc.assert(
        fc.property(
          // Generate various content types
          fc.constantFrom(
            'application/json',
            'multipart/form-data',
            'text/plain',
            undefined
          ),
          (contentType) => {
            // Create request without Content-Length header
            const headers = new Headers();
            if (contentType) {
              headers.set('Content-Type', contentType);
            }
            
            const request = new Request('https://example.com/api/test', {
              method: 'POST',
              headers,
              body: 'test',
            });
            
            const result = validateRequestSize(request);
            
            // Should be valid when no Content-Length header is present
            // (validation will happen during body parsing)
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject requests with invalid Content-Length values', () => {
      fc.assert(
        fc.property(
          // Generate invalid Content-Length values (excluding empty string which is treated as no header)
          fc.constantFrom('-1', 'abc', 'NaN', '1.5'),
          (invalidContentLength) => {
            const headers = new Headers();
            headers.set('Content-Length', invalidContentLength);
            
            const request = new Request('https://example.com/api/test', {
              method: 'POST',
              headers,
              body: 'test',
            });
            
            const result = validateRequestSize(request);
            
            // Should reject invalid Content-Length values
            const parsedValue = parseInt(invalidContentLength, 10);
            if (isNaN(parsedValue) || parsedValue < 0) {
              expect(result.valid).toBe(false);
              expect(result.error).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include size and limit information in error responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate request sizes that exceed the limit
          fc.integer({ min: REQUEST_SIZE_CONFIG.maxBodySize + 1, max: REQUEST_SIZE_CONFIG.maxBodySize * 2 }),
          async (requestSize) => {
            const request = createMockRequest(requestSize);
            const validation = validateRequestSize(request);
            const response = createPayloadTooLargeResponse(validation);
            
            // Parse response body
            const body = await response.json();
            
            // Verify error details include size and limit
            expect(body.success).toBe(false);
            expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
            expect(body.error.details.size).toBe(requestSize);
            expect(body.error.details.limit).toBe(REQUEST_SIZE_CONFIG.maxBodySize);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Test exact limit
      const exactLimitRequest = createMockRequest(REQUEST_SIZE_CONFIG.maxBodySize);
      const exactResult = validateRequestSize(exactLimitRequest);
      expect(exactResult.valid).toBe(true);
      
      // Test one byte over limit
      const overLimitRequest = createMockRequest(REQUEST_SIZE_CONFIG.maxBodySize + 1);
      const overResult = validateRequestSize(overLimitRequest);
      expect(overResult.valid).toBe(false);
      
      // Test zero size
      const zeroRequest = createMockRequest(0);
      const zeroResult = validateRequestSize(zeroRequest);
      expect(zeroResult.valid).toBe(true);
    });

    it('should handle custom size limits', () => {
      const customLimit = 5 * 1024 * 1024; // 5MB
      
      // Within custom limit
      const withinRequest = createMockRequest(customLimit - 1);
      const withinResult = validateRequestSize(withinRequest, customLimit);
      expect(withinResult.valid).toBe(true);
      
      // Over custom limit
      const overRequest = createMockRequest(customLimit + 1);
      const overResult = validateRequestSize(overRequest, customLimit);
      expect(overResult.valid).toBe(false);
      expect(overResult.limit).toBe(customLimit);
    });
  });
});
