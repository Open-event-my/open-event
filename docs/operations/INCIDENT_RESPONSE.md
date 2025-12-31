# Incident Response Procedures

This document outlines the incident response procedures for the Open Event platform, including severity classification, response workflows, and escalation paths.

## Table of Contents

- [Incident Classification](#incident-classification)
- [Response Workflow](#response-workflow)
- [Communication Templates](#communication-templates)
- [Escalation Paths](#escalation-paths)
- [Post-Incident Review](#post-incident-review)
- [On-Call Responsibilities](#on-call-responsibilities)

## Incident Classification

### Severity Levels

| Severity             | Definition                                         | Examples                                                 | Response Time | Resolution Target |
| -------------------- | -------------------------------------------------- | -------------------------------------------------------- | ------------- | ----------------- |
| **SEV-1 (Critical)** | Complete service outage or data breach             | Site down, database corruption, security breach          | 15 minutes    | 1 hour            |
| **SEV-2 (High)**     | Major feature unavailable, significant user impact | Auth broken, payments failing, AI completely down        | 30 minutes    | 4 hours           |
| **SEV-3 (Medium)**   | Minor feature degraded, limited user impact        | Slow performance, minor UI bugs, partial feature failure | 2 hours       | 24 hours          |
| **SEV-4 (Low)**      | Cosmetic issues, no functional impact              | Typos, styling issues, minor UX problems                 | 24 hours      | 1 week            |

### Impact Assessment Matrix

| Factor         | Low  | Medium    | High         | Critical   |
| -------------- | ---- | --------- | ------------ | ---------- |
| Users Affected | < 1% | 1-10%     | 10-50%       | > 50%      |
| Revenue Impact | None | < $100/hr | $100-1000/hr | > $1000/hr |
| Data Risk      | None | Temporary | Persistent   | Breach     |
| Reputation     | None | Minor     | Moderate     | Severe     |

## Response Workflow

### Phase 1: Detection & Triage (0-15 minutes)

```
┌─────────────────┐
│  Alert Received │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Acknowledge     │ ← Within 5 minutes
│ Alert           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Initial         │
│ Assessment      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Classify        │ ← SEV-1 to SEV-4
│ Severity        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Incident │
│ Channel/Ticket  │
└─────────────────┘
```

#### Step 1: Acknowledge Alert

```bash
# Acknowledge in monitoring system
# Post in #incidents Slack channel:
```

**Template:**

```
🚨 INCIDENT ACKNOWLEDGED
Time: [TIMESTAMP]
Responder: [YOUR NAME]
Alert: [ALERT DESCRIPTION]
Initial Assessment: In progress
```

#### Step 2: Initial Assessment

1. **Check service status:**

   ```bash
   # Frontend
   curl -I https://your-domain.com

   # Backend
   npx convex logs --prod --tail
   ```

2. **Check monitoring dashboards:**
   - Sentry for errors
   - Convex Dashboard for function status
   - Hosting provider status

3. **Identify scope:**
   - Which users are affected?
   - Which features are impacted?
   - When did it start?

#### Step 3: Classify Severity

Use the [Severity Levels](#severity-levels) table to classify.

#### Step 4: Create Incident Channel

For SEV-1 and SEV-2:

- Create dedicated Slack channel: `#incident-YYYY-MM-DD-brief-description`
- Create incident ticket in tracking system
- Page additional responders if needed

### Phase 2: Investigation & Mitigation (15-60 minutes)

#### Step 1: Gather Information

```bash
# Collect logs
npx convex logs --prod --since "30 minutes ago" > incident_logs.txt

# Check recent deployments
git log --oneline -10

# Check recent config changes
npx convex env list --prod
```

#### Step 2: Identify Root Cause

Common investigation paths:

**For Frontend Issues:**

1. Check browser console errors
2. Check network requests
3. Verify static assets loading
4. Check CDN status

**For Backend Issues:**

1. Check Convex function logs
2. Check database queries
3. Verify environment variables
4. Check external service status (OpenAI, Stripe)

**For Auth Issues:**

1. Check session creation/validation
2. Verify OAuth configuration
3. Check token expiration

#### Step 3: Implement Mitigation

**Option A: Rollback**

```bash
# Rollback frontend
vercel rollback [previous-deployment]

# Rollback backend
# Use Convex Dashboard → Deployments → Redeploy previous
```

**Option B: Hotfix**

```bash
# Create hotfix branch
git checkout -b hotfix/incident-description

# Make minimal fix
# Test locally
npm run test:run

# Deploy hotfix
npx convex deploy --prod
vercel --prod
```

**Option C: Feature Flag**

```bash
# Disable problematic feature via config
npx convex run admin/disableFeature --prod --args '{"feature": "ai-assistant"}'
```

### Phase 3: Resolution & Communication (Ongoing)

#### Status Updates

Post updates every 30 minutes (SEV-1/2) or every 2 hours (SEV-3/4):

**Template:**

```
📊 INCIDENT UPDATE
Time: [TIMESTAMP]
Status: [Investigating/Identified/Mitigating/Resolved]
Impact: [Current user impact]
Actions: [What we're doing]
ETA: [Expected resolution time]
```

#### Resolution Confirmation

Before declaring resolved:

- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Monitoring shows normal metrics
- [ ] No new related errors
- [ ] User-facing functionality restored

**Resolution Template:**

```
✅ INCIDENT RESOLVED
Time: [TIMESTAMP]
Duration: [Total incident duration]
Root Cause: [Brief description]
Resolution: [What fixed it]
Follow-up: [Post-incident review scheduled]
```

## Communication Templates

### External Status Page Update

**Investigating:**

```
We are currently investigating reports of [issue description].
Some users may experience [impact]. We will provide updates as we learn more.
```

**Identified:**

```
We have identified the cause of [issue description] and are working on a fix.
[X]% of users are affected. We expect to resolve this within [timeframe].
```

**Resolved:**

```
The issue affecting [feature/service] has been resolved.
All systems are operating normally. We apologize for any inconvenience.
```

### Customer Communication (SEV-1/2)

**Email Template:**

```
Subject: [Open Event] Service Disruption - [Date]

Dear [Customer],

We experienced a service disruption today affecting [feature/service].

What happened:
[Brief, non-technical explanation]

Impact:
[What users experienced]

Resolution:
[What we did to fix it]

Prevention:
[What we're doing to prevent recurrence]

We apologize for any inconvenience this may have caused.

Best regards,
Open Event Team
```

## Escalation Paths

### SEV-1 (Critical) Escalation

```
0 min    → On-call Engineer acknowledges
15 min   → Tech Lead paged if not resolved
30 min   → Engineering Manager notified
1 hour   → CTO notified
2 hours  → Executive team briefed
```

### SEV-2 (High) Escalation

```
0 min    → On-call Engineer acknowledges
30 min   → Tech Lead notified
2 hours  → Engineering Manager notified if not resolved
```

### Contact Information

| Role                | Primary Contact   | Backup Contact |
| ------------------- | ----------------- | -------------- |
| On-Call Engineer    | [PagerDuty/Slack] | [Phone]        |
| Tech Lead           | [Email/Slack]     | [Phone]        |
| Engineering Manager | [Email/Slack]     | [Phone]        |
| CTO                 | [Email]           | [Phone]        |

### When to Escalate

**Escalate immediately if:**

- Data breach suspected
- Unable to mitigate within response time
- Incident scope expanding
- External communication needed
- Legal/compliance implications

## Post-Incident Review

### Timeline

- **Within 24 hours**: Schedule post-incident review
- **Within 72 hours**: Complete post-incident review
- **Within 1 week**: Implement critical follow-up items

### Post-Incident Review Template

```markdown
# Post-Incident Review: [Incident Title]

## Summary

- **Date**: [Date]
- **Duration**: [Start time] - [End time] ([Duration])
- **Severity**: [SEV-1/2/3/4]
- **Impact**: [Number of users affected, revenue impact]

## Timeline

| Time  | Event               |
| ----- | ------------------- |
| HH:MM | [Event description] |

## Root Cause

[Detailed technical explanation]

## Contributing Factors

- [Factor 1]
- [Factor 2]

## Resolution

[What fixed the issue]

## What Went Well

- [Positive aspect 1]
- [Positive aspect 2]

## What Could Be Improved

- [Improvement area 1]
- [Improvement area 2]

## Action Items

| Item     | Owner  | Due Date | Status   |
| -------- | ------ | -------- | -------- |
| [Action] | [Name] | [Date]   | [Status] |

## Lessons Learned

[Key takeaways]
```

### Blameless Culture

- Focus on systems and processes, not individuals
- Ask "what" and "how", not "who"
- Treat incidents as learning opportunities
- Share findings openly with the team

## On-Call Responsibilities

### Before On-Call Shift

- [ ] Verify access to all monitoring systems
- [ ] Review recent deployments and changes
- [ ] Ensure PagerDuty/alerting is configured
- [ ] Have laptop and internet access available
- [ ] Review this incident response document

### During On-Call Shift

- [ ] Respond to alerts within SLA
- [ ] Document all incidents
- [ ] Escalate when appropriate
- [ ] Hand off ongoing incidents at shift end

### On-Call Handoff Template

```
## On-Call Handoff: [Date]

### Active Incidents
- [Incident 1]: [Status, next steps]

### Recent Incidents (Last 24h)
- [Incident]: [Brief summary, any follow-up needed]

### Upcoming Changes
- [Deployment/change]: [Date, risk level]

### Notes
- [Any other relevant information]
```

---

_Last Updated: December 2024_
_Document Owner: Platform Team_
