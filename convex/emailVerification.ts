/**
 * Email Verification System
 * Handles email verification tokens and sending verification emails
 */

import { v } from 'convex/values'
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import { Resend } from 'resend'

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

// Token expiry: 24 hours for email verification
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000

// ============================================================================
// INTERNAL QUERIES - Only callable from actions
// ============================================================================

export const getUserForVerification = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId)
  },
})

export const getRecentVerificationTokens = internalQuery({
  args: {
    userId: v.id('users'),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('verificationTokens')
      .withIndex('by_user_type', (q) =>
        q.eq('userId', args.userId).eq('type', 'email_verification')
      )
      .filter((q) => q.gt(q.field('createdAt'), args.since))
      .collect()
  },
})

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()
  },
})

// ============================================================================
// INTERNAL MUTATIONS - Only callable from actions
// ============================================================================

export const createVerificationToken = internalMutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('verificationTokens', {
      userId: args.userId,
      token: args.token,
      type: 'email_verification',
      expiresAt: args.expiresAt,
      used: false,
      createdAt: Date.now(),
    })
  },
})

// ============================================================================
// PUBLIC ACTIONS
// ============================================================================

/**
 * Send verification email (Action)
 * Creates a verification token and sends email via Resend
 */
export const sendVerificationEmail = internalAction({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Get user details
    const user = await ctx.runQuery(internal.emailVerification.getUserForVerification, {
      userId: args.userId,
    })

    if (!user || !user.email) {
      throw new Error('User not found or email missing')
    }

    // Check if already verified
    if (user.emailVerified) {
      return { success: false, message: 'Email already verified' }
    }

    // Check rate limiting: max 3 emails per hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentTokens = await ctx.runQuery(
      internal.emailVerification.getRecentVerificationTokens,
      {
        userId: args.userId,
        since: oneHourAgo,
      }
    )

    if (recentTokens.length >= 3) {
      throw new Error('Too many verification emails sent. Please try again later.')
    }

    // Generate verification token
    const token = crypto.randomUUID()
    const expiresAt = Date.now() + EMAIL_VERIFICATION_EXPIRY

    // Store token in database
    await ctx.runMutation(internal.emailVerification.createVerificationToken, {
      userId: args.userId,
      token,
      expiresAt,
    })

    // Generate verification URL
    const verificationUrl = `${SITE_URL}/verify-email?token=${token}`

    // Send email via Resend
    try {
      const resend = getResendClient()
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: 'Verify your email - Open Event',
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
                <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>

                <p style="color: #666; font-size: 16px;">Hi${user.name ? ` ${user.name}` : ''},</p>

                <p style="color: #666; font-size: 16px;">
                  Thanks for signing up for Open Event! To complete your registration and start managing your events, please verify your email address.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}"
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 14px 32px;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 600;
                            display: inline-block;
                            font-size: 16px;">
                    Verify Email Address
                  </a>
                </div>

                <p style="color: #999; font-size: 14px; margin-top: 30px;">
                  Or copy and paste this link into your browser:
                </p>
                <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                  ${verificationUrl}
                </p>

                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                <p style="color: #999; font-size: 13px; margin-bottom: 0;">
                  This verification link will expire in 24 hours. If you didn't create an account with Open Event, you can safely ignore this email.
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
        message: 'Verification email sent successfully',
      }
    } catch (error: unknown) {
      console.error('Failed to send verification email:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to send email: ${message}`)
    }
  },
})

/**
 * Resend verification email (Action)
 * For users who didn't receive or lost the verification email
 */
export const resendVerificationEmail = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.runQuery(internal.emailVerification.getUserByEmail, {
      email: args.email.toLowerCase(),
    })

    if (!user) {
      // Don't reveal if email exists or not (security)
      return {
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      }
    }

    // Check if already verified
    if (user.emailVerified) {
      return {
        success: false,
        message: 'This email is already verified',
      }
    }

    // Send verification email via internal action
    await ctx.runAction(internal.emailVerification.sendVerificationEmail, {
      userId: user._id,
    })

    return {
      success: true,
      message: 'Verification email sent successfully',
    }
  },
})

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Verify email token (Mutation)
 * Marks user's email as verified and invalidates the token
 */
export const verifyEmailToken = mutation({
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
      throw new Error('Invalid verification token')
    }

    // Check if token is for email verification
    if (tokenRecord.type !== 'email_verification') {
      throw new Error('Invalid token type')
    }

    // Check if already used
    if (tokenRecord.used) {
      throw new Error('This verification link has already been used')
    }

    // Check if expired
    if (tokenRecord.expiresAt < Date.now()) {
      throw new Error('This verification link has expired. Please request a new one.')
    }

    // Get user
    const user = await ctx.db.get(tokenRecord.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Check if already verified
    if (user.emailVerified) {
      return {
        success: true,
        alreadyVerified: true,
        message: 'Email already verified',
      }
    }

    // Mark token as used
    await ctx.db.patch(tokenRecord._id, {
      used: true,
      usedAt: Date.now(),
    })

    // Mark user email as verified
    await ctx.db.patch(tokenRecord.userId, {
      emailVerified: true,
      emailVerificationTime: Date.now(),
      updatedAt: Date.now(),
    })

    return {
      success: true,
      alreadyVerified: false,
      message: 'Email verified successfully',
      userId: tokenRecord.userId,
    }
  },
})

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Check verification status (Query)
 * Check if a user's email is verified
 */
export const checkVerificationStatus = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user) {
      return { verified: false, email: null }
    }

    return {
      verified: user.emailVerified || false,
      email: user.email || null,
    }
  },
})

/**
 * Cleanup expired tokens (Mutation)
 * Periodic cleanup of expired verification tokens
 */
export const cleanupExpiredTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // Find expired tokens
    const expiredTokens = await ctx.db
      .query('verificationTokens')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect()

    // Delete expired tokens
    for (const token of expiredTokens) {
      await ctx.db.delete(token._id)
    }

    return {
      deleted: expiredTokens.length,
      message: `Cleaned up ${expiredTokens.length} expired tokens`,
    }
  },
})
