import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { Providers } from './providers.tsx'
import { initSentry, captureError } from './lib/sentry'
import { initializeEnvironment, envValidator } from './lib/config'

// Initialize and validate environment variables (must be first)
try {
  initializeEnvironment()
  console.log('[Config] Environment validated successfully')
} catch (error) {
  console.error('[Config] Environment validation failed:', error)
  // In production, this will throw and prevent app from starting
  // In development, we continue with a warning
}

// Initialize Sentry error tracking (must be early)
initSentry()

// Log configuration health in development
if (envValidator.isDevelopment()) {
  const health = envValidator.healthCheck()
  if (!health.healthy) {
    console.warn('[Config] Configuration health check warnings:', health.checks.filter(c => c.status !== 'pass'))
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  captureError(event.error || new Error(event.message), {
    type: 'uncaught_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
  captureError(error, {
    type: 'unhandled_rejection',
  })
})

// Service worker version - increment to force update
const SW_VERSION = '1.1.0'

// Check if we need to force clear old service worker
const checkServiceWorkerVersion = async () => {
  const storedVersion = localStorage.getItem('sw-version')
  if (storedVersion !== SW_VERSION) {
    console.log(`[PWA] Version mismatch: ${storedVersion} → ${SW_VERSION}, clearing old SW`)

    // Unregister all existing service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
        console.log('[PWA] Unregistered old service worker')
      }

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
        console.log('[PWA] Cleared all caches')
      }
    }

    localStorage.setItem('sw-version', SW_VERSION)

    // Reload to get fresh service worker
    if (storedVersion !== null) {
      window.location.reload()
      return false
    }
  }
  return true
}

// Initialize service worker after version check
const initServiceWorker = async () => {
  const shouldContinue = await checkServiceWorkerVersion()
  if (!shouldContinue) return

  // Register service worker for PWA functionality
  const updateSW = registerSW({
    immediate: true, // Register immediately
    onNeedRefresh() {
      // Auto-update the service worker without prompting
      console.log('[PWA] New version available, updating...')
      updateSW(true)
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline')
    },
    onRegistered(registration) {
      console.log('[PWA] Service worker registered:', registration)

      // Check for updates every 5 minutes
      setInterval(
        () => {
          registration?.update()
        },
        5 * 60 * 1000
      )
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration error:', error)
    },
  })

  // Expose updateSW globally for components to use
  window.__updateSW = updateSW
}

// Declare global type for updateSW
declare global {
  interface Window {
    __updateSW?: (reloadPage?: boolean) => Promise<void>
  }
}

// Initialize service worker
initServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>
)
