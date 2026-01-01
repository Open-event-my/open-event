/**
 * Admin Event Moderation Page
 *
 * Allows admins to view and manage flagged events.
 */

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Flag,
  FlagCheckered,
  Warning,
  Trash,
  MagnifyingGlass,
  Calendar,
  User,
  Clock,
  CheckCircle,
} from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Severity = 'low' | 'medium' | 'high'

const severityConfig: Record<Severity, { bg: string; text: string; label: string }> = {
  low: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600',
    label: 'Low',
  },
  medium: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    label: 'Medium',
  },
  high: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    label: 'High',
  },
}

const severityFilters = [
  { value: 'all', label: 'All Severities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const

export function AdminEventModeration() {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnflagModal, setShowUnflagModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Id<'events'> | null>(null)
  const [selectedEventTitle, setSelectedEventTitle] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const flaggedEvents = useQuery(
    api.moderation.getFlaggedEvents,
    severityFilter === 'all' ? {} : { severity: severityFilter }
  )
  const flaggedCounts = useQuery(api.moderation.getFlaggedEventsCount)
  const unflagEvent = useMutation(api.moderation.unflagEvent)
  const removeEvent = useMutation(api.moderation.removeEvent)

  // Filter by search query
  const filteredEvents = flaggedEvents?.filter((event) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      event.title.toLowerCase().includes(query) ||
      event.organizerName?.toLowerCase().includes(query) ||
      event.organizerEmail?.toLowerCase().includes(query)
    )
  })

  const handleUnflag = async () => {
    if (!selectedEvent) return

    setIsLoading(true)
    try {
      await unflagEvent({ eventId: selectedEvent, reason: actionReason || undefined })
      toast.success('Event unflagged successfully')
      setShowUnflagModal(false)
      setSelectedEvent(null)
      setActionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unflag event')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!selectedEvent || !actionReason.trim()) {
      toast.error('Please provide a reason')
      return
    }

    setIsLoading(true)
    try {
      await removeEvent({ eventId: selectedEvent, reason: actionReason })
      toast.success('Event removed successfully')
      setShowRemoveModal(false)
      setSelectedEvent(null)
      setActionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove event')
    } finally {
      setIsLoading(false)
    }
  }

  const openUnflagModal = (eventId: Id<'events'>, eventTitle: string) => {
    setSelectedEvent(eventId)
    setSelectedEventTitle(eventTitle)
    setActionReason('')
    setShowUnflagModal(true)
  }

  const openRemoveModal = (eventId: Id<'events'>, eventTitle: string) => {
    setSelectedEvent(eventId)
    setSelectedEventTitle(eventTitle)
    setActionReason('')
    setShowRemoveModal(true)
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
          <Flag size={28} weight="duotone" className="text-red-500" />
          Event Moderation
        </h1>
        <p className="text-muted-foreground mt-1">Review and manage flagged events</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-red-500/10">
            <Flag size={24} weight="duotone" className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{flaggedCounts?.total || 0}</p>
            <p className="text-sm text-muted-foreground">Total Flagged</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-red-500/10">
            <Warning size={24} weight="duotone" className="text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{flaggedCounts?.high || 0}</p>
            <p className="text-sm text-muted-foreground">High Severity</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-orange-500/10">
            <Warning size={24} weight="duotone" className="text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{flaggedCounts?.medium || 0}</p>
            <p className="text-sm text-muted-foreground">Medium Severity</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <div className="p-3 rounded-xl bg-yellow-500/10">
            <Warning size={24} weight="duotone" className="text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{flaggedCounts?.low || 0}</p>
            <p className="text-sm text-muted-foreground">Low Severity</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={18}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search by title or organizer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />
        </div>

        {/* Severity Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {severityFilters.map((filter) => {
            const count =
              filter.value === 'all'
                ? flaggedCounts?.total || 0
                : flaggedCounts?.[filter.value] || 0
            const isActive = severityFilter === filter.value

            return (
              <button
                key={filter.value}
                onClick={() => setSeverityFilter(filter.value as Severity | 'all')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer',
                  isActive
                    ? filter.value === 'high'
                      ? 'bg-red-500 text-white shadow-sm'
                      : filter.value === 'medium'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : filter.value === 'low'
                          ? 'bg-yellow-500 text-white shadow-sm'
                          : 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-semibold min-w-[1.25rem] text-center',
                    isActive ? 'bg-white/20 text-inherit' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Flagged Events List */}
      <div className="space-y-4">
        {flaggedEvents === undefined ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredEvents?.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <FlagCheckered
              size={64}
              weight="duotone"
              className="mx-auto text-muted-foreground/30 mb-6"
            />
            <h3 className="text-lg font-semibold mb-2">No Flagged Events</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No flagged events match "${searchQuery}"`
                : 'All events are in good standing'}
            </p>
          </div>
        ) : (
          filteredEvents?.map((event) => {
            const severity = severityConfig[event.flaggedSeverity as Severity] || severityConfig.low

            return (
              <div
                key={event._id}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg truncate">{event.title}</h3>
                      <span
                        className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0',
                          severity.bg,
                          severity.text
                        )}
                      >
                        {severity.label} Severity
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {event.organizerName} ({event.organizerEmail})
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(event.startDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Flagged {formatDateTime(event.flaggedAt)}
                      </span>
                    </div>

                    {/* Flag Reason */}
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <p className="text-sm">
                        <span className="font-medium text-red-600">Reason:</span>{' '}
                        {event.flaggedReason}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Flagged by: {event.flaggedByName}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openUnflagModal(event._id, event.title)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer',
                        'bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors'
                      )}
                    >
                      <CheckCircle size={16} weight="bold" />
                      Unflag
                    </button>
                    <button
                      onClick={() => openRemoveModal(event._id, event.title)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer',
                        'bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors'
                      )}
                    >
                      <Trash size={16} weight="bold" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Unflag Modal */}
      <Dialog open={showUnflagModal} onOpenChange={setShowUnflagModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle size={20} weight="duotone" className="text-green-600" />
              </div>
              <DialogTitle>Unflag Event</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to remove the flag from <strong>{selectedEventTitle}</strong>?
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason for unflagging (optional)"
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />

          <DialogFooter>
            <button
              onClick={() => setShowUnflagModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleUnflag}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer',
                'bg-green-500 text-white hover:bg-green-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Unflagging...' : 'Unflag Event'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Modal */}
      <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash size={20} weight="duotone" className="text-red-600" />
              </div>
              <DialogTitle>Remove Event</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to remove <strong>{selectedEventTitle}</strong>? This will
              cancel the event and notify the organizer.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Reason for removal (required)"
            rows={3}
            className={cn(
              'w-full px-3 py-2 rounded-lg border border-border bg-background',
              'text-sm placeholder:text-muted-foreground resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
          />

          <DialogFooter>
            <button
              onClick={() => setShowRemoveModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={isLoading || !actionReason.trim()}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer',
                'bg-red-500 text-white hover:bg-red-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Removing...' : 'Remove Event'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
