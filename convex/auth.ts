import Google from '@auth/core/providers/google'
import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { AuthProviderMaterializedConfig } from '@convex-dev/auth/server'
import { internal } from './_generated/api'

const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'

/**
 * Organization role hierarchy for comparison
 */
const ORG_ROLE_HIERARCHY: Record<string, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
}

/**
 * Transfer user references from a pre-promoted user to the new authenticated user
 * This prevents orphaned data when the pre-promoted placeholder is deleted
 *
 * Transfers:
 * - organizationMembers entries (patches userId)
 * - organizationInvitations by email (marks as accepted)
 */
async function transferUserReferences(
  ctx: MutationCtx,
  fromUserId: Id<'users'>,
  toUserId: Id<'users'>,
  email: string
): Promise<void> {
  const now = Date.now()

  // 1. Transfer organizationMembers entries
  const memberships = await ctx.db
    .query('organizationMembers')
    .withIndex('by_user', (q) => q.eq('userId', fromUserId))
    .collect()

  for (const membership of memberships) {
    // Check if new user already has membership in this org
    const existingMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', membership.organizationId).eq('userId', toUserId)
      )
      .first()

    if (existingMembership) {
      // Both users have membership - keep the higher role
      const oldRoleLevel = ORG_ROLE_HIERARCHY[membership.role] || 0
      const newRoleLevel = ORG_ROLE_HIERARCHY[existingMembership.role] || 0

      if (oldRoleLevel > newRoleLevel) {
        // Old membership has higher role - upgrade new membership
        console.log(
          `[AUTH] Upgrading membership role from ${existingMembership.role} to ${membership.role}`
        )
        await ctx.db.patch(existingMembership._id, {
          role: membership.role,
          updatedAt: now,
        })
      }

      // Delete the old membership (will be orphaned anyway)
      await ctx.db.delete(membership._id)
      console.log(
        `[AUTH] Deleted duplicate membership ${membership._id} for org ${membership.organizationId}`
      )
    } else {
      // Transfer membership to new user
      await ctx.db.patch(membership._id, {
        userId: toUserId,
        updatedAt: now,
      })
      console.log(
        `[AUTH] Transferred membership ${membership._id} from ${fromUserId} to ${toUserId}`
      )
    }
  }

  // 2. Mark pending invitations for this email as accepted
  const pendingInvitations = await ctx.db
    .query('organizationInvitations')
    .withIndex('by_email', (q) => q.eq('email', email.toLowerCase()))
    .filter((q) => q.eq(q.field('status'), 'pending'))
    .collect()

  for (const invitation of pendingInvitations) {
    // Check if user already has membership in this org (from transfer above or existing)
    const existingMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', invitation.organizationId).eq('userId', toUserId)
      )
      .first()

    if (!existingMembership) {
      // Create membership from invitation
      await ctx.db.insert('organizationMembers', {
        organizationId: invitation.organizationId,
        userId: toUserId,
        role: invitation.role as 'admin' | 'owner' | 'manager' | 'member' | 'viewer',
        invitedBy: invitation.invitedBy,
        invitedAt: invitation.createdAt,
        joinedAt: now,
        status: 'active',
        createdAt: now,
      })
      console.log(`[AUTH] Created membership from invitation for org ${invitation.organizationId}`)
    }

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: 'accepted',
      acceptedAt: now,
    })

    // Decrement pending invitation counter on the organization
    const org = await ctx.db.get(invitation.organizationId)
    if (org && org.pendingInvitationCount && org.pendingInvitationCount > 0) {
      await ctx.db.patch(invitation.organizationId, {
        pendingInvitationCount: org.pendingInvitationCount - 1,
        updatedAt: now,
      })
    }

    console.log(`[AUTH] Accepted invitation ${invitation._id} for email ${email}`)
  }

  if (memberships.length > 0 || pendingInvitations.length > 0) {
    console.log(
      `[AUTH] Transferred ${memberships.length} memberships and ${pendingInvitations.length} invitations from ${fromUserId} to ${toUserId}`
    )
  }
}

/**
 * Helper to check for pre-promoted users and get inherited role
 * This handles the case where an admin promotes an email before the user signs up
 *
 * @param shouldConsume - If true, transfers references and deletes the pre-existing user record
 */
async function getInheritedRole(
  ctx: MutationCtx,
  email: string | undefined,
  currentUserId: Id<'users'>,
  shouldConsume: boolean = false
): Promise<'organizer' | 'admin' | 'superadmin'> {
  if (!email) return 'organizer'

  // Find any pre-existing user records with this email (from admin promotion)
  const preExistingUsers = await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', email))
    .filter((q) => q.neq(q.field('_id'), currentUserId))
    .collect()

  // Find the highest role among pre-existing users
  let hasSuperadmin = false
  let hasAdmin = false

  for (const preUser of preExistingUsers) {
    if (preUser.role === 'superadmin') {
      hasSuperadmin = true
      break
    } else if (preUser.role === 'admin') {
      hasAdmin = true
    }
  }

  const inheritedRole: 'organizer' | 'admin' | 'superadmin' = hasSuperadmin
    ? 'superadmin'
    : hasAdmin
      ? 'admin'
      : 'organizer'

  if (shouldConsume) {
    // Transfer references and delete orphaned pre-promoted records
    for (const preUser of preExistingUsers) {
      // SECURITY FIX: Transfer any data references before deletion
      await transferUserReferences(ctx, preUser._id, currentUserId, email)

      console.log('[AUTH] Deleting consumed pre-promoted user:', preUser._id)
      await ctx.db.delete(preUser._id)
    }

    if (inheritedRole !== 'organizer') {
      console.log('[AUTH] Inheriting role from pre-promoted user:', inheritedRole)
    }
  }

  return inheritedRole
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    // Email/Password authentication
    Password,
    // Google OAuth
    Google,
  ],
  callbacks: {
    async redirect({ redirectTo }: { redirectTo: string }): Promise<string> {
      // Handle relative paths by prepending SITE_URL
      if (redirectTo.startsWith('/')) {
        return `${SITE_URL}${redirectTo}`
      }
      // Allow URLs that start with SITE_URL
      if (redirectTo.startsWith(SITE_URL)) {
        return redirectTo
      }
      // Default to SITE_URL
      return SITE_URL
    },
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      args: {
        userId: Id<'users'>
        existingUserId: Id<'users'> | null
        type: 'oauth' | 'credentials' | 'email' | 'phone' | 'verification'
        provider: AuthProviderMaterializedConfig
        profile: Record<string, unknown> & {
          email?: string
          phone?: string
          emailVerified?: boolean
          phoneVerified?: boolean
        }
        shouldLink?: boolean
      }
    ): Promise<void> {
      const { userId, existingUserId } = args

      // Verify user exists
      const user = await ctx.db.get(userId)

      if (!user) {
        // This should not happen if Convex Auth is working correctly
        console.error('[AUTH] CRITICAL: User not found in afterUserCreatedOrUpdated:', userId)
        return
      }

      // Determine if we should attempt to inherit a role
      // SECURITY: Only inherit roles if the email is verified
      const isEmailVerified = args.profile.emailVerified || args.type === 'oauth'

      if (!existingUserId) {
        // New user
        let finalRole: 'organizer' | 'admin' | 'superadmin' = 'organizer'

        if (isEmailVerified) {
          // Check for pre-promoted admin role and consume it
          finalRole = await getInheritedRole(ctx, args.profile.email, userId, true)
        } else {
          // Check if there IS a role waiting, but don't consume it
          const pendingRole = await getInheritedRole(ctx, args.profile.email, userId, false)
          if (pendingRole !== 'organizer') {
            console.log(
              `[AUTH] User ${userId} has pending role ${pendingRole} but email not verified. Keeping as organizer.`
            )
          }

          // Schedule verification email for new unverified users
          // We only send this for email/password signups that aren't already verified
          if (args.type === 'credentials' || args.type === 'email') {
            console.log('[AUTH] Scheduling verification email for new user:', userId)
            await ctx.scheduler.runAfter(0, internal.emailVerification.sendVerificationEmail, {
              userId,
            })
          }
        }

        console.log('[AUTH] Setting role for new user:', finalRole)

        await ctx.db.patch(userId, {
          role: finalRole,
          status: 'active',
          createdAt: Date.now(),
          // Ensure email/name are set if missing (though Auth should handle this)
          email: args.profile.email || user.email,
          name: (args.profile.name as string) || user.name,
        })

        // Log signup/login for new user
        await ctx.runMutation(internal.auditLog.log, {
          userId,
          userEmail: args.profile.email,
          action: args.type === 'oauth' ? 'login' : 'signup',
          resource: 'auth',
          status: 'success',
          metadata: {
            authType: args.type,
            provider: args.provider.id,
            isNewUser: true,
            assignedRole: finalRole,
          },
        })
      } else {
        // Existing user

        // Check if we should upgrade their role (e.g. they just verified their email)
        if (isEmailVerified && user.role === 'organizer') {
          const inheritedRole = await getInheritedRole(ctx, args.profile.email, userId, true)
          if (inheritedRole !== 'organizer') {
            console.log('[AUTH] Upgrading existing user role after verification:', inheritedRole)
            await ctx.db.patch(userId, { role: inheritedRole })
          }
        }

        console.log('[AUTH] Updating timestamp for existing user')
        await ctx.db.patch(userId, {
          updatedAt: Date.now(),
        })

        // Log login for existing user
        await ctx.runMutation(internal.auditLog.log, {
          userId,
          userEmail: args.profile.email,
          action: 'login',
          resource: 'auth',
          status: 'success',
          metadata: {
            authType: args.type,
            provider: args.provider.id,
            isExistingUser: true,
          },
        })
      }
    },
  },
})

// Export helper functions for testing
export const _testHelpers = {
  transferUserReferences,
  getInheritedRole,
  ORG_ROLE_HIERARCHY,
}
