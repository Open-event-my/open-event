/**
 * Property-Based Tests for Metrics Collection
 *
 * Tests universal properties that should hold for all metrics collection operations.
 */

import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { MetricsCollector } from './metrics'

describe('Metrics Collection Property Tests', () => {
  let collector: MetricsCollector

  beforeEach(() => {
    collector = new MetricsCollector()
  })

  /**
   * Feature: production-readiness, Property 9: Performance Metrics Collection
   * Validates: Requirements 2.4
   *
   * For any API request, performance metrics (response time, status code) should be recorded in the metrics system.
   */
  test('Property 9: records performance metrics for all API requests', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // endpoint
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'), // method
        fc.integer({ min: 100, max: 599 }), // statusCode
        fc.integer({ min: 1, max: 10000 }), // responseTime
        fc.option(fc.uuid(), { nil: undefined }), // userId
        fc.option(fc.uuid(), { nil: undefined }), // organizationId
        (endpoint, method, statusCode, responseTime, userId, organizationId) => {
          // Record API request
          collector.recordAPIRequest({
            endpoint,
            method,
            statusCode,
            responseTime,
            userId,
            organizationId,
          })

          // Verify metric was recorded
          const metrics = collector.getMetricsByName('api.request')
          expect(metrics.length).toBeGreaterThan(0)

          // Verify the most recent metric has correct data
          const latestMetric = metrics[metrics.length - 1]
          expect(latestMetric.name).toBe('api.request')
          expect(latestMetric.value).toBe(responseTime)
          expect(latestMetric.tags.endpoint).toBe(endpoint)
          expect(latestMetric.tags.method).toBe(method)
          expect(latestMetric.tags.status).toBe(String(statusCode))

          // Verify timestamp is recent (within last second)
          expect(Date.now() - latestMetric.timestamp).toBeLessThan(1000)

          // Verify counter was also recorded
          const counterMetrics = collector.getMetricsByName('api.request.count')
          expect(counterMetrics.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: production-readiness, Property 11: API Usage Tracking
   * Validates: Requirements 2.8
   *
   * For any API call made by a user or organization, usage metrics should be recorded
   * including endpoint, timestamp, and caller identity.
   */
  test('Property 11: tracks API usage with caller identity for all API calls', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // userId
        fc.option(fc.uuid(), { nil: undefined }), // organizationId
        fc.string({ minLength: 1, maxLength: 100 }), // endpoint
        fc.string({ minLength: 1, maxLength: 50 }), // action
        (userId, organizationId, endpoint, action) => {
          // Record API usage
          collector.recordAPIUsage({
            userId,
            organizationId,
            endpoint,
            action,
          })

          // Verify usage metric was recorded
          const metrics = collector.getMetricsByName('api.usage')
          expect(metrics.length).toBeGreaterThan(0)

          // Verify the most recent metric has correct data
          const latestMetric = metrics[metrics.length - 1]
          expect(latestMetric.name).toBe('api.usage')
          expect(latestMetric.value).toBe(1)
          expect(latestMetric.tags.userId).toBe(userId)
          expect(latestMetric.tags.endpoint).toBe(endpoint)
          expect(latestMetric.tags.action).toBe(action)

          if (organizationId) {
            expect(latestMetric.tags.organizationId).toBe(organizationId)
          }

          // Verify timestamp is recent (within last second)
          expect(Date.now() - latestMetric.timestamp).toBeLessThan(1000)

          // Verify we can query by userId
          const userMetrics = collector.getMetricsByTag('userId', userId)
          expect(userMetrics.length).toBeGreaterThan(0)
          expect(userMetrics.some((m) => m.tags.userId === userId)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: production-readiness, Property 12: Database Query Performance Monitoring
   * Validates: Requirements 2.9
   *
   * For any database query executed, performance metrics (duration, query type) should be
   * collected and logged if duration exceeds threshold.
   */
  test('Property 12: monitors database query performance for all queries', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('read', 'write', 'delete'), // queryType
        fc.string({ minLength: 1, maxLength: 50 }), // table
        fc.integer({ min: 1, max: 5000 }), // duration
        fc.option(fc.integer({ min: 0, max: 10000 }), { nil: undefined }), // recordCount
        (queryType, table, duration, recordCount) => {
          // Record database query
          collector.recordDatabaseQuery({
            queryType,
            table,
            duration,
            recordCount,
          })

          // Verify metric was recorded
          const metrics = collector.getMetricsByName('database.query')
          expect(metrics.length).toBeGreaterThan(0)

          // Verify the most recent metric has correct data
          const latestMetric = metrics[metrics.length - 1]
          expect(latestMetric.name).toBe('database.query')
          expect(latestMetric.value).toBe(duration)
          expect(latestMetric.tags.queryType).toBe(queryType)
          expect(latestMetric.tags.table).toBe(table)

          if (recordCount !== undefined) {
            expect(latestMetric.tags.recordCount).toBe(String(recordCount))
          }

          // Verify timestamp is recent (within last second)
          expect(Date.now() - latestMetric.timestamp).toBeLessThan(1000)

          // Verify counter was also recorded
          const counterMetrics = collector.getMetricsByName('database.query.count')
          expect(counterMetrics.length).toBeGreaterThan(0)

          // Verify we can query by table
          const tableMetrics = collector.getMetricsByTag('table', table)
          expect(tableMetrics.length).toBeGreaterThan(0)
          expect(tableMetrics.some((m) => m.tags.table === table)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Metrics are stored with timestamps
   * Ensures all metrics have valid timestamps
   */
  test('all metrics have valid timestamps', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }), // name
        fc.float({ min: 0, max: 10000 }), // value
        fc.record({
          tag1: fc.string(),
          tag2: fc.string(),
        }), // tags
        (name, value, tags) => {
          const beforeTime = Date.now()

          collector.recordGauge(name, value, tags)

          const afterTime = Date.now()

          const metrics = collector.getMetricsByName(name)
          const latestMetric = metrics[metrics.length - 1]

          // Timestamp should be between before and after
          expect(latestMetric.timestamp).toBeGreaterThanOrEqual(beforeTime)
          expect(latestMetric.timestamp).toBeLessThanOrEqual(afterTime)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Metrics can be queried by time range
   * Ensures time-based queries work correctly
   */
  test('metrics can be queried by time range', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 5, maxLength: 20 }), // values
        (values) => {
          const startTime = Date.now()

          // Record metrics with slight delays
          values.forEach((value, index) => {
            collector.recordCounter('test.counter', value)
            // Small delay to ensure different timestamps
            if (index < values.length - 1) {
              const delay = Math.random() * 10
              const start = Date.now()
              while (Date.now() - start < delay) {
                // Busy wait for small delay
              }
            }
          })

          const endTime = Date.now()

          // Query metrics in range
          const metricsInRange = collector.getMetricsInRange(startTime, endTime)

          // All recorded metrics should be in range
          expect(metricsInRange.length).toBeGreaterThanOrEqual(values.length)

          // All metrics in range should have timestamps within bounds
          metricsInRange.forEach((metric) => {
            expect(metric.timestamp).toBeGreaterThanOrEqual(startTime)
            expect(metric.timestamp).toBeLessThanOrEqual(endTime)
          })
        }
      ),
      { numRuns: 50 } // Fewer runs due to timing sensitivity
    )
  })

  /**
   * Additional property: Metric statistics are calculated correctly
   * Ensures aggregation functions work properly
   */
  test('metric statistics are calculated correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 1000, noNaN: true }), { minLength: 1, maxLength: 100 }),
        (values) => {
          // Use a unique metric name for each test run to avoid interference
          const metricName = `test.metric.${Date.now()}.${Math.random()}`

          // Record all values
          values.forEach((value) => {
            collector.recordGauge(metricName, value)
          })

          // Get statistics
          const stats = collector.getMetricStats(metricName)

          expect(stats).not.toBeNull()
          expect(stats!.count).toBe(values.length)

          // Calculate expected values from the recorded values
          const expectedSum = values.reduce((a, b) => a + b, 0)
          const expectedAvg = expectedSum / values.length
          const expectedMin = Math.min(...values)
          const expectedMax = Math.max(...values)

          // Verify statistics (with small tolerance for floating point)
          expect(Math.abs(stats!.sum - expectedSum)).toBeLessThan(0.01)
          expect(Math.abs(stats!.avg - expectedAvg)).toBeLessThan(0.01)
          expect(stats!.min).toBe(expectedMin)
          expect(stats!.max).toBe(expectedMax)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Metrics can be filtered by tags
   * Ensures tag-based queries work correctly
   */
  test('metrics can be filtered by tags', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }), // tagKey
        fc.string({ minLength: 1, maxLength: 20 }), // tagValue
        fc.array(fc.float({ min: 0, max: 100 }), { minLength: 1, maxLength: 10 }),
        (tagKey, tagValue, values) => {
          // Record metrics with the specific tag
          values.forEach((value) => {
            collector.recordCounter('test.tagged', value, {
              [tagKey]: tagValue,
              other: 'value',
            })
          })

          // Query by tag
          const taggedMetrics = collector.getMetricsByTag(tagKey, tagValue)

          // Should have at least the metrics we just recorded
          expect(taggedMetrics.length).toBeGreaterThanOrEqual(values.length)

          // All returned metrics should have the correct tag
          taggedMetrics.forEach((metric) => {
            expect(metric.tags[tagKey]).toBe(tagValue)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
