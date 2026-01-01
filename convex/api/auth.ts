// ============================================================================
// API Authentication Middleware
// ============================================================================
// Handles API key validation and authorization for HTTP actions

import type { ActionCtx } from '../_generated/server'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import { ApiErrors, withRateLimitHeaders } from './helpers'
import { hasPermission } from '../apiKeys'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface ApiKeyInfo {
  keyId: Id<'apiKeys'>
  userId: Id<'users'>
  permissions: string[]
  rateLimit: number
}

export interface AuthResult {
  success: true
  keyInfo: ApiKeyInfo
}

export interface AuthError {
  success: false
  response: Response
}

export type AuthValidationResult = AuthResult | AuthError

// ----------------------------------------------------------------------------
// Key Hashing (must match apiKeys.ts)
// ----------------------------------------------------------------------------

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ----------------------------------------------------------------------------
// API Key Extraction
// ----------------------------------------------------------------------------

/**
 * Extract API key from request headers
 * Supports two formats:
 * 1. X-API-Key: oe_live_xxx
 * 2. Authorization: Bearer oe_live_xxx
 */
export function extractApiKey(request: Request): string | null {
  // Try X-API-Key header first
  const xApiKey = request.headers.get('X-API-Key')
  if (xApiKey && xApiKey.startsWith('oe_')) {
    return xApiKey
  }

  // Try Authorization header
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer oe_')) {
    return authHeader.substring(7) // Remove "Bearer "
  }

  return null
}

// ----------------------------------------------------------------------------
// API Key Validation
// ----------------------------------------------------------------------------

/**
 * Validate API key and check rate limits
 * Returns the key info if valid, or an error response
 */
export async function validateApiKey(
  ctx: ActionCtx,
  request: Request
): Promise<AuthValidationResult> {
  // Extract API key from request
  const apiKey = extractApiKey(request)

  if (!apiKey) {
    return {
      success: false,
      response: ApiErrors.unauthorized(
        'API key required. Provide via X-API-Key header or Authorization: Bearer token.'
      ),
    }
  }

  // Validate key format
  if (!apiKey.startsWith('oe_live_') && !apiKey.startsWith('oe_test_')) {
    return {
      success: false,
      response: ApiErrors.unauthorized('Invalid API key format'),
    }
  }

  // Get key prefix and hash
  const keyPrefix = apiKey.substring(0, 16)
  const keyHash = await hashApiKey(apiKey)

  // Validate key against database
  const keyInfo = await ctx.runQuery(internal.apiKeys.validateKey, {
    keyPrefix,
    keyHash,
  })

  if (!keyInfo) {
    return {
      success: false,
      response: ApiErrors.unauthorized('Invalid or expired API key'),
    }
  }

  // Check rate limit
  const rateLimit = await ctx.runQuery(internal.apiKeys.checkRateLimit, {
    keyId: keyInfo._id,
  })

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    const response = ApiErrors.rateLimitExceeded(retryAfter)
    return {
      success: false,
      response: withRateLimitHeaders(
        response,
        rateLimit.limit,
        rateLimit.remaining,
        rateLimit.resetAt
      ),
    }
  }

  // Increment rate limit counter and update last used
  await ctx.runMutation(internal.apiKeys.incrementRateLimit, {
    keyId: keyInfo._id,
  })

  // Get client IP if available
  const ip =
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    request.headers.get('CF-Connecting-IP') ||
    undefined

  await ctx.runMutation(internal.apiKeys.updateLastUsed, {
    keyId: keyInfo._id,
    ip,
  })

  return {
    success: true,
    keyInfo: {
      keyId: keyInfo._id,
      userId: keyInfo.userId,
      permissions: keyInfo.permissions,
      rateLimit: keyInfo.rateLimit,
    },
  }
}

// ----------------------------------------------------------------------------
// Permission Checking
// ----------------------------------------------------------------------------

/**
 * Check if the API key has the required permission
 * Returns an error response if permission is denied
 */
export function requirePermission(keyInfo: ApiKeyInfo, required: string): Response | null {
  if (!hasPermission(keyInfo.permissions, required)) {
    return ApiErrors.forbidden(`This API key does not have the '${required}' permission`)
  }
  return null
}

/**
 * Check multiple permissions (all required)
 */
export function requireAllPermissions(keyInfo: ApiKeyInfo, required: string[]): Response | null {
  for (const perm of required) {
    if (!hasPermission(keyInfo.permissions, perm)) {
      return ApiErrors.forbidden(`This API key does not have the '${perm}' permission`)
    }
  }
  return null
}

/**
 * Check multiple permissions (any one is sufficient)
 */
export function requireAnyPermission(keyInfo: ApiKeyInfo, anyOf: string[]): Response | null {
  const hasAny = anyOf.some((perm) => hasPermission(keyInfo.permissions, perm))
  if (!hasAny) {
    return ApiErrors.forbidden(
      `This API key requires one of these permissions: ${anyOf.join(', ')}`
    )
  }
  return null
}

// ----------------------------------------------------------------------------
// Permission Constants (re-export for convenience)
// ----------------------------------------------------------------------------

export const PERMISSIONS = {
  // Events
  EVENTS_READ: 'events:read',
  EVENTS_WRITE: 'events:write',
  EVENTS_DELETE: 'events:delete',

  // Vendors
  VENDORS_READ: 'vendors:read',

  // Sponsors
  SPONSORS_READ: 'sponsors:read',

  // Tasks
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',

  // Budget
  BUDGET_READ: 'budget:read',
  BUDGET_WRITE: 'budget:write',

  // Analytics
  ANALYTICS_READ: 'analytics:read',

  // User profile
  PROFILE_READ: 'profile:read',
  PROFILE_WRITE: 'profile:write',

  // Full access
  ADMIN: '*',
} as const
