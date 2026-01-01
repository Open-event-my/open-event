import {
  CircleNotch,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Calendar,
  User,
  Storefront,
  Handshake,
  Gear,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type ToolStatus = 'pending' | 'executing' | 'success' | 'error'

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  name: string
  success: boolean
  data?: unknown
  error?: string
  summary: string
}

export interface AgenticToolProps {
  name: string
  status: ToolStatus
  summary?: string
  className?: string
}

// ============================================================================
// Tool Config
// ============================================================================

const toolConfig: Record<
  string,
  { icon: React.ElementType; label: string; executingLabel: string }
> = {
  searchVendors: {
    icon: MagnifyingGlass,
    label: 'Search Vendors',
    executingLabel: 'Searching vendors...',
  },
  searchSponsors: {
    icon: MagnifyingGlass,
    label: 'Search Sponsors',
    executingLabel: 'Searching sponsors...',
  },
  getRecommendedVendors: {
    icon: Storefront,
    label: 'Get Vendors',
    executingLabel: 'Finding best vendors...',
  },
  getRecommendedSponsors: {
    icon: Handshake,
    label: 'Get Sponsors',
    executingLabel: 'Finding sponsors...',
  },
  createEvent: { icon: Calendar, label: 'Create Event', executingLabel: 'Creating your event...' },
  updateEvent: { icon: Calendar, label: 'Update Event', executingLabel: 'Updating event...' },
  getEventDetails: {
    icon: Calendar,
    label: 'Event Details',
    executingLabel: 'Loading event details...',
  },
  getUpcomingEvents: {
    icon: Calendar,
    label: 'Upcoming Events',
    executingLabel: 'Loading events...',
  },
  getUserProfile: { icon: User, label: 'User Profile', executingLabel: 'Loading profile...' },
  addVendorToEvent: { icon: Storefront, label: 'Add Vendor', executingLabel: 'Adding vendor...' },
  addSponsorToEvent: { icon: Handshake, label: 'Add Sponsor', executingLabel: 'Adding sponsor...' },
}

// ============================================================================
// Component
// ============================================================================

/**
 * AgenticTool - Premium tool execution display
 * Shows status with animated icons and gradient backgrounds
 */
export function AgenticTool({ name, status, summary, className }: AgenticToolProps) {
  const config = toolConfig[name] || {
    icon: Gear,
    label: name,
    executingLabel: `Running ${name}...`,
  }
  const Icon = config.icon

  const statusText =
    status === 'executing'
      ? config.executingLabel
      : status === 'success'
        ? summary || 'Completed'
        : status === 'error'
          ? summary || 'Failed'
          : config.label

  return (
    <div
      className={cn(
        'agentic-tool-v2',
        status === 'executing' && 'is-executing',
        status === 'success' && 'is-success',
        status === 'error' && 'is-error',
        className
      )}
    >
      <div className="agentic-tool-v2-icon">
        {status === 'executing' ? (
          <CircleNotch size={16} weight="bold" />
        ) : status === 'success' ? (
          <CheckCircle size={16} weight="fill" />
        ) : status === 'error' ? (
          <XCircle size={16} weight="fill" />
        ) : (
          <Icon size={16} weight="duotone" />
        )}
      </div>

      <div className="agentic-tool-v2-content">
        <div className="agentic-tool-v2-name">{config.label}</div>
        <div className="agentic-tool-v2-status">{statusText}</div>
      </div>
    </div>
  )
}

// ============================================================================
// Tool List (multiple tools)
// ============================================================================

export interface AgenticToolListProps {
  tools: Array<{ id: string; name: string; status: ToolStatus; summary?: string }>
  className?: string
}

export function AgenticToolList({ tools, className }: AgenticToolListProps) {
  if (tools.length === 0) return null

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {tools.map((tool) => (
        <AgenticTool key={tool.id} name={tool.name} status={tool.status} summary={tool.summary} />
      ))}
    </div>
  )
}

export default AgenticTool
