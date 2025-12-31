import React from 'react'
import { Navigate } from 'react-router-dom'
import { CircleNotch, ShieldWarning } from '@phosphor-icons/react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface AdminProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  requireSuperadmin?: boolean
}

export function AdminProtectedRoute({
  children,
  redirectTo = '/dashboard',
  requireSuperadmin = false,
}: AdminProtectedRouteProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const user = useQuery(api.queries.auth.getCurrentUser)

  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/bf0148c8-69d2-4cb6-82fd-f2bf765adef1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'src/components/admin/AdminProtectedRoute.tsx:19',
        message: 'AdminProtectedRoute user query state',
        data: {
          isAuthenticated,
          isLoading: authLoading,
          hasUser: !!user,
          userId: user?._id,
          userRole: user?.role,
          userStatus: user?.status,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'client-query',
        hypothesisId: 'C1',
      }),
    }).catch(() => {})
  }, [isAuthenticated, authLoading, user])
  // #endregion

  // Still loading auth or user data
  // user === undefined means query is still loading
  if (authLoading || (isAuthenticated && user === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <CircleNotch
            size={32}
            weight="bold"
            className="animate-spin text-amber-500 mx-auto mb-4"
          />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  // Not authenticated or user not found (null means query completed but no user)
  if (!isAuthenticated || user === null || user === undefined) {
    return <Navigate to="/sign-in" replace />
  }

  // At this point, user is guaranteed to be defined
  // Check if user is suspended
  if (user.status === 'suspended') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <ShieldWarning size={48} weight="duotone" className="text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Account Suspended</h1>
          <p className="text-muted-foreground mb-4">
            Your account has been suspended. Please contact support for more information.
          </p>
          {user.suspendedReason && (
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              Reason: {user.suspendedReason}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Check role requirements
  const isAdmin = user.role === 'admin' || user.role === 'superadmin'
  const isSuperadmin = user.role === 'superadmin'

  if (requireSuperadmin && !isSuperadmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <ShieldWarning size={48} weight="duotone" className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Superadmin Access Required</h1>
          <p className="text-muted-foreground">
            This area requires superadmin privileges. Please contact your system administrator.
          </p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
