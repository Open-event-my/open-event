import { useQuery } from 'convex/react'
import { Navigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Smart redirect component that routes users based on their role:
 * - superadmin/admin → /admin
 * - organizer (new, no profile) → /onboarding
 * - organizer (existing) → /dashboard
 */
export function AuthRedirect() {
  const { isLoading: authLoading, isAuthenticated, user, accessToken } = useAuth()

  // Determine role for profile query
  const role = user?.role || 'organizer'
  const isOrganizer = role === 'organizer'

  // Always query profile for organizers - we need this to decide the redirect
  const organizerProfile = useQuery(
    api.organizerProfiles.getMyProfile,
    isAuthenticated && user && isOrganizer && accessToken ? { accessToken } : 'skip'
  )

  // Still loading auth
  if (authLoading) {
    return <LoadingSpinner message="Signing you in..." fullScreen />
  }

  // Not authenticated - redirect to sign-in
  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />
  }

  // Authenticated but still loading user data
  if (user === undefined) {
    return <LoadingSpinner message="Loading your account..." fullScreen />
  }

  // User data loaded but null (shouldn't happen, but handle gracefully)
  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  // Check if suspended
  if (user.status === 'suspended') {
    return <Navigate to="/sign-in" replace />
  }

  // Admin/Superadmin → Admin Panel (no onboarding needed)
  if (role === 'admin' || role === 'superadmin') {
    return <Navigate to="/admin" replace />
  }

  // Organizer → Check if onboarding needed
  // Still loading profile - wait for it
  if (organizerProfile === undefined) {
    return <LoadingSpinner message="Setting up your workspace..." fullScreen />
  }

  // No profile yet → Onboarding
  if (!organizerProfile) {
    return <Navigate to="/onboarding" replace />
  }

  // Has profile → Dashboard
  return <Navigate to="/dashboard" replace />
}
