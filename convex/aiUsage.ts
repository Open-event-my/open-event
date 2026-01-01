import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'
import { getCurrentUser, isAdminRole } from './lib/auth'
import type { Id } from './_generated/dataModel'

// ============================================================================
// Configuration - Easy to modify rate limiting settings
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  // Default daily limit for free users
  FREE_DAILY_LIMIT: 5,
  // Limit for premium users (future use)
  PREMIUM_DAILY_LIMIT: 50,
  // Unlimited marker for admins
  UNLIMITED: 999,
  // Warning thresholds (percentage of limit)
  WARNING_THRESHOLD: 0.6, // 60% - show amber warning
  CRITICAL_THRESHOLD: 0.9, // 90% - show red warning
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get next reset time (midnight UTC)
 */
function getNextResetTime(): number {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.getTime()
}

/**
 * Calculate time remaining until reset in human-readable format
 */
function getTimeUntilReset(): { hours: number; minutes: number; formatted: string } {
  const now = Date.now()
  const resetTime = getNextResetTime()
  const diff = resetTime - now

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return {
    hours,
    minutes,
    formatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
  }
}

/**
 * Get usage status based on percentage used
 */
function getUsageStatus(
  used: number,
  limit: number
): 'normal' | 'warning' | 'critical' | 'exceeded' {
  if (used >= limit) return 'exceeded'
  const percentage = used / limit
  if (percentage >= RATE_LIMIT_CONFIG.CRITICAL_THRESHOLD) return 'critical'
  if (percentage >= RATE_LIMIT_CONFIG.WARNING_THRESHOLD) return 'warning'
  return 'normal'
}

// ============================================================================
// User Queries
// ============================================================================

/**
 * Get current user's AI usage stats with detailed information
 */
export const getMyUsage = query({
  args: {},
  handler: async (ctx) => {
    let user
    try {
      user = await getCurrentUser(ctx)
    } catch {
      // Auth error (e.g., invalid session) - treat as unauthenticated
      return null
    }
    if (!user) return null

    const today = getTodayDateString()
    const timeUntilReset = getTimeUntilReset()

    // Check if user is admin (unlimited access)
    if (isAdminRole(user.role)) {
      return {
        promptsUsed: 0,
        promptsRemaining: RATE_LIMIT_CONFIG.UNLIMITED,
        dailyLimit: RATE_LIMIT_CONFIG.UNLIMITED,
        totalPrompts: 0,
        resetsAt: getNextResetTime(),
        timeUntilReset,
        status: 'normal' as const,
        isAdmin: true,
        percentageUsed: 0,
      }
    }

    // Get usage record
    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (!usage) {
      // No usage record yet - user has full quota
      return {
        promptsUsed: 0,
        promptsRemaining: RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT,
        dailyLimit: RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT,
        totalPrompts: 0,
        resetsAt: getNextResetTime(),
        timeUntilReset,
        status: 'normal' as const,
        isAdmin: false,
        percentageUsed: 0,
      }
    }

    // Check if we need to reset (new day)
    const promptCount = usage.lastResetDate === today ? usage.promptCount : 0
    const dailyLimit = usage.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT
    const remaining = Math.max(0, dailyLimit - promptCount)
    const percentageUsed = Math.round((promptCount / dailyLimit) * 100)

    return {
      promptsUsed: promptCount,
      promptsRemaining: remaining,
      dailyLimit,
      totalPrompts: usage.totalPrompts ?? 0,
      resetsAt: getNextResetTime(),
      timeUntilReset,
      status: getUsageStatus(promptCount, dailyLimit),
      isAdmin: false,
      percentageUsed,
      lastUsedAt: usage.updatedAt,
    }
  },
})

/**
 * Check if user can make an AI request (has remaining quota)
 * Returns detailed rate limit information for better error handling
 */
export const checkRateLimit = query({
  args: {
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    let userId: Id<'users'> | null = args.userId ?? null
    let userRole: string | undefined

    if (!userId) {
      let user
      try {
        user = await getCurrentUser(ctx)
      } catch {
        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          reason: 'Authentication error - please sign in again',
          code: 'AUTH_ERROR',
        }
      }
      if (!user) {
        return {
          allowed: false,
          remaining: 0,
          limit: 0,
          reason: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        }
      }
      userId = user._id
      userRole = user.role

      // Admins have unlimited access
      if (isAdminRole(userRole)) {
        return {
          allowed: true,
          remaining: RATE_LIMIT_CONFIG.UNLIMITED,
          limit: RATE_LIMIT_CONFIG.UNLIMITED,
          reason: 'Admin access - unlimited prompts',
          code: 'ADMIN_ACCESS',
        }
      }
    }

    const today = getTodayDateString()
    const timeUntilReset = getTimeUntilReset()

    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', userId!))
      .first()

    if (!usage) {
      return {
        allowed: true,
        remaining: RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT,
        limit: RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT,
        code: 'OK',
      }
    }

    // Check if we need to reset (new day)
    const promptCount = usage.lastResetDate === today ? usage.promptCount : 0
    const dailyLimit = usage.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT
    const remaining = dailyLimit - promptCount

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        limit: dailyLimit,
        reason: `Daily limit of ${dailyLimit} prompts reached. Resets in ${timeUntilReset.formatted}.`,
        code: 'LIMIT_EXCEEDED',
        resetsAt: getNextResetTime(),
        timeUntilReset,
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      limit: dailyLimit,
      code: 'OK',
      status: getUsageStatus(promptCount, dailyLimit),
    }
  },
})

// ============================================================================
// User Mutations
// ============================================================================

/**
 * Increment usage count after a successful AI request
 */
export const incrementUsage = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return { success: false, error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }

    // Admins don't count against limits
    if (isAdminRole(user.role)) {
      return { success: true, code: 'ADMIN_SKIP' }
    }

    const today = getTodayDateString()
    const now = Date.now()

    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    const dailyLimit = usage?.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT

    if (!usage) {
      await ctx.db.insert('aiUsage', {
        userId: user._id,
        promptCount: 1,
        lastResetDate: today,
        totalPrompts: 1,
        createdAt: now,
        updatedAt: now,
      })
      return {
        success: true,
        newCount: 1,
        remaining: dailyLimit - 1,
        code: 'OK',
      }
    }

    const isNewDay = usage.lastResetDate !== today
    const newCount = isNewDay ? 1 : usage.promptCount + 1

    await ctx.db.patch(usage._id, {
      promptCount: newCount,
      lastResetDate: today,
      totalPrompts: (usage.totalPrompts ?? 0) + 1,
      updatedAt: now,
    })

    return {
      success: true,
      newCount,
      remaining: Math.max(0, dailyLimit - newCount),
      code: 'OK',
    }
  },
})

/**
 * Internal mutation to increment usage (for HTTP actions)
 */
export const incrementUsageInternal = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const today = getTodayDateString()
    const now = Date.now()

    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    const dailyLimit = usage?.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT

    if (!usage) {
      await ctx.db.insert('aiUsage', {
        userId: args.userId,
        promptCount: 1,
        lastResetDate: today,
        totalPrompts: 1,
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, newCount: 1, remaining: dailyLimit - 1 }
    }

    const isNewDay = usage.lastResetDate !== today
    const newCount = isNewDay ? 1 : usage.promptCount + 1

    await ctx.db.patch(usage._id, {
      promptCount: newCount,
      lastResetDate: today,
      totalPrompts: (usage.totalPrompts ?? 0) + 1,
      updatedAt: now,
    })

    return {
      success: true,
      newCount,
      remaining: Math.max(0, dailyLimit - newCount),
    }
  },
})

/**
 * Atomic check-and-increment for HTTP actions
 * Prevents race conditions by checking AND incrementing in a single transaction
 */
export const checkAndIncrementUsage = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const today = getTodayDateString()
    const now = Date.now()
    const timeUntilReset = getTimeUntilReset()

    // Get user to check role
    const user = await ctx.db.get(args.userId)
    if (!user) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        reason: 'User not found',
        code: 'USER_NOT_FOUND',
      }
    }

    // Admins have unlimited access - no need to track
    if (isAdminRole(user.role)) {
      return {
        allowed: true,
        remaining: RATE_LIMIT_CONFIG.UNLIMITED,
        limit: RATE_LIMIT_CONFIG.UNLIMITED,
        reason: 'Admin access - unlimited prompts',
        code: 'ADMIN_ACCESS',
      }
    }

    // Get or create usage record
    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    const dailyLimit = usage?.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT

    if (!usage) {
      // First usage ever - create record with count of 1
      await ctx.db.insert('aiUsage', {
        userId: args.userId,
        promptCount: 1,
        lastResetDate: today,
        totalPrompts: 1,
        createdAt: now,
        updatedAt: now,
      })
      return {
        allowed: true,
        remaining: dailyLimit - 1,
        limit: dailyLimit,
        code: 'OK',
      }
    }

    // Check if we need to reset (new day)
    const isNewDay = usage.lastResetDate !== today
    const currentCount = isNewDay ? 0 : usage.promptCount

    // Check if limit exceeded BEFORE incrementing
    if (currentCount >= dailyLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: dailyLimit,
        reason: `Daily limit of ${dailyLimit} prompts reached. Resets in ${timeUntilReset.formatted}.`,
        code: 'LIMIT_EXCEEDED',
        resetsAt: getNextResetTime(),
        timeUntilReset,
      }
    }

    // Increment atomically
    const newCount = currentCount + 1
    await ctx.db.patch(usage._id, {
      promptCount: newCount,
      lastResetDate: today,
      totalPrompts: (usage.totalPrompts ?? 0) + 1,
      updatedAt: now,
    })

    return {
      allowed: true,
      remaining: Math.max(0, dailyLimit - newCount),
      limit: dailyLimit,
      code: 'OK',
    }
  },
})

// ============================================================================
// Admin Queries - Monitoring & Analytics
// ============================================================================

/**
 * Admin: Get all users' AI usage stats for monitoring
 */
export const getAllUsageStats = query({
  args: {
    limit: v.optional(v.number()),
    sortBy: v.optional(
      v.union(v.literal('promptCount'), v.literal('totalPrompts'), v.literal('updatedAt'))
    ),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx)
    if (!admin || !isAdminRole(admin.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const today = getTodayDateString()
    const limit = args.limit ?? 50

    // Get all usage records
    const usageRecords = await ctx.db.query('aiUsage').collect()

    // Get user details for each usage record
    const usageWithUsers = await Promise.all(
      usageRecords.map(async (usage) => {
        const user = await ctx.db.get(usage.userId)
        const isToday = usage.lastResetDate === today
        const dailyLimit = usage.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT
        const todayCount = isToday ? usage.promptCount : 0

        return {
          userId: usage.userId,
          userName: user?.name ?? 'Unknown',
          userEmail: user?.email ?? 'Unknown',
          userRole: user?.role ?? 'organizer',
          todayUsage: todayCount,
          dailyLimit,
          totalPrompts: usage.totalPrompts ?? 0,
          percentageUsed: Math.round((todayCount / dailyLimit) * 100),
          status: getUsageStatus(todayCount, dailyLimit),
          lastUsedAt: usage.updatedAt,
          lastResetDate: usage.lastResetDate,
        }
      })
    )

    // Sort based on preference
    const sortBy = args.sortBy ?? 'totalPrompts'
    usageWithUsers.sort((a, b) => {
      if (sortBy === 'promptCount') return b.todayUsage - a.todayUsage
      if (sortBy === 'totalPrompts') return b.totalPrompts - a.totalPrompts
      if (sortBy === 'updatedAt') return (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0)
      return 0
    })

    return usageWithUsers.slice(0, limit)
  },
})

/**
 * Admin: Get aggregated usage statistics
 */
export const getUsageAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getCurrentUser(ctx)
    if (!admin || !isAdminRole(admin.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const today = getTodayDateString()
    const usageRecords = await ctx.db.query('aiUsage').collect()

    // Calculate aggregated stats
    let totalPromptsAllTime = 0
    let totalPromptsToday = 0
    let activeUsersToday = 0
    let usersAtLimit = 0
    const totalUsers = usageRecords.length

    for (const usage of usageRecords) {
      totalPromptsAllTime += usage.totalPrompts ?? 0

      if (usage.lastResetDate === today) {
        totalPromptsToday += usage.promptCount
        activeUsersToday++

        const dailyLimit = usage.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT
        if (usage.promptCount >= dailyLimit) {
          usersAtLimit++
        }
      }
    }

    return {
      totalUsers,
      activeUsersToday,
      usersAtLimit,
      totalPromptsToday,
      totalPromptsAllTime,
      averagePromptsPerUser: totalUsers > 0 ? Math.round(totalPromptsAllTime / totalUsers) : 0,
      averagePromptsToday:
        activeUsersToday > 0 ? Math.round(totalPromptsToday / activeUsersToday) : 0,
      defaultDailyLimit: RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT,
      config: RATE_LIMIT_CONFIG,
    }
  },
})

/**
 * Admin: Get usage for a specific user
 */
export const getUserUsage = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx)
    if (!admin || !isAdminRole(admin.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const user = await ctx.db.get(args.userId)
    if (!user) {
      return null
    }

    const today = getTodayDateString()
    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    if (!usage) {
      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        usage: {
          todayUsage: 0,
          dailyLimit: RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT,
          totalPrompts: 0,
          percentageUsed: 0,
          status: 'normal' as const,
          hasCustomLimit: false,
        },
      }
    }

    const isToday = usage.lastResetDate === today
    const dailyLimit = usage.dailyLimit ?? RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT
    const todayCount = isToday ? usage.promptCount : 0

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      usage: {
        todayUsage: todayCount,
        dailyLimit,
        totalPrompts: usage.totalPrompts ?? 0,
        percentageUsed: Math.round((todayCount / dailyLimit) * 100),
        status: getUsageStatus(todayCount, dailyLimit),
        hasCustomLimit: usage.dailyLimit !== undefined,
        lastUsedAt: usage.updatedAt,
        createdAt: usage.createdAt,
      },
    }
  },
})

// ============================================================================
// Admin Mutations - Management
// ============================================================================

/**
 * Admin: Set custom daily limit for a user
 */
export const setUserLimit = mutation({
  args: {
    userId: v.id('users'),
    dailyLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx)
    if (!admin || !isAdminRole(admin.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    if (args.dailyLimit < 0 || args.dailyLimit > 1000) {
      throw new Error('Invalid limit: must be between 0 and 1000')
    }

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    const now = Date.now()

    if (!usage) {
      await ctx.db.insert('aiUsage', {
        userId: args.userId,
        promptCount: 0,
        lastResetDate: getTodayDateString(),
        dailyLimit: args.dailyLimit,
        totalPrompts: 0,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(usage._id, {
        dailyLimit: args.dailyLimit,
        updatedAt: now,
      })
    }

    return {
      success: true,
      userId: args.userId,
      newLimit: args.dailyLimit,
      updatedBy: admin._id,
    }
  },
})

/**
 * Admin: Reset a user's daily usage
 */
export const resetUserUsage = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx)
    if (!admin || !isAdminRole(admin.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    if (!usage) {
      return {
        success: true,
        message: 'No usage record to reset',
        userId: args.userId,
      }
    }

    const previousCount = usage.promptCount
    await ctx.db.patch(usage._id, {
      promptCount: 0,
      lastResetDate: getTodayDateString(),
      updatedAt: Date.now(),
    })

    return {
      success: true,
      userId: args.userId,
      previousCount,
      resetBy: admin._id,
    }
  },
})

/**
 * Admin: Reset all users' daily usage (emergency use)
 */
export const resetAllUsage = mutation({
  args: {
    confirm: v.literal('CONFIRM_RESET_ALL'),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx)
    if (!admin || admin.role !== 'superadmin') {
      throw new Error('Unauthorized: Superadmin access required')
    }

    // Extra confirmation required
    if (args.confirm !== 'CONFIRM_RESET_ALL') {
      throw new Error('Confirmation required')
    }

    const usageRecords = await ctx.db.query('aiUsage').collect()
    const today = getTodayDateString()
    const now = Date.now()

    let resetCount = 0
    for (const usage of usageRecords) {
      if (usage.promptCount > 0) {
        await ctx.db.patch(usage._id, {
          promptCount: 0,
          lastResetDate: today,
          updatedAt: now,
        })
        resetCount++
      }
    }

    return {
      success: true,
      resetCount,
      totalRecords: usageRecords.length,
      resetBy: admin._id,
      resetAt: now,
    }
  },
})

/**
 * Admin: Remove custom limit (revert to default)
 */
export const removeCustomLimit = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const admin = await getCurrentUser(ctx)
    if (!admin || !isAdminRole(admin.role)) {
      throw new Error('Unauthorized: Admin access required')
    }

    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    if (!usage) {
      return {
        success: true,
        message: 'No usage record found',
      }
    }

    // Remove the custom limit by setting it to undefined (will use default)
    await ctx.db.patch(usage._id, {
      dailyLimit: undefined,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      userId: args.userId,
      newLimit: RATE_LIMIT_CONFIG.FREE_DAILY_LIMIT,
      message: 'Reverted to default limit',
    }
  },
})
