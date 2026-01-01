import { type ReactNode } from 'react'
import { User, Sparkle, Check, Checks, CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'error'

export interface MessageProps {
  role: MessageRole
  children: ReactNode
  avatar?: ReactNode
  isStreaming?: boolean
  isNew?: boolean
  status?: MessageStatus
  timestamp?: Date | number
  className?: string
  actions?: ReactNode
}

// ============================================================================
// Component
// ============================================================================

export function Message({
  role,
  children,
  avatar,
  isStreaming = false,
  isNew = false,
  status,
  timestamp,
  className,
  actions,
}: MessageProps) {
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'
  const isSending = status === 'sending'

  // Default avatars
  const defaultAvatar = isUser ? (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shadow-sm">
      <User size={16} weight="fill" className="text-muted-foreground" />
    </div>
  ) : isAssistant ? (
    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
      <Sparkle size={16} weight="duotone" className="text-primary" />
    </div>
  ) : null

  // Status indicator for user messages
  const statusIndicator = isUser && status && (
    <div className="flex items-center gap-1 mt-1">
      {status === 'sending' && (
        <CircleNotch size={12} weight="bold" className="text-muted-foreground/60 animate-spin" />
      )}
      {status === 'sent' && <Check size={12} weight="bold" className="text-muted-foreground/60" />}
      {status === 'delivered' && <Checks size={12} weight="bold" className="text-primary/70" />}
      {timestamp && (
        <span className="text-[10px] text-muted-foreground/50">{formatMessageTime(timestamp)}</span>
      )}
    </div>
  )

  return (
    <div
      className={cn(
        'group flex gap-3',
        isUser && 'flex-row-reverse',
        // Spring entrance animation with scale + slide
        isNew && 'message-entrance',
        // Subtle opacity for sending state
        isSending && 'opacity-80',
        className
      )}
    >
      {/* Avatar with streaming glow */}
      <div className={cn('flex-shrink-0 mt-0.5', isStreaming && 'avatar-streaming')}>
        {avatar || defaultAvatar}
      </div>

      {/* Content wrapper */}
      <div className={cn('flex-1 flex flex-col gap-0.5 min-w-0', isUser && 'items-end')}>
        {/* Message bubble */}
        <div
          className={cn(
            'relative max-w-[85%] px-4 py-2.5 rounded-2xl',
            'transition-all duration-200',
            isUser
              ? 'bg-foreground text-background rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
            // Subtle shadow for depth
            'shadow-sm',
            // Press feedback effect
            'active:scale-[0.98] active:shadow-none'
          )}
        >
          {children}

          {/* Streaming cursor */}
          {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
        </div>

        {/* Status indicator */}
        {statusIndicator}

        {/* Actions (copy, retry, etc.) */}
        {actions && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200',
              isUser && 'flex-row-reverse'
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper to format message time
function formatMessageTime(timestamp: Date | number): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ============================================================================
// Message Group Component
// ============================================================================

export interface MessageGroupProps {
  children: ReactNode
  className?: string
}

export function MessageGroup({ children, className }: MessageGroupProps) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

// ============================================================================
// Thinking Indicator
// ============================================================================

export interface ThinkingIndicatorProps {
  className?: string
  text?: string
}

export function ThinkingIndicator({ className, text }: ThinkingIndicatorProps) {
  return (
    <div className={cn('flex gap-3', 'message-entrance', className)}>
      {/* Pulsing thinking orb */}
      <div className="thinking-orb-container">
        <div className="thinking-orb" />
      </div>
      <div className="thinking-bubble">
        <div className="flex items-center gap-3">
          <div className="thinking-dots">
            <span style={{ animationDelay: '0ms' }} />
            <span style={{ animationDelay: '150ms' }} />
            <span style={{ animationDelay: '300ms' }} />
          </div>
          {text && <span className="thinking-text">{text}</span>}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Typing Indicator (alternative style)
// ============================================================================

export interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex gap-3 items-center', 'message-entrance', className)}>
      <div className="avatar-streaming">
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
          <Sparkle size={16} weight="duotone" className="text-primary" />
        </div>
      </div>
      <div className="flex items-center">
        <span className="inline-flex">
          <span className="animate-[bounce_1.4s_infinite_0s] text-muted-foreground">.</span>
          <span className="animate-[bounce_1.4s_infinite_0.2s] text-muted-foreground">.</span>
          <span className="animate-[bounce_1.4s_infinite_0.4s] text-muted-foreground">.</span>
        </span>
      </div>
    </div>
  )
}
