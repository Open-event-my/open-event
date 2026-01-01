import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AgenticStreamingText } from './AgenticStreamingText'

// ============================================================================
// Types
// ============================================================================

export interface AgenticMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  isLatest?: boolean
  timestamp?: number
  className?: string
  children?: ReactNode
  quickReplies?: Array<{
    label: string
    value: string
    variant?: 'primary' | 'secondary'
  }>
  onQuickReply?: (value: string) => void
}

// ============================================================================
// Component
// ============================================================================

/**
 * AgenticMessage - Enhanced message bubble with glass morphism
 * Features smooth animations, streaming support, and quick replies
 */
export function AgenticMessage({
  role,
  content,
  isStreaming = false,
  isLatest = false,
  timestamp,
  className,
  children,
  quickReplies,
  onQuickReply,
}: AgenticMessageProps) {
  const isUser = role === 'user'
  const showStreaming = isStreaming && isLatest && !isUser
  const showQuickReplies =
    isLatest && !isUser && !isStreaming && quickReplies && quickReplies.length > 0

  return (
    <div
      className={cn('flex agentic-message', isUser ? 'justify-end' : 'justify-start', className)}
    >
      {/* Content - No avatars, Typeform style */}
      <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
        {/* Message Bubble */}
        <div
          className={cn(
            'agentic-bubble-v2',
            isUser ? 'user' : 'ai',
            showStreaming && 'is-streaming'
          )}
        >
          {isUser ? (
            <p className="text-[0.9375rem]">{content}</p>
          ) : (
            <AgenticStreamingText content={content} isStreaming={showStreaming} />
          )}
        </div>

        {/* Additional children (tools, confirmations) */}
        {children}

        {/* Timestamp */}
        {timestamp && !showStreaming && (
          <span className="text-[10px] text-muted-foreground/50 px-1">{formatTime(timestamp)}</span>
        )}

        {/* Quick Replies - Typeform style animated buttons */}
        {showQuickReplies && (
          <div className="agentic-quick-replies">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => onQuickReply?.(reply.value)}
                className={cn(
                  'agentic-quick-reply',
                  reply.variant === 'primary' ? 'primary' : 'secondary'
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {reply.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Helper
// ============================================================================

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default AgenticMessage
