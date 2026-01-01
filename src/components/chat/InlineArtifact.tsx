import { useState, useCallback, type ReactNode } from 'react'
import {
  CaretDown,
  CaretUp,
  Copy,
  Check,
  Code,
  FileText,
  Table,
  Image,
  Calendar,
  Eye,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

// ============================================================================
// Types
// ============================================================================

export type ArtifactType = 'code' | 'json' | 'text' | 'table' | 'image' | 'event' | 'preview'

export interface InlineArtifactProps {
  type: ArtifactType
  title: string
  children: ReactNode
  defaultExpanded?: boolean
  copyable?: boolean
  copyContent?: string
  className?: string
}

// ============================================================================
// Type Configurations
// ============================================================================

interface ArtifactTypeConfig {
  icon: ComponentType<IconProps>
  label: string
  accentColor: string
}

const typeConfigs: Record<ArtifactType, ArtifactTypeConfig> = {
  code: {
    icon: Code,
    label: 'Code',
    accentColor: 'text-blue-400',
  },
  json: {
    icon: FileText,
    label: 'JSON',
    accentColor: 'text-amber-400',
  },
  text: {
    icon: FileText,
    label: 'Text',
    accentColor: 'text-slate-400',
  },
  table: {
    icon: Table,
    label: 'Table',
    accentColor: 'text-purple-400',
  },
  image: {
    icon: Image,
    label: 'Image',
    accentColor: 'text-pink-400',
  },
  event: {
    icon: Calendar,
    label: 'Event',
    accentColor: 'text-emerald-400',
  },
  preview: {
    icon: Eye,
    label: 'Preview',
    accentColor: 'text-cyan-400',
  },
}

// ============================================================================
// Component
// ============================================================================

export function InlineArtifact({
  type,
  title,
  children,
  defaultExpanded = true,
  copyable = false,
  copyContent,
  className,
}: InlineArtifactProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const config = typeConfigs[type]
  const Icon = config.icon

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!copyContent) return

    try {
      await navigator.clipboard.writeText(copyContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [copyContent])

  return (
    <div
      className={cn(
        'artifact-container my-3',
        'rounded-xl border border-border/50 overflow-hidden',
        'bg-muted/30',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={toggleExpand}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3',
          'bg-muted/50 hover:bg-muted/70',
          'transition-colors duration-[var(--duration-fast)]',
          'text-left'
        )}
        aria-expanded={expanded}
      >
        {/* Icon with type color */}
        <div
          className={cn('w-8 h-8 rounded-lg flex items-center justify-center', 'bg-background/50')}
        >
          <Icon size={18} weight="duotone" className={config.accentColor} />
        </div>

        {/* Title and type */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{title}</div>
          <div className="text-xs text-muted-foreground">{config.label}</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {copyable && copyContent && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCopy()
              }}
              className={cn('icon-btn p-1.5', copied && 'text-emerald-400')}
              aria-label={copied ? 'Copied!' : 'Copy content'}
            >
              {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="duotone" />}
            </button>
          )}

          {/* Expand/collapse indicator */}
          <div className="text-muted-foreground">
            {expanded ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
          </div>
        </div>
      </button>

      {/* Content with height animation */}
      <div
        className={cn(
          'artifact-content',
          'grid transition-[grid-template-rows] duration-[var(--duration-slow)] ease-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="p-4 border-t border-border/30">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface CompactArtifactProps {
  type: ArtifactType
  title: string
  onClick?: () => void
  className?: string
}

export function CompactArtifact({ type, title, onClick, className }: CompactArtifactProps) {
  const config = typeConfigs[type]
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5',
        'rounded-lg border border-border/50',
        'bg-muted/30 hover:bg-muted/50',
        'transition-all duration-[var(--duration-fast)]',
        'spring-press',
        className
      )}
    >
      <Icon size={14} weight="duotone" className={config.accentColor} />
      <span className="text-xs font-medium truncate max-w-[150px]">{title}</span>
    </button>
  )
}

// ============================================================================
// Artifact Badge (for inline mentions)
// ============================================================================

export interface ArtifactBadgeProps {
  type: ArtifactType
  className?: string
}

export function ArtifactBadge({ type, className }: ArtifactBadgeProps) {
  const config = typeConfigs[type]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5',
        'rounded text-[10px] font-medium',
        'bg-muted/50',
        className
      )}
    >
      <Icon size={12} weight="duotone" className={config.accentColor} />
      <span className="text-muted-foreground">{config.label}</span>
    </span>
  )
}
