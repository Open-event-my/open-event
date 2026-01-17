import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ROIReportView, LeadCaptureModal } from '@/components/sponsors'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ChartBar,
  Users,
  Target,
  Plus,
  Sparkle,
  Fire,
  Sun,
  Snowflake,
  CheckCircle,
  Clock,
  Phone,
  Envelope,
} from '@phosphor-icons/react'

export function EventSponsorsReportPage() {
  const { eventId, sponsorshipId } = useParams<{ eventId: string; sponsorshipId: string }>()
  const [leadCaptureOpen, setLeadCaptureOpen] = useState(false)

  // Queries
  const eventSponsor = useQuery(
    api.eventSponsors.get,
    sponsorshipId ? { id: sponsorshipId as Id<'eventSponsors'> } : 'skip'
  )
  const leads = useQuery(
    api.sponsorLeads.listByEventSponsor,
    sponsorshipId ? { eventSponsorId: sponsorshipId as Id<'eventSponsors'> } : 'skip'
  )
  const leadStats = useQuery(
    api.sponsorLeads.getStats,
    eventId && sponsorshipId
      ? {
          eventId: eventId as Id<'events'>,
          eventSponsorId: sponsorshipId as Id<'eventSponsors'>,
        }
      : 'skip'
  )

  const generateAllReports = useMutation(api.sponsorReports.generateAllForEvent)

  if (!eventId || !sponsorshipId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Invalid event or sponsorship ID</p>
      </div>
    )
  }

  if (eventSponsor === undefined) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!eventSponsor) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Sponsorship not found</p>
        <Link to={`/dashboard/events/${eventId}`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to Event
          </Button>
        </Link>
      </div>
    )
  }

  const handleGenerateAll = async () => {
    try {
      const result = await generateAllReports({ eventId: eventId as Id<'events'> })
      toast.success(`Generated ${result.generated} reports`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate reports')
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to={`/dashboard/events/${eventId}`}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={14} />
            Back to Event
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChartBar size={24} weight="duotone" />
            {eventSponsor.sponsor?.name || 'Sponsor'} - Analytics
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{eventSponsor.tier || 'Standard'} Tier</Badge>
            <Badge
              variant={eventSponsor.status === 'confirmed' ? 'default' : 'secondary'}
              className={cn(
                eventSponsor.status === 'confirmed' && 'bg-emerald-500 hover:bg-emerald-600'
              )}
            >
              {eventSponsor.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGenerateAll}>
            <Sparkle size={16} className="mr-2" />
            Regenerate All Reports
          </Button>
          <Button onClick={() => setLeadCaptureOpen(true)}>
            <Plus size={16} className="mr-2" />
            Capture Lead
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {leadStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Target size={20} weight="duotone" className="text-purple-500" />}
            label="Total Leads"
            value={leadStats.totalLeads}
          />
          <StatCard
            icon={<Fire size={20} weight="fill" className="text-red-500" />}
            label="Hot Leads"
            value={leadStats.byInterestLevel.hot}
          />
          <StatCard
            icon={<CheckCircle size={20} weight="fill" className="text-emerald-500" />}
            label="Converted"
            value={leadStats.byFollowUpStatus.converted}
          />
          <StatCard
            icon={<Clock size={20} weight="duotone" className="text-amber-500" />}
            label="Pending Follow-up"
            value={leadStats.byFollowUpStatus.pending}
          />
        </div>
      )}

      {/* ROI Report */}
      <ROIReportView eventSponsorId={sponsorshipId as Id<'eventSponsors'>} />

      {/* Leads Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users size={20} weight="duotone" />
            Captured Leads
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLeadCaptureOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Add Lead
          </Button>
        </CardHeader>
        <CardContent>
          {leads && leads.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Captured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead._id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-sm">
                          <Envelope size={12} className="text-muted-foreground" />
                          {lead.email}
                        </span>
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone size={12} />
                            {lead.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{lead.company || '-'}</span>
                        {lead.jobTitle && (
                          <span className="text-xs text-muted-foreground">{lead.jobTitle}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.interestLevel && (
                        <Badge
                          variant="outline"
                          className={cn(
                            lead.interestLevel === 'hot' && 'border-red-300 text-red-600',
                            lead.interestLevel === 'warm' && 'border-amber-300 text-amber-600',
                            lead.interestLevel === 'cold' && 'border-blue-300 text-blue-600'
                          )}
                        >
                          {lead.interestLevel === 'hot' && <Fire size={12} className="mr-1" />}
                          {lead.interestLevel === 'warm' && <Sun size={12} className="mr-1" />}
                          {lead.interestLevel === 'cold' && (
                            <Snowflake size={12} className="mr-1" />
                          )}
                          {lead.interestLevel}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          lead.followUpStatus === 'converted' &&
                            'border-emerald-300 text-emerald-600',
                          lead.followUpStatus === 'contacted' && 'border-blue-300 text-blue-600',
                          lead.followUpStatus === 'lost' && 'border-gray-300 text-gray-600'
                        )}
                      >
                        {lead.followUpStatus || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.capturedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" weight="duotone" />
              <p className="text-muted-foreground mb-4">
                No leads captured yet for this sponsorship.
              </p>
              <Button onClick={() => setLeadCaptureOpen(true)}>
                <Plus size={16} className="mr-2" />
                Capture First Lead
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Capture Modal */}
      <LeadCaptureModal
        open={leadCaptureOpen}
        onOpenChange={setLeadCaptureOpen}
        eventSponsorId={sponsorshipId as Id<'eventSponsors'>}
        sponsorName={eventSponsor.sponsor?.name || 'Sponsor'}
      />
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
