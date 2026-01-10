# Implementation Plan: Error Messaging Improvements

## Overview

This implementation plan enhances the existing error handling system with contextual messaging, actionable recovery options, offline handling, accessibility improvements, and user error reporting. The plan builds incrementally on the existing `errorFormatter.ts` and error components.

## Tasks

- [x] 1. Enhance Core Error Formatter
  - [x] 1.1 Add context support and unique ID generation to error formatter
    - Extend `formatErrorMessage` to accept optional `ErrorContext` parameter
    - Implement `generateErrorId()` using crypto.randomUUID or fallback
    - Add `timestamp`, `id`, and `context` fields to `FormattedError`
    - Update existing error formatting to use new enhanced type
    - _Requirements: 1.1, 1.2, 7.1_

  - [x] 1.2 Write property test for contextual error formatting
    - **Property 1: Contextual Error Formatting**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.3 Write property test for unique error ID generation
    - **Property 16: Unique Error ID Generation**
    - **Validates: Requirements 7.1**

  - [x] 1.4 Implement multiple error combination
    - Create `combineErrors(errors: unknown[], context: ErrorContext)` function
    - Combine messages while preserving shared context
    - Aggregate suggestions from all errors
    - _Requirements: 1.4_

  - [x] 1.5 Write property test for multiple error combination
    - **Property 2: Multiple Error Combination**
    - **Validates: Requirements 1.4**

  - [x] 1.6 Implement PII sanitization
    - Create `sanitizePII(data: unknown)` function
    - Detect and redact email addresses, phone numbers, names
    - Apply to error messages and stack traces before logging
    - _Requirements: 8.5_

  - [x] 1.7 Write property test for PII redaction
    - **Property 20: PII Redaction**
    - **Validates: Requirements 8.5**

- [x] 2. Implement Recovery Actions System
  - [x] 2.1 Define recovery action types and handlers
    - Create `RecoveryAction` interface with type, label, handler
    - Implement action type handlers: retry, navigate, focus, countdown, custom
    - Map error categories to default recovery actions
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [x] 2.2 Write property test for recovery action presence by category
    - **Property 3: Recovery Action Presence by Category**
    - **Validates: Requirements 2.1**

  - [x] 2.3 Implement exponential backoff retry logic
    - Create `calculateBackoffDelay(attempt, config)` function
    - Implement `retryWithBackoff(action, config)` wrapper
    - Add retry state tracking (attempt count, last error)
    - _Requirements: 2.2_

  - [x] 2.4 Write property test for exponential backoff calculation
    - **Property 4: Exponential Backoff Calculation**
    - **Validates: Requirements 2.2**

  - [x] 2.5 Implement countdown timer for rate limits
    - Create `useCountdown(seconds)` hook
    - Display remaining time in recovery action button
    - Enable retry button when countdown reaches 0
    - _Requirements: 2.6_

  - [x] 2.6 Write property test for rate limit countdown
    - **Property 5: Rate Limit Countdown**
    - **Validates: Requirements 2.6**

- [x] 3. Checkpoint - Core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Error State Manager
  - [x] 4.1 Create error state manager with React context
    - Implement `ErrorStateManager` with Map-based storage
    - Add `addError`, `removeError`, `clearTransient`, `getErrors` methods
    - Create `ErrorStateProvider` and `useErrorState` hook
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [x] 4.2 Implement error deduplication
    - Create `getErrorSignature(error)` function
    - Track duplicate counts per signature
    - Update existing error count instead of adding duplicate
    - _Requirements: 7.2_

  - [x] 4.3 Write property test for error deduplication
    - **Property 17: Error Deduplication**
    - **Validates: Requirements 7.2**

  - [x] 4.4 Write property test for error ordering
    - **Property 18: Error Ordering**
    - **Validates: Requirements 7.6**

  - [x] 4.5 Implement error persistence across navigation
    - Mark errors as persistent or transient based on category
    - Clear transient errors on route change
    - Preserve persistent errors until explicitly dismissed
    - _Requirements: 7.4, 7.5_

  - [x] 4.6 Write property test for transient error clearing
    - **Property 19: Transient Error Clearing**
    - **Validates: Requirements 7.4**

- [x] 5. Implement Connectivity Monitor
  - [x] 5.1 Create connectivity monitor service
    - Listen to `online`/`offline` browser events
    - Expose `isOnline` state and subscription method
    - Implement ARIA live region announcements for status changes
    - _Requirements: 3.1, 3.5_

  - [x] 5.2 Implement action queue for offline operations
    - Create queue data structure with action metadata
    - Add `queueAction`, `getQueuedActions`, `clearQueue` methods
    - Store queue in memory with optional localStorage backup
    - _Requirements: 3.2_

  - [x] 5.3 Write property test for offline action queuing
    - **Property 6: Offline Action Queuing**
    - **Validates: Requirements 3.2**

  - [x] 5.4 Implement queue processing on reconnection
    - Process queued actions when connectivity restored
    - Apply retry logic for failed actions
    - Clear successfully processed actions from queue
    - _Requirements: 3.3_

  - [x] 5.5 Write property test for queue processing on reconnect
    - **Property 7: Queue Processing on Reconnect**
    - **Validates: Requirements 3.3**

  - [x] 5.6 Write property test for network error messaging
    - **Property 8: Network Error Messaging**
    - **Validates: Requirements 3.4**

- [x] 6. Checkpoint - State and connectivity
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Accessible Error UI Components
  - [x] 7.1 Create enhanced ErrorBanner component
    - Display error message with category-appropriate styling
    - Show recovery action buttons with loading states
    - Include duplicate count badge when applicable
    - Implement focus management (auto-focus, return focus on dismiss)
    - Add "Report Issue" button
    - _Requirements: 2.1, 2.7, 6.2, 6.3, 6.4, 6.7, 7.2_

  - [x] 7.2 Create ARIA live region for error announcements
    - Add hidden live region to app root
    - Announce errors with appropriate politeness level
    - Clear announcements after delay
    - _Requirements: 6.1_

  - [x] 7.3 Write property test for ARIA live region announcements
    - **Property 14: ARIA Live Region Announcements**
    - **Validates: Requirements 6.1**

  - [x] 7.4 Update ErrorToast with persistence logic
    - Determine duration based on error type
    - Show recovery actions in toast when appropriate
    - Prevent auto-dismiss for acknowledgment-required errors
    - _Requirements: 6.6_

  - [x] 7.5 Write property test for toast persistence by error type
    - **Property 15: Toast Persistence by Error Type**
    - **Validates: Requirements 6.6**

  - [x] 7.6 Create OfflineBanner component
    - Display persistent banner when offline
    - Show queued action count
    - List available vs unavailable features
    - _Requirements: 3.1, 3.6_

- [x] 8. Implement Form Validation Error Components
  - [x] 8.1 Create FormFieldError component
    - Display error message below field
    - Include suggestion for fixing
    - Apply ARIA attributes (aria-invalid, aria-describedby)
    - _Requirements: 4.1, 4.4, 4.6_

  - [x] 8.2 Write property test for field error ARIA association
    - **Property 9: Field Error ARIA Association**
    - **Validates: Requirements 4.4**

  - [x] 8.3 Create FormErrorSummary component
    - List all field errors at top of form
    - Link each error to its field (click to focus)
    - Update dynamically as errors change
    - _Requirements: 4.5_

  - [x] 8.4 Write property test for error summary completeness
    - **Property 10: Error Summary Completeness**
    - **Validates: Requirements 4.5**

  - [x] 8.5 Implement error clearing on field correction
    - Watch field values for changes
    - Clear error when value becomes valid
    - Re-validate on blur or submit
    - _Requirements: 4.3_

  - [x] 8.6 Write property test for error clearing on correction
    - **Property 11: Error Clearing on Correction**
    - **Validates: Requirements 4.3**

  - [x] 8.7 Implement focus management for form errors
    - Focus first invalid field on form submission
    - Scroll field into view if needed
    - _Requirements: 4.2_

- [x] 9. Checkpoint - UI components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Error Reporter
  - [x] 10.1 Create ErrorReporter service
    - Implement `submitReport(report)` method
    - Generate reference numbers for submitted reports
    - Collect device info and action history
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 10.2 Write property test for error report content completeness
    - **Property 12: Error Report Content Completeness**
    - **Validates: Requirements 5.3**

  - [x] 10.3 Implement local storage fallback
    - Save failed reports to localStorage
    - Implement `getLocalReports()` and `retryLocalReports()`
    - Retry on app load and connectivity restoration
    - _Requirements: 5.5_

  - [x] 10.4 Write property test for local storage fallback
    - **Property 13: Local Storage Fallback**
    - **Validates: Requirements 5.5**

  - [x] 10.5 Create ErrorReportModal component
    - Pre-fill with error context
    - Allow user to add description and screenshots
    - Show confirmation with reference number on success
    - _Requirements: 5.2, 5.4, 5.6_

- [x] 11. Implement Error Logging Integration
  - [x] 11.1 Enhance error logging for development
    - Log full technical details to console in dev mode
    - Include context, component stack, timestamp
    - Format for readability
    - _Requirements: 8.1, 8.3_

  - [x] 11.2 Integrate with Sentry for production
    - Send sanitized error data to Sentry
    - Include error ID for correlation with user reports
    - Apply PII sanitization before sending
    - _Requirements: 8.2, 8.4_

- [x] 12. Integration and Wiring
  - [x] 12.1 Wire error state to existing error boundaries
    - Update ErrorBoundary to use ErrorStateManager
    - Update QueryErrorBoundary to use enhanced formatting
    - Connect RouteErrorFallback to error state
    - _Requirements: All_

  - [x] 12.2 Update existing error handling calls
    - Replace `handleError` calls with context-aware version
    - Update form validation to use new components
    - Wire connectivity monitor to app root
    - _Requirements: All_

  - [x] 12.3 Add error state cleanup on navigation
    - Listen to route changes
    - Clear transient errors on navigation
    - Preserve persistent errors
    - _Requirements: 7.4_

- [x] 13. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use fast-check for property-based testing in TypeScript
