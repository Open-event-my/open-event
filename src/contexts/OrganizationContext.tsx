/* eslint-disable react-refresh/only-export-components */
/**
 * Organization Context
 * Manages the current organization context for the application.
 *
 * This provides an interface to access the current organization
 * using the existing Convex-based organization system.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { PLANS, type PlanKey } from '../../convex/config/plans'
// import { useAuth } from './AuthContext'

interface Organization {
  id: Id<'organizations'>
  name: string
  slug: string
  plan?: string
  maxMembers?: number
  maxEvents?: number
  memberRole?: string
}

interface OrganizationContextType {
  organization: Organization | null
  organizations: Organization[]
  isLoading: boolean
  isLoaded: boolean
  setOrganization: (org: Organization | null) => void
  switchOrganization: (orgId: Id<'organizations'>) => void
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

const ORG_STORAGE_KEY = 'open-event-current-org'

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const [currentOrgId, setCurrentOrgId] = useState<Id<'organizations'> | null>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(ORG_STORAGE_KEY)
    return stored ? (stored as Id<'organizations'>) : null
  })

  // Query user's organizations from Convex
  const orgsData = useQuery(
    api.organizations.listMyOrganizations,
    isAuthenticated ? {} : 'skip'
  )

  const isLoading = orgsData === undefined

  // Map to our Organization interface
  const organizations: Organization[] = (orgsData || [])
    .filter((org): org is NonNullable<typeof org> => org !== null)
    .map((org) => {
      const planKey = (org.plan as PlanKey) || 'free'
      const planDetails = PLANS[planKey] || PLANS.free
      
      return {
        id: org._id,
        name: org.name,
        slug: org.slug,
        plan: planKey,
        planDetails,
        maxMembers: org.maxMembers ?? planDetails.maxMembers,
        maxEvents: org.maxEvents ?? (planDetails.maxEvents === Infinity ? 0 : planDetails.maxEvents), // UI expects number
        memberRole: org.memberRole,
        stripeCustomerId: org.stripeCustomerId,
        subscriptionStatus: org.subscriptionStatus,
        currentPeriodEnd: org.currentPeriodEnd,
      }
    })

  // Auto-select first organization if none selected (derived state)
  const autoSelectedOrgId = !isLoading && organizations.length > 0 && !currentOrgId
    ? organizations[0].id
    : currentOrgId

  // Sync auto-selected org to state and localStorage
  useEffect(() => {
    if (autoSelectedOrgId && autoSelectedOrgId !== currentOrgId) {
      setCurrentOrgId(autoSelectedOrgId)
      localStorage.setItem(ORG_STORAGE_KEY, autoSelectedOrgId)
    }
  }, [autoSelectedOrgId, currentOrgId])

  // Clear organization when user logs out (sync to external system)
  useEffect(() => {
    if (!isAuthenticated && currentOrgId !== null) {
      setCurrentOrgId(null)
      localStorage.removeItem(ORG_STORAGE_KEY)
    }
  }, [isAuthenticated, currentOrgId])

  // Find current organization from the list
  const organization = autoSelectedOrgId
    ? organizations.find((org) => org.id === autoSelectedOrgId) || null
    : organizations[0] || null

  const setOrganization = useCallback((org: Organization | null) => {
    if (org) {
      setCurrentOrgId(org.id)
      localStorage.setItem(ORG_STORAGE_KEY, org.id)
    } else {
      setCurrentOrgId(null)
      localStorage.removeItem(ORG_STORAGE_KEY)
    }
  }, [])

  const switchOrganization = useCallback((orgId: Id<'organizations'>) => {
    setCurrentOrgId(orgId)
    localStorage.setItem(ORG_STORAGE_KEY, orgId)
  }, [])

  const value: OrganizationContextType = {
    organization,
    organizations,
    isLoading,
    isLoaded: !isLoading,
    setOrganization,
    switchOrganization,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

/**
 * Hook to access the current organization context.
 */
export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
