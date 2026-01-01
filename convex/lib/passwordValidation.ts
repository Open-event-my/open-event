/**
 * Password Validation Utility
 * Enforces strong password requirements for security
 */

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  strength: 'weak' | 'medium' | 'strong'
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
}

const SPECIAL_CHARS = '!@#$%^&*(),.?":{}|<>[]\\;\'`~_+=-'

/**
 * Validate password against security requirements
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []

  // Length check
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`At least ${PASSWORD_REQUIREMENTS.minLength} characters`)
  }

  // Uppercase check
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('At least 1 uppercase letter')
  }

  // Lowercase check
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('At least 1 lowercase letter')
  }

  // Number check
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    errors.push('At least 1 number')
  }

  // Special character check
  const specialCharRegex = new RegExp(
    `[${SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`
  )
  if (PASSWORD_REQUIREMENTS.requireSpecial && !specialCharRegex.test(password)) {
    errors.push('At least 1 special character (!@#$%^&* etc.)')
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong'
  if (errors.length === 0) {
    strength = 'strong'
  } else if (errors.length <= 2) {
    strength = 'medium'
  } else {
    strength = 'weak'
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * Check if password meets minimum requirements (for quick validation)
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).isValid
}

/**
 * Get password strength score (0-100)
 */
export function getPasswordStrengthScore(password: string): number {
  let score = 0

  // Length score (up to 30 points)
  score += Math.min(password.length * 2, 30)

  // Character variety (up to 40 points)
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^a-zA-Z0-9]/.test(password)) score += 10

  // Bonus for length beyond minimum (up to 30 points)
  if (password.length > PASSWORD_REQUIREMENTS.minLength) {
    score += Math.min((password.length - PASSWORD_REQUIREMENTS.minLength) * 3, 30)
  }

  return Math.min(score, 100)
}
