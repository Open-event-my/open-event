# Operations Runbook

This runbook documents common operational issues, their symptoms, and step-by-step resolution procedures for the Open Event platform.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [AI Service Issues](#ai-service-issues)
- [Payment Issues](#payment-issues)
- [Performance Issues](#performance-issues)
- [Frontend Issues](#frontend-issues)
- [Monitoring & Alerting](#monitoring--alerting)

## Quick Reference

### Health Check Commands

```bash
# Check frontend status
curl -I https://your-domain.com

# Check Convex backend
npx convex logs --prod --tail

# Check Convex function status
npx convex dashboard --prod
```

### Common Quick Fixes

| Issue                | Quick Fix                                 |
| -------------------- | ----------------------------------------- |
| Frontend not loading | Clear CDN cache, check hosting status     |
| Auth not working     | Verify SITE_URL and OAuth credentials     |
| AI not responding    | Check OpenAI API key and rate limits      |
| Slow queries         | Check Convex dashboard for slow functions |

---

## Authentication Issues

### Issue: Users Cannot Sign In

**Symptoms:**

- Sign in form submits but nothing happens
- "Invalid credentials" error for valid users
- OAuth redirect fails

**Diagnosis:**

```bash
# Check Convex logs for auth errors
npx convex logs --prod | grep -i "auth\|login\|session"

# Verify environment variables
npx convex env list --prod | grep -i "auth\|site"
```

**Resolution Steps:**

1. **Check SITE_URL configuration:**

   ```bash
   # Verify SITE_URL matches your domain
   npx convex env get SITE_URL --prod
   ```

   - Must match exactly (including https://)
   - No trailing slash

2. **Verify OAuth credentials (if using Google):**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Verify redirect URIs include your domain
   - Check client ID and secret are correct

3. **Check session table:**
   - Go to Convex Dashboard → Data → sessions
   - Verify sessions are being created
   - Check for expired sessions

4. **Clear user's browser data:**
   - Clear cookies for your domain
   - Clear localStorage
   - Try incognito mode

### Issue: Sessions Expiring Too Quickly

**Symptoms:**

- Users logged out unexpectedly
- "Session expired" errors

**Resolution:**

1. Check session timeout configuration in `convex/customAuth.ts`
2. Verify refresh token rotation is working
3. Check for clock skew between client and server

### Issue: Password Reset Not Working

**Symptoms:**

- Reset email not received
- Reset link expired immediately

**Resolution:**

1. **Check email configuration:**

   ```bash
   npx convex env get AUTH_RESEND_KEY --prod
   npx convex env get EMAIL_FROM --prod
   ```

2. **Verify Resend account:**
   - Check Resend dashboard for delivery status
   - Verify domain is verified
   - Check for rate limits

---

## Database Issues

### Issue: Slow Query Performance

**Symptoms:**

- Pages loading slowly
- Timeout errors
- High latency in Convex dashboard

**Diagnosis:**

1. Go to Convex Dashboard → Functions
2. Sort by "Avg Duration"
3. Identify slow functions

**Resolution:**

1. **Add missing indexes:**

   ```typescript
   // In convex/schema.ts
   events: defineTable({...})
     .index("by_organizer", ["organizerId"])
     .index("by_status", ["status"])
   ```

2. **Optimize queries:**
   - Use `.filter()` after `.withIndex()`
   - Limit result sets with `.take()`
   - Avoid fetching unnecessary fields

3. **Check for N+1 queries:**
   - Use batch operations instead of loops
   - Prefetch related data

### Issue: Data Inconsistency

**Symptoms:**

- Missing records
- Duplicate entries
- Orphaned references

**Resolution:**

1. **Identify affected records:**

   ```bash
   # Run data integrity check
   npx convex run queries/dataIntegrityCheck --prod
   ```

2. **Fix orphaned records:**

   ```bash
   # Run cleanup migration
   npx convex run migrations/cleanupOrphanedRecords --prod
   ```

3. **Prevent future issues:**
   - Add cascading deletes
   - Implement referential integrity checks

### Issue: Database Connection Errors

**Symptoms:**

- "Failed to connect" errors
- Intermittent query failures

**Resolution:**

1. Check Convex status page: https://status.convex.dev
2. Verify deployment is active in Convex Dashboard
3. Check for rate limiting (too many concurrent connections)

---

## AI Service Issues

### Issue: AI Assistant Not Responding

**Symptoms:**

- Chat shows "thinking" indefinitely
- "AI service unavailable" error
- Empty responses

**Diagnosis:**

```bash
# Check AI-related logs
npx convex logs --prod | grep -i "openai\|ai\|agent"

# Verify API key
npx convex env get OPENAI_API_KEY --prod
```

**Resolution:**

1. **Verify OpenAI API key:**
   - Check key is valid at [OpenAI Dashboard](https://platform.openai.com/api-keys)
   - Verify billing is active
   - Check usage limits

2. **Check circuit breaker status:**
   - If circuit is open, wait for reset (5 minutes)
   - Or manually reset via admin panel

3. **Fallback to cached responses:**
   - Enable AI response caching
   - Use fallback messages for common queries

### Issue: AI Responses Are Slow

**Symptoms:**

- Long wait times for AI responses
- Timeouts

**Resolution:**

1. **Check OpenAI status:** https://status.openai.com
2. **Reduce prompt size:**
   - Trim conversation history
   - Use shorter system prompts
3. **Enable response streaming:**
   - Update to streaming API calls
   - Show partial responses

### Issue: AI Generating Incorrect Responses

**Symptoms:**

- Hallucinated information
- Wrong tool calls
- Inappropriate responses

**Resolution:**

1. **Review and update prompts:**
   - Check `convex/lib/agent/tools.ts`
   - Improve tool descriptions
   - Add more examples

2. **Implement response validation:**
   - Validate tool call parameters
   - Check response format
   - Filter inappropriate content

---

## Payment Issues

### Issue: Payments Failing

**Symptoms:**

- "Payment failed" errors
- Stripe webhook errors
- Orders not created after payment

**Diagnosis:**

```bash
# Check payment logs
npx convex logs --prod | grep -i "stripe\|payment\|order"
```

**Resolution:**

1. **Verify Stripe configuration:**
   - Check API keys in Stripe Dashboard
   - Verify webhook endpoint is configured
   - Check webhook signing secret

2. **Check webhook delivery:**
   - Go to Stripe Dashboard → Webhooks
   - Check for failed deliveries
   - Retry failed webhooks

3. **Verify idempotency:**
   - Check for duplicate payment attempts
   - Verify idempotency keys are being used

### Issue: Refunds Not Processing

**Symptoms:**

- Refund button not working
- Refund stuck in "pending"

**Resolution:**

1. Check Stripe Dashboard for refund status
2. Verify refund amount doesn't exceed original charge
3. Check for Stripe API errors in logs

---

## Performance Issues

### Issue: High Memory Usage

**Symptoms:**

- Slow response times
- Out of memory errors
- Function timeouts

**Resolution:**

1. **Identify memory-heavy functions:**
   - Check Convex Dashboard → Functions
   - Look for high memory usage

2. **Optimize data handling:**
   - Stream large datasets
   - Paginate results
   - Avoid loading entire collections

### Issue: High Latency

**Symptoms:**

- Slow page loads
- API timeouts
- Poor user experience

**Resolution:**

1. **Check CDN configuration:**
   - Verify static assets are cached
   - Check cache hit rates

2. **Optimize bundle size:**

   ```bash
   # Analyze bundle
   npm run build -- --analyze
   ```

3. **Enable lazy loading:**
   - Lazy load routes
   - Lazy load heavy components (tldraw, recharts)

### Issue: Rate Limiting Triggered

**Symptoms:**

- 429 Too Many Requests errors
- Users blocked from actions

**Resolution:**

1. **Identify rate-limited users:**

   ```bash
   npx convex logs --prod | grep "rate limit"
   ```

2. **Adjust rate limits if needed:**
   - Review `convex/lib/security/rateLimiter.ts`
   - Increase limits for legitimate use cases

3. **Implement request queuing:**
   - Add client-side request throttling
   - Queue non-critical requests

---

## Frontend Issues

### Issue: Blank Page / App Not Loading

**Symptoms:**

- White screen
- JavaScript errors in console
- Assets not loading

**Resolution:**

1. **Check browser console for errors**

2. **Verify build artifacts:**

   ```bash
   # Rebuild
   npm run build

   # Check dist folder
   ls -la dist/
   ```

3. **Clear CDN cache:**
   - Vercel: `vercel --force`
   - Netlify: Clear cache in dashboard

4. **Check for CORS issues:**
   - Verify Convex URL is correct
   - Check CORS configuration

### Issue: PWA Not Working

**Symptoms:**

- App not installable
- Offline mode not working
- Service worker errors

**Resolution:**

1. **Check service worker registration:**
   - Open DevTools → Application → Service Workers
   - Verify service worker is registered

2. **Clear service worker cache:**
   - Unregister service worker
   - Clear all site data
   - Reload

3. **Verify manifest:**
   - Check `public/site.webmanifest`
   - Verify icons are accessible

---

## Monitoring & Alerting

### Setting Up Alerts

1. **Sentry Alerts:**
   - Go to Sentry → Alerts
   - Create alert for error spike
   - Set threshold (e.g., >10 errors/minute)

2. **Convex Monitoring:**
   - Use Convex Dashboard for function metrics
   - Set up external monitoring (UptimeRobot, Pingdom)

### Responding to Alerts

1. **Error Spike Alert:**
   - Check Sentry for error details
   - Identify affected users/features
   - Determine if rollback needed

2. **Downtime Alert:**
   - Check hosting provider status
   - Check Convex status
   - Initiate incident response if needed

### Log Analysis

```bash
# View recent errors
npx convex logs --prod | grep -i "error"

# View auth events
npx convex logs --prod | grep -i "auth\|login\|logout"

# View payment events
npx convex logs --prod | grep -i "stripe\|payment"

# Export logs for analysis
npx convex logs --prod --since "1 hour ago" > logs.txt
```

---

## Escalation Matrix

| Severity                      | Response Time | Escalation Path           |
| ----------------------------- | ------------- | ------------------------- |
| Critical (site down)          | 15 minutes    | On-call → Tech Lead → CTO |
| High (major feature broken)   | 1 hour        | On-call → Tech Lead       |
| Medium (minor feature broken) | 4 hours       | On-call                   |
| Low (cosmetic issues)         | 24 hours      | Regular ticket            |

---

_Last Updated: December 2024_
_Document Owner: Platform Team_
