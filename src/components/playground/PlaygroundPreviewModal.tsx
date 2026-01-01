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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  CalendarBlank,
  MapPin,
  Users,
  CurrencyDollar,
  CheckSquare,
  Flag,
  Note,
  Warning,
  Lightbulb,
  Spinner,
} from '@phosphor-icons/react'
import type { EnhancedPlaygroundData } from '../../../convex/lib/ai/enhancePlaygroundData'
import type { ProximityLinks } from '@/lib/playground/proximity'
import { cn } from '@/lib/utils'

interface PlaygroundPreviewModalProps {
  isOpen: boolean
  isProcessing: boolean
  data: EnhancedPlaygroundData | null
  proximityLinks: ProximityLinks | null
  onConfirm: (data: EnhancedPlaygroundData, links: ProximityLinks) => void
  onCancel: () => void
}

export function PlaygroundPreviewModal({
  isOpen,
  isProcessing,
  data,
  proximityLinks,
  onConfirm,
  onCancel,
}: PlaygroundPreviewModalProps) {
  const [editedData, setEditedData] = useState<EnhancedPlaygroundData | null>(data)

  // Update edited data when props change
  if (data && editedData !== data) {
    setEditedData(data)
  }

  if (!data || !proximityLinks || !editedData) {
    return null
  }

  const handleConfirm = () => {
    onConfirm(editedData, proximityLinks)
  }

  // Group tasks and budgets by event
  const tasksByEvent = new Map<string, typeof data.taskCards>()
  const budgetsByEvent = new Map<string, typeof data.budgetCards>()

  data.taskCards.forEach((task) => {
    const eventId = proximityLinks.taskToEvent.get(task.id)
    if (eventId) {
      if (!tasksByEvent.has(eventId)) {
        tasksByEvent.set(eventId, [])
      }
      tasksByEvent.get(eventId)!.push(task)
    }
  })

  data.budgetCards.forEach((budget) => {
    const eventId = proximityLinks.budgetToEvent.get(budget.id)
    if (eventId) {
      if (!budgetsByEvent.has(eventId)) {
        budgetsByEvent.set(eventId, [])
      }
      budgetsByEvent.get(eventId)!.push(budget)
    }
  })

  // Calculate totals
  const totalAttendees = data.eventCards.reduce((sum, e) => sum + (e.expectedAttendees || 0), 0)
  const totalEstimated = data.budgetCards.reduce((sum, b) => sum + b.estimatedAmount, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-mono text-2xl">Preview Finalization</DialogTitle>
          <DialogDescription>
            Review what will be created. All items will be saved to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Warnings Section */}
            {data.warnings.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Warning size={16} weight="duotone" className="text-amber-500" />
                  Validation Warnings ({data.warnings.length})
                </h3>
                <div className="space-y-2">
                  {data.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs">
                          {warning.cardType}
                        </Badge>
                        <p className="text-muted-foreground flex-1">{warning.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions Section */}
            {data.suggestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Lightbulb size={16} weight="duotone" className="text-blue-500" />
                  AI Suggestions ({data.suggestions.length})
                </h3>
                <div className="space-y-2">
                  {data.suggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm text-muted-foreground"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Events ({data.eventCards.length})</h3>
                <Badge variant="secondary">{data.eventCards.length} will be created</Badge>
              </div>

              {data.eventCards.map((event) => (
                <div key={event.id} className="p-4 rounded-xl border bg-card space-y-3">
                  {/* Event Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{event.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {event.eventType}
                    </Badge>
                  </div>

                  {/* Event Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {event.startDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarBlank size={14} weight="duotone" />
                        <span>
                          {event.startDate} {event.startTime}
                        </span>
                      </div>
                    )}
                    {event.venueName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin size={14} weight="duotone" />
                        <span className="truncate">{event.venueName}</span>
                      </div>
                    )}
                    {event.expectedAttendees > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users size={14} weight="duotone" />
                        <span>{event.expectedAttendees} attendees</span>
                      </div>
                    )}
                    {event.budget > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CurrencyDollar size={14} weight="duotone" />
                        <span>${event.budget.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Linked Tasks */}
                  {tasksByEvent.get(event.id) && tasksByEvent.get(event.id)!.length > 0 && (
                    <div className="pl-4 border-l-2 border-blue-500/20 space-y-2">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                        <CheckSquare size={12} weight="duotone" />
                        Tasks ({tasksByEvent.get(event.id)!.length})
                      </h5>
                      <div className="space-y-2">
                        {tasksByEvent.get(event.id)!.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px]',
                                task.priority === 'urgent' && 'border-red-500 text-red-500',
                                task.priority === 'high' && 'border-amber-500 text-amber-500',
                                task.priority === 'medium' && 'border-blue-500 text-blue-500'
                              )}
                            >
                              <Flag size={8} weight="duotone" />
                              <span className="ml-1">{task.priority}</span>
                            </Badge>
                            <span className="flex-1">{task.title}</span>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linked Budgets */}
                  {budgetsByEvent.get(event.id) && budgetsByEvent.get(event.id)!.length > 0 && (
                    <div className="pl-4 border-l-2 border-green-500/20 space-y-2">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                        <CurrencyDollar size={12} weight="duotone" />
                        Budgets ({budgetsByEvent.get(event.id)!.length})
                      </h5>
                      <div className="space-y-2">
                        {budgetsByEvent.get(event.id)!.map((budget) => (
                          <div
                            key={budget.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {budget.category}
                              </Badge>
                              <span>{budget.title}</span>
                            </div>
                            <span className="font-semibold">
                              ${budget.estimatedAmount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Notes Section */}
            {data.noteCards.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Notes ({data.noteCards.length})</h3>
                  <Badge variant="secondary">{data.noteCards.length} will be created</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {data.noteCards.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Note size={14} weight="duotone" className="text-muted-foreground" />
                        <h5 className="font-medium text-sm">{note.title}</h5>
                      </div>
                      {note.content && (
                        <p className="text-xs text-muted-foreground line-clamp-3">{note.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Summary Statistics */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Summary</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-purple/5 border border-purple/20">
                  <div className="text-2xl font-bold text-purple">{data.eventCards.length}</div>
                  <div className="text-xs text-muted-foreground">Events</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="text-2xl font-bold text-blue-500">{data.taskCards.length}</div>
                  <div className="text-xs text-muted-foreground">Tasks</div>
                </div>
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-600">
                    ${totalEstimated.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Budget</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="text-2xl font-bold text-amber-600">
                    {totalAttendees.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Attendees</div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Spinner size={16} className="animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                Create {data.eventCards.length} Event{data.eventCards.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
