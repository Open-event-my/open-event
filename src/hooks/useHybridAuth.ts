/**
 * Hybrid Auth Hook
 * Supports both Convex Auth (JWT) and custom HTTP auth (session tokens)
 *
 * Priority:
 * 1. Convex Auth token (from useAuthToken)
 * 2. Custom auth token (from AuthContext)
 */

import { useAuthToken } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useAuth } from '@/contexts/AuthContext'

interface HybridAuthResult {
  /** The auth token to use for API requests */
  token: string | null
  /** Whether the user is authenticated via either method */
  isAuthenticated: boolean
  /** Whether auth state is still loading */
  isLoading: boolean
  /** Which auth method is being used: 'convex', 'custom', or null */
  authMethod: 'convex' | 'custom' | null
}

export function useHybridAuth(): HybridAuthResult {
  // Convex Auth
  const { isAuthenticated: isConvexAuth, isLoading: isConvexLoading } = useConvexAuth()
  const convexToken = useAuthToken()

  // Custom Auth
  const {
    isAuthenticated: isCustomAuth,
    isLoading: isCustomLoading,
    accessToken: customToken,
  } = useAuth()

  // Determine which auth method to use
  // Prefer Convex Auth if available
  if (convexToken && isConvexAuth) {
    return {
      token: convexToken,
      isAuthenticated: true,
      isLoading: false,
      authMethod: 'convex',
    }
  }

  // Fall back to custom auth
  if (customToken && isCustomAuth) {
    return {
      token: customToken,
      isAuthenticated: true,
      isLoading: false,
      authMethod: 'custom',
    }
  }

  // Still loading
  if (isConvexLoading || isCustomLoading) {
    return {
      token: null,
      isAuthenticated: false,
      isLoading: true,
      authMethod: null,
    }
  }

  // Not authenticated
  return {
    token: null,
    isAuthenticated: false,
    isLoading: false,
    authMethod: null,
  }
}
