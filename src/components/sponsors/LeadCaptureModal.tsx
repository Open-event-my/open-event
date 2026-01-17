import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  MapPin,
  Fire,
  Sun,
  Snowflake,
} from '@phosphor-icons/react'

interface LeadCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventSponsorId: Id<'eventSponsors'>
  sponsorName: string
  onSuccess?: () => void
}

type InterestLevel = 'hot' | 'warm' | 'cold'
type CaptureMethod = 'booth_scan' | 'form' | 'manual' | 'badge_scan'

export function LeadCaptureModal({
  open,
  onOpenChange,
  eventSponsorId,
  sponsorName,
  onSuccess,
}: LeadCaptureModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    captureMethod: 'manual' as CaptureMethod,
    captureLocation: '',
    notes: '',
    interestLevel: undefined as InterestLevel | undefined,
  })

  const captureLead = useMutation(api.sponsorLeads.capture)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await captureLead({
        eventSponsorId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        jobTitle: formData.jobTitle || undefined,
        captureMethod: formData.captureMethod,
        captureLocation: formData.captureLocation || undefined,
        notes: formData.notes || undefined,
        interestLevel: formData.interestLevel,
      })

      toast.success('Lead captured successfully')
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to capture lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      captureMethod: 'manual',
      captureLocation: '',
      notes: '',
      interestLevel: undefined,
    })
  }

  const updateField = (field: keyof typeof formData, value: string | InterestLevel | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={20} weight="duotone" />
            Capture Lead for {sponsorName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Email (Required) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1.5">
                <User size={14} />
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Envelope size={14} />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@company.com"
                required
              />
            </div>
          </div>

          {/* Phone & Company */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone size={14} />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-1.5">
                <Buildings size={14} />
                Company
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
          </div>

          {/* Job Title & Capture Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="flex items-center gap-1.5">
                <Briefcase size={14} />
                Job Title
              </Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => updateField('jobTitle', e.target.value)}
                placeholder="Marketing Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="captureLocation" className="flex items-center gap-1.5">
                <MapPin size={14} />
                Where Met
              </Label>
              <Input
                id="captureLocation"
                value={formData.captureLocation}
                onChange={(e) => updateField('captureLocation', e.target.value)}
                placeholder="Booth, Session, Networking"
              />
            </div>
          </div>

          {/* Capture Method */}
          <div className="space-y-2">
            <Label>Capture Method</Label>
            <Select
              value={formData.captureMethod}
              onValueChange={(value) => updateField('captureMethod', value as CaptureMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="booth_scan">Booth QR Scan</SelectItem>
                <SelectItem value="badge_scan">Badge Scan</SelectItem>
                <SelectItem value="form">Sign-up Form</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interest Level */}
          <div className="space-y-2">
            <Label>Interest Level</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.interestLevel === 'hot' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  updateField('interestLevel', formData.interestLevel === 'hot' ? undefined : 'hot')
                }
                className="flex-1"
              >
                <Fire size={16} className="mr-1.5 text-red-500" />
                Hot
              </Button>
              <Button
                type="button"
                variant={formData.interestLevel === 'warm' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  updateField(
                    'interestLevel',
                    formData.interestLevel === 'warm' ? undefined : 'warm'
                  )
                }
                className="flex-1"
              >
                <Sun size={16} className="mr-1.5 text-amber-500" />
                Warm
              </Button>
              <Button
                type="button"
                variant={formData.interestLevel === 'cold' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  updateField(
                    'interestLevel',
                    formData.interestLevel === 'cold' ? undefined : 'cold'
                  )
                }
                className="flex-1"
              >
                <Snowflake size={16} className="mr-1.5 text-blue-500" />
                Cold
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional notes about this lead..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Capturing...' : 'Capture Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
