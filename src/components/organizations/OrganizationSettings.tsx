import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CircleNotch, FloppyDisk, Trash, Warning, Buildings } from '@phosphor-icons/react'

interface OrganizationSettingsProps {
  organizationId: Id<'organizations'>
  isOwner: boolean
}

export function OrganizationSettings({ organizationId, isOwner }: OrganizationSettingsProps) {
  const organization = useQuery(api.organizations.get, { id: organizationId })
  const updateOrganization = useMutation(api.organizations.update)
  const deleteOrganization = useMutation(api.organizations.deleteOrg)

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    settings: {
      defaultEventVisibility: 'private',
      requireEventApproval: false,
      allowMemberInvites: true,
      notifyOnNewMember: true,
      notifyOnNewEvent: true,
    },
  })

  // Initialize form data when organization loads
  useState(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        description: organization.description || '',
        website: organization.website || '',
        settings: {
          defaultEventVisibility: organization.settings?.defaultEventVisibility || 'private',
          requireEventApproval: organization.settings?.requireEventApproval || false,
          allowMemberInvites: organization.settings?.allowMemberInvites ?? true,
          notifyOnNewMember: organization.settings?.notifyOnNewMember ?? true,
          notifyOnNewEvent: organization.settings?.notifyOnNewEvent ?? true,
        },
      })
    }
  })

  const updateField = (field: keyof typeof formData, value: string | typeof formData.settings) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateSetting = (key: keyof typeof formData.settings, value: boolean | string) => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [key]: value },
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Organization name is required')
      return
    }

    setIsSaving(true)

    try {
      await updateOrganization({
        id: organizationId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        website: formData.website.trim() || undefined,
        settings: {
          defaultEventVisibility: formData.settings.defaultEventVisibility,
          requireEventApproval: formData.settings.requireEventApproval,
          allowMemberInvites: formData.settings.allowMemberInvites,
          notifyOnNewMember: formData.settings.notifyOnNewMember,
          notifyOnNewEvent: formData.settings.notifyOnNewEvent,
        },
      })

      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmation !== organization?.name) {
      toast.error('Please type the organization name to confirm')
      return
    }

    setIsDeleting(true)

    try {
      await deleteOrganization({ id: organizationId })
      toast.success('Organization deleted')
      // Navigation should be handled by parent component
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center py-8">
        <CircleNotch size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* General Settings */}
      <section className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Buildings size={18} weight="duotone" />
          General Settings
        </h3>

        <div className="space-y-4 p-4 rounded-lg border border-border">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={formData.name || organization.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Organization name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || organization.description || ''}
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
              value={formData.website || organization.website || ''}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </section>

      {/* Event Settings */}
      <section className="space-y-4">
        <h3 className="font-semibold">Event Settings</h3>

        <div className="space-y-4 p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Event Approval</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Events must be approved by an admin before publishing
              </p>
            </div>
            <Switch
              checked={formData.settings.requireEventApproval}
              onCheckedChange={(checked) => updateSetting('requireEventApproval', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Default Event Visibility</Label>
            <div className="flex gap-2">
              {['public', 'private', 'team'].map((visibility) => (
                <button
                  key={visibility}
                  type="button"
                  onClick={() => updateSetting('defaultEventVisibility', visibility)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                    formData.settings.defaultEventVisibility === visibility
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Settings */}
      <section className="space-y-4">
        <h3 className="font-semibold">Team Settings</h3>

        <div className="space-y-4 p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Member Invites</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Members can invite others to join (subject to admin approval)
              </p>
            </div>
            <Switch
              checked={formData.settings.allowMemberInvites}
              onCheckedChange={(checked) => updateSetting('allowMemberInvites', checked)}
            />
          </div>
        </div>
      </section>

      {/* Notification Settings */}
      <section className="space-y-4">
        <h3 className="font-semibold">Notifications</h3>

        <div className="space-y-4 p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <div>
              <Label>New Member Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Notify admins when new members join
              </p>
            </div>
            <Switch
              checked={formData.settings.notifyOnNewMember}
              onCheckedChange={(checked) => updateSetting('notifyOnNewMember', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>New Event Notifications</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Notify members when new events are created
              </p>
            </div>
            <Switch
              checked={formData.settings.notifyOnNewEvent}
              onCheckedChange={(checked) => updateSetting('notifyOnNewEvent', checked)}
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <CircleNotch size={16} weight="bold" className="animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <FloppyDisk size={16} weight="duotone" className="mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <section className="space-y-4 pt-8 border-t border-border">
          <h3 className="font-semibold text-destructive flex items-center gap-2">
            <Warning size={18} weight="duotone" />
            Danger Zone
          </h3>

          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Organization</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Permanently delete this organization and all its data
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash size={16} className="mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <Warning size={20} weight="fill" />
                      Delete Organization
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        This action cannot be undone. This will permanently delete{' '}
                        <strong>{organization.name}</strong> and all associated data including:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>All team members</li>
                        <li>All pending invitations</li>
                        <li>All organization settings</li>
                      </ul>
                      <div className="pt-2">
                        <Label htmlFor="confirm">
                          Type <strong>{organization.name}</strong> to confirm:
                        </Label>
                        <Input
                          id="confirm"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder={organization.name}
                          className="mt-2"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleteConfirmation !== organization.name || isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <CircleNotch size={16} className="animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash size={16} className="mr-2" />
                          Delete Organization
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
