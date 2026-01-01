// CSV Export Utilities
import type {
  AnalyticsExportData,
  ExportSectionId,
  StatsData,
  TrendsDataPoint,
  PerformanceData,
  BudgetData,
  EngagementData,
  ComparativeData,
} from './types'

/**
 * Escape a value for CSV format
 * Handles commas, quotes, and newlines
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return ''

  const keys = headers || Object.keys(data[0])
  const headerRow = keys.map(escapeCSVValue).join(',')
  const dataRows = data.map((row) => keys.map((key) => escapeCSVValue(row[key])).join(','))

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format percentage value
 */
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

/**
 * Format overview stats for CSV
 */
function formatOverviewCSV(stats: StatsData, comparative?: ComparativeData | null): string {
  const rows = [
    { Metric: 'Total Events', Value: stats.totalEvents },
    { Metric: 'Active Events', Value: stats.activeEvents },
    { Metric: 'Planning Events', Value: stats.planningEvents },
    { Metric: 'Draft Events', Value: stats.draftEvents },
    { Metric: 'Completed Events', Value: stats.completedEvents },
    { Metric: 'Upcoming Events', Value: stats.upcomingEvents },
    { Metric: 'Total Budget', Value: formatCurrency(stats.totalBudget) },
    { Metric: 'Total Attendees', Value: stats.totalAttendees },
    { Metric: 'Confirmed Vendors', Value: stats.confirmedVendors },
    { Metric: 'Confirmed Sponsors', Value: stats.confirmedSponsors },
  ]

  if (comparative) {
    rows.push(
      { Metric: '', Value: '' },
      { Metric: '--- Period Comparison ---', Value: '' },
      { Metric: 'Comparison Period', Value: comparative.period },
      { Metric: 'Current Period Events', Value: comparative.current.totalEvents },
      { Metric: 'Previous Period Events', Value: comparative.previous.totalEvents },
      { Metric: 'Events Change', Value: formatPercent(comparative.changes.totalEvents) },
      { Metric: 'Budget Change', Value: formatPercent(comparative.changes.totalBudget) },
      { Metric: 'Attendees Change', Value: formatPercent(comparative.changes.totalAttendees) }
    )
  }

  return arrayToCSV(rows)
}

/**
 * Format trends data for CSV
 */
function formatTrendsCSV(trends: TrendsDataPoint[]): string {
  const rows = trends.map((t) => ({
    Period: new Date(t.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    'Total Events': t.totalEvents,
    'Total Budget': formatCurrency(t.totalBudget),
    'Total Attendees': t.totalAttendees,
    'Avg Budget': formatCurrency(t.averageBudget),
    'Avg Attendees': t.averageAttendees,
    Draft: t.byStatus.draft,
    Planning: t.byStatus.planning,
    Active: t.byStatus.active,
    Completed: t.byStatus.completed,
    Cancelled: t.byStatus.cancelled,
  }))

  return arrayToCSV(rows)
}

/**
 * Format performance data for CSV
 */
function formatPerformanceCSV(performance: PerformanceData): string {
  const rows = [
    { Metric: 'Total Events', Value: performance.totalEvents },
    { Metric: 'Completed Events', Value: performance.completedEvents },
    { Metric: 'Completion Rate', Value: formatPercent(performance.completionRate) },
    { Metric: 'Average Budget', Value: formatCurrency(performance.averageBudget) },
    { Metric: 'Average Attendees', Value: performance.averageAttendees },
    { Metric: 'Total Budget', Value: formatCurrency(performance.totalBudget) },
    { Metric: 'Total Attendees', Value: performance.totalAttendees },
    { Metric: '', Value: '' },
    { Metric: '--- Vendor Metrics ---', Value: '' },
    { Metric: 'Vendor Applications', Value: performance.vendorMetrics?.totalApplications ?? 0 },
    { Metric: 'Confirmed Vendors', Value: performance.vendorMetrics?.confirmed ?? 0 },
    {
      Metric: 'Vendor Conversion Rate',
      Value: formatPercent(performance.vendorMetrics?.conversionRate ?? 0),
    },
    { Metric: '', Value: '' },
    { Metric: '--- Sponsor Metrics ---', Value: '' },
    { Metric: 'Sponsor Applications', Value: performance.sponsorMetrics?.totalApplications ?? 0 },
    { Metric: 'Confirmed Sponsors', Value: performance.sponsorMetrics?.confirmed ?? 0 },
    {
      Metric: 'Sponsor Conversion Rate',
      Value: formatPercent(performance.sponsorMetrics?.conversionRate ?? 0),
    },
  ]

  // Add event types if available
  const eventTypes = Object.entries(performance.byEventType)
  if (eventTypes.length > 0) {
    rows.push({ Metric: '', Value: '' }, { Metric: '--- Events by Type ---', Value: '' })
    eventTypes.forEach(([type, count]) => {
      rows.push({ Metric: type, Value: count })
    })
  }

  return arrayToCSV(rows)
}

/**
 * Format budget data for CSV
 */
function formatBudgetCSV(budget: BudgetData): string {
  const rows = [
    { Metric: 'Total Budget', Value: formatCurrency(budget.totalBudget) },
    { Metric: 'Total Spent', Value: formatCurrency(budget.totalSpent) },
    { Metric: 'Budget Utilization', Value: formatPercent(budget.budgetUtilization) },
    { Metric: 'Events with Budget', Value: budget.eventsWithBudget },
    { Metric: 'Average Budget per Event', Value: formatCurrency(budget.averageBudget) },
    { Metric: 'Total Budget Items', Value: budget.budgetItemsCount },
  ]

  // Add currency breakdown if available
  const currencies = Object.entries(budget.byCurrency)
  if (currencies.length > 0) {
    rows.push({ Metric: '', Value: '' }, { Metric: '--- By Currency ---', Value: '' })
    currencies.forEach(([currency, data]) => {
      rows.push(
        { Metric: `${currency} - Budget`, Value: data.budget },
        { Metric: `${currency} - Spent`, Value: data.spent },
        { Metric: `${currency} - Events`, Value: data.count }
      )
    })
  }

  return arrayToCSV(rows)
}

/**
 * Format engagement data for CSV
 */
function formatEngagementCSV(engagement: EngagementData): string {
  const rows = [
    { Metric: '--- Vendor Engagement ---', Value: '' },
    { Metric: 'Total Applications', Value: engagement.vendors.totalApplications },
    { Metric: 'Confirmed', Value: engagement.vendors.confirmed },
    { Metric: 'Pending', Value: engagement.vendors.pending },
    { Metric: 'Declined', Value: engagement.vendors.declined },
    { Metric: 'Conversion Rate', Value: formatPercent(engagement.vendors.conversionRate) },
    { Metric: 'Events with Vendors', Value: engagement.vendors.eventsWithVendors },
    { Metric: 'Average per Event', Value: engagement.vendors.averagePerEvent.toFixed(2) },
    { Metric: '', Value: '' },
    { Metric: '--- Sponsor Engagement ---', Value: '' },
    { Metric: 'Total Applications', Value: engagement.sponsors.totalApplications },
    { Metric: 'Confirmed', Value: engagement.sponsors.confirmed },
    { Metric: 'Pending', Value: engagement.sponsors.pending },
    { Metric: 'Declined', Value: engagement.sponsors.declined },
    { Metric: 'Conversion Rate', Value: formatPercent(engagement.sponsors.conversionRate) },
    { Metric: 'Events with Sponsors', Value: engagement.sponsors.eventsWithSponsors },
    { Metric: 'Average per Event', Value: engagement.sponsors.averagePerEvent.toFixed(2) },
  ]

  return arrayToCSV(rows)
}

/**
 * Generate complete CSV content from analytics data
 */
export function generateAnalyticsCSV(
  data: AnalyticsExportData,
  sections: ExportSectionId[]
): string {
  const parts: string[] = []
  const exportDate = new Date(data.exportedAt).toLocaleString()
  const viewType = data.isAdmin ? 'Platform View' : 'Organizer View'

  // Header
  parts.push(`# Analytics Report`)
  parts.push(`# Exported: ${exportDate}`)
  parts.push(`# View: ${viewType}`)
  if (data.period) {
    parts.push(`# Period: ${data.period}`)
  }
  parts.push('')

  // Overview section
  if (sections.includes('overview') && data.stats) {
    parts.push('# OVERVIEW')
    parts.push(formatOverviewCSV(data.stats, data.comparative))
    parts.push('')
  }

  // Trends section
  if (sections.includes('trends') && data.trends && data.trends.length > 0) {
    parts.push('# TRENDS')
    parts.push(formatTrendsCSV(data.trends))
    parts.push('')
  }

  // Performance section
  if (sections.includes('performance') && data.performance) {
    parts.push('# PERFORMANCE')
    parts.push(formatPerformanceCSV(data.performance))
    parts.push('')
  }

  // Budget section
  if (sections.includes('budget') && data.budget) {
    parts.push('# BUDGET')
    parts.push(formatBudgetCSV(data.budget))
    parts.push('')
  }

  // Engagement section
  if (sections.includes('engagement') && data.engagement) {
    parts.push('# ENGAGEMENT')
    parts.push(formatEngagementCSV(data.engagement))
    parts.push('')
  }

  return parts.join('\n')
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(content: string, filename: string): void {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate filename for CSV export
 */
export function generateCSVFilename(isAdmin: boolean): string {
  const prefix = isAdmin ? 'platform' : 'organizer'
  const date = new Date().toISOString().split('T')[0]
  return `${prefix}-analytics-${date}.csv`
}
