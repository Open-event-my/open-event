import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DemoPlayer } from './DemoPlayer'

interface DemoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoModal({ open, onOpenChange }: DemoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[calc(100vw-2rem)] h-[calc(100vh-4rem)] max-h-[640px] p-0 gap-0 overflow-hidden"
        showCloseButton={true}
      >
        <DemoPlayer onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
