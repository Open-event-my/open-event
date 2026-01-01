import { useState, useCallback, type ReactNode } from 'react'
import { CaretDown, CaretRight, Brain, Lightbulb } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface ReasoningProps {
  content: string | ReactNode
  title?: string
  isStreaming?: boolean
  defaultExpanded?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function Reasoning({
  content,
  title = 'Thinking...',
  isStreaming = false,
  defaultExpanded = false,
  className,
}: ReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Calculate content preview (first 100 chars)
  const contentPreview =
    typeof content === 'string'
      ? content.length > 100
        ? content.slice(0, 100) + '...'
        : content
      : null

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 overflow-hidden',
        'transition-all duration-200',
        isStreaming && 'animate-pulse',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          'hover:bg-primary/10 transition-colors'
        )}
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          <Brain size={18} weight="duotone" className="text-primary" />
        </div>

        {/* Title and preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">{title}</span>
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs text-primary/70">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Processing
              </span>
            )}
          </div>
          {!isExpanded && contentPreview && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{contentPreview}</p>
          )}
        </div>

        {/* Expand/collapse */}
        <span className="text-primary/70">
          {isExpanded ? (
            <CaretDown size={14} weight="bold" />
          ) : (
            <CaretRight size={14} weight="bold" />
          )}
        </span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div
            className={cn(
              'p-3 rounded-md bg-background/50',
              'text-sm text-muted-foreground',
              'border border-primary/10'
            )}
          >
            {typeof content === 'string' ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : (
              content
            )}
            {isStreaming && (
              <span className="inline-block ml-1 w-2 h-4 bg-primary/50 animate-pulse rounded-sm" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Reasoning Step (individual step in reasoning chain)
// ============================================================================

export interface ReasoningStepProps {
  step: number
  label: string
  content?: string
  isActive?: boolean
  isCompleted?: boolean
  className?: string
}

export function ReasoningStep({
  step,
  label,
  content,
  isActive = false,
  isCompleted = false,
  className,
}: ReasoningStepProps) {
  return (
    <div className={cn('flex gap-3', isActive && 'animate-pulse', className)}>
      {/* Step number */}
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
          isCompleted
            ? 'bg-green-500 text-white'
            : isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        )}
      >
        {step}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            isCompleted && 'text-muted-foreground line-through',
            isActive && 'text-primary'
          )}
        >
          {label}
        </p>
        {content && <p className="text-xs text-muted-foreground mt-1">{content}</p>}
      </div>
    </div>
  )
}

// ============================================================================
// Insight Card (highlighted insight from reasoning)
// ============================================================================

export interface InsightCardProps {
  content: string
  type?: 'info' | 'suggestion' | 'warning'
  className?: string
}

export function InsightCard({ content, type = 'info', className }: InsightCardProps) {
  const styles = {
    info: 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400',
    suggestion: 'border-green-500/20 bg-green-500/5 text-green-700 dark:text-green-400',
    warning: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
  }

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border', styles[type], className)}>
      <Lightbulb size={16} weight="duotone" className="flex-shrink-0 mt-0.5" />
      <p className="text-sm">{content}</p>
    </div>
  )
}
