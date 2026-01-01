import { cn } from '@/lib/utils'
import { Sparkle, CheckCircle } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'

interface AIEvaluationSceneProps {
  progress: number // 0-1
}

export function AIEvaluationScene({ progress }: AIEvaluationSceneProps) {
  // Animation timeline
  const showCard = progress > 0.05
  const showHeader = progress > 0.1
  const showSpinner = progress > 0.15 && progress < 0.4
  const showScore = progress > 0.4
  const scoreValue = Math.min(Math.floor(((progress - 0.4) / 0.2) * 92), 92)
  const showRecommendation = progress > 0.6
  const showTags = progress > 0.7
  const tag1 = progress > 0.75
  const tag2 = progress > 0.8
  const tag3 = progress > 0.85

  return (
    <div className="w-full max-w-md">
      {/* AI Analysis Card */}
      <div
        className={cn(
          'bg-card border rounded-xl shadow-lg overflow-hidden transition-all duration-500',
          showCard ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/5 to-transparent transition-all duration-300',
            showHeader ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkle size={20} weight="duotone" className="text-primary" />
          </div>
          <div>
            <h3 className="font-mono font-semibold text-sm">AI Sponsor Analysis</h3>
            <p className="text-xs text-muted-foreground">Evaluating fit for your event</p>
          </div>
        </div>

        {/* Analysis Content */}
        <div className="p-4 space-y-4">
          {/* Score Ring */}
          <div className="flex items-center justify-center py-4">
            <div className="relative w-32 h-32">
              {/* Background Ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-primary transition-all duration-500"
                  style={{
                    strokeDasharray: 264,
                    strokeDashoffset: showScore ? 264 - (264 * scoreValue) / 100 : 264,
                  }}
                />
              </svg>
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {showSpinner && (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {showScore && (
                  <>
                    <span className="font-mono text-3xl font-bold">{scoreValue}%</span>
                    <span className="text-xs text-muted-foreground">Match Score</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div
            className={cn(
              'flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 transition-all duration-300',
              showRecommendation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <CheckCircle size={18} weight="duotone" className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm">
              <span className="font-medium">Strong fit</span>
              <span className="text-muted-foreground"> for Tech Conference 2025</span>
            </p>
          </div>

          {/* Match Tags */}
          <div
            className={cn(
              'space-y-2 transition-all duration-300',
              showTags ? 'opacity-100' : 'opacity-0'
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">Match Factors</p>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  'transition-all duration-300',
                  tag1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                )}
              >
                Budget Match
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  'transition-all duration-300',
                  tag2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                )}
              >
                Industry Fit
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  'transition-all duration-300',
                  tag3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                )}
              >
                Previous Sponsor
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
