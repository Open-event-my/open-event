/**
 * Request Size Validator
 * 
 * Middleware to enforce request size limits and prevent DoS attacks
 * through oversized payloads.
 */

import { REQUEST_SIZE_CONFIG } from './config';

/**
 * Request size validation result
 */
export interface RequestSizeValidationResult {
  valid: boolean;
  error?: string;
  size?: number;
  limit?: number;
}

/**
 * Validate request size based on Content-Length header
 * 
 * @param request - The HTTP request to validate
 * @param maxSize - Maximum allowed size in bytes (defaults to config)
 * @returns Validation result with error details if invalid
 */
export function validateRequestSize(
  request: Request,
  maxSize: number = REQUEST_SIZE_CONFIG.maxBodySize
): RequestSizeValidationResult {
  const contentLength = request.headers.get('Content-Length');
  
  // If no Content-Length header, we can't validate size upfront
  // The body will be read and validated during parsing
  if (!contentLength) {
    return {
      valid: true,
    };
  }
  
  const size = parseInt(contentLength, 10);
  
  // Check if Content-Length is a valid number
  if (isNaN(size) || size < 0) {
    return {
      valid: false,
      error: 'Invalid Content-Length header',
    };
  }
  
  // Check if size exceeds limit
  if (size > maxSize) {
    return {
      valid: false,
      error: `Request body too large. Maximum size is ${formatBytes(maxSize)}, received ${formatBytes(size)}`,
      size,
      limit: maxSize,
    };
  }
  
  return {
    valid: true,
    size,
    limit: maxSize,
  };
}

/**
 * Validate JSON payload size
 * 
 * @param request - The HTTP request to validate
 * @returns Validation result
 */
export function validateJsonSize(request: Request): RequestSizeValidationResult {
  const contentType = request.headers.get('Content-Type');
  
  // Only validate JSON payloads
  if (!contentType || !contentType.includes('application/json')) {
    return { valid: true };
  }
  
  return validateRequestSize(request, REQUEST_SIZE_CONFIG.maxJsonSize);
}

/**
 * Validate file upload size
 * 
 * @param request - The HTTP request to validate
 * @returns Validation result
 */
export function validateFileUploadSize(request: Request): RequestSizeValidationResult {
  const contentType = request.headers.get('Content-Type');
  
  // Only validate multipart/form-data (file uploads)
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return { valid: true };
  }
  
  return validateRequestSize(request, REQUEST_SIZE_CONFIG.maxFileSize);
}

/**
 * Create a 413 Payload Too Large response
 * 
 * @param validationResult - The validation result with error details
 * @param corsHeaders - Optional CORS headers to include
 * @returns HTTP Response with 413 status
 */
export function createPayloadTooLargeResponse(
  validationResult: RequestSizeValidationResult,
  corsHeaders?: Record<string, string>
): Response {
  const body = {
    success: false,
    error: {
      code: 'PAYLOAD_TOO_LARGE',
      message: validationResult.error || 'Request body exceeds maximum allowed size',
      details: {
        size: validationResult.size,
        limit: validationResult.limit,
        maxSizeFormatted: validationResult.limit ? formatBytes(validationResult.limit) : undefined,
      },
    },
  };
  
  return new Response(JSON.stringify(body), {
    status: 413,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Format bytes to human-readable string
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Middleware wrapper to validate request size before processing
 * 
 * @param request - The HTTP request
 * @param handler - The request handler function
 * @param maxSize - Optional custom max size
 * @param corsHeaders - Optional CORS headers
 * @returns Response from handler or 413 error
 */
export async function withRequestSizeValidation(
  request: Request,
  handler: () => Promise<Response>,
  maxSize?: number,
  corsHeaders?: Record<string, string>
): Promise<Response> {
  // Validate request size
  const validation = validateRequestSize(request, maxSize);
  
  if (!validation.valid) {
    return createPayloadTooLargeResponse(validation, corsHeaders);
  }
  
  // Proceed with handler
  return handler();
}

/**
 * Validate request size for specific content types
 * 
 * @param request - The HTTP request
 * @returns Validation result based on content type
 */
export function validateRequestSizeByContentType(request: Request): RequestSizeValidationResult {
  const contentType = request.headers.get('Content-Type');
  
  if (!contentType) {
    // No content type, use default validation
    return validateRequestSize(request);
  }
  
  // JSON payloads have stricter limits
  if (contentType.includes('application/json')) {
    return validateJsonSize(request);
  }
  
  // File uploads have higher limits
  if (contentType.includes('multipart/form-data')) {
    return validateFileUploadSize(request);
  }
  
  // Default validation for other content types
  return validateRequestSize(request);
}
