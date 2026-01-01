import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Calendar,
  MapPin,
  Users,
  CurrencyDollar,
  Clock,
  FloppyDisk,
  X,
  CheckCircle,
  Globe,
  VideoCamera,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'
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

const locationTypes = [
  { value: 'in-person', label: 'In-Person', icon: MapPin },
  { value: 'virtual', label: 'Virtual', icon: VideoCamera },
  { value: 'hybrid', label: 'Hybrid', icon: Globe },
]

interface FormData {
  title: string
  description: string
  eventType: string
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

// Helper to combine date and time strings into timestamp
function combineDateTimeToTimestamp(dateStr: string, timeStr: string): number {
  const dateTime = new Date(`${dateStr}T${timeStr}:00`)
  return dateTime.getTime()
}

interface ManualEventFormProps {
  onSuccess: (eventId: string) => void
  onCancel?: () => void
}

export function ManualEventForm({ onSuccess, onCancel }: ManualEventFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  const createEvent = useMutation(api.events.create)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    eventType: '',
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

  const handleChange = (field: string, value: string | boolean) => {
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

  const handleSubmit = async () => {
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

      const eventId = await createEvent({
        title: formData.title,
        description: formData.description || undefined,
        eventType: formData.eventType || undefined,
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

      toast.success('Event created successfully')
      onSuccess(eventId)
    } catch {
      toast.error('Failed to create event')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono">Create Event</h1>
          <p className="text-sm text-muted-foreground">Fill in the details for your new event</p>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                'border border-border text-sm font-medium',
                'hover:bg-muted transition-colors cursor-pointer'
              )}
            >
              <X size={16} weight="bold" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <FloppyDisk size={16} weight="bold" />
            {isSaving ? 'Creating...' : 'Create Event'}
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
      </div>

      {/* Sticky Save Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border sm:hidden">
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
                'border border-border text-sm font-medium',
                'hover:bg-muted transition-colors cursor-pointer'
              )}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSaving ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>

      {/* Bottom Spacer for Mobile */}
      <div className="h-20 sm:hidden" />
    </div>
  )
}
