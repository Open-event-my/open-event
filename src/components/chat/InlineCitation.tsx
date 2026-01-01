import { useState, useCallback } from 'react'
import { Link, FileText, ArrowSquareOut, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface Citation {
  id: string
  number: number
  title: string
  source?: string
  url?: string
  excerpt?: string
}

export interface InlineCitationProps {
  citation: Citation
  className?: string
}

// ============================================================================
// Inline Citation Badge
// ============================================================================

export function InlineCitation({ citation, className }: InlineCitationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <span className="relative inline-block">
      {/* Citation badge */}
      <button
        onClick={toggleOpen}
        className={cn(
          'inline-flex items-center justify-center',
          'w-5 h-5 rounded-full text-[10px] font-medium',
          'bg-primary/10 text-primary hover:bg-primary/20',
          'transition-colors cursor-pointer',
          'align-super',
          className
        )}
        aria-label={`Citation ${citation.number}: ${citation.title}`}
      >
        {citation.number}
      </button>

      {/* Popover */}
      {isOpen && <CitationPopover citation={citation} onClose={handleClose} />}
    </span>
  )
}

// ============================================================================
// Citation Popover
// ============================================================================

interface CitationPopoverProps {
  citation: Citation
  onClose: () => void
}

function CitationPopover({ citation, onClose }: CitationPopoverProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover */}
      <div
        className={cn(
          'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
          'w-72 p-3 rounded-lg',
          'bg-popover text-popover-foreground shadow-lg border border-border',
          'animate-in fade-in slide-in-from-bottom-2 duration-150'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
              {citation.number}
            </div>
            <h4 className="font-medium text-sm line-clamp-2">{citation.title}</h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Source */}
        {citation.source && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <FileText size={12} weight="duotone" />
            <span className="truncate">{citation.source}</span>
          </div>
        )}

        {/* Excerpt */}
        {citation.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{citation.excerpt}</p>
        )}

        {/* Link */}
        {citation.url && (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('flex items-center gap-1.5 text-xs text-primary', 'hover:underline')}
          >
            <Link size={12} weight="duotone" />
            <span>View source</span>
            <ArrowSquareOut size={10} weight="bold" />
          </a>
        )}
      </div>
    </>
  )
}

// ============================================================================
// Citation List (for reference section)
// ============================================================================

export interface CitationListProps {
  citations: Citation[]
  title?: string
  className?: string
}

export function CitationList({ citations, title = 'References', className }: CitationListProps) {
  if (citations.length === 0) return null

  return (
    <div className={cn('mt-4 pt-4 border-t border-border', className)}>
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {title}
      </h4>
      <ol className="space-y-2">
        {citations.map((citation) => (
          <li key={citation.id} className="flex items-start gap-3">
            {/* Number */}
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground flex-shrink-0">
              {citation.number}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{citation.title}</p>
              {citation.source && (
                <p className="text-xs text-muted-foreground">{citation.source}</p>
              )}
              {citation.url && (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                >
                  <span className="truncate max-w-[200px]">{citation.url}</span>
                  <ArrowSquareOut size={10} weight="bold" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ============================================================================
// Source Badge (inline source indicator)
// ============================================================================

export interface SourceBadgeProps {
  name: string
  url?: string
  className?: string
}

export function SourceBadge({ name, url, className }: SourceBadgeProps) {
  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs bg-muted text-muted-foreground',
        url && 'hover:bg-muted/80 cursor-pointer',
        className
      )}
    >
      <FileText size={10} weight="duotone" />
      <span className="truncate max-w-[100px]">{name}</span>
      {url && <ArrowSquareOut size={8} weight="bold" />}
    </span>
  )

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return content
}
