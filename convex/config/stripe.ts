/**
 * Stripe Configuration
 *
 * This file contains Stripe-related configuration.
 * Price IDs should be configured in the Stripe Dashboard and set in environment variables.
 *
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Your Stripe secret key (sk_live_xxx or sk_test_xxx)
 * - STRIPE_PUBLISHABLE_KEY: Your Stripe publishable key (pk_live_xxx or pk_test_xxx)
 * - STRIPE_WEBHOOK_SECRET: Webhook endpoint secret (whsec_xxx)
 * - STRIPE_PRO_PRICE_ID: Price ID for Pro plan
 * - STRIPE_BUSINESS_PRICE_ID: Price ID for Business plan
 */

import type { PlanKey } from './plans'

/**
 * Stripe Price IDs for subscription plans
 * These should be set in environment variables for each environment
 *
 * To get these:
 * 1. Go to Stripe Dashboard > Products
 * 2. Create a product for each plan (Pro, Business)
 * 3. Add a recurring price to each product
 * 4. Copy the price ID (starts with price_)
 */
export const STRIPE_PRICE_IDS: Record<Exclude<PlanKey, 'free' | 'enterprise'>, string | null> = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? null,
  business: process.env.STRIPE_BUSINESS_PRICE_ID ?? null,
} as const

/**
 * Get the Stripe price ID for a plan
 * Returns null for free and enterprise (custom pricing)
 */
export function getStripePriceId(plan: PlanKey): string | null {
  if (plan === 'free' || plan === 'enterprise') {
    return null
  }
  return STRIPE_PRICE_IDS[plan] ?? null
}

/**
 * Get the plan key from a Stripe price ID
 */
export function getPlanFromPriceId(priceId: string): PlanKey | null {
  for (const [plan, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) {
      return plan as PlanKey
    }
  }
  return null
}

/**
 * Stripe API version to use
 */
// Cast to string to avoid specific version type dependency issues in this config file
export const STRIPE_API_VERSION = '2023-10-16' as string

/**
 * Success and cancel URLs for Stripe Checkout
 * These are relative paths - the full URL is constructed at runtime
 */
export const STRIPE_CHECKOUT_URLS = {
  success: '/dashboard/settings?tab=billing&success=true',
  cancel: '/dashboard/settings?tab=billing&canceled=true',
} as const

/**
 * Supported subscription statuses
 */
export type StripeSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'

/**
 * Check if a subscription status means the user has access
 */
export function hasActiveSubscription(status: StripeSubscriptionStatus | undefined): boolean {
  if (!status) return false
  return status === 'active' || status === 'trialing'
}

/**
 * Check if a subscription status is problematic (needs attention)
 */
export function subscriptionNeedsAttention(status: StripeSubscriptionStatus | undefined): boolean {
  if (!status) return false
  return status === 'past_due' || status === 'incomplete' || status === 'unpaid'
}
