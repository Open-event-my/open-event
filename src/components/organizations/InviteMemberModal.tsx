import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { PLANS, type PlanKey } from '../../../convex/config/plans'
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
import {
  CircleNotch,
  UserPlus,
  EnvelopeSimple,
  Users,
  Warning,
  RocketLaunch,
} from '@phosphor-icons/react'

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: Id<'organizations'>
  organizationName: string
}

export const ROLES = [
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
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'member' as Role,
    message: '',
  })

  const inviteMember = useMutation(api.organizations.inviteMember)

  // Fetch organization details for plan limits
  const orgDetails = useQuery(api.organizations.get, { id: organizationId })

  // Fetch current members
  const members = useQuery(api.organizations.listMembers, { organizationId })

  // Fetch pending invitations
  const invitations = useQuery(api.organizations.listInvitations, { organizationId })

  // Calculate capacity
  const currentPlanKey = (orgDetails?.plan as PlanKey) || 'free'
  const planConfig = PLANS[currentPlanKey]
  const currentMemberCount = members?.length ?? 0
  const pendingInviteCount = invitations?.length ?? 0
  const totalSeatsUsed = currentMemberCount + pendingInviteCount
  const effectiveLimit = Math.max(orgDetails?.maxMembers ?? 0, planConfig.maxMembers)
  const remainingSeats = effectiveLimit - totalSeatsUsed
  const isAtCapacity = remainingSeats <= 0
  const isNearCapacity = remainingSeats > 0 && remainingSeats <= 2

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

  const handleUpgrade = () => {
    onOpenChange(false)
    navigate('/dashboard/settings?tab=billing')
  }

  // Show limit reached state
  if (isAtCapacity) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10">
                <Warning size={24} className="text-amber-500" weight="duotone" />
              </div>
              <div>
                <DialogTitle>Team Limit Reached</DialogTitle>
                <DialogDescription>
                  <strong>{organizationName}</strong> has reached its member limit
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  Seats Used
                </span>
                <span className="font-mono text-sm font-bold text-amber-600">
                  {totalSeatsUsed} / {effectiveLimit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-full" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentMemberCount} active members + {pendingInviteCount} pending invitations
              </p>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Upgrade to <strong>{currentPlanKey === 'free' ? 'Pro' : 'Business'}</strong> to add
                more team members.
              </p>
              <p className="text-xs text-muted-foreground">
                {currentPlanKey === 'free'
                  ? 'Pro plan includes up to 5 team members'
                  : 'Business plan includes up to 20 team members'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpgrade} className="gap-2">
              <RocketLaunch size={16} weight="duotone" />
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
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

        {/* Capacity indicator */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Users size={14} />
            Seats Used
          </span>
          <span
            className={cn(
              'font-mono text-xs font-medium',
              isNearCapacity ? 'text-amber-600' : 'text-muted-foreground'
            )}
          >
            {totalSeatsUsed} / {effectiveLimit}
            {isNearCapacity && (
              <span className="ml-2 text-amber-600">({remainingSeats} remaining)</span>
            )}
          </span>
        </div>

        {isNearCapacity && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <Warning size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-600">
              You're almost at capacity. Consider{' '}
              <button
                type="button"
                onClick={handleUpgrade}
                className="underline hover:no-underline font-medium"
              >
                upgrading your plan
              </button>{' '}
              for more seats.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
