import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import {
  Storefront,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Plus,
  EnvelopeSimple,
  Phone,
  Globe,
  MapPin,
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
import { AddVendorModal } from '@/components/admin'

type VendorStatus = 'pending' | 'approved' | 'rejected'

const statusConfig: Record<
  VendorStatus,
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

export function AdminVendors() {
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Id<'vendors'> | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // Get all vendors to calculate counts
  const allVendors = useQuery(api.vendors.listForAdmin, {})
  const vendors = useQuery(api.vendors.listForAdmin, {
    status: statusFilter === 'all' ? undefined : statusFilter,
  })

  const approveVendor = useMutation(api.vendors.approve)
  const rejectVendor = useMutation(api.vendors.reject)

  const { execute } = useAsyncAction()

  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!allVendors) return {}
    return allVendors.reduce(
      (acc, vendor) => {
        acc[vendor.status] = (acc[vendor.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }, [allVendors])

  const filteredVendors = vendors?.filter((v) => {
    if (!searchQuery.trim()) return true
    const search = searchQuery.toLowerCase()
    return (
      v.name.toLowerCase().includes(search) ||
      v.category.toLowerCase().includes(search) ||
      v.contactEmail?.toLowerCase().includes(search)
    )
  })

  const handleApprove = (vendorId: Id<'vendors'>) => {
    execute(() => approveVendor({ vendorId }), {
      successMessage: 'Vendor approved successfully',
    })
  }

  const handleReject = async () => {
    if (!selectedVendor || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    execute(() => rejectVendor({ vendorId: selectedVendor, reason: rejectReason }), {
      successMessage: 'Vendor rejected',
      onSuccess: () => {
        setShowRejectModal(false)
        setSelectedVendor(null)
        setRejectReason('')
      },
    })
  }

  const openRejectModal = (vendorId: Id<'vendors'>) => {
    setSelectedVendor(vendorId)
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

  const totalCount = allVendors?.length || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Vendor Management</h1>
          <p className="text-muted-foreground mt-1">Review and manage vendor applications</p>
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
          Add Vendor
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
            placeholder="Search vendors..."
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

      {/* Vendors List */}
      <div className="space-y-3">
        {!vendors ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredVendors?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Storefront
              size={64}
              weight="duotone"
              className="mx-auto text-muted-foreground/30 mb-6"
            />
            <h3 className="text-lg font-semibold mb-2">
              {statusFilter === 'all'
                ? 'No vendors yet'
                : `No ${statusConfig[statusFilter]?.label.toLowerCase()} vendors`}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchQuery ? `No vendors match "${searchQuery}"` : `No vendors in this category`}
            </p>
          </div>
        ) : (
          filteredVendors?.map((vendor) => {
            const status = statusConfig[vendor.status]
            return (
              <div
                key={vendor._id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:bg-muted/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Vendor Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Storefront size={24} weight="duotone" className="text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {vendor.name}
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
                          <span className="capitalize">{vendor.category}</span>
                          {vendor.priceRange && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{vendor.priceRange}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {vendor.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 ml-15">
                        {vendor.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground ml-15">
                      {vendor.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={14} weight="duotone" />
                          {vendor.location}
                        </span>
                      )}
                      {vendor.contactEmail && (
                        <span className="inline-flex items-center gap-1.5">
                          <EnvelopeSimple size={14} weight="duotone" />
                          {vendor.contactEmail}
                        </span>
                      )}
                      {vendor.contactPhone && (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={14} weight="duotone" />
                          {vendor.contactPhone}
                        </span>
                      )}
                      {vendor.website && (
                        <a
                          href={vendor.website}
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
                        Applied {formatDate(vendor.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-3 flex-shrink-0">
                    {vendor.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleApprove(vendor._id)}
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
                              <p>Approve vendor application</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openRejectModal(vendor._id)}
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
                              <p>Reject vendor application</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Reason */}
                {vendor.status === 'rejected' && vendor.rejectionReason && (
                  <div className="mt-3 pt-3 border-t border-border ml-15">
                    <p className="text-xs text-red-600">
                      <span className="font-medium">Rejection reason:</span>{' '}
                      {vendor.rejectionReason}
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
              <DialogTitle>Reject Vendor</DialogTitle>
            </div>
            <DialogDescription>
              Please provide a reason for rejecting this vendor application.
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
              Reject Vendor
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vendor Modal */}
      <AddVendorModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  )
}
