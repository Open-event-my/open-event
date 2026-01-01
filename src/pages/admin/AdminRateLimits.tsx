import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatters'
import {
  Gauge,
  Clock,
  Globe,
  User,
  Lock,
  Robot,
  CaretDown,
  Lightning,
  Warning,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const TYPE_CONFIG = {
  auth: {
    label: 'Authentication',
    icon: Lock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    description: 'Login, signup, password reset',
  },
  api: {
    label: 'API',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    description: 'Public API endpoints',
  },
  ai: {
    label: 'AI/Chat',
    icon: Robot,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    description: 'AI assistant requests',
  },
  default: {
    label: 'General',
    icon: Lightning,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    description: 'Other endpoints',
  },
}

const TIME_RANGES = [
  { label: 'Last 15 minutes', value: 0.25 },
  { label: 'Last hour', value: 1 },
  { label: 'Last 6 hours', value: 6 },
  { label: 'Last 24 hours', value: 24 },
]

export function AdminRateLimits() {
  const [timeRange, setTimeRange] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const stats = useQuery(api.globalRateLimit.getStats, { hoursBack: timeRange })
  const config = useQuery(api.globalRateLimit.getConfig)
  const activeRecords = useQuery(api.globalRateLimit.listActiveRecords, {
    type: typeFilter || undefined,
    limit: 50,
  })

  const formatDuration = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge size={28} weight="duotone" className="text-primary" />
            Rate Limits
          </h1>
          <p className="text-muted-foreground mt-1">Monitor API usage and rate limiting activity</p>
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
              <DropdownMenuItem key={range.value} onClick={() => setTimeRange(range.value)}>
                {range.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Configuration Overview */}
      {config && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(config.LIMITS).map(([type, limits]) => {
            const typeConfig = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.default
            const Icon = typeConfig.icon

            return (
              <div key={type} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
                    <Icon size={20} className={typeConfig.color} weight="duotone" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{typeConfig.label}</p>
                    <p className="text-xs text-muted-foreground">{typeConfig.description}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Requests</span>
                    <span className="font-medium">{limits.maxRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Window</span>
                    <span className="font-medium">{formatDuration(limits.windowMs)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <User size={20} className="text-blue-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalRecords ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Active IPs</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Lightning size={20} className="text-green-600" weight="duotone" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalRequests ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Total Requests</p>
            </div>
          </div>
        </div>

        {stats?.byType &&
          Object.entries(stats.byType)
            .slice(0, 2)
            .map(([type, data]) => {
              const typeConfig =
                TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.default
              const Icon = typeConfig.icon

              return (
                <div key={type} className="p-4 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
                      <Icon size={20} className={typeConfig.color} weight="duotone" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.requests}</p>
                      <p className="text-sm text-muted-foreground">{typeConfig.label} Requests</p>
                    </div>
                  </div>
                </div>
              )
            })}
      </div>

      {/* Top IPs */}
      {stats?.topIPs && stats.topIPs.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User size={18} weight="duotone" />
            Top IPs by Request Count
          </h3>
          <div className="space-y-2">
            {stats.topIPs.map((item, index) => {
              const typeConfig =
                TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.default
              const maxRequests =
                config?.LIMITS[item.type as keyof typeof config.LIMITS]?.maxRequests || 100
              const percentUsed = Math.round((item.requests / maxRequests) * 100)
              const isNearLimit = percentUsed >= 80

              return (
                <div
                  key={`${item.ip}-${item.type}-${index}`}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <code className="px-2 py-1 rounded bg-muted text-xs font-mono min-w-[120px]">
                    {item.ip}
                  </code>
                  <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                    {typeConfig.label}
                  </Badge>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isNearLimit ? 'bg-orange-500' : 'bg-primary'
                      )}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium min-w-[80px] text-right',
                      isNearLimit && 'text-orange-600'
                    )}
                  >
                    {item.requests} / {maxRequests}
                  </span>
                  {isNearLimit && <Warning size={16} className="text-orange-500" weight="fill" />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Type Filter */}
      <div className="flex gap-2">
        <Button
          variant={typeFilter === null ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setTypeFilter(null)}
        >
          All Types
        </Button>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon
          return (
            <Button
              key={type}
              variant={typeFilter === type ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter(type)}
              className="gap-2"
            >
              <Icon size={14} className={config.color} />
              {config.label}
            </Button>
          )
        })}
      </div>

      {/* Active Records Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Request
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Window Start
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeRecords?.map((record) => {
                const typeConfig =
                  TYPE_CONFIG[record.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.default
                const Icon = typeConfig.icon
                const isNearLimit = record.percentUsed >= 80

                return (
                  <tr key={record._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <code className="px-1.5 py-0.5 rounded bg-muted text-xs">
                        {record.identifier}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={typeConfig.color} />
                        <span>{typeConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              isNearLimit ? 'bg-orange-500' : 'bg-primary'
                            )}
                            style={{ width: `${Math.min(record.percentUsed, 100)}%` }}
                          />
                        </div>
                        <span
                          className={cn('text-xs font-medium', isNearLimit && 'text-orange-600')}
                        >
                          {record.requestCount} / {record.config.maxRequests}
                        </span>
                        {isNearLimit && (
                          <Warning size={14} className="text-orange-500" weight="fill" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatRelativeTime(record.lastRequestAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatRelativeTime(record.windowStart)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {(!activeRecords || activeRecords.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Gauge size={48} className="mx-auto mb-3 opacity-50" />
            <p>No active rate limit records</p>
            <p className="text-sm mt-1">Rate limited IPs will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}
