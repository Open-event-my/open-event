import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import {
  Handshake,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Plus,
  EnvelopeSimple,
  Globe,
  User,
  CurrencyDollar,
  Clock,
} from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AddSponsorModal } from '@/components/admin'

type SponsorStatus = 'pending' | 'approved' | 'rejected'

const statusConfig: Record<
  SponsorStatus,
  { bg: string; text: string; label: string; description: string }
> = {
  pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Pending',
    description: 'Awaiting review',
  },
  approved: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    label: 'Approved',
    description: 'Active in marketplace',
  },
  rejected: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'Rejected',
    description: 'Application declined',
  },
}

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const

export function AdminSponsors() {
  const [statusFilter, setStatusFilter] = useState<SponsorStatus | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSponsor, setSelectedSponsor] = useState<Id<'sponsors'> | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Get all sponsors to calculate counts
  const allSponsors = useQuery(api.sponsors.listForAdmin, {})
  const sponsors = useQuery(api.sponsors.listForAdmin, {
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const approveSponsor = useMutation(api.sponsors.approve)
  const rejectSponsor = useMutation(api.sponsors.reject)

  const { execute } = useAsyncAction()

  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!allSponsors) return {}
    return allSponsors.reduce(
      (acc, sponsor) => {
        acc[sponsor.status] = (acc[sponsor.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }, [allSponsors])

  const filteredSponsors = sponsors?.filter((s) => {
    if (!searchQuery.trim()) return true
    const search = searchQuery.toLowerCase()
    return (
      s.name.toLowerCase().includes(search) ||
      s.industry.toLowerCase().includes(search) ||
      s.contactEmail?.toLowerCase().includes(search) ||
      s.contactName?.toLowerCase().includes(search)
    )
  })

  const handleApprove = (sponsorId: Id<'sponsors'>) => {
    execute(() => approveSponsor({ sponsorId }), {
      successMessage: 'Sponsor approved successfully',
    })
  }

  const handleReject = async () => {
    if (!selectedSponsor || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    execute(() => rejectSponsor({ sponsorId: selectedSponsor, reason: rejectReason }), {
      successMessage: 'Sponsor rejected',
      onSuccess: () => {
        setShowRejectModal(false)
        setSelectedSponsor(null)
        setRejectReason('')
      },
    })
  }

  const openRejectModal = (sponsorId: Id<'sponsors'>) => {
    setSelectedSponsor(sponsorId)
    setRejectReason('')
    setShowRejectModal(true)
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return null
    if (min && max) {
      return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    }
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return null
  }

  const totalCount = allSponsors?.length || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Sponsor Management</h1>
          <p className="text-muted-foreground mt-1">Review and manage sponsor applications</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-primary text-primary-foreground font-medium text-sm',
            'hover:bg-primary/90 transition-colors cursor-pointer'
          )}
        >
          <Plus size={18} weight="bold" />
          Add Sponsor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filter Tabs with Counts */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border sm:border-0 sm:pb-0">
          {statusFilters.map((filter) => {
            const count = filter.value === 'all' ? totalCount : statusCounts[filter.value] || 0
            const config = filter.value !== 'all' ? statusConfig[filter.value] : null
            const isActive = statusFilter === filter.value

            return (
              <TooltipProvider key={filter.value} delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setStatusFilter(filter.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <span>{filter.label}</span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-semibold min-w-[1.25rem] text-center',
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {config && (
                    <TooltipContent side="bottom">
                      <p>{config.description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          })}
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
            placeholder="Search sponsors..."
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

      {/* Sponsors List */}
      <div className="space-y-3">
        {!sponsors ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredSponsors?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Handshake
              size={64}
              weight="duotone"
              className="mx-auto text-muted-foreground/30 mb-6"
            />
            <h3 className="text-lg font-semibold mb-2">
              {statusFilter === 'all'
                ? 'No sponsors yet'
                : `No ${statusConfig[statusFilter]?.label.toLowerCase()} sponsors`}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No sponsors match "${searchQuery}"` : `No sponsors in this category`}
            </p>
          </div>
        ) : (
          filteredSponsors?.map((sponsor) => {
            const status = statusConfig[sponsor.status]
            const budgetRange = formatBudget(sponsor.budgetMin, sponsor.budgetMax)

            return (
              <div
                key={sponsor._id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Sponsor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {sponsor.logoUrl ? (
                          <img
                            src={sponsor.logoUrl}
                            alt={sponsor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Handshake size={24} weight="duotone" className="text-purple-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {sponsor.name}
                          </h3>
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full',
                              status.bg,
                              status.text
                            )}
                          >
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">{sponsor.industry}</span>
                          {sponsor.sponsorshipTiers && sponsor.sponsorshipTiers.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="capitalize">
                                {sponsor.sponsorshipTiers.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {sponsor.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 ml-15">
                        {sponsor.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground ml-15">
                      {budgetRange && (
                        <span className="inline-flex items-center gap-1.5">
                          <CurrencyDollar size={14} weight="duotone" />
                          {budgetRange}
                        </span>
                      )}
                      {sponsor.contactName && (
                        <span className="inline-flex items-center gap-1.5">
                          <User size={14} weight="duotone" />
                          {sponsor.contactName}
                        </span>
                      )}
                      {sponsor.contactEmail && (
                        <span className="inline-flex items-center gap-1.5">
                          <EnvelopeSimple size={14} weight="duotone" />
                          {sponsor.contactEmail}
                        </span>
                      )}
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          <Globe size={14} weight="duotone" />
                          Website
                        </a>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
                        <Clock size={14} weight="duotone" />
                        Applied {formatDate(sponsor.createdAt)}
                      </span>
                    </div>

                    {sponsor.targetEventTypes && sponsor.targetEventTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 ml-15">
                        {sponsor.targetEventTypes.map((type) => (
                          <span key={type} className="px-2 py-0.5 text-xs bg-muted rounded-md">
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {sponsor.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleApprove(sponsor._id)}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                  'bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all cursor-pointer'
                                )}
                              >
                                <CheckCircle size={16} weight="bold" />
                                Approve
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Approve sponsor application</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openRejectModal(sponsor._id)}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                  'bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all cursor-pointer'
                                )}
                              >
                                <XCircle size={16} weight="bold" />
                                Reject
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reject sponsor application</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                {sponsor.status === 'rejected' && sponsor.rejectionReason && (
                  <div className="mt-3 pt-3 border-t border-border ml-15">
                    <p className="text-xs text-red-600">
                      <span className="font-medium">Rejection reason:</span>{' '}
                      {sponsor.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle size={20} weight="duotone" className="text-red-600" />
              </div>
              <DialogTitle>Reject Sponsor</DialogTitle>
            </div>
            <DialogDescription>
              Please provide a reason for rejecting this sponsor application.
            </DialogDescription>
          </DialogHeader>

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

          <DialogFooter>
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
              Reject Sponsor
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sponsor Modal */}
      <AddSponsorModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  )
}
