/**
 * Add Attendee Modal
 * Form for manually adding attendees to an event
 */

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import {
  User,
  Envelope,
  Phone,
  Buildings,
  Briefcase,
  Cookie,
  Wheelchair,
  Note,
} from '@phosphor-icons/react'

interface AddAttendeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: Id<'events'>
  ticketTypes?: string[]
  onSuccess?: () => void
}

interface FormData {
  name: string
  email: string
  phone: string
  organization: string
  jobTitle: string
  ticketType: string
  dietaryRestrictions: string
  accessibilityNeeds: string
  specialRequests: string
  notes: string
}

const initialFormData: FormData = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  jobTitle: '',
  ticketType: 'general',
  dietaryRestrictions: '',
  accessibilityNeeds: '',
  specialRequests: '',
  notes: '',
}

export function AddAttendeeModal({
  open,
  onOpenChange,
  eventId,
  ticketTypes = ['General Admission', 'VIP', 'Early Bird', 'Student'],
  onSuccess,
}: AddAttendeeModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createAttendee = useMutation(api.attendees.create)

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.phone && !/^[+]?[\d\s()-]{7,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)
    try {
      await createAttendee({
        eventId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        organization: formData.organization.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
        ticketType: formData.ticketType || undefined,
        dietaryRestrictions: formData.dietaryRestrictions.trim() || undefined,
        accessibilityNeeds: formData.accessibilityNeeds.trim() || undefined,
        specialRequests: formData.specialRequests.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      })

      toast.success('Attendee added successfully')
      setFormData(initialFormData)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add attendee'
      if (message.includes('already registered')) {
        setErrors({ email: 'This email is already registered for this event' })
      } else {
        toast.error(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Attendee</DialogTitle>
          <DialogDescription>Manually register a new attendee for this event.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Required Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User size={14} />
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="John Doe"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Envelope size={14} />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Contact & Organization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone size={14} />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
              {errors.phone && (
                <p id="phone-error" role="alert" className="text-sm text-destructive">
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketType" className="flex items-center gap-2">
                Ticket Type
              </Label>
              <Select
                value={formData.ticketType}
                onValueChange={(value) => updateField('ticketType', value)}
              >
                <SelectTrigger id="ticketType">
                  <SelectValue placeholder="Select ticket type" />
                </SelectTrigger>
                <SelectContent>
                  {ticketTypes.map((type) => (
                    <SelectItem key={type} value={type.toLowerCase().replace(/\s+/g, '_')}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization" className="flex items-center gap-2">
                <Buildings size={14} />
                Organization
              </Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => updateField('organization', e.target.value)}
                placeholder="Company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="flex items-center gap-2">
                <Briefcase size={14} />
                Job Title
              </Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => updateField('jobTitle', e.target.value)}
                placeholder="Software Engineer"
              />
            </div>
          </div>

          {/* Special Requirements */}
          <div className="space-y-4 pt-2 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Special Requirements</h4>

            <div className="space-y-2">
              <Label htmlFor="dietaryRestrictions" className="flex items-center gap-2">
                <Cookie size={14} />
                Dietary Restrictions
              </Label>
              <Input
                id="dietaryRestrictions"
                value={formData.dietaryRestrictions}
                onChange={(e) => updateField('dietaryRestrictions', e.target.value)}
                placeholder="Vegetarian, Gluten-free, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessibilityNeeds" className="flex items-center gap-2">
                <Wheelchair size={14} />
                Accessibility Needs
              </Label>
              <Input
                id="accessibilityNeeds"
                value={formData.accessibilityNeeds}
                onChange={(e) => updateField('accessibilityNeeds', e.target.value)}
                placeholder="Wheelchair access, sign language interpreter, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialRequests" className="flex items-center gap-2">
                Special Requests
              </Label>
              <Textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => updateField('specialRequests', e.target.value)}
                placeholder="Any special requests or requirements..."
                rows={2}
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <Note size={14} />
              Internal Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notes visible only to organizers..."
              rows={2}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Attendee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
