import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
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
import { CircleNotch, Buildings } from '@phosphor-icons/react'

interface CreateOrganizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (organizationId: string, slug: string) => void
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Up to 5 members, 3 events',
    price: '$0',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Up to 20 members, 20 events',
    price: '$29/mo',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Up to 100 members, unlimited events',
    price: '$99/mo',
  },
] as const

type Plan = (typeof PLANS)[number]['id']

export function CreateOrganizationModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    plan: 'free' as Plan,
  })

  const createOrganization = useMutation(api.organizations.create)

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Organization name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createOrganization({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        website: formData.website.trim() || undefined,
        plan: formData.plan,
      })

      toast.success('Organization created successfully')
      onOpenChange(false)
      resetForm()

      if (onSuccess) {
        onSuccess(result.organizationId, result.slug)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create organization')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      website: '',
      plan: 'free',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Buildings size={24} className="text-primary" weight="duotone" />
            </div>
            <div>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Set up a new workspace for your team to collaborate on events.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Organization Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Acme Events Co."
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="A brief description of your organization..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => updateField('plan', plan.id)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    formData.plan === plan.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium text-sm">{plan.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{plan.description}</div>
                  <div className="text-xs font-medium text-primary mt-1">{plan.price}</div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
