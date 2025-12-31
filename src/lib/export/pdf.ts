// PDF Export Utilities
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
 * jsPDF with autoTable plugin adds lastAutoTable property
 */
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number
  }
}

// Theme colors matching the app
const COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#10b981',
  text: '#1e293b',
  muted: '#94a3b8',
  border: '#e2e8f0',
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
 * Add header to PDF
 */
function addHeader(doc: jsPDF, data: AnalyticsExportData): number {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(20)
  doc.setTextColor(COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text('Analytics Report', 14, 20)

  // Subtitle with export info
  doc.setFontSize(10)
  doc.setTextColor(COLORS.muted)
  doc.setFont('helvetica', 'normal')
  const exportDate = new Date(data.exportedAt).toLocaleString()
  const viewType = data.isAdmin ? 'Platform View' : 'Organizer View'
  doc.text(`Exported: ${exportDate} | ${viewType}`, 14, 28)

  // Horizontal line
  doc.setDrawColor(COLORS.border)
  doc.setLineWidth(0.5)
  doc.line(14, 32, pageWidth - 14, 32)

  return 40 // Return Y position after header
}

/**
 * Add section title
 */
function addSectionTitle(doc: jsPDF, title: string, yPos: number): number {
  doc.setFontSize(14)
  doc.setTextColor(COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, yPos)
  return yPos + 8
}

/**
 * Check if we need a new page
 */
function checkPageBreak(doc: jsPDF, yPos: number, neededSpace: number = 40): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (yPos + neededSpace > pageHeight - 20) {
    doc.addPage()
    return 20
  }
  return yPos
}

/**
 * Add overview section
 */
function addOverviewSection(
  doc: jsPDF,
  stats: StatsData,
  comparative: ComparativeData | null | undefined,
  startY: number
): number {
  let yPos = addSectionTitle(doc, 'Overview', startY)

  const overviewData = [
    ['Total Events', String(stats.totalEvents)],
    ['Active Events', String(stats.activeEvents)],
    ['Planning Events', String(stats.planningEvents)],
    ['Draft Events', String(stats.draftEvents)],
    ['Completed Events', String(stats.completedEvents)],
    ['Upcoming Events', String(stats.upcomingEvents)],
    ['Total Budget', formatCurrency(stats.totalBudget)],
    ['Total Attendees', String(stats.totalAttendees)],
    ['Confirmed Vendors', String(stats.confirmedVendors)],
    ['Confirmed Sponsors', String(stats.confirmedSponsors)],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: overviewData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10

  // Add comparative data if available
  if (comparative) {
    yPos = checkPageBreak(doc, yPos, 60)

    doc.setFontSize(11)
    doc.setTextColor(COLORS.secondary)
    doc.setFont('helvetica', 'bold')
    doc.text(`Period Comparison (${comparative.period})`, 14, yPos)
    yPos += 6

    const compData = [
      [
        'Events',
        String(comparative.current.totalEvents),
        String(comparative.previous.totalEvents),
        formatPercent(comparative.changes.totalEvents),
      ],
      [
        'Budget',
        formatCurrency(comparative.current.totalBudget),
        formatCurrency(comparative.previous.totalBudget),
        formatPercent(comparative.changes.totalBudget),
      ],
      [
        'Attendees',
        String(comparative.current.totalAttendees),
        String(comparative.previous.totalAttendees),
        formatPercent(comparative.changes.totalAttendees),
      ],
      [
        'Completed',
        String(comparative.current.completedEvents),
        String(comparative.previous.completedEvents),
        formatPercent(comparative.changes.completedEvents),
      ],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Current', 'Previous', 'Change']],
      body: compData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, textColor: '#ffffff' },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  return yPos
}

/**
 * Add trends section
 */
function addTrendsSection(doc: jsPDF, trends: TrendsDataPoint[], startY: number): number {
  let yPos = checkPageBreak(doc, startY, 80)
  yPos = addSectionTitle(doc, 'Trends', yPos)

  const trendsData = trends.map((t) => [
    new Date(t.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    String(t.totalEvents),
    formatCurrency(t.totalBudget),
    String(t.totalAttendees),
    formatCurrency(t.averageBudget),
    String(t.averageAttendees),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Period', 'Events', 'Budget', 'Attendees', 'Avg Budget', 'Avg Attendees']],
    body: trendsData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  })

  return (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
}

/**
 * Add performance section
 */
function addPerformanceSection(doc: jsPDF, performance: PerformanceData, startY: number): number {
  let yPos = checkPageBreak(doc, startY, 100)
  yPos = addSectionTitle(doc, 'Performance', yPos)

  // Main metrics
  const perfData = [
    ['Total Events', String(performance.totalEvents)],
    ['Completed Events', String(performance.completedEvents)],
    ['Completion Rate', formatPercent(performance.completionRate)],
    ['Average Budget', formatCurrency(performance.averageBudget)],
    ['Average Attendees', String(performance.averageAttendees)],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: perfData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 8

  // Vendor & Sponsor metrics
  yPos = checkPageBreak(doc, yPos, 60)

  const conversionData = [
    [
      'Vendors',
      String(performance.vendorMetrics?.totalApplications ?? 0),
      String(performance.vendorMetrics?.confirmed ?? 0),
      formatPercent(performance.vendorMetrics?.conversionRate ?? 0),
    ],
    [
      'Sponsors',
      String(performance.sponsorMetrics?.totalApplications ?? 0),
      String(performance.sponsorMetrics?.confirmed ?? 0),
      formatPercent(performance.sponsorMetrics?.conversionRate ?? 0),
    ],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Type', 'Applications', 'Confirmed', 'Conversion Rate']],
    body: conversionData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.success, textColor: '#ffffff' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 8

  // Event types if available
  const eventTypes = Object.entries(performance.byEventType)
  if (eventTypes.length > 0) {
    yPos = checkPageBreak(doc, yPos, 60)

    const typeData = eventTypes.map(([type, count]) => [type, String(count)])

    autoTable(doc, {
      startY: yPos,
      head: [['Event Type', 'Count']],
      body: typeData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, textColor: '#ffffff' },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  return yPos
}

/**
 * Add budget section
 */
function addBudgetSection(doc: jsPDF, budget: BudgetData, startY: number): number {
  let yPos = checkPageBreak(doc, startY, 80)
  yPos = addSectionTitle(doc, 'Budget', yPos)

  const budgetData = [
    ['Total Budget', formatCurrency(budget.totalBudget)],
    ['Total Spent', formatCurrency(budget.totalSpent)],
    ['Budget Utilization', formatPercent(budget.budgetUtilization)],
    ['Events with Budget', String(budget.eventsWithBudget)],
    ['Average Budget per Event', formatCurrency(budget.averageBudget)],
    ['Total Budget Items', String(budget.budgetItemsCount)],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: budgetData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 8

  // Currency breakdown if available
  const currencies = Object.entries(budget.byCurrency)
  if (currencies.length > 0) {
    yPos = checkPageBreak(doc, yPos, 60)

    const currencyData = currencies.map(([currency, data]) => [
      currency,
      String(data.budget),
      String(data.spent),
      String(data.count),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Currency', 'Budget', 'Spent', 'Events']],
      body: currencyData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, textColor: '#ffffff' },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })

    yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  return yPos
}

/**
 * Add engagement section
 */
function addEngagementSection(doc: jsPDF, engagement: EngagementData, startY: number): number {
  let yPos = checkPageBreak(doc, startY, 100)
  yPos = addSectionTitle(doc, 'Engagement', yPos)

  // Vendor engagement
  doc.setFontSize(11)
  doc.setTextColor(COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('Vendor Engagement', 14, yPos)
  yPos += 6

  const vendorData = [
    ['Total Applications', String(engagement.vendors.totalApplications)],
    ['Confirmed', String(engagement.vendors.confirmed)],
    ['Pending', String(engagement.vendors.pending)],
    ['Declined', String(engagement.vendors.declined)],
    ['Conversion Rate', formatPercent(engagement.vendors.conversionRate)],
    ['Events with Vendors', String(engagement.vendors.eventsWithVendors)],
    ['Average per Event', engagement.vendors.averagePerEvent.toFixed(2)],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: vendorData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.success, textColor: '#ffffff' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  yPos = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 8

  // Sponsor engagement
  yPos = checkPageBreak(doc, yPos, 80)

  doc.setFontSize(11)
  doc.setTextColor(COLORS.secondary)
  doc.setFont('helvetica', 'bold')
  doc.text('Sponsor Engagement', 14, yPos)
  yPos += 6

  const sponsorData = [
    ['Total Applications', String(engagement.sponsors.totalApplications)],
    ['Confirmed', String(engagement.sponsors.confirmed)],
    ['Pending', String(engagement.sponsors.pending)],
    ['Declined', String(engagement.sponsors.declined)],
    ['Conversion Rate', formatPercent(engagement.sponsors.conversionRate)],
    ['Events with Sponsors', String(engagement.sponsors.eventsWithSponsors)],
    ['Average per Event', engagement.sponsors.averagePerEvent.toFixed(2)],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: sponsorData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: '#ffffff' },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  })

  return (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
}

/**
 * Generate complete PDF from analytics data
 */
export function generateAnalyticsPDF(
  data: AnalyticsExportData,
  sections: ExportSectionId[]
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  let yPos = addHeader(doc, data)

  // Overview section
  if (sections.includes('overview') && data.stats) {
    yPos = addOverviewSection(doc, data.stats, data.comparative, yPos)
  }

  // Trends section
  if (sections.includes('trends') && data.trends && data.trends.length > 0) {
    yPos = addTrendsSection(doc, data.trends, yPos)
  }

  // Performance section
  if (sections.includes('performance') && data.performance) {
    yPos = addPerformanceSection(doc, data.performance, yPos)
  }

  // Budget section
  if (sections.includes('budget') && data.budget) {
    yPos = addBudgetSection(doc, data.budget, yPos)
  }

  // Engagement section
  if (sections.includes('engagement') && data.engagement) {
    addEngagementSection(doc, data.engagement, yPos)
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(COLORS.muted)
    doc.text(
      `Page ${i} of ${pageCount} | Open Event Analytics`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  return doc
}

/**
 * Download PDF document
 */
export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

/**
 * Generate filename for PDF export
 */
export function generatePDFFilename(isAdmin: boolean): string {
  const prefix = isAdmin ? 'platform' : 'organizer'
  const date = new Date().toISOString().split('T')[0]
  return `${prefix}-analytics-${date}.pdf`
}
