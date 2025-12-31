# Monitoring Dashboard Setup Guide

This guide provides instructions for setting up and configuring monitoring dashboards for the Open Event platform.

## Table of Contents

- [Overview](#overview)
- [Sentry Setup](#sentry-setup)
- [Convex Dashboard](#convex-dashboard)
- [Uptime Monitoring](#uptime-monitoring)
- [Custom Dashboards](#custom-dashboards)
- [Alert Configuration](#alert-configuration)
- [Dashboard Templates](#dashboard-templates)

## Overview

### Monitoring Stack

| Component | Tool | Purpose |
|-----------|------|---------|
| Error Tracking | Sentry | Frontend & backend errors |
| Backend Monitoring | Convex Dashboard | Function performance, database |
| Uptime Monitoring | UptimeRobot/Pingdom | Service availability |
| Log Aggregation | Convex Logs | Centralized logging |
| Custom Metrics | Internal Metrics Service | Business metrics |

### Key Metrics to Monitor

| Category | Metrics |
|----------|---------|
| **Availability** | Uptime %, response time, error rate |
| **Performance** | Page load time, API latency, database query time |
| **Security** | Failed logins, rate limit hits, suspicious activity |
| **Business** | Active users, events created, transactions |
| **AI** | AI response time, token usage, error rate |

## Sentry Setup

### Step 1: Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project:
   - Platform: React
   - Project name: `open-event-frontend`
3. Create another project:
   - Platform: Node.js
   - Project name: `open-event-backend`

### Step 2: Configure Frontend

1. **Install Sentry SDK:**
   ```bash
   npm install @sentry/react @sentry/vite-plugin
   ```

2. **Configure in `src/main.tsx`:**
   ```typescript
   import * as Sentry from '@sentry/react';

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
     integrations: [
       Sentry.browserTracingIntegration(),
       Sentry.replayIntegration(),
     ],
     tracesSampleRate: 0.1, // 10% of transactions
     replaysSessionSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
   });
   ```

3. **Add Error Boundary:**
   ```typescript
   import { ErrorBoundary } from '@sentry/react';

   <ErrorBoundary fallback={<ErrorFallback />}>
     <App />
   </ErrorBoundary>
   ```

4. **Configure Vite plugin for source maps:**
   ```typescript
   // vite.config.ts
   import { sentryVitePlugin } from '@sentry/vite-plugin';

   export default defineConfig({
     plugins: [
       sentryVitePlugin({
         org: 'your-org',
         project: 'open-event-frontend',
         authToken: process.env.SENTRY_AUTH_TOKEN,
       }),
     ],
   });
   ```

### Step 3: Configure Backend

1. **Install Sentry SDK:**
   ```bash
   npm install @sentry/node
   ```

2. **Configure in Convex functions:**
   ```typescript
   // convex/lib/sentry.ts
   import * as Sentry from '@sentry/node';

   export function initSentry() {
     Sentry.init({
       dsn: process.env.SENTRY_DSN,
       environment: process.env.NODE_ENV,
       tracesSampleRate: 0.1,
     });
   }

   export function captureError(error: Error, context?: Record<string, unknown>) {
     Sentry.captureException(error, { extra: context });
   }
   ```

### Step 4: Configure Sentry Alerts

1. Go to Sentry → Alerts → Create Alert Rule

2. **Error Spike Alert:**
   - Condition: Number of errors > 10 in 5 minutes
   - Action: Send to Slack #alerts

3. **New Issue Alert:**
   - Condition: New issue created
   - Filter: Level = error or fatal
   - Action: Send to email

4. **Performance Alert:**
   - Condition: Transaction duration > 5s
   - Action: Send to Slack #performance

### Sentry Dashboard Configuration

Create custom dashboards in Sentry:

1. **Error Overview Dashboard:**
   - Widget: Error count over time
   - Widget: Top errors by count
   - Widget: Errors by browser/OS
   - Widget: Error rate by release

2. **Performance Dashboard:**
   - Widget: Transaction duration (p50, p95, p99)
   - Widget: Throughput over time
   - Widget: Slowest transactions
   - Widget: Web vitals (LCP, FID, CLS)

## Convex Dashboard

### Accessing the Dashboard

```bash
# Open Convex dashboard
npx convex dashboard --prod
```

Or visit: https://dashboard.convex.dev

### Key Sections to Monitor

#### 1. Functions Tab

Monitor function performance:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Avg Duration | < 100ms | > 500ms |
| P99 Duration | < 500ms | > 2s |
| Error Rate | < 0.1% | > 1% |
| Invocations | Varies | Unusual spikes |

**Setup:**
1. Go to Functions tab
2. Sort by "Avg Duration" to find slow functions
3. Click on function for detailed metrics

#### 2. Data Tab

Monitor database:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Document Count | Varies | Unusual growth |
| Storage Used | < 80% quota | > 90% quota |
| Index Usage | High | Low (missing indexes) |

#### 3. Logs Tab

View real-time logs:

```bash
# Stream logs
npx convex logs --prod --tail

# Filter logs
npx convex logs --prod | grep -i "error"

# Export logs
npx convex logs --prod --since "1 hour ago" > logs.txt
```

### Setting Up Convex Alerts

Convex doesn't have built-in alerting, so use external monitoring:

1. **Create health check endpoint:**
   ```typescript
   // convex/http.ts
   import { httpRouter } from 'convex/server';

   const http = httpRouter();

   http.route({
     path: '/health',
     method: 'GET',
     handler: async () => {
       return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
         headers: { 'Content-Type': 'application/json' },
       });
     },
   });

   export default http;
   ```

2. **Monitor with external service** (see Uptime Monitoring section)

## Uptime Monitoring

### UptimeRobot Setup

1. Create account at [uptimerobot.com](https://uptimerobot.com)

2. **Add monitors:**

   | Monitor | URL | Interval | Alert |
   |---------|-----|----------|-------|
   | Frontend | https://your-domain.com | 5 min | Email, Slack |
   | API Health | https://your-project.convex.cloud/health | 5 min | Email, Slack |
   | Auth Endpoint | https://your-domain.com/api/auth/health | 5 min | Email, Slack |

3. **Configure alerts:**
   - Email: team@your-domain.com
   - Slack: #alerts channel via webhook
   - SMS: For critical monitors

### Pingdom Setup (Alternative)

1. Create account at [pingdom.com](https://pingdom.com)

2. **Add uptime checks:**
   - HTTP check for frontend
   - HTTP check for API
   - Transaction check for critical flows

3. **Configure alerting:**
   - Integration with PagerDuty
   - Email notifications
   - Slack integration

### Status Page Setup

Create a public status page:

1. **Using Statuspage.io:**
   - Create components for each service
   - Configure automated monitoring
   - Set up incident templates

2. **Components to track:**
   - Website
   - API
   - Authentication
   - Payments
   - AI Features

## Custom Dashboards

### Internal Metrics Dashboard

Create a custom dashboard for business metrics:

```typescript
// convex/metrics.ts
import { query } from './_generated/server';

export const getDashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Active users (last 24h)
    const activeUsers = await ctx.db
      .query('sessions')
      .filter((q) => q.gt(q.field('lastActiveAt'), dayAgo))
      .collect();

    // Events created (last 7 days)
    const newEvents = await ctx.db
      .query('events')
      .filter((q) => q.gt(q.field('createdAt'), weekAgo))
      .collect();

    // Orders (last 7 days)
    const orders = await ctx.db
      .query('orders')
      .filter((q) => q.gt(q.field('createdAt'), weekAgo))
      .collect();

    return {
      activeUsers24h: activeUsers.length,
      newEventsWeek: newEvents.length,
      ordersWeek: orders.length,
      revenueWeek: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
      timestamp: now,
    };
  },
});
```

### Dashboard UI Component

```typescript
// src/components/admin/MetricsDashboard.tsx
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function MetricsDashboard() {
  const metrics = useQuery(api.metrics.getDashboardMetrics);

  if (!metrics) return <Loading />;

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Active Users (24h)"
        value={metrics.activeUsers24h}
        icon={<UsersIcon />}
      />
      <MetricCard
        title="New Events (7d)"
        value={metrics.newEventsWeek}
        icon={<CalendarIcon />}
      />
      <MetricCard
        title="Orders (7d)"
        value={metrics.ordersWeek}
        icon={<ShoppingCartIcon />}
      />
      <MetricCard
        title="Revenue (7d)"
        value={`$${metrics.revenueWeek.toFixed(2)}`}
        icon={<DollarIcon />}
      />
    </div>
  );
}
```

## Alert Configuration

### Alert Channels

| Channel | Use Case | Setup |
|---------|----------|-------|
| Email | All alerts | Configure in each tool |
| Slack | Team notifications | Webhook integration |
| PagerDuty | Critical alerts | API integration |
| SMS | Emergency only | Via PagerDuty or Twilio |

### Slack Integration

1. **Create Slack App:**
   - Go to api.slack.com/apps
   - Create new app
   - Enable Incoming Webhooks
   - Add webhook to #alerts channel

2. **Configure in monitoring tools:**
   - Sentry: Settings → Integrations → Slack
   - UptimeRobot: My Settings → Alert Contacts → Slack

### PagerDuty Integration

1. **Create PagerDuty service:**
   - Create new service for Open Event
   - Configure escalation policy
   - Get integration key

2. **Configure integrations:**
   - Sentry: Settings → Integrations → PagerDuty
   - UptimeRobot: Alert Contacts → PagerDuty

### Alert Routing Rules

| Alert Type | Severity | Channel | Escalation |
|------------|----------|---------|------------|
| Site Down | Critical | PagerDuty + Slack | Immediate |
| Error Spike | High | Slack + Email | 15 min |
| Slow Performance | Medium | Slack | 1 hour |
| New Error | Low | Email | Daily digest |

## Dashboard Templates

### Operations Dashboard

```markdown
## Operations Dashboard Layout

┌─────────────────────────────────────────────────────────────┐
│                     System Health                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Uptime: 99.9% │  Error Rate: 0.1%│  Avg Response: 120ms   │
├─────────────────┴─────────────────┴─────────────────────────┤
│                                                              │
│  [Error Rate Chart - Last 24 Hours]                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Response Time Chart - Last 24 Hours]                      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     Recent Errors                            │
├─────────────────────────────────────────────────────────────┤
│  • TypeError: Cannot read property... (15 occurrences)      │
│  • NetworkError: Failed to fetch... (8 occurrences)         │
│  • ValidationError: Invalid input... (3 occurrences)        │
└─────────────────────────────────────────────────────────────┘
```

### Business Metrics Dashboard

```markdown
## Business Metrics Dashboard Layout

┌─────────────────────────────────────────────────────────────┐
│                     Key Metrics                              │
├───────────────┬───────────────┬───────────────┬─────────────┤
│ Active Users  │ New Events    │ Orders        │ Revenue     │
│    1,234      │     56        │     89        │  $12,345    │
│   ↑ 12%       │   ↑ 8%        │   ↑ 15%       │  ↑ 22%      │
├───────────────┴───────────────┴───────────────┴─────────────┤
│                                                              │
│  [User Growth Chart - Last 30 Days]                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Revenue Chart - Last 30 Days]                             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     Top Events                               │
├─────────────────────────────────────────────────────────────┤
│  1. Tech Conference 2024 - 500 attendees                    │
│  2. Music Festival - 350 attendees                          │
│  3. Startup Meetup - 200 attendees                          │
└─────────────────────────────────────────────────────────────┘
```

### Security Dashboard

```markdown
## Security Dashboard Layout

┌─────────────────────────────────────────────────────────────┐
│                     Security Overview                        │
├───────────────┬───────────────┬───────────────┬─────────────┤
│ Failed Logins │ Rate Limits   │ Blocked IPs   │ Alerts      │
│     23        │     156       │      5        │     2       │
├───────────────┴───────────────┴───────────────┴─────────────┤
│                                                              │
│  [Authentication Events - Last 24 Hours]                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Rate Limit Hits - Last 24 Hours]                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     Recent Security Events                   │
├─────────────────────────────────────────────────────────────┤
│  • Multiple failed logins from IP 192.168.1.1               │
│  • Rate limit exceeded for user xyz                         │
│  • Suspicious API pattern detected                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Appendix: Monitoring Checklist

### Initial Setup

- [ ] Sentry project created and configured
- [ ] Frontend error tracking enabled
- [ ] Backend error tracking enabled
- [ ] Uptime monitoring configured
- [ ] Alert channels set up (Slack, Email, PagerDuty)
- [ ] Status page created

### Ongoing Maintenance

- [ ] Review error trends weekly
- [ ] Check alert thresholds monthly
- [ ] Update dashboards as needed
- [ ] Test alert delivery quarterly
- [ ] Review and archive old alerts

### On-Call Setup

- [ ] PagerDuty schedule configured
- [ ] Escalation policies defined
- [ ] On-call documentation available
- [ ] Runbook links in alerts

---

*Last Updated: December 2024*
*Document Owner: Platform Team*
