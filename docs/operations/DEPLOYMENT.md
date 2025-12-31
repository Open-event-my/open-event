# Deployment Procedures

This document outlines the deployment procedures for Open Event, including step-by-step instructions for deploying to production and rollback procedures.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Steps](#deployment-steps)
- [Rollback Procedures](#rollback-procedures)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- Node.js 20.18.0+ (`node --version`)
- npm 10.0.0+ (`npm --version`)
- Convex CLI (`npx convex --version`)
- Git (`git --version`)

### Required Accounts

- **Convex**: Production deployment account with admin access
- **Hosting Provider**: Vercel, Netlify, or similar for frontend hosting
- **Sentry**: Error monitoring account (optional but recommended)
- **Stripe**: Payment processing account (if payments enabled)

### Required Environment Variables

See `.env.example` for the complete list. Critical variables for production:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_CONVEX_URL` | Convex production deployment URL | Yes |
| `SITE_URL` | Production site URL for OAuth redirects | Yes |
| `CONVEX_AUTH_PRIVATE_KEY` | JWT signing key | Yes |
| `JWKS` | JSON Web Key Set | Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Optional |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | Recommended |

## Environment Setup

### 1. Create Production Convex Deployment

```bash
# Login to Convex
npx convex login

# Create production deployment
npx convex deploy --prod

# Note the deployment URL (e.g., https://your-project.convex.cloud)
```

### 2. Configure Environment Variables in Convex

Navigate to [Convex Dashboard](https://dashboard.convex.dev) → Your Project → Settings → Environment Variables

Set the following server-side variables:
- `SITE_URL`
- `CONVEX_AUTH_PRIVATE_KEY`
- `JWKS`
- `OPENAI_API_KEY` (if using AI features)
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` (if using Google OAuth)
- `AUTH_RESEND_KEY` (if using email authentication)

### 3. Configure Frontend Environment

Create `.env.production` file:

```bash
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

## Deployment Steps

### Pre-Deployment Checklist

- [ ] All tests pass locally (`npm run test:run`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Code is linted (`npm run lint`)
- [ ] Environment variables are configured
- [ ] Database migrations are ready (if any)
- [ ] Changelog is updated
- [ ] Version is bumped in `package.json`

### Step 1: Create Release Branch

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v$(node -p "require('./package.json').version")
```

### Step 2: Run Pre-Deployment Tests

```bash
# Run all tests
npm run test:run

# Run E2E tests
npm run test:e2e

# Build to check for errors
npm run build
```

### Step 3: Deploy Backend (Convex)

```bash
# Deploy to production
npx convex deploy --prod

# Verify deployment
npx convex logs --prod
```

### Step 4: Deploy Frontend

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy to production
vercel --prod
```

#### Option B: Netlify

```bash
# Install Netlify CLI if not installed
npm i -g netlify-cli

# Build the project
npm run build

# Deploy to production
netlify deploy --prod --dir=dist
```

#### Option C: Manual Deployment

```bash
# Build the project
npm run build

# Upload dist/ folder to your hosting provider
```

### Step 5: Run Database Migrations (if any)

```bash
# Run migrations via Convex dashboard or CLI
npx convex run migrations/yourMigration --prod
```

### Step 6: Verify Deployment

```bash
# Check frontend is accessible
curl -I https://your-domain.com

# Check Convex backend health
curl https://your-project.convex.cloud/api/health

# Monitor logs for errors
npx convex logs --prod --tail
```

### Step 7: Tag Release

```bash
# Merge release branch
git checkout main
git merge release/v$(node -p "require('./package.json').version")

# Tag the release
git tag -a v$(node -p "require('./package.json').version") -m "Release v$(node -p "require('./package.json').version")"

# Push tags
git push origin main --tags
```

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

If issues are detected immediately after deployment:

#### 1. Rollback Frontend

**Vercel:**
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

**Netlify:**
```bash
# List recent deployments
netlify deploy:list

# Rollback via Netlify dashboard
# Go to Deploys → Click on previous deployment → Publish deploy
```

#### 2. Rollback Backend (Convex)

Convex maintains deployment history. To rollback:

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to Deployments
4. Click on the previous stable deployment
5. Click "Redeploy"

### Database Rollback

If database migrations need to be rolled back:

```bash
# Run rollback migration
npx convex run migrations/rollback_yourMigration --prod
```

### Full Rollback Procedure

1. **Notify team** via Slack/PagerDuty
2. **Rollback frontend** to previous version
3. **Rollback backend** to previous Convex deployment
4. **Rollback database** migrations if necessary
5. **Verify** all services are operational
6. **Document** the incident

### Rollback Verification

After rollback, verify:

- [ ] Frontend loads correctly
- [ ] Authentication works
- [ ] Core features function (events, vendors, sponsors)
- [ ] No errors in Sentry
- [ ] No errors in Convex logs

## Post-Deployment Verification

### Automated Checks

```bash
# Run smoke tests
npm run test:e2e -- --grep "@smoke"

# Check error rates in Sentry
# Monitor Convex dashboard for errors
```

### Manual Verification Checklist

- [ ] Landing page loads
- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Dashboard loads for authenticated users
- [ ] Event creation works
- [ ] Vendor/Sponsor features work
- [ ] AI assistant responds (if enabled)
- [ ] Payment flow works (if enabled)

### Monitoring

After deployment, monitor for 30 minutes:

1. **Sentry**: Watch for new errors
2. **Convex Dashboard**: Monitor function execution times
3. **Hosting Provider**: Check response times and error rates

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

#### Convex Deployment Fails

```bash
# Check for schema issues
npx convex dev --once

# Verify environment variables
npx convex env list --prod
```

#### Frontend Not Connecting to Backend

1. Verify `VITE_CONVEX_URL` is correct
2. Check CORS configuration in Convex
3. Verify the Convex deployment is running

#### Authentication Issues

1. Verify `SITE_URL` matches your domain
2. Check OAuth credentials are correct
3. Verify `CONVEX_AUTH_PRIVATE_KEY` and `JWKS` are set

### Emergency Contacts

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| On-Call Engineer | [Slack: #on-call] | Immediate |
| Tech Lead | [Email/Phone] | 15 minutes |
| Platform Admin | [Email/Phone] | 30 minutes |

## Deployment Schedule

### Recommended Windows

- **Production**: Tuesday-Thursday, 10:00-16:00 local time
- **Avoid**: Fridays, weekends, holidays, major events

### Deployment Freeze Periods

- Major holidays
- During critical business events
- When key personnel are unavailable

---

*Last Updated: December 2024*
*Document Owner: Platform Team*
