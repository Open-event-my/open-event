import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  MagnifyingGlass,
  Handshake,
  CheckCircle,
  CurrencyDollar,
  Globe,
  EnvelopeSimple,
  Plus,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const defaultIndustries = [
  'All',
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Media',
  'Retail',
]

type Sponsor = {
  _id: Id<'sponsors'>
  name: string
  description?: string
  industry: string
  sponsorshipTiers?: string[]
  budgetMin?: number
  budgetMax?: number
  targetEventTypes?: string[]
  contactEmail?: string
  contactName?: string
  website?: string
  logoUrl?: string
  verified: boolean
}

export function SponsorsPage() {
  const [industry, setIndustry] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null)
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const sponsors = useQuery(api.sponsors.list, {
    industry: industry === 'All' ? undefined : industry.toLowerCase(),
    search: search || undefined,
  })

  const industries = useQuery(api.sponsors.getIndustries)
  const myEvents = useQuery(api.events.getMyEvents, {})
  const sendInquiry = useMutation(api.inquiries.send)

  const displayIndustries = industries?.length ? ['All', ...industries] : defaultIndustries

  // Filter events that are in planning or active status
  const availableEvents =
    myEvents?.filter(
      (e) => e.status === 'planning' || e.status === 'active' || e.status === 'draft'
    ) || []

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return null
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 0,
    })
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
    if (min) return `From ${formatter.format(min)}`
    if (max) return `Up to ${formatter.format(max)}`
    return null
  }

  const openInquiryModal = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor)
    setSelectedEventId('')
    setInquiryMessage('')
    setShowInquiryModal(true)
  }

  const handleSendInquiry = async () => {
    if (!selectedSponsor || !selectedEventId || !inquiryMessage.trim()) {
      toast.error('Please select an event and write a message')
      return
    }

    setIsSending(true)
    try {
      await sendInquiry({
        toType: 'sponsor',
        toId: selectedSponsor._id,
        eventId: selectedEventId as Id<'events'>,
        subject: `Sponsorship inquiry for your consideration`,
        message: inquiryMessage,
      })
      toast.success('Inquiry sent successfully!')
      setShowInquiryModal(false)
      setSelectedSponsor(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send inquiry')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono">Sponsor Discovery</h1>
        <p className="text-muted-foreground mt-1">Find sponsors that align with your event</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlass
          size={18}
          weight="bold"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sponsors..."
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'text-sm placeholder:text-muted-foreground'
          )}
        />
      </div>

      {/* Industries */}
      <div className="flex flex-wrap gap-2">
        {displayIndustries.map((ind) => (
          <button
            key={ind}
            onClick={() => setIndustry(ind)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer capitalize',
              industry === ind
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {ind}
          </button>
        ))}
      </div>

      {/* Sponsors List or Empty State */}
      {sponsors === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-12 w-12 bg-muted rounded-lg mb-4" />
              <div className="h-5 bg-muted rounded w-2/3 mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : sponsors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Handshake size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
          <h3 className="text-lg font-semibold mb-2">
            {search ? 'No sponsors found' : 'Sponsor discovery coming soon'}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No sponsors matching "${search}". Try a different search term.`
              : 'AI-powered sponsor matching will help you find the perfect partners for your events.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor._id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-sm transition-all group"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                {sponsor.logoUrl ? (
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    loading="lazy"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Handshake size={24} weight="duotone" className="text-purple-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{sponsor.name}</h3>
                    {sponsor.verified && (
                      <CheckCircle size={16} weight="fill" className="text-blue-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {sponsor.industry}
                  </span>
                </div>
              </div>

              {/* Description */}
              {sponsor.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {sponsor.description}
                </p>
              )}

              {/* Sponsorship Tiers */}
              {sponsor.sponsorshipTiers && sponsor.sponsorshipTiers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {sponsor.sponsorshipTiers.map((tier) => (
                    <span
                      key={tier}
                      className="px-2 py-0.5 text-xs rounded bg-purple-500/10 text-purple-600 capitalize"
                    >
                      {tier}
                    </span>
                  ))}
                </div>
              )}

              {/* Budget Range */}
              {formatBudget(sponsor.budgetMin, sponsor.budgetMax) && (
                <div className="flex items-center gap-1 text-muted-foreground mb-4">
                  <CurrencyDollar size={14} weight="bold" />
                  <span className="text-xs">
                    {formatBudget(sponsor.budgetMin, sponsor.budgetMax)}
                  </span>
                </div>
              )}

              {/* Target Events */}
              {sponsor.targetEventTypes && sponsor.targetEventTypes.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs text-muted-foreground">
                    Interested in: {sponsor.targetEventTypes.slice(0, 3).join(', ')}
                    {sponsor.targetEventTypes.length > 3 &&
                      ` +${sponsor.targetEventTypes.length - 3} more`}
                  </span>
                </div>
              )}

              {/* Contact & Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                {sponsor.contactEmail && (
                  <a
                    href={`mailto:${sponsor.contactEmail}`}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Email sponsor"
                  >
                    <EnvelopeSimple size={18} weight="duotone" />
                  </a>
                )}
                {sponsor.website && (
                  <a
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Visit website"
                  >
                    <Globe size={18} weight="duotone" />
                  </a>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => openInquiryModal(sponsor)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                    'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                  )}
                >
                  <Plus size={16} weight="bold" />
                  Inquire
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inquiry Modal */}
      <Dialog open={showInquiryModal} onOpenChange={setShowInquiryModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake size={20} weight="duotone" className="text-purple-500" />
              Send Inquiry to {selectedSponsor?.name}
            </DialogTitle>
            <DialogDescription>
              Send a sponsorship inquiry for one of your events.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Event</Label>
              {availableEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted">
                  You need to create an event first before sending inquiries.
                </p>
              ) : (
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEvents.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                placeholder={`Hi, I'm reaching out regarding a potential sponsorship opportunity for our upcoming event...`}
                rows={4}
              />
            </div>

            {selectedSponsor && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">Sponsor Details</p>
                <p className="text-muted-foreground">
                  Industry: <span className="capitalize">{selectedSponsor.industry}</span>
                </p>
                {formatBudget(selectedSponsor.budgetMin, selectedSponsor.budgetMax) && (
                  <p className="text-muted-foreground">
                    Budget Range:{' '}
                    {formatBudget(selectedSponsor.budgetMin, selectedSponsor.budgetMax)}
                  </p>
                )}
                {selectedSponsor.sponsorshipTiers &&
                  selectedSponsor.sponsorshipTiers.length > 0 && (
                    <p className="text-muted-foreground">
                      Tiers: {selectedSponsor.sponsorshipTiers.join(', ')}
                    </p>
                  )}
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowInquiryModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendInquiry}
              disabled={
                isSending ||
                !selectedEventId ||
                !inquiryMessage.trim() ||
                availableEvents.length === 0
              }
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <EnvelopeSimple size={16} weight="bold" />
              {isSending ? 'Sending...' : 'Send Inquiry'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
