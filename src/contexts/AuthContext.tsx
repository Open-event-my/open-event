/* eslint-disable react-refresh/only-export-components */
/**
 * Custom Auth Context
 * Manages authentication state using httpOnly cookies for security
 *
 * Security Features:
 * - httpOnly cookies (no localStorage - XSS protected)
 * - Automatic token refresh every 14 minutes
 * - Short-lived access tokens (15 min) with refresh token rotation
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Id } from '../../convex/_generated/dataModel'
import { setUser as setSentryUser } from '@/lib/sentry'

interface User {
  _id: Id<'users'>
  email?: string
  name?: string
  role?: 'superadmin' | 'admin' | 'organizer'
  image?: string
  status?: 'active' | 'suspended' | 'pending'
  suspendedReason?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  /**
   * Access token for Convex queries (stored in memory only, not localStorage).
   * This is needed because Convex WebSocket doesn't have access to cookies.
   * The token is short-lived (15 min) and auto-refreshes.
   * @deprecated For new components, prefer using HTTP endpoints via fetch.
   */
  accessToken: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Get the HTTP API base URL from Convex URL
function getApiBaseUrl(): string {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string
  if (!convexUrl) {
    // Fallback for local development
    return 'http://localhost:3001'
  }
  // Convert convex.cloud to convex.site for HTTP endpoints
  return convexUrl.replace('.convex.cloud', '.convex.site')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const apiBaseUrl = getApiBaseUrl()

  // Check authentication on mount
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setAccessToken(data.accessToken || null)
      } else {
        setUser(null)
        setAccessToken(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      setAccessToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [apiBaseUrl])

  // Refresh tokens (called periodically)
  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
          setAccessToken(data.accessToken || null)
        }
      } else {
        // Refresh failed - user needs to login again
        setUser(null)
        setAccessToken(null)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
    }
  }, [apiBaseUrl])

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Update Sentry user context when user changes
  useEffect(() => {
    if (user) {
      setSentryUser({
        id: user._id,
        email: user.email,
        name: user.name,
      })
    } else {
      setSentryUser(null)
    }
  }, [user])

  // Auto-refresh access token every 14 minutes (access token expires in 15 min)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(
      () => {
        refreshAuth()
      },
      14 * 60 * 1000
    ) // 14 minutes

    return () => clearInterval(interval)
  }, [user, refreshAuth])

  // Sign in
  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sign in failed')
      }

      setUser(data.user)
      setAccessToken(data.accessToken || null)
    } finally {
      setIsLoading(false)
    }
  }

  // Sign up
  const signUp = async (email: string, password: string, name?: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed')
      }

      setUser(data.user)
      setAccessToken(data.accessToken || null)
    } finally {
      setIsLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setUser(null)
      setAccessToken(null)
    }
  }

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
