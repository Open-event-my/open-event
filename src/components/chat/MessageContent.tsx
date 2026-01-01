import { memo, useState, useCallback, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Highlight, themes } from 'prism-react-renderer'
import { Copy, Check, CaretDown, CaretUp } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface MessageContentProps {
  content: string
  className?: string
  isUser?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const MAX_COLLAPSED_LINES = 15

// ============================================================================
// Code Block Component
// ============================================================================

interface CodeBlockProps {
  language: string
  code: string
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const trimmedCode = code.trim()
  const lineCount = trimmedCode.split('\n').length
  const isLongCode = lineCount > MAX_COLLAPSED_LINES
  const shouldCollapse = isLongCode && !expanded

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trimmedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [trimmedCode])

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  return (
    <Highlight theme={themes.nightOwl} code={trimmedCode} language={language || 'text'}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <div className="code-block my-3">
          {/* Header bar */}
          <div className="code-header">
            {/* Language badge */}
            <span className="code-language">{language || 'text'}</span>

            {/* Actions */}
            <div className="code-actions">
              {isLongCode && (
                <button
                  onClick={toggleExpand}
                  className="icon-btn"
                  aria-label={expanded ? 'Collapse code' : 'Expand code'}
                >
                  {expanded ? (
                    <CaretUp size={14} weight="bold" />
                  ) : (
                    <CaretDown size={14} weight="bold" />
                  )}
                  <span className="text-[10px] ml-1">
                    {expanded ? 'Collapse' : `${lineCount} lines`}
                  </span>
                </button>
              )}
              <button
                onClick={handleCopy}
                className={cn('icon-btn', copied && 'text-emerald-400')}
                aria-label={copied ? 'Copied!' : 'Copy code'}
              >
                {copied ? (
                  <>
                    <Check size={14} weight="bold" />
                    <span className="text-[10px] ml-1">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} weight="duotone" />
                    <span className="text-[10px] ml-1">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code content */}
          <div className={cn('code-content', shouldCollapse && 'code-collapsed')}>
            <pre
              className={cn(className, 'p-4 overflow-x-auto text-sm font-mono', 'custom-scrollbar')}
              style={style}
            >
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line, key: i })
                return (
                  <div key={i} {...lineProps} className="code-line">
                    <span className="code-line-number">{i + 1}</span>
                    <span className="code-line-content">
                      {line.map((token, tokenIdx) => {
                        const tokenProps = getTokenProps({ token, key: tokenIdx })
                        return <span key={tokenIdx} {...tokenProps} />
                      })}
                    </span>
                  </div>
                )
              })}
            </pre>

            {/* Gradient fade overlay for collapsed state */}
            {shouldCollapse && <div className="code-fade-overlay" />}
          </div>

          {/* Expand button at bottom for collapsed state */}
          {shouldCollapse && (
            <button onClick={toggleExpand} className="code-expand-btn">
              <CaretDown size={14} weight="bold" />
              <span>Show all {lineCount} lines</span>
            </button>
          )}
        </div>
      )}
    </Highlight>
  )
}

// ============================================================================
// Inline Code Component
// ============================================================================

interface InlineCodeProps {
  children: ReactNode
  isUser?: boolean
}

function InlineCode({ children, isUser }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded font-mono text-sm',
        isUser ? 'bg-black/20' : 'bg-muted-foreground/20'
      )}
    >
      {children}
    </code>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const MessageContent = memo(function MessageContent({
  content,
  className,
  isUser = false,
}: MessageContentProps) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        isUser ? 'prose-invert' : 'dark:prose-invert',
        // Override prose styles
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,

          // Paragraphs
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="ml-2">{children}</li>,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'underline underline-offset-2',
                isUser ? 'hover:text-white/80' : 'text-primary hover:text-primary/80'
              )}
            >
              {children}
            </a>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                'border-l-2 pl-3 italic my-2',
                isUser ? 'border-white/30' : 'border-primary/50'
              )}
            >
              {children}
            </blockquote>
          ),

          // Code - react-markdown v10 passes className via node.properties
          code: ({ node, children }) => {
            // Get className from node properties (react-markdown v10 API)
            const classNames = node?.properties?.className as string[] | undefined
            const classNameStr = Array.isArray(classNames) ? classNames.join(' ') : ''
            const match = /language-(\w+)/.exec(classNameStr)
            const isBlock = match !== null

            if (isBlock) {
              return <CodeBlock language={match[1]} code={String(children)} />
            }

            return <InlineCode isUser={isUser}>{children}</InlineCode>
          },

          // Pre (for code blocks wrapped in pre)
          pre: ({ children }) => <>{children}</>,

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={cn(isUser ? 'bg-black/10' : 'bg-muted/50')}>{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold border-b border-border">{children}</th>
          ),
          td: ({ children }) => <td className="px-3 py-2 border-b border-border/50">{children}</td>,

          // Horizontal rule
          hr: () => <hr className={cn('my-4', isUser ? 'border-white/20' : 'border-border')} />,

          // Strong and emphasis
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
