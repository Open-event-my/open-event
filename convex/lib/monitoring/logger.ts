/**
 * Structured Logger Service
 * 
 * Provides consistent, structured logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Contextual information (userId, requestId, etc.)
 * - Timestamp tracking
 * - Type-safe logging interface
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context: Record<string, unknown>;
  userId?: string;
  requestId?: string;
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * StructuredLogger class for consistent logging across the application
 */
export class StructuredLogger {
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
  }

  /**
   * Create a log entry with the specified level
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: Date.now(),
      context: { ...this.defaultContext, ...context },
      userId: context?.userId as string | undefined || this.defaultContext.userId,
      requestId: context?.requestId as string | undefined || this.defaultContext.requestId,
    };
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, context, userId, requestId } = entry;
    const date = new Date(timestamp).toISOString();
    
    const parts = [
      `[${date}]`,
      `[${level.toUpperCase()}]`,
    ];

    if (userId) {
      parts.push(`[user:${userId}]`);
    }

    if (requestId) {
      parts.push(`[req:${requestId}]`);
    }

    parts.push(message);

    if (Object.keys(context).length > 0) {
      parts.push(JSON.stringify(context));
    }

    return parts.join(' ');
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry('debug', message, context);
    this.output(entry);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry('info', message, context);
    this.output(entry);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createLogEntry('warn', message, context);
    this.output(entry);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
    };
    
    const entry = this.createLogEntry('error', message, errorContext);
    this.output(entry);
  }

  /**
   * Create a child logger with additional default context
   */
  child(additionalContext: LogContext): StructuredLogger {
    return new StructuredLogger({
      ...this.defaultContext,
      ...additionalContext,
    });
  }

  /**
   * Get the raw log entry without outputting it (useful for testing)
   */
  createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return this.createLogEntry(level, message, context);
  }
}

/**
 * Default logger instance
 */
export const logger = new StructuredLogger();

/**
 * Create a logger with specific context
 */
export function createLogger(context: LogContext): StructuredLogger {
  return new StructuredLogger(context);
}
