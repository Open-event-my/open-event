import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Robot, Notepad, LockKey, Calendar, RocketLaunch } from '@phosphor-icons/react'
import { AgenticChatV2 } from '@/components/agentic'
import { ManualEventForm } from '@/components/events/ManualEventForm'
import { cn } from '@/lib/utils'
import { useQuery } from 'convex/react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { api } from '../../../convex/_generated/api'
import { PLANS } from '../../../convex/config/plans'
import { Button } from '@/components/ui/button'

import type { Id } from '../../../convex/_generated/dataModel'

export function EventCreatePage() {
  const navigate = useNavigate()
  const [useAI, setUseAI] = useState(true)
  const { organization } = useOrganization()

  // Use centralized capacity query for consistent limit checking
  const capacity = useQuery(
    api.organizations.getCapacity,
    organization?.id ? { organizationId: organization.id as Id<'organizations'> } : 'skip'
  )

  // For personal account (no org), check personal event limits
  const stats = useQuery(api.events.getMyStats)

  // Loading state
  if (organization && capacity === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Check organization event limits
  const isOrgLimitReached = capacity?.events.isAtCapacity ?? false
  const orgEventLimit = capacity?.events.limit
  const orgEventUsed = capacity?.events.used ?? 0
  const planName = capacity?.plan.name ?? 'Free'

  // For personal accounts without organization
  const personalLimit = PLANS.free.maxEvents
  const personalActiveEvents = stats?.activeEvents ?? 0
  const isPersonalLimitReached = !organization && personalActiveEvents >= personalLimit

  const isLimitReached = organization ? isOrgLimitReached : isPersonalLimitReached
  const effectiveLimit = organization ? orgEventLimit : personalLimit
  const currentUsed = organization ? orgEventUsed : personalActiveEvents

  if (isLimitReached) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-full flex items-center justify-center mb-6">
          <LockKey size={32} weight="duotone" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Event Limit Reached</h1>
        <p className="text-muted-foreground max-w-md mb-6">
          {organization ? (
            <>
              Your organization has reached the limit of{' '}
              <strong>
                {effectiveLimit} active event{effectiveLimit !== 1 ? 's' : ''}
              </strong>{' '}
              on the {planName} plan.
            </>
          ) : (
            <>
              You've reached the limit of{' '}
              <strong>
                {personalLimit} active event{personalLimit !== 1 ? 's' : ''}
              </strong>{' '}
              for personal accounts.
            </>
          )}
        </p>

        {/* Usage indicator */}
        <div className="w-full max-w-xs mb-8">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={16} />
              Active Events
            </span>
            <span className="font-mono font-bold text-amber-600">
              {currentUsed} / {effectiveLimit}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 w-full" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate('/dashboard/settings?tab=billing')}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 text-white"
          >
            <RocketLaunch size={18} weight="fill" />
            {organization ? 'Upgrade Plan' : 'Create Organization'}
          </Button>
        </div>

        {!organization && (
          <p className="text-xs text-muted-foreground mt-6 max-w-sm">
            Create an organization and upgrade to Pro for unlimited events and team collaboration.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Mode Toggle Header */}
      <div className="flex items-center justify-center gap-6 py-4 border-b border-border mb-4">
        <button
          type="button"
          onClick={() => setUseAI(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            useAI
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Robot size={18} weight={useAI ? 'fill' : 'regular'} />
          AI Assistant
        </button>
        <button
          type="button"
          onClick={() => setUseAI(false)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            !useAI
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Notepad size={18} weight={!useAI ? 'fill' : 'regular'} />
          Manual Form
        </button>
      </div>

      {/* Content */}
      {useAI ? (
        <AgenticChatV2
          title="Open Event AI"
          subtitle="What would you like to create?"
          placeholder="Describe your event - include details like type, date, location, and expected attendees..."
          onComplete={(eventId) => {
            navigate(`/dashboard/events/${eventId}`)
          }}
        />
      ) : (
        <ManualEventForm onSuccess={(eventId) => navigate(`/dashboard/events/${eventId}`)} />
      )}
    </div>
  )
}
