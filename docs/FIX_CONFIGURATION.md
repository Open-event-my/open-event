# Fix Your Configuration - You Have Both Variables Set!

## Problem Identified

Looking at your Convex Dashboard screenshot, I can see:

- ✅ `CONVEX_AUTH_PRIVATE_KEY` - exists
- ✅ `JWT_PRIVATE_KEY` - **ALSO EXISTS** ⚠️
- ✅ `JWKS` - exists and looks correct
- ✅ `SITE_URL` - exists

**The issue:** Having BOTH `CONVEX_AUTH_PRIVATE_KEY` and `JWT_PRIVATE_KEY` can cause Convex Auth to get confused about which one to use.

## Solution: Delete One Variable

### Step 1: Delete `JWT_PRIVATE_KEY`

1. In your Convex Dashboard → Environment Variables
2. Find `JWT_PRIVATE_KEY` in the list
3. Click the **red delete icon** (trash can) next to it
4. Confirm deletion
5. **Keep only `CONVEX_AUTH_PRIVATE_KEY`**

### Step 2: Verify `CONVEX_AUTH_PRIVATE_KEY` Format

1. Find `CONVEX_AUTH_PRIVATE_KEY` in the list
2. Click the **eye icon** to reveal the value
3. Verify it looks like this:

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCZc4nLC2Lg5Gv
... (many lines)
-----END PRIVATE KEY-----
```

**Check for:**

- ✅ Starts with `-----BEGIN PRIVATE KEY-----`
- ✅ Ends with `-----END PRIVATE KEY-----`
- ✅ No extra spaces before/after
- ✅ All lines are present (not truncated)

**If the key looks wrong:**

- Click the **edit icon** (pencil)
- Copy the FULL key from your terminal (from when we ran `node scripts/generateKeys.mjs`)
- Paste it exactly as shown
- Save

### Step 3: Verify `JWKS` Format

1. Click the eye icon on `JWKS`
2. It should be valid JSON starting with `{"keys":[{"use":"sig"...`

If it looks truncated or wrong, edit it with the full JSON from your terminal.

### Step 4: Restart Convex Dev Server

**CRITICAL:** After making changes:

1. **Stop your Convex dev server** (Ctrl+C)
2. **Wait 5 seconds**
3. **Restart it:**
   ```bash
   npx convex dev
   ```
4. **Wait for:** "Convex functions ready!" message

### Step 5: Test Login

1. Go to `http://localhost:5173/sign-in`
2. Enter your email and password
3. Try logging in

---

## If It Still Doesn't Work

### Option A: Delete the Broken Account

The account might be in a broken state. Delete it and start fresh:

1. **Convex Dashboard** → **Data** tab
2. Find `users` table
3. Find your user by email
4. Click **trash icon** to delete
5. Also check `authAccounts` table and delete if found
6. Try **signing up again** (not login)

### Option B: Regenerate Fresh Keys

1. **Delete both** `CONVEX_AUTH_PRIVATE_KEY` and `JWT_PRIVATE_KEY` from Dashboard
2. **Run:**
   ```bash
   node scripts/generateKeys.mjs
   ```
3. **Copy the new private key** (entire thing with BEGIN/END)
4. **Add only** `CONVEX_AUTH_PRIVATE_KEY` with the new key
5. **Update** `JWKS` with the new JSON
6. **Restart** Convex dev server
7. **Delete** the broken account (see Option A)
8. **Sign up** with a fresh account

---

## Quick Checklist

- [ ] Deleted `JWT_PRIVATE_KEY` (keep only `CONVEX_AUTH_PRIVATE_KEY`)
- [ ] Verified `CONVEX_AUTH_PRIVATE_KEY` has full key with BEGIN/END headers
- [ ] Verified `JWKS` is complete JSON
- [ ] Restarted Convex dev server after changes
- [ ] Tried logging in
- [ ] If still broken, deleted account and tried signing up again

---

## Why This Happens

Convex Auth looks for a specific environment variable name. When you have both:

- `CONVEX_AUTH_PRIVATE_KEY`
- `JWT_PRIVATE_KEY`

It might:

- Use the wrong one
- Get confused about which format to expect
- Fail to parse the key correctly

**Solution:** Use only ONE variable name. Based on Convex Auth v0.0.90, use `CONVEX_AUTH_PRIVATE_KEY`.
