import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatters'
import {
  Shield,
  Warning,
  CheckCircle,
  XCircle,
  Prohibit,
  Clock,
  MagnifyingGlass,
  Funnel,
  ArrowClockwise,
  User,
  SignIn,
  Key,
  Gear,
  Globe,
  CaretDown,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STATUS_CONFIG = {
  success: {
    label: 'Success',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  failure: {
    label: 'Failed',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
  },
  blocked: {
    label: 'Blocked',
    icon: Prohibit,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
  },
}

const RESOURCE_ICONS: Record<string, typeof User> = {
  user: User,
  auth: SignIn,
  api_key: Key,
  settings: Gear,
  event: Globe,
}

const TIME_RANGES = [
  { label: 'Last hour', value: 1 },
  { label: 'Last 6 hours', value: 6 },
  { label: 'Last 24 hours', value: 24 },
  { label: 'Last 7 days', value: 168 },
  { label: 'Last 30 days', value: 720 },
]

export function AdminAuditLogs() {
  const [timeRange, setTimeRange] = useState(24)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  // Store a stable timestamp that only updates when timeRange changes
  const [queryTimestamp, setQueryTimestamp] = useState(() => Date.now())

  // Update timestamp when timeRange changes
  const handleTimeRangeChange = (newRange: number) => {
    setTimeRange(newRange)
    // eslint-disable-next-line react-hooks/purity -- Date.now() is intentionally called in event handler
    setQueryTimestamp(Date.now())
  }

  // Calculate startDate from the stable timestamp
  const startDate = queryTimestamp - timeRange * 60 * 60 * 1000

  const stats = useQuery(api.auditLog.getStats, { hoursBack: timeRange })
  const logs = useQuery(api.auditLog.listLogs, {
    limit: 100,
    status: statusFilter || undefined,
    startDate,
  })
  const securityEvents = useQuery(api.auditLog.getSecurityEventsAdmin, {
    limit: 10,
    hoursBack: timeRange,
  })

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const filteredLogs = logs?.filter((log) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.action.toLowerCase().includes(query) ||
      log.resource.toLowerCase().includes(query) ||
      log.userEmail?.toLowerCase().includes(query) ||
      log.ipAddress?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={28} weight="duotone" className="text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">Monitor security events and user actions</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Clock size={16} />
              {TIME_RANGES.find((t) => t.value === timeRange)?.label}
              <CaretDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {TIME_RANGES.map((range) => (
              <DropdownMenuItem
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value)}
              >
                {range.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock size={20} className="text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle size={20} className="text-green-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.success ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle size={20} className="text-red-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.failure ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Prohibit size={20} className="text-orange-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.blocked ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Blocked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Alerts */}
      {securityEvents && securityEvents.length > 0 && (
        <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Warning size={20} className="text-orange-600" weight="fill" />
            <h3 className="font-semibold text-orange-600">Security Alerts</h3>
            <Badge variant="outline" className="ml-auto">
              {securityEvents.length} events
            </Badge>
          </div>
          <div className="space-y-2">
            {securityEvents.slice(0, 5).map((event) => (
              <div
                key={event._id}
                className="flex items-center gap-3 text-sm p-2 rounded-lg bg-background/50"
              >
                <span className={cn('font-medium', STATUS_CONFIG[event.status]?.color)}>
                  {formatAction(event.action)}
                </span>
                <span className="text-muted-foreground">
                  {event.userEmail || event.ipAddress || 'Unknown'}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatRelativeTime(event.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by action, email, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Funnel size={16} />
              {statusFilter
                ? STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label
                : 'All Status'}
              <CaretDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>All Status</DropdownMenuItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                <config.icon size={14} className={cn('mr-2', config.color)} />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {(searchQuery || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter(null)
            }}
          >
            <ArrowClockwise size={16} className="mr-2" />
            Reset
          </Button>
        )}
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs?.map((log) => {
                const statusConfig = STATUS_CONFIG[log.status]
                const StatusIcon = statusConfig?.icon || Clock
                const ResourceIcon = RESOURCE_ICONS[log.resource] || Globe

                return (
                  <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <span className="text-muted-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium">{formatAction(log.action)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <ResourceIcon size={14} className="text-muted-foreground" />
                        <span className="capitalize">{log.resource}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-muted-foreground">{log.userEmail || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
                        {log.ipAddress || '-'}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                          statusConfig?.bgColor,
                          statusConfig?.color
                        )}
                      >
                        <StatusIcon size={12} weight="fill" />
                        {statusConfig?.label}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {(!filteredLogs || filteredLogs.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield size={48} className="mx-auto mb-3 opacity-50" />
            <p>No audit logs found</p>
            <p className="text-sm mt-1">
              {searchQuery || statusFilter
                ? 'Try adjusting your filters'
                : 'Security events will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Action Breakdown */}
      {stats && Object.keys(stats.byAction).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-3">Events by Action</h3>
            <div className="space-y-2">
              {Object.entries(stats.byAction)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm">{formatAction(action)}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-3">Events by Resource</h3>
            <div className="space-y-2">
              {Object.entries(stats.byResource)
                .sort(([, a], [, b]) => b - a)
                .map(([resource, count]) => {
                  const Icon = RESOURCE_ICONS[resource] || Globe
                  return (
                    <div key={resource} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-muted-foreground" />
                        <span className="text-sm capitalize">{resource}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
