import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Calendar,
  MapPin,
  Users,
  Storefront,
  Handshake,
  ArrowLeft,
  Clock,
  Globe,
  Monitor,
  Buildings,
  CurrencyDollar,
  CheckCircle,
  CaretRight,
  Info,
  PaperPlaneTilt,
  X,
} from '@phosphor-icons/react'

export function EventDetailPublic() {
  const { eventId } = useParams<{ eventId: string }>()
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyType, setApplyType] = useState<'vendor' | 'sponsor'>('vendor')

  const event = useQuery(api.events.getPublic, eventId ? { id: eventId as Id<'events'> } : 'skip')

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const renderLocationIcon = (locationType?: string, size = 14) => {
    const className = 'shrink-0'
    switch (locationType) {
      case 'virtual':
        return <Monitor size={size} weight="duotone" className={className} />
      case 'hybrid':
        return <Globe size={size} weight="duotone" className={className} />
      default:
        return <Buildings size={size} weight="duotone" className={className} />
    }
  }

  const handleApply = (type: 'vendor' | 'sponsor') => {
    setApplyType(type)
    setShowApplyModal(true)
  }

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    )
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="font-mono text-lg font-bold">
                <span className="text-foreground">open</span>
                <span className="text-primary">-</span>
                <span className="text-foreground">event</span>
              </Link>
            </div>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This event may have been removed or is not publicly available.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft size={18} />
            Browse all events
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* Back Link */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          Back to Event Directory
        </Link>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {event.eventType && (
                  <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full">
                    {event.eventType}
                  </span>
                )}
                {event.locationType && (
                  <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-full">
                    {renderLocationIcon(event.locationType)}
                    <span className="capitalize">{event.locationType}</span>
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
              {event.organizer && (
                <p className="text-muted-foreground">
                  Organized by{' '}
                  <span className="font-medium text-foreground">{event.organizer.name}</span>
                </p>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <h2 className="text-lg font-semibold mb-3">About This Event</h2>
                <p className="text-muted-foreground whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {/* What We're Looking For */}
            {(event.seekingVendors || event.seekingSponsors) && (
              <div className="p-6 rounded-xl border border-border bg-card">
                <h2 className="text-lg font-semibold mb-4">What We're Looking For</h2>

                <div className="space-y-4">
                  {event.seekingVendors && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Storefront size={20} weight="duotone" className="text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">Vendors</h3>
                        {event.vendorCategories && event.vendorCategories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {event.vendorCategories.map((cat) => (
                              <span
                                key={cat}
                                className="px-2 py-1 text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {event.seekingSponsors && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Handshake size={20} weight="duotone" className="text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">Sponsors</h3>
                        {event.sponsorBenefits && (
                          <p className="text-sm text-muted-foreground">{event.sponsorBenefits}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requirements */}
            {event.requirements && (
              <div className="p-6 rounded-xl border border-border bg-card">
                <h2 className="text-lg font-semibold mb-4">Event Requirements</h2>
                <div className="grid grid-cols-2 gap-3">
                  {event.requirements.catering && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} weight="duotone" className="text-green-500" />
                      Catering Services
                    </div>
                  )}
                  {event.requirements.av && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} weight="duotone" className="text-green-500" />
                      Audio/Visual Equipment
                    </div>
                  )}
                  {event.requirements.photography && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} weight="duotone" className="text-green-500" />
                      Photography/Videography
                    </div>
                  )}
                  {event.requirements.security && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} weight="duotone" className="text-green-500" />
                      Security Services
                    </div>
                  )}
                  {event.requirements.transportation && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} weight="duotone" className="text-green-500" />
                      Transportation
                    </div>
                  )}
                  {event.requirements.decoration && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={16} weight="duotone" className="text-green-500" />
                      Decoration/Staging
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Details Card */}
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-semibold">Event Details</h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar size={18} weight="duotone" className="text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">{formatDate(event.startDate)}</div>
                    {event.endDate && event.endDate !== event.startDate && (
                      <div className="text-muted-foreground">to {formatDate(event.endDate)}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock size={18} weight="duotone" className="text-muted-foreground" />
                  <span>{formatTime(event.startDate)}</span>
                </div>

                {event.venueName && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} weight="duotone" className="text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">{event.venueName}</div>
                      {event.venueAddress && (
                        <div className="text-muted-foreground">{event.venueAddress}</div>
                      )}
                    </div>
                  </div>
                )}

                {event.virtualPlatform && (
                  <div className="flex items-center gap-3">
                    <Monitor size={18} weight="duotone" className="text-muted-foreground" />
                    <span>{event.virtualPlatform}</span>
                  </div>
                )}

                {event.expectedAttendees && (
                  <div className="flex items-center gap-3">
                    <Users size={18} weight="duotone" className="text-muted-foreground" />
                    <span>{event.expectedAttendees.toLocaleString()} expected attendees</span>
                  </div>
                )}

                {event.budget && (
                  <div className="flex items-center gap-3">
                    <CurrencyDollar size={18} weight="duotone" className="text-muted-foreground" />
                    <span>
                      {event.budgetCurrency || '$'}
                      {event.budget.toLocaleString()} budget
                    </span>
                  </div>
                )}

                {event.timezone && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Globe size={18} weight="duotone" />
                    <span>{event.timezone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Apply CTA */}
            {(event.seekingVendors || event.seekingSponsors) && (
              <div className="p-6 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <PaperPlaneTilt size={20} weight="duotone" className="text-primary" />
                  Apply to This Event
                </h3>
                <p className="text-sm text-muted-foreground">
                  Interested in participating? Apply as a vendor or sponsor to connect with the
                  organizer.
                </p>

                <div className="space-y-2">
                  {event.seekingVendors && (
                    <button
                      onClick={() => handleApply('vendor')}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-lg',
                        'bg-orange-500 text-white font-medium',
                        'hover:bg-orange-600 transition-colors'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Storefront size={18} weight="bold" />
                        Apply as Vendor
                      </span>
                      <CaretRight size={18} weight="bold" />
                    </button>
                  )}

                  {event.seekingSponsors && (
                    <button
                      onClick={() => handleApply('sponsor')}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-lg',
                        'bg-purple-500 text-white font-medium',
                        'hover:bg-purple-600 transition-colors'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Handshake size={18} weight="bold" />
                        Apply as Sponsor
                      </span>
                      <CaretRight size={18} weight="bold" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  You must be an approved vendor or sponsor to apply. If you're new,{' '}
                  <Link to="/apply/vendor" className="text-primary hover:underline">
                    register here
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} open-event. All rights reserved.</p>
        </div>
      </footer>

      {/* Apply Modal */}
      {showApplyModal && (
        <ApplyToEventModal
          eventId={eventId as Id<'events'>}
          eventTitle={event.title}
          applicantType={applyType}
          onClose={() => setShowApplyModal(false)}
        />
      )}
    </div>
  )
}

// Apply Modal Component
interface ApplyToEventModalProps {
  eventId: Id<'events'>
  eventTitle: string
  applicantType: 'vendor' | 'sponsor'
  onClose: () => void
}

function ApplyToEventModal({
  eventId,
  eventTitle,
  applicantType,
  onClose,
}: ApplyToEventModalProps) {
  const [applicantId, setApplicantId] = useState('')
  const [message, setMessage] = useState('')
  const [proposedServices, setProposedServices] = useState('')
  const [proposedBudget, setProposedBudget] = useState('')
  const [proposedTier, setProposedTier] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitApplication = useMutation(api.eventApplications.selfServiceSubmit)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!applicantId.trim()) {
      toast.error('Please enter your ID')
      return
    }

    setIsSubmitting(true)
    try {
      await submitApplication({
        eventId,
        applicantType,
        applicantId: applicantId.trim(),
        message: message.trim() || undefined,
        proposedServices:
          applicantType === 'vendor' && proposedServices.trim()
            ? proposedServices.split(',').map((s) => s.trim())
            : undefined,
        proposedBudget: proposedBudget ? parseFloat(proposedBudget) : undefined,
        proposedTier:
          applicantType === 'sponsor' && proposedTier.trim() ? proposedTier.trim() : undefined,
      })

      toast.success('Application submitted successfully!')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isVendor = applicantType === 'vendor'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-lg">Apply as {isVendor ? 'Vendor' : 'Sponsor'}</h2>
            <p className="text-sm text-muted-foreground">{eventTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Note:</strong> You must be an approved {isVendor ? 'vendor' : 'sponsor'} to
              submit an application. Your {isVendor ? 'Vendor' : 'Sponsor'} ID was provided when
              your account was approved.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Your {isVendor ? 'Vendor' : 'Sponsor'} ID *
            </label>
            <input
              type="text"
              value={applicantId}
              onChange={(e) => setApplicantId(e.target.value)}
              placeholder={`Enter your ${isVendor ? 'vendor' : 'sponsor'} ID`}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border bg-background',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/20'
              )}
              required
            />
          </div>

          {isVendor && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Services You're Offering</label>
              <input
                type="text"
                value={proposedServices}
                onChange={(e) => setProposedServices(e.target.value)}
                placeholder="e.g., Catering, Photography, DJ"
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border bg-background',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate multiple services with commas
              </p>
            </div>
          )}

          {!isVendor && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Sponsorship Tier Interest</label>
              <select
                value={proposedTier}
                onChange={(e) => setProposedTier(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border bg-background',
                  'text-sm focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              >
                <option value="">Select a tier</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
                <option value="custom">Custom / Flexible</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Proposed {isVendor ? 'Rate' : 'Contribution'} ($)
            </label>
            <input
              type="number"
              value={proposedBudget}
              onChange={(e) => setProposedBudget(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="100"
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border bg-background',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/20'
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Message to Organizer</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isVendor
                  ? "Tell the organizer about your experience and why you'd be a great fit..."
                  : "Share your sponsorship goals and what you're looking to achieve..."
              }
              rows={4}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border bg-background',
                'text-sm placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-primary/20'
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                'border border-border hover:bg-muted transition-colors'
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium',
                isVendor
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-purple-500 hover:bg-purple-600',
                'text-white transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
