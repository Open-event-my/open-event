/**
 * Metrics Query Endpoints
 * 
 * Provides endpoints to query collected metrics data.
 * These endpoints are useful for:
 * - Building monitoring dashboards
 * - Analyzing API performance
 * - Tracking user activity
 * - Identifying slow queries
 */

import { v } from 'convex/values';
import { query } from './_generated/server';
import { metricsCollector } from './lib/monitoring/metrics';
import { assertRole } from './lib/auth';

/**
 * Get all metrics (admin only)
 */
export const getAllMetrics = query({
  args: {},
  handler: async (ctx) => {
    // Only superadmins can view all metrics
    await assertRole(ctx, 'superadmin');
    
    return metricsCollector.getMetrics();
  },
});

/**
 * Get metrics by name (admin only)
 */
export const getMetricsByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin');
    
    return metricsCollector.getMetricsByName(args.name);
  },
});

/**
 * Get metrics by tag (admin only)
 */
export const getMetricsByTag = query({
  args: {
    tagKey: v.string(),
    tagValue: v.string(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin');
    
    return metricsCollector.getMetricsByTag(args.tagKey, args.tagValue);
  },
});

/**
 * Get metrics in time range (admin only)
 */
export const getMetricsInRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin');
    
    return metricsCollector.getMetricsInRange(args.startTime, args.endTime);
  },
});

/**
 * Get metric statistics (admin only)
 */
export const getMetricStats = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin');
    
    return metricsCollector.getMetricStats(args.name);
  },
});

/**
 * Get API performance summary (admin only)
 */
export const getAPIPerformanceSummary = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'superadmin');
    
    const apiMetrics = metricsCollector.getMetricsByName('api.request');
    
    if (apiMetrics.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        errorRate: 0,
        byEndpoint: {},
        byStatus: {},
      };
    }
    
    // Calculate overall stats
    const responseTimes = apiMetrics.map(m => m.value);
    const totalRequests = apiMetrics.length;
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalRequests;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    // Calculate error rate
    const errorCount = apiMetrics.filter(m => 
      m.tags.status && parseInt(m.tags.status) >= 400
    ).length;
    const errorRate = (errorCount / totalRequests) * 100;
    
    // Group by endpoint
    const byEndpoint: Record<string, {
      count: number;
      avgResponseTime: number;
      maxResponseTime: number;
      errorCount: number;
    }> = {};
    
    apiMetrics.forEach(metric => {
      const endpoint = metric.tags.endpoint || 'unknown';
      if (!byEndpoint[endpoint]) {
        byEndpoint[endpoint] = {
          count: 0,
          avgResponseTime: 0,
          maxResponseTime: 0,
          errorCount: 0,
        };
      }
      
      byEndpoint[endpoint].count++;
      byEndpoint[endpoint].avgResponseTime += metric.value;
      byEndpoint[endpoint].maxResponseTime = Math.max(
        byEndpoint[endpoint].maxResponseTime,
        metric.value
      );
      
      if (metric.tags.status && parseInt(metric.tags.status) >= 400) {
        byEndpoint[endpoint].errorCount++;
      }
    });
    
    // Calculate averages
    Object.keys(byEndpoint).forEach(endpoint => {
      byEndpoint[endpoint].avgResponseTime /= byEndpoint[endpoint].count;
    });
    
    // Group by status code
    const byStatus: Record<string, number> = {};
    apiMetrics.forEach(metric => {
      const status = metric.tags.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
    
    return {
      totalRequests,
      avgResponseTime,
      maxResponseTime,
      minResponseTime,
      errorRate,
      byEndpoint,
      byStatus,
    };
  },
});

/**
 * Get database performance summary (admin only)
 */
export const getDatabasePerformanceSummary = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'superadmin');
    
    const dbMetrics = metricsCollector.getMetricsByName('database.query');
    
    if (dbMetrics.length === 0) {
      return {
        totalQueries: 0,
        avgDuration: 0,
        maxDuration: 0,
        byTable: {},
        byQueryType: {},
        slowQueries: [],
      };
    }
    
    // Calculate overall stats
    const durations = dbMetrics.map(m => m.value);
    const totalQueries = dbMetrics.length;
    const avgDuration = durations.reduce((a, b) => a + b, 0) / totalQueries;
    const maxDuration = Math.max(...durations);
    
    // Group by table
    const byTable: Record<string, {
      count: number;
      avgDuration: number;
      maxDuration: number;
    }> = {};
    
    dbMetrics.forEach(metric => {
      const table = metric.tags.table || 'unknown';
      if (!byTable[table]) {
        byTable[table] = {
          count: 0,
          avgDuration: 0,
          maxDuration: 0,
        };
      }
      
      byTable[table].count++;
      byTable[table].avgDuration += metric.value;
      byTable[table].maxDuration = Math.max(
        byTable[table].maxDuration,
        metric.value
      );
    });
    
    // Calculate averages
    Object.keys(byTable).forEach(table => {
      byTable[table].avgDuration /= byTable[table].count;
    });
    
    // Group by query type
    const byQueryType: Record<string, number> = {};
    dbMetrics.forEach(metric => {
      const queryType = metric.tags.queryType || 'unknown';
      byQueryType[queryType] = (byQueryType[queryType] || 0) + 1;
    });
    
    // Find slow queries (>1000ms)
    const slowQueries = dbMetrics
      .filter(m => m.value > 1000)
      .map(m => ({
        table: m.tags.table,
        queryType: m.tags.queryType,
        duration: m.value,
        timestamp: m.timestamp,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest
    
    return {
      totalQueries,
      avgDuration,
      maxDuration,
      byTable,
      byQueryType,
      slowQueries,
    };
  },
});

/**
 * Get API usage by user (admin only)
 */
export const getAPIUsageByUser = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin');
    
    const usageMetrics = metricsCollector.getMetricsByName('api.usage');
    
    // Filter by user if specified
    const filteredMetrics = args.userId
      ? usageMetrics.filter(m => m.tags.userId === args.userId)
      : usageMetrics;
    
    if (filteredMetrics.length === 0) {
      return {
        totalCalls: 0,
        byEndpoint: {},
        byUser: {},
      };
    }
    
    // Group by endpoint
    const byEndpoint: Record<string, number> = {};
    filteredMetrics.forEach(metric => {
      const endpoint = metric.tags.endpoint || 'unknown';
      byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1;
    });
    
    // Group by user
    const byUser: Record<string, number> = {};
    filteredMetrics.forEach(metric => {
      const userId = metric.tags.userId || 'unknown';
      byUser[userId] = (byUser[userId] || 0) + 1;
    });
    
    return {
      totalCalls: filteredMetrics.length,
      byEndpoint,
      byUser,
    };
  },
});

/**
 * Get recent slow endpoints (admin only)
 */
export const getSlowEndpoints = query({
  args: {
    threshold: v.optional(v.number()), // Default 1000ms
    limit: v.optional(v.number()), // Default 10
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin');
    
    const threshold = args.threshold || 1000;
    const limit = args.limit || 10;
    
    const apiMetrics = metricsCollector.getMetricsByName('api.request');
    
    const slowRequests = apiMetrics
      .filter(m => m.value > threshold)
      .map(m => ({
        endpoint: m.tags.endpoint,
        method: m.tags.method,
        responseTime: m.value,
        status: m.tags.status,
        userId: m.tags.userId,
        timestamp: m.timestamp,
      }))
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit);
    
    return slowRequests;
  },
});
