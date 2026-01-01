/**
 * Error Handling Integration Examples
 *
 * This file demonstrates how to integrate error handling with alerting
 * in various scenarios.
 *
 * Note: These are example patterns - actual implementations should be
 * placed in root-level convex files that can properly import from _generated.
 */

import { withErrorHandlingAndAlerting, type ErrorContext } from './errorHandling'
import { logger } from './logger'

/**
 * Example 1: Using withErrorHandler middleware pattern
 *
 * This demonstrates the recommended approach for most Convex functions.
 * It automatically handles errors, logs them, and sends alerts.
 *
 * Usage in a root-level convex file:
 * ```ts
 * import { mutation } from './_generated/server';
 * import { withErrorHandler } from './lib/monitoring/errorHandling';
 *
 * export const createEvent = mutation({
 *   args: { title: v.string(), description: v.string() },
 *   handler: withErrorHandler(async (ctx, args) => {
 *     const eventId = await ctx.db.insert('events', {
 *       title: args.title,
 *       description: args.description,
 *       createdAt: Date.now(),
 *     });
 *     return eventId;
 *   }, 'database'),
 * });
 * ```
 */

/**
 * Example 2: Manual error handling with alerting
 *
 * Use this pattern when you need more control over error handling.
 *
 * ```ts
 * export const processPayment = mutation({
 *   args: { orderId: v.id('orders'), amount: v.number() },
 *   handler: async (ctx, args) => {
 *     try {
 *       const order = await ctx.db.get(args.orderId);
 *       if (!order) throw new Error('Order not found');
 *
 *       // Payment processing logic...
 *
 *       return { success: true };
 *     } catch (error) {
 *       const errorMessage = await handleErrorWithAlerting(
 *         error,
 *         { functionName: 'processPayment', orderId: args.orderId },
 *         'payment'
 *       );
 *       return { success: false, error: errorMessage };
 *     }
 *   },
 * });
 * ```
 */

/**
 * Example helper: Wrap specific operations with error handling
 */
export async function exampleDatabaseOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T> {
  return withErrorHandlingAndAlerting(operation, context, 'database')
}

/**
 * Example helper: Handle AI service errors gracefully
 */
export async function exampleAIOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  fallback: T
): Promise<{ result: T; usedFallback: boolean }> {
  try {
    const result = await withErrorHandlingAndAlerting(operation, context, 'ai_service')
    return { result, usedFallback: false }
  } catch (error) {
    logger.warn('AI service failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
      ...context,
    })
    return { result: fallback, usedFallback: true }
  }
}

/**
 * Example helper: Handle external API errors
 */
export async function exampleExternalAPIOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<{ success: boolean; data?: T; willRetry?: boolean }> {
  try {
    const data = await withErrorHandlingAndAlerting(operation, context, 'external_api')
    return { success: true, data }
  } catch (error) {
    logger.warn('External API failed, will retry later', {
      error: error instanceof Error ? error.message : String(error),
      ...context,
    })
    return { success: false, willRetry: true }
  }
}

/**
 * IMPORTANT NOTES FOR IMPLEMENTATION:
 *
 * 1. These examples show patterns - actual mutations/queries must be in
 *    root-level convex files (not in lib/ subdirectories)
 *
 * 2. Always call error handling FIRST before any business logic
 *
 * 3. Use appropriate error categories:
 *    - 'database' for DB operations
 *    - 'payment' for payment processing
 *    - 'ai_service' for AI/ML operations
 *    - 'external_api' for third-party APIs
 *    - 'authentication' for auth failures
 *    - 'authorization' for permission errors
 *    - 'validation' for input validation
 *    - 'system' for system-level errors
 *
 * 4. Critical errors (payment, database, system) will trigger alerts
 *
 * 5. Always provide meaningful context for debugging
 */
