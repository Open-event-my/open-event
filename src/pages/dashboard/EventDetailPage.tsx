import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CurrencyDollar,
  Clock,
  Globe,
  PencilSimple,
  Trash,
  CaretRight,
  Buildings,
  Handshake,
  CheckCircle,
  Warning,
  Plus,
  Star,
  Envelope,
  LinkSimple,
  Receipt,
  ListChecks,
  Ticket,
  ChartLine,
  Tag,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  eventStatusColors,
  vendorStatusColors,
  sponsorTierColors,
  formatDate as formatDateUtil,
  formatTime as formatTimeUtil,
} from '@/lib/constants'
import { toast } from 'sonner'
import { useState } from 'react'
import { AddToCalendar } from '@/components/calendar'
import type { CalendarEvent } from '@/lib/calendar'

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')

  const eventVendors = useQuery(
    api.vendors.getByEvent,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const eventSponsors = useQuery(
    api.sponsors.getByEvent,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const deleteEvent = useMutation(api.events.remove)

  const handleDelete = async () => {
    if (!eventId) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this event? This action cannot be undone.'
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteEvent({ id: eventId as Id<'events'> })
      toast.success('Event deleted successfully')
      navigate('/dashboard/events')
    } catch {
      toast.error('Failed to delete event')
    } finally {
      setIsDeleting(false)
    }
  }

  // Loading state
  if (event === undefined) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-1/3" />
        </div>
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="h-6 bg-muted rounded w-1/4 mb-4" />
          <div className="h-4 bg-muted rounded w-2/3 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    )
  }

  // Not found state
  if (event === null) {
    return (
      <div className="text-center py-16">
        <Warning size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
        <h2 className="text-xl font-semibold mb-2">Event not found</h2>
        <p className="text-muted-foreground mb-6">
          The event you're looking for doesn't exist or has been deleted.
        </p>
        <Link
          to="/dashboard/events"
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-primary text-primary-foreground font-medium text-sm',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <ArrowLeft size={18} weight="bold" />
          Back to Events
        </Link>
      </div>
    )
  }

  const colors = eventStatusColors[event.status] || eventStatusColors.draft

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to="/dashboard/events"
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
          >
            <ArrowLeft size={20} weight="bold" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold font-mono">{event.title}</h1>
              <span
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium capitalize',
                  colors.bg,
                  colors.text
                )}
              >
                {colors.label}
              </span>
            </div>
            {event.description && (
              <p className="text-muted-foreground max-w-2xl">{event.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <Link
            to={`/dashboard/events/${eventId}/tasks`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <ListChecks size={16} weight="bold" />
            Tasks
          </Link>
          <Link
            to={`/dashboard/events/${eventId}/budget`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <Receipt size={16} weight="bold" />
            Budget
          </Link>
          <Link
            to={`/dashboard/events/${eventId}/attendees`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <Users size={16} weight="bold" />
            Attendees
          </Link>
          <Link
            to={`/dashboard/events/${eventId}/tickets`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <Ticket size={16} weight="bold" />
            Tickets
          </Link>
          <Link
            to={`/dashboard/events/${eventId}/sales`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <ChartLine size={16} weight="bold" />
            Sales
          </Link>
          <Link
            to={`/dashboard/events/${eventId}/promo-codes`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <Tag size={16} weight="bold" />
            Promos
          </Link>
          {/* Add to Calendar */}
          {event.startDate && (
            <AddToCalendar
              event={
                {
                  id: event._id,
                  title: event.title,
                  description: event.description,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  location: event.venueName,
                  locationAddress: event.venueAddress,
                  url: window.location.href,
                } as CalendarEvent
              }
              size="sm"
            />
          )}
          <Link
            to={`/dashboard/events/${eventId}/edit`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <PencilSimple size={16} weight="bold" />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-destructive/20 text-destructive text-sm font-medium',
              'hover:bg-destructive/10 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash size={16} weight="bold" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date & Time Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar size={18} weight="duotone" className="text-primary" />
              Date & Time
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-muted-foreground" />
                <span>{formatDateUtil(event.startDate, 'long')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-muted-foreground" />
                <span>
                  {formatTimeUtil(event.startDate)}
                  {event.endDate && ` - ${formatTimeUtil(event.endDate)}`}
                </span>
              </div>
              {event.timezone && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Globe size={16} />
                  <span>{event.timezone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Location Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin size={18} weight="duotone" className="text-primary" />
              Location
            </h2>
            <div className="space-y-3">
              {event.locationType && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm capitalize">
                  {event.locationType === 'in-person' && '📍 In-Person'}
                  {event.locationType === 'virtual' && '💻 Virtual'}
                  {event.locationType === 'hybrid' && '🔄 Hybrid'}
                </div>
              )}
              {event.venueName && (
                <div>
                  <p className="font-medium">{event.venueName}</p>
                  {event.venueAddress && (
                    <p className="text-sm text-muted-foreground mt-1">{event.venueAddress}</p>
                  )}
                </div>
              )}
              {event.virtualPlatform && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={14} className="text-muted-foreground" />
                  <span>Platform: {event.virtualPlatform}</span>
                </div>
              )}
              {!event.venueName && !event.virtualPlatform && (
                <p className="text-muted-foreground text-sm">No location specified</p>
              )}
            </div>
          </div>

          {/* Requirements Card */}
          {event.requirements && Object.values(event.requirements).some(Boolean) && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle size={18} weight="duotone" className="text-primary" />
                Requirements
              </h2>
              <div className="flex flex-wrap gap-2">
                {event.requirements.catering && (
                  <span className="px-3 py-1.5 rounded-lg bg-muted text-sm">🍽️ Catering</span>
                )}
                {event.requirements.av && (
                  <span className="px-3 py-1.5 rounded-lg bg-muted text-sm">🎤 AV Equipment</span>
                )}
                {event.requirements.photography && (
                  <span className="px-3 py-1.5 rounded-lg bg-muted text-sm">📸 Photography</span>
                )}
                {event.requirements.security && (
                  <span className="px-3 py-1.5 rounded-lg bg-muted text-sm">🔒 Security</span>
                )}
                {event.requirements.transportation && (
                  <span className="px-3 py-1.5 rounded-lg bg-muted text-sm">🚗 Transportation</span>
                )}
                {event.requirements.decoration && (
                  <span className="px-3 py-1.5 rounded-lg bg-muted text-sm">🎨 Decoration</span>
                )}
              </div>
            </div>
          )}

          {/* Vendors Section - Full Width on Mobile/Tablet */}
          <div className="rounded-xl border border-border bg-card p-6 lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Buildings size={18} weight="duotone" className="text-primary" />
                Vendors ({eventVendors?.length || 0})
              </h2>
              <Link
                to="/dashboard/vendors"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Browse
                <CaretRight size={12} />
              </Link>
            </div>
            {eventVendors && eventVendors.length > 0 ? (
              <div className="space-y-3">
                {eventVendors.map((ev) => (
                  <VendorCard key={ev._id} eventVendor={ev} />
                ))}
              </div>
            ) : (
              <EmptyVendorState />
            )}
          </div>

          {/* Sponsors Section - Full Width on Mobile/Tablet */}
          <div className="rounded-xl border border-border bg-card p-6 lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Handshake size={18} weight="duotone" className="text-primary" />
                Sponsors ({eventSponsors?.length || 0})
              </h2>
              <Link
                to="/dashboard/sponsors"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Browse
                <CaretRight size={12} />
              </Link>
            </div>
            {eventSponsors && eventSponsors.length > 0 ? (
              <div className="space-y-3">
                {eventSponsors.map((es) => (
                  <SponsorCard key={es._id} eventSponsor={es} />
                ))}
              </div>
            ) : (
              <EmptySponsorState />
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Event Stats */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Event Details</h2>
            <div className="space-y-4">
              {event.eventType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium capitalize">{event.eventType}</span>
                </div>
              )}
              {event.expectedAttendees && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Users size={14} />
                    Attendees
                  </span>
                  <span className="text-sm font-medium">
                    {event.expectedAttendees.toLocaleString()}
                  </span>
                </div>
              )}
              {event.budget && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CurrencyDollar size={14} />
                    Budget
                  </span>
                  <span className="text-sm font-medium">
                    ${event.budget.toLocaleString()} {event.budgetCurrency || 'USD'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Vendors Section - Sidebar on Desktop */}
          <div className="hidden lg:block rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Buildings size={18} weight="duotone" className="text-primary" />
                Vendors
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {eventVendors?.length || 0}
              </span>
            </div>
            {eventVendors && eventVendors.length > 0 ? (
              <div className="space-y-3">
                {eventVendors.slice(0, 3).map((ev) => (
                  <VendorCardCompact key={ev._id} eventVendor={ev} />
                ))}
                {eventVendors.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{eventVendors.length - 3} more vendors
                  </p>
                )}
              </div>
            ) : (
              <EmptyVendorState compact />
            )}
          </div>

          {/* Sponsors Section - Sidebar on Desktop */}
          <div className="hidden lg:block rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Handshake size={18} weight="duotone" className="text-primary" />
                Sponsors
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {eventSponsors?.length || 0}
              </span>
            </div>
            {eventSponsors && eventSponsors.length > 0 ? (
              <div className="space-y-3">
                {eventSponsors.slice(0, 3).map((es) => (
                  <SponsorCardCompact key={es._id} eventSponsor={es} />
                ))}
                {eventSponsors.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{eventSponsors.length - 3} more sponsors
                  </p>
                )}
              </div>
            ) : (
              <EmptySponsorState compact />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Vendor Card Component (Full)
function VendorCard({
  eventVendor,
}: {
  eventVendor: {
    _id: Id<'eventVendors'>
    status: string
    proposedBudget?: number
    finalBudget?: number
    notes?: string
    vendor: {
      _id: Id<'vendors'>
      name: string
      category: string
      rating?: number
      priceRange?: string
      contactEmail?: string
      contactPhone?: string
      website?: string
      verified: boolean
    } | null
  }
}) {
  const { vendor, status, proposedBudget, finalBudget } = eventVendor
  if (!vendor) return null

  const statusStyle = vendorStatusColors[status] || vendorStatusColors.inquiry

  return (
    <div className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{vendor.name}</h3>
            {vendor.verified && (
              <CheckCircle size={14} weight="fill" className="text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{vendor.category}</p>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium capitalize',
            statusStyle.bg,
            statusStyle.text
          )}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {vendor.rating && (
          <span className="flex items-center gap-1">
            <Star size={12} weight="fill" className="text-amber-500" />
            {vendor.rating.toFixed(1)}
          </span>
        )}
        {(finalBudget || proposedBudget) && (
          <span className="flex items-center gap-1">
            <CurrencyDollar size={12} />${(finalBudget || proposedBudget)?.toLocaleString()}
          </span>
        )}
        {vendor.contactEmail && (
          <a
            href={`mailto:${vendor.contactEmail}`}
            className="flex items-center gap-1 hover:text-primary"
          >
            <Envelope size={12} />
            Email
          </a>
        )}
        {vendor.website && (
          <a
            href={vendor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary"
          >
            <LinkSimple size={12} />
            Website
          </a>
        )}
      </div>
    </div>
  )
}

// Vendor Card Compact (for sidebar)
function VendorCardCompact({
  eventVendor,
}: {
  eventVendor: {
    _id: Id<'eventVendors'>
    status: string
    vendor: {
      _id: Id<'vendors'>
      name: string
      category: string
      verified: boolean
    } | null
  }
}) {
  const { vendor, status } = eventVendor
  if (!vendor) return null

  const statusStyle = vendorStatusColors[status] || vendorStatusColors.inquiry

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{vendor.name}</p>
          {vendor.verified && (
            <CheckCircle size={12} weight="fill" className="text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize">{vendor.category}</p>
      </div>
      <span
        className={cn(
          'px-1.5 py-0.5 rounded text-[10px] font-medium capitalize',
          statusStyle.bg,
          statusStyle.text
        )}
      >
        {status}
      </span>
    </div>
  )
}

// Sponsor Card Component (Full)
function SponsorCard({
  eventSponsor,
}: {
  eventSponsor: {
    _id: Id<'eventSponsors'>
    tier?: string
    status: string
    amount?: number
    benefits?: string[]
    sponsor: {
      _id: Id<'sponsors'>
      name: string
      industry: string
      logoUrl?: string
      website?: string
      contactEmail?: string
      verified: boolean
    } | null
  }
}) {
  const { sponsor, tier, status, amount } = eventSponsor
  if (!sponsor) return null

  const statusStyle = vendorStatusColors[status] || vendorStatusColors.inquiry
  const tierStyle = tier ? sponsorTierColors[tier] || sponsorTierColors.bronze : null

  return (
    <div className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {sponsor.logoUrl ? (
            <img
              src={sponsor.logoUrl}
              alt={sponsor.name}
              loading="lazy"
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Handshake size={20} weight="duotone" className="text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{sponsor.name}</h3>
              {sponsor.verified && (
                <CheckCircle size={14} weight="fill" className="text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{sponsor.industry}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium capitalize',
              statusStyle.bg,
              statusStyle.text
            )}
          >
            {status}
          </span>
          {tier && tierStyle && (
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium capitalize',
                tierStyle.bg,
                tierStyle.text
              )}
            >
              {tier}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {amount && (
          <span className="flex items-center gap-1">
            <CurrencyDollar size={12} />${amount.toLocaleString()}
          </span>
        )}
        {sponsor.contactEmail && (
          <a
            href={`mailto:${sponsor.contactEmail}`}
            className="flex items-center gap-1 hover:text-primary"
          >
            <Envelope size={12} />
            Email
          </a>
        )}
        {sponsor.website && (
          <a
            href={sponsor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary"
          >
            <LinkSimple size={12} />
            Website
          </a>
        )}
      </div>
    </div>
  )
}

// Sponsor Card Compact (for sidebar)
function SponsorCardCompact({
  eventSponsor,
}: {
  eventSponsor: {
    _id: Id<'eventSponsors'>
    tier?: string
    status: string
    sponsor: {
      _id: Id<'sponsors'>
      name: string
      industry: string
      verified: boolean
    } | null
  }
}) {
  const { sponsor, tier } = eventSponsor
  if (!sponsor) return null

  const tierStyle = tier ? sponsorTierColors[tier] || sponsorTierColors.bronze : null

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{sponsor.name}</p>
          {sponsor.verified && (
            <CheckCircle size={12} weight="fill" className="text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize">{sponsor.industry}</p>
      </div>
      {tier && tierStyle && (
        <span
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-medium capitalize',
            tierStyle.bg,
            tierStyle.text
          )}
        >
          {tier}
        </span>
      )}
    </div>
  )
}

// Empty Vendor State
function EmptyVendorState({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">No vendors yet</p>
        <Link to="/dashboard/events/new" className="text-xs text-primary hover:underline">
          Use AI to find vendors
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
        <Buildings size={24} weight="duotone" className="text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        No vendors added yet. Use the AI assistant to find and add vendors.
      </p>
      <Link
        to="/dashboard/events/new"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
          'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
        )}
      >
        <Plus size={14} weight="bold" />
        Find Vendors with AI
      </Link>
    </div>
  )
}

// Empty Sponsor State
function EmptySponsorState({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">No sponsors yet</p>
        <Link to="/dashboard/events/new" className="text-xs text-primary hover:underline">
          Use AI to find sponsors
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
        <Handshake size={24} weight="duotone" className="text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        No sponsors added yet. Use the AI assistant to discover sponsors.
      </p>
      <Link
        to="/dashboard/events/new"
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
          'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
        )}
      >
        <Plus size={14} weight="bold" />
        Find Sponsors with AI
      </Link>
    </div>
  )
}
