import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ChartBar,
  Users,
  CurrencyDollar,
  Target,
  Eye,
  Download,
  EnvelopeSimple,
  Sparkle,
  CheckCircle,
  ArrowUp,
  Calendar,
} from '@phosphor-icons/react'

interface ROIReportViewProps {
  eventSponsorId: Id<'eventSponsors'>
  className?: string
}

export function ROIReportView({ eventSponsorId, className }: ROIReportViewProps) {
  const report = useQuery(api.sponsorReports.getByEventSponsor, { eventSponsorId })
  const generateReport = useMutation(api.sponsorReports.generate)
  const markDownloaded = useMutation(api.sponsorReports.markDownloaded)

  const handleGenerate = async () => {
    try {
      await generateReport({ eventSponsorId })
      toast.success('Report generated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report')
    }
  }

  const handleDownload = async () => {
    if (!report) return

    // Mark as downloaded
    await markDownloaded({ reportId: report._id })

    // Generate downloadable content
    const reportContent = generateReportText(report)
    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roi-report-${report.sponsorName?.replace(/\s+/g, '-').toLowerCase()}-${new Date(report.generatedAt).toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('Report downloaded')
  }

  if (report === undefined) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-24 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBar size={20} weight="duotone" />
            ROI Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ChartBar
              size={48}
              className="mx-auto text-muted-foreground/30 mb-4"
              weight="duotone"
            />
            <p className="text-muted-foreground mb-4">
              No report generated yet. Generate a report to see sponsorship ROI metrics.
            </p>
            <Button onClick={handleGenerate}>
              <Sparkle size={16} className="mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { metrics } = report

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ChartBar size={20} weight="duotone" />
            ROI Report
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Generated {new Date(report.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            <Sparkle size={14} className="mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download size={14} className="mr-1.5" />
            Export
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<CurrencyDollar size={20} weight="duotone" />}
            label="Investment"
            value={`$${metrics.sponsorshipAmount.toLocaleString()}`}
            subtext={metrics.tier}
            iconColor="text-emerald-500"
          />
          <MetricCard
            icon={<Users size={20} weight="duotone" />}
            label="Attendees Reached"
            value={metrics.checkedInAttendees.toLocaleString()}
            subtext={`of ${metrics.totalAttendees} registered`}
            iconColor="text-blue-500"
          />
          <MetricCard
            icon={<Target size={20} weight="duotone" />}
            label="Leads Generated"
            value={metrics.leadsGenerated.toString()}
            subtext={
              metrics.costPerLead ? `$${metrics.costPerLead.toFixed(2)} per lead` : 'No leads yet'
            }
            iconColor="text-purple-500"
          />
          <MetricCard
            icon={<Eye size={20} weight="duotone" />}
            label="Est. Impressions"
            value={metrics.estimatedImpressions.toLocaleString()}
            subtext="Brand exposures"
            iconColor="text-amber-500"
          />
        </div>

        {/* ROI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Cost per Attendee</span>
              <CurrencyDollar size={16} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">${metrics.costPerAttendee.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per checked-in attendee</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Attendance Rate</span>
              <ArrowUp size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">
              {metrics.totalAttendees > 0
                ? ((metrics.checkedInAttendees / metrics.totalAttendees) * 100).toFixed(0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.checkedInAttendees} of {metrics.totalAttendees} showed up
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Cost per 1K Impressions</span>
              <Eye size={16} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              $
              {metrics.estimatedImpressions > 0
                ? ((metrics.sponsorshipAmount / metrics.estimatedImpressions) * 1000).toFixed(2)
                : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">CPM rate</p>
          </div>
        </div>

        {/* Highlights */}
        {report.highlights && report.highlights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-500" />
              Key Highlights
            </h4>
            <ul className="space-y-1.5">
              {report.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-emerald-500 mt-1">-</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Report Status */}
        <div className="flex items-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            Generated: {new Date(report.generatedAt).toLocaleString()}
          </div>
          {report.downloadedAt && (
            <Badge variant="outline" className="text-xs">
              <Download size={12} className="mr-1" />
              Downloaded
            </Badge>
          )}
          {report.sentToSponsorAt && (
            <Badge variant="outline" className="text-xs">
              <EnvelopeSimple size={12} className="mr-1" />
              Sent to Sponsor
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
  iconColor?: string
}

function MetricCard({ icon, label, value, subtext, iconColor = 'text-primary' }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className={cn('mb-2', iconColor)}>{icon}</div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1 capitalize">{subtext}</div>
    </div>
  )
}

function generateReportText(report: {
  sponsorName?: string
  eventTitle?: string
  generatedAt: number
  metrics: {
    sponsorshipAmount: number
    tier: string
    totalAttendees: number
    checkedInAttendees: number
    leadsGenerated: number
    costPerLead?: number
    costPerAttendee: number
    estimatedImpressions: number
  }
  highlights?: string[]
}): string {
  const { metrics } = report
  const date = new Date(report.generatedAt).toLocaleDateString()

  return `
SPONSORSHIP ROI REPORT
======================
Sponsor: ${report.sponsorName || 'N/A'}
Event: ${report.eventTitle || 'N/A'}
Generated: ${date}

INVESTMENT
----------
Amount: $${metrics.sponsorshipAmount.toLocaleString()}
Tier: ${metrics.tier}

REACH
-----
Total Registered: ${metrics.totalAttendees}
Checked In: ${metrics.checkedInAttendees}
Attendance Rate: ${((metrics.checkedInAttendees / metrics.totalAttendees) * 100).toFixed(1)}%

ENGAGEMENT
----------
Leads Generated: ${metrics.leadsGenerated}
${metrics.costPerLead ? `Cost per Lead: $${metrics.costPerLead.toFixed(2)}` : ''}

BRAND EXPOSURE
--------------
Estimated Impressions: ${metrics.estimatedImpressions.toLocaleString()}
Cost per 1K Impressions: $${((metrics.sponsorshipAmount / metrics.estimatedImpressions) * 1000).toFixed(2)}

ROI METRICS
-----------
Cost per Attendee: $${metrics.costPerAttendee.toFixed(2)}

${report.highlights && report.highlights.length > 0 ? `KEY HIGHLIGHTS\n--------------\n${report.highlights.map((h) => `- ${h}`).join('\n')}` : ''}

---
Report generated by Open Event Platform
`.trim()
}
