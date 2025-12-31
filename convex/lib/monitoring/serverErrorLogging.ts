/**
 * Server-Side Error Logging Service
 *
 * Provides detailed error logging for server-side operations with:
 * - Full stack traces for debugging
 * - User context (userId, requestId)
 * - Sensitive data filtering for client responses
 * - Integration with Sentry for production monitoring
 *
 * Requirements: 11.5
 * Property 37: Server-Side Error Logging
 */

import { captureError as sentryCaptureError } from '../sentry';
import { logger, type LogLevel } from './logger';

/**
 * Sensitive data patterns that should never be logged or exposed
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth[_-]?key/i,
  /private[_-]?key/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /ssn/i,
  /social[_-]?security/i,
  /bearer\s+[a-zA-Z0-9._-]+/i,
  /jwt/i,
];

/**
 * Fields that should be redacted from logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authKey',
  'auth_key',
  'privateKey',
  'private_key',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'ssn',
  'socialSecurity',
  'social_security',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionToken',
  'session_token',
  'authorization',
  'cookie',
];

/**
 * Server error log entry with full details for debugging
 */
export interface ServerErrorLogEntry {
  /** Error message */
  message: string;
  /** Full stack trace */
  stackTrace?: string;
  /** Error name/type */
  errorName: string;
  /** User ID if available */
  userId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Timestamp of the error */
  timestamp: number;
  /** Additional context */
  context: Record<string, unknown>;
  /** Error severity level */
  severity: LogLevel;
  /** Function or endpoint where error occurred */
  source?: string;
  /** Error code if available */
  errorCode?: string;
}

/**
 * Client-safe error response (no sensitive data)
 */
export interface ClientSafeError {
  /** User-friendly error message */
  message: string;
  /** Error code for client handling */
  code: string;
  /** Request ID for support reference */
  requestId?: string;
}

/**
 * Check if a string contains sensitive data patterns
 */
export function containsSensitiveData(value: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check if a field name is sensitive
 */
export function isSensitiveField(fieldName: string): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(
    sensitive => lowerFieldName.includes(sensitive.toLowerCase())
  );
}

/**
 * Redact sensitive data from an object
 */
export function redactSensitiveData<T extends Record<string, unknown>>(
  obj: T,
  depth = 0,
  maxDepth = 10
): T {
  if (depth > maxDepth) {
    return '[MAX_DEPTH_EXCEEDED]' as unknown as T;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    // Check if string value contains sensitive patterns
    if (typeof obj === 'string' && containsSensitiveData(obj)) {
      return '[REDACTED]' as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null
        ? redactSensitiveData(item as Record<string, unknown>, depth + 1, maxDepth)
        : typeof item === 'string' && containsSensitiveData(item)
          ? '[REDACTED]'
          : item
    ) as unknown as T;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'string' && containsSensitiveData(value)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(
        value as Record<string, unknown>,
        depth + 1,
        maxDepth
      );
    } else {
      redacted[key] = value;
    }
  }

  return redacted as T;
}

/**
 * Extract stack trace from an error
 */
export function extractStackTrace(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return undefined;
}

/**
 * Extract error name from an error
 */
export function extractErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  }
  if (typeof error === 'string') {
    return 'StringError';
  }
  if (typeof error === 'object' && error !== null) {
    return (error as { name?: string }).name || 'UnknownError';
  }
  return 'UnknownError';
}

/**
 * Extract error message from an error
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return 'An unknown error occurred';
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a server error log entry with full details
 */
export function createServerErrorLog(
  error: unknown,
  context: {
    userId?: string;
    requestId?: string;
    source?: string;
    errorCode?: string;
    additionalContext?: Record<string, unknown>;
  } = {}
): ServerErrorLogEntry {
  const timestamp = Date.now();
  const requestId = context.requestId || generateRequestId();
  
  // Extract error details
  const message = extractErrorMessage(error);
  const stackTrace = extractStackTrace(error);
  const errorName = extractErrorName(error);
  
  // Redact sensitive data from additional context
  const safeContext = context.additionalContext
    ? redactSensitiveData(context.additionalContext)
    : {};

  return {
    message,
    stackTrace,
    errorName,
    userId: context.userId,
    requestId,
    timestamp,
    context: safeContext,
    severity: 'error',
    source: context.source,
    errorCode: context.errorCode,
  };
}

/**
 * Log a server-side error with full details
 * 
 * This function:
 * 1. Creates a detailed log entry with stack trace and context
 * 2. Logs to the structured logger
 * 3. Sends to Sentry for production monitoring
 * 4. Returns a client-safe error response
 */
export function logServerError(
  error: unknown,
  context: {
    userId?: string;
    requestId?: string;
    source?: string;
    errorCode?: string;
    additionalContext?: Record<string, unknown>;
  } = {}
): ClientSafeError {
  // Create the full server log entry
  const logEntry = createServerErrorLog(error, context);
  
  // Log to structured logger with full details (server-side only)
  logger.error(logEntry.message, error, {
    userId: logEntry.userId,
    requestId: logEntry.requestId,
    source: logEntry.source,
    errorCode: logEntry.errorCode,
    errorName: logEntry.errorName,
    stackTrace: logEntry.stackTrace,
    ...logEntry.context,
  });
  
  // Send to Sentry for production monitoring
  if (error instanceof Error) {
    sentryCaptureError(error, {
      userId: logEntry.userId,
      requestId: logEntry.requestId,
      source: logEntry.source,
      errorCode: logEntry.errorCode,
      ...logEntry.context,
    });
  }
  
  // Return client-safe error (no stack trace or sensitive data)
  return createClientSafeError(logEntry);
}

/**
 * Create a client-safe error response from a server log entry
 */
export function createClientSafeError(logEntry: ServerErrorLogEntry): ClientSafeError {
  // Map error codes to user-friendly messages
  const userFriendlyMessages: Record<string, string> = {
    UNAUTHORIZED: 'You need to sign in to access this feature.',
    FORBIDDEN: "You don't have permission to perform this action.",
    NOT_FOUND: "The item you're looking for couldn't be found.",
    VALIDATION_ERROR: 'Please check your input and try again.',
    RATE_LIMITED: "You're making requests too quickly. Please wait a moment.",
    INTERNAL_ERROR: 'Something went wrong. Please try again later.',
    SERVICE_UNAVAILABLE: 'The service is temporarily unavailable.',
  };
  
  const code = logEntry.errorCode || 'INTERNAL_ERROR';
  const message = userFriendlyMessages[code] || 'An unexpected error occurred. Please try again.';
  
  return {
    message,
    code,
    requestId: logEntry.requestId,
  };
}

/**
 * Verify that a log entry contains all required fields for server-side logging
 */
export function isValidServerErrorLog(entry: unknown): entry is ServerErrorLogEntry {
  if (!entry || typeof entry !== 'object') {
    return false;
  }
  
  const log = entry as Partial<ServerErrorLogEntry>;
  
  return (
    typeof log.message === 'string' &&
    typeof log.errorName === 'string' &&
    typeof log.timestamp === 'number' &&
    typeof log.context === 'object' &&
    log.context !== null &&
    typeof log.severity === 'string'
  );
}

/**
 * Verify that a client error response contains no sensitive data
 */
export function isClientSafe(error: ClientSafeError): boolean {
  // Check message doesn't contain sensitive patterns
  if (containsSensitiveData(error.message)) {
    return false;
  }
  
  // Check code doesn't contain sensitive patterns
  if (containsSensitiveData(error.code)) {
    return false;
  }
  
  // Check requestId doesn't contain sensitive patterns
  if (error.requestId && containsSensitiveData(error.requestId)) {
    return false;
  }
  
  // Check message doesn't contain stack trace patterns
  const stackTracePatterns = [
    /at\s+[\w.]+\s+\([^)]+\)/,
    /:\d+:\d+/,
    /file:\/\//,
    /node_modules/,
    /\.ts:\d+/,
    /\.js:\d+/,
  ];
  
  if (stackTracePatterns.some(pattern => pattern.test(error.message))) {
    return false;
  }
  
  return true;
}

/**
 * Middleware wrapper for Convex functions with server-side error logging
 */
export function withServerErrorLogging<TArgs, TResult>(
  handler: (ctx: any, args: TArgs) => Promise<TResult>,
  source?: string
) {
  return async (ctx: any, args: TArgs): Promise<TResult> => {
    const requestId = generateRequestId();
    
    try {
      return await handler(ctx, args);
    } catch (error) {
      const clientError = logServerError(error, {
        userId: ctx.auth?.userId,
        requestId,
        source: source || ctx.functionName,
        additionalContext: {
          args: redactSensitiveData(args as Record<string, unknown>),
        },
      });
      
      // Re-throw with client-safe message
      throw new Error(clientError.message);
    }
  };
}
