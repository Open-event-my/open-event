/**
 * Property Tests for Payment Audit Logging
 *
 * Property 47: Payment Event Audit Logging
 * For any payment-related event (charge, refund, dispute), an audit log entry
 * should be created with full details for compliance.
 *
 * **Validates: Requirements 12.6**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  maskEmail,
  sanitizeMetadata,
  sanitizePaymentAuditEntry,
  validatePaymentAuditEntry,
  isPaymentEventType,
  getEventCategory,
  isFailureEvent,
  isSuccessEvent,
  type PaymentEventType,
  type PaymentAuditEntry,
} from './paymentAuditLog';

describe('Payment Audit Logging Property Tests', () => {
  /**
   * Property 47: Payment Event Audit Logging
   * For any payment-related event (charge, refund, dispute), an audit log entry
   * should be created with full details for compliance.
   * **Validates: Requirements 12.6**
   */
  describe('Property 47: Payment Event Audit Logging', () => {
    // Arbitrary for payment event types
    const paymentEventTypeArb: fc.Arbitrary<PaymentEventType> = fc.constantFrom(
      'checkout_initiated',
      'checkout_completed',
      'checkout_expired',
      'checkout_cancelled',
      'payment_succeeded',
      'payment_failed',
      'payment_processing',
      'refund_initiated',
      'refund_completed',
      'refund_failed',
      'partial_refund_completed',
      'dispute_created',
      'dispute_updated',
      'dispute_won',
      'dispute_lost',
      'dispute_closed',
      'chargeback_created',
      'subscription_created',
      'subscription_cancelled',
      'invoice_paid',
      'invoice_failed'
    );

    // Arbitrary for order IDs
    const orderIdArb = fc.string({ minLength: 5, maxLength: 30 }).map(s => 
      s.replace(/[^a-zA-Z0-9]/g, 'x')
    );

    // Arbitrary for order numbers
    const orderNumberArb = fc.string({ minLength: 5, maxLength: 20 }).map(s => 
      `ORD-${s.replace(/[^a-zA-Z0-9]/g, 'x').toUpperCase()}`
    );

    // Arbitrary for amounts (in cents)
    const amountArb = fc.integer({ min: 0, max: 10000000 }); // Up to $100,000

    // Arbitrary for currency codes
    const currencyArb = fc.constantFrom('usd', 'eur', 'gbp', 'myr', 'sgd', 'aud', 'cad');

    // Arbitrary for email addresses
    const emailArb = fc.emailAddress();

    // Arbitrary for Stripe IDs
    const stripeIdArb = (prefix: string) => 
      fc.string({ minLength: 10, maxLength: 24 }).map(s => 
        `${prefix}${s.replace(/[^a-zA-Z0-9]/g, 'x')}`
      );

    // Arbitrary for complete payment audit entries
    const paymentAuditEntryArb: fc.Arbitrary<PaymentAuditEntry> = fc.record({
      eventType: paymentEventTypeArb,
      orderId: orderIdArb,
      orderNumber: orderNumberArb,
      amount: amountArb,
      currency: currencyArb,
      userId: fc.option(fc.string({ minLength: 10, maxLength: 30 }), { nil: undefined }),
      buyerEmail: fc.option(emailArb, { nil: undefined }),
      eventId: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
      stripeEventId: fc.option(stripeIdArb('evt_'), { nil: undefined }),
      stripePaymentIntentId: fc.option(stripeIdArb('pi_'), { nil: undefined }),
      stripeChargeId: fc.option(stripeIdArb('ch_'), { nil: undefined }),
      stripeRefundId: fc.option(stripeIdArb('re_'), { nil: undefined }),
      stripeDisputeId: fc.option(stripeIdArb('dp_'), { nil: undefined }),
      stripeSessionId: fc.option(stripeIdArb('cs_'), { nil: undefined }),
      paymentMethod: fc.option(fc.constantFrom('card', 'bank_transfer', 'wallet'), { nil: undefined }),
      cardBrand: fc.option(fc.constantFrom('visa', 'mastercard', 'amex', 'discover'), { nil: undefined }),
      cardLast4: fc.option(fc.string({ minLength: 4, maxLength: 4 }).map(s => s.replace(/\D/g, '0').slice(0, 4)), { nil: undefined }),
      refundReason: fc.option(fc.string({ minLength: 5, maxLength: 100 }), { nil: undefined }),
      disputeReason: fc.option(fc.constantFrom('fraudulent', 'duplicate', 'product_not_received', 'general'), { nil: undefined }),
      errorMessage: fc.option(fc.string({ minLength: 5, maxLength: 200 }), { nil: undefined }),
      errorCode: fc.option(fc.string({ minLength: 3, maxLength: 30 }), { nil: undefined }),
      ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
      userAgent: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
      metadata: fc.option(fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 1, maxLength: 50 })), { nil: undefined }),
    });

    it('should validate all payment event types as valid', () => {
      fc.assert(
        fc.property(paymentEventTypeArb, (eventType) => {
          return isPaymentEventType(eventType) === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid event types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !s.startsWith('checkout_') && 
            !s.startsWith('payment_') && 
            !s.startsWith('refund_') && 
            !s.startsWith('dispute_') &&
            !s.startsWith('subscription_') &&
            !s.startsWith('invoice_') &&
            s !== 'partial_refund_completed' &&
            s !== 'chargeback_created'
          ),
          (invalidType) => {
            return isPaymentEventType(invalidType) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly categorize checkout events', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'checkout_initiated',
            'checkout_completed',
            'checkout_expired',
            'checkout_cancelled'
          ) as fc.Arbitrary<PaymentEventType>,
          (eventType) => {
            return getEventCategory(eventType) === 'checkout';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly categorize payment events', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'payment_succeeded',
            'payment_failed',
            'payment_processing'
          ) as fc.Arbitrary<PaymentEventType>,
          (eventType) => {
            return getEventCategory(eventType) === 'payment';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly categorize refund events', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'refund_initiated',
            'refund_completed',
            'refund_failed',
            'partial_refund_completed'
          ) as fc.Arbitrary<PaymentEventType>,
          (eventType) => {
            return getEventCategory(eventType) === 'refund';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly categorize dispute events', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'dispute_created',
            'dispute_updated',
            'dispute_won',
            'dispute_lost',
            'dispute_closed',
            'chargeback_created'
          ) as fc.Arbitrary<PaymentEventType>,
          (eventType) => {
            return getEventCategory(eventType) === 'dispute';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify failure events', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'payment_failed',
            'refund_failed',
            'dispute_lost',
            'invoice_failed',
            'checkout_expired',
            'checkout_cancelled'
          ) as fc.Arbitrary<PaymentEventType>,
          (eventType) => {
            return isFailureEvent(eventType) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify success events', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'checkout_completed',
            'payment_succeeded',
            'refund_completed',
            'partial_refund_completed',
            'dispute_won',
            'invoice_paid'
          ) as fc.Arbitrary<PaymentEventType>,
          (eventType) => {
            return isSuccessEvent(eventType) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate entries with all required fields', () => {
      fc.assert(
        fc.property(paymentAuditEntryArb, (entry) => {
          const validation = validatePaymentAuditEntry(entry);
          return validation.isValid === true && validation.errors.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject entries missing eventType', () => {
      fc.assert(
        fc.property(
          orderIdArb,
          orderNumberArb,
          amountArb,
          currencyArb,
          (orderId, orderNumber, amount, currency) => {
            const entry = { orderId, orderNumber, amount, currency };
            const validation = validatePaymentAuditEntry(entry);
            return validation.isValid === false && 
                   validation.errors.some(e => e.includes('eventType'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject entries missing orderId', () => {
      fc.assert(
        fc.property(
          paymentEventTypeArb,
          orderNumberArb,
          amountArb,
          currencyArb,
          (eventType, orderNumber, amount, currency) => {
            const entry = { eventType, orderNumber, amount, currency };
            const validation = validatePaymentAuditEntry(entry);
            return validation.isValid === false && 
                   validation.errors.some(e => e.includes('orderId'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject entries missing orderNumber', () => {
      fc.assert(
        fc.property(
          paymentEventTypeArb,
          orderIdArb,
          amountArb,
          currencyArb,
          (eventType, orderId, amount, currency) => {
            const entry = { eventType, orderId, amount, currency };
            const validation = validatePaymentAuditEntry(entry);
            return validation.isValid === false && 
                   validation.errors.some(e => e.includes('orderNumber'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject entries with negative amounts', () => {
      fc.assert(
        fc.property(
          paymentEventTypeArb,
          orderIdArb,
          orderNumberArb,
          fc.integer({ min: -1000000, max: -1 }),
          currencyArb,
          (eventType, orderId, orderNumber, amount, currency) => {
            const entry = { eventType, orderId, orderNumber, amount, currency };
            const validation = validatePaymentAuditEntry(entry);
            return validation.isValid === false && 
                   validation.errors.some(e => e.includes('amount'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject entries missing currency', () => {
      fc.assert(
        fc.property(
          paymentEventTypeArb,
          orderIdArb,
          orderNumberArb,
          amountArb,
          (eventType, orderId, orderNumber, amount) => {
            const entry = { eventType, orderId, orderNumber, amount };
            const validation = validatePaymentAuditEntry(entry);
            return validation.isValid === false && 
                   validation.errors.some(e => e.includes('currency'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mask email addresses correctly', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          const masked = maskEmail(email);
          
          // Should contain @ symbol
          if (!masked.includes('@')) return false;
          
          // Should contain *** for masking
          if (!masked.includes('***')) return false;
          
          // Should preserve domain
          const [, domain] = email.split('@');
          if (!masked.endsWith(`@${domain}`)) return false;
          
          // Should not expose full local part
          const [localPart] = email.split('@');
          if (localPart.length > 2 && masked.startsWith(localPart)) return false;
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle invalid email formats gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('invalid'),
            fc.constant('no-at-sign'),
            fc.string({ minLength: 0, maxLength: 5 }).filter(s => !s.includes('@')),
          ),
          (invalidEmail) => {
            const masked = maskEmail(invalidEmail);
            return masked === '***@***';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sanitize metadata by removing sensitive fields', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'cardNumber',
            'card_number',
            'creditCard',
            'cvv',
            'cvc',
            'securityCode',
            'password',
            'secret',
            'apiKey'
          ),
          fc.string({ minLength: 1, maxLength: 50 }),
          (sensitiveField, value) => {
            const metadata = { [sensitiveField]: value, safeField: 'safe' };
            const sanitized = sanitizeMetadata(metadata);
            
            // Sensitive field should be removed
            if (sanitized && sensitiveField in sanitized) return false;
            
            // Safe field should be preserved
            if (!sanitized || sanitized.safeField !== 'safe') return false;
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve non-sensitive metadata fields', () => {
      fc.assert(
        fc.property(
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => 
              !['cardnumber', 'cvv', 'cvc', 'password', 'secret', 'apikey', 'token'].some(
                sensitive => s.toLowerCase().includes(sensitive)
              )
            ),
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          (metadata) => {
            const sanitized = sanitizeMetadata(metadata);
            
            // All non-sensitive fields should be preserved
            for (const [key, value] of Object.entries(metadata)) {
              if (!sanitized || sanitized[key] !== value) return false;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sanitize payment audit entries by masking email', () => {
      fc.assert(
        fc.property(paymentAuditEntryArb, (entry) => {
          const sanitized = sanitizePaymentAuditEntry(entry);
          
          // buyerEmail should not be in sanitized entry
          if ('buyerEmail' in sanitized) return false;
          
          // If original had email, sanitized should have masked version
          if (entry.buyerEmail) {
            if (!sanitized.buyerEmailMasked) return false;
            if (!sanitized.buyerEmailMasked.includes('***')) return false;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should sanitize payment audit entries by removing cardLast4', () => {
      fc.assert(
        fc.property(paymentAuditEntryArb, (entry) => {
          const sanitized = sanitizePaymentAuditEntry(entry);
          
          // cardLast4 should not be in sanitized entry
          if ('cardLast4' in sanitized) return false;
          
          // If original had card info, sanitized should indicate presence
          if (entry.cardLast4 || entry.cardBrand) {
            if (!sanitized.hasCardInfo) return false;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve all non-sensitive fields in sanitized entries', () => {
      fc.assert(
        fc.property(paymentAuditEntryArb, (entry) => {
          const sanitized = sanitizePaymentAuditEntry(entry);
          
          // Core fields should be preserved
          if (sanitized.eventType !== entry.eventType) return false;
          if (sanitized.orderId !== entry.orderId) return false;
          if (sanitized.orderNumber !== entry.orderNumber) return false;
          if (sanitized.amount !== entry.amount) return false;
          if (sanitized.currency !== entry.currency) return false;
          
          // Stripe IDs should be preserved
          if (sanitized.stripeEventId !== entry.stripeEventId) return false;
          if (sanitized.stripePaymentIntentId !== entry.stripePaymentIntentId) return false;
          if (sanitized.stripeChargeId !== entry.stripeChargeId) return false;
          if (sanitized.stripeRefundId !== entry.stripeRefundId) return false;
          if (sanitized.stripeDisputeId !== entry.stripeDisputeId) return false;
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should create audit entries with all required compliance fields', () => {
      fc.assert(
        fc.property(paymentAuditEntryArb, (entry) => {
          const sanitized = sanitizePaymentAuditEntry(entry);
          
          // Required fields for compliance
          const hasEventType = typeof sanitized.eventType === 'string';
          const hasOrderId = typeof sanitized.orderId === 'string';
          const hasOrderNumber = typeof sanitized.orderNumber === 'string';
          const hasAmount = typeof sanitized.amount === 'number';
          const hasCurrency = typeof sanitized.currency === 'string';
          
          return hasEventType && hasOrderId && hasOrderNumber && hasAmount && hasCurrency;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null/undefined metadata gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(null, undefined),
          (metadata) => {
            const sanitized = sanitizeMetadata(metadata as Record<string, unknown> | undefined);
            return sanitized === undefined;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle nested metadata objects', () => {
      fc.assert(
        fc.property(
          fc.record({
            level1: fc.record({
              level2: fc.record({
                safeField: fc.string({ minLength: 1, maxLength: 20 }),
                cardNumber: fc.option(fc.string({ minLength: 16, maxLength: 16 }), { nil: undefined }),
              }),
            }),
          }),
          (metadata) => {
            const sanitized = sanitizeMetadata(metadata);
            
            // Should have nested structure
            if (!sanitized || !sanitized.level1) return false;
            
            const level1 = sanitized.level1 as Record<string, unknown>;
            if (!level1.level2) return false;
            
            const level2 = level1.level2 as Record<string, unknown>;
            
            // Safe field should be preserved
            if (level2.safeField !== metadata.level1.level2.safeField) return false;
            
            // Sensitive field should be removed
            if ('cardNumber' in level2) return false;
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
