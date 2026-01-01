import { useState } from 'react'
import { useQuery } from 'convex/react'
import { Link } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import {
  Calendar,
  MapPin,
  Users,
  Storefront,
  Handshake,
  MagnifyingGlass,
  ArrowRight,
  Globe,
  Monitor,
  Buildings,
} from '@phosphor-icons/react'

export function EventDirectory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [showVendorEvents, setShowVendorEvents] = useState(false)
  const [showSponsorEvents, setShowSponsorEvents] = useState(false)

  const events = useQuery(api.events.listPublic, {
    eventType: eventTypeFilter === 'all' ? undefined : eventTypeFilter,
    locationType: locationFilter === 'all' ? undefined : locationFilter,
    seekingVendors: showVendorEvents || undefined,
    seekingSponsors: showSponsorEvents || undefined,
    search: searchQuery || undefined,
  })

  const eventTypes = useQuery(api.events.getPublicEventTypes)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderLocationIcon = (locationType?: string) => {
    switch (locationType) {
      case 'virtual':
        return <Monitor size={14} weight="duotone" />
      case 'hybrid':
        return <Globe size={14} weight="duotone" />
      default:
        return <Buildings size={14} weight="duotone" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="font-mono text-lg font-bold">
              <span className="text-foreground">open</span>
              <span className="text-primary">-</span>
              <span className="text-foreground">event</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/sign-in"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                )}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Event Directory</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover events looking for vendors and sponsors. Connect with organizers and grow your
            business through event partnerships.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                weight="bold"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search events by name, type, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Event Type */}
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-lg border border-border bg-background',
                  'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              >
                <option value="all">All Event Types</option>
                {eventTypes?.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {/* Location Type */}
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-lg border border-border bg-background',
                  'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              >
                <option value="all">All Locations</option>
                <option value="in-person">In-Person</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hybrid</option>
              </select>

              {/* Toggle Filters */}
              <button
                onClick={() => setShowVendorEvents(!showVendorEvents)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  showVendorEvents
                    ? 'border-orange-500 bg-orange-500/10 text-orange-600'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Storefront size={16} weight="duotone" />
                Seeking Vendors
              </button>

              <button
                onClick={() => setShowSponsorEvents(!showSponsorEvents)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                  showSponsorEvents
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <Handshake size={16} weight="duotone" />
                Seeking Sponsors
              </button>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {!events ? (
          <div className="text-center py-12 text-muted-foreground">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar
              size={48}
              weight="duotone"
              className="mx-auto mb-4 text-muted-foreground/50"
            />
            <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or check back later for new opportunities.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event._id}
                to={`/events/${event._id}`}
                className={cn(
                  'block p-5 rounded-xl border border-border bg-card',
                  'hover:border-primary/50 hover:shadow-lg transition-all group'
                )}
              >
                {/* Event Type Badge */}
                <div className="flex items-center justify-between mb-3">
                  {event.eventType && (
                    <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">
                      {event.eventType}
                    </span>
                  )}
                  <div className="flex gap-2">
                    {event.seekingVendors && (
                      <span className="p-1.5 rounded-md bg-orange-500/10">
                        <Storefront size={14} weight="duotone" className="text-orange-500" />
                      </span>
                    )}
                    {event.seekingSponsors && (
                      <span className="p-1.5 rounded-md bg-purple-500/10">
                        <Handshake size={14} weight="duotone" className="text-purple-500" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>

                {/* Description */}
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {event.description}
                  </p>
                )}

                {/* Event Details */}
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} weight="duotone" />
                    <span>{formatDate(event.startDate)}</span>
                  </div>

                  {event.venueName && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} weight="duotone" />
                      <span className="truncate">{event.venueName}</span>
                    </div>
                  )}

                  {event.locationType && (
                    <div className="flex items-center gap-2">
                      {renderLocationIcon(event.locationType)}
                      <span className="capitalize">{event.locationType}</span>
                    </div>
                  )}

                  {event.expectedAttendees && (
                    <div className="flex items-center gap-2">
                      <Users size={14} weight="duotone" />
                      <span>{event.expectedAttendees.toLocaleString()} expected attendees</span>
                    </div>
                  )}
                </div>

                {/* What They Need */}
                {event.vendorCategories && event.vendorCategories.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Looking for:</p>
                    <div className="flex flex-wrap gap-1">
                      {event.vendorCategories.slice(0, 3).map((cat) => (
                        <span key={cat} className="px-2 py-0.5 text-xs bg-muted rounded-md">
                          {cat}
                        </span>
                      ))}
                      {event.vendorCategories.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-muted-foreground">
                          +{event.vendorCategories.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* View Details */}
                <div className="mt-4 flex items-center text-sm font-medium text-primary">
                  View Details
                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="ml-1 group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} open-event. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
