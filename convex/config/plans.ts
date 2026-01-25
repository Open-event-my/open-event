export const PLANS = {
  free: {
    key: 'free',
    name: 'Free',
    maxEvents: 1,
    maxMembers: 1,
    aiDailyLimit: 10,
    price: 0,
    // Feature flags
    features: ['Basic event management', 'Community support'],
    canExportData: false,
    canCustomBranding: false,
    prioritySupport: false,
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    maxEvents: Infinity,
    maxMembers: 5,
    aiDailyLimit: Infinity,
    price: 2900, // in cents ($29/month)
    // Feature flags
    features: ['Unlimited events', 'Team collaboration', 'Unlimited AI', 'Email support'],
    canExportData: true,
    canCustomBranding: false,
    prioritySupport: false,
  },
  business: {
    key: 'business',
    name: 'Business',
    maxEvents: Infinity,
    maxMembers: 20,
    aiDailyLimit: Infinity,
    price: 9900, // in cents ($99/month)
    // Feature flags
    features: ['Everything in Pro', 'Priority support', 'Custom branding', 'API access'],
    canExportData: true,
    canCustomBranding: true,
    prioritySupport: true,
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    maxEvents: Infinity,
    maxMembers: 100,
    aiDailyLimit: Infinity,
    price: null, // Custom pricing
    // Feature flags
    features: ['Everything in Business', 'Dedicated support', 'Custom integrations', 'SLA'],
    canExportData: true,
    canCustomBranding: true,
    prioritySupport: true,
  },
} as const

export type PlanKey = keyof typeof PLANS
export type Plan = (typeof PLANS)[PlanKey]

// Helper functions
export function getPlanByKey(key: string): Plan {
  return PLANS[key as PlanKey] || PLANS.free
}

export function isUnlimited(value: number): boolean {
  return value === Infinity
}

export function formatLimit(value: number): string {
  return value === Infinity ? 'Unlimited' : String(value)
}
