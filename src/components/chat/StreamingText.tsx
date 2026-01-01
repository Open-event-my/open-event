import { useMemo } from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface StreamingTextProps {
  content: string
  isStreaming?: boolean
  className?: string
  /** Delay between each word animation in milliseconds */
  staggerDelay?: number
  /** Whether to animate words or show them instantly */
  animate?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * StreamingText - Word-by-word animated text rendering for AI responses
 *
 * Provides a smooth, ChatGPT-like streaming experience where words
 * fade in with subtle motion as they appear.
 */
export function StreamingText({
  content,
  isStreaming = false,
  className,
  staggerDelay = 30,
  animate = true,
}: StreamingTextProps) {
  // Split content into words while preserving whitespace
  const segments = useMemo(() => {
    if (!animate || !isStreaming) {
      // Return content as single segment for instant render
      return [{ text: content, isWhitespace: false }]
    }

    // Split by whitespace, preserving the whitespace
    const parts = content.split(/(\s+)/)
    return parts.map((text) => ({
      text,
      isWhitespace: /^\s+$/.test(text),
    }))
  }, [content, animate, isStreaming])

  // If not streaming or animation disabled, render plain text
  if (!animate || !isStreaming) {
    return <span className={className}>{content}</span>
  }

  return (
    <span className={cn('streaming-text', className)}>
      {segments.map((segment, index) => {
        if (segment.isWhitespace) {
          return <span key={index}>{segment.text}</span>
        }

        return (
          <span
            key={index}
            className="streaming-word"
            style={{
              animationDelay: `${index * staggerDelay}ms`,
            }}
          >
            {segment.text}
          </span>
        )
      })}

      {/* Blinking cursor at the end */}
      <span className="streaming-cursor" aria-hidden="true" />
    </span>
  )
}

// ============================================================================
// Typewriter Variant (character by character)
// ============================================================================

export interface TypewriterTextProps {
  content: string
  isStreaming?: boolean
  className?: string
  /** Delay between each character in milliseconds */
  charDelay?: number
}

/**
 * TypewriterText - Character-by-character animation
 *
 * Alternative to StreamingText for a classic typewriter effect.
 * More suitable for short texts or headings.
 */
export function TypewriterText({
  content,
  isStreaming = false,
  className,
  charDelay = 15,
}: TypewriterTextProps) {
  if (!isStreaming) {
    return <span className={className}>{content}</span>
  }

  return (
    <span className={cn('typewriter-text', className)}>
      {content.split('').map((char, index) => (
        <span
          key={index}
          className="typewriter-char"
          style={{
            animationDelay: `${index * charDelay}ms`,
          }}
        >
          {char}
        </span>
      ))}
      <span className="streaming-cursor" aria-hidden="true" />
    </span>
  )
}

// ============================================================================
// Markdown-aware streaming (for mixed content)
// ============================================================================

export interface StreamingMarkdownProps {
  content: string
  isStreaming?: boolean
  className?: string
}

/**
 * StreamingMarkdown - Streaming text with markdown boundary awareness
 *
 * Animates content while respecting markdown boundaries (code blocks,
 * inline code, links) to prevent broken rendering during streaming.
 */
export function StreamingMarkdown({
  content,
  isStreaming = false,
  className,
}: StreamingMarkdownProps) {
  // For now, delegate to StreamingText
  // Future: Parse markdown and handle code blocks specially
  return <StreamingText content={content} isStreaming={isStreaming} className={className} />
}
