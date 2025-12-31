# Diagnose PKCS#8 Error - Step by Step

## Quick Test

Run this mutation in Convex Dashboard to test your key format:

1. Go to **Convex Dashboard** → **Functions**
2. Find `testKeyFormat:testKeyFormat`
3. Click **Run** (no arguments needed)
4. Check the output - it will tell you exactly what's wrong

## Manual Diagnosis

### Step 1: Check Convex Dashboard Logs

After restarting your Convex dev server, look for this log entry:

```
[DEBUG-AUTH] JWT key env check: {...}
```

Check these values:

- `firstLine` - Should be exactly: `-----BEGIN PRIVATE KEY-----`
- `lastLine` - Should be exactly: `-----END PRIVATE KEY-----`
- `isProperlyFormatted` - Should be `true`
- `lineCount` - Should be > 10 (multi-line key)

### Step 2: Common Issues and Fixes

#### Issue 1: Key is on a single line

**Symptoms:**

- `lineCount: 1` or `lineCount: 2`
- `hasNewlines: false`
- `firstLine` contains the entire key

**Fix:**
The key needs line breaks. When copying to Convex Dashboard:

1. Make sure you're copying from `KEYS_FOR_CONVEX.md`
2. Copy the ENTIRE block including all lines
3. Paste it into Convex Dashboard - it should preserve line breaks
4. If it doesn't, try copying line by line or use a different method

#### Issue 2: Missing BEGIN/END markers

**Symptoms:**

- `hasBeginMarker: false` or `hasEndMarker: false`
- `firstLine` doesn't start with `-----BEGIN PRIVATE KEY-----`
- `lastLine` doesn't end with `-----END PRIVATE KEY-----`

**Fix:**

1. Open `KEYS_FOR_CONVEX.md`
2. Copy from line 7 (`-----BEGIN PRIVATE KEY-----`) to line 34 (`-----END PRIVATE KEY-----`)
3. Include BOTH the BEGIN and END lines
4. Paste into Convex Dashboard

#### Issue 3: Extra whitespace

**Symptoms:**

- `startsWithBegin: false` but `hasBeginMarker: true`
- `endsWithEnd: false` but `hasEndMarker: true`

**Fix:**

1. Edit `JWT_PRIVATE_KEY` in Convex Dashboard
2. Delete all content
3. Paste the key again, making sure there's no leading/trailing whitespace
4. The key should start immediately with `-----BEGIN PRIVATE KEY-----`

#### Issue 4: Key was corrupted during copy

**Symptoms:**

- Key looks correct but still fails
- `importError` shows a specific parsing error

**Fix:**

1. Regenerate keys: `node scripts/formatKeyForConvex.mjs`
2. Use the NEW key from `KEYS_FOR_CONVEX.md`
3. Make sure to copy the entire block exactly as shown

### Step 3: Verify in Convex Dashboard

1. Go to **Convex Dashboard** → **Settings** → **Environment Variables**
2. Find `JWT_PRIVATE_KEY`
3. Click the **eye icon** to view the value
4. Verify:
   - First visible line: `-----BEGIN PRIVATE KEY-----`
   - Last visible line: `-----END PRIVATE KEY-----`
   - Multiple lines in between (not a single long line)

### Step 4: After Fixing

1. **Save** the environment variable in Convex Dashboard
2. **Stop** your Convex dev server (Ctrl+C)
3. **Wait 5 seconds**
4. **Restart**: `npx convex dev`
5. **Wait** for "Convex functions ready!" message
6. **Test** sign-in again
7. **Check logs** - `isProperlyFormatted` should now be `true`

## Still Not Working?

If the key format looks correct but you still get the error:

1. **Run the test mutation**: `testKeyFormat:testKeyFormat` in Convex Dashboard
2. **Share the output** - it will show the exact error from `jose` library
3. **Check for encoding issues** - make sure the key is UTF-8 encoded
4. **Try regenerating keys** - sometimes keys can get corrupted

## Expected Log Output (Success)

When the key is correct, you should see:

```json
{
  "data": {
    "firstLine": "-----BEGIN PRIVATE KEY-----",
    "lastLine": "-----END PRIVATE KEY-----",
    "hasBeginMarker": true,
    "hasEndMarker": true,
    "startsWithBegin": true,
    "endsWithEnd": true,
    "hasNewlines": true,
    "lineCount": 28,
    "isProperlyFormatted": true
  }
}
```
