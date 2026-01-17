import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Handshake } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AddSponsorDialogProps {
  eventId: Id<'events'>
  trigger?: React.ReactNode
}

export function AddSponsorDialog({ eventId, trigger }: AddSponsorDialogProps) {
  const [open, setOpen] = useState(false)
  const sponsors = useQuery(api.sponsors.list, {})
  const addToEvent = useMutation(api.eventSponsors.addToEvent)

  const existingEventSponsors = useQuery(
    api.eventSponsors.listForEvent,
    eventId ? { eventId } : 'skip'
  )

  const existingSponsorIds = new Set(existingEventSponsors?.map((es) => es.sponsorId))

  const handleAdd = async (sponsorId: Id<'sponsors'>) => {
    try {
      await addToEvent({ eventId, sponsorId })
      toast.success('Sponsor added successfully')
      setOpen(false)
    } catch {
      toast.error('Failed to add sponsor')
    }
  }

  const availableSponsors = sponsors?.filter((s) => !existingSponsorIds.has(s._id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" data-testid="add-sponsor-trigger">
            <Plus className="mr-2" /> Add Sponsor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Sponsor to Event</DialogTitle>
          <DialogDescription>
            Select a sponsor from the marketplace to add to your event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {!availableSponsors ? (
            <div className="text-center py-8 text-muted-foreground">Loading sponsors...</div>
          ) : availableSponsors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No available sponsors found.
            </div>
          ) : (
            availableSponsors.map((sponsor) => (
              <div
                key={sponsor._id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Handshake size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{sponsor.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{sponsor.industry}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleAdd(sponsor._id)}>
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
