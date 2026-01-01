import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CircleNotch, UserPlus, EnvelopeSimple } from '@phosphor-icons/react'

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: Id<'organizations'>
  organizationName: string
}

const ROLES = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Can manage members, settings, and all content',
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Can manage events, vendors, and sponsors',
  },
  {
    id: 'member',
    name: 'Member',
    description: 'Can view and participate in events',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to organization content',
  },
] as const

type Role = (typeof ROLES)[number]['id']

export function InviteMemberModal({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}: InviteMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'member' as Role,
    message: '',
  })

  const inviteMember = useMutation(api.organizations.inviteMember)

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email.trim()) {
      toast.error('Email address is required')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      await inviteMember({
        organizationId,
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        message: formData.message.trim() || undefined,
      })

      toast.success(`Invitation sent to ${formData.email}`)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      role: 'member',
      message: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <UserPlus size={24} className="text-primary" weight="duotone" />
            </div>
            <div>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Invite someone to join <strong>{organizationName}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <EnvelopeSimple
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="colleague@example.com"
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <div className="space-y-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => updateField('role', role.id)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all',
                    formData.role === role.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium text-sm">{role.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{role.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Add a personal note to the invitation email..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
