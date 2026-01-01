import { useState, useCallback, type ReactNode } from 'react'
import { Copy, CheckCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface AgenticStreamingTextProps {
  content: string
  isStreaming?: boolean
  className?: string
  /** Delay between each word animation in milliseconds */
  staggerDelay?: number
}

// ============================================================================
// Component
// ============================================================================

/**
 * AgenticStreamingText - Enhanced streaming text with blur-in animation
 * Words materialize with a smooth blur-to-sharp effect
 */
export function AgenticStreamingText({
  content,
  isStreaming = false,
  className,
  staggerDelay = 25,
}: AgenticStreamingTextProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  // Parse content for rich elements
  const renderContent = () => {
    if (!content) return <span className="text-muted-foreground">...</span>

    // Split by code blocks first
    const parts = content.split(/(```[\s\S]*?```)/g)

    return parts.map((part, i) => {
      // Code block
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).split('\n')
        const language = lines[0] || 'text'
        const code = lines.slice(1).join('\n')

        return (
          <div
            key={i}
            className="my-4 rounded-2xl overflow-hidden border border-border/40 bg-zinc-950 shadow-lg"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-border/30">
              <span className="text-xs text-zinc-400 font-mono">{language}</span>
              <button
                onClick={() => handleCopy(code)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 transition-all duration-200 active:scale-95"
              >
                {copied ? (
                  <CheckCircle size={14} weight="fill" className="text-green-400" />
                ) : (
                  <Copy size={14} className="text-zinc-400" />
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
              <code className="text-zinc-100 font-mono">{code}</code>
            </pre>
          </div>
        )
      }

      // Regular text with inline formatting
      if (isStreaming) {
        return (
          <span key={i} className="streaming-text-v2">
            {part.split(/(\s+)/).map((segment, j) => {
              if (/^\s+$/.test(segment)) {
                return <span key={j}>{segment}</span>
              }
              return (
                <span
                  key={j}
                  className="streaming-word-v2"
                  style={{ animationDelay: `${j * staggerDelay}ms` }}
                >
                  {renderInlineFormatting(segment)}
                </span>
              )
            })}
          </span>
        )
      }

      return (
        <span key={i}>
          {part.split('\n').map((line, j, arr) => (
            <span key={j}>
              {renderInlineFormatting(line)}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </span>
      )
    })
  }

  const renderInlineFormatting = (text: string): ReactNode => {
    // Bold **text**
    let result: (string | React.ReactElement)[] = [text]

    // Process bold
    result = result.flatMap((part, i) => {
      if (typeof part !== 'string') return part
      const boldParts = part.split(/\*\*(.*?)\*\*/g)
      return boldParts.map((p, j) =>
        j % 2 === 1 ? (
          <strong key={`bold-${i}-${j}`} className="font-semibold">
            {p}
          </strong>
        ) : (
          p
        )
      )
    })

    // Process inline code
    result = result.flatMap((part, i) => {
      if (typeof part !== 'string') return part
      const codeParts = part.split(/`([^`]+)`/g)
      return codeParts.map((p, j) =>
        j % 2 === 1 ? (
          <code
            key={`code-${i}-${j}`}
            className="px-1.5 py-0.5 rounded-md bg-muted/80 font-mono text-[0.875em] text-primary/90"
          >
            {p}
          </code>
        ) : (
          p
        )
      )
    })

    // Process bullet points
    result = result.flatMap((part, i) => {
      if (typeof part !== 'string') return part
      if (part.startsWith('- ') || part.startsWith('• ')) {
        return (
          <span key={`bullet-${i}`} className="flex items-start gap-2 my-1">
            <span className="text-primary/60 mt-0.5">•</span>
            <span>{part.slice(2)}</span>
          </span>
        )
      }
      return part
    })

    return result
  }

  return (
    <div className={cn('text-[0.9375rem] leading-relaxed', className)}>
      {renderContent()}
      {isStreaming && <span className="streaming-cursor-v2" />}
    </div>
  )
}

export default AgenticStreamingText
