/**
 * Password Reset System
 * Handles password reset tokens and sending reset emails
 */

import { v } from 'convex/values'
import { action, internalMutation, internalQuery, mutation } from './_generated/server'
import { internal } from './_generated/api'
import { Resend } from 'resend'
import bcrypt from 'bcryptjs'
import { Scrypt } from 'lucia'
import { validatePassword } from './lib/passwordValidation'
import type { Id } from './_generated/dataModel'

// Lazy initialize Resend (API key from environment)
function getResendClient() {
  const apiKey = process.env.AUTH_RESEND_KEY
  if (!apiKey) {
    throw new Error('AUTH_RESEND_KEY environment variable is not set')
  }
  return new Resend(apiKey)
}

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'Open Event <noreply@openevent.com>'
const SITE_URL = process.env.SITE_URL || 'http://localhost:5174'

// Token expiry: 1 hour for password reset
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()
  },
})

export const getRecentResetTokens = internalQuery({
  args: {
    userId: v.id('users'),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('verificationTokens')
      .withIndex('by_user_type', (q) => q.eq('userId', args.userId).eq('type', 'password_reset'))
      .filter((q) => q.gt(q.field('createdAt'), args.since))
      .collect()
  },
})

export const getUserForReset = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const checkAuthAccountPassword = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const authAccount = await ctx.db
      .query('authAccounts')
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .first()
    return !!(authAccount && authAccount.secret)
  },
})

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const createResetToken = internalMutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('verificationTokens', {
      userId: args.userId,
      token: args.token,
      type: 'password_reset',
      expiresAt: args.expiresAt,
      used: false,
      createdAt: Date.now(),
    })
  },
})

export const invalidateOldResetTokens = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Find all unused password reset tokens for this user
    const oldTokens = await ctx.db
      .query('verificationTokens')
      .withIndex('by_user_type', (q) => q.eq('userId', args.userId).eq('type', 'password_reset'))
      .filter((q) => q.eq(q.field('used'), false))
      .collect()

    // Mark them as used
    for (const token of oldTokens) {
      await ctx.db.patch(token._id, {
        used: true,
        usedAt: Date.now(),
      })
    }

    return oldTokens.length
  },
})

// ============================================================================
// PUBLIC ACTIONS
// ============================================================================

/**
 * Request password reset (Action)
 * Creates a reset token and sends email
 */
export const requestPasswordReset = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.runQuery(internal.passwordReset.getUserByEmail, {
      email: args.email.toLowerCase(),
    })

    // Don't reveal if email exists or not (security)
    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      }
    }

    // Check if user has a password (might be OAuth only)
    let hasPassword = !!user.passwordHash;
    if (!hasPassword) {
      // Check for Convex Auth account
      hasPassword = await ctx.runQuery(internal.passwordReset.checkAuthAccountPassword, {
        userId: user._id
      });
    }

    if (!hasPassword) {
      // Still return success to not reveal account details
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      }
    }

    // Check rate limiting: max 3 reset emails per hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentTokens = await ctx.runQuery(internal.passwordReset.getRecentResetTokens, {
      userId: user._id,
      since: oneHourAgo,
    })

    if (recentTokens.length >= 3) {
      throw new Error('Too many password reset requests. Please try again later.')
    }

    // Invalidate any existing unused reset tokens
    await ctx.runMutation(internal.passwordReset.invalidateOldResetTokens, {
      userId: user._id,
    })

    // Generate reset token
    const token = crypto.randomUUID()
    const expiresAt = Date.now() + PASSWORD_RESET_EXPIRY

    // Store token in database
    await ctx.runMutation(internal.passwordReset.createResetToken, {
      userId: user._id,
      token,
      expiresAt,
    })

    // Generate reset URL
    const resetUrl = `${SITE_URL}/reset-password?token=${token}`

    // Send email via Resend
    try {
      const resend = getResendClient()
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email!,
        subject: 'Reset your password - Open Event',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Open Event</h1>
              </div>

              <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

                <p style="color: #666; font-size: 16px;">Hi${user.name ? ` ${user.name}` : ''},</p>

                <p style="color: #666; font-size: 16px;">
                  We received a request to reset your password for your Open Event account. Click the button below to create a new password.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}"
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 14px 32px;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 600;
                            display: inline-block;
                            font-size: 16px;">
                    Reset Password
                  </a>
                </div>

                <p style="color: #999; font-size: 14px; margin-top: 30px;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                  ${resetUrl}
                </p>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="color: #999; font-size: 13px; margin-bottom: 0;">
                  <strong>Important:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email - your password will not be changed.
                </p>
              </div>

              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Open Event. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      })

      return {
        success: true,
        message: 'Password reset email sent successfully',
      }
    } catch (error: unknown) {
      console.error('Failed to send password reset email:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to send email: ${message}`)
    }
  },
})

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Verify reset token (Mutation)
 * Check if a reset token is valid without using it
 */
export const verifyResetToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the token
    const tokenRecord = await ctx.db
      .query('verificationTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!tokenRecord) {
      return {
        valid: false,
        errorType: 'invalid',
        error: 'This reset link is invalid. Please check the link or request a new one.',
      }
    }

    // Check if token is for password reset
    if (tokenRecord.type !== 'password_reset') {
      return {
        valid: false,
        errorType: 'invalid',
        error: 'This reset link is invalid. Please check the link or request a new one.',
      }
    }

    // Check if already used
    if (tokenRecord.used) {
      return {
        valid: false,
        errorType: 'used',
        error:
          'This reset link has already been used. If you need to reset your password again, please request a new link.',
      }
    }

    // Check if expired
    if (tokenRecord.expiresAt < Date.now()) {
      return {
        valid: false,
        errorType: 'expired',
        error: 'This reset link has expired. Please request a new password reset link.',
      }
    }

    return { valid: true, userId: tokenRecord.userId }
  },
})

/**
 * Reset password (Action)
 * Uses bcrypt to hash the new password
 */
export const resetPassword = action({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string }> => {
    // Validate password strength (12+ chars with complexity requirements)
    const validation = validatePassword(args.newPassword)
    if (!validation.isValid) {
      throw new Error(`Password requirements not met: ${validation.errors.join(', ')}`)
    }

    // Verify token first (using internal mutation) - throws if invalid
    await ctx.runMutation(internal.passwordReset.verifyResetTokenInternal, {
      token: args.token,
    })

    // Hash new password (this is why we need an action - bcrypt uses setTimeout)
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(args.newPassword, saltRounds)

    // Hash with Scrypt for Convex Auth
    const scrypt = new Scrypt();
    const secret = await scrypt.hash(args.newPassword);

    // Update password and mark token as used
    await ctx.runMutation(internal.passwordReset.updatePasswordAndMarkTokenUsed, {
      token: args.token,
      passwordHash,
      secret,
    })

    return {
      success: true,
      message: 'Password reset successfully',
    }
  },
})

/**
 * Internal mutation to verify and get token info
 */
export const verifyResetTokenInternal = internalMutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query('verificationTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!tokenRecord) {
      throw new Error('Invalid reset token')
    }

    if (tokenRecord.type !== 'password_reset') {
      throw new Error('Invalid token type')
    }

    if (tokenRecord.used) {
      throw new Error('This reset link has already been used')
    }

    if (tokenRecord.expiresAt < Date.now()) {
      throw new Error('This reset link has expired')
    }

    return tokenRecord
  },
})

/**
 * Update password and mark token as used
 */
export const updatePasswordAndMarkTokenUsed = internalMutation({
  args: {
    token: v.string(),
    passwordHash: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    // Get token record
    const tokenRecord = await ctx.db
      .query('verificationTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!tokenRecord) {
      throw new Error('Token not found')
    }

    // Get user for audit log
    const user = await ctx.db.get(tokenRecord.userId)

    // Mark token as used
    await ctx.db.patch(tokenRecord._id, {
      used: true,
      usedAt: Date.now(),
    })

    // Update user password (legacy)
    await ctx.db.patch(tokenRecord.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    })

    // Update Convex Auth account (primary)
    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => 
        q.eq('userId', tokenRecord.userId).eq('provider', 'password')
      )
      .first();

    if (authAccount) {
      await ctx.db.patch(authAccount._id, {
        secret: args.secret,
      });
    } else if (user?.email) {
      // Create new auth account if it doesn't exist (migration)
      await ctx.db.insert('authAccounts', {
        userId: tokenRecord.userId,
        provider: 'password',
        providerAccountId: user.email,
        secret: args.secret,
      });
    }

    // Create audit log entry
    await ctx.db.insert('auditLogs', {
      userId: tokenRecord.userId,
      userEmail: user?.email,
      action: 'password_reset',
      resource: 'user',
      resourceId: tokenRecord.userId.toString(),
      status: 'success',
      metadata: { method: 'email_reset' },
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

// ============================================================================
// CHANGE PASSWORD (for logged-in users)
// ============================================================================

/**
 * Get current user by auth identity
 */
export const getCurrentUserForPasswordChange = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    // Find user by token identifier (Convex Auth format)
    const authAccount = await ctx.db
      .query('authAccounts')
      .filter((q) => q.eq(q.field('providerAccountId'), args.tokenIdentifier))
      .first()

    if (!authAccount) {
      return null
    }

    return await ctx.db.get(authAccount.userId)
  },
})

/**
 * Update password for logged-in user
 */
export const updateUserPassword = internalMutation({
  args: {
    userId: v.id('users'),
    passwordHash: v.string(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Update password (legacy)
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    })

    // Update Convex Auth account (primary)
    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => 
        q.eq('userId', args.userId).eq('provider', 'password')
      )
      .first();

    if (authAccount) {
      await ctx.db.patch(authAccount._id, {
        secret: args.secret,
      });
    } else if (user.email) {
      // Create new auth account if it doesn't exist
      await ctx.db.insert('authAccounts', {
        userId: args.userId,
        provider: 'password',
        providerAccountId: user.email,
        secret: args.secret,
      });
    }

    // Create audit log entry
    await ctx.db.insert('auditLogs', {
      userId: args.userId,
      userEmail: user.email,
      action: 'password_changed',
      resource: 'user',
      resourceId: args.userId.toString(),
      status: 'success',
      metadata: { method: 'settings' },
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Change password (Action) - for logged-in users in settings
 * Requires current password verification
 */
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string }> => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated. Please sign in.')
    }

    // Get user from database (Convex Auth uses subject as userId)
    const userId = identity.subject.split('|')[0] as Id<'users'>
    const user = await ctx.runQuery(internal.passwordReset.getUserForReset, {
      userId,
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user has a password (might be OAuth only)
    if (!user.passwordHash) {
      throw new Error('No password set for this account. You signed up using a social login.')
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(args.currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password strength
    const validation = validatePassword(args.newPassword)
    if (!validation.isValid) {
      throw new Error(`Password requirements not met: ${validation.errors.join(', ')}`)
    }

    // Check that new password is different from current
    const isSamePassword = await bcrypt.compare(args.newPassword, user.passwordHash)
    if (isSamePassword) {
      throw new Error('New password must be different from your current password')
    }

    // Hash new password
    const saltRounds = 10
    const newPasswordHash = await bcrypt.hash(args.newPassword, saltRounds)

    const scrypt = new Scrypt();
    const secret = await scrypt.hash(args.newPassword);

    // Update password
    await ctx.runMutation(internal.passwordReset.updateUserPassword, {
      userId: user._id,
      passwordHash: newPasswordHash,
      secret,
    })

    return {
      success: true,
      message: 'Password changed successfully',
    }
  },
})
