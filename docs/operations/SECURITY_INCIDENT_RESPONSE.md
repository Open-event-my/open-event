# Security Incident Response Plan

This document outlines the procedures for detecting, responding to, and recovering from security incidents affecting the Open Event platform.

## Table of Contents

- [Incident Classification](#incident-classification)
- [Detection & Reporting](#detection--reporting)
- [Response Procedures](#response-procedures)
- [Communication Plan](#communication-plan)
- [Recovery Procedures](#recovery-procedures)
- [Post-Incident Activities](#post-incident-activities)
- [Regulatory Compliance](#regulatory-compliance)

## Incident Classification

### Security Incident Types

| Type                           | Description                          | Severity | Examples                               |
| ------------------------------ | ------------------------------------ | -------- | -------------------------------------- |
| **Data Breach**                | Unauthorized access to user data     | Critical | Database exfiltration, API key leak    |
| **Account Compromise**         | Unauthorized access to user accounts | High     | Credential stuffing, session hijacking |
| **Service Attack**             | Attempt to disrupt service           | High     | DDoS, resource exhaustion              |
| **Malware/Injection**          | Malicious code execution             | Critical | XSS, SQL injection, code injection     |
| **Insider Threat**             | Malicious internal actor             | Critical | Data theft, sabotage                   |
| **Vulnerability Exploitation** | Known vulnerability exploited        | High     | Zero-day, unpatched CVE                |

### Severity Classification

| Severity     | Criteria                                                 | Response Time        |
| ------------ | -------------------------------------------------------- | -------------------- |
| **Critical** | Active data breach, system compromise, widespread impact | Immediate (< 15 min) |
| **High**     | Attempted breach, vulnerability actively exploited       | 1 hour               |
| **Medium**   | Suspicious activity, potential vulnerability             | 4 hours              |
| **Low**      | Minor security concern, policy violation                 | 24 hours             |

## Detection & Reporting

### Detection Sources

1. **Automated Monitoring:**
   - Sentry error alerts
   - Rate limiting triggers
   - Failed authentication spikes
   - Unusual API patterns

2. **External Reports:**
   - User reports
   - Security researcher disclosures
   - Third-party notifications

3. **Internal Discovery:**
   - Code review findings
   - Audit log analysis
   - Penetration testing

### Reporting Channels

| Source              | Channel                 | Response                    |
| ------------------- | ----------------------- | --------------------------- |
| Automated Alert     | PagerDuty/Slack         | On-call responds            |
| User Report         | support@openevent.com   | Triage within 4 hours       |
| Security Researcher | security@openevent.com  | Acknowledge within 24 hours |
| Internal Discovery  | #security Slack channel | Immediate triage            |

### Initial Report Template

```markdown
## Security Incident Report

**Reporter:** [Name]
**Date/Time:** [Timestamp]
**Detection Method:** [How discovered]

### Incident Summary

[Brief description of the incident]

### Affected Systems

- [ ] Frontend
- [ ] Backend (Convex)
- [ ] Database
- [ ] Authentication
- [ ] Payment System
- [ ] AI Services
- [ ] Third-party Services

### Potential Impact

- Users affected: [Estimate]
- Data at risk: [Types of data]
- Services affected: [List]

### Initial Assessment

- Severity: [Critical/High/Medium/Low]
- Active threat: [Yes/No]
- Containment needed: [Yes/No]
```

## Response Procedures

### Phase 1: Triage (0-15 minutes)

```
┌─────────────────┐
│ Incident        │
│ Detected        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Acknowledge &   │
│ Assess Severity │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Critical│ │ Other │
│  /High │ │       │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Activate│ │Standard│
│Response│ │Response│
│ Team   │ │        │
└───────┘ └───────┘
```

#### Step 1: Acknowledge Incident

```bash
# Post in #security-incidents Slack channel
```

**Template:**

```
🚨 SECURITY INCIDENT ACKNOWLEDGED
Time: [TIMESTAMP]
Responder: [NAME]
Type: [Incident type]
Severity: [Critical/High/Medium/Low]
Status: Triaging
```

#### Step 2: Initial Assessment

1. **Verify the incident is real:**
   - Check logs for evidence
   - Confirm reported behavior
   - Rule out false positives

2. **Determine scope:**
   - What systems are affected?
   - How many users impacted?
   - Is the attack ongoing?

3. **Classify severity:**
   - Use severity matrix above
   - Escalate if Critical/High

### Phase 2: Containment (15-60 minutes)

#### Immediate Containment Actions

**For Account Compromise:**

```bash
# Force logout compromised user
npx convex run admin/invalidateUserSessions --prod --args '{"userId": "xxx"}'

# Lock account
npx convex run admin/lockAccount --prod --args '{"userId": "xxx"}'

# Revoke API keys
npx convex run admin/revokeUserApiKeys --prod --args '{"userId": "xxx"}'
```

**For Data Breach:**

```bash
# Disable affected API endpoints
npx convex run admin/disableEndpoint --prod --args '{"endpoint": "xxx"}'

# Rotate compromised credentials
# Update in Convex Dashboard → Environment Variables

# Enable enhanced logging
npx convex run admin/enableSecurityLogging --prod
```

**For Service Attack:**

```bash
# Enable aggressive rate limiting
npx convex run admin/setRateLimitMode --prod --args '{"mode": "strict"}'

# Block attacking IPs (if identifiable)
npx convex run admin/blockIP --prod --args '{"ip": "xxx.xxx.xxx.xxx"}'
```

**For Malware/Injection:**

```bash
# Take affected service offline
vercel rm [deployment-url]

# Rollback to known-good deployment
vercel rollback [safe-deployment]
```

#### Evidence Preservation

```bash
# Export logs before any cleanup
npx convex logs --prod --since "7 days ago" > security_incident_$(date +%Y%m%d_%H%M%S).log

# Export audit trail
npx convex run queries/exportAuditLog --prod > audit_$(date +%Y%m%d_%H%M%S).json

# Screenshot relevant dashboards
# Save network captures if available
```

### Phase 3: Eradication (1-4 hours)

#### Identify Root Cause

1. **Analyze logs:**

   ```bash
   # Search for attack patterns
   grep -i "unauthorized\|injection\|attack" security_incident_*.log

   # Analyze authentication failures
   grep -i "auth\|login\|failed" security_incident_*.log | sort | uniq -c | sort -rn
   ```

2. **Review code changes:**

   ```bash
   # Check recent deployments
   git log --oneline --since="7 days ago"

   # Review security-relevant changes
   git log --oneline --all -- "convex/lib/security/*" "src/lib/security/*"
   ```

3. **Check for vulnerabilities:**

   ```bash
   # Run dependency audit
   npm audit

   # Check for known CVEs
   npm audit --json > vulnerability_report.json
   ```

#### Remove Threat

1. **Patch vulnerabilities:**

   ```bash
   # Update vulnerable dependencies
   npm audit fix

   # Deploy security patches
   npx convex deploy --prod
   vercel --prod
   ```

2. **Remove malicious content:**
   - Delete injected data
   - Remove compromised files
   - Clean up backdoors

3. **Rotate all credentials:**
   - JWT signing keys
   - API keys
   - OAuth secrets
   - Database credentials

### Phase 4: Recovery (4-24 hours)

#### Restore Services

1. **Verify system integrity:**

   ```bash
   # Run security tests
   npm run test:run -- --grep "security"

   # Run E2E tests
   npm run test:e2e -- --grep "@smoke"
   ```

2. **Restore from backup (if needed):**
   - See [Disaster Recovery Procedures](./DISASTER_RECOVERY.md)

3. **Re-enable services:**

   ```bash
   # Gradually restore rate limits
   npx convex run admin/setRateLimitMode --prod --args '{"mode": "normal"}'

   # Re-enable disabled endpoints
   npx convex run admin/enableEndpoint --prod --args '{"endpoint": "xxx"}'
   ```

#### Verify Recovery

- [ ] All services operational
- [ ] No ongoing attack indicators
- [ ] Monitoring shows normal patterns
- [ ] Security controls in place
- [ ] User access restored

## Communication Plan

### Internal Communication

| Audience      | Channel             | Timing    | Content           |
| ------------- | ------------------- | --------- | ----------------- |
| Security Team | #security-incidents | Immediate | Full details      |
| Engineering   | #engineering        | 30 min    | Technical summary |
| Leadership    | Email + Slack       | 1 hour    | Impact summary    |
| All Staff     | Email               | 4 hours   | General notice    |

### External Communication

#### User Notification (if data breach)

**Email Template:**

```
Subject: Important Security Notice from Open Event

Dear [User],

We are writing to inform you of a security incident that may have affected your account.

What Happened:
[Brief, clear description of the incident]

What Information Was Involved:
[List of potentially affected data types]

What We Are Doing:
[Actions taken to address the incident]

What You Can Do:
1. Change your password immediately
2. Review your account activity
3. Enable two-factor authentication
4. Monitor for suspicious activity

For More Information:
[Link to detailed notice]
[Contact information]

We sincerely apologize for any concern this may cause.

The Open Event Security Team
```

#### Public Statement (if required)

**Template:**

```
SECURITY INCIDENT NOTICE

Date: [Date]

Open Event experienced a security incident on [date]. We have taken
immediate action to address the situation and protect our users.

What Happened:
[Brief description]

Our Response:
[Actions taken]

Affected Users:
[Scope of impact]

Next Steps:
[What users should do]

We are committed to transparency and will provide updates as our
investigation continues.

Contact: security@openevent.com
```

### Regulatory Notification

| Regulation | Requirement                  | Timeline            |
| ---------- | ---------------------------- | ------------------- |
| GDPR       | Notify supervisory authority | 72 hours            |
| GDPR       | Notify affected users        | Without undue delay |
| State Laws | Varies by jurisdiction       | 30-90 days          |

## Recovery Procedures

### Account Recovery

For compromised user accounts:

1. **Reset credentials:**

   ```bash
   # Force password reset
   npx convex run admin/forcePasswordReset --prod --args '{"userId": "xxx"}'
   ```

2. **Review account activity:**
   - Check audit logs for unauthorized actions
   - Identify any data accessed/modified

3. **Restore account:**
   - Unlock account
   - Notify user
   - Provide recovery instructions

### Data Recovery

For data integrity issues:

1. **Identify affected data:**

   ```bash
   # Query for modified records
   npx convex run queries/getModifiedRecords --prod --args '{"since": "timestamp"}'
   ```

2. **Restore from backup:**
   - See [Disaster Recovery Procedures](./DISASTER_RECOVERY.md)

3. **Verify data integrity:**
   ```bash
   # Run data integrity checks
   npx convex run queries/dataIntegrityCheck --prod
   ```

### Service Recovery

1. **Deploy clean code:**

   ```bash
   # Rollback to known-good state
   git checkout [safe-commit]
   npx convex deploy --prod
   vercel --prod
   ```

2. **Verify security controls:**
   - Rate limiting active
   - Authentication working
   - Encryption enabled

3. **Monitor for recurrence:**
   - Enhanced logging for 7 days
   - Increased alerting sensitivity

## Post-Incident Activities

### Post-Incident Review

**Timeline:**

- Within 24 hours: Schedule review
- Within 72 hours: Complete review
- Within 1 week: Implement critical fixes

**Review Template:**

```markdown
# Security Incident Post-Mortem

## Incident Summary

- **Date:** [Date]
- **Duration:** [Time]
- **Severity:** [Level]
- **Type:** [Category]

## Impact

- Users affected: [Number]
- Data compromised: [Types]
- Services affected: [List]
- Financial impact: [Estimate]

## Timeline

| Time  | Event   |
| ----- | ------- |
| HH:MM | [Event] |

## Root Cause Analysis

[Detailed technical analysis]

## What Went Well

- [Positive aspects of response]

## What Could Be Improved

- [Areas for improvement]

## Action Items

| Item     | Owner  | Priority   | Due Date |
| -------- | ------ | ---------- | -------- |
| [Action] | [Name] | [P1/P2/P3] | [Date]   |

## Lessons Learned

[Key takeaways]
```

### Security Improvements

Based on incident findings:

1. **Immediate fixes (P1):**
   - Patch exploited vulnerabilities
   - Strengthen compromised controls

2. **Short-term improvements (P2):**
   - Enhanced monitoring
   - Additional security controls

3. **Long-term improvements (P3):**
   - Architecture changes
   - Process improvements

### Documentation Updates

- [ ] Update security documentation
- [ ] Update incident response procedures
- [ ] Update runbooks
- [ ] Update training materials

## Regulatory Compliance

### GDPR Requirements

**Data Breach Notification:**

1. **To Supervisory Authority (within 72 hours):**
   - Nature of breach
   - Categories of data affected
   - Approximate number of users
   - Contact details of DPO
   - Likely consequences
   - Measures taken

2. **To Affected Users (without undue delay):**
   - Clear description of breach
   - Contact details
   - Likely consequences
   - Measures taken
   - Recommendations for users

### Documentation Requirements

Maintain records of:

- All security incidents
- Response actions taken
- Communications sent
- Remediation measures
- Post-incident reviews

---

## Appendix: Emergency Contacts

| Role              | Contact            | Availability   |
| ----------------- | ------------------ | -------------- |
| Security Lead     | [Contact]          | 24/7           |
| On-Call Engineer  | [PagerDuty]        | 24/7           |
| Legal Counsel     | [Contact]          | Business hours |
| PR/Communications | [Contact]          | Business hours |
| Convex Support    | support@convex.dev | Business hours |

## Appendix: Security Incident Checklist

```markdown
## Security Incident Response Checklist

### Detection & Triage

- [ ] Incident acknowledged
- [ ] Severity classified
- [ ] Response team activated (if Critical/High)
- [ ] Initial report created

### Containment

- [ ] Immediate threats contained
- [ ] Evidence preserved
- [ ] Affected systems isolated
- [ ] Enhanced monitoring enabled

### Eradication

- [ ] Root cause identified
- [ ] Vulnerabilities patched
- [ ] Malicious content removed
- [ ] Credentials rotated

### Recovery

- [ ] Systems restored
- [ ] Security verified
- [ ] Services re-enabled
- [ ] Monitoring confirmed

### Post-Incident

- [ ] Users notified (if required)
- [ ] Regulators notified (if required)
- [ ] Post-incident review completed
- [ ] Action items assigned
- [ ] Documentation updated
```

---

_Last Updated: December 2024_
_Document Owner: Security Team_
_Review Frequency: Quarterly_
