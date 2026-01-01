/**
 * Admin Organizations Page
 *
 * Allows admins to view and manage all organizations on the platform.
 * Includes suspension, activation, and detailed view capabilities.
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { formatRelativeTime } from '@/lib/formatters'
import {
  Buildings,
  MagnifyingGlass,
  Users,
  CalendarBlank,
  Crown,
  Warning,
  CheckCircle,
  Prohibit,
  Eye,
  CaretDown,
  Spinner,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type OrgStatus = 'active' | 'suspended'

const statusConfig: Record<
  OrgStatus,
  { bg: string; text: string; label: string; icon: typeof CheckCircle }
> = {
  active: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    label: 'Active',
    icon: CheckCircle,
  },
  suspended: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'Suspended',
    icon: Prohibit,
  },
}

const planConfig: Record<string, { bg: string; text: string; label: string }> = {
  free: { bg: 'bg-zinc-500/10', text: 'text-zinc-600', label: 'Free' },
  pro: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Pro' },
  business: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Business' },
  enterprise: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Enterprise' },
}

export function AdminOrganizations() {
  const [statusFilter, setStatusFilter] = useState<OrgStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<Id<'organizations'> | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const orgsData = useQuery(api.organizations.listAllOrganizations, {
    status: statusFilter === 'all' ? undefined : statusFilter,
  })
  const stats = useQuery(api.organizations.getOrganizationStats)
  const orgDetails = useQuery(
    api.organizations.getOrganizationDetails,
    selectedOrg && showDetailsModal ? { organizationId: selectedOrg } : 'skip'
  )

  const suspendOrg = useMutation(api.organizations.suspendOrganization)
  const activateOrg = useMutation(api.organizations.activateOrganization)

  const { execute, isLoading } = useAsyncAction()

  const filteredOrgs = useMemo(() => {
    const items = orgsData?.items
    if (!items) return []
    if (!searchQuery.trim()) return items

    const search = searchQuery.toLowerCase()
    return items.filter(
      (org) =>
        org.name.toLowerCase().includes(search) ||
        org.slug.toLowerCase().includes(search) ||
        org.ownerEmail.toLowerCase().includes(search)
    )
  }, [orgsData?.items, searchQuery])

  const handleSuspend = async () => {
    if (!selectedOrg || !suspendReason.trim()) return

    await execute(async () => {
      await suspendOrg({
        organizationId: selectedOrg,
        reason: suspendReason,
      })
      toast.success('Organization suspended')
      setShowSuspendModal(false)
      setSuspendReason('')
      setSelectedOrg(null)
    })
  }

  const handleActivate = async (orgId: Id<'organizations'>) => {
    await execute(async () => {
      await activateOrg({ organizationId: orgId })
      toast.success('Organization activated')
    })
  }

  const openSuspendModal = (orgId: Id<'organizations'>) => {
    setSelectedOrg(orgId)
    setShowSuspendModal(true)
  }

  const openDetailsModal = (orgId: Id<'organizations'>) => {
    setSelectedOrg(orgId)
    setShowDetailsModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Buildings size={28} weight="duotone" className="text-primary" />
          Organizations
        </h1>
        <p className="text-muted-foreground mt-1">Manage all organizations on the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Buildings size={20} className="text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle size={20} className="text-green-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.active ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Warning size={20} className="text-red-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.suspended ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Crown size={20} className="text-purple-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.byPlan.enterprise ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Enterprise</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by name, slug, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {statusFilter === 'all' ? 'All Status' : statusConfig[statusFilter].label}
              <CaretDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('active')}>
              <CheckCircle size={14} className="mr-2 text-green-600" />
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('suspended')}>
              <Prohibit size={14} className="mr-2 text-red-600" />
              Suspended
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Organizations Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Members
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Events
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrgs.map((org) => {
                const status = statusConfig[org.status as OrgStatus] || statusConfig.active
                const plan = planConfig[org.plan] || planConfig.free
                const StatusIcon = status.icon

                return (
                  <tr key={org._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Buildings size={20} weight="duotone" className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">/{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm">{org.ownerName}</p>
                        <p className="text-xs text-muted-foreground">{org.ownerEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn(plan.bg, plan.text, 'border-0')}>{plan.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users size={14} className="text-muted-foreground" />
                        {org.memberCount}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <CalendarBlank size={14} className="text-muted-foreground" />
                        {org.eventCount}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                          status.bg,
                          status.text
                        )}
                      >
                        <StatusIcon size={12} weight="fill" />
                        {status.label}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openDetailsModal(org._id)}
                              >
                                <Eye size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {org.status === 'active' ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                  onClick={() => openSuspendModal(org._id)}
                                >
                                  <Prohibit size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Suspend</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                  onClick={() => handleActivate(org._id)}
                                  disabled={isLoading}
                                >
                                  <CheckCircle size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Activate</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {(!filteredOrgs || filteredOrgs.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Buildings size={48} className="mx-auto mb-3 opacity-50" />
            <p>No organizations found</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Organizations will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Prohibit size={20} className="text-red-600" />
              Suspend Organization
            </DialogTitle>
            <DialogDescription>
              This will prevent the organization and its members from accessing platform features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for suspension</Label>
              <Textarea
                placeholder="Provide a reason for this suspension..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner size={16} className="mr-2 animate-spin" />
                  Suspending...
                </>
              ) : (
                'Suspend Organization'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Buildings size={20} className="text-primary" />
              Organization Details
            </DialogTitle>
          </DialogHeader>

          {orgDetails ? (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{orgDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">/{orgDetails.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Owner</p>
                  <p className="font-medium">{orgDetails.ownerName}</p>
                  <p className="text-xs text-muted-foreground">{orgDetails.ownerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <Badge
                    className={cn(
                      planConfig[orgDetails.plan]?.bg,
                      planConfig[orgDetails.plan]?.text,
                      'border-0'
                    )}
                  >
                    {planConfig[orgDetails.plan]?.label || orgDetails.plan}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatRelativeTime(orgDetails.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    className={cn(
                      statusConfig[orgDetails.status as OrgStatus]?.bg,
                      statusConfig[orgDetails.status as OrgStatus]?.text,
                      'border-0'
                    )}
                  >
                    {statusConfig[orgDetails.status as OrgStatus]?.label || orgDetails.status}
                  </Badge>
                </div>
              </div>

              {/* Members */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users size={16} />
                  Members ({orgDetails.members.length})
                </h4>
                <div className="rounded-lg border border-border divide-y divide-border max-h-40 overflow-y-auto">
                  {orgDetails.members.map((member) => (
                    <div key={member._id} className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{member.userName}</p>
                        <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CalendarBlank size={16} />
                  Events ({orgDetails.events.length})
                </h4>
                {orgDetails.events.length > 0 ? (
                  <div className="rounded-lg border border-border divide-y divide-border max-h-40 overflow-y-auto">
                    {orgDetails.events.slice(0, 5).map((event) => (
                      <div key={event._id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.startDate ? formatRelativeTime(event.startDate) : 'No date set'}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {event.status}
                        </Badge>
                      </div>
                    ))}
                    {orgDetails.events.length > 5 && (
                      <div className="px-3 py-2 text-center text-sm text-muted-foreground">
                        +{orgDetails.events.length - 5} more events
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No events created</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Spinner size={24} className="mx-auto animate-spin" />
              <p className="mt-2">Loading details...</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
