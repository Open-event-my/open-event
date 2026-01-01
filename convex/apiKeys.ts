// ============================================================================
// API Key Management
// ============================================================================
// Handles creation, validation, and management of API keys for external access

import { v } from 'convex/values'
import { mutation, query, internalMutation, internalQuery } from './_generated/server'
import { getCurrentUser } from './lib/auth'
import { encryptAPIKey, decryptAPIKey, type EncryptedData } from './lib/security/encryption'

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

// API key format: oe_{env}_{32 random chars}
// Example: oe_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
const KEY_PREFIX_LIVE = 'oe_live_'
const KEY_PREFIX_TEST = 'oe_test_'
const KEY_RANDOM_LENGTH = 32
const KEY_PREFIX_DISPLAY_LENGTH = 16 // How much of the key to show (e.g., "oe_live_a1b2c3d4")

// Default rate limit: 1000 requests per hour
const DEFAULT_RATE_LIMIT = 1000

// Available permission scopes
export const API_PERMISSIONS = {
  // Events
  EVENTS_READ: 'events:read',
  EVENTS_WRITE: 'events:write',
  EVENTS_DELETE: 'events:delete',

  // Vendors
  VENDORS_READ: 'vendors:read',

  // Sponsors
  SPONSORS_READ: 'sponsors:read',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',

  // Budget
  BUDGET_READ: 'budget:read',
  BUDGET_WRITE: 'budget:write',

  // User profile
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',

  // Full access
  ADMIN: '*',
} as const

// ----------------------------------------------------------------------------
// Key Generation Helpers
// ----------------------------------------------------------------------------

/**
 * Generate a secure random API key
 * Format: oe_{live|test}_{32 random alphanumeric chars}
 */
function generateApiKey(environment: 'live' | 'test' = 'live'): string {
  const prefix = environment === 'live' ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  let randomPart = ''
  for (let i = 0; i < KEY_RANDOM_LENGTH; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return prefix + randomPart
}

/**
 * Hash an API key using SHA-256
 * This is what we store in the database (LEGACY - for backward compatibility)
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Get the encryption master key from environment
 * This key is used to encrypt/decrypt API keys at rest
 */
function getEncryptionMasterKey(): string {
  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  if (masterKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters')
  }
  return masterKey
}

/**
 * Get the display prefix of a key (first 16 chars)
 * Used for identification without exposing the full key
 */
function getKeyPrefix(key: string): string {
  return key.substring(0, KEY_PREFIX_DISPLAY_LENGTH)
}

// ----------------------------------------------------------------------------
// Public Mutations
// ----------------------------------------------------------------------------

/**
 * Create a new API key for the current user
 * Returns the full key ONCE - it cannot be retrieved again
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()),
    environment: v.optional(v.union(v.literal('live'), v.literal('test'))),
    expiresAt: v.optional(v.number()),
    rateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    // Validate name
    if (args.name.trim().length === 0) {
      throw new Error('API key name is required')
    }
    if (args.name.length > 100) {
      throw new Error('API key name must be 100 characters or less')
    }

    // Validate permissions
    if (args.permissions.length === 0) {
      throw new Error('At least one permission is required')
    }

    // Validate rate limit
    if (args.rateLimit !== undefined && args.rateLimit < 1) {
      throw new Error('Rate limit must be at least 1')
    }

    // Generate the key
    const plainKey = generateApiKey(args.environment || 'live')
    const keyPrefix = getKeyPrefix(plainKey)

    // Encrypt the API key for storage (new approach)
    const masterKey = getEncryptionMasterKey()
    const encrypted = await encryptAPIKey(plainKey, masterKey)

    // Store the key (encrypted!)
    const keyId = await ctx.db.insert('apiKeys', {
      userId: user._id,
      name: args.name.trim(),
      description: args.description?.trim(),
      // New encrypted storage
      encryptedKey: encrypted.ciphertext,
      encryptionIV: encrypted.iv,
      encryptionTag: encrypted.tag,
      encryptionSalt: encrypted.salt,
      // Legacy hash field (optional for backward compatibility)
      keyHash: undefined,
      keyPrefix,
      permissions: args.permissions,
      rateLimit: args.rateLimit,
      status: 'active',
      expiresAt: args.expiresAt,
      totalRequests: 0,
      createdAt: Date.now(),
    })

    // Return the key info including the PLAIN KEY (shown only once!)
    return {
      id: keyId,
      key: plainKey,
      keyPrefix,
      name: args.name,
      permissions: args.permissions,
      message: 'Save this key securely. You will not be able to see it again.',
    }
  },
})

/**
 * List all API keys for the current user
 * Note: Does NOT return the actual key, only metadata
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    // Return keys without the hash
    return keys.map((key) => ({
      _id: key._id,
      name: key.name,
      description: key.description,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      rateLimit: key.rateLimit || DEFAULT_RATE_LIMIT,
      status: key.status,
      lastUsedAt: key.lastUsedAt,
      totalRequests: key.totalRequests || 0,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }))
  },
})

/**
 * Get a single API key by ID
 */
export const get = query({
  args: { id: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    const key = await ctx.db.get(args.id)
    if (!key || key.userId !== user._id) return null

    return {
      _id: key._id,
      name: key.name,
      description: key.description,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions,
      rateLimit: key.rateLimit || DEFAULT_RATE_LIMIT,
      status: key.status,
      lastUsedAt: key.lastUsedAt,
      totalRequests: key.totalRequests || 0,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }
  },
})

/**
 * Update an API key's metadata (name, description, permissions)
 * Note: Cannot change the actual key
 */
export const update = mutation({
  args: {
    id: v.id('apiKeys'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    rateLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const key = await ctx.db.get(args.id)
    if (!key || key.userId !== user._id) {
      throw new Error('API key not found')
    }

    if (key.status === 'revoked') {
      throw new Error('Cannot update a revoked API key')
    }

    // Build update object
    const updates: Record<string, unknown> = {}

    if (args.name !== undefined) {
      if (args.name.trim().length === 0) {
        throw new Error('API key name is required')
      }
      updates.name = args.name.trim()
    }

    if (args.description !== undefined) {
      updates.description = args.description.trim()
    }

    if (args.permissions !== undefined) {
      if (args.permissions.length === 0) {
        throw new Error('At least one permission is required')
      }
      updates.permissions = args.permissions
    }

    if (args.rateLimit !== undefined) {
      if (args.rateLimit < 1) {
        throw new Error('Rate limit must be at least 1')
      }
      updates.rateLimit = args.rateLimit
    }

    await ctx.db.patch(args.id, updates)

    return { success: true }
  },
})

/**
 * Revoke an API key (cannot be undone)
 */
export const revoke = mutation({
  args: { id: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const key = await ctx.db.get(args.id)
    if (!key || key.userId !== user._id) {
      throw new Error('API key not found')
    }

    if (key.status === 'revoked') {
      throw new Error('API key is already revoked')
    }

    await ctx.db.patch(args.id, {
      status: 'revoked',
      revokedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Delete an API key permanently
 */
export const remove = mutation({
  args: { id: v.id('apiKeys') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) {
      throw new Error('Authentication required')
    }

    const key = await ctx.db.get(args.id)
    if (!key || key.userId !== user._id) {
      throw new Error('API key not found')
    }

    // Delete associated rate limit records
    const rateLimits = await ctx.db
      .query('apiRateLimits')
      .withIndex('by_key', (q) => q.eq('apiKeyId', args.id))
      .collect()

    for (const limit of rateLimits) {
      await ctx.db.delete(limit._id)
    }

    // Delete the key
    await ctx.db.delete(args.id)

    return { success: true }
  },
})

// ----------------------------------------------------------------------------
// Internal Functions (for API validation)
// ----------------------------------------------------------------------------

/**
 * Validate an API key and return the key info
 * Called from HTTP actions
 *
 * Supports both encrypted keys (new) and hashed keys (legacy)
 */
export const validateKey = internalQuery({
  args: {
    keyPrefix: v.string(),
    keyHash: v.string(),
  },
  handler: async (ctx, args) => {
    // Find key by prefix first (faster lookup)
    const keys = await ctx.db
      .query('apiKeys')
      .withIndex('by_key_prefix', (q) => q.eq('keyPrefix', args.keyPrefix))
      .collect()

    // Try to find matching key (supports both encrypted and hashed)
    for (const key of keys) {
      let isValid = false

      // Check if this is an encrypted key (new approach)
      if (key.encryptedKey && key.encryptionIV && key.encryptionTag && key.encryptionSalt) {
        try {
          // Decrypt the stored key and compare with provided key
          const masterKey = getEncryptionMasterKey()
          const encrypted: EncryptedData = {
            ciphertext: key.encryptedKey,
            iv: key.encryptionIV,
            tag: key.encryptionTag,
            salt: key.encryptionSalt,
          }
          const decryptedKey = await decryptAPIKey(encrypted, masterKey)

          // Hash the decrypted key and compare with provided hash
          const decryptedHash = await hashApiKey(decryptedKey)
          isValid = decryptedHash === args.keyHash
        } catch (error) {
          // Decryption failed, key is invalid
          console.error('Failed to decrypt API key:', error)
          isValid = false
        }
      }
      // Check if this is a legacy hashed key
      else if (key.keyHash) {
        isValid = key.keyHash === args.keyHash
      }

      if (isValid) {
        // Check if key is active
        if (key.status !== 'active') {
          return null
        }

        // Check if key has expired
        if (key.expiresAt && key.expiresAt < Date.now()) {
          return null
        }

        return {
          _id: key._id,
          userId: key.userId,
          permissions: key.permissions,
          rateLimit: key.rateLimit || DEFAULT_RATE_LIMIT,
        }
      }
    }

    return null
  },
})

/**
 * Update last used timestamp for an API key
 */
export const updateLastUsed = internalMutation({
  args: {
    keyId: v.id('apiKeys'),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId)
    if (!key) return

    await ctx.db.patch(args.keyId, {
      lastUsedAt: Date.now(),
      lastUsedIp: args.ip,
      totalRequests: (key.totalRequests || 0) + 1,
    })
  },
})

// ----------------------------------------------------------------------------
// Rate Limiting Functions
// ----------------------------------------------------------------------------

/**
 * Check rate limit for an API key
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export const checkRateLimit = internalQuery({
  args: {
    keyId: v.id('apiKeys'),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId)
    if (!key) {
      return { allowed: false, remaining: 0, resetAt: Date.now(), limit: 0 }
    }

    const limit = key.rateLimit || DEFAULT_RATE_LIMIT
    const now = Date.now()

    // Get current hour window
    const windowStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000)
    const windowEnd = windowStart + 60 * 60 * 1000

    // Find rate limit record for this window
    const rateLimitRecords = await ctx.db
      .query('apiRateLimits')
      .withIndex('by_key_window', (q) =>
        q.eq('apiKeyId', args.keyId).eq('windowStart', windowStart)
      )
      .collect()

    const currentRecord = rateLimitRecords[0]
    const currentCount = currentRecord?.requestCount || 0
    const remaining = Math.max(0, limit - currentCount)
    const allowed = currentCount < limit

    return {
      allowed,
      remaining,
      resetAt: windowEnd,
      limit,
    }
  },
})

/**
 * Increment rate limit counter for an API key
 */
export const incrementRateLimit = internalMutation({
  args: {
    keyId: v.id('apiKeys'),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Get current hour window
    const windowStart = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000)

    // Find or create rate limit record
    const rateLimitRecords = await ctx.db
      .query('apiRateLimits')
      .withIndex('by_key_window', (q) =>
        q.eq('apiKeyId', args.keyId).eq('windowStart', windowStart)
      )
      .collect()

    const currentRecord = rateLimitRecords[0]

    if (currentRecord) {
      // Update existing record
      await ctx.db.patch(currentRecord._id, {
        requestCount: currentRecord.requestCount + 1,
        lastRequestAt: now,
      })
    } else {
      // Create new record
      await ctx.db.insert('apiRateLimits', {
        apiKeyId: args.keyId,
        windowStart,
        requestCount: 1,
        lastRequestAt: now,
      })

      // Clean up old rate limit records (older than 24 hours)
      const oldWindowStart = now - 24 * 60 * 60 * 1000
      const oldRecords = await ctx.db
        .query('apiRateLimits')
        .withIndex('by_key', (q) => q.eq('apiKeyId', args.keyId))
        .collect()

      for (const record of oldRecords) {
        if (record.windowStart < oldWindowStart) {
          await ctx.db.delete(record._id)
        }
      }
    }
  },
})

// ----------------------------------------------------------------------------
// Permission Helpers
// ----------------------------------------------------------------------------

/**
 * Check if an API key has a specific permission
 * Supports wildcard matching: "events:*" matches "events:read", "events:write", etc.
 */
export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.some((perm) => {
    // Full admin access
    if (perm === '*') return true

    // Exact match
    if (perm === required) return true

    // Wildcard match (e.g., "events:*" matches "events:read")
    if (perm.endsWith(':*')) {
      const prefix = perm.slice(0, -1) // Remove the "*"
      return required.startsWith(prefix)
    }

    return false
  })
}
