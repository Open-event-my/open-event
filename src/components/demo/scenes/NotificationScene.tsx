import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/logo'
import { Bell, Handshake, Calendar } from '@phosphor-icons/react'

interface NotificationSceneProps {
  progress: number // 0-1
}

export function NotificationScene({ progress }: NotificationSceneProps) {
  // Animation timeline
  const showDashboard = progress > 0.05
  const showHeader = progress > 0.1
  const bellShake = progress > 0.3 && progress < 0.5
  const showBadge = progress > 0.4
  const showPanel = progress > 0.55
  const showNotification = progress > 0.7

  return (
    <div className="w-full max-w-lg">
      {/* Dashboard Mockup */}
      <div
        className={cn(
          'bg-card border rounded-xl shadow-lg overflow-hidden transition-all duration-500',
          showDashboard ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        {/* Dashboard Header */}
        <div
          className={cn(
            'flex items-center justify-between p-4 border-b transition-all duration-300',
            showHeader ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center gap-3">
            <Logo size="sm" showDomain={false} />
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Bell Icon with Badge */}
            <div className="relative">
              <button
                className={cn(
                  'w-8 h-8 rounded-full bg-muted flex items-center justify-center transition-transform',
                  bellShake && 'animate-[demo-shake_0.5s_ease-in-out]'
                )}
              >
                <Bell size={18} weight="duotone" className="text-muted-foreground" />
              </button>
              {/* Notification Badge */}
              <div
                className={cn(
                  'absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300',
                  showBadge ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                )}
                style={{
                  animation: showBadge ? 'demo-badge-pop 0.4s ease-out forwards' : 'none',
                }}
              >
                1
              </div>
            </div>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">JD</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content + Notification Panel */}
        <div className="relative h-64">
          {/* Dashboard Content (dimmed when panel shows) */}
          <div
            className={cn(
              'p-4 space-y-3 transition-opacity duration-300',
              showPanel ? 'opacity-30' : 'opacity-100'
            )}
          >
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar size={18} weight="duotone" className="text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tech Conference 2025</p>
                <p className="text-xs text-muted-foreground">March 15-17, 2025</p>
              </div>
            </div>
            <div className="h-12 rounded-lg bg-muted/30" />
            <div className="h-12 rounded-lg bg-muted/30" />
          </div>

          {/* Notification Panel Overlay */}
          <div
            className={cn(
              'absolute top-2 right-2 w-72 bg-popover border rounded-lg shadow-xl overflow-hidden transition-all duration-500',
              showPanel
                ? 'opacity-100 translate-y-0 translate-x-0'
                : 'opacity-0 -translate-y-2 translate-x-2'
            )}
          >
            <div className="p-3 border-b">
              <h4 className="text-sm font-semibold">Notifications</h4>
            </div>
            <div className="p-2">
              {/* Notification Item */}
              <div
                className={cn(
                  'flex items-start gap-3 p-2 rounded-md bg-primary/5 border border-primary/10 transition-all duration-300',
                  showNotification ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Handshake size={16} weight="duotone" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">New Sponsor Application</p>
                  <p className="text-xs text-muted-foreground truncate">Acme Corp • Gold Tier</p>
                  <p className="text-xs text-muted-foreground mt-1">Just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
