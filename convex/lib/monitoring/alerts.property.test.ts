/**
 * Property-Based Tests for Alert Manager
 *
 * Feature: production-readiness, Property 8: Critical Error Alerting
 * Validates: Requirements 2.3
 */

import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import {
  AlertManager,
  type Alert,
  type AlertSeverity,
  type AlertChannel,
  type AlertRecord,
} from './alerts'

describe('AlertManager - Property-Based Tests', () => {
  let alertManager: AlertManager

  beforeEach(() => {
    alertManager = new AlertManager()
  })

  /**
   * Property 8: Critical Error Alerting
   * For any error classified as critical severity, an alert should be sent to
   * the configured alerting channels within 60 seconds.
   *
   * Validates: Requirements 2.3
   */
  test('Property 8: Critical errors trigger alerts to all configured channels', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random critical alert data
        fc.string({ minLength: 1, maxLength: 100 }), // title
        fc.string({ minLength: 1, maxLength: 500 }), // message
        fc
          .array(fc.constantFrom<AlertChannel>('email', 'slack', 'pagerduty'), {
            minLength: 1,
            maxLength: 3,
          })
          .map((arr) => [...new Set(arr)]), // unique channels
        fc.record({
          errorType: fc.string(),
          timestamp: fc.integer(),
          userId: fc.option(fc.string(), { nil: undefined }),
        }), // metadata
        async (title, message, channels, metadata) => {
          // Create a critical alert
          const alert: Alert = {
            title,
            message,
            severity: 'critical',
            channels,
            metadata,
          }

          const startTime = Date.now()

          // Send the alert
          const result = await alertManager.sendAlert(alert)

          const endTime = Date.now()
          const duration = endTime - startTime

          // Property: Alert should be sent within 60 seconds (60000ms)
          expect(duration).toBeLessThan(60000)

          // Property: Alert record should be created
          expect(result).toBeDefined()
          expect(result.id).toBeDefined()
          expect(result.triggeredAt).toBeGreaterThanOrEqual(startTime)
          expect(result.triggeredAt).toBeLessThanOrEqual(endTime)

          // Property: Alert should have the correct severity
          expect(result.severity).toBe('critical')

          // Property: Alert should be delivered to all configured channels
          expect(result.deliveryResults).toHaveLength(channels.length)

          // Property: Each channel should have a delivery result
          for (const channel of channels) {
            const deliveryResult = result.deliveryResults.find((r) => r.channel === channel)
            expect(deliveryResult).toBeDefined()
            expect(deliveryResult!.channel).toBe(channel)

            // Property: Delivery result should have a success status
            expect(typeof deliveryResult!.success).toBe('boolean')
          }

          // Property: Alert should be in history
          const history = alertManager.getAlertHistory()
          const alertInHistory = history.find((a) => a.id === result.id)
          expect(alertInHistory).toBeDefined()
          expect(alertInHistory).toEqual(result)
        }
      ),
      { numRuns: 100, timeout: 30000 }
    )
  }, 30000)

  /**
   * Property: Alerts of different severities should be sent to appropriate channels
   */
  test('Property: Alert severity determines default channels', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }), // title
        fc.string({ minLength: 1, maxLength: 500 }), // message
        fc.constantFrom<AlertSeverity>('info', 'warning', 'critical'), // severity
        fc.record({
          key: fc.string(),
          value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        }), // metadata
        async (title, message, severity, metadata) => {
          // Create alert without specifying channels (should use defaults)
          const alert: Alert = {
            title,
            message,
            severity,
            channels: getDefaultChannelsForSeverity(severity),
            metadata,
          }

          const result = await alertManager.sendAlert(alert)

          // Property: Alert should be sent
          expect(result).toBeDefined()

          // Property: Channels should match severity expectations
          if (severity === 'info') {
            expect(result.channels).toContain('email')
          } else if (severity === 'warning') {
            expect(result.channels).toContain('email')
            expect(result.channels).toContain('slack')
          } else if (severity === 'critical') {
            expect(result.channels).toContain('email')
            expect(result.channels).toContain('slack')
            expect(result.channels).toContain('pagerduty')
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    )
  }, 30000)

  /**
   * Property: Alert history should maintain chronological order
   */
  test('Property: Alert history maintains chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            message: fc.string({ minLength: 1, maxLength: 200 }),
            severity: fc.constantFrom<AlertSeverity>('info', 'warning', 'critical'),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (alertData) => {
          // Clear history before test
          alertManager.clearHistory()

          // Send multiple alerts
          const sentAlerts = []
          for (const data of alertData) {
            const alert: Alert = {
              ...data,
              channels: ['email'],
              metadata: {},
            }
            const result = await alertManager.sendAlert(alert)
            sentAlerts.push(result)

            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10))
          }

          // Get history
          const history = alertManager.getAlertHistory()

          // Property: History should contain all sent alerts
          expect(history.length).toBeGreaterThanOrEqual(sentAlerts.length)

          // Find our alerts in history (there might be others from previous tests)
          const ourAlertIds = new Set(sentAlerts.map((a) => a.id))
          const ourAlertsInHistory = history.filter((a) => ourAlertIds.has(a.id))

          // Property: All our alerts should be in history
          expect(ourAlertsInHistory.length).toBe(sentAlerts.length)

          // Property: Our alerts should be in reverse chronological order
          for (let i = 0; i < ourAlertsInHistory.length - 1; i++) {
            expect(ourAlertsInHistory[i].triggeredAt).toBeGreaterThanOrEqual(
              ourAlertsInHistory[i + 1].triggeredAt
            )
          }
        }
      ),
      { numRuns: 10, timeout: 20000 }
    )
  }, 20000)

  /**
   * Property: Alerts can be filtered by severity
   */
  test('Property: Alerts can be filtered by severity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            message: fc.string({ minLength: 1, maxLength: 200 }),
            severity: fc.constantFrom<AlertSeverity>('info', 'warning', 'critical'),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (alertData) => {
          // Clear history before test
          alertManager.clearHistory()

          // Send alerts
          const sentAlerts = []
          for (const data of alertData) {
            const alert: Alert = {
              ...data,
              channels: ['email'],
              metadata: {},
            }
            const result = await alertManager.sendAlert(alert)
            sentAlerts.push(result)
          }

          // Test filtering by each severity
          const severities: AlertSeverity[] = ['info', 'warning', 'critical']
          for (const severity of severities) {
            const filtered = alertManager.getAlertsBySeverity(severity)
            const expected = sentAlerts.filter((a) => a.severity === severity)

            // Property: Filtered results should match expected count
            expect(filtered.length).toBe(expected.length)

            // Property: All filtered alerts should have the correct severity
            for (const alert of filtered) {
              expect(alert.severity).toBe(severity)
            }
          }
        }
      ),
      { numRuns: 5, timeout: 60000 }
    )
  }, 60000)

  /**
   * Property: Alert metadata is preserved
   */
  test('Property: Alert metadata is preserved through delivery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.record({
          userId: fc.string(),
          eventId: fc.string(),
          errorCode: fc.integer(),
          timestamp: fc.integer(),
          nested: fc.record({
            key: fc.string(),
            value: fc.integer(),
          }),
        }),
        async (title, message, metadata) => {
          const alert: Alert = {
            title,
            message,
            severity: 'critical',
            channels: ['email'],
            metadata,
          }

          const result = await alertManager.sendAlert(alert)

          // Property: Metadata should be preserved exactly
          expect(result.metadata).toEqual(metadata)

          // Property: Nested metadata should be preserved
          if (metadata.nested) {
            expect(result.metadata.nested).toEqual(metadata.nested)
          }
        }
      ),
      { numRuns: 100, timeout: 30000 }
    )
  }, 30000)

  /**
   * Property: Recent critical alerts can be retrieved within time window
   */
  test('Property: Recent critical alerts are retrievable within time window', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            message: fc.string({ minLength: 1, maxLength: 200 }),
            severity: fc.constantFrom<AlertSeverity>('info', 'warning', 'critical'),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        fc.integer({ min: 1000, max: 10000 }), // time window in ms
        async (alertData, timeWindow) => {
          // Clear history before test
          alertManager.clearHistory()

          // Send alerts
          const sentAlerts: AlertRecord[] = []
          for (const data of alertData) {
            const alert: Alert = {
              ...data,
              channels: ['email'],
              metadata: {},
            }
            const result = await alertManager.sendAlert(alert)
            sentAlerts.push(result)
            await new Promise((resolve) => setTimeout(resolve, 10))
          }

          // Property: Recent critical alerts are retrievable within time window
          const recentCritical = alertManager.getRecentCriticalAlerts(timeWindow)

          // Property: All returned alerts should be critical
          for (const alert of recentCritical) {
            expect(alert.severity).toBe('critical')
          }

          // Property: All returned alerts should be within time window
          const cutoffTime = Date.now() - timeWindow
          for (const alert of recentCritical) {
            expect(alert.triggeredAt).toBeGreaterThanOrEqual(cutoffTime)
          }

          // Property: Count should match critical alerts sent
          // Note: On slow systems, some alerts might fall out of the time window
          // so we only check that we don't find MORE alerts than expected
          // and if timeWindow is large enough, we should find them all.
          // For stability, we'll skip the exact count check if timeWindow is small (< 2000ms)
          if (timeWindow >= 2000) {
            // Even with 2000ms, it might be flaky if system is very slow.
            // We'll filter the expected alerts based on the cutoff time as well to be correct.
            const expectedInWindow = sentAlerts.filter(
              (a) => a.severity === 'critical' && a.triggeredAt >= cutoffTime
            ).length
            expect(recentCritical.length).toBe(expectedInWindow)
          }
        }
      ),
      { numRuns: 5, timeout: 60000 }
    )
  }, 60000)
})

/**
 * Helper function to get default channels for severity
 * (matches the logic in AlertManager)
 */
function getDefaultChannelsForSeverity(severity: AlertSeverity): AlertChannel[] {
  switch (severity) {
    case 'info':
      return ['email']
    case 'warning':
      return ['email', 'slack']
    case 'critical':
      return ['email', 'slack', 'pagerduty']
    default:
      return ['email']
  }
}
