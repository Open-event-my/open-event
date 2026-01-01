/**
 * Admin Management
 *
 * Handles admin account CRUD operations.
 * Only superadmin can create/manage admin accounts.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertRole, ROLE_HIERARCHY } from './lib/auth'

// ============================================================================
// Queries
// ============================================================================

/**
 * List all admin users
 * Only accessible by superadmin
 */
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'superadmin')

    const admins = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'admin'))
      .collect()

    return admins.map((admin) => ({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      status: admin.status || 'active',
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    }))
  },
})

/**
 * Get a single admin by ID
 * Only accessible by superadmin
 */
export const getAdmin = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin')

    const admin = await ctx.db.get(args.id)
    if (!admin || admin.role !== 'admin') {
      return null
    }

    return {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      status: admin.status || 'active',
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    }
  },
})

/**
 * Helper function to deduplicate users by email
 */
function deduplicateUsers<T extends { email?: string; role?: string; updatedAt?: number }>(
  users: T[]
): T[] {
  const emailMap = new Map<string, T>()
  for (const user of users) {
    if (!user.email) continue

    const existing = emailMap.get(user.email)
    if (!existing) {
      emailMap.set(user.email, user)
    } else {
      const existingRoleLevel = ROLE_HIERARCHY[existing.role || 'organizer'] || 1
      const userRoleLevel = ROLE_HIERARCHY[user.role || 'organizer'] || 1

      if (userRoleLevel > existingRoleLevel) {
        emailMap.set(user.email, user)
      } else if (
        userRoleLevel === existingRoleLevel &&
        (user.updatedAt || 0) > (existing.updatedAt || 0)
      ) {
        emailMap.set(user.email, user)
      }
    }
  }
  return Array.from(emailMap.values())
}

/**
 * Get user counts by status (for dashboard stats)
 * Lightweight query that only returns counts
 */
export const getUserCounts = query({
  args: {},
  handler: async (ctx) => {
    await assertRole(ctx, 'admin')

    const users = await ctx.db.query('users').collect()
    const deduplicatedUsers = deduplicateUsers(users)

    const counts = {
      total: deduplicatedUsers.length,
      active: 0,
      suspended: 0,
      pending: 0,
      admins: 0,
      organizers: 0,
    }

    for (const user of deduplicatedUsers) {
      const status = user.status || 'active'
      if (status === 'active') counts.active++
      else if (status === 'suspended') counts.suspended++
      else if (status === 'pending') counts.pending++

      const role = user.role || 'organizer'
      if (role === 'admin' || role === 'superadmin') counts.admins++
      else counts.organizers++
    }

    return counts
  },
})

/**
 * List all users with pagination
 * Accessible by admin and superadmin
 */
export const listAllUsersPaginated = query({
  args: {
    role: v.optional(v.union(v.literal('admin'), v.literal('organizer'), v.literal('superadmin'))),
    status: v.optional(v.union(v.literal('active'), v.literal('suspended'), v.literal('pending'))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let users

    // Filter by role if specified
    if (args.role) {
      users = await ctx.db
        .query('users')
        .withIndex('by_role', (q) => q.eq('role', args.role))
        .collect()
    } else {
      users = await ctx.db.query('users').collect()
    }

    // Deduplicate by email
    let deduplicatedUsers = deduplicateUsers(users)

    // Filter by status in memory if specified
    if (args.status) {
      deduplicatedUsers = deduplicatedUsers.filter((u) => (u.status || 'active') === args.status)
    }

    // Sort by creation date (newest first)
    deduplicatedUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    // Apply pagination
    const limit = args.limit || 20
    const offset = args.offset || 0
    const paginatedUsers = deduplicatedUsers.slice(offset, offset + limit)
    const hasMore = offset + limit < deduplicatedUsers.length

    return {
      items: paginatedUsers.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'organizer',
        status: user.status || 'active',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        suspendedAt: user.suspendedAt,
        suspendedReason: user.suspendedReason,
      })),
      hasMore,
      totalCount: deduplicatedUsers.length,
    }
  },
})

/**
 * List all users (for admin management overview)
 * Accessible by admin and superadmin
 *
 * Deduplicates users by email, keeping the one with the highest role
 * or most recent activity to handle auth sync issues.
 */
export const listAllUsers = query({
  args: {
    role: v.optional(v.union(v.literal('admin'), v.literal('organizer'), v.literal('superadmin'))),
    status: v.optional(v.union(v.literal('active'), v.literal('suspended'), v.literal('pending'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'admin')

    let users

    // Filter by role if specified
    if (args.role) {
      users = await ctx.db
        .query('users')
        .withIndex('by_role', (q) => q.eq('role', args.role))
        .collect()
    } else {
      users = await ctx.db.query('users').collect()
    }

    // Deduplicate by email
    let deduplicatedUsers = deduplicateUsers(users)

    // Filter by status in memory if specified
    if (args.status) {
      deduplicatedUsers = deduplicatedUsers.filter((u) => (u.status || 'active') === args.status)
    }

    // Sort by creation date (newest first)
    deduplicatedUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    // Apply limit
    const limit = args.limit || 100
    const limitedUsers = deduplicatedUsers.slice(0, limit)

    return limitedUsers.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'organizer',
      status: user.status || 'active',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      suspendedAt: user.suspendedAt,
      suspendedReason: user.suspendedReason,
    }))
  },
})

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new admin account
 * Only superadmin can create admins
 *
 * Note: This creates a placeholder user record. The admin will need to
 * complete authentication via the auth flow with this email.
 */
export const createAdmin = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const superadmin = await assertRole(ctx, 'superadmin')

    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()

    if (existingUser) {
      // If user exists, upgrade them to admin
      if (existingUser.role === 'admin' || existingUser.role === 'superadmin') {
        throw new Error('User is already an admin or superadmin')
      }

      await ctx.db.patch(existingUser._id, {
        role: 'admin',
        updatedAt: Date.now(),
      })

      // Log the action
      await ctx.db.insert('moderationLogs', {
        adminId: superadmin._id,
        action: 'admin_created',
        targetType: 'user',
        targetId: existingUser._id,
        reason: `Upgraded existing user to admin`,
        metadata: { previousRole: existingUser.role },
        createdAt: Date.now(),
      })

      return existingUser._id
    }

    // Create new admin user
    const now = Date.now()
    const adminId = await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      role: 'admin',
      status: 'pending', // Pending until they complete auth
      createdAt: now,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: superadmin._id,
      action: 'admin_created',
      targetType: 'user',
      targetId: adminId,
      reason: `Created new admin account`,
      createdAt: now,
    })

    return adminId
  },
})

/**
 * Remove admin role from a user
 * Only superadmin can remove admins
 */
export const removeAdmin = mutation({
  args: {
    adminId: v.id('users'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const superadmin = await assertRole(ctx, 'superadmin')

    const admin = await ctx.db.get(args.adminId)
    if (!admin) {
      throw new Error('User not found')
    }

    if (admin.role !== 'admin') {
      throw new Error('User is not an admin')
    }

    // Cannot remove yourself
    if (admin._id === superadmin._id) {
      throw new Error('Cannot remove yourself as admin')
    }

    // Downgrade to organizer
    await ctx.db.patch(args.adminId, {
      role: 'organizer',
      updatedAt: Date.now(),
    })

    // Log the action
    await ctx.db.insert('moderationLogs', {
      adminId: superadmin._id,
      action: 'admin_removed',
      targetType: 'user',
      targetId: args.adminId,
      reason: args.reason || 'Admin role removed',
      metadata: { previousRole: 'admin' },
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Update admin details
 * Only superadmin can update admin details
 */
export const updateAdmin = mutation({
  args: {
    adminId: v.id('users'),
    name: v.optional(v.string()),
    status: v.optional(v.union(v.literal('active'), v.literal('suspended'), v.literal('pending'))),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin')

    const admin = await ctx.db.get(args.adminId)
    if (!admin) {
      throw new Error('User not found')
    }

    if (admin.role !== 'admin') {
      throw new Error('User is not an admin')
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) {
      updates.name = args.name
    }

    if (args.status !== undefined) {
      updates.status = args.status
    }

    await ctx.db.patch(args.adminId, updates)

    return { success: true }
  },
})

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk suspend multiple users
 * Only accessible by admin and superadmin
 */
export const bulkSuspendUsers = mutation({
  args: {
    userIds: v.array(v.id('users')),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    if (args.userIds.length === 0) {
      throw new Error('No users selected')
    }

    if (args.userIds.length > 50) {
      throw new Error('Cannot suspend more than 50 users at once')
    }

    const now = Date.now()
    const results: { userId: string; success: boolean; error?: string }[] = []

    for (const userId of args.userIds) {
      try {
        const user = await ctx.db.get(userId)
        if (!user) {
          results.push({ userId, success: false, error: 'User not found' })
          continue
        }

        // Cannot suspend admins unless you're a superadmin
        if ((user.role === 'admin' || user.role === 'superadmin') && admin.role !== 'superadmin') {
          results.push({ userId, success: false, error: 'Cannot suspend admin users' })
          continue
        }

        // Cannot suspend superadmins at all
        if (user.role === 'superadmin') {
          results.push({ userId, success: false, error: 'Cannot suspend superadmin users' })
          continue
        }

        // Cannot suspend yourself
        if (userId === admin._id) {
          results.push({ userId, success: false, error: 'Cannot suspend yourself' })
          continue
        }

        await ctx.db.patch(userId, {
          status: 'suspended',
          suspendedAt: now,
          suspendedReason: args.reason,
          updatedAt: now,
        })

        // Log the action
        await ctx.db.insert('moderationLogs', {
          adminId: admin._id,
          action: 'user_suspended',
          targetType: 'user',
          targetId: userId,
          reason: args.reason,
          metadata: { bulk: true },
          createdAt: now,
        })

        results.push({ userId, success: true })
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return {
      success: failCount === 0,
      results,
      summary: {
        total: args.userIds.length,
        succeeded: successCount,
        failed: failCount,
      },
    }
  },
})

/**
 * Bulk unsuspend multiple users
 * Only accessible by admin and superadmin
 */
export const bulkUnsuspendUsers = mutation({
  args: {
    userIds: v.array(v.id('users')),
  },
  handler: async (ctx, args) => {
    const admin = await assertRole(ctx, 'admin')

    if (args.userIds.length === 0) {
      throw new Error('No users selected')
    }

    if (args.userIds.length > 50) {
      throw new Error('Cannot unsuspend more than 50 users at once')
    }

    const now = Date.now()
    const results: { userId: string; success: boolean; error?: string }[] = []

    for (const userId of args.userIds) {
      try {
        const user = await ctx.db.get(userId)
        if (!user) {
          results.push({ userId, success: false, error: 'User not found' })
          continue
        }

        if (user.status !== 'suspended') {
          results.push({ userId, success: false, error: 'User is not suspended' })
          continue
        }

        await ctx.db.patch(userId, {
          status: 'active',
          suspendedAt: undefined,
          suspendedReason: undefined,
          updatedAt: now,
        })

        // Log the action
        await ctx.db.insert('moderationLogs', {
          adminId: admin._id,
          action: 'user_unsuspended',
          targetType: 'user',
          targetId: userId,
          reason: 'Bulk unsuspend',
          metadata: { bulk: true },
          createdAt: now,
        })

        results.push({ userId, success: true })
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return {
      success: failCount === 0,
      results,
      summary: {
        total: args.userIds.length,
        succeeded: successCount,
        failed: failCount,
      },
    }
  },
})

/**
 * Bulk change role for multiple users
 * Only accessible by superadmin
 */
export const bulkChangeRole = mutation({
  args: {
    userIds: v.array(v.id('users')),
    newRole: v.union(v.literal('admin'), v.literal('organizer')),
  },
  handler: async (ctx, args) => {
    const superadmin = await assertRole(ctx, 'superadmin')

    if (args.userIds.length === 0) {
      throw new Error('No users selected')
    }

    if (args.userIds.length > 50) {
      throw new Error('Cannot change role for more than 50 users at once')
    }

    const now = Date.now()
    const results: { userId: string; success: boolean; error?: string }[] = []

    for (const userId of args.userIds) {
      try {
        const user = await ctx.db.get(userId)
        if (!user) {
          results.push({ userId, success: false, error: 'User not found' })
          continue
        }

        // Cannot change superadmin role
        if (user.role === 'superadmin') {
          results.push({ userId, success: false, error: 'Cannot change superadmin role' })
          continue
        }

        // Cannot change your own role
        if (userId === superadmin._id) {
          results.push({ userId, success: false, error: 'Cannot change your own role' })
          continue
        }

        const previousRole = user.role || 'organizer'
        if (previousRole === args.newRole) {
          results.push({ userId, success: false, error: `User already has ${args.newRole} role` })
          continue
        }

        await ctx.db.patch(userId, {
          role: args.newRole,
          updatedAt: now,
        })

        // Log the action
        await ctx.db.insert('moderationLogs', {
          adminId: superadmin._id,
          action: 'user_role_changed',
          targetType: 'user',
          targetId: userId,
          reason: `Bulk role change to ${args.newRole}`,
          metadata: { bulk: true, previousRole, newRole: args.newRole },
          createdAt: now,
        })

        results.push({ userId, success: true })
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.filter((r) => !r.success).length

    return {
      success: failCount === 0,
      results,
      summary: {
        total: args.userIds.length,
        succeeded: successCount,
        failed: failCount,
      },
    }
  },
})
