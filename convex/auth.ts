import Google from '@auth/core/providers/google'
import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { AuthProviderMaterializedConfig } from '@convex-dev/auth/server'
import { internal } from './_generated/api'

const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'

// Helper to check for pre-promoted users and get inherited role
// This handles the case where an admin promotes an email before the user signs up
async function getInheritedRole(
  ctx: MutationCtx,
  email: string | undefined,
  currentUserId: Id<'users'>
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

  // Delete orphaned pre-promoted records
  for (const preUser of preExistingUsers) {
    console.log('[AUTH] Deleting orphaned pre-promoted user:', preUser._id)
    await ctx.db.delete(preUser._id)
  }

  if (inheritedRole !== 'organizer') {
    console.log('[AUTH] Inheriting role from pre-promoted user:', inheritedRole)
  }

  return inheritedRole
}

// #region agent log
// Debug: Check JWT_PRIVATE_KEY and JWKS environment variables
const jwtPrivateKey = process.env.JWT_PRIVATE_KEY
const convexAuthPrivateKey = process.env.CONVEX_AUTH_PRIVATE_KEY
const jwks = process.env.JWKS
const jwksParsed = jwks ? (() => { try { return JSON.parse(jwks); } catch { return null; } })() : null
const jwtKeyTrimmed = jwtPrivateKey?.trim()
const hasBeginMarker = jwtPrivateKey?.includes('-----BEGIN PRIVATE KEY-----') || false
const hasEndMarker = jwtPrivateKey?.includes('-----END PRIVATE KEY-----') || false
const startsWithBegin = jwtKeyTrimmed?.startsWith('-----BEGIN PRIVATE KEY-----') || false
const endsWithEnd = jwtKeyTrimmed?.endsWith('-----END PRIVATE KEY-----') || false
const hasNewlines = jwtPrivateKey?.includes('\n') || false
const hasCarriageReturn = jwtPrivateKey?.includes('\r') || false
const lineCount = jwtPrivateKey?.split(/\r?\n/).length || 0
const firstLine = jwtPrivateKey?.split(/\r?\n/)[0] || 'null'
const lastLine = jwtPrivateKey?.split(/\r?\n/).filter(l => l.trim()).pop() || 'null'

console.log('[DEBUG-AUTH] JWT key env check:', JSON.stringify({
  location: 'convex/auth.ts:9',
  message: 'JWT key env check',
  data: {
    hasJwtPrivateKey: !!jwtPrivateKey,
    jwtKeyLength: jwtPrivateKey?.length || 0,
    jwtKeyTrimmedLength: jwtKeyTrimmed?.length || 0,
    jwtKeyFirst100: jwtPrivateKey?.substring(0, 100) || 'null',
    jwtKeyLast100: jwtPrivateKey?.substring(Math.max(0, (jwtPrivateKey?.length || 0) - 100)) || 'null',
    firstLine,
    lastLine,
    hasBeginMarker,
    hasEndMarker,
    startsWithBegin,
    endsWithEnd,
    hasNewlines,
    hasCarriageReturn,
    lineCount,
    isProperlyFormatted: hasBeginMarker && hasEndMarker && startsWithBegin && endsWithEnd,
    hasConvexAuthPrivateKey: !!convexAuthPrivateKey,
    convexAuthKeyLength: convexAuthPrivateKey?.length || 0,
    hasJwks: !!jwks,
    jwksLength: jwks?.length || 0,
    jwksIsValidJson: !!jwksParsed,
    jwksHasKeys: jwksParsed && typeof jwksParsed === 'object' && 'keys' in jwksParsed,
    hasSiteUrl: !!process.env.SITE_URL,
    siteUrl: process.env.SITE_URL,
  },
  timestamp: Date.now(),
  sessionId: 'debug-session',
  runId: 'pre-init',
  hypothesisId: 'A',
}))
// #endregion

// #region agent log
// Debug: Before convexAuth initialization
console.log('[DEBUG-AUTH] Before convexAuth init:', JSON.stringify({
  location: 'convex/auth.ts:15',
  message: 'Before convexAuth init',
  data: { siteUrl: SITE_URL },
  timestamp: Date.now(),
  sessionId: 'debug-session',
  runId: 'pre-init',
  hypothesisId: 'B',
}))
// #endregion

let authInstance: ReturnType<typeof convexAuth>
try {
  // #region agent log
  console.log('[DEBUG-AUTH] About to create convexAuth instance with callbacks:', JSON.stringify({
    location: 'convex/auth.ts:67',
    message: 'Before convexAuth call',
    data: {
      hasPasswordProvider: !!Password,
      hasGoogleProvider: !!Google,
      callbackKeys: ['redirect', 'afterUserCreatedOrUpdated'],
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'pre-init',
    hypothesisId: 'D',
  }))
  // #endregion

  const callbacks = {
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
      // #region agent log
      // Log immediately at function entry - before any operations
      try {
        console.log('[DEBUG-AUTH] afterUserCreatedOrUpdated CALLED - entry point:', JSON.stringify({
          location: 'convex/auth.ts:88',
          message: 'afterUserCreatedOrUpdated entry - FIRST LOG',
          data: {
            argsType: typeof args,
            argsKeys: Object.keys(args),
            userId: args.userId.toString(),
            existingUserId: args.existingUserId?.toString() ?? 'null',
            type: args.type,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'auth-callback',
          hypothesisId: 'H1',
        }))
      } catch (logError) {
        console.error('[DEBUG-AUTH] Failed to log entry:', logError)
      }
      // #endregion

      // Extract userId and existingUserId outside try block so they're accessible in catch
      const { userId, existingUserId } = args

      try {
        // #region agent log
        console.log('[DEBUG-AUTH] afterUserCreatedOrUpdated args check:', JSON.stringify({
          location: 'convex/auth.ts:105',
          message: 'afterUserCreatedOrUpdated args check',
          data: {
            argsKeys: Object.keys(args),
            userIdValue: args.userId.toString(),
            existingUserIdValue: args.existingUserId?.toString() ?? 'null',
            type: args.type,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'auth-callback',
          hypothesisId: 'H2',
        }))
        // #endregion

        // #region agent log
        console.log('[DEBUG-AUTH] afterUserCreatedOrUpdated extracted args:', JSON.stringify({
          location: 'convex/auth.ts:130',
          message: 'afterUserCreatedOrUpdated args extracted',
          data: {
            userId: userId.toString(),
            existingUserId: existingUserId?.toString() ?? 'null',
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'auth-callback',
          hypothesisId: 'I',
        }))
        // #endregion

        // Guard: userId must be present (should always be true, but keeping for safety)
        if (!userId) {
          console.error('[AUTH] ERROR: userId is null or undefined in afterUserCreatedOrUpdated')
          // #region agent log
          console.error('[DEBUG-AUTH] afterUserCreatedOrUpdated missing userId:', JSON.stringify({
            location: 'convex/auth.ts:150',
            message: 'afterUserCreatedOrUpdated missing userId',
            data: {
              args: Object.keys(args),
              userId: userId.toString(),
              existingUserId: existingUserId?.toString() ?? 'null',
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'auth-callback',
            hypothesisId: 'J',
          }))
          // #endregion
          // Don't throw - let Convex Auth handle it, but log the issue
          return
        }

        // Verify user exists
        const user = await ctx.db.get(userId)
        // #region agent log
        console.log('[DEBUG-AUTH] User lookup result:', JSON.stringify({
          location: 'convex/auth.ts:173',
          message: 'User lookup after afterUserCreatedOrUpdated',
          data: {
            found: !!user,
            userId: userId.toString(),
            userHasId: user?._id ? user._id.toString() : 'null',
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'auth-callback',
          hypothesisId: 'K',
        }))
        // #endregion

        if (!user) {
          // User doesn't exist in users table
          // Convex Auth should have created it automatically, but it doesn't exist
          // This means we need to create it ourselves
          if (!existingUserId) {
            // New user - Convex Auth should have created it, but it's missing
            // Let's create it with the userId from Convex Auth
            console.log('[AUTH] User not found - Convex Auth should have created it. Creating now:', userId.toString())
            // #region agent log
            console.log('[DEBUG-AUTH] User missing - creating in users table:', JSON.stringify({
              location: 'convex/auth.ts:216',
              message: 'User missing - creating',
              data: {
                userId: userId.toString(),
                existingUserId: existingUserId?.toString() ?? 'null',
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'auth-callback',
              hypothesisId: 'L',
            }))
            // #endregion
            
            // Get email/name from authAccount
            const authAccount = await ctx.db
              .query('authAccounts')
              .filter((q: any) => q.eq(q.field('userId'), userId))
              .first()
            
            if (!authAccount) {
              console.error('[AUTH] ERROR: authAccount not found for userId:', userId.toString())
              throw new Error(`authAccount not found for userId: ${userId.toString()}`)
            }

            // Convex Auth creates users automatically, but if it doesn't exist, we need to insert it
            // However, we can't insert with a specific ID in Convex
            // So we must use patch, which will fail if the user doesn't exist
            // This suggests Convex Auth should have created it but didn't
            // Let's try patch first - if it fails, there's a deeper issue
            try {
              // Try to patch - this will fail if user doesn't exist
              // Check for pre-promoted admin role before assigning default
              const inheritedRole = await getInheritedRole(ctx, args.profile.email, userId)
              await ctx.db.patch(userId, {
                role: inheritedRole,
                status: 'active',
                createdAt: Date.now(),
                email: args.profile.email,
                name: args.profile.name as string | undefined,
              })
              console.log('[AUTH] Successfully patched user with role:', inheritedRole)
            } catch (patchError: any) {
              // Patch failed - user doesn't exist
              // This means Convex Auth didn't create it, which is unexpected
              console.error('[AUTH] CRITICAL: User does not exist and cannot be patched:', patchError.message)
              // #region agent log
              console.error('[DEBUG-AUTH] User creation failed:', JSON.stringify({
                location: 'convex/auth.ts:250',
                message: 'User creation failed - patch error',
                data: {
                  userId: userId.toString(),
                  patchError: patchError.message,
                  authAccountExists: !!authAccount,
                },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'auth-callback',
                hypothesisId: 'N',
              }))
              // #endregion
              // Don't throw - let Convex Auth handle it, but log the critical error
              return
            }
          } else {
            console.error('[AUTH] ERROR: User not found for existing userId:', userId.toString())
            // #region agent log
            console.error('[DEBUG-AUTH] User not found in afterUserCreatedOrUpdated:', JSON.stringify({
              location: 'convex/auth.ts:230',
              message: 'User not found error for existing user',
              data: {
                userId: userId.toString(),
                existingUserId: existingUserId?.toString() ?? 'null',
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'auth-callback',
              hypothesisId: 'L',
            }))
            // #endregion
            return
          }
        } else {
          // User exists - update it
          if (!existingUserId) {
            // New user - check for pre-promoted admin role before assigning default
            const inheritedRole = await getInheritedRole(ctx, args.profile.email, userId)
            console.log('[AUTH] Setting role for new user:', inheritedRole)
            await ctx.db.patch(userId, {
              role: inheritedRole,
              status: 'active',
              createdAt: Date.now(),
            })
            console.log('[AUTH] Successfully set role')
            
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
              },
            })
          } else {
            // Existing user - update timestamp
            console.log('[AUTH] Updating timestamp for existing user')
            await ctx.db.patch(userId, {
              updatedAt: Date.now(),
            })
            console.log('[AUTH] Successfully updated timestamp')
            
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
        }
      } catch (error) {
        console.error('[AUTH] Error in afterUserCreatedOrUpdated:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: userId.toString(),
          existingUserId: existingUserId?.toString() ?? 'null',
        })
        // #region agent log
        console.error('[DEBUG-AUTH] afterUserCreatedOrUpdated error:', JSON.stringify({
          location: 'convex/auth.ts:175',
          message: 'afterUserCreatedOrUpdated exception',
          data: {
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : 'unknown',
            userId: userId.toString(),
            existingUserId: existingUserId?.toString() ?? 'null',
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'auth-callback',
          hypothesisId: 'M',
        }))
        // #endregion
        // Don't throw - let Convex Auth handle the flow
        // Throwing here might cause the null _id error
        return
      }
    },
  }

  // #region agent log
  console.log('[DEBUG-AUTH] Callbacks object created:', JSON.stringify({
    location: 'convex/auth.ts:332',
    message: 'Callbacks object verification',
    data: {
      hasRedirect: typeof callbacks.redirect === 'function',
      hasAfterUserCreatedOrUpdated: typeof callbacks.afterUserCreatedOrUpdated === 'function',
      callbackNames: Object.keys(callbacks),
      afterUserCreatedOrUpdatedType: typeof callbacks.afterUserCreatedOrUpdated,
      afterUserCreatedOrUpdatedIsAsync: callbacks.afterUserCreatedOrUpdated.constructor.name === 'AsyncFunction',
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'pre-init',
    hypothesisId: 'E',
  }))
  // #endregion

  // Wrap the callback to ensure it's called and log when it's invoked
  const originalCallback = callbacks.afterUserCreatedOrUpdated
  const wrappedCallback = async (ctx: MutationCtx, args: Parameters<typeof originalCallback>[1]) => {
    // #region agent log
    console.log('[DEBUG-AUTH] WRAPPED CALLBACK INVOKED:', JSON.stringify({
      location: 'convex/auth.ts:350',
      message: 'Wrapped callback invoked - this proves Convex Auth is calling it',
      data: {
        userId: args.userId.toString(),
        existingUserId: args.existingUserId?.toString() ?? 'null',
        type: args.type,
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'auth-callback-wrapper',
      hypothesisId: 'F',
    }))
    // #endregion
    
    try {
      return await originalCallback(ctx, args)
    } catch (error) {
      console.error('[DEBUG-AUTH] Wrapped callback error:', error)
      throw error
    }
  }

  authInstance = convexAuth({
    providers: [
      // Email/Password authentication
      Password,
      // Google OAuth
      Google,
    ],
    callbacks: {
      ...callbacks,
      afterUserCreatedOrUpdated: wrappedCallback,
    },
  })
  // #region agent log
  // Debug: After convexAuth initialization (success)
  console.log('[DEBUG-AUTH] convexAuth init success:', JSON.stringify({
    location: 'convex/auth.ts:78',
    message: 'convexAuth init success',
    data: {
      hasAuth: !!authInstance.auth,
      hasSignIn: !!authInstance.signIn,
      hasStore: !!authInstance.store,
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'pre-init',
    hypothesisId: 'C',
  }))
  // #endregion
} catch (error) {
  // #region agent log
  // Debug: Error during convexAuth initialization
  console.error('[DEBUG-AUTH] convexAuth init error:', JSON.stringify({
    location: 'convex/auth.ts:82',
    message: 'convexAuth init error',
    data: {
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'unknown',
      hasJwtKey: !!jwtPrivateKey,
      hasConvexAuthKey: !!convexAuthPrivateKey,
    },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'pre-init',
    hypothesisId: 'D',
  }))
  // #endregion
  throw error
}

export const { auth, signIn, signOut, store } = authInstance
