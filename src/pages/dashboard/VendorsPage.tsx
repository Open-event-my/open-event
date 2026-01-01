import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  MagnifyingGlass,
  Storefront,
  Star,
  CheckCircle,
  MapPin,
  EnvelopeSimple,
  Plus,
  Phone,
  Globe,
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

const defaultCategories = [
  'All',
  'Catering',
  'AV Equipment',
  'Photography',
  'Decoration',
  'Security',
  'Transportation',
]

type Vendor = {
  _id: Id<'vendors'>
  name: string
  description?: string
  category: string
  location?: string
  priceRange?: string
  rating?: number
  reviewCount?: number
  contactEmail?: string
  contactPhone?: string
  website?: string
  verified: boolean
}

export function VendorsPage() {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const vendors = useQuery(api.vendors.list, {
    category: category === 'All' ? undefined : category.toLowerCase(),
    search: search || undefined,
  })

  const categories = useQuery(api.vendors.getCategories)
  const myEvents = useQuery(api.events.getMyEvents, {})
  const sendInquiry = useMutation(api.inquiries.send)

  const displayCategories = categories?.length ? ['All', ...categories] : defaultCategories

  // Filter events that are in planning or active status
  const availableEvents =
    myEvents?.filter(
      (e) => e.status === 'planning' || e.status === 'active' || e.status === 'draft'
    ) || []

  const openInquiryModal = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setSelectedEventId('')
    setInquiryMessage('')
    setShowInquiryModal(true)
  }

  const handleSendInquiry = async () => {
    if (!selectedVendor || !selectedEventId || !inquiryMessage.trim()) {
      toast.error('Please select an event and write a message')
      return
    }

    setIsSending(true)
    try {
      await sendInquiry({
        toType: 'vendor',
        toId: selectedVendor._id,
        eventId: selectedEventId as Id<'events'>,
        subject: `Inquiry about ${selectedVendor.category} services`,
        message: inquiryMessage,
      })
      toast.success('Inquiry sent successfully!')
      setShowInquiryModal(false)
      setSelectedVendor(null)
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
        <h1 className="text-2xl font-bold font-mono">Vendor Marketplace</h1>
        <p className="text-muted-foreground mt-1">Find and connect with trusted event vendors</p>
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
          placeholder="Search vendors..."
          className={cn(
            'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'text-sm placeholder:text-muted-foreground'
          )}
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {displayCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer capitalize',
              category === cat
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Vendors List or Empty State */}
      {vendors === undefined ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="h-12 w-12 bg-muted rounded-lg mb-4" />
              <div className="h-5 bg-muted rounded w-2/3 mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Storefront
            size={64}
            weight="duotone"
            className="mx-auto text-muted-foreground/30 mb-6"
          />
          <h3 className="text-lg font-semibold mb-2">
            {search ? 'No vendors found' : 'Vendor marketplace coming soon'}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No vendors matching "${search}". Try a different search term.`
              : "We're building a curated marketplace of trusted vendors. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor) => (
            <div
              key={vendor._id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-sm transition-all group"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Storefront size={24} weight="duotone" className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{vendor.name}</h3>
                    {vendor.verified && (
                      <CheckCircle size={16} weight="fill" className="text-blue-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {vendor.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              {vendor.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {vendor.description}
                </p>
              )}

              {/* Info Row */}
              <div className="flex items-center justify-between text-sm mb-4">
                <div className="flex items-center gap-1 text-muted-foreground">
                  {vendor.rating && vendor.rating > 0 ? (
                    <>
                      <Star size={14} weight="fill" className="text-amber-500" />
                      <span>{vendor.rating.toFixed(1)}</span>
                      <span className="text-xs">({vendor.reviewCount})</span>
                    </>
                  ) : (
                    <span className="text-xs">No reviews yet</span>
                  )}
                </div>
                {vendor.location && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin size={14} weight="bold" />
                    <span className="text-xs truncate max-w-[100px]">{vendor.location}</span>
                  </div>
                )}
              </div>

              {/* Price Range */}
              {vendor.priceRange && (
                <div className="mb-4">
                  <span className="text-xs font-medium text-muted-foreground capitalize">
                    {vendor.priceRange} pricing
                  </span>
                </div>
              )}

              {/* Contact & Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                {vendor.contactEmail && (
                  <a
                    href={`mailto:${vendor.contactEmail}`}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Email vendor"
                  >
                    <EnvelopeSimple size={18} weight="duotone" />
                  </a>
                )}
                {vendor.contactPhone && (
                  <a
                    href={`tel:${vendor.contactPhone}`}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Call vendor"
                  >
                    <Phone size={18} weight="duotone" />
                  </a>
                )}
                {vendor.website && (
                  <a
                    href={vendor.website}
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
                  onClick={() => openInquiryModal(vendor)}
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
              <Storefront size={20} weight="duotone" className="text-orange-500" />
              Send Inquiry to {selectedVendor?.name}
            </DialogTitle>
            <DialogDescription>
              Send an inquiry to this vendor for one of your events.
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
                placeholder={`Hi, I'm interested in your ${selectedVendor?.category} services for my upcoming event...`}
                rows={4}
              />
            </div>

            {selectedVendor && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">Vendor Details</p>
                <p className="text-muted-foreground">
                  Category: <span className="capitalize">{selectedVendor.category}</span>
                </p>
                {selectedVendor.priceRange && (
                  <p className="text-muted-foreground">
                    Pricing: <span className="capitalize">{selectedVendor.priceRange}</span>
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
