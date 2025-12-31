# Security Library

This directory contains security-related utilities for the Open Event platform.

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection is implemented to secure all state-changing operations.

### How to Use CSRF Protection

#### 1. Generate CSRF Token (Frontend)

When a user logs in or starts a session, generate a CSRF token:

```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

function MyComponent() {
  const generateToken = useMutation(api.lib.security.csrf.generateCSRFToken);
  
  useEffect(() => {
    const initCSRF = async () => {
      const { token } = await generateToken();
      // Store token in state or context
      setCSRFToken(token);
    };
    initCSRF();
  }, []);
}
```

#### 2. Include CSRF Token in Mutations

Add `csrfToken` as a required argument to all state-changing mutations:

```typescript
// convex/events.ts
import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { requireValidCSRFToken } from './lib/security/csrf';

export const createEvent = mutation({
  args: {
    csrfToken: v.string(), // Required CSRF token
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

#### 3. Send CSRF Token from Frontend

Include the CSRF token when calling mutations:

```typescript
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

function CreateEventForm() {
  const createEvent = useMutation(api.events.createEvent);
  const csrfToken = useCSRFToken(); // Get from context/state
  
  const handleSubmit = async (data) => {
    await createEvent({
      csrfToken, // Include CSRF token
      title: data.title,
      description: data.description,
      // ...
    });
  };
}
```

### Which Mutations Need CSRF Protection?

Apply CSRF protection to ALL mutations that:
- Create, update, or delete data
- Change user state or permissions
- Perform financial transactions
- Send emails or notifications
- Modify system configuration

**Exceptions** (queries don't need CSRF protection):
- Read-only queries
- Public data fetching
- Authentication mutations (login/signup already have their own protection)

### Token Lifecycle

- **Generation**: Tokens are generated when a user authenticates
- **Expiration**: Tokens expire after 24 hours
- **Rotation**: Generating a new token invalidates the previous one
- **Cleanup**: Expired tokens are automatically cleaned up via cron job

### Security Best Practices

1. **Always validate first**: Call `requireValidCSRFToken()` at the start of your mutation handler
2. **Don't skip validation**: Even for "internal" mutations, always validate
3. **Store securely**: Store tokens in memory or secure storage, never in localStorage
4. **Rotate regularly**: Generate new tokens periodically or after sensitive operations
5. **Handle errors**: Provide clear error messages when tokens are invalid or expired

### Error Codes

- `CSRF_TOKEN_MISSING`: No token provided in the request
- `CSRF_TOKEN_INVALID`: Token doesn't exist or doesn't match user
- `CSRF_TOKEN_EXPIRED`: Token has expired (> 24 hours old)
- `UNAUTHORIZED`: User is not authenticated

### Testing

Property-based tests ensure CSRF protection works correctly across all scenarios:

```bash
npm run test:run -- convex/lib/security/csrf.property.test.ts
```

### Migration Guide

To add CSRF protection to existing mutations:

1. Add `csrfToken: v.string()` to the mutation args
2. Add `await requireValidCSRFToken(ctx, args.csrfToken);` at the start of the handler
3. Update frontend calls to include the CSRF token
4. Test thoroughly before deploying

### Example: Complete Implementation

```typescript
// Backend (convex/events.ts)
export const updateEvent = mutation({
  args: {
    csrfToken: v.string(),
    eventId: v.id('events'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Validate CSRF token
    await requireValidCSRFToken(ctx, args.csrfToken);
    
    // 2. Validate user permissions
    const user = await getCurrentUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (event.organizerId !== user._id) {
      throw new Error('Access denied');
    }
    
    // 3. Perform update
    await ctx.db.patch(args.eventId, {
      title: args.title,
      description: args.description,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Frontend (src/components/events/EditEventForm.tsx)
function EditEventForm({ eventId }) {
  const updateEvent = useMutation(api.events.updateEvent);
  const { csrfToken } = useCSRF();
  
  const handleSubmit = async (data) => {
    try {
      await updateEvent({
        csrfToken,
        eventId,
        title: data.title,
        description: data.description,
      });
      toast.success('Event updated');
    } catch (error) {
      if (error.code === 'CSRF_TOKEN_EXPIRED') {
        // Refresh token and retry
        await refreshCSRFToken();
        toast.error('Session expired. Please try again.');
      } else {
        toast.error('Failed to update event');
      }
    }
  };
}
```

## Future Security Features

- Input sanitization (XSS prevention)
- Rate limiting
- Encryption service
- Security headers configuration
