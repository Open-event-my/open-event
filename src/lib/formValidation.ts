/**
 * Form Validation Utilities
 *
 * Provides a comprehensive form validation system with:
 * - Schema-based validation
 * - Clear error messages
 * - Field-level and form-level validation
 * - Support for async validation
 *
 * Validates: Requirements 11.9, 11.10
 */

import {
  isValidEmail,
  isValidUrl,
  isNotEmpty,
  isWithinLength,
  isNonNegative,
  isValidBudgetRange,
  isValidDateRange,
  validatePasswordStrength,
  validateEventTitle,
  validateEventDescription,
  validateBusinessName,
} from './validation'

/**
 * Validation rule types
 */
export type ValidationRule<T = unknown> = {
  validate: (value: T, formData?: Record<string, unknown>) => boolean
  message: string | ((value: T, fieldName: string) => string)
}

/**
 * Field validation schema
 */
export type FieldSchema<T = unknown> = {
  rules: ValidationRule<T>[]
  required?: boolean
  requiredMessage?: string
}

/**
 * Form validation schema - maps field names to their validation schemas
 */
export type FormSchema = Record<string, FieldSchema>

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validation result for the entire form
 */
export interface FormValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  firstError: string | null
  fieldErrors: Record<string, string>
}

/**
 * Common validation rules factory
 */
export const ValidationRules = {
  /**
   * Required field validation
   */
  required: (message?: string): ValidationRule<unknown> => ({
    validate: (value) => {
      if (value === null || value === undefined) return false
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return isNotEmpty(value)
      if (typeof value === 'number') return !isNaN(value)
      if (Array.isArray(value)) return value.length > 0
      return true
    },
    message: message || 'This field is required',
  }),

  /**
   * Email validation
   */
  email: (message?: string): ValidationRule<string> => ({
    validate: (value) => !value || isValidEmail(value),
    message: message || 'Please enter a valid email address',
  }),

  /**
   * URL validation
   */
  url: (message?: string): ValidationRule<string> => ({
    validate: (value) => !value || isValidUrl(value),
    message: message || 'Please enter a valid URL (starting with http:// or https://)',
  }),

  /**
   * Minimum length validation
   */
  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  /**
   * Maximum length validation
   */
  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || isWithinLength(value, max),
    message: message || `Must be ${max} characters or less`,
  }),

  /**
   * Minimum value validation for numbers
   */
  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value === null || value >= min,
    message: message || `Must be at least ${min}`,
  }),

  /**
   * Maximum value validation for numbers
   */
  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value === null || value <= max,
    message: message || `Must be ${max} or less`,
  }),

  /**
   * Non-negative number validation
   */
  nonNegative: (message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value === null || isNonNegative(value),
    message: message || 'Must be a non-negative number',
  }),

  /**
   * Pattern validation using regex
   */
  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => !value || regex.test(value),
    message,
  }),

  /**
   * Password strength validation
   */
  passwordStrength: (): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true
      const result = validatePasswordStrength(value)
      return result.isValid
    },
    message: (value) => {
      if (!value) return ''
      const result = validatePasswordStrength(value)
      return result.errors[0] || 'Password does not meet requirements'
    },
  }),

  /**
   * Event title validation
   */
  eventTitle: (): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true
      return validateEventTitle(value).valid
    },
    message: (value) => {
      if (!value) return ''
      const result = validateEventTitle(value)
      return result.message || 'Invalid event title'
    },
  }),

  /**
   * Event description validation
   */
  eventDescription: (): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true
      return validateEventDescription(value).valid
    },
    message: (value) => {
      if (!value) return ''
      const result = validateEventDescription(value)
      return result.message || 'Invalid event description'
    },
  }),

  /**
   * Business name validation
   */
  businessName: (): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true
      return validateBusinessName(value).valid
    },
    message: (value) => {
      if (!value) return ''
      const result = validateBusinessName(value)
      return result.message || 'Invalid business name'
    },
  }),

  /**
   * Date range validation (end date must be after start date)
   */
  dateAfter: (startDateField: string, message?: string): ValidationRule<number> => ({
    validate: (value, formData) => {
      if (!value || !formData) return true
      const startDate = formData[startDateField] as number | undefined
      if (!startDate) return true
      return isValidDateRange(startDate, value)
    },
    message: message || 'End date must be after start date',
  }),

  /**
   * Budget range validation (min must be <= max)
   */
  budgetRange: (minField: string, maxField: string, message?: string): ValidationRule<number> => ({
    validate: (_value, formData) => {
      if (!formData) return true
      const min = formData[minField] as number | undefined
      const max = formData[maxField] as number | undefined
      if (min === undefined || max === undefined) return true
      return isValidBudgetRange(min, max)
    },
    message: message || 'Minimum budget must be less than or equal to maximum budget',
  }),

  /**
   * Confirmation field validation (must match another field)
   */
  matches: (fieldToMatch: string, message?: string): ValidationRule<unknown> => ({
    validate: (value, formData) => {
      if (!formData) return true
      return value === formData[fieldToMatch]
    },
    message: message || 'Fields do not match',
  }),

  /**
   * Custom validation rule
   */
  custom: <T>(
    validateFn: (value: T, formData?: Record<string, unknown>) => boolean,
    message: string | ((value: T, fieldName: string) => string)
  ): ValidationRule<T> => ({
    validate: validateFn,
    message,
  }),
}

/**
 * Validate a single field against its schema
 */
export function validateField<T>(
  value: T,
  schema: FieldSchema<T>,
  fieldName: string,
  formData?: Record<string, unknown>
): FieldValidationResult {
  const errors: string[] = []

  // Check required first
  if (schema.required) {
    const requiredRule = ValidationRules.required(schema.requiredMessage)
    if (!requiredRule.validate(value)) {
      const message =
        typeof requiredRule.message === 'function'
          ? requiredRule.message(value as unknown, fieldName)
          : requiredRule.message
      errors.push(message)
      // Return early if required validation fails
      return { isValid: false, errors }
    }
  }

  // Skip other validations if value is empty and not required
  if (!schema.required && (value === null || value === undefined || value === '')) {
    return { isValid: true, errors: [] }
  }

  // Run all validation rules
  for (const rule of schema.rules) {
    if (!rule.validate(value, formData)) {
      const message =
        typeof rule.message === 'function' ? rule.message(value, fieldName) : rule.message
      errors.push(message)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validate an entire form against its schema
 */
export function validateForm(
  formData: Record<string, unknown>,
  schema: FormSchema
): FormValidationResult {
  const errors: Record<string, string[]> = {}
  const fieldErrors: Record<string, string> = {}
  let firstError: string | null = null

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const value = formData[fieldName]
    const result = validateField(value, fieldSchema, fieldName, formData)

    if (!result.isValid) {
      errors[fieldName] = result.errors
      fieldErrors[fieldName] = result.errors[0] || ''
      if (!firstError && result.errors.length > 0) {
        firstError = result.errors[0]
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    firstError,
    fieldErrors,
  }
}

/**
 * Create a form schema builder for type-safe schema creation
 */
export function createFormSchema<T extends Record<string, unknown>>(schema: {
  [K in keyof T]: FieldSchema<T[K]>
}): FormSchema {
  return schema as FormSchema
}

/**
 * Get a user-friendly field label from a field name
 */
export function getFieldLabel(fieldName: string): string {
  // Convert camelCase to Title Case with spaces
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string[]>): string[] {
  const formattedErrors: string[] = []

  for (const [fieldName, fieldErrors] of Object.entries(errors)) {
    const label = getFieldLabel(fieldName)
    for (const error of fieldErrors) {
      // If error already contains field context, use as-is
      if (error.toLowerCase().includes(fieldName.toLowerCase())) {
        formattedErrors.push(error)
      } else {
        formattedErrors.push(`${label}: ${error}`)
      }
    }
  }

  return formattedErrors
}

/**
 * Check if a form has any validation errors
 */
export function hasValidationErrors(errors: Record<string, string[]>): boolean {
  return Object.values(errors).some((fieldErrors) => fieldErrors.length > 0)
}

/**
 * Clear errors for a specific field
 */
export function clearFieldError(
  errors: Record<string, string[]>,
  fieldName: string
): Record<string, string[]> {
  const newErrors = { ...errors }
  delete newErrors[fieldName]
  return newErrors
}
