/**
 * Event Data Transfer Objects (DTOs)
 *
 * Provides role-based field filtering for event data.
 * This prevents accidental exposure of sensitive fields like:
 * - Budget information
 * - Private notes
 * - Internal IDs
 * - Organizer contact details
 *
 * SECURITY: Fail-closed approach - only explicitly allowed fields are exposed.
 */

import type { Doc } from '../../../_generated/dataModel'

// ============================================================================
// VISIBILITY CONFIGURATIONS
// ============================================================================

/**
 * Field visibility levels for events
 */
export const EVENT_VISIBILITY = {
  /**
   * PUBLIC - Anyone (unauthenticated users)
   * Minimal info for public event discovery
   */
  public: [
    '_id',
    '_creationTime',
    'title',
    'description',
    'eventType',
    'startDate',
    'endDate',
    'timezone',
    'locationType',
    'expectedAttendees',
    'status',
    'isPublic',
    'seekingVendors',
    'seekingSponsors',
    'vendorCategories',
   'sponsorBenefits',
  ] as const,

  /**
   * AUTHENTICATED - Logged in users
   * Additional context for interested vendors/sponsors
   */
  authenticated: [
    '_id',
    '_creationTime',
    'organizerId',
    'organizationId',
    'title',
    'description',
    'eventType',
    'startDate',
    'endDate',
    'timezone',
    'locationType',
    'venueName',
    'venueAddress',
    'virtualPlatform',
    'expectedAttendees',
    'status',
    'isPublic',
    'seekingVendors',
    'seekingSponsors',
    'vendorCategories',
    'sponsorBenefits',
    'requirements',
  ] as const,

  /**
   * ORGANIZER/MANAGER - Event creator or org manager
   * Full event details including budget and private info
   */
  organizer: [
    '_id',
    '_creationTime',
    'organizerId',
    'organizationId',
    'title',
    'description',
    'eventType',
    'startDate',
    'endDate',
    'timezone',
    'locationType',
    'venueName',
    'venueAddress',
    'virtualPlatform',
    'expectedAttendees',
    'budget',
    'budgetCurrency',
    'status',
    'isPublic',
    'publicVisibility',
    'seekingVendors',
    'seekingSponsors',
    'vendorCategories',
    'sponsorBenefits',
    'requirements',
    'flagged',
    'flaggedAt',
    'flaggedReason',
    'flaggedSeverity',
    'createdAt',
    'updatedAt',
  ] as const,

  /**
   * ADMIN - Platform administrators
   * All fields including moderation data
   */
  admin: ['*'] as const,
} as const

export type EventVisibilityLevel = keyof typeof EVENT_VISIBILITY

// ============================================================================
// DTO TYPES
// ============================================================================

/**
 * Public event DTO - minimal fields
 */
export type PublicEventDTO = Pick<
  Doc<'events'>,
  (typeof EVENT_VISIBILITY.public)[number]
>

/**
 * Authenticated event DTO - additional context
 */
export type AuthenticatedEventDTO = Pick<
  Doc<'events'>,
  (typeof EVENT_VISIBILITY.authenticated)[number]
>

/**
 * Organizer event DTO - full details
 */
export type OrganizerEventDTO = Pick<
  Doc<'events'>,
  (typeof EVENT_VISIBILITY.organizer)[number]
>

/**
 * Admin event DTO - all fields
 */
export type AdminEventDTO = Doc<'events'>

/**
 * Union of all event DTO types
 *
 * NOTE: TypeScript compatibility for frontend code.
 * All fields that aren't in PublicEventDTO are made optional to allow
 * frontend code to safely access them regardless of visibility level.
 * The actual field availability depends on the user's permissions.
 */
export type EventDTO = PublicEventDTO &
  Partial<Omit<Doc<'events'>, keyof PublicEventDTO>>

// ============================================================================
// DTO CREATION FUNCTIONS
// ============================================================================

/**
 * Create an event DTO with appropriate field filtering
 *
 * @param event - Full event document
 * @param viewer - Visibility level (who is viewing)
 * @returns Filtered event object with only allowed fields
 *
 * @example
 * // Public user (not authenticated)
 * const publicEvent = createEventDTO(event, 'public')
 * console.log(publicEvent.budget) // undefined - not exposed
 *
 * // Authenticated vendor browsing events
 * const authEvent = createEventDTO(event, 'authenticated')
 * console.log(authEvent.venueName) // defined - visible
 * console.log(authEvent.budget) // undefined - not exposed
 *
 * // Event organizer
 * const organizerEvent = createEventDTO(event, 'organizer')
 * console.log(organizerEvent.budget) // defined - visible to organizer
 */
export function createEventDTO(
  event: Doc<'events'>,
  viewer: EventVisibilityLevel
): EventDTO {
  // Admin sees everything
  if (viewer === 'admin') {
    return event
  }

  const allowedFields = EVENT_VISIBILITY[viewer]
  const filtered: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in event) {
      filtered[field] = event[field as keyof Doc<'events'>]
    }
  }

  return filtered as EventDTO
}

/**
 * Create event DTOs for an array of events
 *
 * @param events - Array of event documents
 * @param viewer - Visibility level
 * @returns Array of filtered event objects
 */
export function createEventDTOs(
  events: Doc<'events'>[],
  viewer: EventVisibilityLevel
): EventDTO[] {
  return events.map((event) => createEventDTO(event, viewer))
}

/**
 * Check if a user should see an event based on visibility rules
 *
 * @param event - Event document
 * @param viewerType - Type of viewer (public, authenticated, organizer, admin)
 * @param viewerId - ID of the viewer (for organizer check)
 * @returns true if event should be visible, false otherwise
 */
export function isEventVisible(
  event: Doc<'events'>,
  viewerType: 'public' | 'authenticated' | 'organizer' | 'admin',
  viewerId?: string
): boolean {
  // Admins see everything
  if (viewerType === 'admin') {
    return true
  }

  // Organizer sees their own events regardless of status
  if (viewerType === 'organizer' && viewerId && event.organizerId === viewerId) {
    return true
  }

  // Public/authenticated users only see public events with specific statuses
  if (viewerType === 'public' || viewerType === 'authenticated') {
    return (
      event.isPublic === true &&
      (event.status === 'planning' || event.status === 'active')
    )
  }

  return false
}

/**
 * Filter events based on visibility rules
 *
 * @param events - Array of events
 * @param viewerType - Type of viewer
 * @param viewerId - ID of the viewer
 * @returns Filtered array of events
 */
export function filterVisibleEvents(
  events: Doc<'events'>[],
  viewerType: 'public' | 'authenticated' | 'organizer' | 'admin',
  viewerId?: string
): Doc<'events'>[] {
  return events.filter((event) => isEventVisible(event, viewerType, viewerId))
}
