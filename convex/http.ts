import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import OpenAI from 'openai'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { getOpenAITools, toolRequiresConfirmation } from './lib/agent/tools'
import { executeToolHandler } from './lib/agent/handlers'
import type { ToolName, ToolCall, ToolResult } from './lib/agent/types'
import { z } from 'zod'

// ============================================================================
// OpenAI Retry Helper
// ============================================================================

async function callOpenAIWithRetry(
  openai: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParamsStreaming,
  maxRetries = 3
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create(params)
    } catch (error) {
      lastError = error as Error

      // Don't retry on auth errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401 || error.status === 403) {
          throw new Error('AI service authentication failed. Please check configuration.')
        }
        if (error.status === 429) {
          // Rate limit - wait longer
          const waitTime = Math.pow(2, attempt) * 2000
          await new Promise((r) => setTimeout(r, waitTime))
          continue
        }
      }

      // For other errors, exponential backoff
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000
        await new Promise((r) => setTimeout(r, waitTime))
      }
    }
  }

  throw lastError || new Error('OpenAI API call failed after retries')
}

// ============================================================================
// Request Validation Schemas
// ============================================================================

const VALID_TOOL_NAMES = [
  'createEvent',
  'updateEvent',
  'getEventDetails',
  'getUpcomingEvents',
  'searchVendors',
  'addVendorToEvent',
  'searchSponsors',
  'addSponsorToEvent',
  'getUserProfile',
  'getRecommendedVendors',
  'getRecommendedSponsors',
  'getEventVendors',
  'getEventSponsors',
] as const

const executeToolSchema = z.object({
  toolName: z.enum(VALID_TOOL_NAMES),
  toolArguments: z.record(z.string(), z.unknown()).default({}),
})

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(50000),
  toolCalls: z.array(z.unknown()).optional(),
})

const chatStreamSchema = z.object({
  messages: z.array(chatMessageSchema).optional(),
  userMessage: z.string().min(1).max(10000),
  confirmedToolCalls: z.array(z.string()).optional(),
})

// API helpers
import {
  apiSuccess,
  ApiErrors,
  handleCors,
  handleAuthCors,
  authCorsHeaders,
  parseBody,
  getPagination,
  paginationMeta,
  getLastPathSegment,
  validateRequestSize,
} from './api/helpers'
import { validateApiKey, requirePermission, PERMISSIONS } from './api/auth'
// Account lockout utilities - ENABLED for brute force protection
import { formatLockoutDuration } from './accountLockout'
// Global rate limiting - IP-based protection
import { getClientIP, rateLimitResponse, rateLimitHeaders } from './globalRateLimit'

// ============================================================================
// HTTP Router
// ============================================================================

const http = httpRouter()

// Convex Auth HTTP routes (handles OAuth callbacks, magic links, etc.)
auth.addHttpRoutes(http)

// ============================================================================
// Health Check & API Info
// ============================================================================

// Health check endpoint
http.route({
  path: '/api/health',
  method: 'GET',
  handler: httpAction(async () => {
    return apiSuccess({
      status: 'ok',
      timestamp: Date.now(),
      version: '1.0.0',
    })
  }),
})

// Configuration health check endpoint
// Returns detailed status of all configuration settings
http.route({
  path: '/api/health/config',
  method: 'GET',
  handler: httpAction(async () => {
    const checks: Array<{
      name: string
      status: 'pass' | 'fail' | 'warn'
      message: string
      required: boolean
    }> = []

    // Check required environment variables
    const openaiKey = process.env.OPENAI_API_KEY
    checks.push({
      name: 'OPENAI_API_KEY',
      status: openaiKey ? 'pass' : 'warn',
      message: openaiKey ? 'OpenAI API key configured' : 'OpenAI API key not configured - AI features disabled',
      required: false,
    })

    const siteUrl = process.env.SITE_URL
    checks.push({
      name: 'SITE_URL',
      status: siteUrl ? 'pass' : 'warn',
      message: siteUrl ? 'Site URL configured' : 'Site URL not configured - OAuth redirects may fail',
      required: false,
    })

    const stripeKey = process.env.STRIPE_SECRET_KEY
    checks.push({
      name: 'STRIPE_SECRET_KEY',
      status: stripeKey ? 'pass' : 'warn',
      message: stripeKey ? 'Stripe secret key configured' : 'Stripe not configured - payments disabled',
      required: false,
    })

    const resendKey = process.env.AUTH_RESEND_KEY
    checks.push({
      name: 'AUTH_RESEND_KEY',
      status: resendKey ? 'pass' : 'warn',
      message: resendKey ? 'Resend API key configured' : 'Resend not configured - email features disabled',
      required: false,
    })

    // Determine overall health
    const hasFailures = checks.some((c) => c.status === 'fail' && c.required)
    // Note: hasWarnings could be used for degraded status in future
    // Note: warnings are tracked in checks array but not separately flagged
    // const hasWarnings = checks.some((c) => c.status === 'warn')

    return apiSuccess({
      healthy: !hasFailures,
      environment: process.env.NODE_ENV || 'development',
      timestamp: Date.now(),
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter((c) => c.status === 'pass').length,
        warnings: checks.filter((c) => c.status === 'warn').length,
        failed: checks.filter((c) => c.status === 'fail').length,
      },
    })
  }),
})

// API info endpoint
http.route({
  path: '/api/v1',
  method: 'GET',
  handler: httpAction(async () => {
    return apiSuccess({
      name: 'Open Event API',
      version: '1.0.0',
      documentation: 'https://github.com/hazlijohar95/open-event',
      endpoints: {
        events: '/api/v1/events',
        vendors: '/api/v1/vendors',
        sponsors: '/api/v1/sponsors',
        public: '/api/v1/public/events',
      },
    })
  }),
})

// ============================================================================
// Cookie Auth Endpoints
// ============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Cookie options based on environment
const getCookieOptions = (maxAge: number) => {
  const base = `Path=/; Max-Age=${maxAge}; SameSite=Strict`
  return IS_PRODUCTION ? `${base}; HttpOnly; Secure` : `${base}; HttpOnly`
}

// Parse cookies from request header
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
}

// Create cookie headers for auth response
function createAuthCookies(accessToken: string, refreshToken: string) {
  return [
    `access_token=${accessToken}; ${getCookieOptions(900)}`, // 15 minutes
    `refresh_token=${refreshToken}; ${getCookieOptions(604800)}`, // 7 days
  ]
}

// Clear cookies on logout
function createClearCookies() {
  return [`access_token=; Path=/; Max-Age=0`, `refresh_token=; Path=/; Max-Age=0`]
}

// CORS preflight for auth endpoints (with credentials)
http.route({
  path: '/api/auth/login',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => handleAuthCors(request)),
})

http.route({
  path: '/api/auth/signup',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => handleAuthCors(request)),
})

http.route({
  path: '/api/auth/logout',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => handleAuthCors(request)),
})

http.route({
  path: '/api/auth/refresh',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => handleAuthCors(request)),
})

http.route({
  path: '/api/auth/me',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => handleAuthCors(request)),
})

// POST /api/auth/login - Login with email/password
// Account lockout protection ENABLED - prevents brute force attacks
// Global rate limiting ENABLED - IP-based protection
http.route({
  path: '/api/auth/login',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin')
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('User-Agent') || undefined

    try {
      // Validate request size (1MB limit for JSON)
      const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
      if (sizeError) {
        return sizeError
      }

      // Check IP-based rate limit first (before parsing body)
      const ipRateLimit = await ctx.runMutation(internal.globalRateLimit.checkAndIncrement, {
        identifier: clientIP,
        type: 'auth',
      })

      if (!ipRateLimit.allowed) {
        // Log rate limited attempt
        await ctx.runMutation(internal.auditLog.log, {
          action: 'rate_limited',
          resource: 'auth',
          ipAddress: clientIP,
          userAgent,
          endpoint: '/api/auth/login',
          status: 'blocked',
          metadata: { reason: 'IP rate limit exceeded' },
        })

        return rateLimitResponse(ipRateLimit, corsHeaders(origin))
      }

      const body = await parseBody(request)
      const { email, password } = body as { email: string; password: string }

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password are required' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitHeaders(ipRateLimit),
            ...corsHeaders(origin),
          },
        })
      }

      // Check if account is locked out due to too many failed attempts
      const lockoutStatus = await ctx.runQuery(internal.accountLockout.checkLockoutStatus, {
        identifier: email,
      })

      if (lockoutStatus.isLocked) {
        const duration = formatLockoutDuration(lockoutStatus.lockoutDuration || 60000)

        // Log account lockout
        await ctx.runMutation(internal.auditLog.log, {
          userEmail: email,
          action: 'account_locked',
          resource: 'auth',
          ipAddress: clientIP,
          userAgent,
          endpoint: '/api/auth/login',
          status: 'blocked',
          metadata: { lockedUntil: lockoutStatus.lockedUntil },
        })

        return new Response(
          JSON.stringify({
            error: 'Account temporarily locked',
            message: `Too many failed login attempts. Please try again in ${duration}.`,
            lockedUntil: lockoutStatus.lockedUntil,
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          }
        )
      }

      const result = await ctx.runAction(internal.customAuth.signInInternal, {
        email,
        password,
        userAgent,
        ipAddress: clientIP,
      })

      if (!result.success) {
        // Record failed attempt for lockout tracking
        const newLockoutStatus = await ctx.runMutation(internal.accountLockout.recordFailedAttempt, {
          identifier: email,
        })

        // Log failed login attempt
        await ctx.runMutation(internal.auditLog.log, {
          userEmail: email,
          action: 'login_failed',
          resource: 'auth',
          ipAddress: clientIP,
          userAgent,
          endpoint: '/api/auth/login',
          status: 'failure',
          metadata: {
            remainingAttempts: newLockoutStatus.remainingAttempts,
            isLocked: newLockoutStatus.isLocked,
          },
        })

        // Provide warning about remaining attempts
        let errorMessage = 'Invalid email or password'
        if (newLockoutStatus.isLocked) {
          const duration = formatLockoutDuration(newLockoutStatus.lockoutDuration || 60000)
          errorMessage = `Account locked due to too many failed attempts. Try again in ${duration}.`
        } else if (newLockoutStatus.remainingAttempts <= 2) {
          errorMessage = `Invalid credentials. ${newLockoutStatus.remainingAttempts} attempt(s) remaining before lockout.`
        }

        return new Response(
          JSON.stringify({
            error: errorMessage,
            remainingAttempts: newLockoutStatus.remainingAttempts,
            isLocked: newLockoutStatus.isLocked,
          }),
          {
            status: newLockoutStatus.isLocked ? 429 : 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          }
        )
      }

      // Clear failed attempts on successful login
      await ctx.runMutation(internal.accountLockout.clearFailedAttempts, { identifier: email })

      // Log successful login
      await ctx.runMutation(internal.auditLog.log, {
        userId: result.user?._id,
        userEmail: email,
        action: 'login',
        resource: 'auth',
        ipAddress: clientIP,
        userAgent,
        endpoint: '/api/auth/login',
        status: 'success',
      })

      // At this point, result.success is true so tokens are guaranteed to exist
      const cookies = createAuthCookies(result.accessToken!, result.refreshToken!)

      // Return accessToken in body for Convex queries (stored in memory, not localStorage)
      return new Response(
        JSON.stringify({
          success: true,
          user: result.user,
          accessToken: result.accessToken!, // For Convex WebSocket queries
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookies.join(', '),
            ...corsHeaders(origin),
          },
        }
      )
    } catch (error) {
      console.error('Login error:', error)
      // Generic error message for security
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  }),
})

// POST /api/auth/signup - Create new account
http.route({
  path: '/api/auth/signup',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin')
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('User-Agent') || undefined
    
    try {
      // Validate request size (1MB limit for JSON)
      const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
      if (sizeError) {
        return sizeError
      }

      const body = await parseBody(request)
      const { email, password, name } = body as { email: string; password: string; name?: string }

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      // Call signup action (which now includes logging)
      const result = await ctx.runAction(api.customAuth.signup, {
        email,
        password,
        name,
        userAgent,
        ipAddress: clientIP,
      })

      const cookies = createAuthCookies(result.accessToken, result.refreshToken)

      // Return accessToken in body for Convex queries (stored in memory, not localStorage)
      return new Response(
        JSON.stringify({
          success: true,
          user: result.user,
          accessToken: result.accessToken, // For Convex WebSocket queries
        }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': cookies.join(', '),
            ...corsHeaders(origin),
          },
        }
      )
    } catch (error: unknown) {
      console.error('Signup error:', error)
      const message = error instanceof Error ? error.message : 'Signup failed'
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  }),
})

// POST /api/auth/logout - Clear session and cookies
http.route({
  path: '/api/auth/logout',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin')
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('User-Agent') || undefined
    
    try {
      const cookies = parseCookies(request.headers.get('Cookie'))
      const refreshToken = cookies.refresh_token

      if (refreshToken) {
        // Get session info before deleting for logging
        const session = await ctx.runQuery(internal.customAuth.getSessionByRefreshToken, {
          refreshToken,
        })
        
        // Delete session from database
        await ctx.runMutation(internal.customAuth.deleteSessionByRefreshToken, {
          refreshToken,
        })
        
        // Log logout
        if (session) {
          await ctx.runMutation(internal.auditLog.log, {
            userId: session.userId,
            action: 'logout',
            resource: 'auth',
            ipAddress: clientIP,
            userAgent,
            endpoint: '/api/auth/logout',
            status: 'success',
          })
        }
      }

      const clearCookies = createClearCookies()

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookies.join(', '),
          ...corsHeaders(origin),
        },
      })
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear cookies even if DB operation fails
      const clearCookies = createClearCookies()
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookies.join(', '),
          ...corsHeaders(origin),
        },
      })
    }
  }),
})

// POST /api/auth/refresh - Rotate tokens
http.route({
  path: '/api/auth/refresh',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin')
    try {
      const cookies = parseCookies(request.headers.get('Cookie'))
      const refreshToken = cookies.refresh_token

      if (!refreshToken) {
        return new Response(JSON.stringify({ error: 'No refresh token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const userAgent = request.headers.get('User-Agent') || undefined
      const ipAddress = request.headers.get('X-Forwarded-For')?.split(',')[0] || undefined

      const result = await ctx.runMutation(internal.customAuth.refreshSessionInternal, {
        refreshToken,
        userAgent,
        ipAddress,
      })

      if (!result.success) {
        const clearCookies = createClearCookies()
        return new Response(JSON.stringify({ error: result.error }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': clearCookies.join(', '),
            ...corsHeaders(origin),
          },
        })
      }

      // At this point, result.success is true so tokens are guaranteed to exist
      const newCookies = createAuthCookies(result.accessToken!, result.refreshToken!)

      // Return new accessToken for Convex queries
      return new Response(
        JSON.stringify({
          success: true,
          user: result.user,
          accessToken: result.accessToken!, // For Convex WebSocket queries
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': newCookies.join(', '),
            ...corsHeaders(origin),
          },
        }
      )
    } catch (error) {
      console.error('Refresh error:', error)
      return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  }),
})

// GET /api/auth/me - Get current user from cookie
http.route({
  path: '/api/auth/me',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin')
    try {
      const cookies = parseCookies(request.headers.get('Cookie'))
      const accessToken = cookies.access_token

      if (!accessToken) {
        return new Response(JSON.stringify({ user: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        })
      }

      const user = await ctx.runQuery(internal.customAuth.getUserByAccessToken, {
        accessToken,
      })

      // Return accessToken for Convex queries (if user is valid)
      return new Response(JSON.stringify({ user, accessToken: user ? accessToken : null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    } catch (error) {
      console.error('Get user error:', error)
      return new Response(JSON.stringify({ user: null, accessToken: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }
  }),
})

// Helper for CORS headers (for auth endpoints)
// Note: Uses authCorsHeaders from helpers.ts for consistent CORS handling
function corsHeaders(origin?: string | null) {
  return authCorsHeaders(origin)
}

// ============================================================================
// CORS Preflight Handlers
// ============================================================================

// Generic CORS handler for /api/v1/*
http.route({
  path: '/api/v1/events',
  method: 'OPTIONS',
  handler: httpAction(async () => handleCors()),
})

http.route({
  path: '/api/v1/vendors',
  method: 'OPTIONS',
  handler: httpAction(async () => handleCors()),
})

http.route({
  path: '/api/v1/sponsors',
  method: 'OPTIONS',
  handler: httpAction(async () => handleCors()),
})

http.route({
  path: '/api/v1/public/events',
  method: 'OPTIONS',
  handler: httpAction(async () => handleCors()),
})

// ============================================================================
// API v1 - Events
// ============================================================================

// GET /api/v1/events - List events for the authenticated user
http.route({
  path: '/api/v1/events',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.EVENTS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)
      const status = url.searchParams.get('status') || undefined

      // Get events for the API key's user using internal query
      const allEvents = await ctx.runQuery(internal.api.mutations.getEventsByUser, {
        userId: authResult.keyInfo.userId,
        status: status === 'all' ? undefined : status,
      })

      // Apply pagination
      const total = allEvents.length
      const paginatedEvents = allEvents.slice(offset, offset + limit)

      return apiSuccess(paginatedEvents, paginationMeta(total, page, limit))
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Failed to fetch events'
      )
    }
  }),
})

// POST /api/v1/events - Create a new event
http.route({
  path: '/api/v1/events',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Validate request size (1MB limit for JSON)
    const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
    if (sizeError) {
      return sizeError
    }

    // Validate API key - STRICT CHECK
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission - MUST have events:write permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.EVENTS_WRITE)
    if (permError) return permError

    // Parse request body
    const body = await parseBody<{
      title: string
      startDate: number
      description?: string
      eventType?: string
      status?: string
      locationType?: string
      venueName?: string
      venueAddress?: string
      virtualPlatform?: string
      expectedAttendees?: number
      budget?: number
      budgetCurrency?: string
      endDate?: number
      timezone?: string
    }>(request)

    if (!body) {
      return ApiErrors.badRequest('Invalid JSON body')
    }

    // Validate required fields
    if (!body.title) {
      return ApiErrors.validationError('title is required')
    }
    if (!body.startDate) {
      return ApiErrors.validationError('startDate is required (Unix timestamp)')
    }
    if (typeof body.startDate !== 'number') {
      return ApiErrors.validationError('startDate must be a Unix timestamp (number)')
    }

    try {
      // Use internal mutation with userId from API key
      const eventId = await ctx.runMutation(internal.api.mutations.createEvent, {
        userId: authResult.keyInfo.userId,
        title: body.title,
        startDate: body.startDate,
        description: body.description,
        eventType: body.eventType,
        status: body.status,
        locationType: body.locationType,
        venueName: body.venueName,
        venueAddress: body.venueAddress,
        virtualPlatform: body.virtualPlatform,
        expectedAttendees: body.expectedAttendees,
        budget: body.budget,
        budgetCurrency: body.budgetCurrency,
        endDate: body.endDate,
        timezone: body.timezone,
      })

      return apiSuccess({ eventId }, { created: true }, 201)
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.badRequest(error instanceof Error ? error.message : 'Failed to create event')
    }
  }),
})

// GET /api/v1/events/:id - Get a single event
http.route({
  pathPrefix: '/api/v1/events/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.EVENTS_READ)
    if (permError) return permError

    // Extract event ID from URL
    const url = new URL(request.url)
    const eventId = getLastPathSegment(url.pathname)

    if (!eventId) {
      return ApiErrors.badRequest('Event ID is required')
    }

    try {
      // Use internal query with ownership check
      const event = await ctx.runQuery(internal.api.mutations.getEventById, {
        userId: authResult.keyInfo.userId,
        eventId: eventId as Id<'events'>,
      })

      if (!event) {
        return ApiErrors.notFound('Event')
      }

      return apiSuccess(event)
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Failed to fetch event'
      )
    }
  }),
})

// PATCH /api/v1/events/:id - Update an event
http.route({
  pathPrefix: '/api/v1/events/',
  method: 'PATCH',
  handler: httpAction(async (ctx, request) => {
    // Validate request size (1MB limit for JSON)
    const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
    if (sizeError) {
      return sizeError
    }

    // Validate API key - STRICT CHECK
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission - MUST have events:write permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.EVENTS_WRITE)
    if (permError) return permError

    // Extract event ID from URL
    const url = new URL(request.url)
    const eventId = getLastPathSegment(url.pathname)

    if (!eventId) {
      return ApiErrors.badRequest('Event ID is required')
    }

    // Parse request body
    const body = await parseBody<{
      title?: string
      startDate?: number
      description?: string
      eventType?: string
      status?: string
      locationType?: string
      venueName?: string
      venueAddress?: string
      virtualPlatform?: string
      expectedAttendees?: number
      budget?: number
      budgetCurrency?: string
      endDate?: number
      timezone?: string
    }>(request)

    if (!body) {
      return ApiErrors.badRequest('Invalid JSON body')
    }

    // Check that at least one field is being updated
    if (Object.keys(body).length === 0) {
      return ApiErrors.badRequest('No fields to update')
    }

    try {
      // Use internal mutation with userId from API key (includes ownership check)
      await ctx.runMutation(internal.api.mutations.updateEvent, {
        userId: authResult.keyInfo.userId,
        eventId: eventId as Id<'events'>,
        ...body,
      })

      return apiSuccess({ updated: true })
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.badRequest(error instanceof Error ? error.message : 'Failed to update event')
    }
  }),
})

// DELETE /api/v1/events/:id - Delete an event
http.route({
  pathPrefix: '/api/v1/events/',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    // Validate API key - STRICT CHECK
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission - MUST have events:delete permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.EVENTS_DELETE)
    if (permError) return permError

    // Extract event ID from URL
    const url = new URL(request.url)
    const eventId = getLastPathSegment(url.pathname)

    if (!eventId) {
      return ApiErrors.badRequest('Event ID is required')
    }

    try {
      // Use internal mutation with userId from API key (includes ownership check)
      await ctx.runMutation(internal.api.mutations.deleteEvent, {
        userId: authResult.keyInfo.userId,
        eventId: eventId as Id<'events'>,
      })

      return apiSuccess({ deleted: true })
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.badRequest(error instanceof Error ? error.message : 'Failed to delete event')
    }
  }),
})

// ============================================================================
// API v1 - Vendors
// ============================================================================

// GET /api/v1/vendors - List approved vendors
http.route({
  path: '/api/v1/vendors',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.VENDORS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)
      const category = url.searchParams.get('category') || undefined
      const search = url.searchParams.get('search') || undefined

      const allVendors = await ctx.runQuery(api.vendors.list, {
        category,
        search,
      })

      // Apply pagination
      const total = allVendors.length
      const paginatedVendors = allVendors.slice(offset, offset + limit)

      return apiSuccess(paginatedVendors, paginationMeta(total, page, limit))
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch vendors')
    }
  }),
})

// GET /api/v1/vendors/categories - List vendor categories
http.route({
  path: '/api/v1/vendors/categories',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    try {
      const categories = await ctx.runQuery(api.vendors.getCategories)
      return apiSuccess(categories)
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch categories')
    }
  }),
})

// ============================================================================
// API v1 - Sponsors
// ============================================================================

// GET /api/v1/sponsors - List approved sponsors
http.route({
  path: '/api/v1/sponsors',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.SPONSORS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)
      const industry = url.searchParams.get('industry') || undefined
      const search = url.searchParams.get('search') || undefined

      const allSponsors = await ctx.runQuery(api.sponsors.list, {
        industry,
        search,
      })

      // Apply pagination
      const total = allSponsors.length
      const paginatedSponsors = allSponsors.slice(offset, offset + limit)

      return apiSuccess(paginatedSponsors, paginationMeta(total, page, limit))
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch sponsors')
    }
  }),
})

// ============================================================================
// API v1 - Public Endpoints (No API Key Required)
// ============================================================================
// These endpoints are safe read-only operations that don't require authentication.
// They only expose publicly available data.

// CORS preflight for public endpoints
http.route({
  path: '/api/v1/public/vendors',
  method: 'OPTIONS',
  handler: httpAction(async () => handleCors()),
})

// GET /api/v1/public/events - List public events (no auth)
http.route({
  path: '/api/v1/public/events',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)

      const eventType = url.searchParams.get('eventType') || undefined
      const locationType = url.searchParams.get('locationType') || undefined
      const seekingVendors = url.searchParams.get('seekingVendors') === 'true' || undefined
      const seekingSponsors = url.searchParams.get('seekingSponsors') === 'true' || undefined
      const search = url.searchParams.get('search') || undefined

      const allEvents = await ctx.runQuery(api.events.listPublic, {
        eventType,
        locationType,
        seekingVendors,
        seekingSponsors,
        search,
        limit: 100, // Internal limit
      })

      // Apply pagination
      const total = allEvents.length
      const paginatedEvents = allEvents.slice(offset, offset + limit)

      return apiSuccess(paginatedEvents, paginationMeta(total, page, limit))
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch public events')
    }
  }),
})

// GET /api/v1/public/vendors - List approved vendors (no auth)
// Only returns approved/verified vendors with public information
http.route({
  path: '/api/v1/public/vendors',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url)
      const { page, limit, offset } = getPagination(url)

      const category = url.searchParams.get('category') || undefined
      const search = url.searchParams.get('search') || undefined

      // Get approved vendors only
      const allVendors = await ctx.runQuery(api.vendors.list, {
        category,
        search,
      })

      // Apply pagination
      const total = allVendors.length
      const paginatedVendors = allVendors.slice(offset, offset + limit)

      // Return only public-safe fields (no contact details, internal notes, etc.)
      const publicVendors = paginatedVendors.map((vendor: (typeof allVendors)[number]) => ({
        _id: vendor._id,
        name: vendor.name,
        description: vendor.description,
        category: vendor.category,
        services: vendor.services,
        location: vendor.location,
        priceRange: vendor.priceRange,
        rating: vendor.rating,
        reviewCount: vendor.reviewCount,
        website: vendor.website,
        logoUrl: vendor.logoUrl,
        verified: vendor.verified,
      }))

      return apiSuccess(publicVendors, paginationMeta(total, page, limit))
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch vendors')
    }
  }),
})

// GET /api/v1/public/vendors/categories - List vendor categories (no auth)
http.route({
  path: '/api/v1/public/vendors/categories',
  method: 'GET',
  handler: httpAction(async (ctx) => {
    try {
      const categories = await ctx.runQuery(api.vendors.getCategories)
      return apiSuccess(categories)
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch categories')
    }
  }),
})

// ============================================================================
// API v1 - Webhooks
// ============================================================================

// CORS preflight for webhooks
http.route({
  path: '/api/v1/webhooks',
  method: 'OPTIONS',
  handler: httpAction(async () => handleCors()),
})

// GET /api/v1/webhooks - List user's webhooks
http.route({
  path: '/api/v1/webhooks',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ADMIN)
    if (permError) {
      // Also allow if they have webhooks permission (future)
      return permError
    }

    try {
      // Get webhooks for the user
      const webhooks = await ctx.runQuery(api.webhooks.list)
      return apiSuccess(webhooks)
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch webhooks')
    }
  }),
})

// POST /api/v1/webhooks - Create a webhook
http.route({
  path: '/api/v1/webhooks',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    // Validate request size (1MB limit for JSON)
    const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
    if (sizeError) {
      return sizeError
    }

    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ADMIN)
    if (permError) return permError

    // Parse request body
    const body = await parseBody<{
      name: string
      url: string
      events: string[]
    }>(request)

    if (!body) {
      return ApiErrors.badRequest('Invalid JSON body')
    }

    // Validate required fields
    if (!body.name) {
      return ApiErrors.validationError('name is required')
    }
    if (!body.url) {
      return ApiErrors.validationError('url is required')
    }
    if (!body.events || body.events.length === 0) {
      return ApiErrors.validationError('events array is required')
    }

    try {
      const result = await ctx.runMutation(api.webhooks.create, {
        name: body.name,
        url: body.url,
        events: body.events,
      })

      return apiSuccess(result, { created: true }, 201)
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.badRequest(
        error instanceof Error ? error.message : 'Failed to create webhook'
      )
    }
  }),
})

// GET /api/v1/webhooks/:id - Get a single webhook
http.route({
  pathPrefix: '/api/v1/webhooks/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ADMIN)
    if (permError) return permError

    // Extract webhook ID from URL
    const url = new URL(request.url)
    const webhookId = getLastPathSegment(url.pathname)

    if (!webhookId || webhookId === 'webhooks') {
      return ApiErrors.badRequest('Webhook ID is required')
    }

    try {
      const webhook = await ctx.runQuery(api.webhooks.get, {
        id: webhookId as Id<'webhooks'>,
      })

      if (!webhook) {
        return ApiErrors.notFound('Webhook')
      }

      return apiSuccess(webhook)
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.internalError('Failed to fetch webhook')
    }
  }),
})

// PATCH /api/v1/webhooks/:id - Update a webhook
http.route({
  pathPrefix: '/api/v1/webhooks/',
  method: 'PATCH',
  handler: httpAction(async (ctx, request) => {
    // Validate request size (1MB limit for JSON)
    const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
    if (sizeError) {
      return sizeError
    }

    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ADMIN)
    if (permError) return permError

    // Extract webhook ID from URL
    const url = new URL(request.url)
    const webhookId = getLastPathSegment(url.pathname)

    if (!webhookId || webhookId === 'webhooks') {
      return ApiErrors.badRequest('Webhook ID is required')
    }

    // Parse request body
    const body = await parseBody<{
      name?: string
      url?: string
      events?: string[]
      status?: 'active' | 'paused'
    }>(request)

    if (!body) {
      return ApiErrors.badRequest('Invalid JSON body')
    }

    try {
      await ctx.runMutation(api.webhooks.update, {
        id: webhookId as Id<'webhooks'>,
        ...body,
      })

      return apiSuccess({ updated: true })
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.badRequest(
        error instanceof Error ? error.message : 'Failed to update webhook'
      )
    }
  }),
})

// DELETE /api/v1/webhooks/:id - Delete a webhook
http.route({
  pathPrefix: '/api/v1/webhooks/',
  method: 'DELETE',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ADMIN)
    if (permError) return permError

    // Extract webhook ID from URL
    const url = new URL(request.url)
    const webhookId = getLastPathSegment(url.pathname)

    if (!webhookId || webhookId === 'webhooks') {
      return ApiErrors.badRequest('Webhook ID is required')
    }

    try {
      await ctx.runMutation(api.webhooks.remove, {
        id: webhookId as Id<'webhooks'>,
      })

      return apiSuccess({ deleted: true })
    } catch (error) {
      console.error('API Error:', error)
      return ApiErrors.badRequest(
        error instanceof Error ? error.message : 'Failed to delete webhook'
      )
    }
  }),
})

// GET /api/v1/webhooks/events - List available webhook events
http.route({
  path: '/api/v1/webhooks/events',
  method: 'GET',
  handler: httpAction(async () => {
    const events = [
      { type: 'event.created', description: 'When a new event is created' },
      { type: 'event.updated', description: 'When an event is updated' },
      { type: 'event.deleted', description: 'When an event is deleted' },
      { type: 'event.status_changed', description: 'When an event status changes' },
      { type: 'vendor.applied', description: 'When a vendor applies to an event' },
      { type: 'vendor.confirmed', description: 'When a vendor is confirmed for an event' },
      { type: 'vendor.declined', description: 'When a vendor is declined' },
      { type: 'sponsor.applied', description: 'When a sponsor applies to an event' },
      { type: 'sponsor.confirmed', description: 'When a sponsor is confirmed' },
      { type: 'sponsor.declined', description: 'When a sponsor is declined' },
      { type: 'task.created', description: 'When a task is created' },
      { type: 'task.completed', description: 'When a task is completed' },
    ]
    return apiSuccess(events)
  }),
})

// ============================================================================
// API v1 - Analytics
// ============================================================================

// CORS preflight for analytics endpoints
http.route({
  path: '/api/v1/analytics',
  method: 'OPTIONS',
  handler: httpAction(async () => handleCors()),
})

// GET /api/v1/analytics/events/trends - Get event trends over time
http.route({
  path: '/api/v1/analytics/events/trends',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ANALYTICS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const period = url.searchParams.get('period') || 'month'
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined

      const trends = await ctx.runQuery(internal.analytics.getEventTrendsInternal, {
        userId: authResult.keyInfo.userId,
        period: period as 'day' | 'week' | 'month' | 'year',
        startDate,
        endDate,
      })

      return apiSuccess(trends)
    } catch (error) {
      console.error('Analytics Error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Failed to fetch event trends'
      )
    }
  }),
})

// GET /api/v1/analytics/events/performance - Get event performance metrics
http.route({
  path: '/api/v1/analytics/events/performance',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ANALYTICS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined

      const performance = await ctx.runQuery(internal.analytics.getEventPerformanceInternal, {
        userId: authResult.keyInfo.userId,
        startDate,
        endDate,
      })

      return apiSuccess(performance)
    } catch (error) {
      console.error('Analytics Error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Failed to fetch performance metrics'
      )
    }
  }),
})

// GET /api/v1/analytics/events/comparative - Get comparative analytics
http.route({
  path: '/api/v1/analytics/events/comparative',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ANALYTICS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const period = url.searchParams.get('period') || 'month'

      const comparative = await ctx.runQuery(internal.analytics.getComparativeAnalyticsInternal, {
        userId: authResult.keyInfo.userId,
        period: period as 'week' | 'month' | 'year',
      })

      return apiSuccess(comparative)
    } catch (error) {
      console.error('Analytics Error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Failed to fetch comparative analytics'
      )
    }
  }),
})

// GET /api/v1/analytics/budget - Get budget analytics
http.route({
  path: '/api/v1/analytics/budget',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ANALYTICS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined

      const budgetAnalytics = await ctx.runQuery(internal.analytics.getBudgetAnalyticsInternal, {
        userId: authResult.keyInfo.userId,
        startDate,
        endDate,
      })

      return apiSuccess(budgetAnalytics)
    } catch (error) {
      console.error('Analytics Error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Failed to fetch budget analytics'
      )
    }
  }),
})

// GET /api/v1/analytics/engagement - Get vendor/sponsor engagement analytics
http.route({
  path: '/api/v1/analytics/engagement',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    // Validate API key
    const authResult = await validateApiKey(ctx, request)
    if (!authResult.success) {
      return authResult.response
    }

    // Check permission
    const permError = requirePermission(authResult.keyInfo, PERMISSIONS.ANALYTICS_READ)
    if (permError) return permError

    try {
      const url = new URL(request.url)
      const startDate = url.searchParams.get('startDate')
        ? parseInt(url.searchParams.get('startDate')!)
        : undefined
      const endDate = url.searchParams.get('endDate')
        ? parseInt(url.searchParams.get('endDate')!)
        : undefined

      const engagement = await ctx.runQuery(internal.analytics.getEngagementAnalyticsInternal, {
        userId: authResult.keyInfo.userId,
        startDate,
        endDate,
      })

      return apiSuccess(engagement)
    } catch (error) {
      console.error('Analytics Error:', error)
      return ApiErrors.internalError(
        error instanceof Error ? error.message : 'Failed to fetch engagement analytics'
      )
    }
  }),
})

// ============================================================================
// Streaming Chat Endpoint
// ============================================================================

const SYSTEM_PROMPT = `You are an AI event creation assistant for Open Event. Your PRIMARY job is to quickly help users CREATE events and find the RIGHT vendors/sponsors.

## Your Approach:

1. **Be concise** - Keep responses to 2-3 sentences max
2. **Act quickly** - After getting basic info (title, date, type), CREATE the event immediately
3. **Ask only essential questions** - Don't overwhelm users with long lists of what they COULD provide

## Event Creation Flow:

When a user wants to create an event:
1. If they give you enough info (event type + rough date), call createEvent immediately
2. If missing critical info, ask ONE quick question like: "What date are you planning for?"
3. Use sensible defaults for optional fields - don't ask about every possible detail

## Minimum Info Needed to Create Event:
- Title or event type (required)
- Approximate date (required)
- Everything else can use defaults or be added later

## Vendor & Sponsor Recommendations:

When recommending vendors or sponsors, ALWAYS explain WHY they're a good fit:
- Use getRecommendedVendors/getRecommendedSponsors - they return matchReasons and whyRecommended
- Present recommendations with their specific match reasons (location, rating, budget fit, etc.)
- Example: "I recommend ABC Catering - they're verified, highly rated (4.8★), and located near your venue."

When displaying recommendations:
- Show the vendor/sponsor name with 1-2 key reasons why they match
- Mention location if it's relevant to the event
- Highlight verified status and ratings when available
- Explain budget fit if the event has budget info

## Response Style:

- SHORT responses (1-3 sentences)
- NO bullet lists of tips or suggestions unless asked
- NO lengthy explanations of what info you need
- DIRECT action: "I'll create that for you now" or "What date works for you?"
- EXPLAIN match reasons when recommending vendors/sponsors

## Example Good Responses:

User: "I want to create a workshop"
Good: "Got it! What date are you thinking for the workshop?"

User: "A tech meetup next Friday"
Good: "I'll create your tech meetup for next Friday now."
[Then call createEvent]

User: "Conference in January for 200 people"
Good: "Creating your conference for January with 200 expected attendees."
[Then call createEvent with title, date, expectedAttendees]

User: "Find me a caterer for my event"
Good: [Call getRecommendedVendors with category: catering]
Then: "I found 3 catering options. Top pick: Gourmet Events - they're verified, have a 4.7★ rating, and are located in your area."

User: "Why should I choose this vendor?"
Good: "ABC Catering is recommended because: they're verified, have excellent reviews (4.8★), their mid-range pricing fits your budget, and they're located near your venue in San Francisco."

## What NOT to do:

- DON'T list 10 things the user could tell you
- DON'T give generic event planning advice
- DON'T explain all your capabilities
- DON'T ask multiple questions at once
- DON'T recommend vendors without explaining WHY they match

## Tools Available:

- createEvent: Create events (requires confirmation)
- searchVendors/searchSponsors: Find service providers by category/filters
- getRecommendedVendors/getRecommendedSponsors: Get AI-matched recommendations with match reasons
- addVendorToEvent/addSponsorToEvent: Connect vendors/sponsors to events
- getUserProfile: Get user context for better matching

Remember: Your job is to CREATE events quickly and help users find the BEST vendors/sponsors with clear explanations of why they're a good fit.`

// ============================================================================
// CORS Configuration
// ============================================================================

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://open-event.vercel.app',
  'https://openevent.app',
  'https://openevent.my',
  'https://www.openevent.my',
]

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin')
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Handle preflight OPTIONS request for CORS
http.route({
  path: '/api/chat/stream',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    })
  }),
})

// Handle preflight for tool execution endpoint
http.route({
  path: '/api/chat/execute-tool',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    })
  }),
})

// ============================================================================
// Direct Tool Execution Endpoint (for confirmed tools)
// ============================================================================

http.route({
  path: '/api/chat/execute-tool',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const headers = { ...getCorsHeaders(request), 'Content-Type': 'application/json' }

    // Validate request size (1MB limit for JSON)
    const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
    if (sizeError) {
      return sizeError
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers,
      })
    }

    const parsed = executeToolSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: parsed.error.issues.map((i) => i.message),
        }),
        { status: 400, headers }
      )
    }

    const { toolName, toolArguments } = parsed.data

    // Get user identity - try Convex Auth first, then fall back to custom session tokens
    let user = null

    // Try Convex Auth (JWT tokens from ConvexAuthProvider)
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      user = await ctx.runQuery(api.queries.auth.getCurrentUser)
    }

    // Fall back to custom session token (from custom HTTP auth)
    if (!user) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7)
        user = await ctx.runQuery(internal.customAuth.getUserByAccessToken, { accessToken })
      }
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      })
    }

    // Check rate limit (uses same limit as chat endpoint)
    const rateLimit = await ctx.runQuery(api.aiUsage.checkRateLimit, { userId: user._id })
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You've used all ${rateLimit.limit} AI prompts for today.`,
          remaining: 0,
          limit: rateLimit.limit,
        }),
        { status: 429, headers }
      )
    }

    try {
      // Execute the tool directly
      const result = await executeToolHandler(
        ctx,
        user._id,
        `confirmed-${Date.now()}`,
        toolName as ToolName,
        toolArguments
      )

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers,
      })
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          summary: 'Tool execution failed',
        }),
        { status: 500, headers }
      )
    }
  }),
})

// ============================================================================
// Stripe Webhook Endpoint
// ============================================================================

// POST /api/stripe/webhook - Handle Stripe webhook events
http.route({
  path: '/api/stripe/webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate request size (10MB limit for webhooks - they can be large)
      const sizeError = validateRequestSize(request, 10 * 1024 * 1024)
      if (sizeError) {
        return sizeError
      }

      const signature = request.headers.get('stripe-signature')
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const payload = await request.text()

      // Call the webhook handler action
      const result = await ctx.runAction(api.stripe.handleWebhook, {
        payload,
        signature,
      })

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Stripe webhook error:', error)
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }),
})

http.route({
  path: '/api/chat/stream',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const headers = { ...getCorsHeaders(request), 'Content-Type': 'application/json' }

    // Validate request size (1MB limit for JSON)
    const sizeError = validateRequestSize(request, 1 * 1024 * 1024)
    if (sizeError) {
      return sizeError
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers,
      })
    }

    const parsed = chatStreamSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: parsed.error.issues.map((i) => i.message),
        }),
        { status: 400, headers }
      )
    }

    const { messages: clientMessages, userMessage, confirmedToolCalls } = parsed.data

    // Get user identity - try Convex Auth first, then fall back to custom session tokens
    let user = null

    // Try Convex Auth (JWT tokens from ConvexAuthProvider)
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      user = await ctx.runQuery(api.queries.auth.getCurrentUser)
    }

    // Fall back to custom session token (from custom HTTP auth)
    if (!user) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7)
        user = await ctx.runQuery(internal.customAuth.getUserByAccessToken, { accessToken })
      }
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      })
    }

    // Atomic check AND increment - prevents race conditions
    const rateLimit = await ctx.runMutation(internal.aiUsage.checkAndIncrementUsage, {
      userId: user._id,
    })
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message:
            rateLimit.reason ||
            `You've used all ${rateLimit.limit} AI prompts for today. Your limit resets at midnight UTC.`,
          remaining: 0,
          limit: rateLimit.limit,
        }),
        {
          status: 429,
          headers,
        }
      )
    }

    // Store rate limit info for response
    const currentRateLimit = rateLimit

    // Get user profile for context
    // Note: getCurrentUser in lib/auth.ts now supports both Convex Auth and custom session tokens
    const profile = await ctx.runQuery(api.organizerProfiles.getMyProfile, {})

    // Build message history for OpenAI
    // Include current date so AI uses correct year for dates
    const today = new Date()
    const dateContext = `\n\n## Current Date:\nToday is ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. When users mention dates like "December 25th" without a year, use the NEXT upcoming occurrence (which would be ${today.getFullYear()} or ${today.getFullYear() + 1} depending on whether it has passed).`

    const chatHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: profile
          ? `${SYSTEM_PROMPT}${dateContext}\n\n## User Context:\n- Organization: ${profile.organizationName || 'Not set'}\n- Event Types: ${profile.eventTypes?.join(', ') || 'Not specified'}\n- Experience: ${profile.experienceLevel || 'Unknown'}`
          : `${SYSTEM_PROMPT}${dateContext}`,
      },
    ]

    // Add previous conversation history from client
    if (clientMessages && clientMessages.length > 0) {
      for (const msg of clientMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          chatHistory.push({
            role: msg.role,
            content: msg.content,
          })
        }
      }
    }

    // Add the new user message
    chatHistory.push({
      role: 'user',
      content: userMessage,
    })

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Get available tools
    const tools = getOpenAITools()

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const currentMessages = [...chatHistory]
          const allToolCalls: ToolCall[] = []
          const allToolResults: ToolResult[] = []
          const pendingConfirmations: ToolCall[] = []
          let finalMessage = ''
          let isComplete = false
          let entityId: string | undefined

          const MAX_ITERATIONS = 5
          let iteration = 0

          while (iteration < MAX_ITERATIONS) {
            iteration++

            // Send thinking event
            sendEvent('thinking', { iteration })

            // Create streaming completion with retry logic
            const stream = await callOpenAIWithRetry(openai, {
              model: 'gpt-4o-mini',
              messages: currentMessages,
              tools,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 1500,
              stream: true,
            })

            let currentContent = ''
            const currentToolCalls: Array<{
              id: string
              function: { name: string; arguments: string }
            }> = []

            // Process streaming chunks
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta

              // Stream text content
              if (delta?.content) {
                currentContent += delta.content
                sendEvent('text', { content: delta.content })
              }

              // Accumulate tool calls
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index
                  if (!currentToolCalls[index]) {
                    currentToolCalls[index] = {
                      id: tc.id || '',
                      function: { name: '', arguments: '' },
                    }
                  }
                  if (tc.id) currentToolCalls[index].id = tc.id
                  if (tc.function?.name) currentToolCalls[index].function.name += tc.function.name
                  if (tc.function?.arguments)
                    currentToolCalls[index].function.arguments += tc.function.arguments
                }
              }
            }

            // If no tool calls, we're done
            if (currentToolCalls.length === 0) {
              finalMessage = currentContent
              break
            }

            // Process tool calls
            const toolCalls: ToolCall[] = currentToolCalls
              .filter((tc) => tc.id && tc.function.name)
              .map((tc) => {
                let parsedArgs: Record<string, unknown> = {}
                try {
                  parsedArgs = JSON.parse(tc.function.arguments)
                } catch {
                  // Continue with empty arguments
                }
                return {
                  id: tc.id,
                  name: tc.function.name as ToolName,
                  arguments: parsedArgs,
                }
              })

            // Add assistant message with tool calls to history
            currentMessages.push({
              role: 'assistant',
              content: currentContent,
              tool_calls: currentToolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: tc.function,
              })),
            })

            // Execute each tool call
            for (const toolCall of toolCalls) {
              allToolCalls.push(toolCall)

              // Send tool start event
              sendEvent('tool_start', {
                id: toolCall.id,
                name: toolCall.name,
                arguments: toolCall.arguments,
              })

              // Check if this tool requires confirmation
              if (toolRequiresConfirmation(toolCall.name)) {
                if (!confirmedToolCalls?.includes(toolCall.id)) {
                  pendingConfirmations.push(toolCall)
                  sendEvent('tool_pending', {
                    id: toolCall.id,
                    name: toolCall.name,
                    arguments: toolCall.arguments,
                  })

                  const placeholderResult: ToolResult = {
                    toolCallId: toolCall.id,
                    name: toolCall.name,
                    success: false,
                    error: 'Awaiting user confirmation',
                    summary: 'This action requires your confirmation',
                  }
                  allToolResults.push(placeholderResult)
                  currentMessages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(placeholderResult),
                  })
                  continue
                }
              }

              // Execute the tool
              const result = await executeToolHandler(
                ctx,
                user._id,
                toolCall.id,
                toolCall.name,
                toolCall.arguments
              )
              allToolResults.push(result)

              // Send tool result event
              sendEvent('tool_result', {
                id: toolCall.id,
                name: toolCall.name,
                success: result.success,
                summary: result.summary,
                data: result.data,
                error: result.error,
              })

              // Check if event was created
              if (result.name === 'createEvent' && result.success && result.data) {
                isComplete = true
                entityId = (result.data as { eventId: string }).eventId
              }

              // Add tool result to messages
              currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              })
            }

            // If there are pending confirmations, stop and ask user
            if (pendingConfirmations.length > 0) {
              const confirmCompletion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                  ...currentMessages,
                  {
                    role: 'user',
                    content:
                      'The action requires user confirmation. Please explain what you are about to do and ask for confirmation.',
                  },
                ],
                temperature: 0.7,
                max_tokens: 500,
              })
              finalMessage = confirmCompletion.choices[0]?.message?.content || ''

              // Stream the confirmation message
              if (finalMessage) {
                sendEvent('text', { content: finalMessage })
              }
              break
            }
          }

          // Usage already incremented atomically at the start - no need to increment again

          // Send completion event with rate limit info from atomic check
          sendEvent('done', {
            message: finalMessage,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            pendingConfirmations,
            isComplete,
            entityId,
            // Include rate limit info from atomic check-and-increment
            rateLimit: {
              remaining: currentRateLimit.remaining,
              limit: currentRateLimit.limit,
            },
          })
        } catch (error) {
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...getCorsHeaders(request),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),
})

export default http
