import { useState, useCallback, useMemo } from 'react'
import type { Editor, TLShapeId } from 'tldraw'
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
import type {
  EventCardProps,
  TaskCardProps,
  BudgetCardProps,
  NoteCardProps,
  CardType,
  ChecklistItem,
} from '@/lib/playground/types'
import { CalendarBlank, CheckSquare, CurrencyDollar, Note, Plus, X } from '@phosphor-icons/react'

interface CardEditModalProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
  shapeId: TLShapeId | null
  shapeType: CardType | null
}

export function CardEditModal({ isOpen, onClose, editor, shapeId, shapeType }: CardEditModalProps) {
  // Get initial form data from shape props
  const initialFormData = useMemo(() => {
    if (!editor || !shapeId) return {}
    const shape = editor.getShape(shapeId)
    if (shape && 'props' in shape) {
      return { ...shape.props }
    }
    return {}
  }, [editor, shapeId])

  const [formData, setFormData] = useState<Record<string, unknown>>({})

  // Reset form data when modal opens with new shape
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setFormData(initialFormData)
      } else {
        onClose()
      }
    },
    [initialFormData, onClose]
  )

  // Initialize form data when modal opens
  if (isOpen && Object.keys(formData).length === 0 && Object.keys(initialFormData).length > 0) {
    setFormData(initialFormData)
  }

  const handleSave = useCallback(() => {
    if (!editor || !shapeId) return

    editor.updateShape({
      id: shapeId,
      type: shapeType!,
      props: {
        ...formData,
        updatedAt: Date.now(),
      },
    })

    onClose()
  }, [editor, shapeId, shapeType, formData, onClose])

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const renderEventForm = () => {
    const data = formData as unknown as EventCardProps
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={data.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Enter event title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={data.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Enter event description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select
              value={data.eventType || 'conference'}
              onValueChange={(value) => updateField('eventType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conference">Conference</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
                <SelectItem value="meetup">Meetup</SelectItem>
                <SelectItem value="webinar">Webinar</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationType">Location Type</Label>
            <Select
              value={data.locationType || 'in-person'}
              onValueChange={(value) => updateField('locationType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in-person">In-Person</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={data.startDate || ''}
              onChange={(e) => updateField('startDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={data.startTime || ''}
              onChange={(e) => updateField('startTime', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={data.endDate || ''}
              onChange={(e) => updateField('endDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={data.endTime || ''}
              onChange={(e) => updateField('endTime', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="venueName">Venue Name</Label>
          <Input
            id="venueName"
            value={data.venueName || ''}
            onChange={(e) => updateField('venueName', e.target.value)}
            placeholder="Enter venue name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="venueAddress">Venue Address</Label>
          <Input
            id="venueAddress"
            value={data.venueAddress || ''}
            onChange={(e) => updateField('venueAddress', e.target.value)}
            placeholder="Enter venue address"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expectedAttendees">Expected Attendees</Label>
            <Input
              id="expectedAttendees"
              type="number"
              min={0}
              value={data.expectedAttendees || 0}
              onChange={(e) => updateField('expectedAttendees', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget ($)</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              value={data.budget || 0}
              onChange={(e) => updateField('budget', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
    )
  }

  const renderTaskForm = () => {
    const data = formData as unknown as TaskCardProps
    const checklist = (data.checklist || []) as ChecklistItem[]

    const addChecklistItem = () => {
      const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        text: '',
        completed: false,
      }
      updateField('checklist', [...checklist, newItem])
    }

    const updateChecklistItem = (id: string, text: string) => {
      updateField(
        'checklist',
        checklist.map((item) => (item.id === id ? { ...item, text } : item))
      )
    }

    const removeChecklistItem = (id: string) => {
      updateField(
        'checklist',
        checklist.filter((item) => item.id !== id)
      )
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Task Title</Label>
          <Input
            id="title"
            value={data.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Enter task title"
          />
        </div>

        <div className="space-y-2">
          <Label>Checklist</Label>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Input
                  value={item.text}
                  onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                  placeholder="Checklist item"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeChecklistItem(item.id)}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={data.dueDate || ''}
            onChange={(e) => updateField('dueDate', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={data.priority || 'medium'}
              onValueChange={(value) => updateField('priority', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={data.status || 'todo'}
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }

  const renderBudgetForm = () => {
    const data = formData as unknown as BudgetCardProps
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Budget Item Title</Label>
          <Input
            id="title"
            value={data.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Enter budget item title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={data.category || 'other'}
              onValueChange={(value) => updateField('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="venue">Venue</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={data.status || 'planned'}
              onValueChange={(value) => updateField('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="committed">Committed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="estimatedAmount">Estimated Amount</Label>
            <Input
              id="estimatedAmount"
              type="number"
              min={0}
              value={data.estimatedAmount || 0}
              onChange={(e) => updateField('estimatedAmount', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="actualAmount">Actual Amount</Label>
            <Input
              id="actualAmount"
              type="number"
              min={0}
              value={data.actualAmount || 0}
              onChange={(e) => updateField('actualAmount', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={data.currency || 'USD'}
            onValueChange={(value) => updateField('currency', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="JPY">JPY (¥)</SelectItem>
              <SelectItem value="MYR">MYR (RM)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={data.notes || ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Additional notes"
            rows={2}
          />
        </div>
      </div>
    )
  }

  const renderNoteForm = () => {
    const data = formData as unknown as NoteCardProps
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Note Title</Label>
          <Input
            id="title"
            value={data.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Enter note title"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={data.content || ''}
            onChange={(e) => updateField('content', e.target.value)}
            placeholder="Enter note content"
            rows={5}
          />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            {(['yellow', 'purple', 'green', 'blue', 'pink'] as const).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateField('color', color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  data.color === color ? 'border-foreground scale-110' : 'border-transparent'
                } ${
                  color === 'yellow'
                    ? 'bg-yellow-400'
                    : color === 'purple'
                      ? 'bg-purple-400'
                      : color === 'green'
                        ? 'bg-green-400'
                        : color === 'blue'
                          ? 'bg-blue-400'
                          : 'bg-pink-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getTitle = () => {
    switch (shapeType) {
      case 'event-card':
        return (
          <span className="flex items-center gap-2">
            <CalendarBlank size={20} className="text-purple" />
            Edit Event
          </span>
        )
      case 'task-card':
        return (
          <span className="flex items-center gap-2">
            <CheckSquare size={20} className="text-blue-500" />
            Edit Task
          </span>
        )
      case 'budget-card':
        return (
          <span className="flex items-center gap-2">
            <CurrencyDollar size={20} className="text-green-600" />
            Edit Budget Item
          </span>
        )
      case 'note-card':
        return (
          <span className="flex items-center gap-2">
            <Note size={20} className="text-amber-500" />
            Edit Note
          </span>
        )
      default:
        return 'Edit Card'
    }
  }

  const renderForm = () => {
    switch (shapeType) {
      case 'event-card':
        return renderEventForm()
      case 'task-card':
        return renderTaskForm()
      case 'budget-card':
        return renderBudgetForm()
      case 'note-card':
        return renderNoteForm()
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="py-4">{renderForm()}</div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
