# Database Migration Procedures

This document outlines the procedures for creating, testing, and executing database migrations for the Open Event platform using Convex.

## Table of Contents

- [Overview](#overview)
- [Migration Types](#migration-types)
- [Creating Migrations](#creating-migrations)
- [Testing Migrations](#testing-migrations)
- [Executing Migrations](#executing-migrations)
- [Rollback Procedures](#rollback-procedures)
- [Best Practices](#best-practices)

## Overview

### Convex Migration Model

Convex uses a different migration model than traditional SQL databases:

- **Schema changes** are applied automatically when you deploy
- **Data migrations** are written as Convex functions and run manually
- **No automatic rollback** - rollbacks must be planned and implemented

### Migration Directory Structure

```
convex/
├── schema.ts              # Database schema definition
├── migrations/
│   ├── README.md          # Migration documentation
│   ├── seedData.ts        # Initial data seeding
│   ├── cleanupOrphanedAdmins.ts
│   ├── migrateApiKeysToEncryption.ts
│   └── [YYYYMMDD]_[description].ts  # Dated migrations
```

## Migration Types

### 1. Schema Migrations

Schema changes in `convex/schema.ts` are applied automatically on deployment.

**Safe Changes (No Migration Needed):**
- Adding new tables
- Adding new optional fields
- Adding new indexes

**Requires Data Migration:**
- Renaming fields
- Changing field types
- Adding required fields
- Removing fields with data

### 2. Data Migrations

Data migrations transform existing data to match new requirements.

**Examples:**
- Encrypting existing API keys
- Merging duplicate records
- Populating new required fields
- Cleaning up orphaned data

### 3. Backfill Migrations

Backfill migrations populate new fields with computed values.

**Examples:**
- Adding timestamps to existing records
- Computing derived fields
- Setting default values

## Creating Migrations

### Step 1: Plan the Migration

Before writing code, document:

1. **What changes are needed?**
2. **What data will be affected?**
3. **Is the migration reversible?**
4. **What is the rollback plan?**

### Step 2: Create Migration File

Create a new file in `convex/migrations/`:

```typescript
// convex/migrations/20241231_add_user_preferences.ts

/**
 * Migration: Add User Preferences
 * 
 * Purpose: Populate the new userPreferences field for existing users
 * 
 * Requirements: [Requirement ID]
 * 
 * Affected Tables: users
 * Estimated Records: ~10,000
 * Estimated Duration: ~5 minutes
 * 
 * Rollback: Run rollback_20241231_add_user_preferences
 */

import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';

// Default preferences for existing users
const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  darkMode: false,
  language: 'en',
};

/**
 * Main migration function
 */
export const run = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    
    console.log(`[MIGRATION] Starting user preferences migration...`);
    
    // Get users without preferences
    const users = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('preferences'), undefined))
      .take(batchSize);
    
    if (users.length === 0) {
      console.log('[MIGRATION] No more users to migrate');
      return { complete: true, processed: 0 };
    }
    
    let processed = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        await ctx.db.patch(user._id, {
          preferences: DEFAULT_PREFERENCES,
          preferencesUpdatedAt: Date.now(),
        });
        processed++;
      } catch (error) {
        console.error(`[MIGRATION] Error updating user ${user._id}:`, error);
        errors++;
      }
    }
    
    console.log(`[MIGRATION] Batch complete: ${processed} processed, ${errors} errors`);
    
    return {
      complete: false,
      processed,
      errors,
      hasMore: users.length === batchSize,
    };
  },
});

/**
 * Dry run - preview changes without applying
 */
export const dryRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    const usersWithoutPrefs = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('preferences'), undefined))
      .collect();
    
    return {
      totalUsersToMigrate: usersWithoutPrefs.length,
      sampleUsers: usersWithoutPrefs.slice(0, 5).map((u) => ({
        id: u._id,
        email: u.email,
        createdAt: u.createdAt,
      })),
      defaultPreferences: DEFAULT_PREFERENCES,
    };
  },
});

/**
 * Rollback function
 */
export const rollback = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    
    console.log('[ROLLBACK] Starting rollback...');
    
    // Find users with preferences added by this migration
    const users = await ctx.db
      .query('users')
      .filter((q) => q.neq(q.field('preferences'), undefined))
      .take(batchSize);
    
    let processed = 0;
    
    for (const user of users) {
      // Only rollback if preferences match default (migration-added)
      if (JSON.stringify(user.preferences) === JSON.stringify(DEFAULT_PREFERENCES)) {
        await ctx.db.patch(user._id, {
          preferences: undefined,
          preferencesUpdatedAt: undefined,
        });
        processed++;
      }
    }
    
    console.log(`[ROLLBACK] Rolled back ${processed} users`);
    
    return {
      processed,
      hasMore: users.length === batchSize,
    };
  },
});

/**
 * Get migration status
 */
export const status = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query('users').collect();
    const migratedUsers = allUsers.filter((u) => u.preferences !== undefined);
    
    return {
      totalUsers: allUsers.length,
      migratedUsers: migratedUsers.length,
      pendingUsers: allUsers.length - migratedUsers.length,
      progress: Math.round((migratedUsers.length / allUsers.length) * 100),
    };
  },
});
```

### Step 3: Add Schema Changes (if needed)

Update `convex/schema.ts`:

```typescript
// Add new field to schema
users: defineTable({
  // ... existing fields
  preferences: v.optional(v.object({
    emailNotifications: v.boolean(),
    darkMode: v.boolean(),
    language: v.string(),
  })),
  preferencesUpdatedAt: v.optional(v.number()),
})
```

## Testing Migrations

### Local Testing

1. **Run dry run first:**
   ```bash
   npx convex run migrations/20241231_add_user_preferences:dryRun
   ```

2. **Test on development:**
   ```bash
   # Run migration
   npx convex run migrations/20241231_add_user_preferences:run
   
   # Check status
   npx convex run migrations/20241231_add_user_preferences:status
   ```

3. **Test rollback:**
   ```bash
   npx convex run migrations/20241231_add_user_preferences:rollback
   ```

### Staging Testing

1. **Deploy to staging:**
   ```bash
   npx convex deploy --preview staging
   ```

2. **Run migration on staging:**
   ```bash
   npx convex run migrations/20241231_add_user_preferences:run --preview staging
   ```

3. **Verify data integrity:**
   - Check affected records
   - Test application functionality
   - Verify no data loss

## Executing Migrations

### Pre-Migration Checklist

- [ ] Migration tested locally
- [ ] Migration tested on staging
- [ ] Rollback procedure tested
- [ ] Backup verified
- [ ] Team notified
- [ ] Low-traffic window selected
- [ ] Monitoring in place

### Production Migration Steps

#### Step 1: Create Backup Point

```bash
# Note the current deployment for potential rollback
npx convex dashboard --prod
# Record deployment ID: _______________
```

#### Step 2: Deploy Schema Changes

```bash
# Deploy schema changes first
npx convex deploy --prod
```

#### Step 3: Run Dry Run

```bash
# Preview what will be changed
npx convex run migrations/20241231_add_user_preferences:dryRun --prod
```

#### Step 4: Execute Migration

```bash
# Run migration in batches
npx convex run migrations/20241231_add_user_preferences:run --prod

# For large migrations, run multiple times until complete
while true; do
  result=$(npx convex run migrations/20241231_add_user_preferences:run --prod)
  echo $result
  if [[ $result == *"complete: true"* ]]; then
    break
  fi
  sleep 5
done
```

#### Step 5: Verify Migration

```bash
# Check migration status
npx convex run migrations/20241231_add_user_preferences:status --prod

# Verify application functionality
npm run test:e2e -- --grep "@smoke"
```

#### Step 6: Monitor

- Watch error rates in Sentry
- Monitor Convex function performance
- Check user reports

### Post-Migration Checklist

- [ ] Migration completed successfully
- [ ] Data integrity verified
- [ ] Application functioning normally
- [ ] No increase in error rates
- [ ] Documentation updated
- [ ] Team notified of completion

## Rollback Procedures

### When to Rollback

- Data corruption detected
- Application errors after migration
- Performance degradation
- User-reported issues

### Rollback Steps

#### Step 1: Stop Migration (if in progress)

```bash
# Migrations are batched, so stopping is safe between batches
# Simply don't run the next batch
```

#### Step 2: Run Rollback Function

```bash
# Run rollback
npx convex run migrations/20241231_add_user_preferences:rollback --prod

# Run multiple times if needed
while true; do
  result=$(npx convex run migrations/20241231_add_user_preferences:rollback --prod)
  echo $result
  if [[ $result == *"hasMore: false"* ]]; then
    break
  fi
  sleep 5
done
```

#### Step 3: Rollback Schema (if needed)

```bash
# Revert schema changes in code
git revert [commit-hash]

# Deploy reverted schema
npx convex deploy --prod
```

#### Step 4: Verify Rollback

```bash
# Check data is restored
npx convex run migrations/20241231_add_user_preferences:status --prod

# Test application
npm run test:e2e -- --grep "@smoke"
```

### Emergency Rollback

If rollback function fails:

1. **Restore from backup:**
   - Contact Convex support
   - Request point-in-time recovery

2. **Manual data fix:**
   ```bash
   # Create emergency fix script
   npx convex run migrations/emergency_fix --prod
   ```

## Best Practices

### Migration Design

1. **Make migrations idempotent:**
   - Safe to run multiple times
   - Check if already migrated before applying

2. **Use batching for large datasets:**
   - Process in batches of 100-1000 records
   - Add delays between batches if needed

3. **Include dry run and status functions:**
   - Always preview changes before applying
   - Track migration progress

4. **Plan for rollback:**
   - Every migration should have a rollback
   - Test rollback before production

### Safety Guidelines

1. **Never delete data without backup:**
   ```typescript
   // Bad: Direct delete
   await ctx.db.delete(record._id);
   
   // Good: Soft delete first
   await ctx.db.patch(record._id, { 
     deletedAt: Date.now(),
     deletedBy: 'migration_20241231',
   });
   ```

2. **Add migration markers:**
   ```typescript
   // Track which records were migrated
   await ctx.db.patch(record._id, {
     migratedAt: Date.now(),
     migratedBy: 'migration_20241231',
   });
   ```

3. **Log everything:**
   ```typescript
   console.log(`[MIGRATION] Processing record ${record._id}`);
   console.log(`[MIGRATION] Before: ${JSON.stringify(record)}`);
   console.log(`[MIGRATION] After: ${JSON.stringify(updated)}`);
   ```

### Documentation

1. **Document in migration file:**
   - Purpose and requirements
   - Affected tables and estimated records
   - Rollback procedure

2. **Update migration log:**
   ```markdown
   ## Migration Log
   
   | Date | Migration | Status | Notes |
   |------|-----------|--------|-------|
   | 2024-12-31 | add_user_preferences | Complete | 10,000 records |
   ```

3. **Update schema documentation:**
   - Document new fields
   - Update data dictionary

---

## Appendix: Migration Template

```typescript
// convex/migrations/YYYYMMDD_description.ts

/**
 * Migration: [Title]
 * 
 * Purpose: [What this migration does]
 * 
 * Requirements: [Requirement IDs]
 * 
 * Affected Tables: [table1, table2]
 * Estimated Records: [number]
 * Estimated Duration: [time]
 * 
 * Rollback: Run rollback function
 */

import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';

export const run = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Implementation
  },
});

export const dryRun = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Preview implementation
  },
});

export const rollback = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Rollback implementation
  },
});

export const status = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Status implementation
  },
});
```

---

*Last Updated: December 2024*
*Document Owner: Platform Team*
