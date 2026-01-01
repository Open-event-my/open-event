import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  CheckSquare,
  Square,
  Plus,
  PencilSimple,
  Trash,
  Warning,
  Clock,
  Fire,
  CalendarBlank,
  ListChecks,
  Lightning,
  Funnel,
  DotsThree,
  CheckCircle,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const TASK_CATEGORIES = [
  { value: 'venue', label: 'Venue & Location' },
  { value: 'vendors', label: 'Vendors & Suppliers' },
  { value: 'sponsors', label: 'Sponsorship' },
  { value: 'marketing', label: 'Marketing & Promotion' },
  { value: 'logistics', label: 'Logistics & Operations' },
  { value: 'registration', label: 'Registration & Ticketing' },
  { value: 'content', label: 'Content & Speakers' },
  { value: 'legal', label: 'Legal & Permits' },
  { value: 'budget', label: 'Budget & Finance' },
  { value: 'other', label: 'Other' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-500/10 text-gray-600', icon: null },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/10 text-blue-600', icon: null },
  { value: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-600', icon: Fire },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-600', icon: Lightning },
]

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
]

type TaskForm = {
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in_progress' | 'blocked' | 'completed'
  dueDate: string
  notes: string
}

const defaultForm: TaskForm = {
  title: '',
  description: '',
  category: 'other',
  priority: 'medium',
  status: 'todo',
  dueDate: '',
  notes: '',
}

export function EventTasksPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Id<'eventTasks'> | null>(null)
  const [form, setForm] = useState<TaskForm>(defaultForm)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isSaving, setIsSaving] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')

  const tasks = useQuery(
    api.eventTasks.listByEvent,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const summary = useQuery(
    api.eventTasks.getSummary,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const createTask = useMutation(api.eventTasks.create)
  const updateTask = useMutation(api.eventTasks.update)
  const deleteTask = useMutation(api.eventTasks.remove)
  const toggleComplete = useMutation(api.eventTasks.toggleComplete)
  const createFromTemplate = useMutation(api.eventTasks.createFromTemplate)

  const openAddModal = () => {
    setForm(defaultForm)
    setEditingTask(null)
    setShowAddModal(true)
  }

  const openEditModal = (task: NonNullable<typeof tasks>[number]) => {
    setForm({
      title: task.title,
      description: task.description || '',
      category: task.category || 'other',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      notes: task.notes || '',
    })
    setEditingTask(task._id)
    setShowAddModal(true)
  }

  const handleSubmit = async () => {
    if (!eventId || !form.title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    setIsSaving(true)
    try {
      if (editingTask) {
        await updateTask({
          id: editingTask,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
          notes: form.notes.trim() || undefined,
        })
        toast.success('Task updated')
      } else {
        await createTask({
          eventId: eventId as Id<'events'>,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate ? new Date(form.dueDate).getTime() : undefined,
          notes: form.notes.trim() || undefined,
        })
        toast.success('Task added')
      }
      setShowAddModal(false)
      setEditingTask(null)
      setForm(defaultForm)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (id: Id<'eventTasks'>) => {
    try {
      const completed = await toggleComplete({ id })
      toast.success(completed ? 'Task completed!' : 'Task reopened')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    }
  }

  const handleDelete = async (id: Id<'eventTasks'>) => {
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask({ id })
      toast.success('Task deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  const handleCreateFromTemplate = async (template: string) => {
    if (!eventId) return
    try {
      await createFromTemplate({
        eventId: eventId as Id<'events'>,
        template,
      })
      toast.success('Tasks created from template!')
      setShowTemplateModal(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tasks')
    }
  }

  const formatDueDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const taskDate = new Date(timestamp)
    taskDate.setHours(0, 0, 0, 0)

    if (taskDate.getTime() === today.getTime()) return 'Today'
    if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
    if (taskDate < today) return `Overdue: ${date.toLocaleDateString()}`
    return date.toLocaleDateString()
  }

  const isOverdue = (timestamp: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return timestamp < today.getTime()
  }

  // Loading state
  if (event === undefined || tasks === undefined) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-1/3" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Not found state
  if (event === null) {
    return (
      <div className="text-center py-16">
        <Warning size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
        <h2 className="text-xl font-semibold mb-2">Event not found</h2>
        <Link to="/dashboard/events" className="text-primary hover:underline">
          Back to Events
        </Link>
      </div>
    )
  }

  const filteredTasks =
    statusFilter === 'all' ? tasks : tasks.filter((task) => task.status === statusFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link
            to={`/dashboard/events/${eventId}`}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mt-1"
          >
            <ArrowLeft size={20} weight="bold" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono">Tasks</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tasks.length === 0 && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg',
                'border border-border text-sm font-medium',
                'hover:bg-muted transition-colors'
              )}
            >
              <ListChecks size={18} weight="bold" />
              Use Template
            </button>
          )}
          <button
            onClick={openAddModal}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-primary text-primary-foreground font-medium text-sm',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Plus size={18} weight="bold" />
            Add Task
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <ListChecks size={16} weight="bold" />
              <span className="text-xs font-medium">Total Tasks</span>
            </div>
            <p className="text-2xl font-bold font-mono">{summary.total}</p>
            <p className="text-xs text-muted-foreground mt-1">{summary.completionRate}% complete</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock size={16} weight="bold" />
              <span className="text-xs font-medium">In Progress</span>
            </div>
            <p className="text-2xl font-bold font-mono text-blue-600">
              {summary.byStatus.in_progress}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{summary.byStatus.todo} to do</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle size={16} weight="bold" />
              <span className="text-xs font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold font-mono text-green-600">
              {summary.byStatus.completed}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Warning size={16} weight="bold" className="text-red-500" />
              <span className="text-xs font-medium">Overdue</span>
            </div>
            <p
              className={cn(
                'text-2xl font-bold font-mono',
                summary.overdue > 0 ? 'text-red-500' : ''
              )}
            >
              {summary.overdue}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Lightning size={16} weight="bold" className="text-orange-500" />
              <span className="text-xs font-medium">Urgent</span>
            </div>
            <p
              className={cn(
                'text-2xl font-bold font-mono',
                summary.urgent > 0 ? 'text-orange-500' : ''
              )}
            >
              {summary.urgent}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.dueThisWeek} due this week
            </p>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Funnel size={16} className="text-muted-foreground" />
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            statusFilter === 'all'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          All ({tasks.length})
        </button>
        {STATUS_OPTIONS.map((status) => {
          const count = tasks.filter((t) => t.status === status.value).length
          return (
            <button
              key={status.value}
              onClick={() => setStatusFilter(status.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                statusFilter === status.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {status.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <ListChecks
            size={64}
            weight="duotone"
            className="mx-auto text-muted-foreground/30 mb-6"
          />
          <h3 className="text-lg font-semibold mb-2">
            {tasks.length === 0 ? 'No tasks yet' : 'No tasks match filter'}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            {tasks.length === 0
              ? 'Start your event planning checklist by adding tasks or using a template.'
              : 'Try a different filter to see more tasks.'}
          </p>
          {tasks.length === 0 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowTemplateModal(true)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'border border-border text-sm font-medium',
                  'hover:bg-muted transition-colors'
                )}
              >
                <ListChecks size={16} weight="bold" />
                Use Template
              </button>
              <button
                onClick={openAddModal}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                  'bg-primary text-primary-foreground text-sm font-medium',
                  'hover:bg-primary/90 transition-colors'
                )}
              >
                <Plus size={16} weight="bold" />
                Add Task
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const category = TASK_CATEGORIES.find((c) => c.value === task.category)
            const priority = PRIORITY_OPTIONS.find((p) => p.value === task.priority)
            const isComplete = task.status === 'completed'
            const PriorityIcon = priority?.icon

            return (
              <div
                key={task._id}
                className={cn(
                  'rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors',
                  isComplete && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(task._id)}
                    className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isComplete ? (
                      <CheckSquare size={22} weight="fill" className="text-green-500" />
                    ) : (
                      <Square size={22} weight="bold" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3
                        className={cn(
                          'font-medium',
                          isComplete && 'line-through text-muted-foreground'
                        )}
                      >
                        {task.title}
                      </h3>
                      {PriorityIcon && (
                        <PriorityIcon
                          size={14}
                          weight="fill"
                          className={
                            task.priority === 'urgent' ? 'text-red-500' : 'text-orange-500'
                          }
                        />
                      )}
                      <span
                        className={cn('px-2 py-0.5 rounded text-xs font-medium', priority?.color)}
                      >
                        {priority?.label}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {category && (
                        <span className="px-2 py-0.5 rounded bg-muted">{category.label}</span>
                      )}
                      {task.dueDate && (
                        <span
                          className={cn(
                            'flex items-center gap-1',
                            !isComplete && isOverdue(task.dueDate) && 'text-red-500 font-medium'
                          )}
                        >
                          <CalendarBlank size={12} />
                          {formatDueDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer">
                        <DotsThree size={20} weight="bold" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => openEditModal(task)}>
                        <PencilSimple size={16} weight="duotone" className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(task._id)}>
                        {isComplete ? (
                          <>
                            <Square size={16} weight="duotone" className="mr-2" />
                            Reopen
                          </>
                        ) : (
                          <>
                            <CheckSquare size={16} weight="duotone" className="mr-2" />
                            Complete
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(task._id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash size={16} weight="duotone" className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare size={20} weight="duotone" className="text-primary" />
              {editingTask ? 'Edit Task' : 'Add Task'}
            </DialogTitle>
            <DialogDescription>Add a task to your event planning checklist.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Book catering vendor"
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                  'text-sm'
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional details"
                className={cn(
                  'w-full px-3 py-2 rounded-lg border border-border bg-background',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                  'text-sm'
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    setForm({ ...form, priority: value as TaskForm['priority'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value as TaskForm['status'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border border-border bg-background',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    'text-sm'
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !form.title.trim()}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? 'Saving...' : editingTask ? 'Update' : 'Add Task'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks size={20} weight="duotone" className="text-primary" />
              Choose Template
            </DialogTitle>
            <DialogDescription>
              Start with a pre-built checklist for your event type.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {[
              { value: 'conference', label: 'Conference', desc: '12 tasks' },
              { value: 'workshop', label: 'Workshop', desc: '7 tasks' },
              { value: 'hackathon', label: 'Hackathon', desc: '10 tasks' },
              { value: 'networking', label: 'Networking Event', desc: '6 tasks' },
            ].map((template) => (
              <button
                key={template.value}
                onClick={() => handleCreateFromTemplate(template.value)}
                className={cn(
                  'w-full p-4 rounded-lg border border-border bg-card text-left',
                  'hover:border-primary/20 hover:bg-muted/30 transition-colors'
                )}
              >
                <p className="font-medium">{template.label}</p>
                <p className="text-xs text-muted-foreground">{template.desc}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
