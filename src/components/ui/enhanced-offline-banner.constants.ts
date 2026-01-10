/**
 * Enhanced Offline Banner Constants
 *
 * Constants for the enhanced offline banner component.
 */

/**
 * Feature availability configuration
 */
export interface FeatureAvailability {
  /** Feature name */
  name: string
  /** Whether the feature is available offline */
  availableOffline: boolean
  /** Optional description */
  description?: string
}

/**
 * Default feature availability list
 * Requirements: 3.6 - Show which features are available offline vs require connectivity
 */
export const DEFAULT_FEATURE_AVAILABILITY: FeatureAvailability[] = [
  { name: 'View cached events', availableOffline: true },
  { name: 'View saved tickets', availableOffline: true },
  { name: 'Browse event details', availableOffline: true },
  { name: 'Create new events', availableOffline: false },
  { name: 'Purchase tickets', availableOffline: false },
  { name: 'Update profile', availableOffline: false },
  { name: 'Send messages', availableOffline: false },
  { name: 'Real-time updates', availableOffline: false },
]
