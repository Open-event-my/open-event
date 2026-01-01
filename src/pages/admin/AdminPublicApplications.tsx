import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import {
  ClipboardText,
  Storefront,
  Handshake,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRight,
  MagnifyingGlass,
  Clock,
  CircleNotch,
  EnvelopeSimple,
  Buildings,
  Phone,
  Globe,
  MapPin,
  CurrencyDollar,
  Sparkle,
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

type ApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted'
type ApplicationType = 'vendor' | 'sponsor'

const statusConfig: Record<
  ApplicationStatus,
  { bg: string; text: string; label: string; description: string }
> = {
  submitted: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    label: 'New',
    description: 'Awaiting initial review',
  },
  under_review: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    label: 'Under Review',
    description: 'Being evaluated',
  },
  approved: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    label: 'Approved',
    description: 'Ready to convert',
  },
  rejected: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'Rejected',
    description: 'Application declined',
  },
  converted: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    label: 'Converted',
    description: 'Added to directory',
  },
}

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'New' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'converted', label: 'Converted' },
] as const

export function AdminPublicApplications() {
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('submitted')
  const [typeFilter, setTypeFilter] = useState<ApplicationType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApplication, setSelectedApplication] = useState<Id<'publicApplications'> | null>(
    null
  )
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Get all applications to calculate counts
  const allApplications = useQuery(api.publicApplications.listForAdmin, {})
  const applications = useQuery(api.publicApplications.listForAdmin, {
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  })

  const pendingCounts = useQuery(api.publicApplications.getPendingCounts)
  const applicationDetail = useQuery(
    api.publicApplications.get,
    selectedApplication ? { applicationId: selectedApplication } : 'skip'
  )

  const updateStatus = useMutation(api.publicApplications.updateStatus)
  const convertToVendor = useMutation(api.publicApplications.convertToVendor)
  const convertToSponsor = useMutation(api.publicApplications.convertToSponsor)

  const { isLoading, execute } = useAsyncAction()

  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!allApplications) return {}
    return allApplications.reduce(
      (acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }, [allApplications])

  const filteredApplications = applications?.filter((app) => {
    if (!searchQuery.trim()) return true
    const search = searchQuery.toLowerCase()
    return (
      app.companyName.toLowerCase().includes(search) ||
      app.contactEmail.toLowerCase().includes(search) ||
      app.contactName.toLowerCase().includes(search)
    )
  })

  const handleMarkUnderReview = (appId: Id<'publicApplications'>) => {
    execute(() => updateStatus({ applicationId: appId, status: 'under_review' }), {
      successMessage: 'Application marked as under review',
    })
  }

  const handleReject = async () => {
    if (!selectedApplication || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    execute(
      () =>
        updateStatus({
          applicationId: selectedApplication,
          status: 'rejected',
          rejectionReason: rejectReason,
        }),
      {
        successMessage: 'Application rejected',
        onSuccess: () => {
          setShowRejectModal(false)
          setShowDetailModal(false)
          setSelectedApplication(null)
          setRejectReason('')
        },
      }
    )
  }

  const handleConvert = (autoApprove: boolean) => {
    if (!selectedApplication || !applicationDetail) return

    const isVendor = applicationDetail.applicationType === 'vendor'
    const entityName = isVendor ? 'Vendor' : 'Sponsor'
    const successMsg = autoApprove
      ? `${entityName} created and approved`
      : `${entityName} created (pending approval)`
    const onSuccessCallback = () => {
      setShowDetailModal(false)
      setSelectedApplication(null)
    }

    if (isVendor) {
      execute(() => convertToVendor({ applicationId: selectedApplication, autoApprove }), {
        successMessage: successMsg,
        onSuccess: onSuccessCallback,
      })
    } else {
      execute(() => convertToSponsor({ applicationId: selectedApplication, autoApprove }), {
        successMessage: successMsg,
        onSuccess: onSuccessCallback,
      })
    }
  }

  const openDetailModal = (appId: Id<'publicApplications'>) => {
    setSelectedApplication(appId)
    setShowDetailModal(true)
  }

  const openRejectModal = () => {
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

  const totalCount = allApplications?.length || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Public Applications</h1>
          <p className="text-muted-foreground mt-1">
            Review vendor and sponsor applications from the public form
          </p>
        </div>
        {pendingCounts && pendingCounts.total > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-600">
            <Sparkle size={18} weight="duotone" />
            <span className="font-medium">{pendingCounts.total} pending</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-blue-500/10">
            <ClipboardText size={24} weight="duotone" className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Total Applications</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-orange-500/10">
            <Storefront size={24} weight="duotone" className="text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{pendingCounts?.vendor?.submitted || 0}</p>
            <p className="text-sm text-muted-foreground">Pending Vendors</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-purple-500/10">
            <Handshake size={24} weight="duotone" className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{pendingCounts?.sponsor?.submitted || 0}</p>
            <p className="text-sm text-muted-foreground">Pending Sponsors</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Status Filter Tabs with Counts */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border lg:border-0 lg:pb-0">
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

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
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
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
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
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
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
            placeholder="Search by company or email..."
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
      <div className="space-y-3">
        {!applications ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredApplications?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <ClipboardText
              size={64}
              weight="duotone"
              className="mx-auto text-muted-foreground/30 mb-6"
            />
            <h3 className="text-lg font-semibold mb-2">
              {statusFilter === 'all'
                ? 'No applications yet'
                : `No ${statusConfig[statusFilter]?.label.toLowerCase()} applications`}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No applications match "${searchQuery}"`
                : 'Applications will appear here when submitted'}
            </p>
          </div>
        ) : (
          filteredApplications?.map((app) => {
            const status = statusConfig[app.status]
            const isVendor = app.applicationType === 'vendor'
            const TypeIcon = isVendor ? Storefront : Handshake
            const typeColor = isVendor ? 'text-orange-600' : 'text-purple-600'
            const typeBg = isVendor ? 'bg-orange-500/10' : 'bg-purple-500/10'

            return (
              <div
                key={app._id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => openDetailModal(app._id)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Application Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                          typeBg
                        )}
                      >
                        <TypeIcon size={24} weight="duotone" className={typeColor} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {app.companyName}
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
                          <span className="capitalize">{app.applicationType}</span>
                          <span>•</span>
                          <span>{app.contactName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground ml-15">
                      <span className="inline-flex items-center gap-1.5">
                        <EnvelopeSimple size={14} weight="duotone" />
                        {app.contactEmail}
                      </span>
                      {isVendor && app.vendorCategory && (
                        <span className="inline-flex items-center gap-1.5 capitalize">
                          {app.vendorCategory}
                        </span>
                      )}
                      {!isVendor && app.sponsorIndustry && (
                        <span className="inline-flex items-center gap-1.5 capitalize">
                          {app.sponsorIndustry.replace('_', ' ')}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
                        <Clock size={14} weight="duotone" />
                        {formatDate(app.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {app.status === 'submitted' && (
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkUnderReview(app._id)
                              }}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                                'bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all cursor-pointer'
                              )}
                            >
                              <Eye size={14} weight="bold" />
                              Start Review
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Mark as under review</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetailModal && !!applicationDetail} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {applicationDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      applicationDetail.applicationType === 'vendor'
                        ? 'bg-orange-500/10'
                        : 'bg-purple-500/10'
                    )}
                  >
                    {applicationDetail.applicationType === 'vendor' ? (
                      <Storefront size={24} weight="duotone" className="text-orange-600" />
                    ) : (
                      <Handshake size={24} weight="duotone" className="text-purple-600" />
                    )}
                  </div>
                  <div>
                    <DialogTitle>{applicationDetail.companyName}</DialogTitle>
                    <DialogDescription className="capitalize">
                      {applicationDetail.applicationType} Application
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Status & Date */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'px-3 py-1 text-sm font-medium rounded-full',
                      statusConfig[applicationDetail.status].bg,
                      statusConfig[applicationDetail.status].text
                    )}
                  >
                    {statusConfig[applicationDetail.status].label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Submitted {formatDate(applicationDetail.createdAt)}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <Buildings size={16} weight="duotone" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Name:</span>
                      {applicationDetail.contactName}
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeSimple
                        size={14}
                        weight="duotone"
                        className="text-muted-foreground"
                      />
                      {applicationDetail.contactEmail}
                    </div>
                    {applicationDetail.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} weight="duotone" className="text-muted-foreground" />
                        {applicationDetail.contactPhone}
                      </div>
                    )}
                    {applicationDetail.website && (
                      <div className="flex items-center gap-2">
                        <Globe size={14} weight="duotone" className="text-muted-foreground" />
                        <a
                          href={applicationDetail.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {applicationDetail.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {applicationDetail.description && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Description</h3>
                    <p className="text-sm text-muted-foreground">{applicationDetail.description}</p>
                  </div>
                )}

                {/* Vendor-specific */}
                {applicationDetail.applicationType === 'vendor' && (
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Storefront size={16} weight="duotone" className="text-orange-600" />
                      Vendor Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {applicationDetail.vendorCategory && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="capitalize">{applicationDetail.vendorCategory}</span>
                        </div>
                      )}
                      {applicationDetail.vendorLocation && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} weight="duotone" className="text-muted-foreground" />
                          {applicationDetail.vendorLocation}
                        </div>
                      )}
                      {applicationDetail.vendorPriceRange && (
                        <div className="flex items-center gap-2">
                          <CurrencyDollar
                            size={14}
                            weight="duotone"
                            className="text-muted-foreground"
                          />
                          <span className="capitalize">{applicationDetail.vendorPriceRange}</span>
                        </div>
                      )}
                    </div>
                    {applicationDetail.vendorServices &&
                      applicationDetail.vendorServices.length > 0 && (
                        <div>
                          <span className="text-muted-foreground text-sm">Services:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {applicationDetail.vendorServices.map((service) => (
                              <span
                                key={service}
                                className="px-2 py-0.5 text-xs bg-muted rounded-md"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Sponsor-specific */}
                {applicationDetail.applicationType === 'sponsor' && (
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Handshake size={16} weight="duotone" className="text-purple-600" />
                      Sponsor Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {applicationDetail.sponsorIndustry && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Industry:</span>
                          <span className="capitalize">
                            {applicationDetail.sponsorIndustry.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                      {(applicationDetail.sponsorBudgetMin ||
                        applicationDetail.sponsorBudgetMax) && (
                        <div className="flex items-center gap-2">
                          <CurrencyDollar
                            size={14}
                            weight="duotone"
                            className="text-muted-foreground"
                          />
                          {applicationDetail.sponsorBudgetMin &&
                            `$${applicationDetail.sponsorBudgetMin.toLocaleString()}`}
                          {applicationDetail.sponsorBudgetMin &&
                            applicationDetail.sponsorBudgetMax &&
                            ' - '}
                          {applicationDetail.sponsorBudgetMax &&
                            `$${applicationDetail.sponsorBudgetMax.toLocaleString()}`}
                        </div>
                      )}
                    </div>
                    {applicationDetail.sponsorTiers &&
                      applicationDetail.sponsorTiers.length > 0 && (
                        <div>
                          <span className="text-muted-foreground text-sm">Interested Tiers:</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {applicationDetail.sponsorTiers.map((tier) => (
                              <span
                                key={tier}
                                className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-600 rounded-md capitalize"
                              >
                                {tier}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Past Experience */}
                {applicationDetail.pastExperience && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Past Experience</h3>
                    <p className="text-sm text-muted-foreground">
                      {applicationDetail.pastExperience}
                    </p>
                  </div>
                )}

                {/* Additional Notes */}
                {applicationDetail.additionalNotes && (
                  <div className="space-y-2">
                    <h3 className="font-medium">Additional Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      {applicationDetail.additionalNotes}
                    </p>
                  </div>
                )}

                {/* Rejection Reason */}
                {applicationDetail.status === 'rejected' && applicationDetail.rejectionReason && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h3 className="font-medium text-red-600 mb-1">Rejection Reason</h3>
                    <p className="text-sm text-red-600">{applicationDetail.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              {applicationDetail.status !== 'converted' &&
                applicationDetail.status !== 'rejected' && (
                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <button
                      onClick={openRejectModal}
                      className={cn(
                        'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                        'text-red-600 hover:bg-red-500/10 transition-colors'
                      )}
                    >
                      <XCircle size={16} weight="bold" />
                      Reject
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConvert(false)}
                        disabled={isLoading}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg border border-border',
                          'text-sm font-medium hover:bg-muted transition-colors',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <ArrowRight size={16} weight="bold" />
                        Convert to{' '}
                        {applicationDetail.applicationType === 'vendor' ? 'Vendor' : 'Sponsor'}
                      </button>
                      <button
                        onClick={() => handleConvert(true)}
                        disabled={isLoading}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg',
                          'bg-green-500 text-white text-sm font-medium',
                          'hover:bg-green-600 transition-colors',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {isLoading ? (
                          <>
                            <CircleNotch size={16} weight="bold" className="animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} weight="bold" />
                            Convert & Approve
                          </>
                        )}
                      </button>
                    </div>
                  </DialogFooter>
                )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle size={20} weight="duotone" className="text-red-600" />
              </div>
              <DialogTitle>Reject Application</DialogTitle>
            </div>
            <DialogDescription>
              Please provide a reason for rejecting this application.
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
              Reject Application
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
