import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  CurrencyDollar,
  Plus,
  PencilSimple,
  Trash,
  CheckCircle,
  Warning,
  Clock,
  Receipt,
  TrendUp,
  TrendDown,
  Funnel,
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

const BUDGET_CATEGORIES = [
  { value: 'venue', label: 'Venue & Facilities' },
  { value: 'catering', label: 'Catering & F&B' },
  { value: 'av', label: 'AV & Technology' },
  { value: 'marketing', label: 'Marketing & Promo' },
  { value: 'staffing', label: 'Staffing & Labor' },
  { value: 'permits', label: 'Permits & Insurance' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'decoration', label: 'Decoration & Design' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'misc', label: 'Miscellaneous' },
]

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned', color: 'bg-gray-500/10 text-gray-600' },
  { value: 'committed', label: 'Committed', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'paid', label: 'Paid', color: 'bg-green-500/10 text-green-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500/10 text-red-600' },
]

type BudgetItemForm = {
  category: string
  name: string
  description: string
  estimatedAmount: string
  actualAmount: string
  status: 'planned' | 'committed' | 'paid' | 'cancelled'
  notes: string
}

const defaultForm: BudgetItemForm = {
  category: 'venue',
  name: '',
  description: '',
  estimatedAmount: '',
  actualAmount: '',
  status: 'planned',
  notes: '',
}

export function EventBudgetPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Id<'budgetItems'> | null>(null)
  const [form, setForm] = useState<BudgetItemForm>(defaultForm)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isSaving, setIsSaving] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')

  const budgetItems = useQuery(
    api.budgetItems.listByEvent,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const summary = useQuery(
    api.budgetItems.getSummary,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const createItem = useMutation(api.budgetItems.create)
  const updateItem = useMutation(api.budgetItems.update)
  const deleteItem = useMutation(api.budgetItems.remove)

  const openAddModal = () => {
    setForm(defaultForm)
    setEditingItem(null)
    setShowAddModal(true)
  }

  const openEditModal = (item: NonNullable<typeof budgetItems>[number]) => {
    setForm({
      category: item.category,
      name: item.name,
      description: item.description || '',
      estimatedAmount: item.estimatedAmount.toString(),
      actualAmount: item.actualAmount?.toString() || '',
      status: item.status as BudgetItemForm['status'],
      notes: item.notes || '',
    })
    setEditingItem(item._id)
    setShowAddModal(true)
  }

  const handleSubmit = async () => {
    if (!eventId || !form.name.trim() || !form.estimatedAmount) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSaving(true)
    try {
      if (editingItem) {
        await updateItem({
          id: editingItem,
          category: form.category,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          estimatedAmount: parseFloat(form.estimatedAmount),
          actualAmount: form.actualAmount ? parseFloat(form.actualAmount) : undefined,
          status: form.status,
          notes: form.notes.trim() || undefined,
        })
        toast.success('Budget item updated')
      } else {
        await createItem({
          eventId: eventId as Id<'events'>,
          category: form.category,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          estimatedAmount: parseFloat(form.estimatedAmount),
          actualAmount: form.actualAmount ? parseFloat(form.actualAmount) : undefined,
          status: form.status,
          notes: form.notes.trim() || undefined,
        })
        toast.success('Budget item added')
      }
      setShowAddModal(false)
      setEditingItem(null)
      setForm(defaultForm)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: Id<'budgetItems'>) => {
    if (!confirm('Delete this budget item?')) return
    try {
      await deleteItem({ id })
      toast.success('Budget item deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Loading state
  if (event === undefined || budgetItems === undefined) {
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

  const filteredItems =
    categoryFilter === 'all'
      ? budgetItems
      : budgetItems.filter((item) => item.category === categoryFilter)

  const activeItems = filteredItems.filter((i) => i.status !== 'cancelled')

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
            <h1 className="text-2xl font-bold font-mono">Budget</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg',
            'bg-primary text-primary-foreground font-medium text-sm',
            'hover:bg-primary/90 transition-colors'
          )}
        >
          <Plus size={18} weight="bold" />
          Add Budget Item
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CurrencyDollar size={16} weight="bold" />
              <span className="text-xs font-medium">Event Budget</span>
            </div>
            <p className="text-2xl font-bold font-mono">{formatCurrency(summary.eventBudget)}</p>
            {summary.remaining !== 0 && (
              <p
                className={cn(
                  'text-xs mt-1',
                  summary.remaining < 0 ? 'text-red-500' : 'text-green-500'
                )}
              >
                {summary.remaining > 0 ? '+' : ''}
                {formatCurrency(summary.remaining)} remaining
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock size={16} weight="bold" />
              <span className="text-xs font-medium">Total Estimated</span>
            </div>
            <p className="text-2xl font-bold font-mono">{formatCurrency(summary.totalEstimated)}</p>
            <p className="text-xs text-muted-foreground mt-1">{summary.itemCount} items</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle size={16} weight="bold" />
              <span className="text-xs font-medium">Total Paid</span>
            </div>
            <p className="text-2xl font-bold font-mono text-green-600">
              {formatCurrency(summary.totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(summary.totalCommitted)} committed
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              {summary.variance >= 0 ? (
                <TrendUp size={16} weight="bold" className="text-red-500" />
              ) : (
                <TrendDown size={16} weight="bold" className="text-green-500" />
              )}
              <span className="text-xs font-medium">Variance</span>
            </div>
            <p
              className={cn(
                'text-2xl font-bold font-mono',
                summary.variance > 0 ? 'text-red-500' : summary.variance < 0 ? 'text-green-500' : ''
              )}
            >
              {summary.variance > 0 ? '+' : ''}
              {formatCurrency(summary.variance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.variancePercent > 0 ? '+' : ''}
              {summary.variancePercent.toFixed(1)}% from estimate
            </p>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Funnel size={16} className="text-muted-foreground" />
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            categoryFilter === 'all'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          All
        </button>
        {BUDGET_CATEGORIES.map((cat) => {
          const count = budgetItems.filter(
            (i) => i.category === cat.value && i.status !== 'cancelled'
          ).length
          if (count === 0) return null
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                categoryFilter === cat.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Budget Items List */}
      {activeItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Receipt size={64} weight="duotone" className="mx-auto text-muted-foreground/30 mb-6" />
          <h3 className="text-lg font-semibold mb-2">No budget items yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Start tracking your event expenses by adding budget items.
          </p>
          <button
            onClick={openAddModal}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 transition-colors'
            )}
          >
            <Plus size={16} weight="bold" />
            Add First Item
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {activeItems.map((item) => {
            const category = BUDGET_CATEGORIES.find((c) => c.value === item.category)
            const statusInfo = STATUS_OPTIONS.find((s) => s.value === item.status)
            const variance = item.actualAmount ? item.actualAmount - item.estimatedAmount : 0

            return (
              <div
                key={item._id}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      <span
                        className={cn('px-2 py-0.5 rounded text-xs font-medium', statusInfo?.color)}
                      >
                        {statusInfo?.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{category?.label}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-bold">{formatCurrency(item.estimatedAmount)}</p>
                    {item.actualAmount !== undefined &&
                      item.actualAmount !== item.estimatedAmount && (
                        <p
                          className={cn(
                            'text-sm font-mono',
                            variance > 0 ? 'text-red-500' : 'text-green-500'
                          )}
                        >
                          Actual: {formatCurrency(item.actualAmount)}
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <PencilSimple size={16} weight="bold" />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash size={16} weight="bold" />
                    </button>
                  </div>
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
              <CurrencyDollar size={20} weight="duotone" className="text-primary" />
              {editingItem ? 'Edit Budget Item' : 'Add Budget Item'}
            </DialogTitle>
            <DialogDescription>Track expenses for your event.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
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
                    {BUDGET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value as BudgetItemForm['status'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Main venue rental"
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
                <Label>Estimated Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    value={form.estimatedAmount}
                    onChange={(e) => setForm({ ...form, estimatedAmount: e.target.value })}
                    placeholder="0"
                    className={cn(
                      'w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-background',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      'text-sm'
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Actual Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    value={form.actualAmount}
                    onChange={(e) => setForm({ ...form, actualAmount: e.target.value })}
                    placeholder="0"
                    className={cn(
                      'w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-background',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      'text-sm'
                    )}
                  />
                </div>
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
              disabled={isSaving || !form.name.trim() || !form.estimatedAmount}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
