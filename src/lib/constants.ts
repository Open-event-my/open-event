/**
 * Centralized constants for the application
 * This file contains shared configuration, colors, and mappings
 */

// ============================================================================
// APP CONFIGURATION
// ============================================================================

export const APP_CONFIG = {
  name: 'Open Event',
  version: '1.0.0',
  github: {
    owner: 'hazlijohar95',
    repo: 'open-event',
  },
} as const

// Storage keys for localStorage/sessionStorage
export const STORAGE_KEYS = {
  AUDIENCE: 'open-event-audience',
  AGENTIC_CHAT: 'open-event-agentic-chat-v2',
  PWA_DISMISSED: 'pwa-install-dismissed',
  GITHUB_CACHE: 'github-data-cache',
} as const

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  GITHUB_DATA: 60 * 60 * 1000, // 1 hour
  PWA_DISMISS: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const

// ============================================================================
// EVENT STATUS CONFIGURATION
// ============================================================================

// Event status configuration
export const EVENT_STATUS = {
  DRAFT: 'draft',
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS]

export const eventStatusConfig: Record<
  string,
  {
    bg: string
    text: string
    label: string
    description: string
    nextStatus?: string
    nextAction?: string
    icon: 'draft' | 'planning' | 'active' | 'completed' | 'cancelled'
  }
> = {
  draft: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-500',
    label: 'Draft',
    description: 'Incomplete event details',
    nextStatus: 'planning',
    nextAction: 'Start Planning',
    icon: 'draft',
  },
  planning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Planning',
    description: 'Actively preparing for the event',
    nextStatus: 'active',
    nextAction: 'Go Live',
    icon: 'planning',
  },
  active: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    label: 'Active',
    description: 'Event is live and accepting participants',
    nextStatus: 'completed',
    nextAction: 'Mark Complete',
    icon: 'active',
  },
  completed: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    label: 'Completed',
    description: 'Event has ended',
    icon: 'completed',
  },
  cancelled: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    label: 'Cancelled',
    description: 'Event was cancelled',
    nextStatus: 'draft',
    nextAction: 'Reactivate',
    icon: 'cancelled',
  },
}

// For backwards compatibility
export const eventStatusColors = eventStatusConfig

export const eventStatusFilters = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

// Status workflow order for progress indicator
export const statusWorkflowOrder = ['draft', 'planning', 'active', 'completed'] as const

// Vendor status configuration
export const VENDOR_STATUS = {
  INQUIRY: 'inquiry',
  NEGOTIATING: 'negotiating',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  COMPLETED: 'completed',
} as const

export type VendorStatus = (typeof VENDOR_STATUS)[keyof typeof VENDOR_STATUS]

export const vendorStatusColors: Record<string, { bg: string; text: string }> = {
  inquiry: { bg: 'bg-zinc-500/10', text: 'text-zinc-500' },
  negotiating: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  declined: { bg: 'bg-red-500/10', text: 'text-red-500' },
  completed: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
}

// Sponsor tier configuration
export const SPONSOR_TIER = {
  PLATINUM: 'platinum',
  GOLD: 'gold',
  SILVER: 'silver',
  BRONZE: 'bronze',
} as const

export type SponsorTier = (typeof SPONSOR_TIER)[keyof typeof SPONSOR_TIER]

export const sponsorTierColors: Record<string, { bg: string; text: string }> = {
  platinum: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  gold: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  silver: { bg: 'bg-zinc-400/10', text: 'text-zinc-400' },
  bronze: { bg: 'bg-orange-700/10', text: 'text-orange-700' },
}

// Sponsor/Vendor approval status
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS]

// Location types
export const LOCATION_TYPE = {
  IN_PERSON: 'in-person',
  VIRTUAL: 'virtual',
  HYBRID: 'hybrid',
} as const

export type LocationType = (typeof LOCATION_TYPE)[keyof typeof LOCATION_TYPE]

// Date formatting utilities
export const formatDate = (timestamp: number, format: 'short' | 'long' = 'short') => {
  if (format === 'long') {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Currency formatting
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================================================
// VENDOR CONFIGURATION
// ============================================================================

export const VENDOR_CATEGORIES = [
  'catering',
  'photography',
  'videography',
  'decoration',
  'entertainment',
  'audio_visual',
  'security',
  'transportation',
  'printing',
  'staffing',
  'venue',
  'equipment',
  'other',
] as const

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number]

export const PRICE_RANGES = ['budget', 'mid', 'premium'] as const
export type PriceRange = (typeof PRICE_RANGES)[number]

export const APPLICATION_SOURCES = ['manual', 'email', 'import', 'referral', 'form'] as const
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number]
