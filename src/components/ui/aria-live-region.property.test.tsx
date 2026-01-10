/**
 * Property-Based Tests for ARIA Live Region
 *
 * Feature: error-messaging-improvements, Property 14: ARIA Live Region Announcements
 * Validates: Requirements 6.1
 *
 * For any error that occurs, the ARIA live region SHALL be updated with the error message
 * and have aria-live="assertive" for critical errors or aria-live="polite" for non-critical errors.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { render, cleanup, act } from '@testing-library/react'
import { AriaLiveProvider } from './aria-live-region'
import { useAriaLive } from '@/hooks/useAriaLive'
import { getPolitenessForCategory } from './aria-live-region.utils'
import type { EnhancedFormattedError, ErrorCategory } from '@/lib/errorFormatter'
import { generateErrorId } from '@/lib/errorFormatter'

// Helper component to test the hook
function TestComponent({ onMount }: { onMount: (api: ReturnType<typeof useAriaLive>) => void }) {
  const api = useAriaLive()
  onMount(api)
  return null
}

// Helper to create a mock EnhancedFormattedError
function createMockError(
  category: ErrorCategory,
  message: string,
  suggestions?: string[]
): EnhancedFormattedError {
  return {
    id: generateErrorId(),
    timestamp: Date.now(),
    message,
    category,
    suggestions,
    requiresAcknowledgment: false,
    persistent: false,
    recoveryActions: [],
  }
}

describe('ARIA Live Region - Property Tests', () => {
  beforeEach(() => {
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Feature: error-messaging-improvements, Property 14: ARIA Live Region Announcements
   * Validates: Requirements 6.1
   *
   * For any error that occurs, the ARIA live region SHALL be updated with the error message
   * and have aria-live="assertive" for critical errors or aria-live="polite" for non-critical errors.
   */
  describe('Property 14: ARIA Live Region Announcements', () => {
    // Critical error categories that should use assertive
    const criticalCategories: ErrorCategory[] = ['auth', 'permission', 'payment', 'server']

    // Non-critical error categories that should use polite
    const nonCriticalCategories: ErrorCategory[] = [
      'network',
      'validation',
      'notFound',
      'rateLimit',
      'unknown',
    ]

    it('should use assertive politeness for critical error categories', () => {
      fc.assert(
        fc.property(fc.constantFrom(...criticalCategories), (category) => {
          const politeness = getPolitenessForCategory(category)
          expect(politeness).toBe('assertive')
        }),
        { numRuns: 100 }
      )
    })

    it('should use polite politeness for non-critical error categories', () => {
      fc.assert(
        fc.property(fc.constantFrom(...nonCriticalCategories), (category) => {
          const politeness = getPolitenessForCategory(category)
          expect(politeness).toBe('polite')
        }),
        { numRuns: 100 }
      )
    })

    it('should render assertive live region with role="alert"', () => {
      render(
        <AriaLiveProvider>
          <div>Test</div>
        </AriaLiveProvider>
      )

      const assertiveRegion = document.getElementById('aria-live-assertive')
      expect(assertiveRegion).toBeTruthy()
      expect(assertiveRegion?.getAttribute('role')).toBe('alert')
      expect(assertiveRegion?.getAttribute('aria-live')).toBe('assertive')
      expect(assertiveRegion?.getAttribute('aria-atomic')).toBe('true')
    })

    it('should render polite live region with role="status"', () => {
      render(
        <AriaLiveProvider>
          <div>Test</div>
        </AriaLiveProvider>
      )

      const politeRegion = document.getElementById('aria-live-polite')
      expect(politeRegion).toBeTruthy()
      expect(politeRegion?.getAttribute('role')).toBe('status')
      expect(politeRegion?.getAttribute('aria-live')).toBe('polite')
      expect(politeRegion?.getAttribute('aria-atomic')).toBe('true')
    })

    it('should update assertive region for critical errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...criticalCategories),
          fc.string({ minLength: 5, maxLength: 100 }),
          (category, message) => {
            cleanup()

            let api: ReturnType<typeof useAriaLive> | null = null

            render(
              <AriaLiveProvider>
                <TestComponent
                  onMount={(a) => {
                    api = a
                  }}
                />
              </AriaLiveProvider>
            )

            const error = createMockError(category, message)

            act(() => {
              api?.announceError(error)
            })

            const assertiveRegion = document.getElementById('aria-live-assertive')
            expect(assertiveRegion?.textContent).toContain(message)
          }
        ),
        { numRuns: 20 } // Reduced runs due to DOM operations
      )
    })

    it('should update polite region for non-critical errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...nonCriticalCategories),
          fc.string({ minLength: 5, maxLength: 100 }),
          (category, message) => {
            cleanup()

            let api: ReturnType<typeof useAriaLive> | null = null

            render(
              <AriaLiveProvider>
                <TestComponent
                  onMount={(a) => {
                    api = a
                  }}
                />
              </AriaLiveProvider>
            )

            const error = createMockError(category, message)

            act(() => {
              api?.announceError(error)
            })

            const politeRegion = document.getElementById('aria-live-polite')
            expect(politeRegion?.textContent).toContain(message)
          }
        ),
        { numRuns: 20 } // Reduced runs due to DOM operations
      )
    })

    it('should include error message in announcement for all categories', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ErrorCategory>(
            'auth',
            'network',
            'validation',
            'permission',
            'notFound',
            'rateLimit',
            'payment',
            'server',
            'unknown'
          ),
          fc.string({ minLength: 10, maxLength: 100 }).filter((s) => s.trim().length > 0),
          (category, message) => {
            cleanup()

            let api: ReturnType<typeof useAriaLive> | null = null

            render(
              <AriaLiveProvider>
                <TestComponent
                  onMount={(a) => {
                    api = a
                  }}
                />
              </AriaLiveProvider>
            )

            const error = createMockError(category, message)

            act(() => {
              api?.announceError(error)
            })

            // Check that the message appears in one of the live regions
            const assertiveRegion = document.getElementById('aria-live-assertive')
            const politeRegion = document.getElementById('aria-live-polite')

            const assertiveContent = assertiveRegion?.textContent || ''
            const politeContent = politeRegion?.textContent || ''

            const messageFound =
              assertiveContent.includes(message) || politeContent.includes(message)
            expect(messageFound).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should include first suggestion in announcement when available', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<ErrorCategory>('auth', 'network', 'validation'),
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
          (category, message, suggestions) => {
            cleanup()

            let api: ReturnType<typeof useAriaLive> | null = null

            render(
              <AriaLiveProvider>
                <TestComponent
                  onMount={(a) => {
                    api = a
                  }}
                />
              </AriaLiveProvider>
            )

            const error = createMockError(category, message, suggestions)

            act(() => {
              api?.announceError(error)
            })

            // Check that the first suggestion appears in one of the live regions
            const assertiveRegion = document.getElementById('aria-live-assertive')
            const politeRegion = document.getElementById('aria-live-polite')

            const assertiveContent = assertiveRegion?.textContent || ''
            const politeContent = politeRegion?.textContent || ''

            const suggestionFound =
              assertiveContent.includes(suggestions[0]) || politeContent.includes(suggestions[0])
            expect(suggestionFound).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should clear announcements when clearAnnouncements is called', () => {
      let api: ReturnType<typeof useAriaLive> | null = null

      render(
        <AriaLiveProvider>
          <TestComponent
            onMount={(a) => {
              api = a
            }}
          />
        </AriaLiveProvider>
      )

      // Make an announcement
      act(() => {
        api?.announce('Test message', 'assertive')
      })

      const assertiveRegion = document.getElementById('aria-live-assertive')
      expect(assertiveRegion?.textContent).toBe('Test message')

      // Clear announcements
      act(() => {
        api?.clearAnnouncements()
      })

      expect(assertiveRegion?.textContent).toBe('')
    })

    it('should handle announce with default polite politeness', () => {
      let api: ReturnType<typeof useAriaLive> | null = null

      render(
        <AriaLiveProvider>
          <TestComponent
            onMount={(a) => {
              api = a
            }}
          />
        </AriaLiveProvider>
      )

      act(() => {
        api?.announce('Default politeness message')
      })

      const politeRegion = document.getElementById('aria-live-polite')
      expect(politeRegion?.textContent).toBe('Default politeness message')
    })

    it('should handle announce with explicit assertive politeness', () => {
      let api: ReturnType<typeof useAriaLive> | null = null

      render(
        <AriaLiveProvider>
          <TestComponent
            onMount={(a) => {
              api = a
            }}
          />
        </AriaLiveProvider>
      )

      act(() => {
        api?.announce('Assertive message', 'assertive')
      })

      const assertiveRegion = document.getElementById('aria-live-assertive')
      expect(assertiveRegion?.textContent).toBe('Assertive message')
    })
  })
})
