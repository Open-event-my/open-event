import { useCallback, useSyncExternalStore } from 'react'

export type Audience = 'developer' | 'organizer'

const STORAGE_KEY = 'open-event-audience'

/**
 * Hook to manage audience toggle state (developer vs organizer).
 * Persists preference to localStorage and syncs across tabs.
 *
 * @returns {Object} Audience state and controls
 * @returns {Audience} audience - Current audience ('developer' | 'organizer')
 * @returns {Function} setAudience - Function to update audience preference
 * @returns {boolean} isDeveloper - Convenience boolean for developer audience
 */
export function useAudienceToggle() {
  // Use useSyncExternalStore for proper SSR hydration with localStorage
  const audience = useSyncExternalStore(subscribeToStorage, getStoredAudience, getServerSnapshot)

  const setAudience = useCallback((value: Audience) => {
    localStorage.setItem(STORAGE_KEY, value)
    // Dispatch storage event to sync across hook instances
    window.dispatchEvent(new StorageEvent('storage'))
  }, [])

  return {
    audience,
    setAudience,
    isDeveloper: audience === 'developer',
  }
}

// Subscribe to storage changes
function subscribeToStorage(callback: () => void) {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      callback()
    }
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

// Get current value from localStorage
function getStoredAudience(): Audience {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'developer' ? 'developer' : 'organizer'
}

// Server snapshot (default value for SSR)
function getServerSnapshot(): Audience {
  return 'organizer'
}
