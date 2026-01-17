import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Target, CheckCircle, Info } from '@phosphor-icons/react'

interface AudienceMatchBadgeProps {
  sponsorId: Id<'sponsors'>
  eventId: Id<'events'>
  showTooltip?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-sm px-2 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
}

const matchLevelColors = {
  excellent: {
    bg: 'bg-emerald-100 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  good: {
    bg: 'bg-blue-100 dark:bg-blue-950/50',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  fair: {
    bg: 'bg-amber-100 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  low: {
    bg: 'bg-gray-100 dark:bg-gray-900/50',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
  },
}

export function AudienceMatchBadge({
  sponsorId,
  eventId,
  showTooltip = true,
  size = 'md',
  className,
}: AudienceMatchBadgeProps) {
  const matchData = useQuery(api.sponsors.calculateAudienceMatch, {
    sponsorId,
    eventId,
  })

  if (!matchData) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border animate-pulse',
          'bg-muted text-muted-foreground border-border',
          sizeClasses[size],
          className
        )}
      >
        <Target size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
        <span>--</span>
      </span>
    )
  }

  const colors = matchLevelColors[matchData.matchLevel]

  const badge = (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
    >
      {matchData.matchLevel === 'excellent' ? (
        <CheckCircle size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} weight="fill" />
      ) : (
        <Target size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} weight="fill" />
      )}
      <span>{matchData.score}% Match</span>
    </span>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px] p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Audience Match Score</span>
              <span
                className={cn(
                  'text-lg font-bold',
                  matchData.score >= 70
                    ? 'text-emerald-600'
                    : matchData.score >= 50
                      ? 'text-amber-600'
                      : 'text-gray-600'
                )}
              >
                {matchData.score}%
              </span>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-1 text-xs">
              {matchData.breakdown.industryMatch !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Industry Match</span>
                  <span>{matchData.breakdown.industryMatch}/25</span>
                </div>
              )}
              {matchData.breakdown.budgetAlignment !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget Alignment</span>
                  <span>{matchData.breakdown.budgetAlignment}/20</span>
                </div>
              )}
              {matchData.breakdown.audienceMatch !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Audience</span>
                  <span>{matchData.breakdown.audienceMatch}/25</span>
                </div>
              )}
              {matchData.breakdown.tierAvailability !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier Fit</span>
                  <span>{matchData.breakdown.tierAvailability}/15</span>
                </div>
              )}
              {matchData.breakdown.locationMatch !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span>{matchData.breakdown.locationMatch}/15</span>
                </div>
              )}
            </div>

            {/* Recommendation */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>{matchData.recommendation}</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Simplified badge that just shows score without the query
 * Use when you already have the match data
 */
interface StaticMatchBadgeProps {
  score: number
  matchLevel: 'excellent' | 'good' | 'fair' | 'low'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StaticMatchBadge({
  score,
  matchLevel,
  size = 'md',
  className,
}: StaticMatchBadgeProps) {
  const colors = matchLevelColors[matchLevel]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
    >
      {matchLevel === 'excellent' ? (
        <CheckCircle size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} weight="fill" />
      ) : (
        <Target size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} weight="fill" />
      )}
      <span>{score}% Match</span>
    </span>
  )
}
