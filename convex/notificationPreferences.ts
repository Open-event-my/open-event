/**
 * Notification Preferences
 *
 * Manage user notification settings for email and in-app notifications.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireAuth } from './lib/auth'

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  emailEnabled: true,
  emailVendorApplications: true,
  emailSponsorApplications: true,
  emailEventReminders: true,
  emailTaskDeadlines: true,
  emailBudgetAlerts: true,
  inAppEnabled: true,
  inAppVendorApplications: true,
  inAppSponsorApplications: true,
  inAppEventReminders: true,
  inAppTaskDeadlines: true,
  inAppBudgetAlerts: true,
  dailyDigest: false,
  digestTime: '09:00',
}

/**
 * Get notification preferences for the authenticated user
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      return null
    }

    // Get existing preferences
    const preferences = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    // Return existing or defaults
    if (preferences) {
      return preferences
    }

    // Return defaults with null _id to indicate not yet saved
    return {
      _id: null,
      userId,
      ...DEFAULT_PREFERENCES,
      createdAt: Date.now(),
    }
  },
})

/**
 * Update notification preferences for the authenticated user
 */
export const update = mutation({
  args: {
    emailEnabled: v.optional(v.boolean()),
    emailVendorApplications: v.optional(v.boolean()),
    emailSponsorApplications: v.optional(v.boolean()),
    emailEventReminders: v.optional(v.boolean()),
    emailTaskDeadlines: v.optional(v.boolean()),
    emailBudgetAlerts: v.optional(v.boolean()),
    inAppEnabled: v.optional(v.boolean()),
    inAppVendorApplications: v.optional(v.boolean()),
    inAppSponsorApplications: v.optional(v.boolean()),
    inAppEventReminders: v.optional(v.boolean()),
    inAppTaskDeadlines: v.optional(v.boolean()),
    inAppBudgetAlerts: v.optional(v.boolean()),
    dailyDigest: v.optional(v.boolean()),
    digestTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    // Check if preferences exist
    const existingPrefs = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (existingPrefs) {
      // Update existing preferences
      await ctx.db.patch(existingPrefs._id, {
        ...args,
        updatedAt: Date.now(),
      })
      return existingPrefs._id
    } else {
      // Create new preferences with defaults
      const newPrefsId = await ctx.db.insert('notificationPreferences', {
        userId,
        ...DEFAULT_PREFERENCES,
        ...args,
        createdAt: Date.now(),
      })
      return newPrefsId
    }
  },
})

/**
 * Reset notification preferences to defaults
 */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    if (!userId) {
      throw new Error('Not authenticated')
    }

    // Check if preferences exist
    const existingPrefs = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (existingPrefs) {
      await ctx.db.patch(existingPrefs._id, {
        ...DEFAULT_PREFERENCES,
        updatedAt: Date.now(),
      })
      return existingPrefs._id
    } else {
      const newPrefsId = await ctx.db.insert('notificationPreferences', {
        userId,
        ...DEFAULT_PREFERENCES,
        createdAt: Date.now(),
      })
      return newPrefsId
    }
  },
})

// Preference field keys that can be toggled
type PreferenceField =
  | 'emailVendorApplications'
  | 'emailSponsorApplications'
  | 'emailEventReminders'
  | 'emailTaskDeadlines'
  | 'emailBudgetAlerts'
  | 'inAppVendorApplications'
  | 'inAppSponsorApplications'
  | 'inAppEventReminders'
  | 'inAppTaskDeadlines'
  | 'inAppBudgetAlerts'

/**
 * Check if a specific notification type should be sent (based on preferences)
 * This is used internally by notification triggers
 */
export async function shouldSendNotification(
  ctx: {
    db: {
      query: (table: string) => {
        withIndex: (
          name: string,
          fn: (q: { eq: (field: string, value: string) => unknown }) => unknown
        ) => { first: () => Promise<Record<string, boolean | string> | null> }
      }
    }
  },
  userId: string,
  notificationType: string,
  channel: 'email' | 'inApp'
): Promise<boolean> {
  const preferences = await ctx.db
    .query('notificationPreferences')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .first()

  // If no preferences, use defaults (all enabled)
  if (!preferences) {
    return true
  }

  // Check master switch
  const masterSwitch = channel === 'email' ? preferences.emailEnabled : preferences.inAppEnabled
  if (!masterSwitch) {
    return false
  }

  // Map notification type to preference field
  const typeToField: Record<string, PreferenceField> = {
    vendor_application: channel === 'email' ? 'emailVendorApplications' : 'inAppVendorApplications',
    sponsor_application:
      channel === 'email' ? 'emailSponsorApplications' : 'inAppSponsorApplications',
    event_reminder: channel === 'email' ? 'emailEventReminders' : 'inAppEventReminders',
    task_deadline: channel === 'email' ? 'emailTaskDeadlines' : 'inAppTaskDeadlines',
    budget_threshold: channel === 'email' ? 'emailBudgetAlerts' : 'inAppBudgetAlerts',
  }

  const field = typeToField[notificationType]
  if (!field) {
    // Unknown type, default to enabled
    return true
  }

  return (preferences[field] as boolean) ?? true
}
