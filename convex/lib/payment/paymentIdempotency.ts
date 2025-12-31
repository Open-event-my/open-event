/**
 * Payment Idempotency Service
 *
 * Provides database operations for tracking payment idempotency.
 * Prevents duplicate charges by tracking payment operations and their results.
 *
 * Property 46: Payment Idempotency
 * For any payment operation, if the same idempotency key is used multiple times,
 * only one payment should be processed and subsequent requests should return the same result.
 *
 * **Validates: Requirements 12.5**
 */

import { v } from 'convex/values'
import { internalMutation, internalQuery } from '../../_generated/server'
import { logger } from '../monitoring/logger'
import { generateIdempotencyKey, generateStripeIdempotencyKey } from './paymentSecurity'

/**
 * Get an existing idempotency record by key
 */
export const getByKey = internalQuery({
  args: {
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('paymentIdempotency')
      .withIndex('by_idempotency_key', (q) => q.eq('idempotencyKey', args.idempotencyKey))
      .first()
  },
})

/**
 * Get an existing idempotency record by order and operation
 */
export const getByOrderOperation = internalQuery({
  args: {
    orderId: v.string(),
    operation: v.union(v.literal('checkout'), v.literal('refund'), v.literal('capture')),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Find the most recent non-expired record for this order/operation
    const records = await ctx.db
      .query('paymentIdempotency')
      .withIndex('by_order_operation', (q) =>
        q.eq('orderId', args.orderId).eq('operation', args.operation)
      )
      .collect()

    // Filter out expired records and get the most recent
    const validRecords = records.filter((r) => r.expiresAt > now)
    if (validRecords.length === 0) {
      return null
    }

    // Return the most recent record
    return validRecords.sort((a, b) => b.createdAt - a.createdAt)[0]
  },
})

/**
 * Create a new idempotency record for a payment operation
 */
export const create = internalMutation({
  args: {
    orderId: v.string(),
    operation: v.union(v.literal('checkout'), v.literal('refund'), v.literal('capture')),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ts = args.timestamp || Date.now()
    const idempotencyKey = generateIdempotencyKey(args.orderId, args.operation, ts)
    const stripeIdempotencyKey = generateStripeIdempotencyKey(args.orderId, args.operation, ts)

    // Check if record already exists
    const existing = await ctx.db
      .query('paymentIdempotency')
      .withIndex('by_idempotency_key', (q) => q.eq('idempotencyKey', idempotencyKey))
      .first()

    if (existing) {
      logger.info('Idempotency record already exists', {
        idempotencyKey,
        orderId: args.orderId,
        operation: args.operation,
        existingStatus: existing.status,
      })
      return existing
    }

    // Create new record
    const recordId = await ctx.db.insert('paymentIdempotency', {
      idempotencyKey,
      orderId: args.orderId,
      operation: args.operation,
      status: 'pending',
      stripeIdempotencyKey,
      createdAt: ts,
      expiresAt: ts + 24 * 60 * 60 * 1000, // 24 hours TTL
    })

    logger.info('Created idempotency record', {
      idempotencyKey,
      orderId: args.orderId,
      operation: args.operation,
    })

    return await ctx.db.get(recordId)
  },
})

/**
 * Update an idempotency record with the operation result
 */
export const complete = internalMutation({
  args: {
    idempotencyKey: v.string(),
    status: v.union(v.literal('completed'), v.literal('failed')),
    result: v.optional(v.string()), // JSON-serialized result
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('paymentIdempotency')
      .withIndex('by_idempotency_key', (q) => q.eq('idempotencyKey', args.idempotencyKey))
      .first()

    if (!record) {
      logger.warn('Idempotency record not found for completion', {
        idempotencyKey: args.idempotencyKey,
      })
      return null
    }

    // Don't update if already completed
    if (record.status === 'completed') {
      logger.info('Idempotency record already completed, skipping update', {
        idempotencyKey: args.idempotencyKey,
      })
      return record
    }

    await ctx.db.patch(record._id, {
      status: args.status,
      result: args.result,
      errorMessage: args.errorMessage,
      completedAt: Date.now(),
    })

    logger.info('Completed idempotency record', {
      idempotencyKey: args.idempotencyKey,
      status: args.status,
    })

    return await ctx.db.get(record._id)
  },
})

/**
 * Clean up expired idempotency records
 */
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()

    const expiredRecords = await ctx.db
      .query('paymentIdempotency')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect()

    let deletedCount = 0
    for (const record of expiredRecords) {
      await ctx.db.delete(record._id)
      deletedCount++
    }

    if (deletedCount > 0) {
      logger.info('Cleaned up expired idempotency records', {
        deletedCount,
      })
    }

    return { deletedCount }
  },
})

/**
 * Check if a payment operation can proceed (idempotency check)
 * Returns the existing record if duplicate, null if new operation
 */
export const checkAndCreate = internalMutation({
  args: {
    orderId: v.string(),
    operation: v.union(v.literal('checkout'), v.literal('refund'), v.literal('capture')),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ts = args.timestamp || Date.now()
    const idempotencyKey = generateIdempotencyKey(args.orderId, args.operation, ts)
    const stripeIdempotencyKey = generateStripeIdempotencyKey(args.orderId, args.operation, ts)

    // Check for existing record
    const existing = await ctx.db
      .query('paymentIdempotency')
      .withIndex('by_idempotency_key', (q) => q.eq('idempotencyKey', idempotencyKey))
      .first()

    if (existing && existing.expiresAt > ts) {
      // Duplicate request found
      logger.info('Duplicate payment operation detected', {
        idempotencyKey,
        orderId: args.orderId,
        operation: args.operation,
        existingStatus: existing.status,
      })

      return {
        isDuplicate: true,
        record: existing,
        stripeIdempotencyKey: existing.stripeIdempotencyKey,
      }
    }

    // Create new record
    const recordId = await ctx.db.insert('paymentIdempotency', {
      idempotencyKey,
      orderId: args.orderId,
      operation: args.operation,
      status: 'pending',
      stripeIdempotencyKey,
      createdAt: ts,
      expiresAt: ts + 24 * 60 * 60 * 1000, // 24 hours TTL
    })

    const newRecord = await ctx.db.get(recordId)

    logger.info('Created new idempotency record for payment operation', {
      idempotencyKey,
      orderId: args.orderId,
      operation: args.operation,
    })

    return {
      isDuplicate: false,
      record: newRecord,
      stripeIdempotencyKey,
    }
  },
})
