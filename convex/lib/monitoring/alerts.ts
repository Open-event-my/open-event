/**
 * Alert Manager Service
 *
 * Provides alerting capabilities for critical system events:
 * - Multiple alert channels (email, Slack, PagerDuty)
 * - Alert severity levels (info, warning, critical)
 * - Threshold-based alerting
 * - Alert routing and delivery
 */

import { logger } from './logger'
import { metricsCollector } from './metrics'

export type AlertChannel = 'email' | 'slack' | 'pagerduty'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface Alert {
  title: string
  message: string
  severity: AlertSeverity
  channels: AlertChannel[]
  metadata: Record<string, unknown>
}

export interface AlertThreshold {
  metric: string
  threshold: number
  severity: AlertSeverity
  channels: AlertChannel[]
}

export interface AlertDeliveryResult {
  channel: AlertChannel
  success: boolean
  error?: string
  deliveredAt?: number
}

export interface AlertRecord extends Alert {
  id: string
  triggeredAt: number
  deliveryResults: AlertDeliveryResult[]
}

/**
 * AlertManager class for sending alerts through multiple channels
 */
export class AlertManager {
  private thresholds: Map<string, AlertThreshold> = new Map()
  private alertHistory: AlertRecord[] = []
  private readonly maxHistorySize = 1000
  private alertIdCounter = 0

  /**
   * Send an alert through configured channels
   */
  async sendAlert(alert: Alert): Promise<AlertRecord> {
    const alertId = this.generateAlertId()
    const triggeredAt = Date.now()

    logger.info('Sending alert', {
      alertId,
      title: alert.title,
      severity: alert.severity,
      channels: alert.channels,
    })

    // Record alert metric
    metricsCollector.recordCounter('alerts.sent', 1, {
      severity: alert.severity,
      channels: alert.channels.join(','),
    })

    // Deliver alert to each channel
    const deliveryResults = await Promise.all(
      alert.channels.map((channel) => this.deliverToChannel(channel, alert))
    )

    // Create alert record
    const alertRecord: AlertRecord = {
      ...alert,
      id: alertId,
      triggeredAt,
      deliveryResults,
    }

    // Store in history
    this.storeAlertRecord(alertRecord)

    // Log delivery results
    const successCount = deliveryResults.filter((r) => r.success).length
    const failureCount = deliveryResults.length - successCount

    if (failureCount > 0) {
      logger.warn('Some alert deliveries failed', {
        alertId,
        successCount,
        failureCount,
        failures: deliveryResults.filter((r) => !r.success),
      })
    } else {
      logger.info('Alert delivered successfully', {
        alertId,
        channels: alert.channels,
      })
    }

    return alertRecord
  }

  /**
   * Deliver alert to a specific channel
   */
  private async deliverToChannel(
    channel: AlertChannel,
    alert: Alert
  ): Promise<AlertDeliveryResult> {
    const startTime = Date.now()

    try {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert)
          break
        case 'slack':
          await this.sendSlackAlert(alert)
          break
        case 'pagerduty':
          await this.sendPagerDutyAlert(alert)
          break
        default:
          throw new Error(`Unknown alert channel: ${channel}`)
      }

      const deliveredAt = Date.now()
      const duration = deliveredAt - startTime

      metricsCollector.recordTiming('alerts.delivery', duration, {
        channel,
        severity: alert.severity,
        status: 'success',
      })

      return {
        channel,
        success: true,
        deliveredAt,
      }
    } catch (error) {
      const duration = Date.now() - startTime

      metricsCollector.recordTiming('alerts.delivery', duration, {
        channel,
        severity: alert.severity,
        status: 'error',
      })

      logger.error(`Failed to deliver alert to ${channel}`, error, {
        alertTitle: alert.title,
        severity: alert.severity,
      })

      return {
        channel,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Send alert via email
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // In production, this would integrate with an email service (SendGrid, AWS SES, etc.)
    // For now, we'll log the email that would be sent

    const emailContent = this.formatEmailAlert(alert)

    logger.info('Email alert would be sent', {
      to: process.env.ALERT_EMAIL || 'alerts@example.com',
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      body: emailContent,
    })

    // Simulate email delivery delay
    await this.simulateDelay(100)
  }

  /**
   * Send alert via Slack
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    // In production, this would use Slack webhook or API
    // For now, we'll log the Slack message that would be sent

    const slackMessage = this.formatSlackAlert(alert)

    logger.info('Slack alert would be sent', {
      webhook: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/...',
      message: slackMessage,
    })

    // Simulate Slack delivery delay
    await this.simulateDelay(100)
  }

  /**
   * Send alert via PagerDuty
   */
  private async sendPagerDutyAlert(alert: Alert): Promise<void> {
    // In production, this would use PagerDuty Events API
    // For now, we'll log the PagerDuty event that would be sent

    const pagerDutyEvent = this.formatPagerDutyAlert(alert)

    logger.info('PagerDuty alert would be sent', {
      apiKey: process.env.PAGERDUTY_API_KEY ? '***' : 'not configured',
      event: pagerDutyEvent,
    })

    // Simulate PagerDuty delivery delay
    await this.simulateDelay(100)
  }

  /**
   * Format alert for email
   */
  private formatEmailAlert(alert: Alert): string {
    const lines = [
      `Alert: ${alert.title}`,
      `Severity: ${alert.severity.toUpperCase()}`,
      `Time: ${new Date().toISOString()}`,
      '',
      'Message:',
      alert.message,
      '',
      'Metadata:',
      JSON.stringify(alert.metadata, null, 2),
    ]

    return lines.join('\n')
  }

  /**
   * Format alert for Slack
   */
  private formatSlackAlert(alert: Alert): Record<string, unknown> {
    const color = this.getSeverityColor(alert.severity)

    return {
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true,
            },
            ...Object.entries(alert.metadata).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true,
            })),
          ],
          footer: 'Open Event Alert System',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }
  }

  /**
   * Format alert for PagerDuty
   */
  private formatPagerDutyAlert(alert: Alert): Record<string, unknown> {
    return {
      routing_key: process.env.PAGERDUTY_ROUTING_KEY || 'not-configured',
      event_action: 'trigger',
      payload: {
        summary: alert.title,
        severity: alert.severity,
        source: 'open-event',
        timestamp: new Date().toISOString(),
        custom_details: {
          message: alert.message,
          ...alert.metadata,
        },
      },
    }
  }

  /**
   * Get color for severity level (for Slack)
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'info':
        return '#36a64f' // Green
      case 'warning':
        return '#ff9900' // Orange
      case 'critical':
        return '#ff0000' // Red
      default:
        return '#808080' // Gray
    }
  }

  /**
   * Configure alert threshold for a metric
   */
  configureThreshold(
    metric: string,
    threshold: number,
    severity: AlertSeverity,
    channels?: AlertChannel[]
  ): void {
    const alertChannels = channels || this.getDefaultChannelsForSeverity(severity)

    this.thresholds.set(metric, {
      metric,
      threshold,
      severity,
      channels: alertChannels,
    })

    logger.info('Alert threshold configured', {
      metric,
      threshold,
      severity,
      channels: alertChannels,
    })
  }

  /**
   * Get default channels based on severity
   */
  private getDefaultChannelsForSeverity(severity: AlertSeverity): AlertChannel[] {
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

  /**
   * Check all configured thresholds against current metrics
   */
  async checkThresholds(): Promise<void> {
    for (const [metric, config] of this.thresholds.entries()) {
      const stats = metricsCollector.getMetricStats(metric)

      if (!stats) {
        continue
      }

      // Check if threshold is exceeded
      if (stats.avg > config.threshold) {
        await this.sendAlert({
          title: `Threshold Exceeded: ${metric}`,
          message: `Metric ${metric} has exceeded threshold. Current average: ${stats.avg.toFixed(2)}, Threshold: ${config.threshold}`,
          severity: config.severity,
          channels: config.channels,
          metadata: {
            metric,
            threshold: config.threshold,
            currentValue: stats.avg,
            count: stats.count,
            min: stats.min,
            max: stats.max,
          },
        })
      }
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): AlertRecord[] {
    const history = [...this.alertHistory].reverse()
    return limit ? history.slice(0, limit) : history
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): AlertRecord[] {
    return this.alertHistory.filter((alert) => alert.severity === severity)
  }

  /**
   * Get recent critical alerts
   */
  getRecentCriticalAlerts(withinMs: number = 3600000): AlertRecord[] {
    const cutoffTime = Date.now() - withinMs
    return this.alertHistory.filter(
      (alert) => alert.severity === 'critical' && alert.triggeredAt >= cutoffTime
    )
  }

  /**
   * Clear alert history (useful for testing)
   */
  clearHistory(): void {
    this.alertHistory = []
    this.alertIdCounter = 0
  }

  /**
   * Store alert record in history
   */
  private storeAlertRecord(record: AlertRecord): void {
    this.alertHistory.push(record)

    // Keep only the most recent alerts in memory
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    this.alertIdCounter++
    return `alert-${Date.now()}-${this.alertIdCounter}`
  }

  /**
   * Simulate async delay (for testing)
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Default alert manager instance
 */
export const alertManager = new AlertManager()

/**
 * Helper function to send a critical error alert
 */
export async function sendCriticalErrorAlert(
  title: string,
  error: Error | unknown,
  metadata?: Record<string, unknown>
): Promise<AlertRecord> {
  return alertManager.sendAlert({
    title,
    message: error instanceof Error ? error.message : String(error),
    severity: 'critical',
    channels: ['email', 'slack', 'pagerduty'],
    metadata: {
      ...metadata,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error),
      timestamp: Date.now(),
    },
  })
}

/**
 * Helper function to send a warning alert
 */
export async function sendWarningAlert(
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<AlertRecord> {
  return alertManager.sendAlert({
    title,
    message,
    severity: 'warning',
    channels: ['email', 'slack'],
    metadata: metadata || {},
  })
}

/**
 * Helper function to send an info alert
 */
export async function sendInfoAlert(
  title: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<AlertRecord> {
  return alertManager.sendAlert({
    title,
    message,
    severity: 'info',
    channels: ['email'],
    metadata: metadata || {},
  })
}
