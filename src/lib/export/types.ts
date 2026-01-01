// Analytics Export Type Definitions

export type ExportSectionId = 'overview' | 'trends' | 'performance' | 'budget' | 'engagement'

export interface ExportSection {
  id: ExportSectionId
  label: string
  description: string
  enabled: boolean
}

export const DEFAULT_EXPORT_SECTIONS: ExportSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Key metrics & status distribution',
    enabled: true,
  },
  { id: 'trends', label: 'Trends', description: 'Events over time', enabled: true },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Completion rates & averages',
    enabled: true,
  },
  { id: 'budget', label: 'Budget', description: 'Budget analysis', enabled: true },
  { id: 'engagement', label: 'Engagement', description: 'Vendor/Sponsor metrics', enabled: true },
]

export type ExportFormat = 'csv' | 'pdf'

// Stats data shape (from events.ts getMyStats/getPlatformStats)
export interface StatsData {
  totalEvents: number
  activeEvents: number
  planningEvents: number
  draftEvents: number
  completedEvents: number
  upcomingEvents: number
  totalBudget: number
  totalAttendees: number
  confirmedVendors: number
  confirmedSponsors: number
}

// Trends data shape (from analytics.ts getEventTrends)
export interface TrendsDataPoint {
  period: number
  periodLabel: string
  totalEvents: number
  totalBudget: number
  totalAttendees: number
  averageBudget: number
  averageAttendees: number
  byStatus: {
    draft: number
    planning: number
    active: number
    completed: number
    cancelled: number
  }
}

// Performance data shape (from analytics.ts getEventPerformance)
export interface PerformanceData {
  totalEvents: number
  completedEvents: number
  completionRate: number
  averageBudget: number
  averageAttendees: number
  totalBudget: number
  totalAttendees: number
  vendorMetrics?: {
    totalApplications: number
    confirmed: number
    conversionRate: number
  }
  sponsorMetrics?: {
    totalApplications: number
    confirmed: number
    conversionRate: number
  }
  byEventType: Record<string, number>
  byLocationType: Record<string, number>
}

// Comparative data shape (from analytics.ts getComparativeAnalytics)
export interface ComparativeData {
  period: string
  current: {
    totalEvents: number
    totalBudget: number
    totalAttendees: number
    completedEvents: number
    averageBudget: number
    averageAttendees: number
  }
  previous: {
    totalEvents: number
    totalBudget: number
    totalAttendees: number
    completedEvents: number
    averageBudget: number
    averageAttendees: number
  }
  changes: {
    totalEvents: number
    totalBudget: number
    totalAttendees: number
    completedEvents: number
  }
}

// Budget data shape (from analytics.ts getBudgetAnalytics)
export interface BudgetData {
  totalBudget: number
  totalSpent: number
  budgetUtilization: number
  eventsWithBudget: number
  averageBudget: number
  byCurrency: Record<string, { budget: number; spent: number; count: number }>
  budgetItemsCount: number
}

// Engagement data shape (from analytics.ts getEngagementAnalytics)
export interface EngagementData {
  vendors: {
    totalApplications: number
    confirmed: number
    pending: number
    declined: number
    conversionRate: number
    eventsWithVendors: number
    averagePerEvent: number
  }
  sponsors: {
    totalApplications: number
    confirmed: number
    pending: number
    declined: number
    conversionRate: number
    eventsWithSponsors: number
    averagePerEvent: number
  }
}

// Combined export data
export interface AnalyticsExportData {
  stats?: StatsData | null
  trends?: TrendsDataPoint[] | null
  performance?: PerformanceData | null
  comparative?: ComparativeData | null
  budget?: BudgetData | null
  engagement?: EngagementData | null
  exportedAt: number
  period?: string
  isAdmin?: boolean
}

export interface ExportOptions {
  filename?: string
  sections: ExportSectionId[]
}
