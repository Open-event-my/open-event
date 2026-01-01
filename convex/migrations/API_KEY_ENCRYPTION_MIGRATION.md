# API Key Encryption Migration Guide

## Overview

This migration transitions the API key storage system from hash-based storage to encrypted storage, providing enhanced security and the ability to retrieve API keys when needed (with proper authentication).

## Why This Migration?

**Previous Approach (Hashing):**

- API keys were hashed using SHA-256 before storage
- Keys could not be retrieved after creation
- Users had to save keys immediately or regenerate them

**New Approach (Encryption):**

- API keys are encrypted using AES-256-GCM before storage
- Keys can be securely retrieved by authenticated users
- Enhanced security with authenticated encryption
- Meets compliance requirements (Requirements 1.5, 3.7, 4.7)

## Important Notes

⚠️ **CRITICAL**: Existing hashed API keys CANNOT be migrated to encrypted storage because hashing is a one-way operation. Users must regenerate their API keys.

## Migration Steps

### Step 1: Set Up Encryption Key

Add the encryption master key to your environment variables:

```bash
# .env.local (for development)
ENCRYPTION_KEY=your-32-character-or-longer-secret-key-here

# For production, set this in your Convex dashboard:
# Settings > Environment Variables > ENCRYPTION_KEY
```

**Requirements:**

- Key must be at least 32 characters long
- Use a cryptographically secure random string
- Store securely (never commit to version control)

**Generate a secure key:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL
openssl rand -base64 32
```

### Step 2: Deploy Schema Changes

The schema has been updated to support both encrypted and hashed keys:

```typescript
// New fields (encrypted storage)
encryptedKey: v.optional(v.string()),
encryptionIV: v.optional(v.string()),
encryptionTag: v.optional(v.string()),
encryptionSalt: v.optional(v.string()),

// Legacy field (backward compatibility)
keyHash: v.optional(v.string()),
```

Deploy the schema changes:

```bash
npm run dev:backend  # or npx convex dev
```

### Step 3: Run Migration Script

Mark existing API keys for regeneration:

```bash
# In Convex dashboard, run the migration function:
# Functions > migrations > markApiKeysForRegeneration
```

This will:

- Add a migration notice to all existing API keys
- Inform users they need to regenerate their keys
- Keep existing keys active during transition period

### Step 4: Notify Users

Send notifications to users with active API keys:

**Email Template:**

```
Subject: Action Required: Regenerate Your API Keys

We've upgraded our API key security system to use encrypted storage.

Action Required:
1. Log in to your account
2. Go to Settings > API Keys
3. Create new API keys to replace existing ones
4. Update your applications with the new keys
5. Delete old keys once migration is complete

Your existing keys will continue to work during the transition period,
but we recommend regenerating them as soon as possible for enhanced security.

Questions? Contact support@yourdomain.com
```

### Step 5: Monitor Migration Progress

Check migration status:

```bash
# In Convex dashboard:
# Functions > migrations > getMigrationStatus
```

Returns:

```json
{
  "totalKeys": 150,
  "activeKeys": 120,
  "unmigratedKeys": 45,
  "migratedKeys": 75,
  "migrationProgress": 62
}
```

### Step 6: Clean Up (After Transition Period)

After giving users sufficient time (recommended: 30-90 days), revoke unmigrated keys:

```bash
# In Convex dashboard:
# Functions > migrations > revokeUnmigratedApiKeys
```

This will:

- Revoke all keys that still have the migration notice
- Force users to regenerate their keys

## Testing the Migration

### Test New Key Creation

```typescript
// Create a new API key (will use encryption)
const result = await ctx.runMutation(api.apiKeys.create, {
  name: 'Test Key',
  permissions: ['events:read'],
  environment: 'test',
})

// Key is returned once
console.log(result.key) // oe_test_abc123...
```

### Test Key Validation

```typescript
// Validate the key (works with both encrypted and hashed keys)
const isValid = await ctx.runQuery(internal.apiKeys.validateKey, {
  keyPrefix: 'oe_test_abc123',
  keyHash: await hashApiKey('oe_test_abc123...'),
})
```

### Test Backward Compatibility

Existing hashed keys should continue to work during the transition period.

## Rollback Plan

If issues arise, you can rollback by:

1. **Keep Legacy Code**: The system supports both encrypted and hashed keys
2. **Revert Schema**: Remove encryption fields (optional fields won't break existing data)
3. **Disable Encryption**: Set `ENCRYPTION_KEY` to empty (will fall back to hashing)

## Security Considerations

### Encryption Details

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt**: Unique 256-bit salt per key
- **IV**: Unique 96-bit initialization vector per key
- **Authentication**: 128-bit authentication tag

### Access Control

- Only the key owner can retrieve their encrypted keys
- Requires authentication to decrypt
- Admin users cannot decrypt other users' keys without the master key

### Compliance

This migration helps meet:

- **Requirement 1.5**: Encrypt API keys at rest
- **Requirement 3.7**: Encrypt sensitive data at rest
- **Requirement 4.7**: Encrypt backup data

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is not set"

**Solution**: Add `ENCRYPTION_KEY` to your environment variables (see Step 1)

### Error: "Master key must be at least 32 characters"

**Solution**: Generate a longer encryption key (see Step 1)

### Error: "Decryption failed"

**Possible causes:**

- Wrong encryption key
- Corrupted encrypted data
- Key was created with different encryption key

**Solution**: Regenerate the API key

### Migration Not Progressing

**Check:**

1. Users have been notified
2. Migration notice is visible in API key descriptions
3. Users understand they need to regenerate keys

## Timeline

**Recommended Timeline:**

- **Week 1**: Deploy schema changes and migration script
- **Week 2-4**: Notify users and monitor adoption
- **Week 5-12**: Transition period (both systems work)
- **Week 13+**: Revoke unmigrated keys

## Support

For questions or issues:

- Check the migration status regularly
- Monitor error logs for decryption failures
- Provide clear documentation to users
- Offer support for users having trouble migrating

## References

- Design Document: `.kiro/specs/production-readiness/design.md`
- Requirements: `.kiro/specs/production-readiness/requirements.md`
- Encryption Service: `convex/lib/security/encryption.ts`
- Migration Script: `convex/migrations/migrateApiKeysToEncryption.ts`
