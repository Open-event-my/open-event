import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getCurrentUser } from './lib/auth'
import { createOrganizationInternal } from './organizations'

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
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accessToken, ...profileData } = args
    const user = await getCurrentUser(ctx, accessToken)
    if (!user) {
      throw new Error('Not authenticated')
    }

    // 1. Handle Profile Creation/Update
    const existingProfile = await ctx.db
      .query('organizerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    let profileId
    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        ...profileData,
        updatedAt: Date.now(),
      })
      profileId = existingProfile._id
    } else {
      profileId = await ctx.db.insert('organizerProfiles', {
        userId: user._id,
        ...profileData,
        createdAt: Date.now(),
      })
    }

    // 2. Handle Organization Creation (if name provided and no org exists)
    if (profileData.organizationName) {
      // Check if user already owns an organization
      const existingOrg = await ctx.db
        .query('organizations')
        .withIndex('by_owner', (q) => q.eq('ownerId', user._id))
        .first()

      // Only create if they don't own one yet
      if (!existingOrg) {
        // Use shared logic from organizations.ts
        await createOrganizationInternal(ctx, user, {
          name: profileData.organizationName,
          plan: 'free',
        })
      }
    }

    return profileId
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
