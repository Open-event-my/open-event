import { Sparkle, User } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface AgenticAvatarProps {
  isStreaming?: boolean
  isUser?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * AgenticAvatar - Enhanced avatar with brand integration
 * Features animated gradient border during streaming
 */
export function AgenticAvatar({
  isStreaming = false,
  isUser = false,
  className,
}: AgenticAvatarProps) {
  if (isUser) {
    return (
      <div className={cn('w-9 h-9 flex-shrink-0', className)}>
        <div className="w-full h-full rounded-xl bg-foreground flex items-center justify-center shadow-sm">
          <User size={16} weight="fill" className="text-background" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('agentic-avatar-v2', isStreaming && 'is-streaming', className)}>
      <div className="agentic-avatar-v2-inner">
        <Sparkle size={18} weight="fill" className="text-white" />
      </div>
    </div>
  )
}

// ============================================================================
// Thinking Orb - Futuristic AI Processing Indicator
// ============================================================================

export interface ThinkingOrbProps {
  className?: string
}

/**
 * ThinkingOrb - Neural network-inspired thinking animation
 * Displays orbiting rings and pulsing nodes for a high-tech feel
 */
export function ThinkingOrb({ className }: ThinkingOrbProps) {
  return (
    <div className={cn('thinking-orb-v2', className)}>
      {/* Orbiting rings */}
      <div className="thinking-orb-v2-ring" />
      <div className="thinking-orb-v2-ring" />

      {/* Core orb */}
      <div className="thinking-orb-v2-core" />

      {/* Neural nodes */}
      <div className="thinking-orb-v2-nodes">
        <div className="thinking-orb-v2-node" />
        <div className="thinking-orb-v2-node" />
        <div className="thinking-orb-v2-node" />
        <div className="thinking-orb-v2-node" />
      </div>
    </div>
  )
}

export default AgenticAvatar
