/**
 * Order Data Transfer Objects (DTOs)
 *
 * Provides role-based field filtering for order/payment data.
 * Prevents exposure of:
 * - Payment tokens and Stripe IDs
 * - Full buyer contact information
 * - Internal order processing details
 * - Revenue statistics
 *
 * SECURITY: PCI DSS compliance - never expose full payment data.
 */

import type { Doc } from '../../../_generated/dataModel'

// ============================================================================
// VISIBILITY CONFIGURATIONS
// ============================================================================

/**
 * Field visibility levels for orders
 */
export const ORDER_VISIBILITY = {
  /**
   * BUYER - Person who placed the order
   * Their own order details (not payment tokens)
   */
  buyer: [
    '_id',
    '_creationTime',
    'eventId',
    'buyerEmail',
    'buyerName',
    'buyerPhone',
    'items',
    'subtotal',
    'discount',
    'fees',
    'total',
    'currency',
    'promoCodeCode',
    'paymentStatus',
    'paymentMethod',
    'orderNumber',
    'notes',
    'isPartialRefund',
    'createdAt',
    'paidAt',
    'refundedAt',
  ] as const,

  /**
   * ORGANIZER - Event creator
   * Order details for their events (no Stripe tokens)
   */
  organizer: [
    '_id',
    '_creationTime',
    'eventId',
    'buyerEmail',
    'buyerName',
    'buyerPhone',
    'items',
    'subtotal',
    'discount',
    'fees',
    'total',
    'currency',
    'promoCodeId',
    'promoCodeCode',
    'paymentStatus',
    'paymentMethod',
    'orderNumber',
    'notes',
    'refundAmount',
    'refundReason',
    'isPartialRefund',
    'createdAt',
    'paidAt',
    'refundedAt',
    'expiresAt',
  ] as const,

  /**
   * ADMIN - Platform administrators
   * All fields including Stripe references for debugging
   */
  admin: ['*'] as const,
} as const

export type OrderVisibilityLevel = keyof typeof ORDER_VISIBILITY

// ============================================================================
// DTO TYPES
// ============================================================================

/**
 * Buyer order DTO - their own orders
 */
export type BuyerOrderDTO = Pick<
  Doc<'orders'>,
  (typeof ORDER_VISIBILITY.buyer)[number]
>

/**
 * Organizer order DTO - orders for their events
 */
export type OrganizerOrderDTO = Pick<
  Doc<'orders'>,
  (typeof ORDER_VISIBILITY.organizer)[number]
>

/**
 * Admin order DTO - all fields
 */
export type AdminOrderDTO = Doc<'orders'>

/**
 * Union of all order DTO types
 */
export type OrderDTO = BuyerOrderDTO | OrganizerOrderDTO | AdminOrderDTO

// ============================================================================
// DTO CREATION FUNCTIONS
// ============================================================================

/**
 * Create an order DTO with appropriate field filtering
 *
 * @param order - Full order document
 * @param viewer - Visibility level
 * @returns Filtered order object
 *
 * @example
 * // Buyer viewing their own order
 * const buyerOrder = createOrderDTO(order, 'buyer')
 * console.log(buyerOrder.stripePaymentIntentId) // undefined - not exposed
 *
 * // Event organizer viewing orders
 * const organizerOrder = createOrderDTO(order, 'organizer')
 * console.log(organizerOrder.buyerEmail) // defined - visible
 * console.log(organizerOrder.stripePaymentIntentId) // undefined - not exposed
 *
 * // Admin viewing for debugging
 * const adminOrder = createOrderDTO(order, 'admin')
 * console.log(adminOrder.stripePaymentIntentId) // defined - visible to admin
 */
export function createOrderDTO(
  order: Doc<'orders'>,
  viewer: OrderVisibilityLevel
): OrderDTO {
  // Admin sees everything
  if (viewer === 'admin') {
    return order
  }

  const allowedFields = ORDER_VISIBILITY[viewer]
  const filtered: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in order) {
      filtered[field] = order[field as keyof Doc<'orders'>]
    }
  }

  return filtered as OrderDTO
}

/**
 * Create order DTOs for an array of orders
 *
 * @param orders - Array of order documents
 * @param viewer - Visibility level
 * @returns Array of filtered order objects
 */
export function createOrderDTOs(
  orders: Doc<'orders'>[],
  viewer: OrderVisibilityLevel
): OrderDTO[] {
  return orders.map((order) => createOrderDTO(order, viewer))
}

// ============================================================================
// ORDER STATISTICS DTOs
// ============================================================================

/**
 * Order statistics for event organizers
 * Aggregated data without exposing individual buyer PII
 */
export interface OrderStatsDTO {
  // Revenue
  totalRevenue: number
  totalRefunded: number
  netRevenue: number
  currency: string

  // Order counts
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  failedOrders: number
  refundedOrders: number

  // Ticket sales
  totalTicketsSold: number
  ticketsByType: Array<{
    ticketTypeId: string
    ticketTypeName: string
    quantitySold: number
    revenue: number
  }>

  // Promo codes
  promoCodesUsed: number
  totalDiscounts: number

  // Fees
  totalFees: number
  platformFeeTotal: number
}

/**
 * Create order statistics DTO
 *
 * SECURITY: Aggregates data to prevent buyer enumeration
 *
 * @param orders - Array of completed orders
 * @param currency - Expected currency for the event
 * @returns Aggregated statistics
 */
export function createOrderStatsDTO(
  orders: Doc<'orders'>[],
  currency: string
): OrderStatsDTO {
  const completedOrders = orders.filter((o) => o.paymentStatus === 'completed')
  const refundedOrders = orders.filter((o) => o.paymentStatus === 'refunded')

  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
  const totalRefunded = refundedOrders.reduce(
    (sum, o) => sum + (o.refundAmount || o.total),
    0
  )
  const totalFees = completedOrders.reduce((sum, o) => sum + o.fees, 0)
  const totalDiscounts = completedOrders.reduce(
    (sum, o) => sum + (o.discount || 0),
    0
  )

  // Aggregate tickets by type
  const ticketTypeMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >()

  for (const order of completedOrders) {
    for (const item of order.items) {
      const existing = ticketTypeMap.get(item.ticketTypeId)
      if (existing) {
        existing.quantity += item.quantity
        existing.revenue += item.subtotal
      } else {
        ticketTypeMap.set(item.ticketTypeId, {
          name: item.ticketTypeName,
          quantity: item.quantity,
          revenue: item.subtotal,
        })
      }
    }
  }

  const ticketsByType = Array.from(ticketTypeMap.entries()).map(
    ([id, data]) => ({
      ticketTypeId: id,
      ticketTypeName: data.name,
      quantitySold: data.quantity,
      revenue: data.revenue,
    })
  )

  const totalTicketsSold = ticketsByType.reduce(
    (sum, t) => sum + t.quantitySold,
    0
  )

  const promoCodesUsed = completedOrders.filter((o) => o.promoCodeId).length

  return {
    totalRevenue,
    totalRefunded,
    netRevenue: totalRevenue - totalRefunded,
    currency,
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    pendingOrders: orders.filter((o) => o.paymentStatus === 'pending').length,
    failedOrders: orders.filter((o) => o.paymentStatus === 'failed').length,
    refundedOrders: refundedOrders.length,
    totalTicketsSold,
    ticketsByType,
    promoCodesUsed,
    totalDiscounts,
    totalFees,
    platformFeeTotal: Math.round(totalFees * 0.029), // Example: 2.9% platform fee
  }
}
