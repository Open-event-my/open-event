import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { UserRole } from '@/types/onboarding'

interface UserContextType {
  role: UserRole
  organizationName: string
  isOrganizer: boolean
  isSponsor: boolean
  isVendor: boolean
  isAdmin: boolean
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const profile = useQuery(api.organizerProfiles.getMyProfile, isAuthenticated ? {} : 'skip')
  const user = useQuery(api.queries.auth.getCurrentUser)

  const contextValue = useMemo(() => {
    // Default to 'organizer' if unknown, but flag loading
    const role = (profile?.role as UserRole) || 'organizer'
    
    return {
      role,
      organizationName: profile?.organizationName || 'My Workspace',
      isOrganizer: role === 'organizer',
      isSponsor: role === 'sponsor',
      isVendor: role === 'vendor',
      isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
      isLoading: profile === undefined || user === undefined,
    }
  }, [profile, user])

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return context
}
