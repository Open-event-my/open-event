import { cn } from '@/lib/utils'
import { EnvelopeSimple, CheckCircle, Confetti, Handshake } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'

interface ConfirmationSceneProps {
  progress: number // 0-1
}

export function ConfirmationScene({ progress }: ConfirmationSceneProps) {
  // Animation timeline
  const showSplit = progress > 0.05
  const showDashboardCard = progress > 0.1
  const showConfirmedStatus = progress > 0.25
  const showEmailCard = progress > 0.35
  const emailPulse = progress > 0.4 && progress < 0.6
  const showEmailContent = progress > 0.55
  const showCelebration = progress > 0.75

  return (
    <div className="w-full max-w-2xl">
      {/* Split View */}
      <div
        className={cn(
          'grid grid-cols-2 gap-4 transition-all duration-500',
          showSplit ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Organizer Dashboard Side */}
        <div
          className={cn(
            'bg-card border rounded-xl shadow-lg overflow-hidden transition-all duration-300',
            showDashboardCard ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          )}
        >
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <Handshake size={14} weight="duotone" className="text-primary" />
              </div>
              <span className="text-xs font-mono font-medium">Sponsors</span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {/* Sponsor Row */}
            <div
              className={cn(
                'flex items-center justify-between p-2 rounded-md transition-all duration-300',
                showConfirmedStatus ? 'bg-green-500/10 border border-green-500/20' : 'bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-bold">AC</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Acme Corp</p>
                  <p className="text-xs text-muted-foreground">Gold Tier</p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs transition-all duration-300',
                  showConfirmedStatus && 'bg-green-500/20 text-green-700 dark:text-green-400'
                )}
              >
                {showConfirmedStatus ? 'Confirmed' : 'Pending'}
              </Badge>
            </div>
            {/* Placeholder rows */}
            <div className="h-10 rounded-md bg-muted/30" />
            <div className="h-10 rounded-md bg-muted/30" />
          </div>
        </div>

        {/* Sponsor Email Side */}
        <div
          className={cn(
            'bg-card border rounded-xl shadow-lg overflow-hidden transition-all duration-300',
            showEmailCard ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
          )}
        >
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded bg-primary/10 flex items-center justify-center transition-all',
                  emailPulse && 'animate-pulse ring-2 ring-primary/30'
                )}
              >
                <EnvelopeSimple size={14} weight="duotone" className="text-primary" />
              </div>
              <span className="text-xs font-mono font-medium">Sponsor Inbox</span>
            </div>
          </div>
          <div className="p-3">
            {/* Email Preview */}
            <div
              className={cn(
                'p-3 rounded-md border transition-all duration-500',
                showEmailContent
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-muted/50 border-transparent'
              )}
            >
              <div
                className={cn(
                  'space-y-2 transition-all duration-300',
                  showEmailContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                )}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} weight="duotone" className="text-green-500" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    Sponsorship Confirmed
                  </span>
                </div>
                <p className="text-sm font-medium">Congratulations!</p>
                <p className="text-xs text-muted-foreground">
                  Your Gold sponsorship for Tech Conference 2025 has been approved.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Benefits unlocked</span>
                  <span>•</span>
                  <span>Badge ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Effect */}
      <div
        className={cn(
          'flex items-center justify-center gap-2 mt-4 text-sm text-primary transition-all duration-500',
          showCelebration ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        <Confetti size={20} weight="duotone" className="animate-bounce" />
        <span className="font-medium">Workflow Complete</span>
        <Confetti
          size={20}
          weight="duotone"
          className="animate-bounce"
          style={{ animationDelay: '0.1s' }}
        />
      </div>
    </div>
  )
}
