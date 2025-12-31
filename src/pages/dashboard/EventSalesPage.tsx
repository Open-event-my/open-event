/**
 * Event Sales Dashboard
 * View sales analytics, orders, and revenue for an event
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  ChartLine,
  CurrencyDollar,
  Ticket,
  MagnifyingGlass,
  Funnel,
  DownloadSimple,
  ArrowClockwise,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  Eye,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled'

const statusConfig: Record<
  PaymentStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: ArrowClockwise,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: ArrowClockwise,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    icon: XCircle,
  },
}

interface Order {
  _id: Id<'orders'>
  orderNumber: string
  buyerName: string
  buyerEmail: string
  items: Array<{
    ticketTypeId: Id<'ticketTypes'>
    ticketTypeName: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  subtotal: number
  discount?: number
  fees: number
  total: number
  currency: string
  paymentStatus: PaymentStatus
  paymentMethod?: string
  promoCodeCode?: string
  createdAt: number
  paidAt?: number
  refundedAt?: number
  refundAmount?: number
  isPartialRefund?: boolean
}

export function EventSalesPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [processingRefund, setProcessingRefund] = useState(false)

  const event = useQuery(api.events.get, eventId ? { id: eventId as Id<'events'> } : 'skip')
  const orders = useQuery(
    api.orders.getByEvent,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )
  // @ts-expect-error Reserved for future analytics expansion
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _stats = useQuery(
    api.orders.getStats,
    eventId ? { eventId: eventId as Id<'events'> } : 'skip'
  )
  const timeSeries = useQuery(
    api.orders.getSalesTimeSeries,
    eventId ? { eventId: eventId as Id<'events'>, period: 'day' } : 'skip'
  )

  const createRefund = useAction(api.stripe.createRefund)

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Filter orders
  const filteredOrders =
    orders?.filter((order) => {
      const matchesSearch =
        !search ||
        order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        order.buyerEmail.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || order.paymentStatus === statusFilter
      return matchesSearch && matchesStatus
    }) || []

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
  }

  const handleRefund = async () => {
    if (!selectedOrder) return

    setProcessingRefund(true)
    try {
      // Calculate refund amount
      const amountToRefund =
        refundType === 'full'
          ? undefined // Full refund - let Stripe handle the amount
          : Math.round(parseFloat(refundAmount) * 100) // Convert dollars to cents

      // Validate partial refund amount
      if (refundType === 'partial') {
        if (!refundAmount || isNaN(parseFloat(refundAmount))) {
          toast.error('Please enter a valid refund amount')
          setProcessingRefund(false)
          return
        }
        if (amountToRefund && amountToRefund <= 0) {
          toast.error('Refund amount must be greater than zero')
          setProcessingRefund(false)
          return
        }
        if (amountToRefund && amountToRefund > selectedOrder.total) {
          toast.error('Refund amount cannot exceed order total')
          setProcessingRefund(false)
          return
        }
      }

      const result = await createRefund({
        orderId: selectedOrder._id,
        reason: refundReason || undefined,
        amount: amountToRefund,
      })

      if (result.success) {
        const formattedAmount = (result.amount / 100).toLocaleString('en-US', {
          style: 'currency',
          currency: selectedOrder.currency.toUpperCase(),
        })
        toast.success(
          result.isPartial
            ? `Partial refund of ${formattedAmount} processed successfully`
            : `Full refund of ${formattedAmount} processed successfully`
        )
      }

      setShowRefundDialog(false)
      setRefundReason('')
      setRefundAmount('')
      setRefundType('full')
      setSelectedOrder(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process refund')
    } finally {
      setProcessingRefund(false)
    }
  }

  // Calculate summary stats
  const completedOrders = orders?.filter((o) => o.paymentStatus === 'completed') || []
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
  const totalTickets = completedOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  )
  const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0

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
            <h1 className="text-2xl font-semibold">Sales</h1>
            <p className="text-muted-foreground text-sm">{event.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/dashboard/events/${eventId}/tickets`}>
            <Button variant="outline" size="sm">
              <Ticket size={16} className="mr-2" />
              Manage Tickets
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <DownloadSimple size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CurrencyDollar size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRevenue / 100, 'USD')}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Receipt size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="text-2xl font-bold">{completedOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Ticket size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tickets Sold</p>
              <p className="text-2xl font-bold">{totalTickets}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <ChartLine size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="text-2xl font-bold">{formatCurrency(avgOrderValue / 100, 'USD')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Chart (simplified) */}
      {timeSeries && timeSeries.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Sales Over Time (Last 30 Days)</h2>
          <div className="h-48 flex items-end gap-1">
            {timeSeries.map((day) => {
              const maxRevenue = Math.max(...timeSeries.map((d) => d.revenue))
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
              return (
                <div
                  key={day.date}
                  className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t cursor-pointer group relative"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${day.date}: ${formatCurrency(day.revenue / 100, 'USD')} (${day.orders} orders)`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <p className="font-medium">{day.date}</p>
                    <p>{formatCurrency(day.revenue / 100, 'USD')}</p>
                    <p className="text-muted-foreground">{day.orders} orders</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Orders</h2>
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length} of {orders?.length || 0} orders
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlass
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search orders..."
                  className="pl-9 w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Funnel size={14} className="mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!filteredOrders.length ? (
          <div className="p-8 text-center">
            <Receipt size={48} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No orders found</h3>
            <p className="text-sm text-muted-foreground">
              {orders?.length
                ? 'Try adjusting your search or filters'
                : 'Orders will appear here once tickets are purchased'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Tickets</th>
                  <th className="px-4 py-3 text-left font-medium">Total</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.paymentStatus]
                  const StatusIcon = status.icon
                  const ticketCount = order.items.reduce((s, i) => s + i.quantity, 0)

                  return (
                    <tr key={order._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{order.orderNumber}</span>
                        {order.promoCodeCode && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">
                            {order.promoCodeCode}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{order.buyerName}</p>
                          <p className="text-xs text-muted-foreground">{order.buyerEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {formatCurrency(order.total / 100, order.currency.toUpperCase())}
                          </p>
                          {order.discount && order.discount > 0 && (
                            <p className="text-xs text-green-600">
                              -{formatCurrency(order.discount / 100, order.currency.toUpperCase())}{' '}
                              discount
                            </p>
                          )}
                          {order.refundAmount && (
                            <p className="text-xs text-purple-600">
                              -
                              {formatCurrency(
                                order.refundAmount / 100,
                                order.currency.toUpperCase()
                              )}{' '}
                              refunded
                              {order.isPartialRefund && ' (partial)'}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                            status.color
                          )}
                        >
                          <StatusIcon size={12} weight="bold" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog
        open={!!selectedOrder && !showRefundDialog}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Order {selectedOrder.orderNumber}</DialogTitle>
                <DialogDescription>Created {formatDate(selectedOrder.createdAt)}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Customer Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Customer</h4>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="font-medium">{selectedOrder.buyerName}</p>
                    <p className="text-sm text-muted-foreground">{selectedOrder.buyerEmail}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Items</h4>
                  <div className="bg-muted rounded-lg divide-y">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="p-3 flex justify-between">
                        <div>
                          <p className="font-medium">{item.ticketTypeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(
                              item.unitPrice / 100,
                              selectedOrder.currency.toUpperCase()
                            )}{' '}
                            x {item.quantity}
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(
                            item.subtotal / 100,
                            selectedOrder.currency.toUpperCase()
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Summary</h4>
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>
                        {formatCurrency(
                          selectedOrder.subtotal / 100,
                          selectedOrder.currency.toUpperCase()
                        )}
                      </span>
                    </div>
                    {selectedOrder.discount && selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          Discount{' '}
                          {selectedOrder.promoCodeCode && `(${selectedOrder.promoCodeCode})`}
                        </span>
                        <span>
                          -
                          {formatCurrency(
                            selectedOrder.discount / 100,
                            selectedOrder.currency.toUpperCase()
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Fees</span>
                      <span>
                        {formatCurrency(
                          selectedOrder.fees / 100,
                          selectedOrder.currency.toUpperCase()
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>
                        {formatCurrency(
                          selectedOrder.total / 100,
                          selectedOrder.currency.toUpperCase()
                        )}
                      </span>
                    </div>
                    {selectedOrder.refundAmount && (
                      <div className="flex justify-between text-sm text-purple-600 pt-2">
                        <span>Refunded</span>
                        <span>
                          -
                          {formatCurrency(
                            selectedOrder.refundAmount / 100,
                            selectedOrder.currency.toUpperCase()
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                      statusConfig[selectedOrder.paymentStatus].color
                    )}
                  >
                    {statusConfig[selectedOrder.paymentStatus].label}
                  </span>
                </div>

                {selectedOrder.paymentMethod && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Payment Method</span>
                    <span className="text-sm capitalize">{selectedOrder.paymentMethod}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                {selectedOrder.paymentStatus === 'completed' && !selectedOrder.refundedAt && (
                  <Button variant="outline" onClick={() => setShowRefundDialog(true)}>
                    <ArrowClockwise size={14} className="mr-2" />
                    Refund Order
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog
        open={showRefundDialog}
        onOpenChange={(open) => {
          setShowRefundDialog(open)
          if (!open) {
            setRefundReason('')
            setRefundAmount('')
            setRefundType('full')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Order</DialogTitle>
            <DialogDescription>
              Process a refund for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Refund Type Selection */}
            <div className="space-y-2">
              <Label>Refund Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="full"
                    checked={refundType === 'full'}
                    onChange={() => setRefundType('full')}
                    className="w-4 h-4"
                  />
                  <span>Full Refund</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="partial"
                    checked={refundType === 'partial'}
                    onChange={() => setRefundType('partial')}
                    className="w-4 h-4"
                  />
                  <span>Partial Refund</span>
                </label>
              </div>
            </div>

            {/* Order Total Display */}
            <div className="bg-muted rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span>Order Total</span>
                <span className="font-medium">
                  {selectedOrder &&
                    formatCurrency(selectedOrder.total / 100, selectedOrder.currency.toUpperCase())}
                </span>
              </div>
              {selectedOrder?.refundAmount && (
                <div className="flex justify-between text-sm text-purple-600 mt-1">
                  <span>Previously Refunded</span>
                  <span>
                    {formatCurrency(
                      selectedOrder.refundAmount / 100,
                      selectedOrder.currency.toUpperCase()
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Partial Refund Amount Input */}
            {refundType === 'partial' && (
              <div className="space-y-2">
                <Label htmlFor="refundAmount">
                  Refund Amount ({selectedOrder?.currency.toUpperCase()})
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedOrder ? selectedOrder.total / 100 : undefined}
                    placeholder="0.00"
                    className="pl-7"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum refundable:{' '}
                  {selectedOrder &&
                    formatCurrency(
                      (selectedOrder.total - (selectedOrder.refundAmount || 0)) / 100,
                      selectedOrder.currency.toUpperCase()
                    )}
                </p>
              </div>
            )}

            {/* Refund Reason */}
            <div className="space-y-2">
              <Label htmlFor="refundReason">Reason (optional)</Label>
              <Input
                id="refundReason"
                placeholder="Enter refund reason..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            {/* Refund Summary */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {refundType === 'full' ? (
                  <>
                    This will refund{' '}
                    <strong>
                      {selectedOrder &&
                        formatCurrency(
                          selectedOrder.total / 100,
                          selectedOrder.currency.toUpperCase()
                        )}
                    </strong>{' '}
                    to the customer.
                  </>
                ) : (
                  <>
                    This will refund{' '}
                    <strong>
                      {refundAmount
                        ? formatCurrency(
                            parseFloat(refundAmount),
                            selectedOrder?.currency.toUpperCase() || 'USD'
                          )
                        : '$0.00'}
                    </strong>{' '}
                    to the customer.
                  </>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={processingRefund || (refundType === 'partial' && !refundAmount)}
            >
              {processingRefund ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
