# Authentication Setup Guide - Fixing PKCS#8 Error

## Problem

You're seeing this error:

```
Uncaught TypeError: "pkcs8" must be PKCS#8 formatted string
```

This happens because Convex Auth requires a properly formatted PKCS#8 private key for JWT signing, but it's either:

- Missing from your environment variables
- Incorrectly formatted
- Using the wrong environment variable name

## Solution

### Step 1: Generate Keys (Already Done)

The keys have been generated. You should see:

- A private key (starts with `-----BEGIN PRIVATE KEY-----`)
- A JWKS JSON object

### Step 2: Set Environment Variables in Convex Dashboard

1. **Go to Convex Dashboard**: https://dashboard.convex.dev
2. **Select your project**: `giddy-reindeer-109` (or your project name)
3. **Navigate to**: Settings → Environment Variables
4. **Add these variables**:

#### Required Variables:

**Variable Name:** `CONVEX_AUTH_PRIVATE_KEY`
**Note:** Some versions may use `JWT_PRIVATE_KEY` instead - if `CONVEX_AUTH_PRIVATE_KEY` doesn't work, try `JWT_PRIVATE_KEY`
**Value:** Copy the entire private key including the BEGIN/END lines:

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDPZs0CNXyZPKrm
... (all lines of the key)
-----END PRIVATE KEY-----
```

**Variable Name:** `JWKS`
**Value:** Copy the JSON object:

```json
{ "keys": [{ "use": "sig", "kty": "RSA", "n": "...", "e": "AQAB" }] }
```

**Variable Name:** `SITE_URL`
**Value:**

- For development: `http://localhost:5173`
- For production: Your actual domain URL

### Step 3: Verify Variable Names

Convex Auth might use different variable names. Try these in order:

1. **First try:** `CONVEX_AUTH_PRIVATE_KEY` (most common)
2. **If that doesn't work:** `JWT_PRIVATE_KEY`
3. **If still not working:** Check Convex Auth docs for your version

### Step 4: Restart Convex Dev Server

After setting the variables:

1. Stop your Convex dev server (Ctrl+C)
2. Restart it: `npx convex dev`

### Step 5: Test Authentication

1. Go to `http://localhost:5173/sign-up`
2. Try creating an account
3. The error should be gone!

## Troubleshooting

### If the error persists:

1. **Check variable name**: Make sure you're using the exact variable name Convex Auth expects
2. **Check formatting**: The private key MUST include:
   - `-----BEGIN PRIVATE KEY-----` at the start
   - `-----END PRIVATE KEY-----` at the end
   - All lines in between
3. **No extra spaces**: Don't add extra spaces or line breaks
4. **Check Convex Dashboard**: Verify the variables are saved correctly

### Common Mistakes:

❌ **Wrong:** Missing BEGIN/END lines

```
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDPZs0CNXyZPKrm...
```

✅ **Correct:** Full key with headers

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDPZs0CNXyZPKrm
...
-----END PRIVATE KEY-----
```

## Regenerating Keys

If you need to regenerate keys:

```bash
node scripts/generateKeys.mjs
```

Then update the environment variables in Convex Dashboard with the new values.

## Additional Notes

- **Never commit these keys** to version control
- **Use different keys** for development and production
- **Keep keys secure** - they're used to sign authentication tokens
