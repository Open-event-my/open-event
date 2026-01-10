/**
 * Property-Based Tests for Error Reporter Service
 *
 * Tests Properties 12 and 13:
 * - Property 12: Error Report Content Completeness (Requirements 5.3)
 * - Property 13: Local Storage Fallback (Requirements 5.5)
 *
 * Feature: error-messaging-improvements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import {
  ErrorReporter,
  createErrorReport,
  validateErrorReport,
  collectDeviceInfo,
  generateReferenceNumber,
  recordAction,
  getActionHistory,
  clearActionHistory,
  type ErrorReport,
} from './errorReporter'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

// Mock connectivity monitor
vi.mock('./connectivityMonitor', () => ({
  getConnectivityMonitor: () => ({
    isOnline: true,
    onConnectivityChange: vi.fn(() => () => {}),
  }),
}))

describe('Error Reporter - Property Tests', () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    localStorageMock.clear()
    clearActionHistory()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Feature: error-messaging-improvements, Property 12: Error Report Content Completeness
   * Validates: Requirements 5.3
   *
   * For any submitted error report, the report SHALL contain:
   * error message, sanitized stack trace, device info, and timestamp.
   */
  describe('Property 12: Error Report Content Completeness', () => {
    // Generator for error IDs
    const errorIdArbitrary = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0)

    // Generator for error messages
    const errorMessageArbitrary = fc
      .string({ minLength: 1, maxLength: 200 })
      .filter((s) => s.trim().length > 0)

    // Generator for stack traces
    const stackTraceArbitrary = fc.option(fc.string({ minLength: 10, maxLength: 500 }), {
      nil: undefined,
    })

    // Generator for user descriptions
    const userDescriptionArbitrary = fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
      nil: undefined,
    })

    it('should always include error message in report', () => {
      fc.assert(
        fc.property(errorIdArbitrary, errorMessageArbitrary, (errorId, message) => {
          const report = createErrorReport(errorId, message)

          // Report should contain the message
          expect(report.message).toBeTruthy()
          expect(typeof report.message).toBe('string')
          expect(report.message.length).toBeGreaterThan(0)
        }),
        { numRuns: 100 }
      )
    })

    it('should always include device info in report', () => {
      fc.assert(
        fc.property(errorIdArbitrary, errorMessageArbitrary, (errorId, message) => {
          const report = createErrorReport(errorId, message)

          // Report should contain device info
          expect(report.deviceInfo).toBeDefined()
          expect(typeof report.deviceInfo.userAgent).toBe('string')
          expect(typeof report.deviceInfo.platform).toBe('string')
          expect(typeof report.deviceInfo.language).toBe('string')
          expect(typeof report.deviceInfo.screenSize).toBe('string')
          expect(typeof report.deviceInfo.viewportSize).toBe('string')
        }),
        { numRuns: 100 }
      )
    })

    it('should always include timestamp in report', () => {
      fc.assert(
        fc.property(errorIdArbitrary, errorMessageArbitrary, (errorId, message) => {
          const beforeTimestamp = Date.now()
          const report = createErrorReport(errorId, message)
          const afterTimestamp = Date.now()

          // Report should contain a valid timestamp
          expect(report.timestamp).toBeDefined()
          expect(typeof report.timestamp).toBe('number')
          expect(report.timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
          expect(report.timestamp).toBeLessThanOrEqual(afterTimestamp)
        }),
        { numRuns: 100 }
      )
    })

    it('should include stack trace when provided', () => {
      fc.assert(
        fc.property(
          errorIdArbitrary,
          errorMessageArbitrary,
          fc.string({ minLength: 10, maxLength: 500 }),
          (errorId, message, stackTrace) => {
            const report = createErrorReport(errorId, message, { stackTrace })

            // Report should contain the stack trace
            expect(report.stackTrace).toBeDefined()
            expect(typeof report.stackTrace).toBe('string')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include action history in report', () => {
      fc.assert(
        fc.property(
          errorIdArbitrary,
          errorMessageArbitrary,
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
          (errorId, message, actions) => {
            // Clear and record actions
            clearActionHistory()
            actions.forEach((action) => recordAction(action))

            const report = createErrorReport(errorId, message)

            // Report should contain action history
            expect(report.actionHistory).toBeDefined()
            expect(Array.isArray(report.actionHistory)).toBe(true)
            expect(report.actionHistory.length).toBe(actions.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate reports correctly', () => {
      fc.assert(
        fc.property(
          errorIdArbitrary,
          errorMessageArbitrary,
          stackTraceArbitrary,
          userDescriptionArbitrary,
          (errorId, message, stackTrace, userDescription) => {
            const report = createErrorReport(errorId, message, {
              stackTrace,
              userDescription,
            })

            // Valid reports should pass validation
            expect(validateErrorReport(report)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid reports', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Missing errorId
            fc.constant({
              message: 'test',
              deviceInfo: collectDeviceInfo(),
              timestamp: Date.now(),
              actionHistory: [],
            }),
            // Missing message
            fc.constant({
              errorId: 'test',
              deviceInfo: collectDeviceInfo(),
              timestamp: Date.now(),
              actionHistory: [],
            }),
            // Missing deviceInfo
            fc.constant({
              errorId: 'test',
              message: 'test',
              timestamp: Date.now(),
              actionHistory: [],
            }),
            // Missing timestamp
            fc.constant({
              errorId: 'test',
              message: 'test',
              deviceInfo: collectDeviceInfo(),
              actionHistory: [],
            }),
            // Invalid timestamp
            fc.constant({
              errorId: 'test',
              message: 'test',
              deviceInfo: collectDeviceInfo(),
              timestamp: -1,
              actionHistory: [],
            }),
            // Missing actionHistory
            fc.constant({
              errorId: 'test',
              message: 'test',
              deviceInfo: collectDeviceInfo(),
              timestamp: Date.now(),
            })
          ),
          (invalidReport) => {
            // Invalid reports should fail validation
            expect(validateErrorReport(invalidReport as ErrorReport)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique reference numbers', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 50 }), (count) => {
          const referenceNumbers = new Set<string>()

          for (let i = 0; i < count; i++) {
            const refNum = generateReferenceNumber()
            referenceNumbers.add(refNum)
          }

          // All reference numbers should be unique
          expect(referenceNumbers.size).toBe(count)
        }),
        { numRuns: 100 }
      )
    })

    it('should format reference numbers correctly', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const refNum = generateReferenceNumber()

          // Reference number should match format ERR-YYYYMMDD-XXXXX
          expect(refNum).toMatch(/^ERR-\d{8}-[A-Z0-9]{5}$/)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Feature: error-messaging-improvements, Property 13: Local Storage Fallback
   * Validates: Requirements 5.5
   *
   * For any error report that fails to submit, the report SHALL be saved
   * to local storage and retrievable via getLocalReports().
   */
  describe('Property 13: Local Storage Fallback', () => {
    // Generator for error IDs
    const errorIdArbitrary = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0)

    // Generator for error messages
    const errorMessageArbitrary = fc
      .string({ minLength: 1, maxLength: 200 })
      .filter((s) => s.trim().length > 0)

    it('should save reports to local storage', () => {
      fc.assert(
        fc.property(errorIdArbitrary, errorMessageArbitrary, (errorId, message) => {
          const reporter = new ErrorReporter()
          const report = createErrorReport(errorId, message)

          // Save locally
          reporter.saveLocally(report)

          // Should be retrievable
          const localReports = reporter.getLocalReports()
          expect(localReports.length).toBeGreaterThan(0)

          // Should contain the saved report
          const savedReport = localReports.find((r) => r.errorId === errorId)
          expect(savedReport).toBeDefined()
          expect(savedReport?.message).toBe(report.message)

          // Cleanup
          reporter.clearLocalReports()
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve all report fields in local storage', () => {
      fc.assert(
        fc.property(
          errorIdArbitrary,
          errorMessageArbitrary,
          fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          (errorId, message, stackTrace, userDescription) => {
            const reporter = new ErrorReporter()
            const report = createErrorReport(errorId, message, {
              stackTrace,
              userDescription,
            })

            // Save locally
            reporter.saveLocally(report)

            // Retrieve and verify
            const localReports = reporter.getLocalReports()
            const savedReport = localReports.find((r) => r.errorId === errorId)

            expect(savedReport).toBeDefined()
            expect(savedReport?.errorId).toBe(report.errorId)
            expect(savedReport?.message).toBe(report.message)
            expect(savedReport?.stackTrace).toBe(report.stackTrace)
            expect(savedReport?.userDescription).toBe(report.userDescription)
            expect(savedReport?.timestamp).toBe(report.timestamp)
            expect(savedReport?.deviceInfo).toEqual(report.deviceInfo)
            expect(savedReport?.actionHistory).toEqual(report.actionHistory)

            // Cleanup
            reporter.clearLocalReports()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle multiple reports in local storage', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(errorIdArbitrary, errorMessageArbitrary), {
            minLength: 1,
            maxLength: 5,
          }),
          (reportData) => {
            const reporter = new ErrorReporter()

            // Save multiple reports
            const reports = reportData.map(([errorId, message]) =>
              createErrorReport(errorId, message)
            )
            reports.forEach((report) => reporter.saveLocally(report))

            // All reports should be retrievable
            const localReports = reporter.getLocalReports()
            expect(localReports.length).toBe(reports.length)

            // Cleanup
            reporter.clearLocalReports()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should clear local reports correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(errorIdArbitrary, errorMessageArbitrary), {
            minLength: 1,
            maxLength: 5,
          }),
          (reportData) => {
            const reporter = new ErrorReporter()

            // Save reports
            reportData.forEach(([errorId, message]) => {
              reporter.saveLocally(createErrorReport(errorId, message))
            })

            // Clear reports
            reporter.clearLocalReports()

            // Should be empty
            const localReports = reporter.getLocalReports()
            expect(localReports.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return correct local report count', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(errorIdArbitrary, errorMessageArbitrary), {
            minLength: 0,
            maxLength: 5,
          }),
          (reportData) => {
            const reporter = new ErrorReporter()
            reporter.clearLocalReports()

            // Save reports
            reportData.forEach(([errorId, message]) => {
              reporter.saveLocally(createErrorReport(errorId, message))
            })

            // Count should match
            expect(reporter.getLocalReportCount()).toBe(reportData.length)

            // Cleanup
            reporter.clearLocalReports()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should limit local reports to maximum count', () => {
      fc.assert(
        fc.property(fc.integer({ min: 15, max: 20 }), (count) => {
          const reporter = new ErrorReporter()
          reporter.clearLocalReports()

          // Save more reports than the limit
          for (let i = 0; i < count; i++) {
            reporter.saveLocally(createErrorReport(`error-${i}`, `Message ${i}`))
          }

          // Should be limited to MAX_LOCAL_REPORTS (10)
          const localReports = reporter.getLocalReports()
          expect(localReports.length).toBeLessThanOrEqual(10)

          // Cleanup
          reporter.clearLocalReports()
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional property tests for action history
   */
  describe('Action History', () => {
    it('should record and retrieve actions correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
            { minLength: 1, maxLength: 10 }
          ),
          (actions) => {
            clearActionHistory()

            // Record actions
            actions.forEach((action) => recordAction(action))

            // Retrieve and verify
            const history = getActionHistory()
            expect(history.length).toBe(actions.length)

            // Each action should be in the history (with timestamp prefix)
            actions.forEach((action, index) => {
              expect(history[index]).toContain(action)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should limit action history to maximum count', () => {
      fc.assert(
        fc.property(fc.integer({ min: 25, max: 30 }), (count) => {
          clearActionHistory()

          // Record more actions than the limit
          for (let i = 0; i < count; i++) {
            recordAction(`Action ${i}`)
          }

          // Should be limited to MAX_ACTION_HISTORY (20)
          const history = getActionHistory()
          expect(history.length).toBeLessThanOrEqual(20)
        }),
        { numRuns: 100 }
      )
    })

    it('should include timestamps in action history', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          (action) => {
            clearActionHistory()
            recordAction(action)

            const history = getActionHistory()
            expect(history.length).toBe(1)

            // Should have timestamp format [ISO date]
            expect(history[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Device info collection tests
   */
  describe('Device Info Collection', () => {
    it('should always return valid device info structure', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const deviceInfo = collectDeviceInfo()

          // Should have all required fields
          expect(deviceInfo).toBeDefined()
          expect(typeof deviceInfo.userAgent).toBe('string')
          expect(typeof deviceInfo.platform).toBe('string')
          expect(typeof deviceInfo.language).toBe('string')
          expect(typeof deviceInfo.screenSize).toBe('string')
          expect(typeof deviceInfo.viewportSize).toBe('string')
        }),
        { numRuns: 100 }
      )
    })
  })
})
