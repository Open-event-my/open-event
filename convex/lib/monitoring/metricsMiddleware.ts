/**
 * Metrics Middleware for Convex Functions
 *
 * Provides middleware wrappers to automatically collect metrics for:
 * - API request performance (response times, status codes)
 * - API usage tracking (user/organization)
 * - Database query performance
 *
 * Note: This module uses generic types since it's in a subdirectory
 * and cannot directly import from _generated/server.
 */

import { metricsCollector } from './metrics'

/**
 * Generic context type for Convex functions
 */
interface GenericCtx {
  auth?: {
    userId?: string
  }
  db?: unknown
}

/**
 * Extract user and organization IDs from context
 */
function extractIdentity(ctx: GenericCtx): {
  userId?: string
  organizationId?: string
} {
  const userId = ctx.auth?.userId
  // Note: organizationId would need to be extracted from user data if available
  // For now, we'll leave it undefined and can enhance later
  return {
    userId: userId?.toString(),
    organizationId: undefined,
  }
}

/**
 * Wrap a query handler with metrics collection
 */
export function withQueryMetrics<TCtx extends GenericCtx, TArgs, TOutput>(
  functionName: string,
  handler: (ctx: TCtx, args: TArgs) => Promise<TOutput>
): (ctx: TCtx, args: TArgs) => Promise<TOutput> {
  return async (ctx: TCtx, args: TArgs): Promise<TOutput> => {
    const startTime = Date.now()
    const { userId, organizationId } = extractIdentity(ctx)

    try {
      const result = await handler(ctx, args)
      const responseTime = Date.now() - startTime

      // Record API request metrics
      metricsCollector.recordAPIRequest({
        endpoint: functionName,
        method: 'QUERY',
        statusCode: 200,
        responseTime,
        userId,
        organizationId,
      })

      // Record API usage
      if (userId) {
        metricsCollector.recordAPIUsage({
          userId,
          organizationId,
          endpoint: functionName,
          action: 'query',
        })
      }

      return result
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Record failed request
      metricsCollector.recordAPIRequest({
        endpoint: functionName,
        method: 'QUERY',
        statusCode: 500,
        responseTime,
        userId,
        organizationId,
      })

      throw error
    }
  }
}

/**
 * Wrap a mutation handler with metrics collection
 */
export function withMutationMetrics<TCtx extends GenericCtx, TArgs, TOutput>(
  functionName: string,
  handler: (ctx: TCtx, args: TArgs) => Promise<TOutput>
): (ctx: TCtx, args: TArgs) => Promise<TOutput> {
  return async (ctx: TCtx, args: TArgs): Promise<TOutput> => {
    const startTime = Date.now()
    const { userId, organizationId } = extractIdentity(ctx)

    try {
      const result = await handler(ctx, args)
      const responseTime = Date.now() - startTime

      // Record API request metrics
      metricsCollector.recordAPIRequest({
        endpoint: functionName,
        method: 'MUTATION',
        statusCode: 200,
        responseTime,
        userId,
        organizationId,
      })

      // Record API usage
      if (userId) {
        metricsCollector.recordAPIUsage({
          userId,
          organizationId,
          endpoint: functionName,
          action: 'mutation',
        })
      }

      return result
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Record failed request
      metricsCollector.recordAPIRequest({
        endpoint: functionName,
        method: 'MUTATION',
        statusCode: 500,
        responseTime,
        userId,
        organizationId,
      })

      throw error
    }
  }
}

/**
 * Wrap an action handler with metrics collection
 */
export function withActionMetrics<TCtx extends GenericCtx, TArgs, TOutput>(
  functionName: string,
  handler: (ctx: TCtx, args: TArgs) => Promise<TOutput>
): (ctx: TCtx, args: TArgs) => Promise<TOutput> {
  return async (ctx: TCtx, args: TArgs): Promise<TOutput> => {
    const startTime = Date.now()
    const { userId, organizationId } = extractIdentity(ctx)

    try {
      const result = await handler(ctx, args)
      const responseTime = Date.now() - startTime

      // Record API request metrics
      metricsCollector.recordAPIRequest({
        endpoint: functionName,
        method: 'ACTION',
        statusCode: 200,
        responseTime,
        userId,
        organizationId,
      })

      // Record API usage
      if (userId) {
        metricsCollector.recordAPIUsage({
          userId,
          organizationId,
          endpoint: functionName,
          action: 'action',
        })
      }

      return result
    } catch (error) {
      const responseTime = Date.now() - startTime

      // Record failed request
      metricsCollector.recordAPIRequest({
        endpoint: functionName,
        method: 'ACTION',
        statusCode: 500,
        responseTime,
        userId,
        organizationId,
      })

      throw error
    }
  }
}

/**
 * Wrap a database operation with metrics collection
 */
export async function withDatabaseMetrics<T>(
  operation: () => Promise<T>,
  params: {
    queryType: 'read' | 'write' | 'delete'
    table: string
  }
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await operation()
    const duration = Date.now() - startTime

    // Record database query metrics
    metricsCollector.recordDatabaseQuery({
      queryType: params.queryType,
      table: params.table,
      duration,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime

    // Still record the metric even on failure
    metricsCollector.recordDatabaseQuery({
      queryType: params.queryType,
      table: params.table,
      duration,
    })

    throw error
  }
}

/**
 * Helper to create a metrics-enabled query
 *
 * Usage:
 * export const myQuery = createMetricsQuery({
 *   args: { id: v.id('table') },
 *   handler: async (ctx, args) => {
 *     // Your query logic
 *   }
 * });
 */
export function createMetricsQuery<TCtx extends GenericCtx, TArgs, TOutput>(config: {
  args: unknown
  handler: (ctx: TCtx, args: TArgs) => Promise<TOutput>
}): {
  args: unknown
  handler: (ctx: TCtx, args: TArgs) => Promise<TOutput>
} {
  // Get the function name from the call stack (best effort)
  const functionName = new Error().stack?.split('\n')[2]?.trim() || 'unknown_query'

  return {
    args: config.args,
    handler: withQueryMetrics(functionName, config.handler),
  }
}

/**
 * Helper to create a metrics-enabled mutation
 *
 * Usage:
 * export const myMutation = createMetricsMutation({
 *   args: { id: v.id('table') },
 *   handler: async (ctx, args) => {
 *     // Your mutation logic
 *   }
 * });
 */
export function createMetricsMutation<TCtx extends GenericCtx, TArgs, TOutput>(config: {
  args: unknown
  handler: (ctx: TCtx, args: TArgs) => Promise<TOutput>
}): {
  args: unknown
  handler: (ctx: TCtx, args: TArgs) => Promise<TOutput>
} {
  // Get the function name from the call stack (best effort)
  const functionName = new Error().stack?.split('\n')[2]?.trim() || 'unknown_mutation'

  return {
    args: config.args,
    handler: withMutationMetrics(functionName, config.handler),
  }
}
