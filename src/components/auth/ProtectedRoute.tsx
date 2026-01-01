import React from 'react'
import { Navigate } from 'react-router-dom'
import { CircleNotch } from '@phosphor-icons/react'
import { useConvexAuth } from 'convex/react'
import { useAuthToken } from '@convex-dev/auth/react'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/sign-in' }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const authToken = useAuthToken()

  // Consider authenticated if either isAuthenticated is true OR we have an auth token
  // This handles cases where useConvexAuth() is slow to update but token exists
  const isActuallyAuthenticated = isAuthenticated || !!authToken

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <CircleNotch size={32} weight="bold" className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isActuallyAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
