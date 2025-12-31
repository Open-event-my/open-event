/**
 * Monitoring & Observability Module
 * 
 * Centralized exports for all monitoring utilities including:
 * - Structured logging
 * - Metrics collection
 * - Alert management
 * - Error handling with alerting
 */

// Logger exports
export {
  logger,
  createLogger,
  type LogLevel,
  type LogEntry,
  type LogContext,
  StructuredLogger,
} from './logger';

// Metrics exports
export {
  metricsCollector,
  measureExecutionTime,
  withMetrics,
  type Metric,
  type APIMetric,
  type DatabaseMetric,
  type UsageMetric,
  MetricsCollector,
} from './metrics';

// Alert exports
export {
  alertManager,
  sendCriticalErrorAlert,
  sendWarningAlert,
  sendInfoAlert,
  type Alert,
  type AlertChannel,
  type AlertSeverity,
  type AlertThreshold,
  type AlertDeliveryResult,
  type AlertRecord,
  AlertManager,
} from './alerts';

// Error handling exports
export {
  handleErrorWithAlerting,
  withErrorHandlingAndAlerting,
  withErrorHandler,
  isCriticalError,
  getErrorSeverity,
  getAlertChannels,
  type ErrorSeverity,
  type ErrorCategory,
  type ErrorContext,
  type AlertRoutingRule,
  DEFAULT_ALERT_ROUTING,
} from './errorHandling';
