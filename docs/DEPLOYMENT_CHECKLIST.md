# 🚀 Cloudflare Deployment Checklist

Quick reference checklist for deploying Open Event to Cloudflare Pages.

## Pre-Deployment

### 1. Prerequisites ✓

- [ ] Node.js 20.18.0+ installed
- [ ] GitHub account created
- [ ] Cloudflare account created
- [ ] Convex account created
- [ ] OpenAI API key (if using AI features)
- [ ] Stripe account (if using payments)

### 2. Local Testing ✓

```bash
# Install dependencies
npm install

# Run tests
npm run test:run

# Build project
npm run build

# Preview production build
npm run preview
```

- [ ] All tests pass
- [ ] Build completes successfully
- [ ] Preview works at localhost:4173

---

## Convex Backend Setup

### 3. Deploy Convex ✓

```bash
# Login to Convex
npx convex login

# Deploy to production
npx convex deploy --prod
```

- [ ] Deployment successful
- [ ] Convex URL obtained: `https://______.convex.cloud`

### 4. Configure Convex Environment Variables ✓

Go to [Convex Dashboard](https://dashboard.convex.dev) → Settings → Environment Variables

**Required:**

- [ ] `SITE_URL` = `https://yourdomain.com`
- [ ] `JWT_PRIVATE_KEY` = (OpenSSL generated key)
- [ ] `JWKS` = (JSON Web Key Set)

**Optional (if using):**

- [ ] `OPENAI_API_KEY` = `sk-proj-...`
- [ ] `AUTH_GOOGLE_ID` = (Google OAuth Client ID)
- [ ] `AUTH_GOOGLE_SECRET` = (Google OAuth Secret)
- [ ] `AUTH_RESEND_KEY` = (Resend API key)
- [ ] `EMAIL_FROM` = `noreply@yourdomain.com`
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- [ ] `SENTRY_DSN` = (Sentry DSN)

---

## Cloudflare Pages Setup

### 5. Create Cloudflare Pages Project ✓

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pages → Create a project → Connect to Git

- [ ] GitHub authorized
- [ ] Repository selected
- [ ] Project created

### 6. Configure Build Settings ✓

| Setting                | Value           |
| ---------------------- | --------------- |
| Production branch      | `main`          |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Node version           | `20.18.0`       |

- [ ] Build settings configured
- [ ] Environment variables added (see below)

### 7. Add Frontend Environment Variables ✓

Settings → Environment variables → Production

**Required:**

- [ ] `VITE_CONVEX_URL` = (from Step 3)
- [ ] `NODE_VERSION` = `20.18.0`

**Optional:**

- [ ] `VITE_SENTRY_DSN` = (Sentry DSN)
- [ ] `VITE_STRIPE_PUBLIC_KEY` = `pk_live_...`
- [ ] `SENTRY_AUTH_TOKEN` = (for source maps)
- [ ] `SENTRY_ORG` = (your org slug)
- [ ] `SENTRY_PROJECT` = `javascript-react`

---

## Domain Setup (Optional)

### 8. Configure Custom Domain ✓

**Option A: Cloudflare Domain**

- [ ] Add domain in Pages → Custom domains
- [ ] DNS automatically configured
- [ ] SSL certificate provisioned

**Option B: External Domain**

- [ ] Add CNAME record at registrar
- [ ] Point to `*.pages.dev`
- [ ] Verify DNS propagation
- [ ] SSL certificate provisioned

### 9. Update OAuth Redirects ✓

If using Google OAuth:

- [ ] Update Convex `SITE_URL` to custom domain
- [ ] Update Google OAuth redirect URIs:
  - `https://yourdomain.com/api/auth/callback/google`

---

## Deployment

### 10. Initial Deploy ✓

- [ ] Click "Save and Deploy" in Cloudflare
- [ ] Monitor build logs
- [ ] Build succeeds
- [ ] Site accessible at `*.pages.dev`

### 11. Verify Deployment ✓

Test on live site:

**Authentication:**

- [ ] Sign up with email
- [ ] Sign in with email
- [ ] Google OAuth (if configured)
- [ ] Password reset

**Core Features:**

- [ ] Landing page loads
- [ ] Dashboard accessible
- [ ] Create event
- [ ] View events list
- [ ] Edit event
- [ ] Delete event

**Advanced Features:**

- [ ] AI assistant responds (if configured)
- [ ] Vendor search works
- [ ] Sponsor search works
- [ ] Budget tracking
- [ ] Task management

**Technical:**

- [ ] PWA installable
- [ ] Service worker registers
- [ ] Offline mode works
- [ ] Images load
- [ ] No console errors

---

## Post-Deployment

### 12. Performance Checks ✓

```bash
# Lighthouse score
npx lighthouse https://yourdomain.com --view
```

Target scores:

- [ ] Performance: 90+
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+
- [ ] SEO: 95+

### 13. Security Setup ✓

**Cloudflare Settings:**

- [ ] SSL/TLS: Full (strict)
- [ ] Bot Fight Mode enabled
- [ ] WAF enabled
- [ ] Security headers configured
- [ ] HTTP/3 enabled

### 14. Monitoring Setup ✓

**Cloudflare:**

- [ ] Deployment failure alerts
- [ ] Error rate alerts
- [ ] SSL expiration alerts

**Convex:**

- [ ] Dashboard bookmarked
- [ ] Error alerts configured

**Sentry (if using):**

- [ ] Error tracking active
- [ ] Alert rules configured
- [ ] Slack/email notifications

### 15. Optimization ✓

**Cloudflare:**

- [ ] Auto Minify enabled (JS, CSS, HTML)
- [ ] Brotli compression enabled
- [ ] Browser Cache TTL: 4 hours
- [ ] Page rule for `/assets/*` (1 month cache)

---

## Ongoing Maintenance

### Daily

- [ ] Check error logs in Sentry/Convex
- [ ] Monitor uptime

### Weekly

- [ ] Review Cloudflare analytics
- [ ] Check Convex usage (function calls, storage)
- [ ] Review new issues on GitHub

### Monthly

- [ ] Update dependencies (`npm outdated`)
- [ ] Review and rotate API keys
- [ ] Check SSL certificate expiry
- [ ] Review costs (Convex, OpenAI, Stripe)

---

## Emergency Procedures

### Rollback Deployment

**Via Cloudflare Dashboard:**

1. Go to Deployments tab
2. Find previous working deployment
3. Click ••• → Rollback

**Via Git:**

```bash
git revert HEAD
git push origin main
```

### Debug Build Failure

```bash
# Clear and rebuild
rm -rf node_modules dist
npm install
npm run build

# Check logs
# Cloudflare: Pages → Deployments → View build log
# Convex: npx convex logs --prod
```

### Connection Issues

1. Verify `VITE_CONVEX_URL` matches Convex deployment
2. Check Convex deployment status
3. Verify CORS settings
4. Clear browser cache
5. Check browser console for errors

---

## Quick Commands Reference

```bash
# Deploy Convex
npx convex deploy --prod

# View Convex logs
npx convex logs --prod --tail

# Build frontend
npm run build

# Preview build locally
npm run preview

# Run tests
npm run test:run

# Check for updates
npm outdated
```

---

## Support Contacts

- **Cloudflare**: [community.cloudflare.com](https://community.cloudflare.com)
- **Convex**: [Discord](https://convex.dev/community)
- **Project Issues**: [GitHub](https://github.com/hazlijohar95/open-event/issues)

---

**Print this checklist** and check off items as you complete them! ✅

_Last Updated: January 2026_
