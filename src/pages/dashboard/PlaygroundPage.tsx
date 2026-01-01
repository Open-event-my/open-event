import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Editor, TLShapeId } from 'tldraw'
import { useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { PlaygroundCanvas, PlaygroundToolbar } from '@/components/playground'
import { PlaygroundPreviewModal } from '@/components/playground/PlaygroundPreviewModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CalendarBlank,
  CheckSquare,
  CurrencyDollar,
  Note,
  Sparkle,
  Rocket,
} from '@phosphor-icons/react'
import { extractCanvasData, validateCanvasData } from '@/lib/playground/extractor'
import { linkCardsByProximity } from '@/lib/playground/proximity'
import { toast } from 'sonner'
import type { EnhancedPlaygroundData } from '../../../convex/lib/ai/enhancePlaygroundData'
import type { ProximityLinks } from '@/lib/playground/proximity'

export function PlaygroundPage() {
  const navigate = useNavigate()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [, setSelectedShapeIds] = useState<TLShapeId[]>([])
  const [showFinalization, setShowFinalization] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewData, setPreviewData] = useState<EnhancedPlaygroundData | null>(null)
  const [proximityLinks, setProximityLinks] = useState<ProximityLinks | null>(null)

  const finalizePlayground = useAction(api.playground.finalizePlayground)
  const createFromPlayground = useAction(api.playground.createFromPlayground)
  const aiUsage = useQuery(api.aiUsage.getMyUsage)

  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance)
  }, [])

  const handleSelectionChange = useCallback((shapeIds: TLShapeId[]) => {
    setSelectedShapeIds(shapeIds)
  }, [])

  // Count shapes by type
  const getShapeCounts = useCallback(() => {
    if (!editor) return { events: 0, tasks: 0, budgets: 0, notes: 0, total: 0 }

    const shapes = editor.getCurrentPageShapes()
    return {
      events: shapes.filter((s) => s.type === 'event-card').length,
      tasks: shapes.filter((s) => s.type === 'task-card').length,
      budgets: shapes.filter((s) => s.type === 'budget-card').length,
      notes: shapes.filter((s) => s.type === 'note-card').length,
      total: shapes.length,
    }
  }, [editor])

  const counts = getShapeCounts()

  // Handle finalization button click
  const handleFinalize = async () => {
    if (!editor) return

    setIsProcessing(true)

    try {
      // 1. Extract canvas data
      const canvasData = extractCanvasData(editor)

      // 2. Validate - must have at least one event card
      const validation = validateCanvasData(canvasData)
      if (!validation.isValid) {
        toast.error(validation.errors[0] || 'Invalid canvas data')
        return
      }

      // 3. Calculate proximity links
      const links = linkCardsByProximity(
        canvasData.eventCards,
        canvasData.taskCards,
        canvasData.budgetCards,
        canvasData.noteCards
      )
      setProximityLinks(links)

      // 4. Enhance with AI
      toast.info('Enhancing data with AI...')
      const result = await finalizePlayground({
        canvasData: {
          eventCards: canvasData.eventCards,
          taskCards: canvasData.taskCards,
          budgetCards: canvasData.budgetCards,
          noteCards: canvasData.noteCards,
        },
        enhanceWithAI: true,
      })

      if (result) {
        setPreviewData(result)
        setShowFinalization(false)
        setShowPreview(true)
        toast.success('Preview ready!')
      } else {
        toast.error('Failed to process canvas data')
      }
    } catch (error) {
      console.error('Finalization error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process canvas')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle confirmation from preview modal
  const handleConfirmFinalization = async (data: EnhancedPlaygroundData, links: ProximityLinks) => {
    if (!editor) return

    setIsSaving(true)

    try {
      // Convert Maps to plain objects for Convex
      const taskToEventObj: Record<string, string> = {}
      const budgetToEventObj: Record<string, string> = {}
      const noteToEventObj: Record<string, string | null> = {}

      links.taskToEvent.forEach((eventId, taskId) => {
        taskToEventObj[taskId] = eventId
      })
      links.budgetToEvent.forEach((eventId, budgetId) => {
        budgetToEventObj[budgetId] = eventId
      })
      links.noteToEvent.forEach((eventId, noteId) => {
        noteToEventObj[noteId] = eventId
      })

      // Create database entries
      const result = await createFromPlayground({
        eventCards: data.eventCards,
        taskCards: data.taskCards,
        budgetCards: data.budgetCards,
        noteCards: data.noteCards,
        proximityLinks: {
          taskToEvent: taskToEventObj,
          budgetToEvent: budgetToEventObj,
          noteToEvent: noteToEventObj,
        },
      })

      if (result.success) {
        // Clear canvas
        editor.selectAll()
        editor.deleteShapes(editor.getSelectedShapeIds())
        localStorage.removeItem('open-event-playground-v1')

        // Show success
        toast.success(
          `Successfully created ${result.summary.eventsCreated} event${result.summary.eventsCreated !== 1 ? 's' : ''}!`
        )

        // Navigate to first created event
        if (result.eventIds.length > 0) {
          navigate(`/dashboard/events/${result.eventIds[0]}`)
        } else {
          navigate('/dashboard/events')
        }
      } else {
        toast.error('Failed to save to database')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
      setShowPreview(false)
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col -m-3 sm:-m-4 lg:-m-6">
      {/* Toolbar */}
      <PlaygroundToolbar editor={editor} onFinalize={() => setShowFinalization(true)} />

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        <PlaygroundCanvas
          onEditorReady={handleEditorReady}
          onSelectionChange={handleSelectionChange}
        />

        {/* Minimal Empty State */}
        {counts.total === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-muted-foreground/60 text-sm">
                Click <span className="font-medium text-muted-foreground">Add Card</span> to start
                brainstorming
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Finalization Dialog */}
      <Dialog open={showFinalization} onOpenChange={setShowFinalization}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket size={20} weight="duotone" className="text-purple" />
              Finalize with AI
            </DialogTitle>
            <DialogDescription>
              Convert your cards into real events, tasks, and budget items.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3">
              {counts.events > 0 && (
                <div className="flex items-center gap-3 p-3 bg-purple/5 rounded-lg">
                  <CalendarBlank size={20} weight="duotone" className="text-purple" />
                  <div>
                    <div className="font-semibold text-foreground">{counts.events}</div>
                    <div className="text-xs text-muted-foreground">
                      Event{counts.events !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
              {counts.tasks > 0 && (
                <div className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-lg">
                  <CheckSquare size={20} weight="duotone" className="text-blue-500" />
                  <div>
                    <div className="font-semibold text-foreground">{counts.tasks}</div>
                    <div className="text-xs text-muted-foreground">
                      Task{counts.tasks !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
              {counts.budgets > 0 && (
                <div className="flex items-center gap-3 p-3 bg-green-500/5 rounded-lg">
                  <CurrencyDollar size={20} weight="duotone" className="text-green-600" />
                  <div>
                    <div className="font-semibold text-foreground">{counts.budgets}</div>
                    <div className="text-xs text-muted-foreground">
                      Budget item{counts.budgets !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
              {counts.notes > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/5 rounded-lg">
                  <Note size={20} weight="duotone" className="text-amber-500" />
                  <div>
                    <div className="font-semibold text-foreground">{counts.notes}</div>
                    <div className="text-xs text-muted-foreground">
                      Note{counts.notes !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {counts.total === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No cards to finalize. Add some cards first!
              </p>
            ) : (
              <>
                <button
                  onClick={handleFinalize}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple text-white font-medium rounded-lg hover:bg-purple/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkle size={18} weight="fill" />
                  {isProcessing
                    ? 'Processing...'
                    : `Create ${counts.total} item${counts.total !== 1 ? 's' : ''}`}
                </button>

                {/* Rate Limit Info */}
                {aiUsage && !aiUsage.isAdmin && (
                  <div className="text-xs text-muted-foreground text-center">
                    AI enhancements: {aiUsage.promptsRemaining} of {aiUsage.dailyLimit} remaining
                    today
                    {aiUsage.status === 'warning' && (
                      <span className="text-amber-500"> (running low)</span>
                    )}
                    {aiUsage.status === 'critical' && (
                      <span className="text-red-500"> (almost at limit)</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <PlaygroundPreviewModal
        isOpen={showPreview}
        isProcessing={isSaving}
        data={previewData}
        proximityLinks={proximityLinks}
        onConfirm={handleConfirmFinalization}
        onCancel={() => {
          setShowPreview(false)
          setPreviewData(null)
          setProximityLinks(null)
        }}
      />
    </div>
  )
}
