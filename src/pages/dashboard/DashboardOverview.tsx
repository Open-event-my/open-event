import { useQuery, useConvexAuth } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
  ListBullets,
  SquaresFour,
  Storefront,
  Handshake,
  // Lightbulb, // Used by Suggested Actions feature
  Plus,
  PencilSimple,
  // BookOpen, // Used by Suggested Actions feature
  // Upload, // Used by Suggested Actions feature
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/constants'
import { useState } from 'react'
import { NotificationTestHelper } from '@/components/notifications/NotificationTestHelper'

type ViewMode = 'list' | 'grid'

// TODO: Used by Suggested Actions feature - uncomment when API is implemented
// Icon mapping for suggested actions
// const ACTION_ICONS: Record<string, React.ElementType> = {
//   Plus,
//   Handshake,
//   BookOpen,
//   Upload,
//   Calendar,
// }

// interface SuggestedAction {
//   id: string
//   icon: string
//   title: string
//   description: string
//   link: string
//   cta: string
// }

export function DashboardOverview() {
  const { isAuthenticated } = useConvexAuth()
  const profile = useQuery(api.organizerProfiles.getMyProfile, isAuthenticated ? {} : 'skip')
  const stats = useQuery(api.events.getMyStats)
  const upcomingEvents = useQuery(api.events.getUpcoming, { limit: 6 })
  // TODO: Implement getSuggestedActions in recommendations module when API is ready

  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const orgName = profile?.organizationName || 'My workspace'

  // Check if user has any events for onboarding state
  const hasEvents = upcomingEvents && upcomingEvents.length > 0
  const isNewUser = stats?.totalEvents === 0

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Workspace Header - Typeform style */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
            {orgName}
          </h1>
          <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0 hidden sm:block">
            <span className="sr-only">More options</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="3" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="13" cy="8" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* View Toggle - refined */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-muted/50 rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 sm:p-2 rounded-md transition-all duration-200 cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center',
              viewMode === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ListBullets size={16} weight="bold" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 sm:p-2 rounded-md transition-all duration-200 cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center',
              viewMode === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <SquaresFour size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* TODO: Suggested Actions Feed - AI Driven - Requires getSuggestedActions API implementation */}
      {/* {suggestedActions && suggestedActions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium uppercase tracking-wider">
             <Lightbulb size={16} weight="fill" className="text-yellow-500" />
             <span>Suggested Actions</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedActions.map((action: SuggestedAction) => {
              const Icon = ACTION_ICONS[action.icon] || Lightbulb
              return (
                <div key={action.id} className="group rounded-xl border border-border/50 bg-card p-5 hover:border-border transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={16} weight="duotone" className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground leading-snug">{action.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                    </div>
                  </div>
                  <Link
                    to={action.link}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    {action.cta}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )} */}

      {/* Stats Row - Clean, consistent style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Events', value: stats?.totalEvents, icon: Calendar },
          { label: 'Vendors', value: stats?.confirmedVendors, icon: Storefront },
          { label: 'Sponsors', value: stats?.confirmedSponsors, icon: Handshake },
          { label: 'Attendees', value: stats?.activeEvents, icon: Users },
        ].map((stat) => {
          const Icon = stat.icon
          const displayValue = stat.value === undefined ? '—' : stat.value === 0 ? '—' : stat.value
          return (
            <div
              key={stat.label}
              className="p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-border transition-colors"
            >
              <Icon size={20} weight="duotone" className="text-muted-foreground mb-3" />
              <p
                className={cn(
                  'text-2xl sm:text-3xl font-semibold tracking-tight text-foreground',
                  displayValue === '—' && 'text-muted-foreground/40'
                )}
              >
                {displayValue}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Events Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Recent events</h2>
          {hasEvents && (
            <Link
              to="/dashboard/events"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* Loading State */}
        {upcomingEvents === undefined ? (
          <div
            className={cn(
              viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'
            )}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : isNewUser ? (
          /* Empty State - Clean, warm style */
          <div className="grid md:grid-cols-2 gap-4">
            {/* Suggestion Card 1 */}
            <div className="group rounded-xl border border-border/50 bg-card p-5 hover:border-border transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} weight="duotone" className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">suggestion</p>
                  <h3 className="font-medium text-foreground leading-snug">
                    a tech conference. networking, talks, the whole thing.
                  </h3>
                </div>
              </div>
              <button className="mt-4 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">
                use this
              </button>
            </div>

            {/* Suggestion Card 2 */}
            <div className="group rounded-xl border border-border/50 bg-card p-5 hover:border-border transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Users size={16} weight="duotone" className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">suggestion</p>
                  <h3 className="font-medium text-foreground leading-snug">
                    a hands-on workshop. people learn stuff. you look smart.
                  </h3>
                </div>
              </div>
              <button className="mt-4 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors">
                use this
              </button>
            </div>

            {/* Create New Card */}
            <div className="md:col-span-2">
              <Link
                to="/dashboard/events/new"
                className="flex items-center gap-4 rounded-xl border-2 border-dashed border-border hover:border-foreground/30 bg-muted/30 hover:bg-muted/50 p-5 transition-all duration-150"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Plus size={20} weight="bold" className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">start from scratch</p>
                  <p className="text-sm text-muted-foreground">
                    you know what you're doing. probably.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* List View - Clean style */
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {upcomingEvents.map((event, index) => (
              <Link
                key={event._id}
                to={`/dashboard/events/${event._id}`}
                className={cn(
                  'flex items-center gap-4 px-4 py-3.5',
                  'hover:bg-muted/50 transition-colors',
                  index !== upcomingEvents.length - 1 && 'border-b border-border/50'
                )}
              >
                {/* Event Icon - simple, consistent */}
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} weight="duotone" className="text-muted-foreground" />
                </div>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{event.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {event.venueName && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin size={12} />
                        {event.venueName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(event.startDate)}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-muted text-muted-foreground">
                    {event.status}
                  </span>
                  <ArrowRight size={16} className="text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Grid View - Clean card style */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <Link
                key={event._id}
                to={`/dashboard/events/${event._id}`}
                className="group rounded-xl border border-border/50 bg-card p-5 hover:border-border transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Calendar size={16} weight="duotone" className="text-muted-foreground" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-muted text-muted-foreground">
                    {event.status}
                  </span>
                </div>

                <h3 className="font-semibold text-foreground mb-3 line-clamp-2">{event.title}</h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>{formatDate(event.startDate)}</span>
                  </div>
                  {event.venueName && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span className="truncate">{event.venueName}</span>
                    </div>
                  )}
                  {event.expectedAttendees && (
                    <div className="flex items-center gap-2">
                      <Users size={14} />
                      <span>{event.expectedAttendees} expected</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions on Hover */}
                <div className="mt-4 pt-4 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    to={`/dashboard/events/${event._id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <PencilSimple size={14} />
                    Edit
                  </Link>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Test Helper - Only visible in development */}
      <NotificationTestHelper />
    </div>
  )
}
