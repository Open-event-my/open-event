import { describe, it, expect } from 'vitest'
import { generateAnalyticsCSV } from './csv'
import type {
  AnalyticsExportData,
  StatsData,
  TrendsDataPoint,
  PerformanceData,
  BudgetData,
  EngagementData,
} from './types'

const mockStats: StatsData = {
  totalEvents: 25,
  activeEvents: 5,
  planningEvents: 8,
  draftEvents: 3,
  completedEvents: 9,
  upcomingEvents: 10,
  totalBudget: 150000,
  totalAttendees: 5000,
  confirmedVendors: 45,
  confirmedSponsors: 12,
}

const mockTrends: TrendsDataPoint[] = [
  {
    period: new Date('2025-01-01').getTime(),
    periodLabel: '2025-01-01',
    totalEvents: 5,
    totalBudget: 25000,
    totalAttendees: 1000,
    averageBudget: 5000,
    averageAttendees: 200,
    byStatus: { draft: 1, planning: 2, active: 1, completed: 1, cancelled: 0 },
  },
  {
    period: new Date('2025-02-01').getTime(),
    periodLabel: '2025-02-01',
    totalEvents: 8,
    totalBudget: 40000,
    totalAttendees: 1600,
    averageBudget: 5000,
    averageAttendees: 200,
    byStatus: { draft: 1, planning: 3, active: 2, completed: 2, cancelled: 0 },
  },
]

const mockPerformance: PerformanceData = {
  totalEvents: 25,
  completedEvents: 9,
  completionRate: 36,
  averageBudget: 6000,
  averageAttendees: 200,
  totalBudget: 150000,
  totalAttendees: 5000,
  vendorMetrics: {
    totalApplications: 120,
    confirmed: 45,
    conversionRate: 37.5,
  },
  sponsorMetrics: {
    totalApplications: 30,
    confirmed: 12,
    conversionRate: 40,
  },
  byEventType: { Conference: 10, Workshop: 8, Meetup: 7 },
  byLocationType: { 'In-person': 15, Virtual: 5, Hybrid: 5 },
}

const mockBudget: BudgetData = {
  totalBudget: 150000,
  totalSpent: 120000,
  budgetUtilization: 80,
  eventsWithBudget: 20,
  averageBudget: 7500,
  byCurrency: {
    USD: { budget: 100000, spent: 80000, count: 15 },
    EUR: { budget: 50000, spent: 40000, count: 5 },
  },
  budgetItemsCount: 150,
}

const mockEngagement: EngagementData = {
  vendors: {
    totalApplications: 120,
    confirmed: 45,
    pending: 50,
    declined: 25,
    conversionRate: 37.5,
    eventsWithVendors: 20,
    averagePerEvent: 6,
  },
  sponsors: {
    totalApplications: 30,
    confirmed: 12,
    pending: 10,
    declined: 8,
    conversionRate: 40,
    eventsWithSponsors: 15,
    averagePerEvent: 2,
  },
}

const createMockExportData = (
  overrides: Partial<AnalyticsExportData> = {}
): AnalyticsExportData => ({
  stats: mockStats,
  trends: mockTrends,
  performance: mockPerformance,
  budget: mockBudget,
  engagement: mockEngagement,
  exportedAt: new Date('2025-12-22T10:00:00').getTime(),
  period: 'month',
  isAdmin: false,
  ...overrides,
})

describe('CSV Export', () => {
  describe('generateAnalyticsCSV', () => {
    it('should generate CSV with all sections when all are selected', () => {
      const data = createMockExportData()
      const sections = ['overview', 'trends', 'performance', 'budget', 'engagement'] as const

      const csv = generateAnalyticsCSV(data, [...sections])

      // Check header comments
      expect(csv).toContain('# Analytics Report')
      expect(csv).toContain('# View: Organizer View')
      expect(csv).toContain('# Period: month')

      // Check section headers
      expect(csv).toContain('# OVERVIEW')
      expect(csv).toContain('# TRENDS')
      expect(csv).toContain('# PERFORMANCE')
      expect(csv).toContain('# BUDGET')
      expect(csv).toContain('# ENGAGEMENT')
    })

    it('should generate CSV with only selected sections', () => {
      const data = createMockExportData()
      const sections = ['overview', 'budget'] as const

      const csv = generateAnalyticsCSV(data, [...sections])

      expect(csv).toContain('# OVERVIEW')
      expect(csv).toContain('# BUDGET')
      expect(csv).not.toContain('# TRENDS')
      expect(csv).not.toContain('# PERFORMANCE')
      expect(csv).not.toContain('# ENGAGEMENT')
    })

    it('should include correct stats values in overview section', () => {
      const data = createMockExportData()
      const csv = generateAnalyticsCSV(data, ['overview'])

      expect(csv).toContain('Total Events,25')
      expect(csv).toContain('Active Events,5')
      expect(csv).toContain('Confirmed Vendors,45')
      expect(csv).toContain('$150,000') // Total Budget formatted
    })

    it('should format trends data correctly', () => {
      const data = createMockExportData()
      const csv = generateAnalyticsCSV(data, ['trends'])

      // Should have column headers
      expect(csv).toContain('Period,Total Events,Total Budget')

      // Should have trend data
      expect(csv).toContain('Jan 2025')
      expect(csv).toContain('Feb 2025')
    })

    it('should include vendor and sponsor metrics in performance section', () => {
      const data = createMockExportData()
      const csv = generateAnalyticsCSV(data, ['performance'])

      expect(csv).toContain('Vendor Applications,120')
      expect(csv).toContain('Confirmed Vendors,45')
      expect(csv).toContain('Vendor Conversion Rate,37.50%')
    })

    it('should include budget utilization in budget section', () => {
      const data = createMockExportData()
      const csv = generateAnalyticsCSV(data, ['budget'])

      expect(csv).toContain('Budget Utilization,80.00%')
      expect(csv).toContain('Total Budget Items,150')
    })

    it('should show Platform View for admin users', () => {
      const data = createMockExportData({ isAdmin: true })
      const csv = generateAnalyticsCSV(data, ['overview'])

      expect(csv).toContain('# View: Platform View')
    })

    it('should handle empty sections gracefully', () => {
      const data = createMockExportData({
        stats: null,
        trends: null,
        performance: null,
        budget: null,
        engagement: null,
      })

      const csv = generateAnalyticsCSV(data, [
        'overview',
        'trends',
        'performance',
        'budget',
        'engagement',
      ])

      // Should still have header
      expect(csv).toContain('# Analytics Report')
      // Should not have section content
      expect(csv).not.toContain('# OVERVIEW')
    })

    it('should handle empty trends array', () => {
      const data = createMockExportData({ trends: [] })
      const csv = generateAnalyticsCSV(data, ['trends'])

      expect(csv).not.toContain('# TRENDS')
    })

    it('should escape special characters in CSV', () => {
      const dataWithSpecialChars = createMockExportData({
        performance: {
          ...mockPerformance,
          byEventType: { 'Conference, Workshop': 5, 'Team "Building"': 3 },
        },
      })

      const csv = generateAnalyticsCSV(dataWithSpecialChars, ['performance'])

      // Values with commas should be quoted
      expect(csv).toContain('"Conference, Workshop"')
      // Values with quotes should be escaped
      expect(csv).toContain('"Team ""Building"""')
    })
  })
})
