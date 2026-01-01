# Fix Authentication Issue - Account Exists But Can't Login

## Problem

You're seeing:

- ✅ Sign up says: "Email already exists"
- ❌ Login fails with: `"pkcs8" must be PKCS#8 formatted string`

**Root Cause:** Your account was created, but Convex Auth can't sign JWTs because the private key environment variable isn't set.

## Solution (2 Steps)

### Step 1: Set Up Environment Variables (CRITICAL - Do This First!)

1. **Go to Convex Dashboard**: https://dashboard.convex.dev
2. **Select your project**: `giddy-reindeer-109`
3. **Navigate to**: Settings → Environment Variables
4. **Add these 3 variables**:

#### Variable 1: `CONVEX_AUTH_PRIVATE_KEY`

Copy the entire private key from when we ran `node scripts/generateKeys.mjs`:

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDPZs0CNXyZPKrm
Nz2+Eu+SU8xN2rG6vehyjLuN2jDDbIcOrycl8KkjTozoDP+tLzcJ0Z6a7+NWGzhz
FwhJQEzi33iOg/OEl16DvQhRm4IudT+/sfCYGfWFcsH0RX447LGqfjKsWG9FPbvk
DKEHIZs9yHgOa8T+otqWHjjL+5DDnZneY688bIOJ95lBkUV+YYJvTYa/tVuKyP0A
bZZDr/r93459I6FrRvUcSMe5B+F+b9yY7kTxDxgefdUr8yjfv7ul08Xh2ZZyEK0K
nvTqSYeOrPJC/7bKHW3MuZLppWiwigpaG8TAIUbKFbCtAmil6gReW01ow3vVdhIS
/WSSTJHrAgMBAAECggEAQmKEQi2+mQnbJd8OqzVCa5LY9R6H/t7kdS3opontS9AE
FsYngLRcXwm4floSyGsxcbofyzX3jUsfMW9w3olvUrr2yp8fphQRU5eA/yYIcDhl
VEVvXjAI71MBE9/ee/f/EjRcod+YlhAhgOgt7qtqFkeBbhQ+tMaJsr0vrtLxzjqi
pUVOcFIveqyTrk4IP1beJ5/jhv/FwYOUt1Kcwt3SaGsSDsOe2CHuRdM+xFKqwuj8
l7S4iB6COcBmHau6twka8EmACxtC9StuwiXCOUJxEhrijrXGTQ2tbMDM7+J4ygY0
/v0WNPAiRH3j73d3jZz+fuJFbtc/M+ZeOZ0Bfo1q4QKBgQD9ai9uElSBHglze0vF
4sfv7VQVZ1masNFYTPPHBo0/0oBFCFLmxAQKTRqQ64JP2Gn6ji1N9vDmwN4cKFUh
DWA7PTRbLCt7A5O4etbHGGE/YFcTi2e0+F+rfUDxwKX9jXXar7V54F3oooGYi9AW
/ZUGQAbchmv8Ap29XFSgbcmoMQKBgQDRhHKxZUAZ/SrhujFz+ReVSMACdmBO7/E+
6PYUieDmdzm3u3SCa8t5KGvANg34YrjMIK4kvk5xT4h2u/VOxxxxGauzuuZOGMBY
h0ghucjRAPlq9NpfGGn5S7KNgOviVo4BNAVz3dGO8BwvsOEzJZ9GrxtcFmIEu97V
g1n6E6iw2wKBgQCzoC7agNexZg8g8kZ1kBhUsw8k1Mso4SiixHkPnE9G6/jL9eh9
dne+rYSlMKp/2lDUry7h0qZTimZl4xjkgsyxcOLJtXdkjNaKr1fKbDeSasGOMwRh
vKRjtDbypbGDFmBxkJa8OxOVsIrYDFKF2V1mvr+eVRH54gjZjrbVuLx2IQKBgBzE
6hbPx2CKMeQy8+1vy7w09CCibpEIQ4EW7gtd72LWBjfjZpkuAg+N7FXFVl+/9o4Z
ArCK7SyD9kIPhxydHJuvIbOZO1yH64l8cfwnjZqdXqJAIugh6xNPQKJLjJhUuEUU
BpelYswUzloCGLo0NU24Z7JaZHUv8uYwlh9Pqb83AoGAKEWNWdwWZHm9YCm1A34T
IveaFgUIxFAiqx1NnjDZhly/mvg4DQ3l0aSXwIfDbJyWiq24WSg+mqyCzmBQYWh7
zWugN7sDPnh5eN0JP6plrKEph544D4Sy+8Pl+ZDLXSSogWwtvM1BBwREPIpe9pZ0
o8oxZv/eQ0ikdAdNrr47ljs=
-----END PRIVATE KEY-----
```

**⚠️ IMPORTANT:** Copy the ENTIRE key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

#### Variable 2: `JWKS`

Copy the JSON object:

```json
{
  "keys": [
    {
      "use": "sig",
      "kty": "RSA",
      "n": "z2bNAjV8mTyq5jc9vhLvklPMTdqxur3ocoy7jdoww2yHDq8nJfCpI06M6Az_rS83CdGemu_jVhs4cxcISUBM4t94joPzhJdeg70IUZuCLnU_v7HwmBn1hXLB9EV-OOyxqn4yrFhvRT275AyhByGbPch4DmvE_qLalh44y_uQw52Z3mOvPGyDifeZQZFFfmGCb02Gv7Vbisj9AG2WQ6_6_d-OfSOha0b1HEjHuQfhfm_cmO5E8Q8YHn3VK_Mo37-7pdPF4dmWchCtCp706kmHjqzyQv-2yh1tzLmS6aVosIoKWhvEwCFGyhWwrQJopeoEXltNaMN71XYSEv1kkkyR6w",
      "e": "AQAB"
    }
  ]
}
```

#### Variable 3: `SITE_URL`

For development:

```
http://localhost:5173
```

### Step 2: Restart Convex Dev Server

After setting the variables:

1. **Stop your Convex dev server** (Ctrl+C in the terminal)
2. **Restart it**:
   ```bash
   npx convex dev
   ```
3. **Wait for it to fully start** (you'll see "Convex functions ready!")

### Step 3: Try Logging In

1. Go to `http://localhost:5173/sign-in`
2. Enter your email and password
3. Click "Sign In"

**It should work now!** ✅

---

## If Login Still Fails

If you still get errors after setting the environment variables, the account might be in a broken state. Here's how to delete it:

### Option A: Delete via Convex Dashboard (Easiest)

1. Go to **Convex Dashboard** → Your Project
2. Click **Data** tab
3. Find the `users` table
4. Find your user by email
5. Click the **trash icon** to delete it
6. Also delete from `authAccounts` table (find by email)
7. Try signing up again

### Option B: Regenerate Keys and Try Again

If the variable name is wrong, try:

1. **Check variable name**: Convex Auth might use `JWT_PRIVATE_KEY` instead of `CONVEX_AUTH_PRIVATE_KEY`
2. **Regenerate keys**:
   ```bash
   node scripts/generateKeys.mjs
   ```
3. **Update the environment variable** with the new key
4. **Restart Convex dev server**

---

## Quick Checklist

- [ ] Set `CONVEX_AUTH_PRIVATE_KEY` in Convex Dashboard
- [ ] Set `JWKS` in Convex Dashboard
- [ ] Set `SITE_URL` in Convex Dashboard
- [ ] Restarted Convex dev server
- [ ] Tried logging in
- [ ] If still broken, deleted account and tried again

---

## Why This Happened

1. You tried to sign up → Account was created in database ✅
2. Convex Auth tried to sign a JWT token → Failed because no private key ❌
3. Account exists but authentication is broken → Can't login ❌

Once you set the environment variables, Convex Auth can properly sign tokens and login will work!
