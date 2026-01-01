import { Check, CircleNotch, Calendar, MapPin, Users, CurrencyDollar } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { ToolCall } from './AgenticTool'

// ============================================================================
// Types
// ============================================================================

export interface AgenticConfirmationProps {
  toolCall: ToolCall
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * AgenticConfirmation - Premium confirmation card for tool execution
 * Beautiful preview with action buttons
 */
export function AgenticConfirmation({
  toolCall,
  onConfirm,
  onCancel,
  isLoading = false,
  className,
}: AgenticConfirmationProps) {
  const args = toolCall.arguments as Record<string, unknown>

  // Format the tool name nicely
  const getActionTitle = () => {
    switch (toolCall.name) {
      case 'createEvent':
        return 'Create Event'
      case 'updateEvent':
        return 'Update Event'
      case 'addVendorToEvent':
        return 'Add Vendor'
      case 'addSponsorToEvent':
        return 'Add Sponsor'
      default:
        return toolCall.name.replace(/([A-Z])/g, ' $1').trim()
    }
  }

  return (
    <div className={cn('agentic-confirm-v2 agentic-confirmation-inline', className)}>
      {/* Header */}
      <div className="agentic-confirm-v2-header">
        <div className="agentic-confirm-v2-icon">
          <Check size={18} weight="bold" />
        </div>
        <span className="agentic-confirm-v2-title">Ready to {getActionTitle()}</span>
      </div>

      {/* Body */}
      <div className="agentic-confirm-v2-body">
        {toolCall.name === 'createEvent' ? (
          <EventPreview args={args} />
        ) : (
          <GenericPreview args={args} />
        )}
      </div>

      {/* Actions */}
      <div className="agentic-confirm-v2-actions">
        <button onClick={onConfirm} disabled={isLoading} className="agentic-confirm-v2-btn primary">
          {isLoading ? (
            <>
              <CircleNotch size={16} weight="bold" className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check size={16} weight="bold" />
              Confirm & Create
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="agentic-confirm-v2-btn secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Event Preview
// ============================================================================

function EventPreview({ args }: { args: Record<string, unknown> }) {
  const title = args.title as string
  const eventType = args.eventType as string
  const startDate = args.startDate as string
  const startTime = args.startTime as string
  const locationType = args.locationType as string
  const venueName = args.venueName as string
  const expectedAttendees = args.expectedAttendees as number
  const budget = args.budget as number

  return (
    <div className="space-y-4">
      {/* Event Title */}
      <div>
        <h4 className="font-semibold text-base text-foreground">{title}</h4>
        {eventType && (
          <span className="inline-block mt-1.5 px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground font-medium capitalize">
            {eventType}
          </span>
        )}
      </div>

      {/* Details Grid - Responsive: 1 column on tiny screens, 2 on larger */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 xs:gap-3 text-sm">
        {startDate && (
          <DetailItem icon={Calendar}>
            {startDate}
            {startTime ? ` at ${startTime}` : ''}
          </DetailItem>
        )}
        {locationType && <DetailItem icon={MapPin}>{venueName || locationType}</DetailItem>}
        {expectedAttendees && (
          <DetailItem icon={Users}>{expectedAttendees.toLocaleString()}</DetailItem>
        )}
        {budget && <DetailItem icon={CurrencyDollar}>${budget.toLocaleString()}</DetailItem>}
      </div>
    </div>
  )
}

// ============================================================================
// Generic Preview
// ============================================================================

function GenericPreview({ args }: { args: Record<string, unknown> }) {
  const entries = Object.entries(args).filter(([, v]) => v !== undefined && v !== null)
  if (entries.length === 0) return null

  return (
    <div className="space-y-2 text-sm">
      {entries.slice(0, 4).map(([key, value]) => (
        <div key={key} className="flex items-start gap-3">
          <span className="text-muted-foreground min-w-[100px] capitalize">
            {key.replace(/([A-Z])/g, ' $1').trim()}:
          </span>
          <span className="font-medium text-foreground truncate">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
      {entries.length > 4 && (
        <div className="text-xs text-muted-foreground pt-1">+{entries.length - 4} more fields</div>
      )}
    </div>
  )
}

// ============================================================================
// Detail Item
// ============================================================================

function DetailItem({
  icon: Icon,
  children,
}: {
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon size={14} weight="duotone" />
      <span className="capitalize">{children}</span>
    </div>
  )
}

export default AgenticConfirmation
