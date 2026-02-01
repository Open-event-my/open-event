/**
 * Event Attendees Page
 * Manage attendees for an event - list, add, check-in, import
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  MagnifyingGlass,
  Plus,
  DownloadSimple,
  UploadSimple,
  QrCode,
  CheckCircle,
  XCircle,
  Clock,
  Warning,
  User,
  Envelope,
  Phone,
  Buildings,
  DotsThreeVertical,
  Trash,
  PencilSimple,
  ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { AddAttendeeModal, ImportCSVModal } from '@/components/attendees'

type AttendeeStatus = 'registered' | 'confirmed' | 'checked_in' | 'cancelled' | 'no_show'

const statusConfig: Record<
  AttendeeStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  registered: {
    label: 'Registered',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  checked_in: {
    label: 'Checked In',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
  no_show: {
    label: 'No Show',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Warning,
  },
}

export function EventAttendeesPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')
  const attendeesData = useQuery(
    api.attendees.getByEvent,
    eventId
      ? {
          eventId: eventId as Id<'events'>,
          search,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }
      : 'skip'
  )
  const stats = useQuery(
    api.attendees.getStats,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const checkIn = useMutation(api.attendees.checkIn)
  const undoCheckIn = useMutation(api.attendees.undoCheckIn)
  const cancelAttendee = useMutation(api.attendees.cancel)
  const removeAttendee = useMutation(api.attendees.remove)

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const handleCheckIn = async (attendeeId: Id<'attendees'>) => {
    try {
      const result = await checkIn({ id: attendeeId, method: 'manual' })
      if (result.success) {
        toast.success('Attendee checked in successfully')
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Failed to check in attendee')
    }
  }

  const handleUndoCheckIn = async (attendeeId: Id<'attendees'>) => {
    try {
      await undoCheckIn({ id: attendeeId })
      toast.success('Check-in undone')
    } catch {
      toast.error('Failed to undo check-in')
    }
  }

  const handleCancel = async (attendeeId: Id<'attendees'>) => {
    if (!confirm('Are you sure you want to cancel this registration?')) return
    try {
      await cancelAttendee({ id: attendeeId })
      toast.success('Registration cancelled')
    } catch {
      toast.error('Failed to cancel registration')
    }
  }

  const handleRemove = async (attendeeId: Id<'attendees'>) => {
    if (!confirm('Are you sure you want to remove this attendee? This cannot be undone.')) return
    try {
      await removeAttendee({ id: attendeeId })
      toast.success('Attendee removed')
    } catch {
      toast.error('Failed to remove attendee')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/dashboard/events/${eventId}`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Attendees</h1>
            <p className="text-muted-foreground text-sm">{event.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/dashboard/events/${eventId}/attendees/check-in`}>
            <Button variant="outline" size="sm">
              <QrCode size={16} className="mr-2" />
              Check-in Mode
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
            <UploadSimple size={16} className="mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm">
            <DownloadSimple size={16} className="mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} className="mr-2" />
            Add Attendee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.registered}</div>
            <div className="text-sm text-muted-foreground">Registered</div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-sm text-muted-foreground">Confirmed</div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.checkedIn}</div>
            <div className="text-sm text-muted-foreground">Checked In</div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-muted-foreground">Cancelled</div>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="text-2xl font-bold text-primary">{stats.checkInRate}%</div>
            <div className="text-sm text-muted-foreground">Check-in Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            placeholder="Search by name, email, or ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'registered', 'confirmed', 'checked_in', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {status === 'all'
                ? 'All'
                : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Attendee List */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Attendee</th>
                <th className="text-left p-4 font-medium text-sm">Contact</th>
                <th className="text-left p-4 font-medium text-sm">Ticket</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-left p-4 font-medium text-sm">Registered</th>
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attendeesData?.attendees.map((attendee) => {
                const status = statusConfig[attendee.status as AttendeeStatus]
                const StatusIcon = status?.icon || Clock
                return (
                  <tr key={attendee._id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User size={18} className="text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{attendee.name}</div>
                          {attendee.organization && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Buildings size={12} />
                              {attendee.organization}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Envelope size={14} className="text-muted-foreground" />
                          {attendee.email}
                        </div>
                        {attendee.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone size={14} />
                            {attendee.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">
                          {attendee.ticketNumber}
                        </div>
                        <div className="text-muted-foreground mt-1">{attendee.ticketType}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          status?.color
                        )}
                      >
                        <StatusIcon size={12} weight="bold" />
                        {status?.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(attendee.registeredAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                            <DotsThreeVertical size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {attendee.status !== 'checked_in' && attendee.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={() => handleCheckIn(attendee._id)}>
                              <CheckCircle size={16} className="mr-2" />
                              Check In
                            </DropdownMenuItem>
                          )}
                          {attendee.status === 'checked_in' && (
                            <DropdownMenuItem onClick={() => handleUndoCheckIn(attendee._id)}>
                              <ArrowCounterClockwise size={16} className="mr-2" />
                              Undo Check-in
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <PencilSimple size={16} className="mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {attendee.status !== 'cancelled' && (
                            <DropdownMenuItem
                              onClick={() => handleCancel(attendee._id)}
                              className="text-amber-600"
                            >
                              <XCircle size={16} className="mr-2" />
                              Cancel Registration
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemove(attendee._id)}
                            className="text-red-600"
                          >
                            <Trash size={16} className="mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {attendeesData?.attendees.length === 0 && (
          <div className="p-12 text-center">
            <User size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No attendees yet</h3>
            <p className="text-muted-foreground mb-4">
              Start adding attendees manually or import from a CSV file.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                <UploadSimple size={16} className="mr-2" />
                Import CSV
              </Button>
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus size={16} className="mr-2" />
                Add Attendee
              </Button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {attendeesData && attendeesData.total > 50 && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {attendeesData.attendees.length} of {attendeesData.total} attendees
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!attendeesData.hasMore}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Attendee Modal */}
      <AddAttendeeModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        eventId={eventId as Id<'events'>}
      />

      {/* Import CSV Modal */}
      <ImportCSVModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        eventId={eventId as Id<'events'>}
      />
    </div>
  )
}
