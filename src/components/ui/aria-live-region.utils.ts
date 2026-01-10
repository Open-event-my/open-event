/**
 * ARIA Live Region Utilities
 *
 * Utility functions for ARIA live region announcements.
 */

import type { ErrorCategory } from '@/lib/errorFormatter'

/**
 * Politeness level for ARIA live region announcements
 * - 'assertive': Interrupts current speech (for critical errors)
 * - 'polite': Waits for current speech to finish (for non-critical errors)
 */
export type AriaLivePoliteness = 'assertive' | 'polite'

/**
 * Determine politeness level based on error category
 * Requirements: 6.1 - Use appropriate urgency for announcements
 */
export function getPolitenessForCategory(category: ErrorCategory): AriaLivePoliteness {
  // Critical errors that need immediate attention
  const criticalCategories: ErrorCategory[] = ['auth', 'permission', 'payment', 'server']

  return criticalCategories.includes(category) ? 'assertive' : 'polite'
}
