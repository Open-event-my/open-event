import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatters'
import {
  ShieldCheck,
  Users,
  Storefront,
  Handshake,
  Calendar,
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  MagnifyingGlass,
  UserCircle,
  ArrowRight,
  Funnel,
} from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type ActionType =
  | 'user_suspended'
  | 'user_unsuspended'
  | 'user_role_changed'
  | 'admin_created'
  | 'admin_removed'
  | 'vendor_approved'
  | 'vendor_rejected'
  | 'sponsor_approved'
  | 'sponsor_rejected'
  | 'event_flagged'
  | 'event_unflagged'
  | 'event_removed'

type TargetType = 'user' | 'vendor' | 'sponsor' | 'event'

const actionConfig: Record<
  ActionType,
  { label: string; icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  user_suspended: {
    label: 'User Suspended',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  user_unsuspended: {
    label: 'User Unsuspended',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  user_role_changed: {
    label: 'Role Changed',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  admin_created: {
    label: 'Admin Created',
    icon: ShieldCheck,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  admin_removed: {
    label: 'Admin Removed',
    icon: Warning,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  vendor_approved: {
    label: 'Vendor Approved',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  vendor_rejected: {
    label: 'Vendor Rejected',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  sponsor_approved: {
    label: 'Sponsor Approved',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  sponsor_rejected: {
    label: 'Sponsor Rejected',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  event_flagged: {
    label: 'Event Flagged',
    icon: Warning,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  event_unflagged: {
    label: 'Event Unflagged',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  event_removed: {
    label: 'Event Removed',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

const targetConfig: Record<TargetType, { icon: typeof Users; color: string }> = {
  user: { icon: UserCircle, color: 'text-blue-500' },
  vendor: { icon: Storefront, color: 'text-orange-500' },
  sponsor: { icon: Handshake, color: 'text-purple-500' },
  event: { icon: Calendar, color: 'text-green-500' },
}

const actionCategories = [
  { value: 'all', label: 'All Actions', description: 'View all moderation activity' },
  {
    value: 'user',
    label: 'User Actions',
    description: 'Suspensions, role changes, admin management',
  },
  { value: 'vendor', label: 'Vendor Actions', description: 'Vendor approvals and rejections' },
  { value: 'sponsor', label: 'Sponsor Actions', description: 'Sponsor approvals and rejections' },
  { value: 'event', label: 'Event Actions', description: 'Event flagging and removals' },
]

export function AdminModeration() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState<TargetType | 'all'>('all')

  const moderationLogs = useQuery(api.moderation.getModerationLogs, {
    targetType: targetTypeFilter === 'all' ? undefined : targetTypeFilter,
    limit: 100,
  })

  const filteredLogs = moderationLogs?.filter((log) => {
    // Category filter
    if (categoryFilter !== 'all') {
      const actionPrefix = log.action.split('_')[0]
      if (categoryFilter === 'user' && !['user', 'admin'].includes(actionPrefix)) return false
      if (categoryFilter === 'vendor' && actionPrefix !== 'vendor') return false
      if (categoryFilter === 'sponsor' && actionPrefix !== 'sponsor') return false
      if (categoryFilter === 'event' && actionPrefix !== 'event') return false
    }

    // Search filter
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase()
      return (
        log.adminName?.toLowerCase().includes(search) ||
        log.adminEmail?.toLowerCase().includes(search) ||
        log.reason?.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search)
      )
    }

    return true
  })

  // Stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayActions =
    moderationLogs?.filter((l) => l.createdAt >= todayStart.getTime()).length || 0
  const suspensions = moderationLogs?.filter((l) => l.action === 'user_suspended').length || 0
  const approvals =
    moderationLogs?.filter((l) => l.action === 'vendor_approved' || l.action === 'sponsor_approved')
      .length || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-mono font-bold">Moderation Logs</h1>
        <p className="text-muted-foreground">
          Track all administrative actions and moderation activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-blue-500/30 transition-colors cursor-default">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <ShieldCheck size={24} weight="duotone" className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Actions</p>
                <p className="text-2xl font-bold">{moderationLogs?.length || 0}</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>All recorded moderation actions</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-amber-500/30 transition-colors cursor-default">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock size={24} weight="duotone" className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayActions}</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Actions taken today</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-red-500/30 transition-colors cursor-default">
              <div className="p-3 rounded-lg bg-red-500/10">
                <Warning size={24} weight="duotone" className="text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suspensions</p>
                <p className="text-2xl font-bold">{suspensions}</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Total user suspensions</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-green-500/30 transition-colors cursor-default">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle size={24} weight="duotone" className="text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approvals</p>
                <p className="text-2xl font-bold">{approvals}</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>Vendor and sponsor approvals</TooltipContent>
        </Tooltip>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by admin, reason, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
          {actionCategories.map((cat) => (
            <Tooltip key={cat.value}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCategoryFilter(cat.value)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer',
                    categoryFilter === cat.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{cat.description}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Target Type Filter */}
        <div className="flex items-center gap-2">
          <Funnel size={16} weight="duotone" className="text-muted-foreground" />
          <div className="flex gap-1">
            {(['all', 'user', 'vendor', 'sponsor', 'event'] as const).map((type) => {
              const Icon = type === 'all' ? Users : targetConfig[type as TargetType]?.icon
              const color =
                type === 'all' ? 'text-foreground' : targetConfig[type as TargetType]?.color
              return (
                <button
                  key={type}
                  onClick={() => setTargetTypeFilter(type)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize flex items-center gap-1.5 cursor-pointer',
                    targetTypeFilter === type
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {Icon && (
                    <Icon
                      size={14}
                      weight="duotone"
                      className={targetTypeFilter === type ? 'text-primary' : color}
                    />
                  )}
                  {type === 'all' ? 'All' : type}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Logs Timeline */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {!moderationLogs ? (
          <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
        ) : filteredLogs?.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldCheck
              size={48}
              weight="duotone"
              className="mx-auto mb-4 text-muted-foreground/50"
            />
            <h3 className="font-semibold mb-1">No moderation logs found</h3>
            <p className="text-muted-foreground text-sm">Administrative actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs?.map((log) => {
              const action = actionConfig[log.action as ActionType]
              const target = targetConfig[log.targetType as TargetType]
              const ActionIcon = action?.icon || Clock
              const TargetIcon = target?.icon || Users

              return (
                <div key={log._id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Action Icon */}
                    <div
                      className={cn(
                        'p-2.5 rounded-lg flex-shrink-0',
                        action?.bgColor || 'bg-muted'
                      )}
                    >
                      <ActionIcon
                        size={20}
                        weight="duotone"
                        className={action?.color || 'text-muted-foreground'}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          {/* Action Label */}
                          <h3 className="font-medium">
                            {action?.label || log.action.replace(/_/g, ' ')}
                          </h3>

                          {/* Admin Info */}
                          <p className="text-sm text-muted-foreground mt-0.5">
                            by <span className="font-medium text-foreground">{log.adminName}</span>
                            <span className="mx-1">•</span>
                            {log.adminEmail}
                          </p>

                          {/* Reason */}
                          {log.reason && (
                            <p className="text-sm mt-2 p-2 rounded-lg bg-muted/50">
                              <span className="text-muted-foreground">Reason: </span>
                              {log.reason}
                            </p>
                          )}

                          {/* Metadata */}
                          {log.metadata && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {log.metadata.userEmail && (
                                <span className="text-xs px-2 py-1 bg-muted rounded-md">
                                  {log.metadata.userEmail}
                                </span>
                              )}
                              {log.metadata.previousRole && (
                                <span className="text-xs px-2 py-1 bg-muted rounded-md flex items-center gap-1">
                                  {log.metadata.previousRole}
                                  <ArrowRight size={12} />
                                  {log.metadata.newRole || 'organizer'}
                                </span>
                              )}
                              {log.metadata.vendorName && (
                                <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-600 rounded-md">
                                  {log.metadata.vendorName}
                                </span>
                              )}
                              {log.metadata.sponsorName && (
                                <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-600 rounded-md">
                                  {log.metadata.sponsorName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Timestamp & Target */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(log.createdAt)}
                          </span>
                          <span
                            className={cn(
                              'flex items-center gap-1 text-xs px-2 py-1 rounded-md',
                              target?.color || 'text-muted-foreground',
                              'bg-muted'
                            )}
                          >
                            <TargetIcon size={12} weight="duotone" />
                            {log.targetType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredLogs && filteredLogs.length >= 100 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Showing the most recent 100 logs. Use filters to narrow down results.
          </p>
        </div>
      )}
    </div>
  )
}
