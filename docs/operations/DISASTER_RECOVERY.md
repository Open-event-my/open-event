# Disaster Recovery Procedures

This document outlines the disaster recovery (DR) procedures for the Open Event platform, including backup restoration, recovery objectives, and business continuity plans.

## Table of Contents

- [Recovery Objectives](#recovery-objectives)
- [Backup Strategy](#backup-strategy)
- [Disaster Scenarios](#disaster-scenarios)
- [Recovery Procedures](#recovery-procedures)
- [Testing & Validation](#testing--validation)
- [Business Continuity](#business-continuity)

## Recovery Objectives

### Recovery Time Objective (RTO)

| Component                         | RTO      | Priority |
| --------------------------------- | -------- | -------- |
| Authentication                    | 1 hour   | Critical |
| Core Platform (Events, Dashboard) | 2 hours  | Critical |
| Payment Processing                | 4 hours  | High     |
| AI Features                       | 8 hours  | Medium   |
| Analytics & Reporting             | 24 hours | Low      |

### Recovery Point Objective (RPO)

| Data Type        | RPO        | Backup Frequency      |
| ---------------- | ---------- | --------------------- |
| User Data        | 1 hour     | Hourly snapshots      |
| Event Data       | 1 hour     | Hourly snapshots      |
| Transaction Data | 15 minutes | Real-time replication |
| Audit Logs       | 24 hours   | Daily backups         |
| Analytics Data   | 24 hours   | Daily backups         |

### Service Level Targets

| Metric                      | Target                           |
| --------------------------- | -------------------------------- |
| Overall System Availability | 99.9% (8.76 hours downtime/year) |
| Data Durability             | 99.999999999% (11 nines)         |
| Maximum Data Loss           | 1 hour                           |
| Maximum Recovery Time       | 4 hours                          |

## Backup Strategy

### Backup Types

#### 1. Convex Database Backups

Convex provides automatic backups with the following characteristics:

- **Frequency**: Continuous (point-in-time recovery)
- **Retention**: 30 days
- **Location**: Convex cloud infrastructure (multi-region)

#### 2. Application Backups

| Component             | Method                  | Frequency    | Retention  |
| --------------------- | ----------------------- | ------------ | ---------- |
| Source Code           | Git (GitHub)            | Every commit | Indefinite |
| Configuration         | Git + Secrets Manager   | On change    | 90 days    |
| Environment Variables | Convex Dashboard export | Weekly       | 30 days    |
| Static Assets         | CDN + Git               | On deploy    | 30 days    |

#### 3. External Service Data

| Service | Backup Method           | Frequency |
| ------- | ----------------------- | --------- |
| Stripe  | Stripe Dashboard export | Monthly   |
| Sentry  | Sentry data export      | Monthly   |
| OpenAI  | N/A (stateless)         | N/A       |

### Backup Verification

```bash
# Weekly backup verification checklist
# Run every Monday

# 1. Verify Convex backup status
npx convex dashboard --prod
# Check: Deployments → Backup status

# 2. Verify environment variables are documented
npx convex env list --prod > env_backup_$(date +%Y%m%d).txt

# 3. Verify Git repository is accessible
git fetch origin
git log --oneline -5

# 4. Test backup restoration (monthly)
# See: Recovery Procedures → Database Recovery
```

## Disaster Scenarios

### Scenario 1: Database Corruption

**Symptoms:**

- Data inconsistencies
- Query errors
- Missing records

**Impact:** SEV-1 (Critical)

**Recovery:** [Database Recovery Procedure](#database-recovery)

### Scenario 2: Complete Service Outage

**Symptoms:**

- Frontend unreachable
- Backend unreachable
- All users affected

**Impact:** SEV-1 (Critical)

**Recovery:** [Full Service Recovery](#full-service-recovery)

### Scenario 3: Security Breach

**Symptoms:**

- Unauthorized access detected
- Data exfiltration suspected
- Compromised credentials

**Impact:** SEV-1 (Critical)

**Recovery:** [Security Incident Recovery](#security-incident-recovery)

### Scenario 4: Region Outage

**Symptoms:**

- Convex region unavailable
- Hosting provider region down

**Impact:** SEV-1 (Critical)

**Recovery:** [Region Failover](#region-failover)

### Scenario 5: Accidental Data Deletion

**Symptoms:**

- User reports missing data
- Bulk deletion detected

**Impact:** SEV-2 (High)

**Recovery:** [Point-in-Time Recovery](#point-in-time-recovery)

## Recovery Procedures

### Database Recovery

#### Point-in-Time Recovery

Use this procedure to restore data to a specific point in time.

**Prerequisites:**

- Convex admin access
- Knowledge of target recovery time

**Steps:**

1. **Identify recovery point:**

   ```bash
   # Check Convex logs for last known good state
   npx convex logs --prod --since "24 hours ago" | grep -i "error\|corruption"
   ```

2. **Contact Convex Support:**
   - Email: support@convex.dev
   - Include: Deployment ID, target recovery time, reason

3. **Request point-in-time recovery:**
   - Convex will restore to a new deployment
   - Verify data integrity in new deployment

4. **Switch to recovered deployment:**

   ```bash
   # Update frontend to point to recovered deployment
   # Update VITE_CONVEX_URL in environment
   ```

5. **Verify recovery:**
   - Check critical data (users, events, orders)
   - Run data integrity checks
   - Monitor for errors

#### Full Database Restore

Use this procedure for complete database restoration.

**Steps:**

1. **Create new Convex deployment:**

   ```bash
   npx convex deploy --prod --project new-deployment
   ```

2. **Request backup restore from Convex:**
   - Contact Convex support
   - Provide backup date/time

3. **Run data migrations:**

   ```bash
   npx convex run migrations/postRestore --prod
   ```

4. **Update DNS/configuration:**
   - Point frontend to new deployment
   - Update environment variables

5. **Verify and monitor:**
   - Run smoke tests
   - Monitor error rates

### Full Service Recovery

Use this procedure when both frontend and backend are down.

**Phase 1: Assessment (0-15 minutes)**

1. **Check service status:**

   ```bash
   # Check Convex status
   curl https://status.convex.dev/api/v2/status.json

   # Check hosting provider status
   # Vercel: https://www.vercel-status.com/
   # Netlify: https://www.netlifystatus.com/
   ```

2. **Identify root cause:**
   - Provider outage?
   - Configuration issue?
   - Code deployment issue?

**Phase 2: Recovery (15-60 minutes)**

3. **If provider outage:**
   - Wait for provider recovery
   - Prepare failover if extended

4. **If configuration issue:**

   ```bash
   # Verify environment variables
   npx convex env list --prod

   # Restore from backup if needed
   npx convex env set KEY=value --prod
   ```

5. **If deployment issue:**

   ```bash
   # Rollback frontend
   vercel rollback

   # Rollback backend
   # Use Convex Dashboard → Deployments → Redeploy previous
   ```

**Phase 3: Verification (60-120 minutes)**

6. **Run smoke tests:**

   ```bash
   npm run test:e2e -- --grep "@smoke"
   ```

7. **Monitor for 30 minutes:**
   - Check error rates
   - Verify user access
   - Monitor performance

### Security Incident Recovery

Use this procedure when a security breach is detected.

**Phase 1: Containment (Immediate)**

1. **Isolate affected systems:**

   ```bash
   # Disable compromised API keys
   npx convex run admin/revokeApiKey --prod --args '{"keyId": "xxx"}'

   # Force logout all sessions
   npx convex run admin/invalidateAllSessions --prod
   ```

2. **Preserve evidence:**

   ```bash
   # Export logs
   npx convex logs --prod --since "7 days ago" > security_incident_logs.txt

   # Export audit trail
   npx convex run queries/exportAuditLog --prod > audit_log.json
   ```

3. **Notify security team:**
   - Follow [Security Incident Response Plan](./SECURITY_INCIDENT_RESPONSE.md)

**Phase 2: Eradication (1-4 hours)**

4. **Rotate all credentials:**

   ```bash
   # Generate new JWT keys
   # Update in Convex Dashboard

   # Rotate API keys
   # Update in external services
   ```

5. **Patch vulnerabilities:**
   - Deploy security fixes
   - Update dependencies

**Phase 3: Recovery (4-24 hours)**

6. **Restore from clean backup:**
   - Use backup from before breach
   - Verify data integrity

7. **Re-enable services:**
   - Gradually restore access
   - Monitor for suspicious activity

**Phase 4: Post-Incident (24-72 hours)**

8. **Conduct forensic analysis**
9. **Notify affected users (if required)**
10. **File regulatory reports (if required)**
11. **Conduct post-incident review**

### Region Failover

Use this procedure when a cloud region is unavailable.

**Note:** Convex handles multi-region automatically. This procedure is for frontend failover.

**Steps:**

1. **Verify Convex status:**
   - Convex automatically fails over between regions
   - Check status.convex.dev

2. **Failover frontend (if needed):**

   ```bash
   # Deploy to backup region
   vercel --prod --region [backup-region]
   ```

3. **Update DNS:**
   - Point to backup deployment
   - TTL should be low (5 minutes) for quick failover

4. **Monitor recovery:**
   - Watch for region recovery
   - Plan failback when stable

## Testing & Validation

### Monthly DR Test

**Checklist:**

- [ ] Verify backup accessibility
- [ ] Test point-in-time recovery (non-prod)
- [ ] Verify environment variable backups
- [ ] Test rollback procedures
- [ ] Update documentation if needed

### Quarterly DR Drill

**Procedure:**

1. **Schedule drill:**
   - Notify team 1 week in advance
   - Choose low-traffic time

2. **Execute drill:**
   - Simulate disaster scenario
   - Follow recovery procedures
   - Time the recovery

3. **Document results:**
   - Actual RTO achieved
   - Issues encountered
   - Improvements needed

4. **Update procedures:**
   - Incorporate lessons learned
   - Update contact information

### Annual DR Review

- Review and update RTO/RPO targets
- Assess new disaster scenarios
- Update business continuity plans
- Train new team members

## Business Continuity

### Communication Plan

| Audience      | Channel          | Responsibility      | Timing     |
| ------------- | ---------------- | ------------------- | ---------- |
| Internal Team | Slack #incidents | On-call Engineer    | Immediate  |
| Leadership    | Email + Slack    | Engineering Manager | 30 minutes |
| Customers     | Status Page      | Communications      | 1 hour     |
| Partners      | Email            | Account Manager     | 2 hours    |

### Degraded Operations

If full recovery is not possible, prioritize:

1. **Critical Functions:**
   - User authentication
   - Event viewing (read-only)
   - Payment processing

2. **Degraded Functions:**
   - Event creation (queue for later)
   - AI features (disable)
   - Analytics (disable)

3. **Suspended Functions:**
   - Bulk operations
   - Data exports
   - Non-critical notifications

### Recovery Priorities

| Priority | Function                | Justification                |
| -------- | ----------------------- | ---------------------------- |
| 1        | Authentication          | Users must be able to log in |
| 2        | Event Viewing           | Core value proposition       |
| 3        | Payment Processing      | Revenue critical             |
| 4        | Event Management        | Core functionality           |
| 5        | Vendor/Sponsor Features | Secondary features           |
| 6        | AI Assistant            | Enhancement feature          |
| 7        | Analytics               | Non-critical                 |

---

## Appendix: Emergency Contacts

| Role             | Contact            | Availability   |
| ---------------- | ------------------ | -------------- |
| On-Call Engineer | [PagerDuty]        | 24/7           |
| Convex Support   | support@convex.dev | Business hours |
| Hosting Support  | [Provider support] | 24/7           |
| Security Team    | [Security contact] | 24/7           |

## Appendix: Recovery Checklist

```markdown
## Disaster Recovery Checklist

### Pre-Recovery

- [ ] Incident declared and classified
- [ ] Recovery team assembled
- [ ] Communication plan activated
- [ ] Backup availability confirmed

### During Recovery

- [ ] Root cause identified
- [ ] Recovery procedure selected
- [ ] Recovery initiated
- [ ] Progress updates provided (every 30 min)

### Post-Recovery

- [ ] Services restored
- [ ] Data integrity verified
- [ ] Smoke tests passed
- [ ] Monitoring normal
- [ ] Users notified
- [ ] Post-incident review scheduled
```

---

_Last Updated: December 2024_
_Document Owner: Platform Team_
_Review Frequency: Quarterly_
