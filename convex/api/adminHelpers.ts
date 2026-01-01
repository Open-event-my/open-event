// ============================================================================
// Admin Helper Functions
// ============================================================================
// These functions help create test data via the Convex Dashboard
// WARNING: Only use these for testing/development!

import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

// ----------------------------------------------------------------------------
// List Users (for finding user IDs)
// ----------------------------------------------------------------------------

/**
 * List all users in the system
 * Use this to find a user ID for creating API keys
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }))
  },
})

// ----------------------------------------------------------------------------
// Create Test API Key (Admin only)
// ----------------------------------------------------------------------------

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'oe_live_'
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

/**
 * Hash API key for storage
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create an API key for testing
 * Run this from the Convex Dashboard!
 *
 * Steps:
 * 1. First run listUsers to find a user ID
 * 2. Then run createTestApiKey with that user ID
 * 3. SAVE THE RETURNED KEY - you won't see it again!
 */
export const createTestApiKey = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Generate the key
    const plainKey = generateApiKey()
    const keyHash = await hashApiKey(plainKey)
    const keyPrefix = plainKey.substring(0, 16)

    // Create API key with full permissions
    await ctx.db.insert('apiKeys', {
      userId: args.userId,
      name: args.name || 'Test API Key',
      description: 'Created via admin helper',
      keyHash,
      keyPrefix,
      permissions: ['*'], // Full access
      status: 'active',
      totalRequests: 0,
      createdAt: Date.now(),
    })

    // Return the plain key (SAVE THIS!)
    return {
      key: plainKey,
      message: '⚠️ SAVE THIS KEY NOW! You will not be able to see it again!',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    }
  },
})

// ----------------------------------------------------------------------------
// Create Test User (if no users exist)
// ----------------------------------------------------------------------------

/**
 * Create a test user for API testing
 * Only use if no users exist!
 */
export const createTestUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), args.email))
      .first()

    if (existing) {
      return {
        userId: existing._id,
        message: 'User already exists',
        existing: true,
      }
    }

    // Create new user
    const userId = await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      role: 'organizer',
      status: 'active',
      createdAt: Date.now(),
    })

    return {
      userId,
      message: 'Test user created',
      existing: false,
    }
  },
})
