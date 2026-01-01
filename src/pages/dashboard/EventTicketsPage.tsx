/**
 * Event Tickets Page
 * Manage ticket types for an event - create, edit, delete, reorder
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Plus,
  PencilSimple,
  Trash,
  DotsThreeVertical,
  Ticket,
  EyeSlash,
  DotsSixVertical,
  CheckCircle,
  XCircle,
  Clock,
  CurrencyDollar,
  Tag,
  ChartLine,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface TicketType {
  _id: Id<'ticketTypes'>
  name: string
  description?: string
  price: number
  currency: string
  quantity?: number
  soldCount: number
  reservedCount?: number
  maxPerOrder?: number
  salesStartAt?: number
  salesEndAt?: number
  isActive: boolean
  isHidden: boolean
  sortOrder: number
  perks?: string[]
}

interface TicketFormData {
  name: string
  description: string
  price: string
  currency: string
  quantity: string
  maxPerOrder: string
  salesStartAt: string
  salesEndAt: string
  isActive: boolean
  isHidden: boolean
  perks: string
}

const defaultFormData: TicketFormData = {
  name: '',
  description: '',
  price: '',
  currency: 'usd',
  quantity: '',
  maxPerOrder: '10',
  salesStartAt: '',
  salesEndAt: '',
  isActive: true,
  isHidden: false,
  perks: '',
}

export function EventTicketsPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [showModal, setShowModal] = useState(false)
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null)
  const [formData, setFormData] = useState<TicketFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')
  const ticketTypes = useQuery(
    api.ticketTypes.getByEvent,
    eventId ? { eventId: eventId as Id<'events'>, includeHidden: true } : 'skip'
  )
  const stats = useQuery(
    api.orders.getStats,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )

  const createTicket = useMutation(api.ticketTypes.create)
  const updateTicket = useMutation(api.ticketTypes.update)
  const removeTicket = useMutation(api.ticketTypes.remove)

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const handleOpenModal = (ticket?: TicketType) => {
    if (ticket) {
      setEditingTicket(ticket)
      setFormData({
        name: ticket.name,
        description: ticket.description || '',
        price: (ticket.price / 100).toString(),
        currency: ticket.currency,
        quantity: ticket.quantity?.toString() || '',
        maxPerOrder: ticket.maxPerOrder?.toString() || '10',
        salesStartAt: ticket.salesStartAt
          ? new Date(ticket.salesStartAt).toISOString().slice(0, 16)
          : '',
        salesEndAt: ticket.salesEndAt ? new Date(ticket.salesEndAt).toISOString().slice(0, 16) : '',
        isActive: ticket.isActive,
        isHidden: ticket.isHidden,
        perks: ticket.perks?.join('\n') || '',
      })
    } else {
      setEditingTicket(null)
      setFormData(defaultFormData)
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTicket(null)
    setFormData(defaultFormData)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a ticket name')
      return
    }

    const priceNum = parseFloat(formData.price)
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Please enter a valid price')
      return
    }

    setSaving(true)
    try {
      const perks = formData.perks
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean)

      const data = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: Math.round(priceNum * 100), // Convert to cents
        currency: formData.currency,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        maxPerOrder: formData.maxPerOrder ? parseInt(formData.maxPerOrder) : undefined,
        salesStartAt: formData.salesStartAt ? new Date(formData.salesStartAt).getTime() : undefined,
        salesEndAt: formData.salesEndAt ? new Date(formData.salesEndAt).getTime() : undefined,
        isActive: formData.isActive,
        isHidden: formData.isHidden,
        perks: perks.length > 0 ? perks : undefined,
      }

      if (editingTicket) {
        await updateTicket({ id: editingTicket._id, ...data })
        toast.success('Ticket type updated')
      } else {
        await createTicket({ eventId: eventId as Id<'events'>, ...data })
        toast.success('Ticket type created')
      }

      handleCloseModal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save ticket type')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ticket: TicketType) => {
    if (ticket.soldCount > 0) {
      toast.error('Cannot delete ticket type with sales. Deactivate it instead.')
      return
    }

    if (!confirm(`Are you sure you want to delete "${ticket.name}"?`)) {
      return
    }

    try {
      await removeTicket({ id: ticket._id })
      toast.success('Ticket type deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete ticket type')
    }
  }

  const handleToggleActive = async (ticket: TicketType) => {
    try {
      await updateTicket({ id: ticket._id, isActive: !ticket.isActive })
      toast.success(ticket.isActive ? 'Ticket type deactivated' : 'Ticket type activated')
    } catch {
      toast.error('Failed to update ticket type')
    }
  }

  const getTicketStatus = (ticket: TicketType) => {
    const now = Date.now()

    if (!ticket.isActive) {
      return {
        label: 'Inactive',
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        icon: XCircle,
      }
    }

    if (ticket.salesStartAt && now < ticket.salesStartAt) {
      return {
        label: 'Not on sale yet',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: Clock,
      }
    }

    if (ticket.salesEndAt && now > ticket.salesEndAt) {
      return {
        label: 'Sales ended',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon: Clock,
      }
    }

    if (ticket.quantity !== undefined) {
      const available = ticket.quantity - ticket.soldCount - (ticket.reservedCount || 0)
      if (available <= 0) {
        return {
          label: 'Sold out',
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          icon: XCircle,
        }
      }
      if (available <= 10) {
        return {
          label: `${available} left`,
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          icon: Tag,
        }
      }
    }

    return {
      label: 'On sale',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: CheckCircle,
    }
  }

  const totalRevenue = stats?.totalRevenue || 0
  const totalSold = ticketTypes?.reduce((sum, t) => sum + t.soldCount, 0) || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/dashboard/events/${eventId}`}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Tickets</h1>
            <p className="text-muted-foreground text-sm">{event.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/dashboard/events/${eventId}/sales`}>
            <Button variant="outline" size="sm">
              <ChartLine size={16} className="mr-2" />
              View Sales
            </Button>
          </Link>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={16} className="mr-2" />
            Add Ticket Type
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ticket size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ticket Types</p>
              <p className="text-2xl font-bold">{ticketTypes?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Tag size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
              <p className="text-2xl font-bold">{totalSold}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CurrencyDollar size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue / 100, 'USD')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Types List */}
      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Ticket Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage your event ticket tiers and pricing
          </p>
        </div>

        {!ticketTypes?.length ? (
          <div className="p-8 text-center">
            <Ticket size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No ticket types yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first ticket type to start selling tickets
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus size={16} className="mr-2" />
              Add Ticket Type
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {ticketTypes.map((ticket) => {
              const status = getTicketStatus(ticket)
              const StatusIcon = status.icon
              const remaining = ticket.quantity
                ? ticket.quantity - ticket.soldCount - (ticket.reservedCount || 0)
                : null

              return (
                <div
                  key={ticket._id}
                  className={cn(
                    'p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors',
                    !ticket.isActive && 'opacity-60'
                  )}
                >
                  <div className="cursor-grab text-muted-foreground hover:text-foreground">
                    <DotsSixVertical size={20} weight="bold" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{ticket.name}</h3>
                      {ticket.isHidden && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                          <EyeSlash size={12} />
                          Hidden
                        </span>
                      )}
                    </div>
                    {ticket.description && (
                      <p className="text-sm text-muted-foreground truncate">{ticket.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{ticket.soldCount} sold</span>
                      {remaining !== null && <span>{remaining} remaining</span>}
                      {ticket.reservedCount ? <span>{ticket.reservedCount} reserved</span> : null}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      {ticket.price === 0
                        ? 'Free'
                        : formatCurrency(ticket.price / 100, ticket.currency.toUpperCase())}
                    </p>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-1',
                        status.color
                      )}
                    >
                      <StatusIcon size={12} weight="bold" />
                      {status.label}
                    </span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <DotsThreeVertical size={16} weight="bold" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenModal(ticket)}>
                        <PencilSimple size={14} className="mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(ticket)}>
                        {ticket.isActive ? (
                          <>
                            <XCircle size={14} className="mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} className="mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(ticket)}
                        className="text-destructive"
                        disabled={ticket.soldCount > 0}
                      >
                        <Trash size={14} className="mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTicket ? 'Edit Ticket Type' : 'Create Ticket Type'}</DialogTitle>
            <DialogDescription>
              {editingTicket
                ? 'Update the ticket type details below'
                : 'Add a new ticket tier for your event'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. General Admission, VIP, Early Bird"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what's included..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesStartAt">Sales Start</Label>
                <Input
                  id="salesStartAt"
                  type="datetime-local"
                  value={formData.salesStartAt}
                  onChange={(e) => setFormData({ ...formData, salesStartAt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesEndAt">Sales End</Label>
                <Input
                  id="salesEndAt"
                  type="datetime-local"
                  value={formData.salesEndAt}
                  onChange={(e) => setFormData({ ...formData, salesEndAt: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPerOrder">Max Per Order</Label>
              <Input
                id="maxPerOrder"
                type="number"
                min="1"
                placeholder="10"
                value={formData.maxPerOrder}
                onChange={(e) => setFormData({ ...formData, maxPerOrder: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="perks">Perks (one per line)</Label>
              <Textarea
                id="perks"
                placeholder="Access to all sessions&#10;Lunch included&#10;Event swag bag"
                value={formData.perks}
                onChange={(e) => setFormData({ ...formData, perks: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Tickets can only be purchased when active
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Hidden</Label>
                <p className="text-xs text-muted-foreground">
                  Hidden tickets are only accessible via direct link
                </p>
              </div>
              <Switch
                checked={formData.isHidden}
                onCheckedChange={(checked) => setFormData({ ...formData, isHidden: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : editingTicket ? 'Save Changes' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
