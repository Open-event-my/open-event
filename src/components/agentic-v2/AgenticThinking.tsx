import { Check, CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ThinkingOrb } from './AgenticAvatar'

// ============================================================================
// Types
// ============================================================================

export interface ThinkingStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete'
}

export interface AgenticThinkingProps {
  label?: string
  description?: string
  steps?: ThinkingStep[]
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * AgenticThinking - Futuristic thinking state display
 * Shows neural orb animation with optional step progress
 */
export function AgenticThinking({
  label = 'Processing',
  description,
  steps,
  className,
}: AgenticThinkingProps) {
  return (
    <div className={cn('agentic-thinking-v2', className)}>
      <ThinkingOrb />

      <div className="agentic-thinking-v2-content">
        <div className="agentic-thinking-v2-label">
          <span>{label}</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          </span>
        </div>

        {description && <p className="agentic-thinking-v2-text">{description}</p>}

        {steps && steps.length > 0 && (
          <div className="agentic-thinking-steps">
            {steps.map((step, index) => (
              <ThinkingStepItem
                key={step.id}
                step={index + 1}
                label={step.label}
                status={step.status}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Thinking Step Item
// ============================================================================

interface ThinkingStepItemProps {
  step: number
  label: string
  status: 'pending' | 'active' | 'complete'
}

function ThinkingStepItem({ step, label, status }: ThinkingStepItemProps) {
  return (
    <div
      className={cn(
        'agentic-thinking-step',
        status === 'active' && 'is-active',
        status === 'complete' && 'is-complete'
      )}
    >
      <div className="agentic-thinking-step-icon">
        {status === 'complete' ? (
          <Check size={12} weight="bold" />
        ) : status === 'active' ? (
          <CircleNotch size={12} weight="bold" className="animate-spin" />
        ) : (
          step
        )}
      </div>
      <span className="agentic-thinking-step-text">{label}</span>
    </div>
  )
}

// ============================================================================
// Inline Thinking Indicator (minimal version)
// ============================================================================

export interface InlineThinkingProps {
  text?: string
  className?: string
}

export function InlineThinking({ text = 'Thinking', className }: InlineThinkingProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative w-6 h-6">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 animate-pulse" />
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-violet-500 to-purple-500" />
      </div>
      <span className="text-sm text-muted-foreground">
        {text}
        <span className="inline-flex ml-1">
          <span className="animate-[bounce_1s_infinite_0s]">.</span>
          <span className="animate-[bounce_1s_infinite_0.2s]">.</span>
          <span className="animate-[bounce_1s_infinite_0.4s]">.</span>
        </span>
      </span>
    </div>
  )
}

export default AgenticThinking
