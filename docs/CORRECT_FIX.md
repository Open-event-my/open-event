# Correct Fix - Use JWT_PRIVATE_KEY

## The Real Issue

The error message is clear:

```
Missing environment variable `JWT_PRIVATE_KEY`
```

**Convex Auth v0.0.90 uses `JWT_PRIVATE_KEY`, NOT `CONVEX_AUTH_PRIVATE_KEY`!**

## Solution

### Step 1: Add `JWT_PRIVATE_KEY` to Convex Dashboard

1. Go to **Convex Dashboard** → **Settings** → **Environment Variables**
2. Click **"+ Add"** button
3. **Variable Name:** `JWT_PRIVATE_KEY`
4. **Variable Value:** Copy the ENTIRE private key below (including BEGIN/END lines):

```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCiQVch0w5LHRO4
flenjKky26fjqz61oLYr/anh5O1WjesDF1B6VpinE3uAhZf7ziePKZ64Jdkx+0cK
vHWK0uLptrs+Sa2EhEaP6qBoJw3phRGxZlrUeO71jODqJIK4D76PVTKA+6h+A8Kj
1beGNYoLYVBh3Yc8L0Jj3bkRWyd3i9uRXuD7+4Y6yB3en04MoIHD4Hsv0Tm86LNS
dbmehJ2UtBG+n+Qkp5XAIRnaBgVRVWNMN8xjoorjFz2MYF9wdlbeBMKkIz5ggvis
V/eX492x4adMpnOfMgSiZZfrZerNXrsi+4hgT1qnZwtlYDQMU099M/4Vw/0zQGxU
qmF9OlofAgMBAAECggEAFY2LZvVTrTugDn5N43ZGVXijHRV2v4apHD/WTKjts/Un
FiKHMLEHFw559dEJJsw0KgqzyC9S4hZIUg9Fp9qqhLQevD/qOjOd8ekPRLaHXREt
j/ySLS4hQ+HiUIfoC04gGIcPLd3//DlApiWx+rRq8WcMV+um1qJKddyShFEw9Wqa
5hwHCsGVA2Vtiw4l8O7ujGM6X+BpTv1L5XEg8kIXBt/ZHMlVoUVCWvOQ/J9WBb/9
U+5XJjr0DK26rfVMcHMCMVfAaxiJ48YnEvsyDq5PkyB3n5LTF7I2l0opXKAOtweP
8uKjgRhn6yzexBxlih7Pr0J3M480Cjeh0oqyy+js7QKBgQDRaj75AAvGvRiBRos0
mWJoH5rhBIFYRqim4OXn9eiU4doJ/yhQXWfiDhu3k8wiBky5EsuKddzzGGMqJLSp
fphJydmn2P89WG5jsscOHMGjYbaGGzm1XB8VTElSFf/+wo95CYG7xalQcYBMVTh8
LguUNnjqS6OjIyDvWXtfEklkBQKBgQDGWXEQcHx+yDvTGZC13KtYuW/Dgw2fOetU
znTxzbC2lNxLgv5oz+IJtCuGtCOMmYFZBSIA1cIdXit4ngeYT20j0IUYnzVTMwrW
jEDhbVxMajEx3Y7z+QTXNUU7Wzr6byqgHUCA54U09ysam1FLfUlejg1jRm5osfUr
ubG93hdi0wKBgFg+TQrf2haE2C6ha0de2vjFWJ45J8fq/mZTno2AMeGKyjYsLvCu
a3f2OffBb+NmhC34nYxa3iARxrebgAVsMv/k7rKr3eIbwWiBjR+FPpN6OU+JaWfi
ybZPzxWn75eKpKp8Nw7I2+/p5AZGYubxADAURB92gB3eT6KMMlB9hC+BAoGBAJyH
YyGtE6Jd1FBgoYHTlmkbVib9mldott2jXEiioW1FBqCUzL7cJy6vP5Y7PL6tOZWN
5mqwRlM0yKuUUrwRGjkkSpTGt6dj5Y6w+lasHiWzvAT1KuZAQ2CuimcwNNgDuKjI
zOmtS8Mjt6F0pvAi/C6hfdE1eNYocinCjpEe3me/AoGBAM8U6pcUusIy+GNaVKYJ
7+dfvdYp9pnoV2UMlNknbhi+PZeVjaWFWqcWaedgj5nHrcRGmXPu9GdOGkiKzA5U
jzqdD3zgJxjtkyHf5LZFmu0YDH2Q5nl7YUriUU+SqYz3icadWXLknQZOF1DEbvCP
jXu99dh7VldV/eUSxJu72U8q
-----END PRIVATE KEY-----
```

5. Click **Save**

### Step 2: Update `JWKS` (if needed)

Make sure `JWKS` has this value:

```json
{
  "keys": [
    {
      "use": "sig",
      "kty": "RSA",
      "n": "okFXIdMOSx0TuH5Xp4ypMtun46s-taC2K_2p4eTtVo3rAxdQelaYpxN7gIWX-84njymeuCXZMftHCrx1itLi6ba7PkmthIRGj-qgaCcN6YURsWZa1Hju9Yzg6iSCuA--j1UygPuofgPCo9W3hjWKC2FQYd2HPC9CY925EVsnd4vbkV7g-_uGOsgd3p9ODKCBw-B7L9E5vOizUnW5noSdlLQRvp_kJKeVwCEZ2gYFUVVjTDfMY6KK4xc9jGBfcHZW3gTCpCM-YIL4rFf3l-PdseGnTKZznzIEomWX62XqzV67IvuIYE9ap2cLZWA0DFNPfTP-FcP9M0BsVKphfTpaHw",
      "e": "AQAB"
    }
  ]
}
```

### Step 3: Verify `SITE_URL`

Make sure `SITE_URL` is set to:

```
http://localhost:5173
```

### Step 4: About `CONVEX_AUTH_PRIVATE_KEY`

- You can **keep** `CONVEX_AUTH_PRIVATE_KEY` if you want (it won't hurt)
- But **`JWT_PRIVATE_KEY` is the one that matters** for Convex Auth v0.0.90
- Convex Auth will use `JWT_PRIVATE_KEY` and ignore `CONVEX_AUTH_PRIVATE_KEY`

### Step 5: Restart Convex Dev Server

**CRITICAL:** After adding the variable:

1. **Stop your Convex dev server** (Ctrl+C)
2. **Wait 5 seconds**
3. **Restart it:**
   ```bash
   npx convex dev
   ```
4. **Wait for:** "Convex functions ready!" message

### Step 6: Test Login

1. Go to `http://localhost:5173/sign-in`
2. Enter your email and password
3. Click "Sign In"

**It should work now!** ✅

---

## Why This Happened

- Convex Auth v0.0.90 uses `JWT_PRIVATE_KEY` as the environment variable name
- You had it set, but we deleted it thinking `CONVEX_AUTH_PRIVATE_KEY` was correct
- The error message clearly says: `Missing environment variable 'JWT_PRIVATE_KEY'`

---

## Summary

✅ **Add:** `JWT_PRIVATE_KEY` with the full private key (from above)  
✅ **Keep:** `JWKS` (update if needed)  
✅ **Keep:** `SITE_URL`  
✅ **Optional:** `CONVEX_AUTH_PRIVATE_KEY` (can keep or delete, doesn't matter)  
✅ **Restart:** Convex dev server  
✅ **Test:** Login

The key is: **`JWT_PRIVATE_KEY` is the correct variable name for your version!**
