import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidUrl,
  isWithinLength,
  isNotEmpty,
  isNonNegative,
  isValidBudgetRange,
  isValidEventDate,
  isValidDateRange,
  isValidPassword,
  validatePasswordStrength,
  PASSWORD_REQUIREMENTS,
  validateEventTitle,
  validateEventDescription,
  validateBusinessName,
  isValidStatusTransition,
  VALID_STATUS_TRANSITIONS,
  isAdminRole,
  hasRolePrivilege,
  ROLE_HIERARCHY,
} from './validation'

describe('Email Validation', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.org')).toBe(true)
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('spaces in@email.com')).toBe(false)
  })
})

describe('URL Validation', () => {
  it('should accept valid URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://localhost:3000')).toBe(true)
    expect(isValidUrl('https://sub.domain.com/path')).toBe(true)
  })

  it('should reject invalid URLs', () => {
    expect(isValidUrl('')).toBe(false)
    expect(isValidUrl('example.com')).toBe(false)
    expect(isValidUrl('ftp://files.com')).toBe(false)
    expect(isValidUrl('not a url')).toBe(false)
  })
})

describe('String Length Validation', () => {
  it('should validate within length limits', () => {
    expect(isWithinLength('hello', 10)).toBe(true)
    expect(isWithinLength('hello', 5)).toBe(true)
    expect(isWithinLength('', 10)).toBe(true)
  })

  it('should reject strings exceeding length', () => {
    expect(isWithinLength('hello', 4)).toBe(false)
    expect(isWithinLength('hello world', 5)).toBe(false)
  })
})

describe('Empty String Validation', () => {
  it('should detect non-empty strings', () => {
    expect(isNotEmpty('hello')).toBe(true)
    expect(isNotEmpty('  hello  ')).toBe(true)
    expect(isNotEmpty('a')).toBe(true)
  })

  it('should detect empty strings', () => {
    expect(isNotEmpty('')).toBe(false)
    expect(isNotEmpty('   ')).toBe(false)
    expect(isNotEmpty('\t\n')).toBe(false)
  })
})

describe('Number Validation', () => {
  it('should validate non-negative numbers', () => {
    expect(isNonNegative(0)).toBe(true)
    expect(isNonNegative(100)).toBe(true)
    expect(isNonNegative(0.5)).toBe(true)
  })

  it('should reject negative numbers', () => {
    expect(isNonNegative(-1)).toBe(false)
    expect(isNonNegative(-0.001)).toBe(false)
    expect(isNonNegative(-1000)).toBe(false)
  })
})

describe('Budget Range Validation', () => {
  it('should accept valid budget ranges', () => {
    expect(isValidBudgetRange(0, 1000)).toBe(true)
    expect(isValidBudgetRange(500, 500)).toBe(true) // Equal is valid
    expect(isValidBudgetRange(1000, 5000)).toBe(true)
  })

  it('should reject invalid budget ranges', () => {
    expect(isValidBudgetRange(1000, 500)).toBe(false) // Min > Max
    expect(isValidBudgetRange(100, 50)).toBe(false)
  })
})

describe('Date Validation', () => {
  it('should accept dates within valid range', () => {
    const now = Date.now()
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000

    expect(isValidEventDate(now)).toBe(true)
    expect(isValidEventDate(oneMonthAgo)).toBe(true)
    expect(isValidEventDate(nextWeek)).toBe(true)
  })

  it('should reject dates too far in the past', () => {
    const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
    expect(isValidEventDate(twoYearsAgo)).toBe(false)
  })

  it('should validate date ranges', () => {
    const start = Date.now()
    const end = start + 24 * 60 * 60 * 1000 // 1 day later

    expect(isValidDateRange(start, end)).toBe(true)
    expect(isValidDateRange(start, start)).toBe(true) // Same time is valid
    expect(isValidDateRange(end, start)).toBe(false) // End before start
  })
})

describe('Password Validation (Legacy)', () => {
  it('should accept valid passwords', () => {
    expect(isValidPassword('password123').valid).toBe(true)
    expect(isValidPassword('12345678').valid).toBe(true)
    expect(isValidPassword('abcdefgh').valid).toBe(true)
  })

  it('should reject short passwords', () => {
    const result = isValidPassword('short')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('8 characters')
  })

  it('should reject empty passwords', () => {
    expect(isValidPassword('').valid).toBe(false)
    expect(isValidPassword('1234567').valid).toBe(false)
  })
})

describe('Password Strength Validation', () => {
  it('should have correct requirements defined', () => {
    expect(PASSWORD_REQUIREMENTS.minLength).toBe(12)
    expect(PASSWORD_REQUIREMENTS.requireUppercase).toBe(true)
    expect(PASSWORD_REQUIREMENTS.requireLowercase).toBe(true)
    expect(PASSWORD_REQUIREMENTS.requireNumber).toBe(true)
    expect(PASSWORD_REQUIREMENTS.requireSpecial).toBe(true)
  })

  it('should accept strong passwords', () => {
    const result = validatePasswordStrength('MyP@ssword123!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.strength).toBe('strong')
  })

  it('should reject passwords shorter than 12 characters', () => {
    const result = validatePasswordStrength('Short1!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('At least 12 characters')
  })

  it('should reject passwords without uppercase', () => {
    const result = validatePasswordStrength('mypassword123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('At least 1 uppercase letter')
  })

  it('should reject passwords without lowercase', () => {
    const result = validatePasswordStrength('MYPASSWORD123!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('At least 1 lowercase letter')
  })

  it('should reject passwords without numbers', () => {
    const result = validatePasswordStrength('MyPasswordHere!')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('At least 1 number')
  })

  it('should reject passwords without special characters', () => {
    const result = validatePasswordStrength('MyPassword1234')
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('At least 1 special character')
  })

  it('should return weak strength for many errors', () => {
    const result = validatePasswordStrength('short')
    expect(result.strength).toBe('weak')
    expect(result.errors.length).toBeGreaterThan(2)
  })

  it('should return medium strength for few errors', () => {
    const result = validatePasswordStrength('MyPassword12')
    expect(result.strength).toBe('medium')
    expect(result.errors.length).toBeLessThanOrEqual(2)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('Event Title Validation', () => {
  it('should accept valid titles', () => {
    expect(validateEventTitle('Tech Conference 2025').valid).toBe(true)
    expect(validateEventTitle('A').valid).toBe(true)
    expect(validateEventTitle('a'.repeat(200)).valid).toBe(true)
  })

  it('should reject empty titles', () => {
    const result = validateEventTitle('')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('empty')
  })

  it('should reject whitespace-only titles', () => {
    expect(validateEventTitle('   ').valid).toBe(false)
    expect(validateEventTitle('\t\n').valid).toBe(false)
  })

  it('should reject titles exceeding 200 characters', () => {
    const result = validateEventTitle('a'.repeat(201))
    expect(result.valid).toBe(false)
    expect(result.message).toContain('200 characters')
  })
})

describe('Event Description Validation', () => {
  it('should accept valid descriptions', () => {
    expect(validateEventDescription('A great event').valid).toBe(true)
    expect(validateEventDescription('').valid).toBe(true) // Empty is allowed
    expect(validateEventDescription('a'.repeat(10000)).valid).toBe(true)
  })

  it('should reject descriptions exceeding 10000 characters', () => {
    const result = validateEventDescription('a'.repeat(10001))
    expect(result.valid).toBe(false)
    expect(result.message).toContain('10000 characters')
  })
})

describe('Business Name Validation', () => {
  it('should accept valid business names', () => {
    expect(validateBusinessName('Acme Corp').valid).toBe(true)
    expect(validateBusinessName('A').valid).toBe(true)
    expect(validateBusinessName('a'.repeat(200)).valid).toBe(true)
  })

  it('should reject empty names', () => {
    expect(validateBusinessName('').valid).toBe(false)
    expect(validateBusinessName('   ').valid).toBe(false)
  })

  it('should reject names exceeding 200 characters', () => {
    expect(validateBusinessName('a'.repeat(201)).valid).toBe(false)
  })
})

describe('Event Status Transitions', () => {
  describe('from draft', () => {
    it('should allow transitioning to planning', () => {
      expect(isValidStatusTransition('draft', 'planning')).toBe(true)
    })

    it('should allow transitioning to cancelled', () => {
      expect(isValidStatusTransition('draft', 'cancelled')).toBe(true)
    })

    it('should not allow transitioning directly to active', () => {
      expect(isValidStatusTransition('draft', 'active')).toBe(false)
    })

    it('should not allow transitioning directly to completed', () => {
      expect(isValidStatusTransition('draft', 'completed')).toBe(false)
    })
  })

  describe('from planning', () => {
    it('should allow transitioning to active', () => {
      expect(isValidStatusTransition('planning', 'active')).toBe(true)
    })

    it('should allow transitioning back to draft', () => {
      expect(isValidStatusTransition('planning', 'draft')).toBe(true)
    })

    it('should allow transitioning to cancelled', () => {
      expect(isValidStatusTransition('planning', 'cancelled')).toBe(true)
    })

    it('should not allow transitioning directly to completed', () => {
      expect(isValidStatusTransition('planning', 'completed')).toBe(false)
    })
  })

  describe('from active', () => {
    it('should allow transitioning to completed', () => {
      expect(isValidStatusTransition('active', 'completed')).toBe(true)
    })

    it('should allow transitioning to cancelled', () => {
      expect(isValidStatusTransition('active', 'cancelled')).toBe(true)
    })

    it('should not allow transitioning back to draft', () => {
      expect(isValidStatusTransition('active', 'draft')).toBe(false)
    })

    it('should not allow transitioning back to planning', () => {
      expect(isValidStatusTransition('active', 'planning')).toBe(false)
    })
  })

  describe('from completed', () => {
    it('should not allow any transitions (terminal state)', () => {
      expect(isValidStatusTransition('completed', 'draft')).toBe(false)
      expect(isValidStatusTransition('completed', 'planning')).toBe(false)
      expect(isValidStatusTransition('completed', 'active')).toBe(false)
      expect(isValidStatusTransition('completed', 'cancelled')).toBe(false)
    })
  })

  describe('from cancelled', () => {
    it('should allow transitioning back to draft', () => {
      expect(isValidStatusTransition('cancelled', 'draft')).toBe(true)
    })

    it('should not allow transitioning to other states', () => {
      expect(isValidStatusTransition('cancelled', 'planning')).toBe(false)
      expect(isValidStatusTransition('cancelled', 'active')).toBe(false)
      expect(isValidStatusTransition('cancelled', 'completed')).toBe(false)
    })
  })

  describe('invalid states', () => {
    it('should return false for unknown states', () => {
      expect(isValidStatusTransition('unknown', 'draft')).toBe(false)
      expect(isValidStatusTransition('draft', 'unknown')).toBe(false)
    })
  })

  it('should have all statuses defined in VALID_STATUS_TRANSITIONS', () => {
    const expectedStatuses = ['draft', 'planning', 'active', 'completed', 'cancelled']
    expect(Object.keys(VALID_STATUS_TRANSITIONS).sort()).toEqual(expectedStatuses.sort())
  })
})

describe('Role Validation', () => {
  describe('isAdminRole', () => {
    it('should return true for admin', () => {
      expect(isAdminRole('admin')).toBe(true)
    })

    it('should return true for superadmin', () => {
      expect(isAdminRole('superadmin')).toBe(true)
    })

    it('should return false for organizer', () => {
      expect(isAdminRole('organizer')).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isAdminRole(undefined)).toBe(false)
    })

    it('should return false for unknown roles', () => {
      expect(isAdminRole('user')).toBe(false)
      expect(isAdminRole('guest')).toBe(false)
    })
  })

  describe('hasRolePrivilege', () => {
    it('should allow superadmin access to all roles', () => {
      expect(hasRolePrivilege('superadmin', 'organizer')).toBe(true)
      expect(hasRolePrivilege('superadmin', 'admin')).toBe(true)
      expect(hasRolePrivilege('superadmin', 'superadmin')).toBe(true)
    })

    it('should allow admin access to organizer and admin', () => {
      expect(hasRolePrivilege('admin', 'organizer')).toBe(true)
      expect(hasRolePrivilege('admin', 'admin')).toBe(true)
      expect(hasRolePrivilege('admin', 'superadmin')).toBe(false)
    })

    it('should allow organizer access to organizer only', () => {
      expect(hasRolePrivilege('organizer', 'organizer')).toBe(true)
      expect(hasRolePrivilege('organizer', 'admin')).toBe(false)
      expect(hasRolePrivilege('organizer', 'superadmin')).toBe(false)
    })

    it('should default undefined to organizer', () => {
      expect(hasRolePrivilege(undefined, 'organizer')).toBe(true)
      expect(hasRolePrivilege(undefined, 'admin')).toBe(false)
    })
  })

  it('should have correct role hierarchy values', () => {
    expect(ROLE_HIERARCHY.superadmin).toBe(3)
    expect(ROLE_HIERARCHY.admin).toBe(2)
    expect(ROLE_HIERARCHY.organizer).toBe(1)
    expect(ROLE_HIERARCHY.superadmin).toBeGreaterThan(ROLE_HIERARCHY.admin)
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.organizer)
  })
})
