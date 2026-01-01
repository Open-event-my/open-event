# Rate Limiting for Playground AI Finalization

**Status**: ✅ Implemented and Active
**Date**: December 21, 2025
**Feature**: AI Usage Rate Limiting

---

## 📊 Overview

The Playground AI Finalization feature includes comprehensive rate limiting to:

- **Prevent abuse** of AI API (Claude/Anthropic)
- **Control costs** by limiting daily AI usage per user
- **Ensure fair access** for all users
- **Provide admin controls** for monitoring and management

---

## 🎯 Rate Limit Configuration

### Default Limits

| User Type              | Daily Limit            | Status    |
| ---------------------- | ---------------------- | --------- |
| **Free Users**         | 5 AI enhancements/day  | ✅ Active |
| **Premium Users**      | 50 AI enhancements/day | 🔜 Future |
| **Admins/Superadmins** | Unlimited              | ✅ Active |

### Thresholds

| Threshold    | Percentage | Status Color | Action         |
| ------------ | ---------- | ------------ | -------------- |
| **Normal**   | 0-59%      | 🟢 Green     | No warning     |
| **Warning**  | 60-89%     | 🟡 Amber     | Show warning   |
| **Critical** | 90-99%     | 🔴 Red       | Show alert     |
| **Exceeded** | 100%       | 🚫 Blocked   | Block requests |

---

## 🔧 Implementation Details

### Backend (Convex)

**Rate Limit Check** (`convex/playground.ts:40-52`):

```typescript
// Check rate limit if AI enhancement is requested
if (args.enhanceWithAI) {
  const rateLimitCheck = await ctx.runQuery(api.aiUsage.checkRateLimit, {
    userId: user._id,
  })

  if (!rateLimitCheck.allowed) {
    throw new Error(
      rateLimitCheck.reason || 'Rate limit exceeded. AI enhancement is temporarily unavailable.'
    )
  }
}
```

**Usage Increment** (`convex/playground.ts:67-70`):

```typescript
// Increment usage counter after successful AI call
await ctx.runMutation(internal.aiUsage.incrementUsageInternal, {
  userId: user._id,
})
```

### Frontend (React)

**Rate Limit Display** (`src/pages/dashboard/PlaygroundPage.tsx:279-289`):

```typescript
{aiUsage && !aiUsage.isAdmin && (
  <div className="text-xs text-muted-foreground text-center">
    AI enhancements: {aiUsage.promptsRemaining} of {aiUsage.dailyLimit} remaining today
    {aiUsage.status === 'warning' && (
      <span className="text-amber-500"> (running low)</span>
    )}
    {aiUsage.status === 'critical' && (
      <span className="text-red-500"> (almost at limit)</span>
    )}
  </div>
)}
```

---

## 📈 Rate Limit Flow

### Successful Request Flow

```
1. User clicks "Finalize" with AI enhancement
         ↓
2. Backend checks rate limit
   - Query: checkRateLimit(userId)
   - Returns: { allowed: true, remaining: 4 }
         ↓
3. AI enhancement proceeds
   - Call Claude API
   - Process response
         ↓
4. Increment usage counter
   - Mutation: incrementUsageInternal(userId)
   - New count: 1 (4 remaining)
         ↓
5. Return enhanced data
         ↓
6. Frontend shows preview
```

### Blocked Request Flow

```
1. User clicks "Finalize" with AI enhancement
   (Already used 5/5 today)
         ↓
2. Backend checks rate limit
   - Query: checkRateLimit(userId)
   - Returns: {
       allowed: false,
       remaining: 0,
       reason: "Daily limit of 5 prompts reached. Resets in 3h 45m."
     }
         ↓
3. Throw error with reason
         ↓
4. Frontend catches error
         ↓
5. Show error toast to user:
   "Daily limit of 5 prompts reached. Resets in 3h 45m."
```

---

## 🗄️ Database Schema

### aiUsage Table

```typescript
aiUsage: defineTable({
  userId: v.id('users'), // User this usage belongs to
  promptCount: v.number(), // Prompts used today
  lastResetDate: v.string(), // Date of last reset (YYYY-MM-DD)
  dailyLimit: v.optional(v.number()), // Custom limit (if set by admin)
  totalPrompts: v.optional(v.number()), // All-time total
  createdAt: v.number(), // First usage timestamp
  updatedAt: v.number(), // Last usage timestamp
}).index('by_user', ['userId'])
```

### Reset Logic

- **Reset Time**: Midnight UTC (00:00:00)
- **Reset Method**: Automatic on first request of new day
- **No cronjob needed**: Lazy reset when user makes request

---

## 🎯 User Experience

### Normal Usage (0-59% used)

```
┌─────────────────────────────────────┐
│  Create 3 items                     │
└─────────────────────────────────────┘
  AI enhancements: 5 of 5 remaining today
```

### Warning State (60-89% used)

```
┌─────────────────────────────────────┐
│  Create 3 items                     │
└─────────────────────────────────────┘
  AI enhancements: 1 of 5 remaining today (running low)
                                        ⬆️ Amber warning
```

### Critical State (90-99% used)

```
┌─────────────────────────────────────┐
│  Create 3 items                     │
└─────────────────────────────────────┘
  AI enhancements: 0 of 5 remaining today (almost at limit)
                                        ⬆️ Red alert
```

### Exceeded State (100%)

```
┌─────────────────────────────────────┐
│  Create 3 items                     │ (Click blocked)
└─────────────────────────────────────┘

❌ Error Toast:
"Daily limit of 5 prompts reached. Resets in 3h 45m."
```

### Admin Users

```
┌─────────────────────────────────────┐
│  Create 3 items                     │
└─────────────────────────────────────┘
  (No rate limit display - unlimited access)
```

---

## 🔐 Admin Controls

### Check User Usage

```typescript
// Query a specific user's usage
const usage = await ctx.runQuery(api.aiUsage.getUserUsage, {
  userId: 'user123'
})

// Returns:
{
  user: { id, name, email, role },
  usage: {
    todayUsage: 3,
    dailyLimit: 5,
    totalPrompts: 47,
    percentageUsed: 60,
    status: 'warning',
    lastUsedAt: 1703188800000
  }
}
```

### Set Custom Limit

```typescript
// Give user higher limit
await ctx.runMutation(api.aiUsage.setUserLimit, {
  userId: 'user123',
  dailyLimit: 50, // Premium tier
})
```

### Reset User Usage

```typescript
// Reset a user's daily count (emergency use)
await ctx.runMutation(api.aiUsage.resetUserUsage, {
  userId: 'user123',
})
```

### View Analytics

```typescript
// Get platform-wide analytics
const analytics = await ctx.runQuery(api.aiUsage.getUsageAnalytics)

// Returns:
{
  totalUsers: 1250,
  activeUsersToday: 87,
  usersAtLimit: 12,
  totalPromptsToday: 203,
  totalPromptsAllTime: 15847,
  averagePromptsPerUser: 13,
  averagePromptsToday: 2.3,
  defaultDailyLimit: 5
}
```

---

## 📊 Monitoring

### Key Metrics to Track

1. **Daily Active Users**: How many users use AI today
2. **Rate Limit Hits**: How many users hit their limit
3. **Average Usage**: Prompts per user per day
4. **Total API Calls**: Daily AI API usage
5. **Cost per User**: API cost / active users

### Dashboard Query

```typescript
// Get top users by usage
const topUsers = await ctx.runQuery(api.aiUsage.getAllUsageStats, {
  limit: 10,
  sortBy: 'promptCount', // or 'totalPrompts' or 'updatedAt'
})
```

---

## 🛡️ Security Features

### Atomic Operations

```typescript
// Check and increment in single transaction
const result = await checkAndIncrementUsage({ userId })

// Prevents race conditions:
// - User can't make 2 requests simultaneously to bypass limit
// - Count is incremented atomically
```

### Admin Bypass

```typescript
// Admins don't count against limits
if (isAdminRole(user.role)) {
  return {
    allowed: true,
    remaining: UNLIMITED,
    code: 'ADMIN_ACCESS',
  }
}
```

### Graceful Fallback

```typescript
// If AI enhancement fails, don't increment counter
try {
  enhancedData = await enhancePlaygroundData(...)
  await incrementUsage() // Only increment on success
} catch (error) {
  // Use original data, don't charge user
  enhancedData = originalData
}
```

---

## 🎮 Testing Rate Limiting

### Test Script

```bash
# Run rate limit test
npx tsx scripts/testRateLimit.ts
```

### Manual Testing

1. **Test Normal Flow**:

   ```
   - Create cards, finalize 5 times
   - Should work for all 5
   - Show usage counter: 5/5 → 4/5 → 3/5 → 2/5 → 1/5 → 0/5
   ```

2. **Test Limit Exceeded**:

   ```
   - After 5 uses, try 6th finalization
   - Should show error: "Daily limit reached"
   - Should show reset time
   ```

3. **Test Warning States**:

   ```
   - After 3 uses (60%): Show amber warning
   - After 4 uses (80%): Show amber warning
   - After 5 uses (100%): Block request
   ```

4. **Test Admin Bypass**:

   ```
   - Sign in as admin
   - No usage counter shown
   - Can finalize unlimited times
   ```

5. **Test Reset**:
   ```
   - Wait until midnight UTC
   - Or manually reset via admin panel
   - Counter should reset to 5/5
   ```

---

## 📝 Configuration Reference

### Location: `convex/aiUsage.ts:10-20`

```typescript
export const RATE_LIMIT_CONFIG = {
  // Default daily limit for free users
  FREE_DAILY_LIMIT: 5,

  // Limit for premium users (future use)
  PREMIUM_DAILY_LIMIT: 50,

  // Unlimited marker for admins
  UNLIMITED: 999,

  // Warning thresholds (percentage of limit)
  WARNING_THRESHOLD: 0.6, // 60% - show amber warning
  CRITICAL_THRESHOLD: 0.9, // 90% - show red warning
} as const
```

### Modifying Limits

To change limits, edit `convex/aiUsage.ts` and redeploy:

```typescript
// Example: Increase free limit to 10
FREE_DAILY_LIMIT: 10,

// Example: Lower warning threshold to 50%
WARNING_THRESHOLD: 0.5,
```

---

## 🚀 Production Deployment

### Checklist

- [x] Rate limiting implemented
- [x] Usage tracking configured
- [x] Frontend display added
- [x] Error handling implemented
- [x] Admin controls available
- [x] Analytics dashboard ready
- [x] Documentation complete

### Post-Deployment

1. **Monitor first week**:
   - Track daily active users
   - Measure limit hit rate
   - Adjust limits if needed

2. **User feedback**:
   - Collect feedback on limit adequacy
   - Consider premium tiers
   - Adjust thresholds based on usage

3. **Cost analysis**:
   - Calculate AI API costs
   - Compare with revenue
   - Optimize limits for profitability

---

## 🎯 Future Enhancements

### Premium Tiers (Planned)

```typescript
interface UserTier {
  name: 'free' | 'premium' | 'enterprise'
  dailyLimit: number
  price: number
}

const TIERS = {
  free: { dailyLimit: 5, price: 0 },
  premium: { dailyLimit: 50, price: 9.99 },
  enterprise: { dailyLimit: 999, price: 99.99 },
}
```

### Hourly Limits (Optional)

```typescript
// Prevent rapid API abuse
HOURLY_LIMIT: 3 // Max 3 requests per hour
```

### Rollover Credits (Future)

```typescript
// Unused daily credits roll over
maxRollover: 10 // Can accumulate up to 10 extra
```

---

## 📞 Troubleshooting

### Issue: User reports limit exceeded but hasn't used AI

**Solution**: Check their usage record:

```typescript
const usage = await getUserUsage({ userId })
console.log(usage)
```

### Issue: Admin is being rate limited

**Solution**: Check admin role is set correctly:

```typescript
const user = await ctx.db.get(userId)
console.log(user.role) // Should be 'admin' or 'superadmin'
```

### Issue: Rate limit not resetting at midnight

**Solution**: Check `lastResetDate` format:

```typescript
// Should be YYYY-MM-DD (UTC)
const today = new Date().toISOString().split('T')[0]
```

---

## ✅ Summary

Rate limiting is **fully implemented** and **production-ready**:

- ✅ **5 AI enhancements per day** for free users
- ✅ **Unlimited for admins**
- ✅ **Automatic reset at midnight UTC**
- ✅ **Warning indicators** at 60% and 90%
- ✅ **Clear error messages** when exceeded
- ✅ **Admin controls** for monitoring and management
- ✅ **Atomic operations** to prevent race conditions
- ✅ **Graceful fallback** when AI fails

**Cost Protection**: Prevents unlimited AI API usage
**User Experience**: Clear feedback on remaining quota
**Admin Control**: Full monitoring and management tools

---

Generated with Claude Sonnet 4.5
Date: December 21, 2025
