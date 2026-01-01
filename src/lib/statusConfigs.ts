/**
 * Centralized status configurations for the admin panel.
 * These replace duplicate status config objects across admin pages.
 */

// ============================================================================
// USER STATUS CONFIGURATION
// ============================================================================

export type UserStatus = 'active' | 'suspended' | 'pending'

export const userStatusConfig: Record<
  UserStatus,
  {
    bg: string
    text: string
    label: string
    description: string
  }
> = {
  active: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    label: 'Active',
    description: 'User has full access to the platform',
  },
  suspended: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'Suspended',
    description: 'User access is temporarily restricted',
  },
  pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Pending',
    description: 'Awaiting email verification',
  },
}

// ============================================================================
// USER ROLE CONFIGURATION
// ============================================================================

export type UserRole = 'superadmin' | 'admin' | 'organizer'

export const userRoleConfig: Record<
  UserRole,
  {
    bg: string
    text: string
    label: string
    description: string
  }
> = {
  superadmin: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    label: 'Super Admin',
    description: 'Full platform access and configuration',
  },
  admin: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Admin',
    description: 'Manage users, content, and moderation',
  },
  organizer: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    label: 'Organizer',
    description: 'Create and manage events',
  },
}

// ============================================================================
// APPLICATION STATUS CONFIGURATION
// ============================================================================

export type ApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted'

export const applicationStatusConfig: Record<
  ApplicationStatus,
  {
    bg: string
    text: string
    label: string
    description: string
  }
> = {
  submitted: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    label: 'New',
    description: 'Awaiting initial review',
  },
  under_review: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Under Review',
    description: 'Currently being evaluated',
  },
  approved: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    label: 'Approved',
    description: 'Ready to convert to directory',
  },
  rejected: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'Rejected',
    description: 'Application was declined',
  },
  converted: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    label: 'Converted',
    description: 'Added to vendor/sponsor directory',
  },
}

// ============================================================================
// VENDOR STATUS CONFIGURATION
// ============================================================================

export type VendorStatus = 'inquiry' | 'negotiating' | 'confirmed' | 'declined' | 'completed'

export const vendorStatusConfig: Record<
  VendorStatus,
  {
    bg: string
    text: string
    label: string
    description: string
  }
> = {
  inquiry: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-500',
    label: 'Inquiry',
    description: 'Initial contact made',
  },
  negotiating: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    label: 'Negotiating',
    description: 'Terms being discussed',
  },
  confirmed: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    label: 'Confirmed',
    description: 'Agreement finalized',
  },
  declined: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    label: 'Declined',
    description: 'Vendor declined or was rejected',
  },
  completed: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    label: 'Completed',
    description: 'Service delivered',
  },
}

// ============================================================================
// SPONSOR STATUS CONFIGURATION
// ============================================================================

export type SponsorStatus = 'pending' | 'approved' | 'rejected' | 'confirmed' | 'completed'

export const sponsorStatusConfig: Record<
  SponsorStatus,
  {
    bg: string
    text: string
    label: string
    description: string
  }
> = {
  pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    label: 'Pending',
    description: 'Awaiting review',
  },
  approved: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    label: 'Approved',
    description: 'Ready for confirmation',
  },
  rejected: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    label: 'Rejected',
    description: 'Sponsorship declined',
  },
  confirmed: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    label: 'Confirmed',
    description: 'Sponsorship confirmed',
  },
  completed: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    label: 'Completed',
    description: 'Sponsorship fulfilled',
  },
}

// ============================================================================
// SPONSOR TIER CONFIGURATION
// ============================================================================

export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze'

export const sponsorTierConfig: Record<
  SponsorTier,
  {
    bg: string
    text: string
    label: string
    description: string
  }
> = {
  platinum: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    label: 'Platinum',
    description: 'Top tier sponsorship',
  },
  gold: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    label: 'Gold',
    description: 'Premium sponsorship',
  },
  silver: {
    bg: 'bg-zinc-400/10',
    text: 'text-zinc-400',
    label: 'Silver',
    description: 'Standard sponsorship',
  },
  bronze: {
    bg: 'bg-orange-700/10',
    text: 'text-orange-700',
    label: 'Bronze',
    description: 'Entry-level sponsorship',
  },
}

// ============================================================================
// MODERATION STATUS CONFIGURATION
// ============================================================================

export type ModerationStatus = 'pending' | 'approved' | 'flagged' | 'removed'

export const moderationStatusConfig: Record<
  ModerationStatus,
  {
    bg: string
    text: string
    label: string
    description: string
  }
> = {
  pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    label: 'Pending Review',
    description: 'Awaiting moderation',
  },
  approved: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    label: 'Approved',
    description: 'Content is visible',
  },
  flagged: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    label: 'Flagged',
    description: 'Marked for review',
  },
  removed: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    label: 'Removed',
    description: 'Content was removed',
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate filter options from a status config.
 * Returns an array suitable for select/filter dropdowns.
 *
 * @example
 * const filters = createStatusFilters(userStatusConfig)
 * // [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, ...]
 */
export function createStatusFilters<T extends string>(
  config: Record<T, { label: string }>,
  allLabel = 'All'
): Array<{ value: T | 'all'; label: string }> {
  return [
    { value: 'all' as const, label: allLabel },
    ...(Object.entries(config) as [T, { label: string }][]).map(([value, { label }]) => ({
      value,
      label,
    })),
  ]
}

/**
 * Count items by status.
 * Useful for showing status counts in filters.
 *
 * @example
 * const counts = countByStatus(users, 'status')
 * // { active: 10, suspended: 2, pending: 5 }
 */
export function countByStatus<T extends Record<string, unknown>>(
  items: T[] | undefined,
  statusKey: keyof T
): Record<string, number> {
  if (!items) return {}

  return items.reduce(
    (acc, item) => {
      const status = String(item[statusKey])
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}

/**
 * Get status config entry with fallback.
 * Returns a default config if status is not found.
 */
export function getStatusConfig<T extends string>(
  config: Record<T, { bg: string; text: string; label: string }>,
  status: string | undefined
): { bg: string; text: string; label: string } {
  if (!status || !(status in config)) {
    return {
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-500',
      label: status || 'Unknown',
    }
  }
  return config[status as T]
}
