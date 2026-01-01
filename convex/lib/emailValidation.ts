/**
 * Email Validation Utility
 * Shared email validation for convex backend
 */

// Email regex pattern - improved to:
// - Require proper TLD (min 2 chars)
// - Allow only valid local part characters
// - Prevent consecutive dots and leading/trailing dots
const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}
