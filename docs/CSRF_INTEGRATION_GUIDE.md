# CSRF Protection Integration Guide

This guide explains how to integrate CSRF (Cross-Site Request Forgery) protection into the Open Event platform.

## Overview

CSRF protection has been implemented to secure all state-changing operations. This document provides step-by-step instructions for integrating CSRF protection into your mutations and frontend components.

## Architecture

### Backend Components

1. **CSRF Service** (`convex/lib/security/csrf.ts`)
   - Token generation and validation
   - Token storage in database
   - Automatic expiration handling

2. **Database Schema** (`convex/schema.ts`)
   - `csrfTokens` table for storing tokens
   - Indexed by user and token for fast lookups

3. **Helper Functions**
   - `requireValidCSRFToken()` - Validates tokens in mutations
   - `generateCSRFToken()` - Creates new tokens
   - `cleanupExpiredTokens()` - Removes expired tokens

### Frontend Components

1. **CSRF Hook** (`src/hooks/useCSRF.ts`)
   - Token management
   - Auto-refresh before expiration
   - Session storage integration

2. **CSRF Context** (`src/contexts/CSRFContext.tsx`)
   - Application-wide token provider
   - Loading and error states
   - Guard component for protected forms

## Integration Steps

### Step 1: Add CSRF Provider to App

Wrap your application with the CSRF provider:

```tsx
// src/App.tsx or src/main.tsx
import { CSRFProvider } from './contexts/CSRFContext';

function App() {
  return (
    <ConvexProvider client={convex}>
      <CSRFProvider>
        <YourApp />
      </CSRFProvider>
    </ConvexProvider>
  );
}
```

### Step 2: Update Backend Mutations

Add CSRF protection to all state-changing mutations:

```typescript
// convex/events.ts
import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { requireValidCSRFToken } from './lib/security/csrf';

export const createEvent = mutation({
  args: {
    csrfToken: v.string(), // Add CSRF token argument
    title: v.string(),
    description: v.optional(v.string()),
    // ... other args
  },
  handler: async (ctx, args) => {
    // Validate CSRF token FIRST
    await requireValidCSRFToken(ctx, args.csrfToken);
    
    // Continue with mutation logic
    const eventId = await ctx.db.insert('events', {
      title: args.title,
      description: args.description,
      // ...
    });
    
    return eventId;
  },
});
```

### Step 3: Update Frontend Components

Use the CSRF token in your mutation calls:

```tsx
// src/components/events/CreateEventForm.tsx
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCSRFToken } from '../../hooks/useCSRF';

function CreateEventForm() {
  const createEvent = useMutation(api.events.createEvent);
  const csrfToken = useCSRFToken();
  
  const handleSubmit = async (data: FormData) => {
    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }
    
    try {
      await createEvent({
        csrfToken, // Include CSRF token
        title: data.title,
        description: data.description,
        // ...
      });
      toast.success('Event created successfully');
    } catch (error) {
      if (error.code === 'CSRF_TOKEN_EXPIRED') {
        toast.error('Your session has expired. Please refresh and try again.');
      } else {
        toast.error('Failed to create event');
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Step 4: Handle CSRF Errors

Implement proper error handling for CSRF-related errors:

```tsx
import { useCSRFContext } from '../../contexts/CSRFContext';

function MyComponent() {
  const { csrfToken, refreshToken } = useCSRFContext();
  const myMutation = useMutation(api.myModule.myMutation);
  
  const handleAction = async () => {
    try {
      await myMutation({ csrfToken, /* other args */ });
    } catch (error) {
      switch (error.code) {
        case 'CSRF_TOKEN_MISSING':
          toast.error('Security token missing. Please refresh the page.');
          break;
        case 'CSRF_TOKEN_INVALID':
          toast.error('Invalid security token. Please refresh the page.');
          await refreshToken();
          break;
        case 'CSRF_TOKEN_EXPIRED':
          toast.error('Your session has expired. Please try again.');
          await refreshToken();
          break;
        default:
          toast.error('An error occurred. Please try again.');
      }
    }
  };
}
```

## Which Mutations Need CSRF Protection?

### ✅ Require CSRF Protection

All mutations that:
- Create, update, or delete data
- Change user state or permissions
- Perform financial transactions
- Send emails or notifications
- Modify system configuration
- Add/remove relationships between entities

Examples:
- `createEvent`, `updateEvent`, `deleteEvent`
- `createVendor`, `updateVendor`, `deleteVendor`
- `createOrder`, `processPayment`, `refundOrder`
- `inviteMember`, `removeMember`, `updateRole`
- `sendNotification`, `sendEmail`

### ❌ Don't Need CSRF Protection

- Read-only queries (they use `query()` not `mutation()`)
- Public data fetching
- Authentication mutations (login/signup have their own protection)

## Testing CSRF Protection

### Unit Tests

Run the property-based tests:

```bash
npm run test:run -- convex/lib/security/csrf.property.test.ts
```

### Manual Testing

1. **Valid Token Test**
   - Create a form that calls a protected mutation
   - Submit the form with a valid CSRF token
   - Verify the operation succeeds

2. **Invalid Token Test**
   - Modify the CSRF token in session storage
   - Submit the form
   - Verify you get a `CSRF_TOKEN_INVALID` error

3. **Expired Token Test**
   - Set the token expiration to the past in session storage
   - Submit the form
   - Verify you get a `CSRF_TOKEN_EXPIRED` error

4. **Missing Token Test**
   - Clear the CSRF token from session storage
   - Submit the form
   - Verify you get a `CSRF_TOKEN_MISSING` error

## Migration Checklist

Use this checklist when adding CSRF protection to existing mutations:

- [ ] Add `csrfToken: v.string()` to mutation args
- [ ] Add `await requireValidCSRFToken(ctx, args.csrfToken);` at start of handler
- [ ] Update all frontend calls to include `csrfToken`
- [ ] Add error handling for CSRF errors
- [ ] Test with valid token
- [ ] Test with invalid token
- [ ] Test with expired token
- [ ] Test with missing token
- [ ] Update API documentation
- [ ] Add integration tests

## Common Issues and Solutions

### Issue: "CSRF token not available"

**Cause**: CSRF provider not initialized or token generation failed

**Solution**:
1. Ensure `CSRFProvider` wraps your app
2. Check browser console for errors
3. Verify user is authenticated
4. Try refreshing the page

### Issue: "CSRF_TOKEN_EXPIRED" errors

**Cause**: Token expired (> 24 hours old) or system time mismatch

**Solution**:
1. Call `refreshToken()` to get a new token
2. Implement auto-refresh before expiration
3. Check system time is correct

### Issue: "CSRF_TOKEN_INVALID" errors

**Cause**: Token doesn't match user or was tampered with

**Solution**:
1. Clear session storage and refresh
2. Verify token is being sent correctly
3. Check for token modification in transit

## Performance Considerations

### Token Storage

- Tokens are stored in session storage (not localStorage)
- Session storage is cleared when tab closes
- Tokens are automatically cleaned up after expiration

### Database Queries

- Token validation uses indexed queries for fast lookups
- Expired tokens are cleaned up via cron job
- One token per user reduces database size

### Network Overhead

- CSRF token adds ~32 bytes to each mutation request
- Minimal impact on performance
- Token is reused across multiple requests

## Security Best Practices

1. **Always validate first**: Call `requireValidCSRFToken()` before any other logic
2. **Don't skip validation**: Even for "internal" mutations
3. **Store securely**: Use session storage, not localStorage
4. **Rotate regularly**: Tokens auto-refresh before expiration
5. **Handle errors gracefully**: Provide clear user feedback
6. **Test thoroughly**: Use property-based tests for comprehensive coverage
7. **Monitor failures**: Log CSRF validation failures for security analysis

## Additional Resources

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Convex Security Best Practices](https://docs.convex.dev/security)
- Property-based tests: `convex/lib/security/csrf.property.test.ts`
- Example implementations: `convex/lib/security/csrf-example.ts`
- Security README: `convex/lib/security/README.md`

## Support

If you encounter issues with CSRF protection:

1. Check this guide for common solutions
2. Review the example implementations
3. Run the property-based tests
4. Check browser console for errors
5. Verify Convex backend logs
6. Open an issue on GitHub with details
