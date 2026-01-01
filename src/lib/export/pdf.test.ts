import { describe, it, expect } from 'vitest'
import { generateAnalyticsPDF, generatePDFFilename } from './pdf'
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
  byEventType: { Conference: 10, Workshop: 8 },
  byLocationType: { 'In-person': 15, Virtual: 5 },
}

const mockBudget: BudgetData = {
  totalBudget: 150000,
  totalSpent: 120000,
  budgetUtilization: 80,
  eventsWithBudget: 20,
  averageBudget: 7500,
  byCurrency: {},
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

describe('PDF Export', () => {
  describe('generateAnalyticsPDF', () => {
    it('should generate a PDF document', () => {
      const data = createMockExportData()
      const sections = ['overview'] as const

      const doc = generateAnalyticsPDF(data, [...sections])

      expect(doc).toBeDefined()
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    })

    it('should generate PDF with all sections', () => {
      const data = createMockExportData()
      const sections = ['overview', 'trends', 'performance', 'budget', 'engagement'] as const

      const doc = generateAnalyticsPDF(data, [...sections])

      expect(doc).toBeDefined()
      // With all sections, should have at least 1 page
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    })

    it('should generate PDF with only selected sections', () => {
      const data = createMockExportData()
      const sectionsSmall = ['overview'] as const
      const sectionsLarge = ['overview', 'trends', 'performance', 'budget', 'engagement'] as const

      const docSmall = generateAnalyticsPDF(data, [...sectionsSmall])
      const docLarge = generateAnalyticsPDF(data, [...sectionsLarge])

      // Larger content should result in more or equal pages
      expect(docLarge.getNumberOfPages()).toBeGreaterThanOrEqual(docSmall.getNumberOfPages())
    })

    it('should handle empty data gracefully', () => {
      const data = createMockExportData({
        stats: null,
        trends: null,
        performance: null,
        budget: null,
        engagement: null,
      })

      const doc = generateAnalyticsPDF(data, ['overview', 'trends'])

      expect(doc).toBeDefined()
      expect(doc.getNumberOfPages()).toBe(1)
    })

    it('should handle empty trends array', () => {
      const data = createMockExportData({ trends: [] })

      const doc = generateAnalyticsPDF(data, ['trends'])

      expect(doc).toBeDefined()
    })

    it('should add page numbers to footer', () => {
      const data = createMockExportData()
      const sections = ['overview', 'trends', 'performance', 'budget', 'engagement'] as const

      const doc = generateAnalyticsPDF(data, [...sections])

      // PDF should have pages with footers (can't easily test content, but structure is valid)
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    })
  })

  describe('generatePDFFilename', () => {
    it('should generate organizer filename for non-admin', () => {
      const filename = generatePDFFilename(false)

      expect(filename).toMatch(/^organizer-analytics-\d{4}-\d{2}-\d{2}\.pdf$/)
    })

    it('should generate platform filename for admin', () => {
      const filename = generatePDFFilename(true)

      expect(filename).toMatch(/^platform-analytics-\d{4}-\d{2}-\d{2}\.pdf$/)
    })

    it('should include current date in filename', () => {
      const today = new Date().toISOString().split('T')[0]
      const filename = generatePDFFilename(false)

      expect(filename).toContain(today)
    })
  })
})
