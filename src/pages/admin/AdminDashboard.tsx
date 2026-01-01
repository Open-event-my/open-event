import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/formatters'
import {
  Users,
  Storefront,
  Handshake,
  ShieldCheck,
  Warning,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  ChartLine,
  CaretRight,
  Download,
  CalendarBlank,
  TrendUp,
  TrendDown,
} from '@phosphor-icons/react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { ExportModal } from '@/components/admin'

type ExportType = 'users' | 'vendors' | 'sponsors' | 'events' | 'moderationLogs'
type AnalyticsPeriod = '7d' | '30d' | '90d'

// Chart colors
const CHART_COLORS = {
  primary: '#6366f1', // indigo-500
  secondary: '#8b5cf6', // violet-500
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  muted: '#71717a', // zinc-500
}

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#71717a']

export function AdminDashboard() {
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportType, setExportType] = useState<ExportType>('users')
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('30d')

  const user = useQuery(api.queries.auth.getCurrentUser)
  const analytics = useQuery(api.adminAnalytics.getDashboardAnalytics, { period: analyticsPeriod })
  const eventStatusDist = useQuery(api.adminAnalytics.getEventStatusDistribution)
  const applicationTrends = useQuery(api.adminAnalytics.getApplicationTrends, {
    period: analyticsPeriod,
  })
  const users = useQuery(api.admin.listAllUsers, { limit: 10 })
  const moderationLogs = useQuery(api.moderation.getModerationLogs, { limit: 5 })
  const suspendedCount = useQuery(api.moderation.getSuspendedUsersCount)
  const pendingVendors = useQuery(api.vendors.getPendingCount)
  const pendingSponsors = useQuery(api.sponsors.getPendingCount)

  const stats = [
    {
      label: 'Total Users',
      value: users?.length || 0,
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
      description: 'All registered platform users',
    },
    {
      label: 'Suspended',
      value: suspendedCount || 0,
      icon: Warning,
      href: '/admin/users?status=suspended',
      color: 'text-red-600',
      bgColor: 'bg-red-500/10',
      description: 'Users with restricted access',
      alert: (suspendedCount || 0) > 0,
    },
    {
      label: 'Pending Vendors',
      value: pendingVendors ?? 0,
      icon: Storefront,
      href: '/admin/vendors',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
      description: 'Awaiting review and approval',
      alert: (pendingVendors ?? 0) > 0,
    },
    {
      label: 'Pending Sponsors',
      value: pendingSponsors ?? 0,
      icon: Handshake,
      href: '/admin/sponsors',
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
      description: 'Awaiting review and approval',
      alert: (pendingSponsors ?? 0) > 0,
    },
  ]

  const getActionIcon = (action: string) => {
    if (action.includes('approved')) return CheckCircle
    if (action.includes('rejected') || action.includes('suspended') || action.includes('removed'))
      return XCircle
    return Clock
  }

  const getActionColor = (action: string) => {
    if (action.includes('approved') || action.includes('unsuspended'))
      return 'text-green-600 bg-green-500/10'
    if (action.includes('rejected') || action.includes('suspended') || action.includes('removed'))
      return 'text-red-600 bg-red-500/10'
    return 'text-amber-600 bg-amber-500/10'
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const quickActions = [
    {
      label: 'Manage Users',
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Review Vendors',
      icon: Storefront,
      href: '/admin/vendors',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Review Sponsors',
      icon: Handshake,
      href: '/admin/sponsors',
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Applications',
      icon: FileText,
      href: '/admin/applications',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Moderation Logs',
      icon: ShieldCheck,
      href: '/admin/moderation',
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Settings',
      icon: ChartLine,
      href: '/admin/settings',
      color: 'text-zinc-600',
      bgColor: 'bg-zinc-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.name?.split(' ')[0] || 'Admin'}. Here's what's happening on the
          platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <TooltipProvider key={stat.label} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={stat.href}
                    className={cn(
                      'relative flex items-center gap-4 p-4 rounded-xl border border-border bg-card',
                      'hover:border-primary/20 hover:bg-muted/30 transition-all group'
                    )}
                  >
                    {stat.alert && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                    <div className={cn('p-3 rounded-xl', stat.bgColor)}>
                      <Icon size={24} weight="duotone" className={stat.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                    <CaretRight
                      size={18}
                      weight="bold"
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{stat.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>

      {/* Analytics Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ChartLine size={18} weight="duotone" className="text-primary" />
            <h2 className="font-semibold">Platform Analytics</h2>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setAnalyticsPeriod(period)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  analyticsPeriod === period
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Summary Cards */}
        {analytics && (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 border-b border-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users size={20} weight="duotone" className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Users</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">{analytics.summary.newUsers}</p>
                  {analytics.summary.userChange !== 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 text-xs font-medium',
                        analytics.summary.userChange > 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {analytics.summary.userChange > 0 ? (
                        <TrendUp size={12} weight="bold" />
                      ) : (
                        <TrendDown size={12} weight="bold" />
                      )}
                      {Math.abs(analytics.summary.userChange)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CalendarBlank size={20} weight="duotone" className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Events</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">{analytics.summary.newEvents}</p>
                  {analytics.summary.eventChange !== 0 && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 text-xs font-medium',
                        analytics.summary.eventChange > 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {analytics.summary.eventChange > 0 ? (
                        <TrendUp size={12} weight="bold" />
                      ) : (
                        <TrendDown size={12} weight="bold" />
                      )}
                      {Math.abs(analytics.summary.eventChange)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <FileText size={20} weight="duotone" className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-xl font-bold">{analytics.applicationStats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle size={20} weight="duotone" className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-xl font-bold">{analytics.applicationStats.approvalRate}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          {/* User Growth Chart */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">User Growth</h3>
            <div className="h-64">
              {analytics?.userGrowth && analytics.userGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="New Users"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: CHART_COLORS.primary }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Event Creations Chart */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Events Created</h3>
            <div className="h-64">
              {analytics?.eventCreations && analytics.eventCreations.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.eventCreations}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Events"
                      fill={CHART_COLORS.success}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Application Trends Chart */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Application Trends</h3>
            <div className="h-64">
              {applicationTrends && applicationTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={applicationTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="vendors"
                      name="Vendors"
                      fill={CHART_COLORS.warning}
                      radius={[4, 4, 0, 0]}
                      stackId="stack"
                    />
                    <Bar
                      dataKey="sponsors"
                      name="Sponsors"
                      fill={CHART_COLORS.secondary}
                      radius={[4, 4, 0, 0]}
                      stackId="stack"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Event Status Distribution */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Event Status Distribution</h3>
            <div className="h-64">
              {eventStatusDist ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Published', value: eventStatusDist.published },
                        { name: 'Draft', value: eventStatusDist.draft },
                        { name: 'Cancelled', value: eventStatusDist.cancelled },
                        { name: 'Completed', value: eventStatusDist.completed },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Published', value: eventStatusDist.published },
                        { name: 'Draft', value: eventStatusDist.draft },
                        { name: 'Cancelled', value: eventStatusDist.cancelled },
                        { name: 'Completed', value: eventStatusDist.completed },
                      ]
                        .filter((d) => d.value > 0)
                        .map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Users size={18} weight="duotone" className="text-blue-600" />
              <h2 className="font-semibold">Recent Users</h2>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {users?.slice(0, 5).map((u) => (
              <div
                key={u._id}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {(u.name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{u.name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                      u.role === 'superadmin'
                        ? 'bg-purple-500/10 text-purple-600'
                        : u.role === 'admin'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-blue-500/10 text-blue-600'
                    )}
                  >
                    {u.role || 'organizer'}
                  </span>
                  {u.status === 'suspended' && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500/10 text-red-600 rounded-full">
                      Suspended
                    </span>
                  )}
                </div>
              </div>
            )) || (
              <div className="px-5 py-8 text-center text-muted-foreground">
                <Users size={32} weight="duotone" className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} weight="duotone" className="text-amber-600" />
              <h2 className="font-semibold">Recent Activity</h2>
            </div>
            <Link
              to="/admin/moderation"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {moderationLogs && moderationLogs.length > 0 ? (
              moderationLogs.map((log) => {
                const Icon = getActionIcon(log.action)
                const colorClasses = getActionColor(log.action)
                return (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className={cn('p-1.5 rounded-lg mt-0.5', colorClasses.split(' ')[1])}>
                      <Icon size={16} weight="duotone" className={colorClasses.split(' ')[0]} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{log.adminName}</span>{' '}
                        <span className="text-muted-foreground">
                          {formatAction(log.action).toLowerCase()}
                        </span>
                      </p>
                      {log.reason && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {log.reason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatRelativeTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-5 py-8 text-center text-muted-foreground">
                <ShieldCheck size={32} weight="duotone" className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent moderation activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Quick Actions</h2>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                to={action.href}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border border-border',
                  'hover:border-primary/20 hover:bg-muted/30 transition-all group'
                )}
              >
                <div className={cn('p-2 rounded-lg', action.bgColor)}>
                  <Icon size={18} weight="duotone" className={action.color} />
                </div>
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {action.label}
                </span>
                <CaretRight
                  size={14}
                  weight="bold"
                  className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Data Exports */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Download size={18} weight="duotone" className="text-green-600" />
            <h2 className="font-semibold">Data Exports</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Export platform data in CSV or JSON format
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              type: 'users' as const,
              label: 'Users',
              icon: Users,
              color: 'text-blue-600',
              bgColor: 'bg-blue-500/10',
            },
            {
              type: 'vendors' as const,
              label: 'Vendors',
              icon: Storefront,
              color: 'text-orange-600',
              bgColor: 'bg-orange-500/10',
            },
            {
              type: 'sponsors' as const,
              label: 'Sponsors',
              icon: Handshake,
              color: 'text-purple-600',
              bgColor: 'bg-purple-500/10',
            },
            {
              type: 'events' as const,
              label: 'Events',
              icon: CalendarBlank,
              color: 'text-emerald-600',
              bgColor: 'bg-emerald-500/10',
            },
            {
              type: 'moderationLogs' as const,
              label: 'Mod Logs',
              icon: ShieldCheck,
              color: 'text-amber-600',
              bgColor: 'bg-amber-500/10',
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.type}
                variant="outline"
                className="flex items-center gap-2 h-auto py-3"
                onClick={() => {
                  setExportType(item.type)
                  setExportModalOpen(true)
                }}
              >
                <div className={cn('p-1.5 rounded-lg', item.bgColor)}>
                  <Icon size={16} weight="duotone" className={item.color} />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
                <Download size={14} className="ml-auto text-muted-foreground" />
              </Button>
            )
          })}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        exportType={exportType}
      />
    </div>
  )
}
