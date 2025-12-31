import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState, memo } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  ChartLine,
  Calendar,
  Storefront,
  Handshake,
  Users,
  CurrencyDollar,
  Lightning,
  CheckCircle,
  TrendUp,
  ArrowUp,
  ArrowDown,
  Wallet,
  Target,
  DownloadSimple,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAnalyticsExport } from '@/hooks/use-analytics-export'
import { ExportModal } from './ExportModal'
import type { AnalyticsExportData, ExportFormat, ExportSectionId } from '@/lib/export'

type Period = 'day' | 'week' | 'month' | 'year'

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  orange: '#f97316',
  cyan: '#06b6d4',
  pink: '#ec4899',
}

export function RealTimeDashboard() {
  const [trendPeriod, setTrendPeriod] = useState<Period>('month')
  const [comparativePeriod, setComparativePeriod] = useState<'week' | 'month' | 'year'>('month')

  // Export functionality
  const { isExporting, exportFormat, showModal, openModal, closeModal, exportToCSV, exportToPDF } =
    useAnalyticsExport()

  // Get current user to determine role
  const user = useQuery(api.queries.auth.getCurrentUser)
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  // Real-time queries - use 'skip' pattern to avoid conditional hook calls
  // Always call all hooks, but skip the ones we don't need based on role
  const platformStats = useQuery(api.events.getPlatformStats, isAdmin ? undefined : 'skip')
  const myStats = useQuery(api.events.getMyStats, !isAdmin ? undefined : 'skip')
  const stats = isAdmin ? platformStats : myStats

  const platformTrends = useQuery(
    api.analytics.getPlatformEventTrends,
    isAdmin ? { period: trendPeriod } : 'skip'
  )
  const myTrends = useQuery(
    api.analytics.getEventTrends,
    !isAdmin ? { period: trendPeriod } : 'skip'
  )
  const trends = isAdmin ? platformTrends : myTrends

  const platformPerformance = useQuery(
    api.analytics.getPlatformEventPerformance,
    isAdmin ? {} : 'skip'
  )
  const myPerformance = useQuery(api.analytics.getEventPerformance, !isAdmin ? {} : 'skip')
  const performance = isAdmin ? platformPerformance : myPerformance

  const platformComparative = useQuery(
    api.analytics.getPlatformComparativeAnalytics,
    isAdmin ? { period: comparativePeriod } : 'skip'
  )
  const myComparative = useQuery(
    api.analytics.getComparativeAnalytics,
    !isAdmin ? { period: comparativePeriod } : 'skip'
  )
  const comparative = isAdmin ? platformComparative : myComparative

  const platformBudget = useQuery(api.analytics.getPlatformBudgetAnalytics, isAdmin ? {} : 'skip')
  const myBudget = useQuery(api.analytics.getBudgetAnalytics, !isAdmin ? {} : 'skip')
  const budget = isAdmin ? platformBudget : myBudget

  const platformEngagement = useQuery(
    api.analytics.getPlatformEngagementAnalytics,
    isAdmin ? {} : 'skip'
  )
  const myEngagement = useQuery(api.analytics.getEngagementAnalytics, !isAdmin ? {} : 'skip')
  const engagement = isAdmin ? platformEngagement : myEngagement

  // Loading state
  if (stats === undefined || trends === undefined || performance === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-mono">Real-Time Dashboard</h1>
          <p className="text-muted-foreground mt-1">Live analytics and insights</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-xl border border-border bg-card animate-pulse">
              <div className="h-10 w-10 bg-muted rounded-lg mb-3" />
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state (only show for organizers, admins always see platform data)
  if (!isAdmin && (!stats || stats.totalEvents === 0)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-mono">Real-Time Dashboard</h1>
          <p className="text-muted-foreground mt-1">Live analytics and insights</p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <ChartLine size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
          <h3 className="text-lg font-semibold mb-2">No data yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Create your first event to start tracking real-time metrics and analytics.
          </p>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const trendsData =
    trends?.map((t) => ({
      period: new Date(t.period).toLocaleDateString('en-US', {
        month: 'short',
        day: trendPeriod === 'day' ? 'numeric' : undefined,
        year: trendPeriod === 'year' ? 'numeric' : undefined,
      }),
      events: t.totalEvents,
      budget: t.totalBudget,
      attendees: t.totalAttendees,
    })) || []

  const statusData = stats
    ? [
        { name: 'Draft', value: stats.draftEvents, color: COLORS.primary },
        { name: 'Planning', value: stats.planningEvents, color: COLORS.warning },
        { name: 'Active', value: stats.activeEvents, color: COLORS.success },
        { name: 'Completed', value: stats.completedEvents, color: COLORS.purple },
      ].filter((item) => item.value > 0)
    : []

  const eventTypeData = performance?.byEventType
    ? Object.entries(performance.byEventType).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Real-Time Dashboard</h1>
          <p className="text-muted-foreground mt-1">Live analytics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Role Indicator Badge */}
          <div
            className={cn(
              'px-3 py-1.5 rounded-lg border text-sm font-medium',
              isAdmin
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
            )}
          >
            {isAdmin ? 'Platform View' : 'Organizer View'}
          </div>
          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">Live</span>
          </div>
          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={openModal}
            disabled={!stats}
            className="gap-2"
          >
            <DownloadSimple size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        open={showModal}
        onOpenChange={closeModal}
        onExport={(format: ExportFormat, sections: ExportSectionId[]) => {
          const exportData: AnalyticsExportData = {
            stats: stats || undefined,
            trends: trends || undefined,
            performance: performance || undefined,
            comparative: comparative || undefined,
            budget: budget || undefined,
            engagement: engagement || undefined,
            exportedAt: Date.now(),
            period: trendPeriod,
            isAdmin,
          }
          if (format === 'csv') {
            exportToCSV(exportData, sections)
          } else {
            exportToPDF(exportData, sections)
          }
        }}
        isExporting={isExporting}
        exportFormat={exportFormat}
        data={{
          stats: stats || undefined,
          trends: trends || undefined,
          performance: performance || undefined,
          comparative: comparative || undefined,
          budget: budget || undefined,
          engagement: engagement || undefined,
          // eslint-disable-next-line react-hooks/purity -- timestamp captured at render time
          exportedAt: Date.now(),
          period: trendPeriod,
          isAdmin,
        }}
      />

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label={isAdmin ? 'Platform Events' : 'Total Events'}
            value={stats.totalEvents}
            icon={Calendar}
            color={COLORS.primary}
            subtitle={isAdmin ? 'All organizers' : `${stats.upcomingEvents} upcoming`}
          />
          <MetricCard
            label={isAdmin ? 'Active Events' : 'Active Events'}
            value={stats.activeEvents}
            icon={Lightning}
            color={COLORS.success}
            subtitle={isAdmin ? 'Platform-wide' : `${stats.planningEvents} in planning`}
          />
          <MetricCard
            label={isAdmin ? 'Confirmed Vendors' : 'Confirmed Vendors'}
            value={stats.confirmedVendors}
            icon={Storefront}
            color={COLORS.orange}
            subtitle={isAdmin ? 'Platform-wide' : 'Across all events'}
          />
          <MetricCard
            label={isAdmin ? 'Confirmed Sponsors' : 'Confirmed Sponsors'}
            value={stats.confirmedSponsors}
            icon={Handshake}
            color={COLORS.purple}
            subtitle={isAdmin ? 'Platform-wide' : 'Across all events'}
          />
        </div>
      )}

      {/* Tabs for different analytics views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full grid grid-cols-5 border-b border-border bg-transparent p-0 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Event Trends Chart */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ChartLine size={20} weight="duotone" className="text-blue-500" />
                  {isAdmin ? 'Platform Event Trends' : 'Event Trends'}
                </h3>
                <select
                  value={trendPeriod}
                  onChange={(e) => setTrendPeriod(e.target.value as Period)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendsData}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="events"
                    stroke={COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorEvents)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Event Status Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                <Target size={20} weight="duotone" className="text-purple-500" />
                Event Status
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) => {
                      return `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Comparative Analytics */}
          {comparative && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendUp size={20} weight="duotone" className="text-green-500" />
                  {isAdmin ? 'Platform Period Comparison' : 'Period Comparison'}
                </h3>
                <select
                  value={comparativePeriod}
                  onChange={(e) =>
                    setComparativePeriod(e.target.value as 'week' | 'month' | 'year')
                  }
                  className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background"
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ComparisonCard
                  label="Events"
                  current={comparative.current.totalEvents}
                  previous={comparative.previous.totalEvents}
                  change={comparative.changes.totalEvents}
                />
                <ComparisonCard
                  label="Budget"
                  current={comparative.current.totalBudget}
                  previous={comparative.previous.totalBudget}
                  change={comparative.changes.totalBudget}
                  format="currency"
                />
                <ComparisonCard
                  label="Attendees"
                  current={comparative.current.totalAttendees}
                  previous={comparative.previous.totalAttendees}
                  change={comparative.changes.totalAttendees}
                />
                <ComparisonCard
                  label="Completed"
                  current={comparative.current.completedEvents}
                  previous={comparative.previous.completedEvents}
                  change={comparative.changes.completedEvents}
                />
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">
                {isAdmin ? 'Platform Events Over Time' : 'Events Over Time'}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="events"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Events"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">
                {isAdmin ? 'Platform Budget Trends' : 'Budget Trends'}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => value !== undefined ? `$${Number(value).toLocaleString()}` : ''}
                  />
                  <Bar dataKey="budget" fill={COLORS.success} name="Budget" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performance && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <MetricCard
                  label="Completion Rate"
                  value={`${performance.completionRate.toFixed(1)}%`}
                  icon={CheckCircle}
                  color={COLORS.success}
                />
                <MetricCard
                  label="Avg. Budget"
                  value={`$${performance.averageBudget.toLocaleString()}`}
                  icon={CurrencyDollar}
                  color={COLORS.orange}
                />
                <MetricCard
                  label="Avg. Attendees"
                  value={performance.averageAttendees.toLocaleString()}
                  icon={Users}
                  color={COLORS.cyan}
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-6">
                    {isAdmin ? 'Platform Events by Type' : 'Events by Type'}
                  </h3>
                  {eventTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={eventTypeData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="value" fill={COLORS.primary} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No event type data available
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-6">Vendor & Sponsor Metrics</h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Vendor Conversion</span>
                        <span className="text-lg font-bold">
                          {(performance.vendorMetrics?.conversionRate ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {performance.vendorMetrics?.confirmed ?? 0} of{' '}
                        {performance.vendorMetrics?.totalApplications ?? 0} confirmed
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Sponsor Conversion</span>
                        <span className="text-lg font-bold">
                          {(performance.sponsorMetrics?.conversionRate ?? 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {performance.sponsorMetrics?.confirmed ?? 0} of{' '}
                        {performance.sponsorMetrics?.totalApplications ?? 0} confirmed
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-6">
          {budget && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <MetricCard
                  label={isAdmin ? 'Platform Budget' : 'Total Budget'}
                  value={`$${budget.totalBudget.toLocaleString()}`}
                  icon={Wallet}
                  color={COLORS.success}
                />
                <MetricCard
                  label={isAdmin ? 'Platform Spent' : 'Total Spent'}
                  value={`$${budget.totalSpent.toLocaleString()}`}
                  icon={CurrencyDollar}
                  color={COLORS.orange}
                />
                <MetricCard
                  label="Utilization"
                  value={`${budget.budgetUtilization.toFixed(1)}%`}
                  icon={Target}
                  color={budget.budgetUtilization > 100 ? COLORS.danger : COLORS.primary}
                />
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">
                  {isAdmin ? 'Platform Budget Overview' : 'Budget Overview'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Budget Utilization</span>
                      <span className="text-sm text-muted-foreground">
                        ${budget.totalSpent.toLocaleString()} / $
                        {budget.totalBudget.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          budget.budgetUtilization > 100
                            ? 'bg-red-500'
                            : budget.budgetUtilization > 80
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        )}
                        style={{ width: `${Math.min(budget.budgetUtilization, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Events with Budget</p>
                      <p className="text-2xl font-bold">{budget.eventsWithBudget}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Budget Items</p>
                      <p className="text-2xl font-bold">{budget.budgetItemsCount}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {engagement && (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Storefront size={20} weight="duotone" className="text-orange-500" />
                    Vendor Engagement
                  </h3>
                  <div className="space-y-4">
                    <EngagementMetric
                      label="Total Applications"
                      value={engagement.vendors.totalApplications}
                    />
                    <EngagementMetric label="Confirmed" value={engagement.vendors.confirmed} />
                    <EngagementMetric label="Pending" value={engagement.vendors.pending} />
                    <EngagementMetric label="Declined" value={engagement.vendors.declined} />
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Conversion Rate</span>
                        <span className="text-lg font-bold">
                          {engagement.vendors.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg. {engagement.vendors.averagePerEvent.toFixed(1)} vendors per event
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Handshake size={20} weight="duotone" className="text-purple-500" />
                    Sponsor Engagement
                  </h3>
                  <div className="space-y-4">
                    <EngagementMetric
                      label="Total Applications"
                      value={engagement.sponsors.totalApplications}
                    />
                    <EngagementMetric label="Confirmed" value={engagement.sponsors.confirmed} />
                    <EngagementMetric label="Pending" value={engagement.sponsors.pending} />
                    <EngagementMetric label="Declined" value={engagement.sponsors.declined} />
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Conversion Rate</span>
                        <span className="text-lg font-bold">
                          {engagement.sponsors.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg. {engagement.sponsors.averagePerEvent.toFixed(1)} sponsors per event
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components - Memoized for performance
const MetricCard = memo(function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<IconProps>
  color: string
  subtitle?: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon
            size={20}
            weight="duotone"
            style={{ color } as React.CSSProperties & { color: string }}
          />
        </div>
      </div>
      <p className="text-3xl font-bold font-mono">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
    </Card>
  )
})

const ComparisonCard = memo(function ComparisonCard({
  label,
  current,
  change,
  format,
}: {
  label: string
  current: number
  previous: number
  change: number
  format?: 'currency' | 'number'
}) {
  const isPositive = change >= 0
  const formattedCurrent =
    format === 'currency' ? `$${current.toLocaleString()}` : current.toLocaleString()
  const formattedChange = `${isPositive ? '+' : ''}${change.toFixed(1)}%`

  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold">{formattedCurrent}</p>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
            isPositive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
          )}
        >
          {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          {formattedChange}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">vs previous period</p>
    </Card>
  )
})

function EngagementMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  )
}
