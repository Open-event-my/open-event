/**
 * Validation utilities for forms and data
 * These mirror the backend validation logic for client-side validation
 */

// Email regex pattern - improved to:
// - Require proper TLD (min 2 chars)
// - Allow only valid local part characters
// - Prevent consecutive dots and leading/trailing dots
const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

// URL regex pattern (basic)
const URL_REGEX = /^https?:\/\/.+/

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url)
}

/**
 * Validate string length
 */
export function isWithinLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength
}

/**
 * Validate string is not empty (after trimming)
 */
export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0
}

/**
 * Validate a number is non-negative
 */
export function isNonNegative(value: number): boolean {
  return value >= 0
}

/**
 * Validate budget range (min <= max)
 */
export function isValidBudgetRange(min: number, max: number): boolean {
  return min <= max
}

/**
 * Validate date is not too far in the past (within 1 year)
 */
export function isValidEventDate(timestamp: number): boolean {
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000
  return timestamp >= oneYearAgo
}

/**
 * Validate end date is after start date
 */
export function isValidDateRange(startDate: number, endDate: number): boolean {
  return endDate >= startDate
}

/**
 * Password validation requirements
 * Must match convex/lib/passwordValidation.ts
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
}

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

/**
 * Comprehensive password validation matching backend requirements
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters`)
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('At least 1 uppercase letter')
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('At least 1 lowercase letter')
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push('At least 1 number')
  }
  if (
    PASSWORD_REQUIREMENTS.requireSpecial &&
    !/[!@#$%^&*(),.?":{}|<>[\]\\;'`~_+=-]/.test(password)
  ) {
    errors.push('At least 1 special character')
  }

  const strength: 'weak' | 'medium' | 'strong' =
    errors.length === 0 ? 'strong' : errors.length <= 2 ? 'medium' : 'weak'

  return { isValid: errors.length === 0, errors, strength }
}

/**
 * Simple password validation (legacy - 8 char minimum)
 * @deprecated Use validatePasswordStrength for comprehensive validation
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  return { valid: true }
}

/**
 * Event title validation
 */
export function validateEventTitle(title: string): { valid: boolean; message?: string } {
  if (!isNotEmpty(title)) {
    return { valid: false, message: 'Event title cannot be empty' }
  }
  if (!isWithinLength(title, 200)) {
    return { valid: false, message: 'Event title must be 200 characters or less' }
  }
  return { valid: true }
}

/**
 * Event description validation
 */
export function validateEventDescription(description: string): {
  valid: boolean
  message?: string
} {
  if (!isWithinLength(description, 10000)) {
    return { valid: false, message: 'Description must be 10000 characters or less' }
  }
  return { valid: true }
}

/**
 * Vendor/Sponsor name validation
 */
export function validateBusinessName(name: string): { valid: boolean; message?: string } {
  if (!isNotEmpty(name)) {
    return { valid: false, message: 'Name cannot be empty' }
  }
  if (!isWithinLength(name, 200)) {
    return { valid: false, message: 'Name must be 200 characters or less' }
  }
  return { valid: true }
}

/**
 * Event status transitions (state machine)
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['planning', 'cancelled'],
  planning: ['active', 'draft', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['draft'],
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowedTransitions) return false
  return allowedTransitions.includes(newStatus)
}

/**
 * Role hierarchy
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  superadmin: 3,
  admin: 2,
  organizer: 1,
}

/**
 * Check if role has admin privileges
 */
export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'superadmin'
}

/**
 * Check if a role has sufficient privileges
 */
export function hasRolePrivilege(userRole: string | undefined, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole || 'organizer'] || 1
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 1
  return userLevel >= requiredLevel
}
