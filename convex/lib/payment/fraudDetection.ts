/**
 * Fraud Detection Service
 *
 * Comprehensive fraud detection for payment operations:
 * - Multiple fraud detection rules
 * - Risk scoring system
 * - Alert integration for suspicious payments
 * - Velocity checks
 * - Pattern detection
 *
 * Requirements: 12.9
 * Property 49: Fraud Detection Alerts
 */

import { logger } from '../monitoring/logger'
import { alertManager, type AlertSeverity } from '../monitoring/alerts'

// ============================================================================
// Types
// ============================================================================

/**
 * Input for fraud detection check
 */
export interface FraudDetectionInput {
  /** Payment amount in smallest currency unit (cents) */
  amount: number
  /** Currency code (e.g., 'usd') */
  currency: string
  /** Buyer's email address */
  buyerEmail: string
  /** Buyer's IP address */
  ipAddress?: string
  /** Number of previous orders by this buyer */
  previousOrderCount?: number
  /** Total amount spent by this buyer previously */
  previousTotalSpent?: number
  /** Time since last order in milliseconds */
  timeSinceLastOrder?: number
  /** Order ID for reference */
  orderId?: string
  /** Order number for reference */
  orderNumber?: string
  /** Event ID being purchased */
  eventId?: string
  /** User ID if authenticated */
  userId?: string
  /** Country code from IP geolocation */
  countryCode?: string
  /** Number of failed payment attempts in last hour */
  failedAttemptsLastHour?: number
  /** Card country (if available from Stripe) */
  cardCountry?: string
}

/**
 * Individual fraud rule result
 */
export interface FraudRuleResult {
  /** Rule identifier */
  ruleId: string
  /** Rule name */
  ruleName: string
  /** Whether the rule was triggered */
  triggered: boolean
  /** Risk score contribution (0-100) */
  riskScore: number
  /** Human-readable reason */
  reason: string
  /** Additional details */
  details?: Record<string, unknown>
}

/**
 * Complete fraud detection result
 */
export interface FraudDetectionResult {
  /** Whether the transaction is considered suspicious */
  isSuspicious: boolean
  /** Overall risk score (0-100) */
  riskScore: number
  /** Risk level classification */
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  /** List of triggered rules with reasons */
  triggeredRules: FraudRuleResult[]
  /** All reasons combined */
  reasons: string[]
  /** Whether an alert should be sent */
  shouldAlert: boolean
  /** Whether the transaction should be blocked */
  shouldBlock: boolean
  /** Recommended action */
  recommendedAction: 'allow' | 'review' | 'block'
  /** Alert ID if an alert was sent */
  alertId?: string
}

/**
 * Fraud rule definition
 */
export interface FraudRule {
  id: string
  name: string
  description: string
  riskScore: number
  check: (input: FraudDetectionInput) => FraudRuleResult
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Fraud detection thresholds
 */
export const FRAUD_THRESHOLDS = {
  /** Amount threshold for large transaction (in cents) - $5,000 */
  largeTransactionAmount: 500000,
  /** Amount threshold for very large transaction (in cents) - $10,000 */
  veryLargeTransactionAmount: 1000000,
  /** Amount threshold for first-time buyer concern (in cents) - $1,000 */
  firstTimeBuyerLargeAmount: 100000,
  /** Time threshold for velocity check (milliseconds) - 1 minute */
  velocityTimeThreshold: 60000,
  /** Time threshold for rapid orders (milliseconds) - 5 minutes */
  rapidOrderTimeThreshold: 300000,
  /** Multiplier for unusual spending pattern */
  unusualSpendingMultiplier: 5,
  /** Failed attempts threshold */
  failedAttemptsThreshold: 3,
  /** Risk score threshold for suspicious */
  suspiciousThreshold: 50,
  /** Risk score threshold for alert */
  alertThreshold: 70,
  /** Risk score threshold for blocking */
  blockThreshold: 90,
}

/**
 * Suspicious email patterns
 */
const SUSPICIOUS_EMAIL_PATTERNS = [
  /\+.*@/, // Plus addressing (e.g., user+spam@example.com)
  /^[a-z]{1,2}\d+@/i, // Short prefix with numbers (e.g., a123@example.com)
  /@(tempmail|guerrillamail|10minutemail|throwaway|mailinator|yopmail|fakeinbox|trashmail)/i,
  /^test\d*@/i, // Test accounts
  /^(admin|root|info|support|noreply)@/i, // Generic accounts
]

/**
 * High-risk countries (for additional scrutiny, not blocking)
 */
const HIGH_RISK_COUNTRIES = ['NG', 'GH', 'PK', 'BD', 'VN', 'PH', 'ID', 'IN', 'BR', 'MX']

// ============================================================================
// Fraud Rules
// ============================================================================

/**
 * Rule 1: Large Transaction Amount
 */
const largeTransactionRule: FraudRule = {
  id: 'LARGE_TRANSACTION',
  name: 'Large Transaction Amount',
  description: 'Flags transactions over $5,000',
  riskScore: 30,
  check: (input) => {
    const triggered = input.amount > FRAUD_THRESHOLDS.largeTransactionAmount
    const isVeryLarge = input.amount > FRAUD_THRESHOLDS.veryLargeTransactionAmount

    return {
      ruleId: 'LARGE_TRANSACTION',
      ruleName: 'Large Transaction Amount',
      triggered,
      riskScore: triggered ? (isVeryLarge ? 45 : 30) : 0,
      reason: triggered ? `Large transaction amount: $${(input.amount / 100).toFixed(2)}` : '',
      details: { amount: input.amount, threshold: FRAUD_THRESHOLDS.largeTransactionAmount },
    }
  },
}

/**
 * Rule 2: Velocity Check (Multiple orders in short time)
 */
const velocityRule: FraudRule = {
  id: 'VELOCITY_CHECK',
  name: 'Velocity Check',
  description: 'Flags multiple orders within 1 minute',
  riskScore: 40,
  check: (input) => {
    const triggered =
      input.timeSinceLastOrder !== undefined &&
      input.timeSinceLastOrder < FRAUD_THRESHOLDS.velocityTimeThreshold
    const isVeryRapid = input.timeSinceLastOrder !== undefined && input.timeSinceLastOrder < 30000 // Under 30 seconds

    return {
      ruleId: 'VELOCITY_CHECK',
      ruleName: 'Velocity Check',
      triggered,
      riskScore: triggered ? (isVeryRapid ? 50 : 40) : 0,
      reason: triggered
        ? `Multiple orders within ${Math.round((input.timeSinceLastOrder || 0) / 1000)} seconds`
        : '',
      details: {
        timeSinceLastOrder: input.timeSinceLastOrder,
        threshold: FRAUD_THRESHOLDS.velocityTimeThreshold,
      },
    }
  },
}

/**
 * Rule 3: First-time Buyer with Large Purchase
 */
const firstTimeBuyerRule: FraudRule = {
  id: 'FIRST_TIME_LARGE',
  name: 'First-time Buyer Large Purchase',
  description: 'Flags first-time buyers with purchases over $1,000',
  riskScore: 25,
  check: (input) => {
    const isFirstTime = input.previousOrderCount !== undefined && input.previousOrderCount === 0
    const isLarge = input.amount > FRAUD_THRESHOLDS.firstTimeBuyerLargeAmount
    const triggered = isFirstTime && isLarge

    return {
      ruleId: 'FIRST_TIME_LARGE',
      ruleName: 'First-time Buyer Large Purchase',
      triggered,
      riskScore: triggered ? 25 : 0,
      reason: triggered
        ? `First-time buyer with large purchase: $${(input.amount / 100).toFixed(2)}`
        : '',
      details: {
        previousOrderCount: input.previousOrderCount,
        amount: input.amount,
        threshold: FRAUD_THRESHOLDS.firstTimeBuyerLargeAmount,
      },
    }
  },
}

/**
 * Rule 4: Suspicious Email Pattern
 */
const suspiciousEmailRule: FraudRule = {
  id: 'SUSPICIOUS_EMAIL',
  name: 'Suspicious Email Pattern',
  description: 'Flags emails matching suspicious patterns',
  riskScore: 20,
  check: (input) => {
    const triggered = SUSPICIOUS_EMAIL_PATTERNS.some((pattern) => pattern.test(input.buyerEmail))

    return {
      ruleId: 'SUSPICIOUS_EMAIL',
      ruleName: 'Suspicious Email Pattern',
      triggered,
      riskScore: triggered ? 20 : 0,
      reason: triggered ? 'Suspicious email pattern detected' : '',
      details: { emailDomain: input.buyerEmail.split('@')[1] },
    }
  },
}

/**
 * Rule 5: Unusual Spending Pattern
 */
const unusualSpendingRule: FraudRule = {
  id: 'UNUSUAL_SPENDING',
  name: 'Unusual Spending Pattern',
  description: 'Flags orders significantly larger than average',
  riskScore: 15,
  check: (input) => {
    if (
      input.previousTotalSpent === undefined ||
      input.previousOrderCount === undefined ||
      input.previousOrderCount === 0
    ) {
      return {
        ruleId: 'UNUSUAL_SPENDING',
        ruleName: 'Unusual Spending Pattern',
        triggered: false,
        riskScore: 0,
        reason: '',
      }
    }

    const avgPreviousOrder = input.previousTotalSpent / input.previousOrderCount
    const triggered = input.amount > avgPreviousOrder * FRAUD_THRESHOLDS.unusualSpendingMultiplier

    return {
      ruleId: 'UNUSUAL_SPENDING',
      ruleName: 'Unusual Spending Pattern',
      triggered,
      riskScore: triggered ? 15 : 0,
      reason: triggered
        ? `Order ${(input.amount / avgPreviousOrder).toFixed(1)}x larger than average`
        : '',
      details: {
        currentAmount: input.amount,
        averageAmount: avgPreviousOrder,
        multiplier: input.amount / avgPreviousOrder,
      },
    }
  },
}

/**
 * Rule 6: Multiple Failed Attempts
 */
const failedAttemptsRule: FraudRule = {
  id: 'FAILED_ATTEMPTS',
  name: 'Multiple Failed Attempts',
  description: 'Flags accounts with multiple failed payment attempts',
  riskScore: 35,
  check: (input) => {
    const triggered =
      input.failedAttemptsLastHour !== undefined &&
      input.failedAttemptsLastHour >= FRAUD_THRESHOLDS.failedAttemptsThreshold

    return {
      ruleId: 'FAILED_ATTEMPTS',
      ruleName: 'Multiple Failed Attempts',
      triggered,
      riskScore: triggered ? 35 : 0,
      reason: triggered
        ? `${input.failedAttemptsLastHour} failed payment attempts in last hour`
        : '',
      details: {
        failedAttempts: input.failedAttemptsLastHour,
        threshold: FRAUD_THRESHOLDS.failedAttemptsThreshold,
      },
    }
  },
}

/**
 * Rule 7: High-Risk Country
 */
const highRiskCountryRule: FraudRule = {
  id: 'HIGH_RISK_COUNTRY',
  name: 'High-Risk Country',
  description: 'Flags transactions from high-risk countries',
  riskScore: 15,
  check: (input) => {
    const triggered =
      input.countryCode !== undefined &&
      HIGH_RISK_COUNTRIES.includes(input.countryCode.toUpperCase())

    return {
      ruleId: 'HIGH_RISK_COUNTRY',
      ruleName: 'High-Risk Country',
      triggered,
      riskScore: triggered ? 15 : 0,
      reason: triggered ? `Transaction from high-risk country: ${input.countryCode}` : '',
      details: { countryCode: input.countryCode },
    }
  },
}

/**
 * Rule 8: Card Country Mismatch
 */
const cardCountryMismatchRule: FraudRule = {
  id: 'CARD_COUNTRY_MISMATCH',
  name: 'Card Country Mismatch',
  description: 'Flags when card country differs from IP country',
  riskScore: 25,
  check: (input) => {
    if (!input.cardCountry || !input.countryCode) {
      return {
        ruleId: 'CARD_COUNTRY_MISMATCH',
        ruleName: 'Card Country Mismatch',
        triggered: false,
        riskScore: 0,
        reason: '',
      }
    }

    const triggered = input.cardCountry.toUpperCase() !== input.countryCode.toUpperCase()

    return {
      ruleId: 'CARD_COUNTRY_MISMATCH',
      ruleName: 'Card Country Mismatch',
      triggered,
      riskScore: triggered ? 25 : 0,
      reason: triggered
        ? `Card country (${input.cardCountry}) differs from IP country (${input.countryCode})`
        : '',
      details: { cardCountry: input.cardCountry, ipCountry: input.countryCode },
    }
  },
}

/**
 * All fraud detection rules
 */
const FRAUD_RULES: FraudRule[] = [
  largeTransactionRule,
  velocityRule,
  firstTimeBuyerRule,
  suspiciousEmailRule,
  unusualSpendingRule,
  failedAttemptsRule,
  highRiskCountryRule,
  cardCountryMismatchRule,
]

// ============================================================================
// Fraud Detection Service
// ============================================================================

/**
 * Determine risk level from score
 */
export function getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 90) return 'critical'
  if (riskScore >= 70) return 'high'
  if (riskScore >= 50) return 'medium'
  return 'low'
}

/**
 * Determine recommended action from risk score
 */
export function getRecommendedAction(riskScore: number): 'allow' | 'review' | 'block' {
  if (riskScore >= FRAUD_THRESHOLDS.blockThreshold) return 'block'
  if (riskScore >= FRAUD_THRESHOLDS.alertThreshold) return 'review'
  return 'allow'
}

/**
 * Mask email for logging (privacy)
 */
function maskEmailForLogging(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  const maskedLocal = local.length > 2 ? local.substring(0, 2) + '***' : '***'
  return `${maskedLocal}@${domain}`
}

/**
 * Perform comprehensive fraud detection check
 */
export async function detectFraud(input: FraudDetectionInput): Promise<FraudDetectionResult> {
  // Run all fraud rules
  const ruleResults = FRAUD_RULES.map((rule) => rule.check(input))

  // Calculate total risk score (capped at 100)
  const totalRiskScore = Math.min(
    100,
    ruleResults.reduce((sum, result) => sum + result.riskScore, 0)
  )

  // Get triggered rules
  const triggeredRules = ruleResults.filter((r) => r.triggered)
  const reasons = triggeredRules.map((r) => r.reason)

  // Determine flags
  const isSuspicious = totalRiskScore >= FRAUD_THRESHOLDS.suspiciousThreshold
  const shouldAlert = totalRiskScore >= FRAUD_THRESHOLDS.alertThreshold
  const shouldBlock = totalRiskScore >= FRAUD_THRESHOLDS.blockThreshold
  const riskLevel = getRiskLevel(totalRiskScore)
  const recommendedAction = getRecommendedAction(totalRiskScore)

  // Build result
  const result: FraudDetectionResult = {
    isSuspicious,
    riskScore: totalRiskScore,
    riskLevel,
    triggeredRules,
    reasons,
    shouldAlert,
    shouldBlock,
    recommendedAction,
  }

  // Log the fraud check
  logger.info('Fraud detection check completed', {
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    amount: input.amount,
    riskScore: totalRiskScore,
    riskLevel,
    isSuspicious,
    shouldAlert,
    triggeredRuleCount: triggeredRules.length,
    triggeredRuleIds: triggeredRules.map((r) => r.ruleId),
    buyerEmail: maskEmailForLogging(input.buyerEmail),
  })

  // Send alert if threshold exceeded
  if (shouldAlert) {
    const alertId = await sendFraudAlert(input, result)
    result.alertId = alertId
  }

  return result
}

/**
 * Send fraud detection alert to administrators
 */
export async function sendFraudAlert(
  input: FraudDetectionInput,
  result: FraudDetectionResult
): Promise<string> {
  const severity: AlertSeverity = result.riskLevel === 'critical' ? 'critical' : 'warning'

  const alertTitle = result.shouldBlock
    ? `🚨 BLOCKED: High-Risk Payment Detected`
    : `⚠️ Suspicious Payment Requires Review`

  const alertMessage = [
    `Risk Score: ${result.riskScore}/100 (${result.riskLevel.toUpperCase()})`,
    `Amount: $${(input.amount / 100).toFixed(2)} ${input.currency.toUpperCase()}`,
    `Order: ${input.orderNumber || input.orderId || 'N/A'}`,
    '',
    'Triggered Rules:',
    ...result.triggeredRules.map((r) => `  • ${r.reason}`),
    '',
    `Recommended Action: ${result.recommendedAction.toUpperCase()}`,
  ].join('\n')

  logger.warn('Sending fraud detection alert', {
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    triggeredRules: result.triggeredRules.map((r) => r.ruleId),
    severity,
  })

  const alertRecord = await alertManager.sendAlert({
    title: alertTitle,
    message: alertMessage,
    severity,
    channels: severity === 'critical' ? ['email', 'slack', 'pagerduty'] : ['email', 'slack'],
    metadata: {
      type: 'fraud_detection',
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      eventId: input.eventId,
      userId: input.userId,
      amount: input.amount,
      currency: input.currency,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      triggeredRules: result.triggeredRules.map((r) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        riskScore: r.riskScore,
      })),
      recommendedAction: result.recommendedAction,
      buyerEmailMasked: maskEmailForLogging(input.buyerEmail),
      ipAddress: input.ipAddress,
      countryCode: input.countryCode,
      timestamp: Date.now(),
    },
  })

  return alertRecord.id
}

/**
 * Check if a payment should be blocked based on fraud detection
 */
export function shouldBlockPayment(result: FraudDetectionResult): boolean {
  return result.shouldBlock
}

/**
 * Get human-readable fraud summary for logging
 */
export function getFraudSummary(result: FraudDetectionResult): string {
  if (!result.isSuspicious) {
    return 'No fraud indicators detected'
  }

  return [
    `Risk: ${result.riskLevel.toUpperCase()} (${result.riskScore}/100)`,
    `Flags: ${result.triggeredRules.length}`,
    `Action: ${result.recommendedAction}`,
  ].join(' | ')
}

// ============================================================================
// Exports for backward compatibility with existing checkForFraud
// ============================================================================

/**
 * Legacy fraud check interface (for backward compatibility)
 */
export interface LegacyFraudCheckInput {
  amount: number
  currency: string
  buyerEmail: string
  ipAddress?: string
  previousOrderCount?: number
  previousTotalSpent?: number
  timeSinceLastOrder?: number
}

export interface LegacyFraudCheckResult {
  isSuspicious: boolean
  riskScore: number
  reasons: string[]
  shouldAlert: boolean
}

/**
 * Legacy fraud check function (for backward compatibility)
 * Maps to the new detectFraud function
 */
export function checkForFraudLegacy(input: LegacyFraudCheckInput): LegacyFraudCheckResult {
  // Run rules synchronously without sending alerts
  const ruleResults = FRAUD_RULES.map((rule) => rule.check(input as FraudDetectionInput))

  const totalRiskScore = Math.min(
    100,
    ruleResults.reduce((sum, result) => sum + result.riskScore, 0)
  )

  const triggeredRules = ruleResults.filter((r) => r.triggered)
  const reasons = triggeredRules.map((r) => r.reason)

  const isSuspicious = totalRiskScore >= FRAUD_THRESHOLDS.suspiciousThreshold
  const shouldAlert = totalRiskScore >= FRAUD_THRESHOLDS.alertThreshold

  if (shouldAlert) {
    logger.warn('High-risk payment detected', {
      riskScore: totalRiskScore,
      reasons,
      amount: input.amount,
      email: maskEmailForLogging(input.buyerEmail),
    })
  }

  return {
    isSuspicious,
    riskScore: totalRiskScore,
    reasons,
    shouldAlert,
  }
}
