/**
 * Currency and Monetary Validation
 *
 * Provides strict validation for:
 * - ISO 4217 currency codes
 * - Monetary amounts with bounds checking
 * - Price formatting and conversion
 *
 * SECURITY: Prevents invalid currency injection and overflow attacks.
 */

import { AppError, ErrorCodes } from '../errors'

// ============================================================================
// CURRENCY CODE VALIDATION
// ============================================================================

/**
 * ISO 4217 currency codes (subset of most commonly used currencies)
 * Add more as needed for international expansion
 */
const VALID_CURRENCIES = new Set([
  // Major currencies
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'JPY', // Japanese Yen
  'CNY', // Chinese Yuan
  'CHF', // Swiss Franc
  'CAD', // Canadian Dollar
  'AUD', // Australian Dollar
  'NZD', // New Zealand Dollar

  // Asian currencies
  'MYR', // Malaysian Ringgit
  'SGD', // Singapore Dollar
  'HKD', // Hong Kong Dollar
  'THB', // Thai Baht
  'IDR', // Indonesian Rupiah
  'PHP', // Philippine Peso
  'VND', // Vietnamese Dong
  'INR', // Indian Rupee
  'KRW', // South Korean Won
  'TWD', // Taiwan Dollar

  // Other important currencies
  'BRL', // Brazilian Real
  'MXN', // Mexican Peso
  'ZAR', // South African Rand
  'RUB', // Russian Ruble (check sanctions)
  'TRY', // Turkish Lira
  'SAR', // Saudi Riyal
  'AED', // UAE Dirham
  'SEK', // Swedish Krona
  'NOK', // Norwegian Krone
  'DKK', // Danish Krone
  'PLN', // Polish Zloty
])

/**
 * Validate currency code against ISO 4217 whitelist
 *
 * @param currency - Currency code to validate (e.g., "USD", "MYR")
 * @throws AppError if currency is invalid
 *
 * @example
 * validateCurrency('USD') // OK
 * validateCurrency('XYZ') // Throws AppError
 * validateCurrency('usd') // Throws AppError (must be uppercase)
 */
export function validateCurrency(currency: string): void {
  if (!currency || typeof currency !== 'string') {
    throw new AppError(
      'Currency code is required',
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Must be uppercase
  if (currency !== currency.toUpperCase()) {
    throw new AppError(
      `Currency code must be uppercase (got: ${currency})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Must be exactly 3 characters
  if (currency.length !== 3) {
    throw new AppError(
      `Currency code must be exactly 3 characters (got: ${currency})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Must be in whitelist
  if (!VALID_CURRENCIES.has(currency)) {
    throw new AppError(
      `Unsupported currency code: ${currency}. Supported currencies: ${Array.from(
        VALID_CURRENCIES
      ).join(', ')}`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Check if a currency code is valid without throwing
 *
 * @param currency - Currency code to check
 * @returns true if valid, false otherwise
 */
export function isValidCurrency(currency: string): boolean {
  try {
    validateCurrency(currency)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// MONETARY AMOUNT VALIDATION
// ============================================================================

/**
 * Maximum monetary amount allowed (in cents)
 * $100 million = 10,000,000,000 cents
 * Prevents overflow attacks and unrealistic amounts
 */
const MAX_AMOUNT_CENTS = 10_000_000_000

/**
 * Minimum monetary amount allowed (in cents)
 * Negative amounts not allowed for prices/budgets
 */
const MIN_AMOUNT_CENTS = 0

/**
 * Validate monetary amount with bounds checking
 *
 * @param amount - Amount in cents (e.g., 1000 = $10.00)
 * @param currency - Currency code
 * @param context - Context for error message (e.g., "budget", "ticket price")
 * @throws AppError if amount is invalid
 *
 * @example
 * validateMonetaryAmount(1000, 'USD', 'ticket price') // OK - $10.00
 * validateMonetaryAmount(-100, 'USD', 'budget') // Throws AppError
 * validateMonetaryAmount(999999999999, 'USD', 'budget') // Throws AppError
 */
export function validateMonetaryAmount(
  amount: number,
  currency: string,
  context: string = 'amount'
): void {
  // Validate currency first
  validateCurrency(currency)

  // Must be a number
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new AppError(
      `${context} must be a valid number`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Must be an integer (cents, not dollars with decimals)
  if (!Number.isInteger(amount)) {
    throw new AppError(
      `${context} must be an integer (cents). Use Math.round() to convert.`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Must be non-negative
  if (amount < MIN_AMOUNT_CENTS) {
    throw new AppError(
      `${context} cannot be negative (got: ${amount})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }

  // Must not exceed maximum
  if (amount > MAX_AMOUNT_CENTS) {
    const maxDollars = (MAX_AMOUNT_CENTS / 100).toLocaleString()
    throw new AppError(
      `${context} exceeds maximum allowed ($${maxDollars})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Check if a monetary amount is valid without throwing
 *
 * @param amount - Amount in cents
 * @param currency - Currency code
 * @returns true if valid, false otherwise
 */
export function isValidMonetaryAmount(
  amount: number,
  currency: string
): boolean {
  try {
    validateMonetaryAmount(amount, currency)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// CURRENCY CONVERSION & FORMATTING
// ============================================================================

/**
 * Convert dollars to cents (safe rounding)
 *
 * @param dollars - Amount in dollars (e.g., 10.99)
 * @returns Amount in cents (e.g., 1099)
 *
 * @example
 * dollarsToCents(10.99) // 1099
 * dollarsToCents(10.999) // 1100 (rounds up)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Convert cents to dollars
 *
 * @param cents - Amount in cents (e.g., 1099)
 * @returns Amount in dollars (e.g., 10.99)
 *
 * @example
 * centsToDollars(1099) // 10.99
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

/**
 * Format monetary amount for display
 *
 * @param cents - Amount in cents
 * @param currency - Currency code
 * @param locale - Locale for formatting (default: en-US)
 * @returns Formatted string (e.g., "$10.99")
 *
 * @example
 * formatMoney(1099, 'USD') // "$10.99"
 * formatMoney(1099, 'EUR', 'de-DE') // "10,99 €"
 */
export function formatMoney(
  cents: number,
  currency: string,
  locale: string = 'en-US'
): string {
  const dollars = centsToDollars(cents)

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(dollars)
}

/**
 * Get currency symbol for a currency code
 *
 * @param currency - Currency code
 * @returns Currency symbol (e.g., "$", "€")
 */
export function getCurrencySymbol(currency: string): string {
  // Use Intl.NumberFormat to get the currency symbol
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(0)

  // Extract symbol (remove numbers and whitespace)
  return formatted.replace(/[\d\s,.]/g, '')
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate price range (min/max budget)
 *
 * @param minAmount - Minimum amount in cents
 * @param maxAmount - Maximum amount in cents
 * @param currency - Currency code
 * @throws AppError if range is invalid
 */
export function validatePriceRange(
  minAmount: number,
  maxAmount: number,
  currency: string
): void {
  validateMonetaryAmount(minAmount, currency, 'minimum amount')
  validateMonetaryAmount(maxAmount, currency, 'maximum amount')

  if (minAmount > maxAmount) {
    throw new AppError(
      `Minimum amount (${formatMoney(minAmount, currency)}) cannot exceed maximum amount (${formatMoney(maxAmount, currency)})`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}

/**
 * Validate discount amount/percentage
 *
 * @param discountType - 'percentage' or 'fixed'
 * @param discountValue - Discount value (0-100 for percentage, cents for fixed)
 * @param currency - Currency code (for fixed discounts)
 * @throws AppError if discount is invalid
 */
export function validateDiscount(
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  currency?: string
): void {
  if (discountType === 'percentage') {
    if (discountValue < 0 || discountValue > 100) {
      throw new AppError(
        `Discount percentage must be between 0 and 100 (got: ${discountValue})`,
        ErrorCodes.INVALID_INPUT,
        400
      )
    }
  } else if (discountType === 'fixed') {
    if (!currency) {
      throw new AppError(
        'Currency required for fixed discount',
        ErrorCodes.INVALID_INPUT,
        400
      )
    }
    validateMonetaryAmount(discountValue, currency, 'discount amount')
  } else {
    throw new AppError(
      `Invalid discount type: ${discountType}`,
      ErrorCodes.INVALID_INPUT,
      400
    )
  }
}
