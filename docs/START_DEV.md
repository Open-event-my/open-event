# 🚀 Development Server Startup Guide

## Quick Start

You need **TWO terminals** running simultaneously:

### Terminal 1: Convex Backend

```bash
npx convex dev
```

### Terminal 2: Vite Frontend

```bash
npm run dev
```

---

## ⚠️ CRITICAL: Fix Login Issue First

Before starting, ensure your **Convex Dashboard** has these environment variables:

### Go to: https://dashboard.convex.dev

**Project:** giddy-reindeer-109
**Location:** Settings → Environment Variables

### Required Variables:

#### 1. `JWT_PRIVATE_KEY`

**Note:** Use `JWT_PRIVATE_KEY` (NOT `CONVEX_AUTH_PRIVATE_KEY`) for @convex-dev/auth v0.0.90

To generate fresh keys, run:

```bash
node scripts/generateKeys.mjs
```

Copy the entire output including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

#### 2. `JWKS`

Copy the JSON object from the key generation output

#### 3. `SITE_URL`

```
http://localhost:5173
```

### ⚠️ Important:

- If you have **both** `JWT_PRIVATE_KEY` and `CONVEX_AUTH_PRIVATE_KEY`, delete `CONVEX_AUTH_PRIVATE_KEY`
- Having both causes conflicts
- After setting variables, restart Convex dev server

---

## 🧪 Testing Login

1. Start both servers (see Quick Start above)
2. Go to: http://localhost:5173/sign-in
3. Try logging in

**If login fails:**

- Delete your account from Convex Dashboard → Data → `users` table
- Also delete from `authAccounts` table
- Try signing up again (not login)

---

## 📝 Troubleshooting

### Convex Dev Server Won't Start

- Check if port 3210 is in use
- Verify `.env.local` has `CONVEX_DEPLOYMENT`

### Vite Dev Server Keeps Restarting

- Stop editing `.env` files while server is running
- Check for file watcher issues

### "pkcs8" Error on Login

- Missing `JWT_PRIVATE_KEY` in Convex Dashboard
- See "CRITICAL: Fix Login Issue First" section above

---

## 🔍 Verify Everything is Working

1. Convex: `npx convex dev` should show "Convex functions ready!"
2. Vite: `npm run dev` should show "Local: http://localhost:5173/"
3. Browser: http://localhost:5173 should load the app
4. Login: Should work without errors

---

## 📚 Additional Resources

- **Convex Dashboard:** https://dashboard.convex.dev
- **API Docs:** See `docs/API.md`
- **Auth Setup:** See `docs/AUTH_SETUP_GUIDE.md`
- **Agent System:** See `docs/AGENT_SYSTEM.md`
