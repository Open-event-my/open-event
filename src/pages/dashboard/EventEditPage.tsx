import { Link, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  CurrencyDollar,
  Clock,
  FloppyDisk,
  X,
  Warning,
  CheckCircle,
  Buildings,
  Globe,
  VideoCamera,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const eventTypes = [
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'networking', label: 'Networking' },
  { value: 'launch', label: 'Product Launch' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'other', label: 'Other' },
]

const eventStatuses = [
  { value: 'draft', label: 'Draft', color: 'text-zinc-500' },
  { value: 'planning', label: 'Planning', color: 'text-amber-500' },
  { value: 'active', label: 'Active', color: 'text-emerald-500' },
  { value: 'completed', label: 'Completed', color: 'text-blue-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-500' },
]

const locationTypes = [
  { value: 'in-person', label: 'In-Person', icon: MapPin },
  { value: 'virtual', label: 'Virtual', icon: VideoCamera },
  { value: 'hybrid', label: 'Hybrid', icon: Globe },
]

interface FormData {
  title: string
  description: string
  eventType: string
  status: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timezone: string
  locationType: string
  venueName: string
  venueAddress: string
  virtualPlatform: string
  expectedAttendees: string
  budget: string
  budgetCurrency: string
  requirements: {
    catering: boolean
    av: boolean
    photography: boolean
    security: boolean
    transportation: boolean
    decoration: boolean
  }
}

// Helper to format timestamp to date string (YYYY-MM-DD)
function formatDateForInput(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toISOString().split('T')[0]
}

// Helper to format timestamp to time string (HH:MM)
function formatTimeForInput(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toTimeString().slice(0, 5)
}

// Helper to combine date and time strings into timestamp
function combineDateTimeToTimestamp(dateStr: string, timeStr: string): number {
  const dateTime = new Date(`${dateStr}T${timeStr}:00`)
  return dateTime.getTime()
}

export function EventEditPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')

  const updateEvent = useMutation(api.events.update)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    eventType: '',
    status: 'draft',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locationType: 'in-person',
    venueName: '',
    venueAddress: '',
    virtualPlatform: '',
    expectedAttendees: '',
    budget: '',
    budgetCurrency: 'USD',
    requirements: {
      catering: false,
      av: false,
      photography: false,
      security: false,
      transportation: false,
      decoration: false,
    },
  })

  // Populate form when event data loads
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        eventType: event.eventType || '',
        status: event.status || 'draft',
        startDate: formatDateForInput(event.startDate),
        startTime: formatTimeForInput(event.startDate),
        endDate: event.endDate ? formatDateForInput(event.endDate) : '',
        endTime: event.endDate ? formatTimeForInput(event.endDate) : '17:00',
        timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        locationType: event.locationType || 'in-person',
        venueName: event.venueName || '',
        venueAddress: event.venueAddress || '',
        virtualPlatform: event.virtualPlatform || '',
        expectedAttendees: event.expectedAttendees?.toString() || '',
        budget: event.budget?.toString() || '',
        budgetCurrency: event.budgetCurrency || 'USD',
        requirements: {
          catering: event.requirements?.catering || false,
          av: event.requirements?.av || false,
          photography: event.requirements?.photography || false,
          security: event.requirements?.security || false,
          transportation: event.requirements?.transportation || false,
          decoration: event.requirements?.decoration || false,
        },
      })
    }
  }, [event])

  const handleChange = (field: string, value: string | boolean) => {
    setHasChanges(true)
    if (field.startsWith('requirements.')) {
      const reqField = field.split('.')[1] as keyof FormData['requirements']
      setFormData((prev) => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          [reqField]: value,
        },
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const handleSave = async () => {
    if (!eventId) return

    // Validate required fields
    if (!formData.title.trim()) {
      toast.error('Event title is required')
      return
    }
    if (!formData.startDate) {
      toast.error('Start date is required')
      return
    }

    setIsSaving(true)
    try {
      const startTimestamp = combineDateTimeToTimestamp(formData.startDate, formData.startTime)
      const endTimestamp = formData.endDate
        ? combineDateTimeToTimestamp(formData.endDate, formData.endTime)
        : undefined

      await updateEvent({
        id: eventId as Id<'events'>,
        title: formData.title,
        description: formData.description || undefined,
        eventType: formData.eventType || undefined,
        status: formData.status,
        startDate: startTimestamp,
        endDate: endTimestamp,
        timezone: formData.timezone || undefined,
        locationType: formData.locationType || undefined,
        venueName: formData.venueName || undefined,
        venueAddress: formData.venueAddress || undefined,
        virtualPlatform: formData.virtualPlatform || undefined,
        expectedAttendees: formData.expectedAttendees
          ? parseInt(formData.expectedAttendees)
          : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        budgetCurrency: formData.budgetCurrency || undefined,
      })

      toast.success('Event updated successfully')
      setHasChanges(false)
      navigate(`/dashboard/events/${eventId}`)
    } catch {
      toast.error('Failed to update event')
    } finally {
      setIsSaving(false)
    }
  }

  // Loading state
  if (event === undefined) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-1/3" />
        </div>
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="h-6 bg-muted rounded w-1/4 mb-4" />
          <div className="h-10 bg-muted rounded w-full mb-4" />
          <div className="h-24 bg-muted rounded w-full" />
        </div>
      </div>
    )
  }

  // Not found state
  if (event === null) {
    return (
      <div className="text-center py-16">
        <Warning size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
        <h2 className="text-xl font-semibold mb-2">Event not found</h2>
        <p className="text-muted-foreground mb-6">
          The event you're trying to edit doesn't exist or has been deleted.
        </p>
        <Link
          to="/dashboard/events"
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-primary text-primary-foreground font-medium text-sm',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <ArrowLeft size={18} weight="bold" />
          Back to Events
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/dashboard/events/${eventId}`}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} weight="bold" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">Edit Event</h1>
            <p className="text-sm text-muted-foreground">{event.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/dashboard/events/${eventId}`}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            <X size={16} weight="bold" />
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <FloppyDisk size={16} weight="bold" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-6 flex items-center gap-2">
            <Calendar size={18} weight="duotone" className="text-primary" />
            Basic Information
          </h2>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Annual Tech Conference 2024"
                  className="mt-1.5"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe your event..."
                  rows={4}
                  className="mt-1.5 resize-none"
                />
              </div>

              <div>
                <Label>Event Type</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => handleChange('eventType', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <span className={status.color}>{status.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-6 flex items-center gap-2">
            <Clock size={18} weight="duotone" className="text-primary" />
            Date & Time
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                min={formData.startDate}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                placeholder="e.g., America/New_York"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-detected from your browser</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-6 flex items-center gap-2">
            <MapPin size={18} weight="duotone" className="text-primary" />
            Location
          </h2>

          <div className="space-y-6">
            {/* Location Type Toggle */}
            <div>
              <Label className="mb-3 block">Location Type</Label>
              <div className="flex flex-wrap gap-2">
                {locationTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = formData.locationType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange('locationType', type.value)}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <Icon size={16} weight={isSelected ? 'fill' : 'regular'} />
                      {type.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* In-Person Fields */}
            {(formData.locationType === 'in-person' || formData.locationType === 'hybrid') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="venueName">Venue Name</Label>
                  <Input
                    id="venueName"
                    value={formData.venueName}
                    onChange={(e) => handleChange('venueName', e.target.value)}
                    placeholder="e.g., Convention Center"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="venueAddress">Venue Address</Label>
                  <Input
                    id="venueAddress"
                    value={formData.venueAddress}
                    onChange={(e) => handleChange('venueAddress', e.target.value)}
                    placeholder="e.g., 123 Main St, City"
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            {/* Virtual Fields */}
            {(formData.locationType === 'virtual' || formData.locationType === 'hybrid') && (
              <div>
                <Label htmlFor="virtualPlatform">Virtual Platform</Label>
                <Input
                  id="virtualPlatform"
                  value={formData.virtualPlatform}
                  onChange={(e) => handleChange('virtualPlatform', e.target.value)}
                  placeholder="e.g., Zoom, Google Meet, Microsoft Teams"
                  className="mt-1.5"
                />
              </div>
            )}
          </div>
        </div>

        {/* Budget & Attendees */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-6 flex items-center gap-2">
            <CurrencyDollar size={18} weight="duotone" className="text-primary" />
            Budget & Scale
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="expectedAttendees">Expected Attendees</Label>
              <div className="relative mt-1.5">
                <Users
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="expectedAttendees"
                  type="number"
                  value={formData.expectedAttendees}
                  onChange={(e) => handleChange('expectedAttendees', e.target.value)}
                  placeholder="e.g., 200"
                  min="1"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="budget">Budget</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <CurrencyDollar
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="budget"
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleChange('budget', e.target.value)}
                    placeholder="e.g., 10000"
                    min="0"
                    step="100"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={formData.budgetCurrency}
                  onValueChange={(value) => handleChange('budgetCurrency', value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="MYR">MYR</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-6 flex items-center gap-2">
            <CheckCircle size={18} weight="duotone" className="text-primary" />
            Event Requirements
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Select the services you'll need for this event
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: 'catering', label: 'Catering', icon: '🍽️', desc: 'Food & beverages' },
              { key: 'av', label: 'AV Equipment', icon: '🎤', desc: 'Audio/visual setup' },
              { key: 'photography', label: 'Photography', icon: '📸', desc: 'Photo & video' },
              { key: 'security', label: 'Security', icon: '🔒', desc: 'Event security' },
              {
                key: 'transportation',
                label: 'Transportation',
                icon: '🚗',
                desc: 'Guest transport',
              },
              { key: 'decoration', label: 'Decoration', icon: '🎨', desc: 'Venue styling' },
            ].map((req) => (
              <div
                key={req.key}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border transition-colors',
                  formData.requirements[req.key as keyof FormData['requirements']]
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{req.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{req.label}</p>
                    <p className="text-xs text-muted-foreground">{req.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={formData.requirements[req.key as keyof FormData['requirements']]}
                  onCheckedChange={(checked) => handleChange(`requirements.${req.key}`, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Vendors & Sponsors Info */}
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Buildings size={20} weight="duotone" className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Vendors & Sponsors</h3>
              <p className="text-sm text-muted-foreground mt-1">
                To add vendors or sponsors to this event, use the{' '}
                <Link to="/dashboard/events/new" className="text-primary hover:underline">
                  AI Assistant
                </Link>{' '}
                or browse the{' '}
                <Link to="/dashboard/vendors" className="text-primary hover:underline">
                  Vendors
                </Link>{' '}
                and{' '}
                <Link to="/dashboard/sponsors" className="text-primary hover:underline">
                  Sponsors
                </Link>{' '}
                pages.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border sm:hidden">
        <div className="flex gap-2">
          <Link
            to={`/dashboard/events/${eventId}`}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'border border-border text-sm font-medium',
              'hover:bg-muted transition-colors'
            )}
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Bottom Spacer for Mobile */}
      <div className="h-20 sm:hidden" />
    </div>
  )
}
