import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CookieConsentManager, type ConsentPreferences } from './cookieConsent';

describe('CookieConsentManager', () => {
  let manager: CookieConsentManager;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Reset localStorage mock
    mockLocalStorage = {};

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(),
    };

    // Mock window.dispatchEvent
    global.window.dispatchEvent = vi.fn();

    manager = new CookieConsentManager();
  });

  describe('getConsent', () => {
    it('should return null when no consent has been given', () => {
      const consent = manager.getConsent();
      expect(consent).toBeNull();
    });

    it('should return stored consent preferences', () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: true,
        marketing: false,
        timestamp: Date.now(),
      };

      mockLocalStorage['cookie-consent-preferences'] = JSON.stringify(preferences);

      const consent = manager.getConsent();
      expect(consent).toEqual(preferences);
    });

    it('should return null for invalid stored data', () => {
      mockLocalStorage['cookie-consent-preferences'] = 'invalid json';

      const consent = manager.getConsent();
      expect(consent).toBeNull();
    });

    it('should return null for incomplete stored data', () => {
      mockLocalStorage['cookie-consent-preferences'] = JSON.stringify({
        necessary: true,
        analytics: true,
        // missing marketing and timestamp
      });

      const consent = manager.getConsent();
      expect(consent).toBeNull();
    });
  });

  describe('setConsent', () => {
    it('should store consent preferences', () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: true,
        marketing: false,
        timestamp: Date.now(),
      };

      manager.setConsent(preferences);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookie-consent-preferences',
        JSON.stringify(preferences)
      );
    });

    it('should dispatch consentChanged event', () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: Date.now(),
      };

      manager.setConsent(preferences);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'consentChanged',
          detail: preferences,
        })
      );
    });

    it('should throw error if localStorage fails', () => {
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: Date.now(),
      };

      expect(() => manager.setConsent(preferences)).toThrow(
        'Failed to save consent preferences'
      );
    });
  });

  describe('hasConsent', () => {
    it('should return true for necessary cookies when no consent given', () => {
      expect(manager.hasConsent('necessary')).toBe(true);
    });

    it('should return false for analytics cookies when no consent given', () => {
      expect(manager.hasConsent('analytics')).toBe(false);
    });

    it('should return false for marketing cookies when no consent given', () => {
      expect(manager.hasConsent('marketing')).toBe(false);
    });

    it('should return true for accepted cookie categories', () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: true,
        marketing: false,
        timestamp: Date.now(),
      };

      mockLocalStorage['cookie-consent-preferences'] = JSON.stringify(preferences);

      expect(manager.hasConsent('necessary')).toBe(true);
      expect(manager.hasConsent('analytics')).toBe(true);
      expect(manager.hasConsent('marketing')).toBe(false);
    });
  });

  describe('hasConsentBeenGiven', () => {
    it('should return false when no consent has been given', () => {
      expect(manager.hasConsentBeenGiven()).toBe(false);
    });

    it('should return true when consent has been given', () => {
      const preferences: ConsentPreferences = {
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: Date.now(),
      };

      mockLocalStorage['cookie-consent-preferences'] = JSON.stringify(preferences);

      expect(manager.hasConsentBeenGiven()).toBe(true);
    });
  });

  describe('clearConsent', () => {
    it('should remove consent preferences from storage', () => {
      manager.clearConsent();

      expect(localStorage.removeItem).toHaveBeenCalledWith('cookie-consent-preferences');
    });

    it('should dispatch consentCleared event', () => {
      manager.clearConsent();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'consentCleared',
        })
      );
    });
  });

  describe('showConsentBanner', () => {
    it('should dispatch showConsentBanner event', () => {
      manager.showConsentBanner();

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'showConsentBanner',
        })
      );
    });
  });

  describe('getConsentVersion', () => {
    it('should return the consent version', () => {
      const version = manager.getConsentVersion();
      expect(version).toBe('1.0.0');
    });
  });

  describe('acceptAll', () => {
    it('should set all cookie categories to true', () => {
      manager.acceptAll();

      const stored = mockLocalStorage['cookie-consent-preferences'];
      expect(stored).toBeDefined();

      const preferences = JSON.parse(stored);
      expect(preferences.necessary).toBe(true);
      expect(preferences.analytics).toBe(true);
      expect(preferences.marketing).toBe(true);
      expect(preferences.timestamp).toBeGreaterThan(0);
    });
  });

  describe('acceptNecessaryOnly', () => {
    it('should set only necessary cookies to true', () => {
      manager.acceptNecessaryOnly();

      const stored = mockLocalStorage['cookie-consent-preferences'];
      expect(stored).toBeDefined();

      const preferences = JSON.parse(stored);
      expect(preferences.necessary).toBe(true);
      expect(preferences.analytics).toBe(false);
      expect(preferences.marketing).toBe(false);
      expect(preferences.timestamp).toBeGreaterThan(0);
    });
  });

  describe('updateConsent', () => {
    it('should update specific consent preferences', () => {
      // First set initial consent
      manager.acceptNecessaryOnly();

      // Then update analytics
      manager.updateConsent({ analytics: true });

      const stored = mockLocalStorage['cookie-consent-preferences'];
      const preferences = JSON.parse(stored);

      expect(preferences.necessary).toBe(true);
      expect(preferences.analytics).toBe(true);
      expect(preferences.marketing).toBe(false);
    });

    it('should preserve existing preferences when updating', () => {
      // Set initial consent with analytics enabled
      manager.setConsent({
        necessary: true,
        analytics: true,
        marketing: false,
        timestamp: Date.now(),
      });

      // Update only marketing
      manager.updateConsent({ marketing: true });

      const stored = mockLocalStorage['cookie-consent-preferences'];
      const preferences = JSON.parse(stored);

      expect(preferences.necessary).toBe(true);
      expect(preferences.analytics).toBe(true);
      expect(preferences.marketing).toBe(true);
    });

    it('should update timestamp when updating consent', () => {
      const oldTimestamp = Date.now() - 10000;

      manager.setConsent({
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: oldTimestamp,
      });

      manager.updateConsent({ analytics: true });

      const stored = mockLocalStorage['cookie-consent-preferences'];
      const preferences = JSON.parse(stored);

      expect(preferences.timestamp).toBeGreaterThan(oldTimestamp);
    });
  });

  describe('consent tracking and enforcement', () => {
    it('should track consent changes over time', () => {
      // Initial consent
      manager.acceptNecessaryOnly();
      const consent1 = manager.getConsent();
      expect(consent1?.analytics).toBe(false);

      // Update consent
      manager.updateConsent({ analytics: true });
      const consent2 = manager.getConsent();
      expect(consent2?.analytics).toBe(true);

      // Verify timestamp updated
      expect(consent2?.timestamp).toBeGreaterThanOrEqual(consent1?.timestamp || 0);
    });

    it('should enforce necessary cookies are always enabled', () => {
      manager.acceptAll();
      const consent = manager.getConsent();

      expect(consent?.necessary).toBe(true);
      expect(manager.hasConsent('necessary')).toBe(true);
    });

    it('should allow disabling optional cookies', () => {
      manager.acceptAll();

      manager.updateConsent({
        analytics: false,
        marketing: false,
      });

      expect(manager.hasConsent('analytics')).toBe(false);
      expect(manager.hasConsent('marketing')).toBe(false);
      expect(manager.hasConsent('necessary')).toBe(true);
    });

    it('should handle multiple consent updates correctly', () => {
      // Start with all rejected
      manager.acceptNecessaryOnly();

      // Enable analytics
      manager.updateConsent({ analytics: true });
      expect(manager.hasConsent('analytics')).toBe(true);

      // Enable marketing
      manager.updateConsent({ marketing: true });
      expect(manager.hasConsent('marketing')).toBe(true);

      // Disable analytics
      manager.updateConsent({ analytics: false });
      expect(manager.hasConsent('analytics')).toBe(false);
      expect(manager.hasConsent('marketing')).toBe(true);
    });

    it('should persist consent across manager instances', () => {
      const manager1 = new CookieConsentManager();
      manager1.acceptAll();

      const manager2 = new CookieConsentManager();
      expect(manager2.hasConsent('analytics')).toBe(true);
      expect(manager2.hasConsent('marketing')).toBe(true);
    });
  });
});
