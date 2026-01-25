import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { PLANS, type PlanKey } from '../../../convex/config/plans'
import { useOrganizationRole } from '@/hooks/useOrganizationRole'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Crown,
  Lightning,
  Users,
  Calendar,
  RocketLaunch,
  Info,
  CircleNotch,
  Buildings,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Id } from '../../../convex/_generated/dataModel'

export function BillingTab() {
  const { organization, isLoading: isLoadingOrg } = useOrganization()
  const { isOwner, isAdmin } = useOrganizationRole()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isManaging, setIsManaging] = useState(false)

  // Actions
  const createCheckout = useAction(api.stripe.createSubscriptionCheckout)
  const createPortal = useAction(api.stripe.createBillingPortalSession)

  // Use the centralized capacity query for consistent data
  const capacity = useQuery(
    api.organizations.getCapacity,
    organization?.id ? { organizationId: organization.id as Id<'organizations'> } : 'skip'
  )

  // Pass organization context to AI usage for org-scoped limits
  const aiUsage = useQuery(
    api.aiUsage.getMyUsage,
    organization?.id ? { organizationId: organization.id as Id<'organizations'> } : 'skip'
  )

  // Plan change action (for downgrading to free)
  const downgradeToFree = useAction(api.organizations.downgradeToFree)

  if (isLoadingOrg) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <CircleNotch size={24} className="animate-spin mr-2" />
        Loading organization...
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <Buildings size={32} className="text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">No Organization Found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-1">
            You need to create or join an organization to manage billing and subscriptions.
          </p>
        </div>
        {/* We can direct them to the organization tab or a creation modal */}
        <p className="text-sm text-muted-foreground">
          Go to the <span className="font-medium text-foreground">Organization</span> tab to set up
          your organization details.
        </p>
      </div>
    )
  }

  if (capacity === undefined) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <CircleNotch size={24} className="animate-spin mr-2" />
        Loading billing information...
      </div>
    )
  }

  if (capacity === null) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load billing information. Please try refreshing the page.
      </div>
    )
  }

  const currentPlanKey = (capacity.plan.key as PlanKey) || 'free'
  const currentPlan = PLANS[currentPlanKey]
  const isFree = currentPlanKey === 'free'

  const handleManageSubscription = async () => {
    if (!organization?.id || !isOwner) return

    setIsManaging(true)
    try {
      const { url } = await createPortal({
        organizationId: organization.id as Id<'organizations'>,
      })

      if (url) {
        window.location.href = url
      } else {
        toast.error('Failed to create billing portal session')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to access billing portal')
    } finally {
      setIsManaging(false)
    }
  }

  const handleUpgrade = async (plan: PlanKey) => {
    if (!organization?.id || !isOwner) {
      toast.error('Only the organization owner can change the plan')
      return
    }

    const planConfig = PLANS[plan]

    // For paid plans
    if (planConfig.price && planConfig.price > 0) {
      // If already on a paid plan, use the portal to switch plans
      if (!isFree) {
        setIsManaging(true)
        try {
          const { url } = await createPortal({
            organizationId: organization.id as Id<'organizations'>,
          })
          if (url) {
            window.location.href = url
            return
          }
        } catch {
          toast.error('Failed to access billing portal')
        } finally {
          setIsManaging(false)
        }
        return
      }

      // New subscription (upgrade from free)
      setIsUpgrading(true)
      try {
        const { url } = await createCheckout({
          organizationId: organization.id as Id<'organizations'>,
          plan: plan,
        })

        if (url) {
          window.location.href = url
        } else {
          toast.error('Failed to start checkout process')
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
      } finally {
        setIsUpgrading(false)
      }
      return
    }

    // For downgrade to free, use downgradeToFree action
    setIsUpgrading(true)
    try {
      const result = await downgradeToFree({
        organizationId: organization.id as Id<'organizations'>,
      })
      if (result.success) {
        toast.success(result.message || `Plan changed to ${PLANS[plan].name}`)
      } else {
        toast.error(result.error || 'Failed to change plan')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change plan')
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Current Plan
                {!isFree && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    Active
                  </span>
                )}
              </h3>
              <p className="text-muted-foreground mt-1">
                You are currently on the{' '}
                <strong className="text-foreground">{currentPlan.name}</strong> plan.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold font-mono">
                {currentPlan.price === 0 || currentPlan.price === null
                  ? 'Free'
                  : `$${currentPlan.price / 100}`}
                <span className="text-sm font-sans font-normal text-muted-foreground">/mo</span>
              </div>
              {!isFree && isOwner && (
                <Button
                  variant="link"
                  className="h-auto p-0 mt-1 text-primary"
                  onClick={handleManageSubscription}
                  disabled={isManaging}
                >
                  {isManaging ? 'Loading...' : 'Manage Subscription'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 grid gap-6 md:grid-cols-3">
          {/* Usage Stats */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Usage
            </h4>

            {/* Events Usage */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-muted-foreground" />
                  Active Events
                </span>
                <span className="font-mono">
                  {capacity.events.used} /{' '}
                  {capacity.events.isUnlimited ? '∞' : capacity.events.limit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full bg-primary transition-all',
                    capacity.events.isAtCapacity ? 'bg-amber-500' : ''
                  )}
                  style={{
                    width: capacity.events.isUnlimited
                      ? '0%'
                      : `${Math.min(100, capacity.events.percentUsed)}%`,
                  }}
                />
              </div>
            </div>

            {/* Members Usage */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  Team Members
                </span>
                <span className="font-mono">
                  {capacity.members.total} / {capacity.members.limit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full bg-primary transition-all',
                    capacity.members.isAtCapacity ? 'bg-amber-500' : ''
                  )}
                  style={{
                    width: `${Math.min(100, capacity.members.percentUsed)}%`,
                  }}
                />
              </div>
              {capacity.members.pending > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Info size={12} />
                  Includes {capacity.members.pending} pending invitation
                  {capacity.members.pending > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* AI Usage */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2">
                  <Lightning size={16} className="text-muted-foreground" />
                  AI Credits (Daily)
                </span>
                <span className="font-mono">
                  {aiUsage?.promptsUsed ?? 0} /{' '}
                  {currentPlan.aiDailyLimit === Infinity ? '∞' : currentPlan.aiDailyLimit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full bg-primary transition-all',
                    aiUsage?.status === 'exceeded'
                      ? 'bg-red-500'
                      : aiUsage?.status === 'critical'
                        ? 'bg-amber-500'
                        : ''
                  )}
                  style={{
                    width: `${aiUsage?.percentageUsed ?? 0}%`,
                  }}
                />
              </div>
              {aiUsage?.timeUntilReset && (
                <p className="text-xs text-muted-foreground mt-1">
                  Resets in {aiUsage.timeUntilReset.formatted}
                </p>
              )}
            </div>
          </div>

          {/* Plan Features */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Included Features
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} weight="fill" className="text-emerald-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
              {currentPlan.prioritySupport && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} weight="fill" className="text-emerald-500 flex-shrink-0" />
                  Priority Support
                </div>
              )}
              {currentPlan.canExportData && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} weight="fill" className="text-emerald-500 flex-shrink-0" />
                  Data Export
                </div>
              )}
              {currentPlan.canCustomBranding && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} weight="fill" className="text-emerald-500 flex-shrink-0" />
                  Custom Branding
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      {isAdmin && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pro Plan */}
          <div
            className={cn(
              'p-6 rounded-xl border bg-card relative overflow-hidden group transition-colors',
              currentPlanKey === 'pro'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <RocketLaunch size={100} weight="duotone" className="text-primary" />
            </div>

            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              Pro Plan
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                Recommended
              </span>
            </h3>
            <p className="text-muted-foreground mb-4">
              Perfect for growing teams and regular events.
            </p>
            <div className="mb-6">
              <span className="text-3xl font-bold">${PLANS.pro.price / 100}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                Unlimited Active Events
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                Up to {PLANS.pro.maxMembers} Team Members
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                Unlimited AI Assistant
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-emerald-500" />
                Data Export
              </li>
            </ul>

            <Button
              onClick={() => handleUpgrade('pro')}
              className="w-full"
              disabled={isUpgrading || !isOwner || currentPlanKey === 'pro'}
              variant={currentPlanKey === 'pro' ? 'outline' : 'default'}
            >
              {isUpgrading && currentPlanKey !== 'pro' ? (
                <>
                  <CircleNotch size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : currentPlanKey === 'pro' ? (
                'Current Plan'
              ) : !isFree ? (
                'Switch Plan'
              ) : (
                'Upgrade to Pro'
              )}
            </Button>
          </div>

          {/* Business Plan */}
          <div
            className={cn(
              'p-6 rounded-xl border bg-card relative overflow-hidden group transition-colors',
              currentPlanKey === 'business'
                ? 'border-purple-500 bg-purple-500/5'
                : 'border-border hover:border-purple-500/50'
            )}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Crown size={100} weight="duotone" className="text-purple-500" />
            </div>

            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">Business Plan</h3>
            <p className="text-muted-foreground mb-4">For large organizations and agencies.</p>
            <div className="mb-6">
              <span className="text-3xl font-bold">${PLANS.business.price / 100}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-purple-500" />
                Everything in Pro
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-purple-500" />
                Up to {PLANS.business.maxMembers} Team Members
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-purple-500" />
                Priority Support
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} weight="fill" className="text-purple-500" />
                Custom Branding
              </li>
            </ul>

            <Button
              onClick={() => handleUpgrade('business')}
              variant="outline"
              className={cn(
                'w-full',
                currentPlanKey !== 'business' && 'hover:border-purple-500 hover:text-purple-500'
              )}
              disabled={isUpgrading || !isOwner || currentPlanKey === 'business'}
            >
              {isUpgrading && currentPlanKey !== 'business' ? (
                <>
                  <CircleNotch size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : currentPlanKey === 'business' ? (
                'Current Plan'
              ) : !isFree ? (
                'Switch Plan'
              ) : (
                'Upgrade to Business'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Enterprise Contact */}
      {!isFree && isOwner && (
        <div className="p-6 rounded-xl border border-border bg-gradient-to-r from-muted/50 to-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Need more?</h3>
              <p className="text-sm text-muted-foreground">
                Contact us for custom Enterprise plans with unlimited members and dedicated support.
              </p>
            </div>
            <Button variant="outline" onClick={() => toast.info('Contact sales coming soon!')}>
              Contact Sales
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
