import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Storefront,
  Handshake,
  CheckCircle,
  XCircle,
  Clock,
  EnvelopeSimple,
  Phone,
  Eye,
  MagnifyingGlass,
  User,
  Warning,
} from '@phosphor-icons/react'

type ApplicationStatus = 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn'

const statusTabs: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

const statusColors: Record<ApplicationStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Pending Review' },
  under_review: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Under Review' },
  accepted: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Accepted' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Rejected' },
  withdrawn: { bg: 'bg-gray-500/10', text: 'text-gray-600', label: 'Withdrawn' },
}

export function EventApplicationsPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('pending')
  const [typeFilter, setTypeFilter] = useState<'all' | 'vendor' | 'sponsor'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<Id<'eventApplications'> | null>(
    null
  )
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Validate eventId - reject invalid values like "new", "edit", etc.
  const isValidEventId = eventId && eventId !== 'new' && eventId !== 'edit' && /^[a-z0-9]+$/.test(eventId)

  const event = useQuery(api.events.get, isValidEventId ? { id: eventId as Id<'events'> } : 'skip')

  const applications = useQuery(
    api.eventApplications.listByEvent,
    isValidEventId
      ? {
          eventId: eventId as Id<'events'>,
          status: statusFilter === 'all' ? undefined : statusFilter,
          applicantType: typeFilter === 'all' ? undefined : typeFilter,
        }
      : 'skip'
  )

  const updateStatus = useMutation(api.eventApplications.updateStatus)

  const filteredApplications = applications?.filter((app) => {
    if (!searchQuery.trim()) return true
    const search = searchQuery.toLowerCase()
    return (
      app.applicantDetails?.name?.toLowerCase().includes(search) ||
      app.contactEmail?.toLowerCase().includes(search) ||
      app.message?.toLowerCase().includes(search)
    )
  })

  const handleAccept = async (applicationId: Id<'eventApplications'>) => {
    try {
      await updateStatus({
        applicationId,
        status: 'accepted',
        organizerNotes: 'Accepted via dashboard',
      })
      toast.success('Application accepted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept application')
    }
  }

  const handleReject = async () => {
    if (!selectedApplication || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      await updateStatus({
        applicationId: selectedApplication,
        status: 'rejected',
        rejectionReason: rejectReason,
      })
      toast.success('Application rejected')
      setShowRejectModal(false)
      setSelectedApplication(null)
      setRejectReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject application')
    }
  }

  const handleMarkUnderReview = async (applicationId: Id<'eventApplications'>) => {
    try {
      await updateStatus({
        applicationId,
        status: 'under_review',
      })
      toast.success('Marked as under review')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const openRejectModal = (applicationId: Id<'eventApplications'>) => {
    setSelectedApplication(applicationId)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const openDetailModal = (applicationId: Id<'eventApplications'>) => {
    setSelectedApplication(applicationId)
    setShowDetailModal(true)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const selectedApp = filteredApplications?.find((a) => a._id === selectedApplication)

  // Invalid eventId state (e.g., "new", "edit")
  if (!isValidEventId) {
    return (
      <div className="text-center py-16">
        <Warning size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
        <h2 className="text-xl font-semibold mb-2">Invalid event ID</h2>
        <p className="text-muted-foreground mb-6">
          The event ID in the URL is invalid. Please navigate to a valid event's applications page.
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

  // Loading state
  if (event === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading event...</p>
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
          The event you're looking for doesn't exist or you don't have permission to view it.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to={`/dashboard/events/${eventId}`}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Status Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                statusFilter === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              typeFilter === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            All Types
          </button>
          <button
            onClick={() => setTypeFilter('vendor')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              typeFilter === 'vendor'
                ? 'border-orange-500 bg-orange-500/10 text-orange-600'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <Storefront size={16} weight="duotone" />
            Vendors
          </button>
          <button
            onClick={() => setTypeFilter('sponsor')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
              typeFilter === 'sponsor'
                ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <Handshake size={16} weight="duotone" />
            Sponsors
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />
        </div>
      </div>

      {/* Applications List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {!applications ? (
          <div className="p-8 text-center text-muted-foreground">Loading applications...</div>
        ) : filteredApplications?.length === 0 ? (
          <div className="p-8 text-center">
            <User size={48} weight="duotone" className="mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No applications found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredApplications?.map((app) => {
              const status = statusColors[app.status as ApplicationStatus]
              const isVendor = app.applicantType === 'vendor'

              return (
                <div key={app._id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    {/* Applicant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            isVendor ? 'bg-orange-500/10' : 'bg-purple-500/10'
                          )}
                        >
                          {isVendor ? (
                            <Storefront size={20} weight="duotone" className="text-orange-500" />
                          ) : (
                            <Handshake size={20} weight="duotone" className="text-purple-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">
                            {app.applicantDetails?.name || 'Unknown Applicant'}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">{app.applicantType}</span>
                            {app.applicantDetails?.category && (
                              <>
                                <span>•</span>
                                <span>{app.applicantDetails.category}</span>
                              </>
                            )}
                            {app.applicantDetails?.industry && (
                              <>
                                <span>•</span>
                                <span>{app.applicantDetails.industry}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {app.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {app.message}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {app.contactEmail && (
                          <span className="flex items-center gap-1">
                            <EnvelopeSimple size={14} weight="duotone" />
                            {app.contactEmail}
                          </span>
                        )}
                        {app.contactPhone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} weight="duotone" />
                            {app.contactPhone}
                          </span>
                        )}
                        {app.proposedBudget && (
                          <span className="flex items-center gap-1">
                            ${app.proposedBudget.toLocaleString()}
                          </span>
                        )}
                        {app.proposedTier && (
                          <span className="capitalize">{app.proposedTier} tier</span>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <span
                        className={cn(
                          'px-3 py-1 text-xs font-medium rounded-full',
                          status.bg,
                          status.text
                        )}
                      >
                        {status.label}
                      </span>

                      <p className="text-xs text-muted-foreground">
                        Applied {formatDate(app.createdAt)}
                      </p>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetailModal(app._id)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                            'bg-muted text-foreground hover:bg-muted/80 transition-colors'
                          )}
                        >
                          <Eye size={16} weight="bold" />
                          View
                        </button>

                        {app.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleMarkUnderReview(app._id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors'
                              )}
                            >
                              <Clock size={16} weight="bold" />
                              Review
                            </button>
                            <button
                              onClick={() => handleAccept(app._id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                'bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors'
                              )}
                            >
                              <CheckCircle size={16} weight="bold" />
                              Accept
                            </button>
                            <button
                              onClick={() => openRejectModal(app._id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                'bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors'
                              )}
                            >
                              <XCircle size={16} weight="bold" />
                              Reject
                            </button>
                          </>
                        )}

                        {app.status === 'under_review' && (
                          <>
                            <button
                              onClick={() => handleAccept(app._id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                'bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors'
                              )}
                            >
                              <CheckCircle size={16} weight="bold" />
                              Accept
                            </button>
                            <button
                              onClick={() => openRejectModal(app._id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                'bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors'
                              )}
                            >
                              <XCircle size={16} weight="bold" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>

                      {app.status === 'rejected' && app.rejectionReason && (
                        <p className="text-xs text-red-500 max-w-[200px] text-right">
                          Reason: {app.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-background rounded-xl border border-border p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Reject Application</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting this application.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={4}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border bg-background',
                'text-sm placeholder:text-muted-foreground resize-none',
                'focus:outline-none focus:ring-2 focus:ring-primary/20'
              )}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium',
                  'bg-red-500 text-white hover:bg-red-600 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-background rounded-xl border border-border p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Application Details</h3>

            <div className="space-y-4">
              {/* Applicant */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Applicant</p>
                <p className="font-semibold">{selectedApp.applicantDetails?.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedApp.applicantType}
                  {selectedApp.applicantDetails?.category &&
                    ` - ${selectedApp.applicantDetails.category}`}
                  {selectedApp.applicantDetails?.industry &&
                    ` - ${selectedApp.applicantDetails.industry}`}
                </p>
              </div>

              {/* Contact */}
              {(selectedApp.contactName ||
                selectedApp.contactEmail ||
                selectedApp.contactPhone) && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Contact</p>
                  {selectedApp.contactName && <p>{selectedApp.contactName}</p>}
                  {selectedApp.contactEmail && (
                    <p className="text-sm">{selectedApp.contactEmail}</p>
                  )}
                  {selectedApp.contactPhone && (
                    <p className="text-sm">{selectedApp.contactPhone}</p>
                  )}
                </div>
              )}

              {/* Message */}
              {selectedApp.message && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedApp.message}</p>
                </div>
              )}

              {/* Proposed Services */}
              {selectedApp.proposedServices && selectedApp.proposedServices.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Proposed Services
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.proposedServices.map((service, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-muted rounded-md">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget/Tier */}
              {(selectedApp.proposedBudget || selectedApp.proposedTier) && (
                <div className="flex gap-6">
                  {selectedApp.proposedBudget && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Budget</p>
                      <p>${selectedApp.proposedBudget.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedApp.proposedTier && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Tier</p>
                      <p className="capitalize">{selectedApp.proposedTier}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Status */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                <span
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full',
                    statusColors[selectedApp.status as ApplicationStatus].bg,
                    statusColors[selectedApp.status as ApplicationStatus].text
                  )}
                >
                  {statusColors[selectedApp.status as ApplicationStatus].label}
                </span>
              </div>

              {/* Rejection Reason */}
              {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-500">{selectedApp.rejectionReason}</p>
                </div>
              )}

              {/* Organizer Notes */}
              {selectedApp.organizerNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedApp.organizerNotes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
