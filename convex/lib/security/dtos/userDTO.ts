/**
 * User Data Transfer Objects (DTOs)
 *
 * Provides role-based field filtering for user profile data.
 * Prevents exposure of:
 * - Password hashes and 2FA secrets
 * - Email verification tokens
 * - Suspension details
 * - Security audit information
 *
 * SECURITY: Never expose authentication credentials or security metadata.
 */

import type { Doc } from '../../../_generated/dataModel'

// ============================================================================
// VISIBILITY CONFIGURATIONS
// ============================================================================

/**
 * Field visibility levels for users
 */
export const USER_VISIBILITY = {
  /**
   * PUBLIC - Anyone (unauthenticated users)
   * Minimal public profile for directories
   */
  public: ['_id', 'name', 'image'] as const,

  /**
   * AUTHENTICATED - Logged in users
   * Basic profile info for collaboration
   */
  authenticated: ['_id', 'name', 'email', 'image', 'role'] as const,

  /**
   * SELF - User viewing their own profile
   * Full profile including preferences (not security metadata)
   */
  self: [
    '_id',
    '_creationTime',
    'name',
    'email',
    'emailVerified',
    'image',
    'phone',
    'role',
    'status',
    'twoFactorEnabled',
    'createdAt',
    'updatedAt',
  ] as const,

  /**
   * ADMIN - Platform administrators
   * Extended profile for moderation (no passwords/secrets)
   */
  admin: [
    '_id',
    '_creationTime',
    'name',
    'email',
    'emailVerified',
    'emailVerificationTime',
    'image',
    'phone',
    'phoneVerificationTime',
    'isAnonymous',
    'role',
    'status',
    'suspendedAt',
    'suspendedReason',
    'suspendedBy',
    'twoFactorEnabled',
    'twoFactorVerifiedAt',
    'createdAt',
    'updatedAt',
  ] as const,

  /**
   * SYSTEM - Internal operations (full access)
   * All fields for system operations
   */
  system: ['*'] as const,
} as const

export type UserVisibilityLevel = keyof typeof USER_VISIBILITY

// ============================================================================
// DTO TYPES
// ============================================================================

/**
 * Public user DTO - minimal profile
 */
export type PublicUserDTO = Pick<
  Doc<'users'>,
  (typeof USER_VISIBILITY.public)[number]
>

/**
 * Authenticated user DTO - basic collaboration info
 */
export type AuthenticatedUserDTO = Pick<
  Doc<'users'>,
  (typeof USER_VISIBILITY.authenticated)[number]
>

/**
 * Self user DTO - user's own profile
 */
export type SelfUserDTO = Pick<
  Doc<'users'>,
  (typeof USER_VISIBILITY.self)[number]
>

/**
 * Admin user DTO - moderation view
 */
export type AdminUserDTO = Pick<
  Doc<'users'>,
  (typeof USER_VISIBILITY.admin)[number]
>

/**
 * System user DTO - internal operations
 */
export type SystemUserDTO = Doc<'users'>

/**
 * Union of all user DTO types
 */
export type UserDTO =
  | PublicUserDTO
  | AuthenticatedUserDTO
  | SelfUserDTO
  | AdminUserDTO
  | SystemUserDTO

// ============================================================================
// DTO CREATION FUNCTIONS
// ============================================================================

/**
 * Create a user DTO with appropriate field filtering
 *
 * @param user - Full user document
 * @param viewer - Visibility level
 * @returns Filtered user object
 *
 * @example
 * // Public directory listing
 * const publicUser = createUserDTO(user, 'public')
 * console.log(publicUser.email) // undefined - not exposed
 *
 * // Viewing own profile
 * const selfProfile = createUserDTO(user, 'self')
 * console.log(selfProfile.email) // defined - visible to self
 * console.log(selfProfile.passwordHash) // undefined - never exposed
 *
 * // Admin moderation
 * const adminUser = createUserDTO(user, 'admin')
 * console.log(adminUser.suspendedReason) // defined - visible to admin
 * console.log(adminUser.passwordHash) // undefined - never exposed to UI
 */
export function createUserDTO(
  user: Doc<'users'>,
  viewer: UserVisibilityLevel
): UserDTO {
  // System sees everything (internal operations only)
  if (viewer === 'system') {
    return user
  }

  const allowedFields = USER_VISIBILITY[viewer]
  const filtered: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in user) {
      filtered[field] = user[field as keyof Doc<'users'>]
    }
  }

  return filtered as UserDTO
}

/**
 * Create user DTOs for an array of users
 *
 * @param users - Array of user documents
 * @param viewer - Visibility level
 * @returns Array of filtered user objects
 */
export function createUserDTOs(
  users: Doc<'users'>[],
  viewer: UserVisibilityLevel
): UserDTO[] {
  return users.map((user) => createUserDTO(user, viewer))
}

/**
 * Determine appropriate visibility level for a user viewing another user
 *
 * @param viewerRole - Role of the person viewing
 * @param isViewingSelf - Whether viewing own profile
 * @param isAuthenticated - Whether viewer is authenticated
 * @returns Appropriate visibility level
 */
export function determineUserVisibility(
  viewerRole: string | undefined,
  isViewingSelf: boolean,
  isAuthenticated: boolean
): UserVisibilityLevel {
  // Admin sees extended profile
  if (viewerRole === 'admin' || viewerRole === 'superadmin') {
    return 'admin'
  }

  // User sees full own profile
  if (isViewingSelf) {
    return 'self'
  }

  // Authenticated users see basic collaboration info
  if (isAuthenticated) {
    return 'authenticated'
  }

  // Public sees minimal profile
  return 'public'
}

// ============================================================================
// SECURITY HELPERS
// ============================================================================

/**
 * Check if a user profile should be visible based on status
 *
 * @param user - User document
 * @param viewerRole - Role of the viewer
 * @param isViewingSelf - Whether viewing own profile
 * @returns true if profile should be visible
 */
export function isUserProfileVisible(
  user: Doc<'users'>,
  viewerRole: string | undefined,
  isViewingSelf: boolean
): boolean {
  // Admins see all profiles
  if (viewerRole === 'admin' || viewerRole === 'superadmin') {
    return true
  }

  // Users can always see their own profile
  if (isViewingSelf) {
    return true
  }

  // Suspended users are hidden from public
  if (user.status === 'suspended') {
    return false
  }

  // Pending users are hidden from public
  if (user.status === 'pending') {
    return false
  }

  return true
}

/**
 * Sanitize user object for safe logging (removes all PII)
 *
 * @param user - User document
 * @returns Sanitized object safe for logs
 */
export function sanitizeUserForLogging(user: Doc<'users'>): Record<string, unknown> {
  return {
    _id: user._id,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
    // All PII fields omitted
  }
}
