/**
 * Metrics Collector Service
 * 
 * Provides comprehensive metrics collection for:
 * - API request performance (response times, status codes)
 * - Database query performance
 * - API usage tracking per user/organization
 * - System health metrics
 */

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

export interface APIMetric extends Metric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  organizationId?: string;
}

export interface DatabaseMetric extends Metric {
  queryType: 'read' | 'write' | 'delete';
  table: string;
  duration: number;
  recordCount?: number;
}

export interface UsageMetric extends Metric {
  userId: string;
  organizationId?: string;
  endpoint: string;
  action: string;
}

/**
 * MetricsCollector class for tracking system metrics
 */
export class MetricsCollector {
  private metrics: Metric[] = [];
  private readonly maxMetricsInMemory = 1000;

  /**
   * Record a counter metric (incremental value)
   */
  recordCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {},
    };
    
    this.storeMetric(metric);
  }

  /**
   * Record a gauge metric (point-in-time value)
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {},
    };
    
    this.storeMetric(metric);
  }

  /**
   * Record a histogram metric (distribution of values)
   */
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {},
    };
    
    this.storeMetric(metric);
  }

  /**
   * Record a timing metric (duration in milliseconds)
   */
  recordTiming(name: string, durationMs: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value: durationMs,
      timestamp: Date.now(),
      tags: { ...tags, unit: 'ms' },
    };
    
    this.storeMetric(metric);
  }

  /**
   * Record API request metrics
   */
  recordAPIRequest(params: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    userId?: string;
    organizationId?: string;
  }): void {
    const metric: APIMetric = {
      name: 'api.request',
      value: params.responseTime,
      timestamp: Date.now(),
      tags: {
        endpoint: params.endpoint,
        method: params.method,
        status: String(params.statusCode),
        ...(params.userId && { userId: params.userId }),
        ...(params.organizationId && { organizationId: params.organizationId }),
      },
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      responseTime: params.responseTime,
      userId: params.userId,
      organizationId: params.organizationId,
    };
    
    this.storeMetric(metric);
    
    // Also record as separate counter for easier querying
    this.recordCounter('api.request.count', 1, {
      endpoint: params.endpoint,
      method: params.method,
      status: String(params.statusCode),
    });
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(params: {
    queryType: 'read' | 'write' | 'delete';
    table: string;
    duration: number;
    recordCount?: number;
  }): void {
    const metric: DatabaseMetric = {
      name: 'database.query',
      value: params.duration,
      timestamp: Date.now(),
      tags: {
        queryType: params.queryType,
        table: params.table,
        ...(params.recordCount !== undefined && { recordCount: String(params.recordCount) }),
      },
      queryType: params.queryType,
      table: params.table,
      duration: params.duration,
      recordCount: params.recordCount,
    };
    
    this.storeMetric(metric);
    
    // Record counter for query count
    this.recordCounter('database.query.count', 1, {
      queryType: params.queryType,
      table: params.table,
    });
  }

  /**
   * Record API usage for tracking per user/organization
   */
  recordAPIUsage(params: {
    userId: string;
    organizationId?: string;
    endpoint: string;
    action: string;
  }): void {
    const metric: UsageMetric = {
      name: 'api.usage',
      value: 1,
      timestamp: Date.now(),
      tags: {
        userId: params.userId,
        ...(params.organizationId && { organizationId: params.organizationId }),
        endpoint: params.endpoint,
        action: params.action,
      },
      userId: params.userId,
      organizationId: params.organizationId,
      endpoint: params.endpoint,
      action: params.action,
    };
    
    this.storeMetric(metric);
  }

  /**
   * Store metric in memory (with size limit)
   */
  private storeMetric(metric: Metric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics in memory
    if (this.metrics.length > this.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.maxMetricsInMemory);
    }
  }

  /**
   * Get all metrics (useful for testing and debugging)
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): Metric[] {
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get metrics by tag
   */
  getMetricsByTag(tagKey: string, tagValue: string): Metric[] {
    return this.metrics.filter(m => m.tags[tagKey] === tagValue);
  }

  /**
   * Get metrics within time range
   */
  getMetricsInRange(startTime: number, endTime: number): Metric[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get metric statistics for a given metric name
   */
  getMetricStats(name: string): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const metrics = this.getMetricsByName(name);
    
    if (metrics.length === 0) {
      return null;
    }
    
    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: metrics.length,
      sum,
      avg: sum / metrics.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}

/**
 * Default metrics collector instance
 */
export const metricsCollector = new MetricsCollector();

/**
 * Helper function to measure execution time of a function
 */
export async function measureExecutionTime<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    metricsCollector.recordTiming(name, duration, {
      ...tags,
      status: 'success',
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    metricsCollector.recordTiming(name, duration, {
      ...tags,
      status: 'error',
    });
    
    throw error;
  }
}

/**
 * Helper function to create a metrics middleware wrapper
 */
export function withMetrics<TArgs extends unknown[], TResult>(
  metricName: string,
  fn: (...args: TArgs) => Promise<TResult>,
  getTags?: (...args: TArgs) => Record<string, string>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const tags = getTags ? getTags(...args) : {};
    return measureExecutionTime(metricName, () => fn(...args), tags);
  };
}
