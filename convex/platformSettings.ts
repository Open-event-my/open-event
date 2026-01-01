/**
 * Platform Settings System
 *
 * Provides CRUD operations for platform-wide configuration settings.
 * Only superadmins can modify settings.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertRole } from './lib/auth'

// ============================================================================
// Types
// ============================================================================

type ValueType = 'string' | 'number' | 'boolean' | 'json'

// Default platform settings
const DEFAULT_SETTINGS = [
  // AI Settings
  {
    key: 'ai.dailyRequestLimit',
    category: 'ai',
    label: 'Daily AI Request Limit',
    description: 'Maximum number of AI requests per user per day',
    valueType: 'number' as ValueType,
    defaultValue: 100,
  },
  {
    key: 'ai.maxTokensPerRequest',
    category: 'ai',
    label: 'Max Tokens Per Request',
    description: 'Maximum tokens allowed per AI request',
    valueType: 'number' as ValueType,
    defaultValue: 4000,
  },
  {
    key: 'ai.enabled',
    category: 'ai',
    label: 'AI Features Enabled',
    description: 'Enable or disable all AI features platform-wide',
    valueType: 'boolean' as ValueType,
    defaultValue: true,
  },

  // Registration Settings
  {
    key: 'registration.mode',
    category: 'registration',
    label: 'Registration Mode',
    description: 'Control how new users can register (open, invite-only, closed)',
    valueType: 'string' as ValueType,
    defaultValue: 'open',
  },
  {
    key: 'registration.requireEmailVerification',
    category: 'registration',
    label: 'Require Email Verification',
    description: 'Require users to verify their email before full access',
    valueType: 'boolean' as ValueType,
    defaultValue: true,
  },
  {
    key: 'registration.allowSocialAuth',
    category: 'registration',
    label: 'Allow Social Authentication',
    description: 'Allow users to sign in with Google, GitHub, etc.',
    valueType: 'boolean' as ValueType,
    defaultValue: true,
  },

  // Feature Flags
  {
    key: 'features.publicEvents',
    category: 'features',
    label: 'Public Events Directory',
    description: 'Enable the public events directory',
    valueType: 'boolean' as ValueType,
    defaultValue: true,
  },
  {
    key: 'features.vendorApplications',
    category: 'features',
    label: 'Vendor Applications',
    description: 'Allow vendors to apply through public forms',
    valueType: 'boolean' as ValueType,
    defaultValue: true,
  },
  {
    key: 'features.sponsorApplications',
    category: 'features',
    label: 'Sponsor Applications',
    description: 'Allow sponsors to apply through public forms',
    valueType: 'boolean' as ValueType,
    defaultValue: true,
  },
  {
    key: 'features.twoFactorAuth',
    category: 'features',
    label: 'Two-Factor Authentication',
    description: 'Enable 2FA for user accounts',
    valueType: 'boolean' as ValueType,
    defaultValue: true,
  },

  // Rate Limiting
  {
    key: 'rateLimit.loginAttempts',
    category: 'rateLimit',
    label: 'Max Login Attempts',
    description: 'Maximum failed login attempts before lockout',
    valueType: 'number' as ValueType,
    defaultValue: 5,
  },
  {
    key: 'rateLimit.lockoutDuration',
    category: 'rateLimit',
    label: 'Lockout Duration (minutes)',
    description: 'How long users are locked out after too many failed attempts',
    valueType: 'number' as ValueType,
    defaultValue: 15,
  },

  // Moderation
  {
    key: 'moderation.autoFlagKeywords',
    category: 'moderation',
    label: 'Auto-Flag Keywords',
    description: 'Keywords that trigger automatic event flagging (JSON array)',
    valueType: 'json' as ValueType,
    defaultValue: [],
  },
  {
    key: 'moderation.requireEventApproval',
    category: 'moderation',
    label: 'Require Event Approval',
    description: 'Require admin approval before events are published',
    valueType: 'boolean' as ValueType,
    defaultValue: false,
  },
]

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all platform settings
 * Accessible by admin and superadmin
 */
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const settings = await ctx.db.query('platformSettings').collect()

    // Group by category
    const grouped: Record<string, typeof settings> = {}
    for (const setting of settings) {
      if (!grouped[setting.category]) {
        grouped[setting.category] = []
      }
      grouped[setting.category].push(setting)
    }

    return grouped
  },
})

/**
 * Get settings by category
 */
export const getByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    return await ctx.db
      .query('platformSettings')
      .withIndex('by_category', (q) => q.eq('category', args.category))
      .collect()
  },
})

/**
 * Get a single setting by key
 */
export const getByKey = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    // Public query - no auth required for reading settings
    // This allows the app to read feature flags without authentication
    const setting = await ctx.db
      .query('platformSettings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (!setting) {
      // Return default value if setting doesn't exist
      const defaultSetting = DEFAULT_SETTINGS.find((s) => s.key === args.key)
      if (defaultSetting) {
        return {
          key: args.key,
          value: defaultSetting.defaultValue,
          valueType: defaultSetting.valueType,
          isDefault: true,
        }
      }
      return null
    }

    return {
      ...setting,
      isDefault: false,
    }
  },
})

/**
 * Get multiple settings by keys
 */
export const getByKeys = query({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, unknown> = {}

    for (const key of args.keys) {
      const setting = await ctx.db
        .query('platformSettings')
        .withIndex('by_key', (q) => q.eq('key', key))
        .first()

      if (setting) {
        results[key] = setting.value
      } else {
        const defaultSetting = DEFAULT_SETTINGS.find((s) => s.key === key)
        if (defaultSetting) {
          results[key] = defaultSetting.defaultValue
        }
      }
    }

    return results
  },
})

// ============================================================================
// Mutations
// ============================================================================

/**
 * Initialize default settings
 * Only superadmin can run this
 */
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await assertRole(ctx, 'superadmin')

    const now = Date.now()
    let created = 0
    let skipped = 0

    for (const setting of DEFAULT_SETTINGS) {
      // Check if setting already exists
      const existing = await ctx.db
        .query('platformSettings')
        .withIndex('by_key', (q) => q.eq('key', setting.key))
        .first()

      if (!existing) {
        await ctx.db.insert('platformSettings', {
          key: setting.key,
          category: setting.category,
          label: setting.label,
          description: setting.description,
          valueType: setting.valueType,
          value: setting.defaultValue,
          defaultValue: setting.defaultValue,
          lastModifiedBy: admin._id,
          lastModifiedAt: now,
          createdAt: now,
        })
        created++
      } else {
        skipped++
      }
    }

    return { created, skipped, total: DEFAULT_SETTINGS.length }
  },
})

/**
 * Update a setting
 * Only superadmin can update settings
 */
export const update = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'superadmin')

    const setting = await ctx.db
      .query('platformSettings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (!setting) {
      throw new Error(`Setting not found: ${args.key}`)
    }

    // Validate value type
    const actualType = typeof args.value
    const expectedType = setting.valueType

    if (expectedType === 'json') {
      // JSON accepts any type
    } else if (expectedType !== actualType) {
      throw new Error(
        `Invalid value type for ${args.key}. Expected ${expectedType}, got ${actualType}`
      )
    }

    const now = Date.now()

    await ctx.db.patch(setting._id, {
      value: args.value,
      lastModifiedBy: admin._id,
      lastModifiedAt: now,
    })

    return { success: true, key: args.key, value: args.value }
  },
})

/**
 * Bulk update settings
 * Only superadmin can update settings
 */
export const bulkUpdate = mutation({
  args: {
    updates: v.array(
      v.object({
        key: v.string(),
        value: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'superadmin')

    const now = Date.now()
    const results: { key: string; success: boolean; error?: string }[] = []

    for (const { key, value } of args.updates) {
      try {
        const setting = await ctx.db
          .query('platformSettings')
          .withIndex('by_key', (q) => q.eq('key', key))
          .first()

        if (!setting) {
          results.push({ key, success: false, error: 'Setting not found' })
          continue
        }

        await ctx.db.patch(setting._id, {
          value,
          lastModifiedBy: admin._id,
          lastModifiedAt: now,
        })

        results.push({ key, success: true })
      } catch (error) {
        results.push({
          key,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    return { results, successCount, totalCount: args.updates.length }
  },
})

/**
 * Reset a setting to its default value
 * Only superadmin can reset settings
 */
export const resetToDefault = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'superadmin')

    const setting = await ctx.db
      .query('platformSettings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (!setting) {
      throw new Error(`Setting not found: ${args.key}`)
    }

    const defaultSetting = DEFAULT_SETTINGS.find((s) => s.key === args.key)
    const defaultValue = defaultSetting?.defaultValue ?? setting.defaultValue

    if (defaultValue === undefined) {
      throw new Error(`No default value found for: ${args.key}`)
    }

    const now = Date.now()

    await ctx.db.patch(setting._id, {
      value: defaultValue,
      lastModifiedBy: admin._id,
      lastModifiedAt: now,
    })

    return { success: true, key: args.key, value: defaultValue }
  },
})

/**
 * Delete a custom setting (non-default)
 * Only superadmin can delete settings
 */
export const remove = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin')

    const setting = await ctx.db
      .query('platformSettings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (!setting) {
      throw new Error(`Setting not found: ${args.key}`)
    }

    // Prevent deletion of default settings
    const isDefaultSetting = DEFAULT_SETTINGS.some((s) => s.key === args.key)
    if (isDefaultSetting) {
      throw new Error('Cannot delete default settings. Use resetToDefault instead.')
    }

    await ctx.db.delete(setting._id)

    return { success: true, key: args.key }
  },
})

/**
 * Create a custom setting
 * Only superadmin can create settings
 */
export const create = mutation({
  args: {
    key: v.string(),
    category: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    valueType: v.union(
      v.literal('string'),
      v.literal('number'),
      v.literal('boolean'),
      v.literal('json')
    ),
    value: v.any(),
    defaultValue: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'superadmin')

    // Check if setting already exists
    const existing = await ctx.db
      .query('platformSettings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (existing) {
      throw new Error(`Setting already exists: ${args.key}`)
    }

    const now = Date.now()

    const settingId = await ctx.db.insert('platformSettings', {
      key: args.key,
      category: args.category,
      label: args.label,
      description: args.description,
      valueType: args.valueType,
      value: args.value,
      defaultValue: args.defaultValue ?? args.value,
      lastModifiedBy: admin._id,
      lastModifiedAt: now,
      createdAt: now,
    })

    return { success: true, id: settingId, key: args.key }
  },
})
