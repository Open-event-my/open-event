import { mutation, query } from '../_generated/server'
import { assertRole } from '../lib/auth'
import { v } from 'convex/values'

/**
 * Diagnostic query to check for duplicate user records
 * Run this in Convex Dashboard to see if there are duplicates
 */
export const checkDuplicateUsers = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .collect()

    return {
      email: args.email,
      totalRecords: users.length,
      hasDuplicates: users.length > 1,
      records: users.map((u) => ({
        id: u._id,
        role: u.role || 'not set',
        status: u.status || 'not set',
        name: u.name,
        createdAt: u.createdAt,
      })),
    }
  },
})

/**
 * Find ALL users with duplicate records in the system
 * Returns a list of emails that have more than one user record
 */
export const findAllDuplicates = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query('users').collect()

    // Group by email
    const emailGroups: Record<string, typeof allUsers> = {}
    for (const user of allUsers) {
      if (user.email) {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = []
        }
        emailGroups[user.email].push(user)
      }
    }

    // Filter to only duplicates
    const duplicates = Object.entries(emailGroups)
      .filter(([, users]) => users.length > 1)
      .map(([email, users]) => ({
        email,
        count: users.length,
        records: users.map((u) => ({
          id: u._id,
          role: u.role || 'organizer',
          status: u.status || 'active',
          name: u.name,
          createdAt: u.createdAt,
        })),
        // Determine the "best" role (highest in hierarchy)
        bestRole: users.reduce((best, u) => {
          const roleHierarchy: Record<string, number> = { superadmin: 3, admin: 2, organizer: 1 }
          const currentLevel = roleHierarchy[u.role || 'organizer'] || 1
          const bestLevel = roleHierarchy[best] || 1
          return currentLevel > bestLevel ? u.role || 'organizer' : best
        }, 'organizer'),
      }))

    return {
      totalUsers: allUsers.length,
      duplicateEmails: duplicates.length,
      duplicates,
    }
  },
})

/**
 * Fix ALL duplicate user records by syncing roles
 * For each email with duplicates, all records get the highest role found
 * SECURITY: Requires SUPERADMIN_SETUP_KEY
 */
export const fixAllDuplicates = mutation({
  args: {
    secretKey: v.string(),
    dryRun: v.optional(v.boolean()), // If true, just report what would be fixed
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.SUPERADMIN_SETUP_KEY

    if (!expectedSecret) {
      throw new Error('SUPERADMIN_SETUP_KEY not configured in environment')
    }

    if (args.secretKey !== expectedSecret) {
      throw new Error('Invalid secret key')
    }

    const allUsers = await ctx.db.query('users').collect()

    // Group by email
    const emailGroups: Record<string, typeof allUsers> = {}
    for (const user of allUsers) {
      if (user.email) {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = []
        }
        emailGroups[user.email].push(user)
      }
    }

    type UserRole = 'superadmin' | 'admin' | 'organizer'
    type UserStatus = 'active' | 'suspended' | 'pending'

    const roleHierarchy: Record<UserRole, number> = { superadmin: 3, admin: 2, organizer: 1 }
    const results: Array<{ email: string; recordsFixed: number; newRole: string }> = []
    let totalFixed = 0

    for (const [email, users] of Object.entries(emailGroups)) {
      if (users.length <= 1) continue // No duplicates

      // Find the best role among all records
      let bestRole: UserRole = 'organizer'
      let bestStatus: UserStatus = 'active'
      for (const user of users) {
        const userRole = (user.role || 'organizer') as UserRole
        const currentLevel = roleHierarchy[userRole] || 1
        const bestLevel = roleHierarchy[bestRole] || 1
        if (currentLevel > bestLevel) {
          bestRole = userRole
        }
        // If any record is active, use active status
        if (user.status === 'active') {
          bestStatus = 'active'
        }
      }

      // Sync all records to the best role
      let recordsFixed = 0
      for (const user of users) {
        if (user.role !== bestRole || user.status !== bestStatus) {
          if (!args.dryRun) {
            await ctx.db.patch(user._id, {
              role: bestRole,
              status: bestStatus,
              updatedAt: Date.now(),
            })
          }
          recordsFixed++
          totalFixed++
        }
      }

      if (recordsFixed > 0) {
        results.push({ email, recordsFixed, newRole: bestRole })
      }
    }

    return {
      success: true,
      dryRun: args.dryRun ?? false,
      totalFixed,
      details: results,
      message: args.dryRun
        ? `Would fix ${totalFixed} record(s) across ${results.length} email(s)`
        : `Fixed ${totalFixed} record(s) across ${results.length} email(s)`,
    }
  },
})

/**
 * Approve a vendor application
 * Requires superadmin role
 */
export const approveVendor = mutation({
  args: {
    vendorId: v.id('vendors'),
  },
  handler: async (ctx, args) => {
    // Assert superadmin role
    await assertRole(ctx, 'superadmin')

    // Get vendor
    const vendor = await ctx.db.get(args.vendorId)
    if (!vendor) {
      throw new Error('Vendor not found')
    }

    // Update vendor status to approved
    await ctx.db.patch(args.vendorId, {
      status: 'approved',
    })

    return { success: true }
  },
})

/**
 * One-time setup: Promote a user to superadmin by email
 * This should be run once during initial setup via Convex dashboard
 *
 * SECURITY: Set SUPERADMIN_SETUP_KEY in Convex environment variables
 *
 * Usage in Convex Dashboard > Functions:
 * 1. Go to mutations/superadmin:promoteToSuperadmin
 * 2. Enter: { "email": "your@email.com", "secretKey": "<your-env-secret>" }
 * 3. Run the function
 */
export const promoteToSuperadmin = mutation({
  args: {
    email: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get secret from environment variable for security
    const expectedSecret = process.env.SUPERADMIN_SETUP_KEY

    if (!expectedSecret) {
      throw new Error('SUPERADMIN_SETUP_KEY not configured in environment')
    }

    if (args.secretKey !== expectedSecret) {
      throw new Error('Invalid secret key')
    }

    // Find ALL user records with this email (there might be duplicates from auth)
    const users = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .collect()

    if (users.length === 0) {
      throw new Error('User not found with that email. Make sure you have signed up first.')
    }

    // Update ALL matching records to superadmin
    let updatedCount = 0
    for (const user of users) {
      if (user.role !== 'superadmin') {
        await ctx.db.patch(user._id, {
          role: 'superadmin',
          status: 'active',
          updatedAt: Date.now(),
        })
        updatedCount++
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} user record(s) for ${args.email} to superadmin`,
      totalRecords: users.length,
    }
  },
})

/**
 * Fix duplicate user records by syncing role from one record to all records with same email
 * SECURITY: Set SUPERADMIN_SETUP_KEY in Convex environment variables
 */
export const syncUserRoleByEmail = mutation({
  args: {
    email: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.SUPERADMIN_SETUP_KEY

    if (!expectedSecret) {
      throw new Error('SUPERADMIN_SETUP_KEY not configured in environment')
    }

    if (args.secretKey !== expectedSecret) {
      throw new Error('Invalid secret key')
    }

    // Find all users with this email
    const users = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .collect()

    // Find the one with a role set
    const userWithRole = users.find((u) => u.role)

    if (!userWithRole) {
      return { success: false, message: 'No user with role found' }
    }

    // Sync role to all other records
    let synced = 0
    for (const user of users) {
      if (user._id !== userWithRole._id) {
        await ctx.db.patch(user._id, {
          role: userWithRole.role,
          status: userWithRole.status || 'active',
          updatedAt: Date.now(),
        })
        synced++
      }
    }

    return {
      success: true,
      message: `Synced role "${userWithRole.role}" to ${synced} other record(s)`,
      sourceId: userWithRole._id,
      totalRecords: users.length,
    }
  },
})
