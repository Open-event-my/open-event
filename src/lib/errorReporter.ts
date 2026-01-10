/**
 * Error Reporter Service
 *
 * Handles user error reporting with local storage fallback.
 * Collects device info, action history, and generates reference numbers.
 *
 * Requirements: 5.1, 5.3, 5.4, 5.5
 */

import { sanitizePII } from './errorFormatter'
import { getConnectivityMonitor } from './connectivityMonitor'

/**
 * Device information for error reports
 * Requirements: 5.3
 */
export interface DeviceInfo {
  /** Browser user agent string */
  userAgent: string
  /** Operating system platform */
  platform: string
  /** Browser language */
  language: string
  /** Screen dimensions */
  screenSize: string
  /** Viewport dimensions */
  viewportSize: string
}

/**
 * Error report structure
 * Requirements: 5.3
 */
export interface ErrorReport {
  /** Error ID being reported */
  errorId: string
  /** Sanitized error message */
  message: string
  /** Sanitized stack trace */
  stackTrace?: string
  /** User's additional context */
  userDescription?: string
  /** Screenshot data URL */
  screenshot?: string
  /** Browser and device info */
  deviceInfo: DeviceInfo
  /** User actions leading to error */
  actionHistory: string[]
  /** Timestamp when report was created */
  timestamp: number
}

/**
 * Result of submitting an error report
 * Requirements: 5.4
 */
export interface ErrorReportResult {
  /** Reference number for the submitted report */
  referenceNumber: string
}

/**
 * Local storage key for pending error reports
 */
const LOCAL_REPORTS_KEY = 'error_reporter_pending_reports'

/**
 * Maximum number of action history items to store
 */
const MAX_ACTION_HISTORY = 20

/**
 * Maximum number of local reports to store
 */
const MAX_LOCAL_REPORTS = 10

/**
 * Action history for tracking user actions leading to errors
 */
let actionHistory: string[] = []

/**
 * Generate a unique reference number for error reports
 * Format: ERR-YYYYMMDD-XXXXX (e.g., ERR-20260101-A3B2C)
 * Requirements: 5.4
 */
export function generateReferenceNumber(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')

  // Generate a random 5-character alphanumeric string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let randomPart = ''
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return `ERR-${datePart}-${randomPart}`
}

/**
 * Collect device information
 * Requirements: 5.3
 */
export function collectDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      userAgent: 'unknown',
      platform: 'unknown',
      language: 'unknown',
      screenSize: 'unknown',
      viewportSize: 'unknown',
    }
  }

  return {
    userAgent: navigator.userAgent || 'unknown',
    platform: navigator.platform || 'unknown',
    language: navigator.language || 'unknown',
    screenSize: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown',
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
  }
}

/**
 * Add an action to the history
 * Used to track user actions leading to errors
 * Requirements: 5.3
 */
export function recordAction(action: string): void {
  const timestamp = new Date().toISOString()
  actionHistory.push(`[${timestamp}] ${action}`)

  // Keep only the most recent actions
  if (actionHistory.length > MAX_ACTION_HISTORY) {
    actionHistory = actionHistory.slice(-MAX_ACTION_HISTORY)
  }
}

/**
 * Get the current action history
 * Requirements: 5.3
 */
export function getActionHistory(): string[] {
  return [...actionHistory]
}

/**
 * Clear the action history
 */
export function clearActionHistory(): void {
  actionHistory = []
}

/**
 * Create an error report with all required information
 * Requirements: 5.3
 */
export function createErrorReport(
  errorId: string,
  message: string,
  options?: {
    stackTrace?: string
    userDescription?: string
    screenshot?: string
  }
): ErrorReport {
  // Sanitize PII from message and stack trace
  const sanitizedMessage = sanitizePII(message) as string
  const sanitizedStackTrace = options?.stackTrace
    ? (sanitizePII(options.stackTrace) as string)
    : undefined

  return {
    errorId,
    message: sanitizedMessage,
    stackTrace: sanitizedStackTrace,
    userDescription: options?.userDescription,
    screenshot: options?.screenshot,
    deviceInfo: collectDeviceInfo(),
    actionHistory: getActionHistory(),
    timestamp: Date.now(),
  }
}

/**
 * Validate that an error report contains all required fields
 * Requirements: 5.3
 */
export function validateErrorReport(report: ErrorReport): boolean {
  // Check required fields
  if (!report.errorId || typeof report.errorId !== 'string') {
    return false
  }
  if (!report.message || typeof report.message !== 'string') {
    return false
  }
  if (!report.deviceInfo) {
    return false
  }
  if (typeof report.timestamp !== 'number' || report.timestamp <= 0) {
    return false
  }
  if (!Array.isArray(report.actionHistory)) {
    return false
  }

  // Validate device info structure
  const { deviceInfo } = report
  if (
    typeof deviceInfo.userAgent !== 'string' ||
    typeof deviceInfo.platform !== 'string' ||
    typeof deviceInfo.language !== 'string' ||
    typeof deviceInfo.screenSize !== 'string' ||
    typeof deviceInfo.viewportSize !== 'string'
  ) {
    return false
  }

  return true
}

/**
 * Error Reporter class
 * Handles submission and local storage of error reports
 *
 * Requirements: 5.1, 5.3, 5.4, 5.5
 */
export class ErrorReporter {
  private _submitEndpoint: string | null
  private _onSubmit?: (report: ErrorReport) => Promise<ErrorReportResult>

  constructor(options?: {
    submitEndpoint?: string
    onSubmit?: (report: ErrorReport) => Promise<ErrorReportResult>
  }) {
    this._submitEndpoint = options?.submitEndpoint || null
    this._onSubmit = options?.onSubmit
  }

  /**
   * Submit an error report
   * Requirements: 5.1, 5.4
   *
   * @param report - The error report to submit
   * @returns Promise with reference number on success
   */
  async submitReport(report: ErrorReport): Promise<ErrorReportResult> {
    // Validate the report
    if (!validateErrorReport(report)) {
      throw new Error('Invalid error report: missing required fields')
    }

    // Check connectivity
    const connectivityMonitor = getConnectivityMonitor()
    if (!connectivityMonitor.isOnline) {
      // Save locally if offline
      this.saveLocally(report)
      throw new Error('Offline: Report saved locally for later submission')
    }

    try {
      let result: ErrorReportResult

      // Use custom submit handler if provided
      if (this._onSubmit) {
        result = await this._onSubmit(report)
      } else if (this._submitEndpoint) {
        // Submit to endpoint
        const response = await fetch(this._submitEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report),
        })

        if (!response.ok) {
          throw new Error(`Failed to submit report: ${response.status}`)
        }

        result = await response.json()
      } else {
        // No endpoint configured, generate reference number locally
        result = {
          referenceNumber: generateReferenceNumber(),
        }

        // Log the report in development
        if (import.meta.env.DEV) {
          console.log('[ErrorReporter] Report submitted:', {
            referenceNumber: result.referenceNumber,
            report,
          })
        }
      }

      return result
    } catch (error) {
      // Save locally on failure
      this.saveLocally(report)
      throw error
    }
  }

  /**
   * Save a report to local storage for later submission
   * Requirements: 5.5
   *
   * @param report - The error report to save locally
   */
  saveLocally(report: ErrorReport): void {
    if (typeof localStorage === 'undefined') {
      console.warn('[ErrorReporter] localStorage not available')
      return
    }

    try {
      const existingReports = this.getLocalReports()

      // Add the new report
      existingReports.push(report)

      // Keep only the most recent reports
      const reportsToSave = existingReports.slice(-MAX_LOCAL_REPORTS)

      localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reportsToSave))
    } catch (error) {
      console.error('[ErrorReporter] Failed to save report locally:', error)
    }
  }

  /**
   * Get all locally saved reports
   * Requirements: 5.5
   *
   * @returns Array of locally saved error reports
   */
  getLocalReports(): ErrorReport[] {
    if (typeof localStorage === 'undefined') {
      return []
    }

    try {
      const stored = localStorage.getItem(LOCAL_REPORTS_KEY)
      if (!stored) {
        return []
      }

      const reports = JSON.parse(stored)
      if (!Array.isArray(reports)) {
        return []
      }

      // Filter out invalid reports
      return reports.filter(validateErrorReport)
    } catch (error) {
      console.error('[ErrorReporter] Failed to load local reports:', error)
      return []
    }
  }

  /**
   * Clear all locally saved reports
   */
  clearLocalReports(): void {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(LOCAL_REPORTS_KEY)
    } catch (error) {
      console.error('[ErrorReporter] Failed to clear local reports:', error)
    }
  }

  /**
   * Retry submitting all locally saved reports
   * Requirements: 5.5
   *
   * @returns Array of results for each report
   */
  async retryLocalReports(): Promise<
    Array<{ report: ErrorReport; result?: ErrorReportResult; error?: string }>
  > {
    const localReports = this.getLocalReports()
    const results: Array<{ report: ErrorReport; result?: ErrorReportResult; error?: string }> = []

    if (localReports.length === 0) {
      return results
    }

    // Check connectivity
    const connectivityMonitor = getConnectivityMonitor()
    if (!connectivityMonitor.isOnline) {
      return localReports.map((report) => ({
        report,
        error: 'Still offline',
      }))
    }

    // Clear local reports before retrying to avoid duplicates
    this.clearLocalReports()

    for (const report of localReports) {
      try {
        const result = await this.submitReport(report)
        results.push({ report, result })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({ report, error: errorMessage })
        // Report was already saved locally by submitReport on failure
      }
    }

    return results
  }

  /**
   * Get the count of locally saved reports
   */
  getLocalReportCount(): number {
    return this.getLocalReports().length
  }
}

// Singleton instance for global use
let globalReporter: ErrorReporter | null = null

/**
 * Get the global error reporter instance
 */
export function getErrorReporter(): ErrorReporter {
  if (!globalReporter) {
    globalReporter = new ErrorReporter()
  }
  return globalReporter
}

/**
 * Configure the global error reporter
 */
export function configureErrorReporter(options: {
  submitEndpoint?: string
  onSubmit?: (report: ErrorReport) => Promise<ErrorReportResult>
}): void {
  globalReporter = new ErrorReporter(options)
}

/**
 * Reset the global error reporter (useful for testing)
 */
export function resetErrorReporter(): void {
  globalReporter = null
}

/**
 * Set up automatic retry of local reports on connectivity restoration
 * Requirements: 5.5
 */
export function setupAutoRetry(): () => void {
  const connectivityMonitor = getConnectivityMonitor()
  const reporter = getErrorReporter()

  const unsubscribe = connectivityMonitor.onConnectivityChange(async (isOnline) => {
    if (isOnline) {
      const localCount = reporter.getLocalReportCount()
      if (localCount > 0) {
        console.log(`[ErrorReporter] Retrying ${localCount} local reports...`)
        await reporter.retryLocalReports()
      }
    }
  })

  return unsubscribe
}
