// ============================================================================
// Webhook Management
// ============================================================================
// Handles creation, management, and delivery of webhooks

import { v } from 'convex/values'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'
import { getCurrentUser } from './lib/auth'
import type { Id } from './_generated/dataModel'

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

// Maximum webhooks per user
const MAX_WEBHOOKS_PER_USER = 10

// Maximum consecutive failures before auto-disabling
const MAX_FAILURES_BEFORE_DISABLE = 5

// Retry delays (exponential backoff) - for future webhook retry implementation
// const RETRY_DELAYS_MS = [
//   1000 * 60,      // 1 minute
//   1000 * 60 * 5,  // 5 minutes
//   1000 * 60 * 30, // 30 minutes
//   1000 * 60 * 60, // 1 hour
// ]

// Available webhook events
export const WEBHOOK_EVENTS = {
  // Event lifecycle
  EVENT_CREATED: 'event.created',
  EVENT_UPDATED: 'event.updated',
  EVENT_DELETED: 'event.deleted',
  EVENT_STATUS_CHANGED: 'event.status_changed',

  // Vendor events
  VENDOR_APPLIED: 'vendor.applied',
  VENDOR_CONFIRMED: 'vendor.confirmed',
  VENDOR_DECLINED: 'vendor.declined',

  // Sponsor events
  SPONSOR_APPLIED: 'sponsor.applied',
  SPONSOR_CONFIRMED: 'sponsor.confirmed',
  SPONSOR_DECLINED: 'sponsor.declined',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_COMPLETED: 'task.completed',
} as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]

// All event types as array
export const ALL_WEBHOOK_EVENTS = Object.values(WEBHOOK_EVENTS)

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let secret = 'whsec_'
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}

/**
 * Validate webhook URL
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Must be HTTPS in production (allow HTTP for localhost)
    if (parsed.protocol !== 'https:' && !parsed.hostname.includes('localhost')) {
      return false
    }
    return true
  } catch {
    return false
  }
}

// ----------------------------------------------------------------------------
// Public Mutations
// ----------------------------------------------------------------------------

/**
 * Create a new webhook
 */
export const create = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    events: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    // Validate name
    if (args.name.trim().length === 0) {
      throw new Error('Webhook name is required')
    }
    if (args.name.length > 100) {
      throw new Error('Webhook name must be 100 characters or less')
    }

    // Validate URL
    if (!isValidWebhookUrl(args.url)) {
      throw new Error('Invalid webhook URL. Must be a valid HTTPS URL.')
    }

    // Validate events
    if (args.events.length === 0) {
      throw new Error('At least one event is required')
    }
    for (const event of args.events) {
      if (!ALL_WEBHOOK_EVENTS.includes(event as WebhookEventType)) {
        throw new Error(`Invalid event type: ${event}`)
      }
    }

    // Check user's webhook limit
    const existingWebhooks = await ctx.db
      .query('webhooks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    if (existingWebhooks.length >= MAX_WEBHOOKS_PER_USER) {
      throw new Error(`Maximum ${MAX_WEBHOOKS_PER_USER} webhooks allowed per user`)
    }

    // Check for duplicate URL
    const duplicateUrl = existingWebhooks.find((w) => w.url === args.url)
    if (duplicateUrl) {
      throw new Error('A webhook with this URL already exists')
    }

    // Generate secret
    const secret = generateWebhookSecret()

    // Create webhook
    const webhookId = await ctx.db.insert('webhooks', {
      userId: user._id,
      name: args.name.trim(),
      url: args.url,
      secret,
      events: args.events,
      status: 'active',
      failureCount: 0,
      totalDeliveries: 0,
      createdAt: Date.now(),
    })

    // Return webhook info including secret (shown only once!)
    return {
      id: webhookId,
      secret,
      message: 'Save this secret securely. You will not be able to see it again.',
    }
  },
})

/**
 * List user's webhooks
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const webhooks = await ctx.db
      .query('webhooks')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    // Don't return the secret
    return webhooks.map((w) => ({
      _id: w._id,
      name: w.name,
      url: w.url,
      events: w.events,
      status: w.status,
      failureCount: w.failureCount || 0,
      lastDeliveryAt: w.lastDeliveryAt,
      lastDeliveryStatus: w.lastDeliveryStatus,
      totalDeliveries: w.totalDeliveries || 0,
      createdAt: w.createdAt,
    }))
  },
})

/**
 * Get a single webhook
 */
export const get = query({
  args: { id: v.id('webhooks') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const webhook = await ctx.db.get(args.id)
    if (!webhook || webhook.userId !== user._id) return null

    return {
      _id: webhook._id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
      failureCount: webhook.failureCount || 0,
      lastDeliveryAt: webhook.lastDeliveryAt,
      lastDeliveryStatus: webhook.lastDeliveryStatus,
      lastFailureAt: webhook.lastFailureAt,
      lastFailureReason: webhook.lastFailureReason,
      totalDeliveries: webhook.totalDeliveries || 0,
      createdAt: webhook.createdAt,
    }
  },
})

/**
 * Update a webhook
 */
export const update = mutation({
  args: {
    id: v.id('webhooks'),
    name: v.optional(v.string()),
    url: v.optional(v.string()),
    events: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal('active'), v.literal('paused'))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const webhook = await ctx.db.get(args.id)
    if (!webhook || webhook.userId !== user._id) {
      throw new Error('Webhook not found')
    }

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: Date.now() }

    if (args.name !== undefined) {
      if (args.name.trim().length === 0) {
        throw new Error('Webhook name is required')
      }
      updates.name = args.name.trim()
    }

    if (args.url !== undefined) {
      if (!isValidWebhookUrl(args.url)) {
        throw new Error('Invalid webhook URL. Must be a valid HTTPS URL.')
      }
      updates.url = args.url
    }

    if (args.events !== undefined) {
      if (args.events.length === 0) {
        throw new Error('At least one event is required')
      }
      for (const event of args.events) {
        if (!ALL_WEBHOOK_EVENTS.includes(event as WebhookEventType)) {
          throw new Error(`Invalid event type: ${event}`)
        }
      }
      updates.events = args.events
    }

    if (args.status !== undefined) {
      updates.status = args.status
      // Reset failure count when re-enabling
      if (args.status === 'active' && webhook.status === 'disabled') {
        updates.failureCount = 0
      }
    }

    await ctx.db.patch(args.id, updates)

    return { success: true }
  },
})

/**
 * Delete a webhook
 */
export const remove = mutation({
  args: { id: v.id('webhooks') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const webhook = await ctx.db.get(args.id)
    if (!webhook || webhook.userId !== user._id) {
      throw new Error('Webhook not found')
    }

    // Delete delivery logs
    const deliveries = await ctx.db
      .query('webhookDeliveries')
      .withIndex('by_webhook', (q) => q.eq('webhookId', args.id))
      .collect()

    for (const delivery of deliveries) {
      await ctx.db.delete(delivery._id)
    }

    // Delete webhook
    await ctx.db.delete(args.id)

    return { success: true }
  },
})

/**
 * Regenerate webhook secret
 */
export const regenerateSecret = mutation({
  args: { id: v.id('webhooks') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const webhook = await ctx.db.get(args.id)
    if (!webhook || webhook.userId !== user._id) {
      throw new Error('Webhook not found')
    }

    const newSecret = generateWebhookSecret()

    await ctx.db.patch(args.id, {
      secret: newSecret,
      updatedAt: Date.now(),
    })

    return {
      secret: newSecret,
      message: 'Save this secret securely. You will not be able to see it again.',
    }
  },
})

/**
 * Get webhook delivery history
 */
export const getDeliveries = query({
  args: {
    webhookId: v.id('webhooks'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const webhook = await ctx.db.get(args.webhookId)
    if (!webhook || webhook.userId !== user._id) return []

    const limit = Math.min(args.limit || 50, 100)

    const deliveries = await ctx.db
      .query('webhookDeliveries')
      .withIndex('by_webhook', (q) => q.eq('webhookId', args.webhookId))
      .order('desc')
      .take(limit)

    return deliveries.map((d) => ({
      _id: d._id,
      eventType: d.eventType,
      eventId: d.eventId,
      status: d.status,
      statusCode: d.statusCode,
      responseTimeMs: d.responseTimeMs,
      errorMessage: d.errorMessage,
      attempts: d.attempts,
      createdAt: d.createdAt,
      deliveredAt: d.deliveredAt,
    }))
  },
})

// ----------------------------------------------------------------------------
// Internal Functions (for webhook delivery)
// ----------------------------------------------------------------------------

/**
 * Get webhooks subscribed to an event type for a user
 */
export const getWebhooksForEvent = internalQuery({
  args: {
    userId: v.id('users'),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    const webhooks = await ctx.db
      .query('webhooks')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    // Filter to those subscribed to this event
    return webhooks.filter((w) => w.events.includes(args.eventType))
  },
})

/**
 * Create a webhook delivery record
 */
export const createDelivery = internalMutation({
  args: {
    webhookId: v.id('webhooks'),
    userId: v.id('users'),
    eventType: v.string(),
    eventId: v.optional(v.string()),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('webhookDeliveries', {
      webhookId: args.webhookId,
      userId: args.userId,
      eventType: args.eventType,
      eventId: args.eventId,
      payload: args.payload,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    })
  },
})

/**
 * Update delivery status after attempt
 */
export const updateDeliveryStatus = internalMutation({
  args: {
    deliveryId: v.id('webhookDeliveries'),
    status: v.union(v.literal('success'), v.literal('failed'), v.literal('retrying')),
    statusCode: v.optional(v.number()),
    responseBody: v.optional(v.string()),
    responseTimeMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId)
    if (!delivery) return

    const updates: Record<string, unknown> = {
      status: args.status,
      attempts: delivery.attempts + 1,
    }

    if (args.statusCode !== undefined) updates.statusCode = args.statusCode
    if (args.responseBody !== undefined) updates.responseBody = args.responseBody.substring(0, 1000)
    if (args.responseTimeMs !== undefined) updates.responseTimeMs = args.responseTimeMs
    if (args.errorMessage !== undefined) updates.errorMessage = args.errorMessage
    if (args.nextRetryAt !== undefined) updates.nextRetryAt = args.nextRetryAt
    if (args.status === 'success') updates.deliveredAt = Date.now()

    await ctx.db.patch(args.deliveryId, updates)

    // Update webhook stats
    const webhook = await ctx.db.get(delivery.webhookId)
    if (webhook) {
      if (args.status === 'success') {
        await ctx.db.patch(delivery.webhookId, {
          lastDeliveryAt: Date.now(),
          lastDeliveryStatus: args.statusCode,
          totalDeliveries: (webhook.totalDeliveries || 0) + 1,
          failureCount: 0, // Reset on success
        })
      } else if (args.status === 'failed') {
        const newFailureCount = (webhook.failureCount || 0) + 1
        const updates: Record<string, unknown> = {
          failureCount: newFailureCount,
          lastFailureAt: Date.now(),
          lastFailureReason: args.errorMessage,
        }

        // Auto-disable after too many failures
        if (newFailureCount >= MAX_FAILURES_BEFORE_DISABLE) {
          updates.status = 'disabled'
        }

        await ctx.db.patch(delivery.webhookId, updates)
      }
    }
  },
})

/**
 * Get webhook by ID (internal)
 */
export const getWebhookById = internalQuery({
  args: { id: v.id('webhooks') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// ----------------------------------------------------------------------------
// Webhook Trigger Function
// ----------------------------------------------------------------------------

/**
 * Trigger webhooks for an event
 * Call this from mutations when events occur
 */
export const triggerWebhooks = internalMutation({
  args: {
    userId: v.id('users'),
    eventType: v.string(),
    eventId: v.optional(v.string()),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Get webhooks subscribed to this event
    const webhooks = await ctx.db
      .query('webhooks')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    const subscribedWebhooks = webhooks.filter((w) => w.events.includes(args.eventType))

    if (subscribedWebhooks.length === 0) return { triggered: 0 }

    // Create delivery records for each webhook
    const deliveryIds: Id<'webhookDeliveries'>[] = []

    for (const webhook of subscribedWebhooks) {
      const payload = JSON.stringify({
        id: `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        event: args.eventType,
        timestamp: Date.now(),
        data: args.data,
      })

      const deliveryId = await ctx.db.insert('webhookDeliveries', {
        webhookId: webhook._id,
        userId: args.userId,
        eventType: args.eventType,
        eventId: args.eventId,
        payload,
        status: 'pending',
        attempts: 0,
        createdAt: Date.now(),
      })

      deliveryIds.push(deliveryId)
    }

    // Schedule delivery action for each
    // Note: In a real system, you'd use a scheduled function or queue
    // For now, we return the delivery IDs and the client can poll for status

    return {
      triggered: deliveryIds.length,
      deliveryIds,
    }
  },
})
