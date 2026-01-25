/**
 * Data Transfer Objects (DTOs) - Centralized Export
 *
 * Field filtering DTOs for role-based data visibility.
 * Import from this file for all DTO needs.
 */

// Event DTOs
export {
  createEventDTO,
  createEventDTOs,
  isEventVisible,
  filterVisibleEvents,
  EVENT_VISIBILITY,
  type EventDTO,
  type PublicEventDTO,
  type AuthenticatedEventDTO,
  type OrganizerEventDTO,
  type AdminEventDTO,
  type EventVisibilityLevel,
} from './eventDTO'

// Order DTOs
export {
  createOrderDTO,
  createOrderDTOs,
  createOrderStatsDTO,
  ORDER_VISIBILITY,
  type OrderDTO,
  type BuyerOrderDTO,
  type OrganizerOrderDTO,
  type AdminOrderDTO,
  type OrderVisibilityLevel,
  type OrderStatsDTO,
} from './orderDTO'

// User DTOs
export {
  createUserDTO,
  createUserDTOs,
  determineUserVisibility,
  isUserProfileVisible,
  sanitizeUserForLogging,
  USER_VISIBILITY,
  type UserDTO,
  type PublicUserDTO,
  type AuthenticatedUserDTO,
  type SelfUserDTO,
  type AdminUserDTO,
  type SystemUserDTO,
  type UserVisibilityLevel,
} from './userDTO'
