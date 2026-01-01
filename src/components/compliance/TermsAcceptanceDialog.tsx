/**
 * Terms Acceptance Dialog Component
 *
 * NOTE: Backend compliance module not yet integrated. This is a placeholder UI.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

interface TermsAcceptanceDialogProps {
  open: boolean
  onAccept: () => void
  onDecline?: () => void
  version: string
  canClose?: boolean
}

export function TermsAcceptanceDialog({
  open,
  onAccept,
  version,
  canClose = false,
}: TermsAcceptanceDialogProps) {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  // Version is passed for future use (e.g., displaying version-specific terms)
  void version

  const handleAccept = async () => {
    if (!accepted) {
      toast.error('Please accept the terms to continue')
      return
    }

    setLoading(true)
    try {
      // TODO: Implement when backend compliance module is integrated
      toast.success('Terms accepted')
      onAccept()
    } catch (error) {
      console.error('Failed to accept terms:', error)
      toast.error('Failed to accept terms. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={canClose ? undefined : () => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>
            Please read and accept our terms of service to continue.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4 text-sm">
            <p>By using Open Event, you agree to these terms.</p>
          </div>
        </ScrollArea>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="accept"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor="accept">I accept the Terms of Service</Label>
        </div>
        <DialogFooter>
          <Button onClick={handleAccept} disabled={!accepted || loading}>
            {loading ? 'Accepting...' : 'Accept'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
