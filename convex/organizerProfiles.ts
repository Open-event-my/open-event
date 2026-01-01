import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser } from './lib/auth'

// Save or update organizer profile (onboarding data)
export const saveProfile = mutation({
  args: {
    accessToken: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    organizationType: v.optional(v.string()),
    eventTypes: v.optional(v.array(v.string())),
    eventScale: v.optional(v.string()),
    goals: v.optional(v.array(v.string())),
    experienceLevel: v.optional(v.string()),
    referralSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accessToken, ...profileData } = args
    const user = await getCurrentUser(ctx, accessToken)
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query('organizerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        ...profileData,
        updatedAt: Date.now(),
      })
      return existingProfile._id
    } else {
      // Create new profile
      const profileId = await ctx.db.insert('organizerProfiles', {
        userId: user._id,
        ...profileData,
        createdAt: Date.now(),
      })
      return profileId
    }
  },
})

// Get current user's organizer profile
export const getMyProfile = query({
  args: {
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx, args.accessToken)
    if (!user) {
      return null
    }

    const profile = await ctx.db
      .query('organizerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    return profile
  },
})

// Get profile by user ID - superadmin only
export const getByUserId = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser || currentUser.role !== 'superadmin') {
      throw new Error('Superadmin access required')
    }

    const profile = await ctx.db
      .query('organizerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    return profile
  },
})
