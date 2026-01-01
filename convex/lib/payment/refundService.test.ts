/**
 * Unit Tests for Refund Service
 *
 * Tests refund validation, authorization, and processing logic.
 * Requirements: 12.7
 */

import { describe, it, expect } from 'vitest'
import {
  validateRefundRequest,
  canUserRefund,
  isOrderRefunded,
  calculateMaxRefundableAmount,
  createRefundRecord,
  completeRefundRecord,
  createRefundResultMessage,
  isRefundErrorRetryable,
  formatCents,
  sanitizeRefundReason,
  type RefundRequest,
  type RefundValidationResult,
} from './refundService'

describe('Refund Service', () => {
  describe('validateRefundRequest', () => {
    const validRequest: RefundRequest = {
      orderId: 'order_123',
      orderNumber: 'ORD-ABC123',
      orderTotal: 10000, // $100.00
      currency: 'usd',
      stripePaymentIntentId: 'pi_123456',
      paymentStatus: 'completed',
      requestedBy: 'user_123',
    }

    it('should validate a valid full refund request', () => {
      const result = validateRefundRequest(validRequest)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.refundAmount).toBe(10000)
      expect(result.isPartial).toBe(false)
    })

    it('should validate a valid partial refund request', () => {
      const request: RefundRequest = {
        ...validRequest,
        refundAmount: 5000, // $50.00
      }

      const result = validateRefundRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.refundAmount).toBe(5000)
      expect(result.isPartial).toBe(true)
      expect(result.warnings.some((w) => w.includes('partial refund'))).toBe(true)
    })

    it('should reject refund for non-completed orders', () => {
      const request: RefundRequest = {
        ...validRequest,
        paymentStatus: 'pending',
      }

      const result = validateRefundRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Cannot refund order with status'))).toBe(true)
    })

    it('should reject refund without payment intent', () => {
      const request: RefundRequest = {
        ...validRequest,
        stripePaymentIntentId: undefined,
      }

      const result = validateRefundRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('No payment intent found'))).toBe(true)
    })

    it('should reject refund amount exceeding order total', () => {
      const request: RefundRequest = {
        ...validRequest,
        refundAmount: 15000, // $150.00 > $100.00
      }

      const result = validateRefundRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('cannot exceed order total'))).toBe(true)
    })

    it('should reject zero or negative refund amount', () => {
      const request: RefundRequest = {
        ...validRequest,
        refundAmount: 0,
      }

      const result = validateRefundRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('must be greater than zero'))).toBe(true)
    })

    it('should warn about very small refund amounts', () => {
      const request: RefundRequest = {
        ...validRequest,
        refundAmount: 25, // $0.25
      }

      const result = validateRefundRequest(request)

      expect(result.isValid).toBe(true)
      expect(result.warnings.some((w) => w.includes('very small'))).toBe(true)
    })

    it('should reject missing order ID', () => {
      const request: RefundRequest = {
        ...validRequest,
        orderId: '',
      }

      const result = validateRefundRequest(request)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Order ID is required'))).toBe(true)
    })
  })

  describe('canUserRefund', () => {
    it('should allow superadmin to refund any order', () => {
      const result = canUserRefund('user_123', 'organizer_456', 'superadmin')

      expect(result.canRefund).toBe(true)
    })

    it('should allow admin to refund any order', () => {
      const result = canUserRefund('user_123', 'organizer_456', 'admin')

      expect(result.canRefund).toBe(true)
    })

    it('should allow organizer to refund their own event orders', () => {
      const result = canUserRefund('organizer_123', 'organizer_123', 'organizer')

      expect(result.canRefund).toBe(true)
    })

    it('should deny organizer from refunding other event orders', () => {
      const result = canUserRefund('organizer_123', 'organizer_456', 'organizer')

      expect(result.canRefund).toBe(false)
      expect(result.reason).toBe('You do not have permission to refund this order')
    })

    it('should deny regular users from refunding', () => {
      const result = canUserRefund('user_123', 'organizer_456', undefined)

      expect(result.canRefund).toBe(false)
    })
  })

  describe('isOrderRefunded', () => {
    it('should detect fully refunded orders by status', () => {
      const result = isOrderRefunded('refunded')

      expect(result.isRefunded).toBe(true)
      expect(result.isPartiallyRefunded).toBe(false)
    })

    it('should detect partially refunded orders', () => {
      const result = isOrderRefunded('completed', Date.now(), 5000, 10000)

      expect(result.isRefunded).toBe(true)
      expect(result.isPartiallyRefunded).toBe(true)
    })

    it('should detect fully refunded orders by amount', () => {
      const result = isOrderRefunded('completed', Date.now(), 10000, 10000)

      expect(result.isRefunded).toBe(true)
      expect(result.isPartiallyRefunded).toBe(false)
    })

    it('should detect non-refunded orders', () => {
      const result = isOrderRefunded('completed')

      expect(result.isRefunded).toBe(false)
      expect(result.isPartiallyRefunded).toBe(false)
    })
  })

  describe('calculateMaxRefundableAmount', () => {
    it('should return full amount for orders with no previous refunds', () => {
      const result = calculateMaxRefundableAmount(10000)

      expect(result).toBe(10000)
    })

    it('should subtract previous refund amount', () => {
      const result = calculateMaxRefundableAmount(10000, 3000)

      expect(result).toBe(7000)
    })

    it('should return zero if fully refunded', () => {
      const result = calculateMaxRefundableAmount(10000, 10000)

      expect(result).toBe(0)
    })

    it('should not return negative amounts', () => {
      const result = calculateMaxRefundableAmount(10000, 15000)

      expect(result).toBe(0)
    })
  })

  describe('createRefundRecord', () => {
    it('should create a pending refund record', () => {
      const request: RefundRequest = {
        orderId: 'order_123',
        orderNumber: 'ORD-ABC123',
        orderTotal: 10000,
        currency: 'usd',
        stripePaymentIntentId: 'pi_123',
        paymentStatus: 'completed',
        requestedBy: 'user_123',
        reason: 'Customer request',
      }

      const validation: RefundValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        refundAmount: 10000,
        isPartial: false,
      }

      const record = createRefundRecord(request, validation)

      expect(record.orderId).toBe('order_123')
      expect(record.orderNumber).toBe('ORD-ABC123')
      expect(record.amount).toBe(10000)
      expect(record.currency).toBe('usd')
      expect(record.status).toBe('pending')
      expect(record.reason).toBe('Customer request')
      expect(record.isPartial).toBe(false)
      expect(record.requestedBy).toBe('user_123')
      expect(record.requestedAt).toBeDefined()
    })
  })

  describe('completeRefundRecord', () => {
    const baseRecord = {
      orderId: 'order_123',
      orderNumber: 'ORD-ABC123',
      amount: 10000,
      currency: 'usd',
      status: 'pending' as const,
      isPartial: false,
      requestedBy: 'user_123',
      requestedAt: Date.now(),
    }

    it('should mark record as completed on success', () => {
      const result = completeRefundRecord(baseRecord, true, 're_123')

      expect(result.status).toBe('completed')
      expect(result.stripeRefundId).toBe('re_123')
      expect(result.completedAt).toBeDefined()
      expect(result.errorMessage).toBeUndefined()
    })

    it('should mark record as failed on error', () => {
      const result = completeRefundRecord(baseRecord, false, undefined, 'Card declined')

      expect(result.status).toBe('failed')
      expect(result.stripeRefundId).toBeUndefined()
      expect(result.completedAt).toBeDefined()
      expect(result.errorMessage).toBe('Card declined')
    })
  })

  describe('createRefundResultMessage', () => {
    it('should create success message for full refund', () => {
      const message = createRefundResultMessage(true, 10000, 'usd', false)

      expect(message).toContain('Full refund')
      expect(message).toContain('$100.00')
      expect(message).toContain('successfully')
    })

    it('should create success message for partial refund', () => {
      const message = createRefundResultMessage(true, 5000, 'usd', true)

      expect(message).toContain('Partial refund')
      expect(message).toContain('$50.00')
      expect(message).toContain('successfully')
    })

    it('should create error message on failure', () => {
      const message = createRefundResultMessage(false, 10000, 'usd', false, 'Card declined')

      expect(message).toBe('Card declined')
    })

    it('should create default error message when no error provided', () => {
      const message = createRefundResultMessage(false, 10000, 'usd', false)

      expect(message).toContain('could not be processed')
    })
  })

  describe('isRefundErrorRetryable', () => {
    it('should identify network errors as retryable', () => {
      expect(isRefundErrorRetryable('Network error occurred')).toBe(true)
    })

    it('should identify timeout errors as retryable', () => {
      expect(isRefundErrorRetryable('Request timeout')).toBe(true)
    })

    it('should identify rate limit errors as retryable', () => {
      expect(isRefundErrorRetryable('Rate limit exceeded')).toBe(true)
    })

    it('should identify temporary errors as retryable', () => {
      expect(isRefundErrorRetryable('Service temporarily unavailable')).toBe(true)
    })

    it('should not identify card declined as retryable', () => {
      expect(isRefundErrorRetryable('Card declined')).toBe(false)
    })

    it('should not identify insufficient funds as retryable', () => {
      expect(isRefundErrorRetryable('Insufficient funds')).toBe(false)
    })
  })

  describe('formatCents', () => {
    it('should format cents to USD', () => {
      expect(formatCents(10000, 'USD')).toBe('$100.00')
    })

    it('should format cents to EUR', () => {
      expect(formatCents(5000, 'EUR')).toBe('€50.00')
    })

    it('should handle small amounts', () => {
      expect(formatCents(50, 'USD')).toBe('$0.50')
    })

    it('should handle zero', () => {
      expect(formatCents(0, 'USD')).toBe('$0.00')
    })

    it('should default to USD', () => {
      expect(formatCents(10000)).toBe('$100.00')
    })
  })

  describe('sanitizeRefundReason', () => {
    it('should return undefined for empty reason', () => {
      expect(sanitizeRefundReason(undefined)).toBeUndefined()
      expect(sanitizeRefundReason('')).toBeUndefined()
    })

    it('should mask email addresses', () => {
      const result = sanitizeRefundReason('Contact me at john@example.com for details')

      expect(result).toContain('[email]')
      expect(result).not.toContain('john@example.com')
    })

    it('should mask phone numbers', () => {
      const result = sanitizeRefundReason('Call me at 555-123-4567')

      expect(result).toContain('[phone]')
      expect(result).not.toContain('555-123-4567')
    })

    it('should truncate long reasons', () => {
      const longReason = 'a'.repeat(600)
      const result = sanitizeRefundReason(longReason)

      expect(result?.length).toBeLessThanOrEqual(500)
    })

    it('should preserve normal text', () => {
      const reason = 'Customer requested refund due to event cancellation'
      const result = sanitizeRefundReason(reason)

      expect(result).toBe(reason)
    })
  })
})
