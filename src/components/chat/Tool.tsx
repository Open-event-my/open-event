import { useState, useCallback, type ReactNode } from 'react'
import {
  CaretDown,
  CaretRight,
  CircleNotch,
  CheckCircle,
  XCircle,
  Wrench,
  MagnifyingGlass,
  CalendarPlus,
  PencilSimple,
  Calendar,
  User,
  Storefront,
  Handshake,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type ToolStatus = 'pending' | 'executing' | 'success' | 'error'

export interface ToolProps {
  id: string
  name: string
  arguments?: Record<string, unknown>
  status: ToolStatus
  result?: {
    success: boolean
    summary: string
    data?: unknown
    error?: string
  }
  defaultExpanded?: boolean
  className?: string
}

// ============================================================================
// Tool Icon Map
// ============================================================================

const toolIcons: Record<string, typeof Wrench> = {
  searchVendors: MagnifyingGlass,
  searchSponsors: MagnifyingGlass,
  getRecommendedVendors: MagnifyingGlass,
  getRecommendedSponsors: MagnifyingGlass,
  createEvent: CalendarPlus,
  updateEvent: PencilSimple,
  getEvent: Calendar,
  getUserProfile: User,
  getVendorDetails: Storefront,
  getSponsorDetails: Handshake,
  addVendorToEvent: Storefront,
  addSponsorToEvent: Handshake,
}

// ============================================================================
// Tool Display Names
// ============================================================================

const toolDisplayNames: Record<string, string> = {
  searchVendors: 'Search Vendors',
  searchSponsors: 'Search Sponsors',
  getRecommendedVendors: 'Find Vendors',
  getRecommendedSponsors: 'Find Sponsors',
  createEvent: 'Create Event',
  updateEvent: 'Update Event',
  getEvent: 'Event Details',
  getUserProfile: 'Your Profile',
  getVendorDetails: 'Vendor Details',
  getSponsorDetails: 'Sponsor Details',
  addVendorToEvent: 'Add Vendor',
  addSponsorToEvent: 'Add Sponsor',
}

function getToolDisplayName(name: string): string {
  return toolDisplayNames[name] || name.replace(/([A-Z])/g, ' $1').trim()
}

// ============================================================================
// Component
// ============================================================================

export function Tool({
  name,
  arguments: args,
  status,
  result,
  defaultExpanded = false,
  className,
}: ToolProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const ToolIcon = toolIcons[name] || Wrench
  const displayName = getToolDisplayName(name)

  // Status indicator element
  const statusIndicator = (() => {
    switch (status) {
      case 'executing':
        return (
          <div className="tool-executing">
            <CircleNotch size={16} weight="bold" className="animate-spin text-primary" />
          </div>
        )
      case 'success':
        return (
          <div className="tool-success">
            <CheckCircle size={16} weight="fill" className="text-emerald-500" />
          </div>
        )
      case 'error':
        return (
          <div className="tool-error">
            <XCircle size={16} weight="fill" className="text-destructive" />
          </div>
        )
      default:
        return <CircleNotch size={16} weight="duotone" className="text-muted-foreground" />
    }
  })()

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card/50 overflow-hidden',
        'transition-all duration-[var(--duration-normal)]',
        'message-entrance',
        status === 'executing' && 'border-primary/30 shadow-sm shadow-primary/10',
        status === 'success' && 'border-emerald-500/30',
        status === 'error' && 'border-destructive/30',
        className
      )}
    >
      {/* Progress bar for executing state */}
      {status === 'executing' && (
        <div className="h-0.5 bg-primary/20 overflow-hidden">
          <div className="h-full w-1/3 bg-primary animate-[progress-indeterminate_1.5s_infinite_ease-in-out]" />
        </div>
      )}

      {/* Header */}
      <button
        onClick={toggleExpanded}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 text-left',
          'hover:bg-muted/30 transition-colors duration-150'
        )}
      >
        {/* Tool icon with subtle background */}
        <span
          className={cn(
            'p-1.5 rounded-md',
            status === 'executing' && 'bg-primary/10 text-primary',
            status === 'success' && 'bg-emerald-500/10 text-emerald-600',
            status === 'error' && 'bg-destructive/10 text-destructive',
            status === 'pending' && 'bg-muted text-muted-foreground'
          )}
        >
          <ToolIcon size={14} weight="duotone" />
        </span>

        {/* Tool name */}
        <span className="flex-1 text-sm font-medium">{displayName}</span>

        {/* Status + expand indicator */}
        <div className="flex items-center gap-2">
          {statusIndicator}
          <span className="text-muted-foreground/60">
            {isExpanded ? (
              <CaretDown size={12} weight="bold" />
            ) : (
              <CaretRight size={12} weight="bold" />
            )}
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50">
          {/* Arguments */}
          {args && Object.keys(args).length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Arguments</h4>
              <pre className="text-xs bg-muted/50 p-2 rounded-md overflow-x-auto">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {result && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Result</h4>
              <div
                className={cn(
                  'text-sm p-2 rounded-md',
                  result.success
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-destructive/10 text-destructive'
                )}
              >
                {result.summary}
              </div>
              {result.error && (
                <pre className="text-xs text-destructive bg-destructive/5 p-2 rounded-md mt-2 overflow-x-auto">
                  {result.error}
                </pre>
              )}
              {result.data !== undefined && result.data !== null && (
                <pre className="text-xs bg-muted/50 p-2 rounded-md mt-2 overflow-x-auto">
                  {JSON.stringify(result.data, null, 2) as string}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Tool List Component
// ============================================================================

export interface ToolListProps {
  children: ReactNode
  className?: string
}

export function ToolList({ children, className }: ToolListProps) {
  return <div className={cn('space-y-2', className)}>{children}</div>
}
