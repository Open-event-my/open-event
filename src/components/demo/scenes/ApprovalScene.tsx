import { cn } from '@/lib/utils'
import { Handshake, CheckCircle, X, Check } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'

interface ApprovalSceneProps {
  progress: number // 0-1
}

export function ApprovalScene({ progress }: ApprovalSceneProps) {
  // Animation timeline
  const showCard = progress > 0.05
  const showHeader = progress > 0.1
  const showDetails = progress > 0.2
  const showScore = progress > 0.3
  const showButtons = progress > 0.4
  const approveGlow = progress > 0.55 && progress < 0.7
  const buttonPressed = progress > 0.7
  const showSuccess = progress > 0.8

  return (
    <div className="w-full max-w-md">
      {/* Approval Card */}
      <div
        className={cn(
          'bg-card border rounded-xl shadow-lg overflow-hidden transition-all duration-500',
          showCard ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-3 p-4 border-b transition-all duration-300',
            showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Handshake size={20} weight="duotone" className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-mono font-semibold text-sm">Sponsor Decision</h3>
            <p className="text-xs text-muted-foreground">Review and approve application</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Pending
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Sponsor Details */}
          <div
            className={cn(
              'space-y-3 transition-all duration-300',
              showDetails ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Company</span>
              <span className="font-medium text-sm">Acme Corp</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tier</span>
              <Badge variant="outline" className="text-xs font-mono">
                Gold
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Budget</span>
              <span className="font-mono text-sm">$50,000</span>
            </div>
          </div>

          {/* AI Score */}
          <div
            className={cn(
              'flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all duration-300',
              showScore ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <span className="text-sm">AI Match Score</span>
            <span className="font-mono font-bold text-primary">92%</span>
          </div>

          {/* Action Buttons */}
          <div
            className={cn(
              'flex gap-3 pt-2 transition-all duration-300',
              showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <button
              className={cn(
                'flex-1 h-10 rounded-md font-medium text-sm flex items-center justify-center gap-2 border transition-all duration-200',
                'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <X size={16} weight="bold" />
              Reject
            </button>
            <button
              className={cn(
                'flex-1 h-10 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200',
                showSuccess
                  ? 'bg-green-500 text-white'
                  : buttonPressed
                    ? 'bg-primary/80 text-primary-foreground scale-95'
                    : approveGlow
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/50 ring-offset-2'
                      : 'bg-primary text-primary-foreground'
              )}
            >
              {showSuccess ? (
                <>
                  <Check size={16} weight="bold" />
                  Approved
                </>
              ) : (
                <>
                  <CheckCircle size={16} weight="duotone" />
                  Approve
                </>
              )}
            </button>
          </div>

          {/* Success Message */}
          <div
            className={cn(
              'flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 transition-all duration-300',
              showSuccess ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <CheckCircle size={18} weight="duotone" />
            Sponsor has been approved successfully
          </div>
        </div>
      </div>
    </div>
  )
}
