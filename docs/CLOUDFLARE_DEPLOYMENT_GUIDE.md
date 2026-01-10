# Cloudflare Pages Deployment Guide

Complete step-by-step guide to deploy Open Event to Cloudflare Pages.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Overview](#overview)
- [Step 1: Prepare Your Project](#step-1-prepare-your-project)
- [Step 2: Set Up Convex Backend](#step-2-set-up-convex-backend)
- [Step 3: Configure Cloudflare Pages](#step-3-configure-cloudflare-pages)
- [Step 4: Environment Variables](#step-4-environment-variables)
- [Step 5: Custom Domain Setup](#step-5-custom-domain-setup)
- [Step 6: Deploy](#step-6-deploy)
- [Step 7: Post-Deployment Verification](#step-7-post-deployment-verification)
- [Troubleshooting](#troubleshooting)
- [CI/CD with GitHub Actions](#cicd-with-github-actions)

---

## Prerequisites

### Required Accounts

- ✅ [GitHub](https://github.com) account (for repository)
- ✅ [Cloudflare](https://dash.cloudflare.com/sign-up) account (free tier works!)
- ✅ [Convex](https://convex.dev) account (free tier available)
- ✅ [OpenAI](https://platform.openai.com) account (if using AI features)
- ✅ [Stripe](https://dashboard.stripe.com) account (if using payments)

### Required Tools

```bash
# Node.js 20.18.0 or higher
node --version

# npm 10.0.0 or higher
npm --version

# Git
git --version
```

---

## Overview

**Architecture:**

```
┌─────────────────┐
│  Cloudflare     │ ← Static Frontend (React + Vite)
│  Pages          │
└────────┬────────┘
         │
         │ HTTPS
         │
         ▼
┌─────────────────┐
│  Convex         │ ← Backend (Database + API + Auth)
│  Cloud          │
└─────────────────┘
```

**What goes where:**

- **Cloudflare Pages**: Hosts your built React app (`dist/` folder)
- **Convex**: Handles all backend logic, database, real-time updates, and authentication

---

## Step 1: Prepare Your Project

### 1.1 Clone and Install

```bash
# Clone your repository
git clone https://github.com/hazlijohar95/open-event.git
cd open-event

# Install dependencies
npm install
```

### 1.2 Test Local Build

```bash
# Build the project
npm run build

# Verify dist/ folder is created
ls -la dist/

# Preview the production build
npm run preview
```

✅ **Success**: You should see your app running on `http://localhost:4173`

### 1.3 Verify Build Output

Check that these files exist in `dist/`:

```bash
dist/
├── index.html
├── assets/
│   ├── index-*.js
│   └── index-*.css
├── manifest.webmanifest
├── _redirects          # Important for SPA routing
└── [PWA icons]
```

---

## Step 2: Set Up Convex Backend

Convex is your serverless backend. Set it up first before deploying the frontend.

### 2.1 Install Convex CLI

```bash
npm install -g convex
```

### 2.2 Login to Convex

```bash
npx convex login
```

This will open a browser window. Sign in with Google or GitHub.

### 2.3 Create Production Deployment

```bash
# Deploy to Convex production
npx convex deploy --prod

# You'll see output like:
# ✓ Deployed to https://your-project-name.convex.cloud
```

**📝 Note**: Save this URL! You'll need it as `VITE_CONVEX_URL`

### 2.4 Configure Convex Environment Variables

Go to [Convex Dashboard](https://dashboard.convex.dev) → Your Project → Settings → Environment Variables

Add these **server-side** variables:

#### 🔐 Required Variables

| Variable          | How to Get                            | Example                           |
| ----------------- | ------------------------------------- | --------------------------------- |
| `SITE_URL`        | Your production domain                | `https://yourdomain.com`          |
| `JWT_PRIVATE_KEY` | Generate with OpenSSL (see below)     | `-----BEGIN PRIVATE KEY----- ...` |
| `JWKS`            | Generate from private key (see below) | `{"keys":[{...}]}`                |

#### 🔑 Generating JWT Keys

```bash
# 1. Generate private key
openssl genrsa -out private.pem 2048

# 2. View the private key (copy this entire output including BEGIN/END markers)
cat private.pem

# 3. Generate JWKS from private key
# Use this online tool: https://russelldavies.github.io/jwk-creator/
# Or use the scripts in your project (if available)
```

Copy the **entire private key** (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`) and paste it into Convex's `JWT_PRIVATE_KEY` environment variable.

#### 🎯 Optional Variables (Add if using these features)

| Variable                | Purpose          | Where to Get                                                        |
| ----------------------- | ---------------- | ------------------------------------------------------------------- |
| `OPENAI_API_KEY`        | AI features      | [OpenAI Platform](https://platform.openai.com/api-keys)             |
| `AUTH_GOOGLE_ID`        | Google OAuth     | [Google Console](https://console.cloud.google.com/apis/credentials) |
| `AUTH_GOOGLE_SECRET`    | Google OAuth     | [Google Console](https://console.cloud.google.com/apis/credentials) |
| `AUTH_RESEND_KEY`       | Email auth       | [Resend](https://resend.com/api-keys)                               |
| `EMAIL_FROM`            | Sender email     | `noreply@yourdomain.com`                                            |
| `STRIPE_SECRET_KEY`     | Payments         | [Stripe Dashboard](https://dashboard.stripe.com/apikeys)            |
| `STRIPE_WEBHOOK_SECRET` | Payment webhooks | Stripe Webhooks settings                                            |
| `SENTRY_DSN`            | Error tracking   | [Sentry.io](https://sentry.io)                                      |

### 2.5 Verify Convex Deployment

```bash
# Check deployment logs
npx convex logs --prod

# Test a query
npx convex run events:list --prod
```

---

## Step 3: Configure Cloudflare Pages

### 3.1 Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Pages** in the sidebar
3. Click **Create a project**
4. Click **Connect to Git**

### 3.2 Connect GitHub Repository

1. **Authorize Cloudflare** to access your GitHub
2. **Select your repository**: `hazlijohar95/open-event`
3. Click **Begin setup**

### 3.3 Configure Build Settings

Fill in the build configuration:

| Setting                    | Value                                 |
| -------------------------- | ------------------------------------- |
| **Project name**           | `open-event` (or your preferred name) |
| **Production branch**      | `main`                                |
| **Framework preset**       | `Vite`                                |
| **Build command**          | `npm run build`                       |
| **Build output directory** | `dist`                                |
| **Node version**           | `20.18.0`                             |

### 3.4 Advanced Build Settings

Click **Environment variables (advanced)** and add:

- `NODE_VERSION` = `20.18.0`
- `NPM_VERSION` = `10.0.0`

**⚠️ Important**: Don't add `VITE_*` variables yet. We'll add them in Step 4.

---

## Step 4: Environment Variables

### 4.1 Add Frontend Environment Variables

In Cloudflare Pages dashboard:

1. Go to **Settings** → **Environment variables**
2. Add variables for **Production** environment:

#### Required Variables

```bash
# Convex Backend URL (from Step 2.3)
VITE_CONVEX_URL=https://your-project-name.convex.cloud
```

#### Optional Variables (if using these features)

```bash
# Error Tracking
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Stripe Payments (public key)
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Build-time variables (for Sentry source maps)
SENTRY_AUTH_TOKEN=sntryu_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=javascript-react
```

### 4.2 Create .env.production File

For local production testing, create `.env.production`:

```bash
# Frontend variables
VITE_CONVEX_URL=https://your-project-name.convex.cloud
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

**🔒 Security Note**: Never commit `.env.production` to Git! It's already in `.gitignore`.

---

## Step 5: Custom Domain Setup

### Option A: Using Cloudflare Registered Domain

If you bought your domain through Cloudflare:

1. Go to **Pages** → Your Project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `openevent.my`)
4. Cloudflare will automatically configure DNS
5. SSL certificate is provisioned automatically

### Option B: Using External Domain

If your domain is registered elsewhere:

#### 5.1 Add Custom Domain in Cloudflare

1. Go to **Pages** → Your Project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain: `yourdomain.com`
4. Cloudflare will show DNS records to add

#### 5.2 Configure DNS Records

You'll see instructions like:

```
Type    Name    Content                         Proxy
CNAME   @       open-event.pages.dev           Proxied
CNAME   www     open-event.pages.dev           Proxied
```

Go to your domain registrar (GoDaddy, Namecheap, etc.) and add these records.

#### 5.3 Update Convex SITE_URL

Once your domain is set up:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Settings → Environment Variables
3. Update `SITE_URL` to your custom domain: `https://yourdomain.com`

#### 5.4 Configure OAuth Redirects

If using Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add **Authorized redirect URIs**:
   - `https://yourdomain.com/api/auth/callback/google`
   - `https://yourdomain.com` (for development)

---

## Step 6: Deploy

### 6.1 Initial Deployment

Cloudflare will automatically deploy when you:

1. Complete the setup in Step 3
2. Click **Save and Deploy**

You'll see a build log in real-time.

### 6.2 Monitor Build

Watch for:

```bash
✓ Build succeeded!
✓ Uploading... (xx.xx MB)
✓ Deployment complete!
```

### 6.3 Access Your Site

After deployment completes, you'll get URLs:

- **Production**: `https://open-event.pages.dev`
- **Custom domain** (if configured): `https://yourdomain.com`

### 6.4 Automatic Deployments

Every time you push to `main` branch:

```bash
git add .
git commit -m "feat: awesome new feature"
git push origin main
```

Cloudflare will automatically:

1. Detect the push
2. Build your app
3. Deploy the new version
4. Keep previous versions for rollback

---

## Step 7: Post-Deployment Verification

### 7.1 Functional Tests

Test these features on your live site:

- [ ] **Landing page** loads
- [ ] **Sign up** with email works
- [ ] **Sign in** works
- [ ] **Google OAuth** works (if configured)
- [ ] **Dashboard** loads for authenticated users
- [ ] **Create event** works
- [ ] **AI assistant** responds (if configured)
- [ ] **PWA installation** works
- [ ] **Offline mode** works (service worker)

### 7.2 Performance Checks

```bash
# Test with Lighthouse
npx lighthouse https://yourdomain.com --view

# Check loading times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com
```

Create `curl-format.txt`:

```
time_namelookup:  %{time_namelookup}s
time_connect:  %{time_connect}s
time_appconnect:  %{time_appconnect}s
time_pretransfer:  %{time_pretransfer}s
time_starttransfer:  %{time_starttransfer}s
time_total:  %{time_total}s
```

### 7.3 Monitor Logs

**Cloudflare Functions Logs:**

1. Go to **Pages** → Your Project → **Functions**
2. View real-time logs

**Convex Logs:**

```bash
npx convex logs --prod --tail
```

**Sentry Dashboard** (if configured):

- Check for errors at https://sentry.io

---

## Troubleshooting

### Issue: Build Fails with "Module not found"

**Solution:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try building locally
npm run build
```

### Issue: "404 Not Found" on refresh

**Cause**: SPA routing not configured

**Solution**: Ensure `public/_redirects` exists with:

```
/*    /index.html   200
```

This file should be automatically copied to `dist/` during build.

### Issue: "Convex connection failed"

**Cause**: Wrong `VITE_CONVEX_URL` or CORS issue

**Solution:**

1. Verify URL in Cloudflare Pages environment variables
2. Check Convex dashboard for deployment status
3. Verify CORS settings in Convex

### Issue: OAuth redirect errors

**Cause**: `SITE_URL` mismatch or wrong redirect URIs

**Solution:**

1. Update Convex `SITE_URL` to match your domain
2. Update OAuth provider redirect URIs to include your domain
3. Clear browser cookies and try again

### Issue: Service Worker not updating

**Cause**: Aggressive caching

**Solution:**

```bash
# In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister())
})

# Then hard refresh (Ctrl+Shift+R)
```

### Issue: Environment variables not working

**Symptoms**: App can't connect to Convex, features missing

**Solution:**

1. Check variable names start with `VITE_` for frontend
2. Verify they're added in **Production** environment (not Preview)
3. Re-deploy after adding variables:
   - Go to **Deployments** → Click **•••** → **Retry deployment**

### Issue: Build succeeds but app shows blank page

**Debugging steps:**

```bash
# 1. Check browser console for errors
# 2. Verify base path in vite.config.ts
# 3. Check if assets are loading (Network tab)
# 4. Try building and previewing locally
npm run build && npm run preview
```

---

## CI/CD with GitHub Actions

### Option 1: Use Cloudflare's Automatic Deployments

**Pros**: Zero configuration, works out of the box
**Cons**: Less control over build process

This is the default. Every push to `main` triggers a deployment.

### Option 2: GitHub Actions + Wrangler

For more control, use GitHub Actions:

#### Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.18.0'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_CONVEX_URL: ${{ secrets.VITE_CONVEX_URL }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: open-event
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

#### Add GitHub Secrets:

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `CLOUDFLARE_API_TOKEN`: From Cloudflare dashboard → My Profile → API Tokens
   - `CLOUDFLARE_ACCOUNT_ID`: From Cloudflare dashboard (in URL)
   - `VITE_CONVEX_URL`: Your Convex deployment URL
   - `VITE_SENTRY_DSN`: Your Sentry DSN (if using)

---

## Performance Optimization

### 1. Enable Cloudflare CDN Features

In Cloudflare Dashboard → Your Domain:

**Speed:**

- ✅ Enable **Auto Minify** (JS, CSS, HTML)
- ✅ Enable **Brotli** compression
- ✅ Enable **Rocket Loader** (test first!)
- ✅ Enable **Mirage** (image optimization)

**Caching:**

- ✅ Cache Level: **Standard**
- ✅ Browser Cache TTL: **4 hours**
- ✅ Always Online: **On**

### 2. Configure Cache Rules

Create Page Rule for static assets:

```
Pattern: yourdomain.com/assets/*
Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 month
```

### 3. Enable HTTP/3 (QUIC)

1. Go to **Network** tab
2. Enable **HTTP/3 (with QUIC)**

---

## Security Best Practices

### 1. Enable Security Headers

In Cloudflare Dashboard → **Transform Rules** → **HTTP Response Headers**:

Add these headers:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 2. Enable Bot Fight Mode

**Security** → **Bots** → Enable **Bot Fight Mode**

### 3. Configure SSL/TLS

**SSL/TLS** → Set to **Full (strict)**

### 4. Enable WAF (Web Application Firewall)

**Security** → **WAF** → Enable **Managed Rules**

---

## Rollback Procedure

If something goes wrong after deployment:

### Via Cloudflare Dashboard:

1. Go to **Deployments** tab
2. Find the previous working deployment
3. Click **•••** → **Rollback to this deployment**
4. Confirm

### Via Git:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

**⚠️ Warning**: Force push requires coordination with your team!

---

## Cost Estimation

### Cloudflare Pages (Free Tier)

- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ 500 builds per month
- ✅ 1 concurrent build
- ✅ Free SSL certificate
- ✅ DDoS protection

### Convex (Free Tier)

- ✅ 1M function calls/month
- ✅ 1GB database storage
- ✅ 1GB file storage

### Estimated Monthly Costs (for scaling)

| Service          | Free Tier | Paid (Small) | Paid (Medium) |
| ---------------- | --------- | ------------ | ------------- |
| Cloudflare Pages | $0        | $20/mo       | $200/mo       |
| Convex           | $0        | $25/mo       | $65/mo        |
| OpenAI           | -         | ~$20/mo      | ~$100/mo      |
| Stripe           | Free      | 2.9% + 30¢   | 2.9% + 30¢    |
| **Total**        | **$0**    | **~$65/mo**  | **~$365/mo**  |

---

## Monitoring & Alerts

### Set Up Cloudflare Notifications

1. Go to **Notifications** in Cloudflare dashboard
2. Enable:
   - ✅ **Deployment failures**
   - ✅ **Error rate spikes**
   - ✅ **SSL certificate expiration**

### Set Up Convex Monitoring

Use Convex Dashboard to monitor:

- Function execution times
- Error rates
- Database queries

### Set Up Sentry Alerts

If using Sentry:

1. Create alert rules for error rate spikes
2. Configure Slack/email notifications

---

## Next Steps

After successful deployment:

1. ✅ **Set up analytics** (Cloudflare Web Analytics or Google Analytics)
2. ✅ **Configure monitoring** (Uptime checks, error tracking)
3. ✅ **Set up staging environment** (separate Cloudflare Pages project)
4. ✅ **Configure backups** (Convex has automatic backups)
5. ✅ **Document your process** (update your team wiki)

---

## Additional Resources

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Convex Docs](https://docs.convex.dev/)
- [Vite Production Deployment](https://vitejs.dev/guide/static-deploy.html)
- [React Deployment Best Practices](https://react.dev/learn/start-a-new-react-project#deploying-to-production)

---

## Support

Need help? Check these resources:

- **Cloudflare Community**: [community.cloudflare.com](https://community.cloudflare.com)
- **Convex Discord**: [convex.dev/community](https://convex.dev/community)
- **Project Issues**: [GitHub Issues](https://github.com/hazlijohar95/open-event/issues)

---

**Last Updated**: January 2026
**Maintained By**: Open Event Team
**Version**: 1.0.0
