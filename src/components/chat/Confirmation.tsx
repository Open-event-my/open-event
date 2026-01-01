import {
  Sparkle,
  CheckCircle,
  XCircle,
  CalendarPlus,
  Storefront,
  Handshake,
  Wrench,
  CircleNotch,
  PencilSimple,
  User,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface ConfirmationProps {
  id: string
  toolName: string
  arguments?: Record<string, unknown>
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

// ============================================================================
// Tool Icon Map
// ============================================================================

const toolConfig: Record<string, { icon: typeof Wrench; label: string; confirmTitle: string }> = {
  createEvent: {
    icon: CalendarPlus,
    label: 'Create Event',
    confirmTitle: 'Ready to create this event?',
  },
  updateEvent: {
    icon: PencilSimple,
    label: 'Update Event',
    confirmTitle: 'Save these changes?',
  },
  addVendorToEvent: {
    icon: Storefront,
    label: 'Add Vendor',
    confirmTitle: 'Add this vendor?',
  },
  addSponsorToEvent: {
    icon: Handshake,
    label: 'Add Sponsor',
    confirmTitle: 'Add this sponsor?',
  },
  searchVendors: {
    icon: MagnifyingGlass,
    label: 'Search Vendors',
    confirmTitle: 'Search for vendors?',
  },
  searchSponsors: {
    icon: MagnifyingGlass,
    label: 'Search Sponsors',
    confirmTitle: 'Search for sponsors?',
  },
  getUserProfile: {
    icon: User,
    label: 'Get Profile',
    confirmTitle: 'Access your profile?',
  },
}

function getToolConfig(name: string) {
  return (
    toolConfig[name] || {
      icon: Wrench,
      label: name.replace(/([A-Z])/g, ' $1').trim(),
      confirmTitle: 'Proceed with this action?',
    }
  )
}

// Format a key name to be human-readable
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

// Format a value for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// ============================================================================
// Component
// ============================================================================

export function Confirmation({
  toolName,
  arguments: args,
  onConfirm,
  onCancel,
  isLoading = false,
  className,
}: ConfirmationProps) {
  const config = getToolConfig(toolName)
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
        'shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkle size={20} weight="duotone" className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{config.confirmTitle}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Please review the details below</p>
        </div>
      </div>

      {/* Action details */}
      {args && Object.keys(args).length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
            <Icon size={16} weight="duotone" className="text-primary" />
            <span className="text-sm font-medium text-foreground">{config.label}</span>
          </div>
          <div className="space-y-2">
            {Object.entries(args).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground min-w-[100px] capitalize">
                  {formatKey(key)}
                </span>
                <span className="text-foreground font-medium flex-1">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-primary text-primary-foreground font-medium',
            'hover:bg-primary/90 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <CircleNotch size={16} weight="bold" className="animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <CheckCircle size={16} weight="bold" />
              <span>Looks good</span>
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
            'border border-border bg-background text-muted-foreground font-medium',
            'hover:bg-muted hover:text-foreground transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <XCircle size={16} weight="bold" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Inline Confirmation (smaller variant)
// ============================================================================

export interface InlineConfirmationProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

export function InlineConfirmation({
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  className,
}: InlineConfirmationProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg',
        'border border-border bg-card',
        className
      )}
    >
      <Sparkle size={14} weight="duotone" className="text-primary flex-shrink-0" />
      <span className="text-sm">{message}</span>
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded-md bg-primary text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'disabled:opacity-50'
          )}
          title="Confirm"
        >
          {isLoading ? (
            <CircleNotch size={14} weight="bold" className="animate-spin" />
          ) : (
            <CheckCircle size={14} weight="bold" />
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className={cn(
            'p-1.5 rounded-md border border-border',
            'hover:bg-muted transition-colors',
            'disabled:opacity-50'
          )}
          title="Cancel"
        >
          <XCircle size={14} weight="bold" />
        </button>
      </div>
    </div>
  )
}
