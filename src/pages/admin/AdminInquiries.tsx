import { useState, useEffect, useMemo } from 'react'
import { usePaginatedQuery, useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id, Doc } from '../../../convex/_generated/dataModel'

interface EnrichedInquiry extends Doc<'inquiries'> {
  senderDetails?: {
    name?: string
    email?: string
    image?: string
  } | null
  recipientDetails?: {
    name?: string
    email?: string
    contactEmail?: string
    category?: string
    industry?: string
  } | null
  eventDetails?: {
    title?: string
    startDate?: number
  } | null
}
import { cn } from '@/lib/utils'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import {
  PaperPlaneTilt,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Buildings,
  ArrowRight,
  EnvelopeSimple,
  NotePencil,
  FloppyDisk,
  CaretDown,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatDistanceToNow } from 'date-fns'

// Types
type InquiryStatus = 'sent' | 'read' | 'replied' | 'closed'
type InquiryToType = 'vendor' | 'sponsor'

// Filter Options
const STATUS_FILTERS = [
  { value: 'all', label: 'All Status', color: undefined },
  { value: 'sent', label: 'Unread', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'read', label: 'Read', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'replied', label: 'Replied', color: 'bg-green-500/10 text-green-600' },
  { value: 'closed', label: 'Closed', color: 'bg-zinc-500/10 text-zinc-600' },
] as const

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'sponsor', label: 'Sponsors' },
] as const

export function AdminInquiries() {
  // State
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<InquiryToType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedId, setSelectedId] = useState<Id<'inquiries'> | null>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Queries
  // 1. Paginated List (Default)
  const {
    results: paginatedResults,
    status: paginationStatus,
    loadMore,
    isLoading: isPaginationLoading,
  } = usePaginatedQuery(
    api.inquiries.listAllForAdmin,
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      toType: typeFilter === 'all' ? undefined : typeFilter,
    },
    { initialNumItems: 20 }
  )

  // 2. Search Query (Active when search text exists)
  const searchResults = useQuery(
    api.inquiries.searchAdminInquiries,
    debouncedSearch ? { query: debouncedSearch } : 'skip'
  )

  // Cast results to EnrichedInquiry type (both queries return enriched data)
  const enrichedResults = paginatedResults as unknown as EnrichedInquiry[]
  const enrichedSearchResults = searchResults as unknown as EnrichedInquiry[] | undefined

  // Derived Inquiries List
  const inquiries = useMemo(() => {
    if (debouncedSearch) return enrichedSearchResults || []
    return enrichedResults || []
  }, [debouncedSearch, enrichedSearchResults, enrichedResults])

  // Selected Inquiry Data
  const selectedInquiry = useMemo(
    () => inquiries.find((i) => i._id === selectedId),
    [inquiries, selectedId]
  )

  // Effect: Select first item if none selected and list loaded (Desktop only)
  useEffect(() => {
    // Only run this once when inquiries first load and nothing is selected
    if (!selectedId && inquiries.length > 0 && window.innerWidth >= 1024) {
      // Use setTimeout to avoid 'setState during render' warning if this effect runs too early
      // although useEffect runs after render. The warning usually comes from synchronous calls.
      // We'll just set it.
      setSelectedId(inquiries[0]._id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiries.length]) // Only re-run if list length changes (initial load)

  // Handlers
  const isLoading = debouncedSearch ? searchResults === undefined : isPaginationLoading

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[600px] border border-border rounded-xl bg-card shadow-sm flex overflow-hidden">
      {/* LEFT PANE: List */}
      <div
        className={cn(
          'w-full lg:w-[400px] border-r border-border flex flex-col bg-muted/10',
          selectedId ? 'hidden lg:flex' : 'flex'
        )}
      >
        {/* Header / Filters */}
        <div className="p-4 border-b border-border space-y-3 bg-card">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inquiries..."
              className="pl-9 h-9 bg-muted/50"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-between text-xs h-8">
                  {STATUS_FILTERS.find((f) => f.value === statusFilter)?.label}
                  <CaretDown size={12} className="ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[160px]">
                {STATUS_FILTERS.map((f) => (
                  <DropdownMenuItem
                    key={f.value}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => setStatusFilter(f.value as any)}
                    className="text-xs"
                  >
                    {f.label}
                    {statusFilter === f.value && <CheckCircle size={12} className="ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-between text-xs h-8">
                  {TYPE_FILTERS.find((f) => f.value === typeFilter)?.label}
                  <CaretDown size={12} className="ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                {TYPE_FILTERS.map((f) => (
                  <DropdownMenuItem
                    key={f.value}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => setTypeFilter(f.value as any)}
                    className="text-xs"
                  >
                    {f.label}
                    {typeFilter === f.value && <CheckCircle size={12} className="ml-auto" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* List Content */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                Loading...
              </div>
            ) : inquiries.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No inquiries found matching your filters.
              </div>
            ) : (
              <>
                {inquiries.map((inquiry) => (
                  <InquiryListItem
                    key={inquiry._id}
                    inquiry={inquiry as unknown as EnrichedInquiry}
                    selected={selectedId === inquiry._id}
                    onClick={() => setSelectedId(inquiry._id)}
                  />
                ))}

                {/* Load More Trigger */}
                {!debouncedSearch && paginationStatus === 'CanLoadMore' && (
                  <button
                    onClick={() => loadMore(10)}
                    className="w-full py-4 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    Load more inquiries
                  </button>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT PANE: Detail */}
      <div
        className={cn(
          'flex-1 bg-card flex-col',
          !selectedId
            ? 'hidden lg:flex'
            : 'flex fixed inset-0 z-50 lg:static lg:z-auto bg-background'
        )}
      >
        {selectedInquiry ? (
          <InquiryDetailView
            key={selectedInquiry._id}
            inquiry={selectedInquiry}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <EnvelopeSimple size={48} className="mx-auto mb-4 opacity-20" />
              <p>Select an inquiry to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function InquiryListItem({
  inquiry,
  selected,
  onClick,
}: {
  inquiry: EnrichedInquiry
  selected: boolean
  onClick: () => void
}) {
  const statusConfig = STATUS_FILTERS.find((f) => f.value === inquiry.status)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 hover:bg-muted/50 transition-all border-l-4 border-transparent',
        selected && 'bg-muted/50 border-primary'
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <span
          className={cn(
            'text-sm font-medium truncate pr-2',
            inquiry.status === 'sent' ? 'text-foreground font-bold' : 'text-muted-foreground'
          )}
        >
          {inquiry.subject}
        </span>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
          {formatDistanceToNow(inquiry.createdAt, { addSuffix: true })}
        </span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-muted-foreground truncate max-w-[180px]">
          {inquiry.senderDetails?.name || 'Unknown User'}
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0 h-5 border-0', statusConfig?.color)}
        >
          {statusConfig?.label}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 break-words opacity-80">
        {inquiry.message}
      </p>
    </button>
  )
}

function InquiryDetailView({ inquiry, onBack }: { inquiry: EnrichedInquiry; onBack: () => void }) {
  const { execute } = useAsyncAction()
  const markAsRead = useMutation(api.inquiries.markAsRead)
  const close = useMutation(api.inquiries.close)
  const respond = useMutation(api.inquiries.respond)
  const updateNotes = useMutation(api.inquiries.updateAdminNotes)

  const [notes, setNotes] = useState(inquiry.adminNotes || '')
  const [response, setResponse] = useState('')
  const [isNotesDirty, setIsNotesDirty] = useState(false)

  const handleMarkRead = () => {
    if (inquiry.status !== 'sent') return
    execute(() => markAsRead({ inquiryId: inquiry._id }), { successMessage: 'Marked as read' })
  }

  const handleClose = () => {
    execute(() => close({ inquiryId: inquiry._id }), { successMessage: 'Inquiry closed' })
  }

  const handleRespond = () => {
    if (!response.trim()) return
    execute(() => respond({ inquiryId: inquiry._id, response }), {
      successMessage: 'Response sent',
      onSuccess: () => setResponse(''),
    })
  }

  const handleSaveNotes = () => {
    execute(() => updateNotes({ inquiryId: inquiry._id, notes }), {
      successMessage: 'Notes saved',
      onSuccess: () => setIsNotesDirty(false),
    })
  }

  // Auto-mark as read when opened (optional, maybe too aggressive? Let's keep it manual or implicit)
  // Let's make it manual via button for better control, or implicit if we wanted email-style.

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden -ml-2">
            <ArrowRight size={18} className="rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-md">
                {inquiry.subject}
              </h2>
              <Badge variant="outline" className="capitalize">
                {inquiry.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Clock size={12} />
              {new Date(inquiry.createdAt).toLocaleString()}
              {inquiry.eventDetails && (
                <>
                  <span className="mx-1">•</span>
                  <span>{inquiry.eventDetails.title}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inquiry.status === 'sent' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleMarkRead}>
                    <CheckCircle size={16} className="mr-2" />
                    Mark Read
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark this inquiry as read</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {inquiry.status !== 'closed' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <XCircle size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close Inquiry</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Participants Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender */}
            <div className="p-4 rounded-lg border border-border bg-muted/20">
              <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <User size={14} /> From
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {inquiry.senderDetails?.name?.[0] || '?'}
                </div>
                <div>
                  <div className="font-medium text-sm">{inquiry.senderDetails?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {inquiry.senderDetails?.email}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize mt-0.5 bg-muted px-1.5 py-0.5 rounded inline-block">
                    Organizer
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient */}
            <div className="p-4 rounded-lg border border-border bg-muted/20">
              <div className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                <Buildings size={14} /> To
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-lg">
                  {inquiry.recipientDetails?.name?.[0] || '?'}
                </div>
                <div>
                  <div className="font-medium text-sm">{inquiry.recipientDetails?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {inquiry.recipientDetails?.contactEmail || 'No email'}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize mt-0.5 bg-muted px-1.5 py-0.5 rounded inline-block">
                    {inquiry.toType}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Message</h3>
            <div className="p-4 rounded-lg bg-card border border-border text-sm leading-relaxed whitespace-pre-wrap">
              {inquiry.message}
            </div>
          </div>

          {/* Admin Internal Notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <NotePencil size={16} className="text-amber-500" />
                Internal Notes
              </h3>
              {isNotesDirty && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveNotes}
                  className="h-6 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <FloppyDisk size={12} className="mr-1" />
                  Save Changes
                </Button>
              )}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setIsNotesDirty(true)
              }}
              placeholder="Add private notes about this inquiry (only visible to admins)..."
              className="bg-amber-50/50 border-amber-200/50 focus-visible:ring-amber-500/20 min-h-[100px] text-sm resize-none"
            />
          </div>

          <Separator />

          {/* Response Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Response</h3>
            {inquiry.response ? (
              <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/50">
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">
                  <PaperPlaneTilt size={14} />
                  Replied on {new Date(inquiry.respondedAt!).toLocaleString()}
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {inquiry.response}
                </div>
              </div>
            ) : inquiry.status === 'closed' ? (
              <div className="text-sm text-muted-foreground italic bg-muted/30 p-4 rounded-lg text-center">
                This inquiry is closed and can no longer be replied to.
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the organizer..."
                  className="min-h-[150px]"
                />
                <div className="flex justify-end">
                  <Button onClick={handleRespond} disabled={!response.trim()}>
                    <PaperPlaneTilt size={16} className="mr-2" />
                    Send Response
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
