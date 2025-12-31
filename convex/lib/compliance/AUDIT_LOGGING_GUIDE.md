# Audit Logging Integration Guide

This guide explains how to integrate audit logging into your Convex mutations for compliance and security tracking.

## Overview

The audit logging system provides:
- **Automatic audit trails** for all data operations
- **Enhanced logging** for admin actions
- **Change tracking** to capture before/after values
- **Compliance support** for GDPR and security requirements

## Quick Start

### Basic Mutation with Audit Logging

```typescript
import { v } from 'convex/values'
import { auditedMutation } from './lib/compliance/auditLogMiddleware'

export const updateEvent = auditedMutation({
  audit: { 
    action: 'update', 
    resource: 'event',
    captureChanges: true 
  },
  args: {
    id: v.id('events'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title })
    return { success: true }
  },
})
```

### Admin Mutation with Enhanced Logging

```typescript
import { v } from 'convex/values'
import { auditedAdminMutation } from './lib/compliance/auditLogMiddleware'

export const suspendUser = auditedAdminMutation({
  audit: { 
    action: 'admin_action', 
    resource: 'user',
    severity: 'high',
    captureChanges: true,
    getImpactedUsers: (args) => [args.userId]
  },
  args: {
    userId: v.id('users'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { 
      status: 'suspended',
      suspendedReason: args.reason,
      suspendedAt: Date.now()
    })
    return { success: true }
  },
})
```

## Audit Options

### action (required)
The type of operation being performed:
- `'create'` - Creating a new resource
- `'read'` - Reading/querying data (rarely audited)
- `'update'` - Modifying an existing resource
- `'delete'` - Deleting a resource
- `'export'` - Exporting user data
- `'admin_action'` - Administrative action

### resource (required)
The type of resource being operated on:
- `'user'`, `'event'`, `'vendor'`, `'sponsor'`, `'organization'`, etc.

### captureChanges (optional)
When `true`, captures before/after values for update operations:
```typescript
audit: { 
  action: 'update', 
  resource: 'event',
  captureChanges: true  // Captures old and new values
}
```

### skipAudit (optional)
When `true`, skips audit logging for this operation:
```typescript
audit: { 
  action: 'update', 
  resource: 'internal_cache',
  skipAudit: true  // Don't audit cache updates
}
```

## Admin-Specific Options

### severity (optional)
Indicates the criticality of the admin action:
- `'low'` - Routine administrative tasks
- `'medium'` - Standard admin operations
- `'high'` - Sensitive operations (user suspension, role changes)
- `'critical'` - Critical operations (data deletion, system changes)

### getImpactedUsers (optional)
Function that returns array of user IDs affected by the action:
```typescript
audit: {
  action: 'admin_action',
  resource: 'organization',
  getImpactedUsers: (args) => {
    // Return all member IDs from the organization
    return args.memberIds
  }
}
```

## Migration Guide

### Converting Existing Mutations

**Before:**
```typescript
export const updateEvent = mutation({
  args: {
    id: v.id('events'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title })
    return { success: true }
  },
})
```

**After:**
```typescript
export const updateEvent = auditedMutation({
  audit: { action: 'update', resource: 'event', captureChanges: true },
  args: {
    id: v.id('events'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title })
    return { success: true }
  },
})
```

### Using Middleware Wrapper

For more control, use the middleware wrapper directly:

```typescript
import { mutation } from './_generated/server'
import { withAuditLog } from './lib/compliance/auditLogMiddleware'

export const updateEvent = mutation({
  args: {
    id: v.id('events'),
    title: v.string(),
  },
  handler: withAuditLog(
    { action: 'update', resource: 'event', captureChanges: true },
    async (ctx, args) => {
      await ctx.db.patch(args.id, { title: args.title })
      return { success: true }
    }
  ),
})
```

## Best Practices

### 1. Always Audit Data Modifications
```typescript
// ✅ Good - Audit all creates, updates, deletes
export const createEvent = auditedMutation({
  audit: { action: 'create', resource: 'event' },
  // ...
})

// ❌ Bad - Missing audit logging
export const createEvent = mutation({
  // No audit logging
})
```

### 2. Capture Changes for Updates
```typescript
// ✅ Good - Capture what changed
export const updateUser = auditedMutation({
  audit: { 
    action: 'update', 
    resource: 'user',
    captureChanges: true  // Track old vs new values
  },
  // ...
})
```

### 3. Use Appropriate Severity for Admin Actions
```typescript
// ✅ Good - High severity for user suspension
export const suspendUser = auditedAdminMutation({
  audit: { 
    action: 'admin_action', 
    resource: 'user',
    severity: 'high'  // Appropriate severity
  },
  // ...
})

// ✅ Good - Critical severity for data deletion
export const deleteAllUserData = auditedAdminMutation({
  audit: { 
    action: 'delete', 
    resource: 'user',
    severity: 'critical'  // Highest severity
  },
  // ...
})
```

### 4. Track Impacted Users
```typescript
// ✅ Good - Track who is affected
export const deleteOrganization = auditedAdminMutation({
  audit: { 
    action: 'delete', 
    resource: 'organization',
    severity: 'high',
    getImpactedUsers: (args) => {
      // Return all member IDs
      return args.memberIds
    }
  },
  // ...
})
```

### 5. Skip Audit for Internal Operations
```typescript
// ✅ Good - Skip audit for cache updates
export const updateCache = auditedMutation({
  audit: { 
    action: 'update', 
    resource: 'cache',
    skipAudit: true  // Don't audit internal cache
  },
  // ...
})
```

## Querying Audit Logs

### Query by User
```typescript
import { internal } from './_generated/api'

const userLogs = await ctx.runQuery(internal.auditLog.getByUser, {
  userId: 'user_123',
  limit: 100
})
```

### Query by Action
```typescript
const deleteLogs = await ctx.runQuery(internal.auditLog.getByAction, {
  action: 'delete',
  limit: 50
})
```

### Query by Resource
```typescript
const eventLogs = await ctx.runQuery(internal.auditLog.getByResource, {
  resource: 'event',
  resourceId: 'event_456',
  limit: 100
})
```

### Get Security Events
```typescript
const securityEvents = await ctx.runQuery(internal.auditLog.getSecurityEvents, {
  hoursBack: 24,
  limit: 100
})
```

## Compliance Requirements

### GDPR Article 30 - Records of Processing Activities
All data operations are automatically logged with:
- User identity
- Action performed
- Resource affected
- Timestamp
- Changes made (if enabled)

### Security Auditing
Admin actions are logged with enhanced detail:
- Admin identity and role
- Severity level
- Impacted users
- Full change history

### Data Retention
Audit logs are retained for 90 days by default. A cron job automatically cleans up old logs:
```typescript
// Configured in convex/crons.ts
crons.daily('cleanup-audit-logs', { hourUTC: 3, minuteUTC: 0 }, 
  internal.auditLog.cleanupOldLogs, {})
```

## Troubleshooting

### Audit Logging Fails Silently
Audit logging is designed to never fail the main operation. If logging fails, an error is logged to console but the mutation continues.

### Missing Audit Logs
Check that:
1. User is authenticated (audit requires identity)
2. `skipAudit` is not set to `true`
3. The mutation is wrapped with audit middleware

### Resource ID Not Captured
Ensure your mutation returns the resource ID or includes it in args:
```typescript
handler: async (ctx, args) => {
  const id = await ctx.db.insert('events', { title: args.title })
  return id  // Return ID so it can be captured
}
```

## Examples

See the following files for complete examples:
- `convex/lib/compliance/dataExport.ts` - Data export with audit logging
- `convex/lib/compliance/dataDeletion.ts` - Data deletion with audit logging
- `convex/admin.ts` - Admin actions with enhanced logging
