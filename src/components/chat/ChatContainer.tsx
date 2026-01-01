import { useState, useCallback, type ReactNode } from 'react'
import { ArrowsOut, ArrowsIn, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface ChatContainerProps {
  children: ReactNode
  title?: string
  subtitle?: string
  badge?: ReactNode
  headerActions?: ReactNode
  className?: string
  defaultExpanded?: boolean
  onExpandChange?: (expanded: boolean) => void
  onClose?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ChatContainer({
  children,
  title = 'AI Assistant',
  subtitle,
  badge,
  headerActions,
  className,
  defaultExpanded = false,
  onExpandChange,
  onClose,
}: ChatContainerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleExpand = useCallback(() => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onExpandChange?.(newExpanded)
  }, [isExpanded, onExpandChange])

  // Expanded (fullscreen) mode
  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title-expanded"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  id="chat-title-expanded"
                  className="text-lg sm:text-xl font-bold font-mono truncate"
                >
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {headerActions}
            <button
              onClick={handleExpand}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Exit fullscreen"
            >
              <ArrowsIn size={20} weight="bold" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Close chat"
              >
                <X size={20} weight="bold" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>
    )
  }

  // Normal (embedded) mode
  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden',
        'h-[calc(100vh-12rem)] min-h-[400px] sm:min-h-[500px]',
        // Subtle shadow for depth
        'shadow-sm',
        className
      )}
      role="region"
      aria-labelledby="chat-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="chat-title" className="text-base sm:text-lg font-bold font-mono truncate">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {headerActions}
          <button
            onClick={handleExpand}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Enter fullscreen"
          >
            <ArrowsOut size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-card">{children}</div>
    </div>
  )
}
