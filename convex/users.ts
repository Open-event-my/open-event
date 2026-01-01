import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { assertRole, getCurrentUser } from './lib/auth'
import { isValidEmail } from './lib/emailValidation'

// List users - superadmin only
export const list = query({
  args: {
    role: v.optional(v.union(v.literal('superadmin'), v.literal('organizer'))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user || user.role !== 'superadmin') {
      throw new Error('Superadmin access required')
    }

    const users = await ctx.db.query('users').collect()
    if (args.role) {
      return users.filter((u) => u.role === args.role)
    }
    return users
  },
})

// Get user by ID - superadmin only, or own profile
export const get = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    // Allow users to get their own profile, or superadmin can get any profile
    if (currentUser._id !== args.id && currentUser.role !== 'superadmin') {
      throw new Error('Access denied')
    }

    return await ctx.db.get(args.id)
  },
})

// Get user by email - internal use only (for auth lookup)
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()
  },
})

// Create user - superadmin only
export const create = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal('superadmin'), v.literal('organizer')),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertRole(ctx, 'superadmin')

    // Validate email format
    if (!isValidEmail(args.email)) {
      throw new Error('Invalid email format')
    }

    // Check if email already exists
    const existingUser = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()
    if (existingUser) {
      throw new Error('Email already exists')
    }

    return await ctx.db.insert('users', {
      ...args,
      createdAt: Date.now(),
    })
  },
})

// Update user - superadmin only, or users can update own name/image
export const update = mutation({
  args: {
    id: v.id('users'),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal('superadmin'), v.literal('organizer'))),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx)
    if (!currentUser) {
      throw new Error('Authentication required')
    }

    const { id, ...updates } = args

    // Only superadmin can update role or update other users
    if (currentUser.role !== 'superadmin') {
      if (currentUser._id !== id) {
        throw new Error('Cannot update other users')
      }
      if (updates.role !== undefined) {
        throw new Error('Cannot change your own role')
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    })
  },
})
