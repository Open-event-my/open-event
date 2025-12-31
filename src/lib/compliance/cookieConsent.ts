/**
 * Cookie Consent Manager
 *
 * Manages user cookie consent preferences for GDPR compliance.
 * Stores consent preferences in localStorage and provides methods
 * to check consent status for different cookie categories.
 */

export interface ConsentPreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
}

const CONSENT_STORAGE_KEY = 'cookie-consent-preferences'
const CONSENT_VERSION = '1.0.0'

export class CookieConsentManager {
  /**
   * Get the current consent preferences from storage
   * @returns ConsentPreferences or null if no consent has been given
   */
  getConsent(): ConsentPreferences | null {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
      if (!stored) {
        return null
      }

      const data = JSON.parse(stored)

      // Validate the stored data structure
      if (
        typeof data.necessary === 'boolean' &&
        typeof data.analytics === 'boolean' &&
        typeof data.marketing === 'boolean' &&
        typeof data.timestamp === 'number'
      ) {
        return data as ConsentPreferences
      }

      return null
    } catch (error) {
      console.error('Failed to get consent preferences:', error)
      return null
    }
  }

  /**
   * Set consent preferences
   * @param preferences The consent preferences to store
   */
  setConsent(preferences: ConsentPreferences): void {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences))

      // Dispatch custom event so other parts of the app can react
      window.dispatchEvent(new CustomEvent('consentChanged', { detail: preferences }))
    } catch (error) {
      console.error('Failed to set consent preferences:', error)
      throw new Error('Failed to save consent preferences')
    }
  }

  /**
   * Check if user has given consent for a specific category
   * @param category The cookie category to check
   * @returns true if consent has been given, false otherwise
   */
  hasConsent(category: keyof ConsentPreferences): boolean {
    const consent = this.getConsent()

    if (!consent) {
      // No consent given yet - only necessary cookies are allowed
      return category === 'necessary'
    }

    const value = consent[category]
    return typeof value === 'boolean' ? value : false
  }

  /**
   * Check if the user has made any consent choice
   * @returns true if consent has been recorded, false otherwise
   */
  hasConsentBeenGiven(): boolean {
    return this.getConsent() !== null
  }

  /**
   * Clear all consent preferences
   */
  clearConsent(): void {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY)

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('consentCleared'))
    } catch (error) {
      console.error('Failed to clear consent preferences:', error)
    }
  }

  /**
   * Show the consent banner (to be implemented by UI component)
   * This method is a placeholder that UI components can override
   */
  showConsentBanner(): void {
    // This will be implemented by the UI component
    // The component will listen for this call or check hasConsentBeenGiven()
    window.dispatchEvent(new CustomEvent('showConsentBanner'))
  }

  /**
   * Get the current consent version
   * @returns The consent version string
   */
  getConsentVersion(): string {
    return CONSENT_VERSION
  }

  /**
   * Accept all cookies
   */
  acceptAll(): void {
    this.setConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    })
  }

  /**
   * Accept only necessary cookies
   */
  acceptNecessaryOnly(): void {
    this.setConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    })
  }

  /**
   * Update specific consent preferences
   * @param updates Partial consent preferences to update
   */
  updateConsent(updates: Partial<Omit<ConsentPreferences, 'timestamp'>>): void {
    const current = this.getConsent()

    const newPreferences: ConsentPreferences = {
      necessary: updates.necessary ?? current?.necessary ?? true,
      analytics: updates.analytics ?? current?.analytics ?? false,
      marketing: updates.marketing ?? current?.marketing ?? false,
      timestamp: Date.now(),
    }

    this.setConsent(newPreferences)
  }
}

// Export a singleton instance
export const cookieConsentManager = new CookieConsentManager()
