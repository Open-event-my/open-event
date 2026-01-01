import { useState, useEffect } from 'react'
import { X, Cookie } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cookieConsentManager } from '@/lib/compliance/cookieConsent'
import { cn } from '@/lib/utils'

export function CookieConsentBanner() {
  // Initialize state based on consent status
  const [isVisible, setIsVisible] = useState(() => {
    return !cookieConsentManager.hasConsentBeenGiven()
  })
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Listen for custom events to show/hide banner
    const handleShowBanner = () => setIsVisible(true)
    const handleConsentChanged = () => setIsVisible(false)
    const handleConsentCleared = () => setIsVisible(true)

    window.addEventListener('showConsentBanner', handleShowBanner)
    window.addEventListener('consentChanged', handleConsentChanged)
    window.addEventListener('consentCleared', handleConsentCleared)

    return () => {
      window.removeEventListener('showConsentBanner', handleShowBanner)
      window.removeEventListener('consentChanged', handleConsentChanged)
      window.removeEventListener('consentCleared', handleConsentCleared)
    }
  }, [])

  const handleAcceptAll = () => {
    cookieConsentManager.acceptAll()
    setIsVisible(false)
  }

  const handleAcceptNecessary = () => {
    cookieConsentManager.acceptNecessaryOnly()
    setIsVisible(false)
  }

  const handleClose = () => {
    // Closing without accepting means only necessary cookies
    cookieConsentManager.acceptNecessaryOnly()
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm shadow-lg',
        'animate-in slide-in-from-bottom duration-300'
      )}
      role="dialog"
      aria-label="Cookie consent banner"
      aria-describedby="cookie-consent-description"
    >
      <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Icon and Content */}
          <div className="flex flex-1 gap-3">
            <div className="flex-shrink-0">
              <Cookie className="size-6 text-primary" weight="duotone" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Cookie Preferences</h3>
              <p id="cookie-consent-description" className="text-sm text-muted-foreground">
                We use cookies to enhance your experience, analyze site traffic, and personalize
                content. You can choose which cookies to accept.
              </p>

              {/* Details Section */}
              {showDetails && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">
                      Necessary Cookies (Always Active)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Required for the website to function properly. These cannot be disabled.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Analytics Cookies</p>
                    <p className="text-xs text-muted-foreground">
                      Help us understand how visitors interact with our website to improve user
                      experience.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-foreground">Marketing Cookies</p>
                    <p className="text-xs text-muted-foreground">
                      Used to deliver personalized advertisements and track campaign effectiveness.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptNecessary}
              className="w-full sm:w-auto"
            >
              Necessary Only
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAcceptAll}
              className="w-full sm:w-auto"
            >
              Accept All
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              className="absolute right-2 top-2 sm:static"
              aria-label="Close cookie banner"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
