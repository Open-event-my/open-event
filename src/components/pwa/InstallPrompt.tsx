import { usePWA } from '@/hooks/use-pwa'
import { cn } from '@/lib/utils'
import {
  X,
  DeviceMobile,
  Lightning,
  WifiHigh,
  ArrowRight,
  Export,
  PlusSquare,
} from '@phosphor-icons/react'

export function InstallPrompt() {
  const { showPrompt, isInstalled, isInstallable, promptInstall, dismissPrompt, platform } =
    usePWA()

  // Don't show if already installed
  if (!showPrompt || isInstalled) {
    return null
  }

  const handleInstall = async () => {
    await promptInstall()
  }

  // iOS-specific install instructions
  if (platform === 'ios') {
    return (
      <div
        className={cn(
          'fixed z-50 left-3 right-3 bottom-3',
          'animate-in slide-in-from-bottom-4 duration-500'
        )}
      >
        <div
          className={cn(
            'relative p-4 rounded-2xl',
            'bg-card/95 backdrop-blur-xl',
            'border border-emerald-500/30',
            'shadow-2xl shadow-black/20'
          )}
        >
          {/* Close button */}
          <button
            onClick={dismissPrompt}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} weight="bold" className="text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <DeviceMobile size={24} weight="fill" className="text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-8">
              <h3 className="font-semibold text-sm mb-1">Install Open Event</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Add to your home screen for a native app experience.
              </p>

              {/* iOS Instructions */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500">
                    <Export size={14} weight="bold" />
                  </div>
                  <span className="text-muted-foreground">
                    Tap <span className="text-foreground font-medium">Share</span> button below
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500">
                    <PlusSquare size={14} weight="bold" />
                  </div>
                  <span className="text-muted-foreground">
                    Select <span className="text-foreground font-medium">Add to Home Screen</span>
                  </span>
                </div>
              </div>

              {/* Benefits */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <WifiHigh size={10} weight="fill" className="text-emerald-500" />
                  Offline
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lightning size={10} weight="fill" className="text-amber-500" />
                  Fast
                </span>
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissPrompt}
            className="w-full mt-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Maybe later
          </button>

          {/* Arrow pointing to share button */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card border-r border-b border-emerald-500/30" />
        </div>
      </div>
    )
  }

  // Android/Desktop install prompt (with native install button)
  return (
    <div
      className={cn(
        'fixed z-50 left-3 right-3 md:left-auto md:right-6 md:max-w-sm',
        'bottom-3 md:bottom-auto md:top-20',
        'animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 duration-500'
      )}
    >
      <div
        className={cn(
          'relative p-4 rounded-2xl',
          'bg-card/95 backdrop-blur-xl',
          'border border-emerald-500/20',
          'shadow-2xl shadow-black/20'
        )}
      >
        {/* Close button */}
        <button
          onClick={dismissPrompt}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} weight="bold" className="text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <DeviceMobile size={24} weight="fill" className="text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-semibold text-sm mb-1">Install Open Event</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Get faster access and a native app experience.
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <WifiHigh size={12} weight="fill" className="text-emerald-500" />
                Works offline
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lightning size={12} weight="fill" className="text-amber-500" />
                Instant loading
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={dismissPrompt}
                className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
              {isInstallable ? (
                <button
                  onClick={handleInstall}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg',
                    'bg-emerald-600 hover:bg-emerald-700 text-white',
                    'text-xs font-medium transition-all',
                    'shadow-md hover:shadow-lg'
                  )}
                >
                  Install
                  <ArrowRight size={12} weight="bold" />
                </button>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Use browser menu to install
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
