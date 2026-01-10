# Fix PKCS#8 Error - Step by Step Guide

## Problem

You're seeing: `"pkcs8" must be PKCS#8 formatted string`

**Root Cause:** The `JWT_PRIVATE_KEY` environment variable in Convex Dashboard is missing the PKCS#8 headers (`-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`).

## Solution

### Step 1: Generate New Keys (if needed)

```bash
node scripts/formatKeyForConvex.mjs
```

This will output properly formatted keys and save them to `KEYS_FOR_CONVEX.md`.

### Step 2: Copy the Key to Convex Dashboard

1. **Go to Convex Dashboard**: https://dashboard.convex.dev
2. **Select your project**
3. **Navigate to**: Settings → Environment Variables
4. **Find `JWT_PRIVATE_KEY`** and click the **edit icon** (pencil)
5. **Delete the current value** (it's probably missing the BEGIN/END markers)
6. **Copy the ENTIRE key block** from `KEYS_FOR_CONVEX.md` or the terminal output:
   - It MUST start with: `-----BEGIN PRIVATE KEY-----`
   - It MUST end with: `-----END PRIVATE KEY-----`
   - Include ALL lines, including the BEGIN and END markers
   - Preserve all line breaks

**Example of CORRECT format:**

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyG3uBHWyCwoM7
bLIRmUvXQXGvZXqo7fLWeD/4zpz2P+M1sPS221EMB5YKrFu9BmQPVBAPy4yoxe0O
... (all lines) ...
Y7AcgkhW4SUX2viPQKjy4vDRk1AsYsnsd1kY0RFq1mLeUu+qiqLK3vekpth9vAvD
5piaENUO07MEWjdWZNoYy+Q=
-----END PRIVATE KEY-----
```

**Example of INCORRECT format (what you probably have now):**

```
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyG3uBHWyCwoM7
... (missing BEGIN/END markers) ...
```

### Step 3: Verify JWKS

Make sure `JWKS` is set correctly (copy from `KEYS_FOR_CONVEX.md`).

### Step 4: Verify SITE_URL

Make sure `SITE_URL` is set to `http://localhost:5173` (for development).

### Step 5: Restart Convex Dev Server

**CRITICAL:** After updating the environment variable:

1. **Stop your Convex dev server** (Ctrl+C in the terminal where it's running)
2. **Wait 5 seconds**
3. **Restart it:**
   ```bash
   npx convex dev
   ```
4. **Wait for:** "Convex functions ready!" message

### Step 6: Verify the Fix

1. Try signing in at `http://localhost:5173/sign-in`
2. Check the Convex Dashboard → Logs
3. Look for `[DEBUG-AUTH] JWT key env check` log entry
4. You should see:
   - `hasBeginMarker: true`
   - `hasEndMarker: true`
   - `isProperlyFormatted: true`

If you still see the error, the key format is still incorrect. Double-check that you copied the ENTIRE key including the BEGIN and END lines.

## Quick Validation

You can validate your key format by checking the Convex Dashboard logs. After restarting, look for:

```
[DEBUG-AUTH] JWT key env check: {
  "data": {
    "hasBeginMarker": true,    ← Should be true
    "hasEndMarker": true,      ← Should be true
    "isProperlyFormatted": true  ← Should be true
  }
}
```

If any of these are `false`, the key format is incorrect.

## Common Mistakes

❌ **Copying only the base64 content** (without BEGIN/END markers)
❌ **Removing line breaks** (the key should have multiple lines)
❌ **Adding extra spaces** before BEGIN or after END
❌ **Not restarting** the Convex dev server after updating the variable

✅ **Correct:** Copy the ENTIRE block from BEGIN to END, including all line breaks
