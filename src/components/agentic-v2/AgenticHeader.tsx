import { memo } from 'react'
import { Lightning, Trash } from '@phosphor-icons/react'
import { LogoIcon } from '@/components/ui/logo'
import type { AgenticHeaderProps } from './types'

export const AgenticHeader = memo(function AgenticHeader({
  hasMessages,
  isRateLimited,
  isAdmin,
  promptsRemaining,
  promptsLimit,
  timeUntilReset,
  subtitle,
  onClear,
  onNavigateToSettings,
}: AgenticHeaderProps) {
  const quotaPercentage = promptsLimit > 0 ? promptsRemaining / promptsLimit : 0
  const circumference = 2 * Math.PI * 6 // r=6

  return (
    <div className="agentic-header">
      {/* Primary row - Logo & badges (wraps on small screens) */}
      <div className="agentic-header-row">
        {/* Logo */}
        <div className="agentic-header-logo">
          <LogoIcon size="sm" />
          <span className="font-mono text-sm font-semibold">
            <span className="text-foreground">open</span>
            <span className="text-purple-500">-</span>
            <span className="text-foreground">event</span>
          </span>
          <span className="text-purple-500 text-sm font-medium">AI</span>
        </div>

        {/* Badge row - scrollable on tiny screens */}
        <div className="agentic-header-badges">
          {/* Beta badge */}
          <span className="agentic-badge agentic-badge-beta">Beta</span>

          {/* Quota with progress ring */}
          {!isAdmin && (
            <button
              onClick={onNavigateToSettings}
              className="agentic-badge agentic-badge-quota"
              title={`${promptsRemaining} prompts remaining. Resets in ${timeUntilReset}`}
            >
              <div className="relative w-4 h-4 flex-shrink-0">
                <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted-foreground/20"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-purple-500 transition-all"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - quotaPercentage)}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                {promptsRemaining}/{promptsLimit}
              </span>
            </button>
          )}

          {isAdmin && (
            <span className="agentic-badge agentic-badge-admin">
              <Lightning size={12} weight="fill" />
              <span className="hidden xs:inline">Unlimited</span>
              <span className="xs:hidden">∞</span>
            </span>
          )}

          {/* Clear button */}
          {hasMessages && (
            <button
              onClick={onClear}
              className="agentic-badge agentic-badge-clear"
              title="Clear conversation"
            >
              <Trash size={14} />
              <span className="hidden xs:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {!hasMessages && (
        <h1 className="agentic-header-title">{isRateLimited ? 'Daily limit reached' : subtitle}</h1>
      )}

      {isRateLimited && !isAdmin && !hasMessages && (
        <p className="text-sm text-muted-foreground mt-2">
          Resets in{' '}
          <span className="font-medium text-foreground">{timeUntilReset || 'a few hours'}</span>
        </p>
      )}
    </div>
  )
})
