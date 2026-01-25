/**
 * General Input Validation
 *
 * Provides validation for common input types:
 * - Email addresses
 * - Phone numbers
 * - URLs
 * - String lengths
 * - Numeric bounds
 * - Dates and timestamps
 *
 * SECURITY: Prevents injection attacks and invalid data.
 */

import { AppError, ErrorCodes } from '../errors'

// ============================================================================
// STRING VALIDATION
// ============================================================================

/**
 * Validate string length within bounds
 *
 * @param value - String to validate
 * @param minLength - Minimum length (inclusive)
 * @param maxLength - Maximum length (inclusive)
 * @param fieldName - Name of field for error messages
 * @throws AppError if string length is invalid
 */
export function validateStringLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string = 'value'
): void {
  if (typeof value !== 'string') {
    throw new AppError(
      `${fieldName} must be a string`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (value.length < minLength) {
    throw new AppError(
      `${fieldName} must be at least ${minLength} characters (got: ${value.length})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (value.length > maxLength) {
    throw new AppError(
      `${fieldName} must be at most ${maxLength} characters (got: ${value.length})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Validate non-empty string
 *
 * @param value - String to validate
 * @param fieldName - Name of field for error messages
 * @throws AppError if string is empty or only whitespace
 */
export function validateNonEmptyString(
  value: string,
  fieldName: string = 'value'
): void {
  if (typeof value !== 'string') {
    throw new AppError(
      `${fieldName} must be a string`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (value.trim().length === 0) {
    throw new AppError(
      `${fieldName} cannot be empty`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Email regex (RFC 5322 simplified)
 * Not perfect but catches most invalid emails
 */
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/

/**
 * Validate email address format
 *
 * @param email - Email address to validate
 * @throws AppError if email is invalid
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new AppError('Email address is required', ErrorCodes.INVALID_INPUT, 400)
  }

  const trimmed = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmed)) {
    throw new AppError('Invalid email address format', ErrorCodes.INVALID_INPUT, 400)
  }

  // Additional length check (prevent excessively long emails)
  if (trimmed.length > 254) {
    // RFC 5321 max length
    throw new AppError(
      'Email address is too long (max 254 characters)',
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Check if email is valid without throwing
 *
 * @param email - Email address to check
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  try {
    validateEmail(email)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

/**
 * Basic phone number regex (international format)
 * Allows: +1234567890, +1 (234) 567-8900, etc.
 */
const PHONE_REGEX = /^\+?[\d\s\-()]{8,20}$/

/**
 * Validate phone number format
 *
 * @param phone - Phone number to validate
 * @throws AppError if phone number is invalid
 */
export function validatePhone(phone: string): void {
  if (!phone || typeof phone !== 'string') {
    throw new AppError('Phone number is required', ErrorCodes.INVALID_INPUT, 400)
  }

  const trimmed = phone.trim()

  if (!PHONE_REGEX.test(trimmed)) {
    throw new AppError(
      'Invalid phone number format (use international format: +1234567890)',
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Extract digits only
  const digitsOnly = trimmed.replace(/\D/g, '')

  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    throw new AppError(
      'Phone number must contain 8-15 digits',
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Check if phone number is valid without throwing
 *
 * @param phone - Phone number to check
 * @returns true if valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  try {
    validatePhone(phone)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @param allowedProtocols - Allowed protocols (default: http, https)
 * @throws AppError if URL is invalid
 */
export function validateURL(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:']
): void {
  if (!url || typeof url !== 'string') {
    throw new AppError('URL is required', ErrorCodes.INVALID_INPUT, 400)
  }

  let parsedURL: URL
  try {
    parsedURL = new URL(url)
  } catch {
    throw new AppError('Invalid URL format', ErrorCodes.INVALID_INPUT, 400)
  }

  if (!allowedProtocols.includes(parsedURL.protocol)) {
    throw new AppError(
      `URL protocol must be one of: ${allowedProtocols.join(', ')}`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Check if URL is valid without throwing
 *
 * @param url - URL to check
 * @returns true if valid, false otherwise
 */
export function isValidURL(url: string): boolean {
  try {
    validateURL(url)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// NUMERIC VALIDATION
// ============================================================================

/**
 * Validate number within range
 *
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param fieldName - Name of field for error messages
 * @throws AppError if number is out of range
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string = 'value'
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError(
      `${fieldName} must be a valid number`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (value < min || value > max) {
    throw new AppError(
      `${fieldName} must be between ${min} and ${max} (got: ${value})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Validate positive integer
 *
 * @param value - Number to validate
 * @param fieldName - Name of field for error messages
 * @throws AppError if not a positive integer
 */
export function validatePositiveInteger(
  value: number,
  fieldName: string = 'value'
): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    throw new AppError(
      `${fieldName} must be an integer`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (value <= 0) {
    throw new AppError(
      `${fieldName} must be positive (got: ${value})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Validate non-negative integer
 *
 * @param value - Number to validate
 * @param fieldName - Name of field for error messages
 * @throws AppError if not a non-negative integer
 */
export function validateNonNegativeInteger(
  value: number,
  fieldName: string = 'value'
): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    throw new AppError(
      `${fieldName} must be an integer`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (value < 0) {
    throw new AppError(
      `${fieldName} cannot be negative (got: ${value})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

// ============================================================================
// DATE/TIME VALIDATION
// ============================================================================

/**
 * Validate Unix timestamp
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param fieldName - Name of field for error messages
 * @throws AppError if timestamp is invalid
 */
export function validateTimestamp(
  timestamp: number,
  fieldName: string = 'timestamp'
): void {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    throw new AppError(
      `${fieldName} must be a valid number`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Must be positive
  if (timestamp <= 0) {
    throw new AppError(
      `${fieldName} must be positive`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Reasonable range check (between year 2000 and year 2100)
  const MIN_TIMESTAMP = new Date('2000-01-01').getTime()
  const MAX_TIMESTAMP = new Date('2100-01-01').getTime()

  if (timestamp < MIN_TIMESTAMP || timestamp > MAX_TIMESTAMP) {
    throw new AppError(
      `${fieldName} is outside reasonable range (2000-2100)`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Validate that end date is after start date
 *
 * @param startDate - Start timestamp
 * @param endDate - End timestamp
 * @throws AppError if dates are invalid or end before start
 */
export function validateDateRange(startDate: number, endDate: number): void {
  validateTimestamp(startDate, 'start date')
  validateTimestamp(endDate, 'end date')

  if (endDate <= startDate) {
    throw new AppError(
      'End date must be after start date',
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Validate that timestamp is in the future
 *
 * @param timestamp - Future timestamp
 * @param fieldName - Name of field for error messages
 * @throws AppError if timestamp is in the past
 */
export function validateFutureTimestamp(
  timestamp: number,
  fieldName: string = 'date'
): void {
  validateTimestamp(timestamp, fieldName)

  const now = Date.now()
  if (timestamp <= now) {
    throw new AppError(
      `${fieldName} must be in the future`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

// ============================================================================
// ARRAY VALIDATION
// ============================================================================

/**
 * Validate array length within bounds
 *
 * @param array - Array to validate
 * @param minLength - Minimum length (inclusive)
 * @param maxLength - Maximum length (inclusive)
 * @param fieldName - Name of field for error messages
 * @throws AppError if array length is invalid
 */
export function validateArrayLength(
  array: unknown[],
  minLength: number,
  maxLength: number,
  fieldName: string = 'array'
): void {
  if (!Array.isArray(array)) {
    throw new AppError(
      `${fieldName} must be an array`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (array.length < minLength) {
    throw new AppError(
      `${fieldName} must have at least ${minLength} items (got: ${array.length})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  if (array.length > maxLength) {
    throw new AppError(
      `${fieldName} must have at most ${maxLength} items (got: ${array.length})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

// ============================================================================
// ENUM VALIDATION
// ============================================================================

/**
 * Validate value against allowed set
 *
 * @param value - Value to validate
 * @param allowedValues - Set of allowed values
 * @param fieldName - Name of field for error messages
 * @throws AppError if value is not in allowed set
 */
export function validateEnum<T>(
  value: T,
  allowedValues: readonly T[],
  fieldName: string = 'value'
): void {
  if (!allowedValues.includes(value)) {
    throw new AppError(
      `${fieldName} must be one of: ${allowedValues.join(', ')} (got: ${value})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}
