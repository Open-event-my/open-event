Open Event - Improvement Roadmap for Scale
Executive Summary
Your project is well-architected with modern tech (React 19, Convex, TypeScript). However, for high user traffic, there are critical gaps in security, testing, and missing features that need attention.
🔴 CRITICAL (Fix Before Launch)

1. Security: Account Lockout is DISABLED
   Impact: Attackers can brute-force passwords indefinitely Location: convex/http.ts:237-265 The account lockout system exists in convex/accountLockout.ts but is commented out. Enable it:

// Currently disabled - needs to be uncommented:
// const lockoutCheck = await ctx.runMutation(internal.accountLockout.checkAndRecordAttempt, { identifier: email })
// if (lockoutCheck.locked) { return errorResponse(429, 'Account locked...') } 2. No Global API Rate Limiting
Impact: DoS attacks, API abuse, expensive OpenAI bills Missing: Rate limiting per IP for all endpoints. You only have:
AI usage limits (5 prompts/day for free users)
API key rate limits (hourly windows)
Add: Middleware rate limiting with configurable limits per endpoint. 3. Test Coverage is Only ~7%
Impact: Bugs in production, difficult refactoring
Category Tested Total Coverage
Components 7 127+ 5.5%
Pages 3 58+ 5.2%
Convex Backend 0 36+ 0%
Hooks 1 15 6.7%
Priority testing needed:
Event CRUD operations
Payment/Stripe flows
Admin moderation actions
AI agent tools
🟠 HIGH PRIORITY (Before Scaling) 4. Add Two-Factor Authentication (2FA)
Many enterprise users will require 2FA. Consider:
TOTP (Google Authenticator)
SMS verification (via Twilio)
Email OTP as fallback 5. Implement Proper Audit Logging
You have moderationLogs but need comprehensive logging for:
All admin actions
API access patterns
Failed authentication attempts
User data exports (GDPR compliance) 6. Add Real-time Notifications System
Your schema has notifications table but implementation is incomplete:
Push notifications (Web Push API)
Email digests (daily/weekly)
In-app notification center with bell icon
Webhook delivery monitoring 7. Payment Error Handling
convex/stripe.ts exists but ensure:
Webhook idempotency (prevent duplicate charges)
Failed payment retries
Refund workflow
Invoice generation
🟡 FEATURES TO ADD (User Growth) 8. Multi-Tenancy / Organizations
Currently each user is independent. For teams:

// Add to schema
organizations: defineTable({
name: v.string(),
slug: v.string(), // unique URL-friendly identifier
ownerId: v.id('users'),
plan: v.union(v.literal('free'), v.literal('pro'), v.literal('enterprise')),
memberLimit: v.number(),
})

organizationMembers: defineTable({
organizationId: v.id('organizations'),
userId: v.id('users'),
role: v.union(v.literal('owner'), v.literal('admin'), v.literal('member')),
}) 9. Event Templates
Power users will want to clone events:
Save event as template
Quick-create from template
Template marketplace/sharing 10. Calendar Integration
Add to src/lib/calendar/:
Google Calendar sync
Outlook integration
ICS file export
Recurring events 11. Mobile App / Better PWA
Your PWA is good but consider:
Native push notifications
Offline mode for check-ins
QR scanner for attendee check-in
React Native app for iOS/Android 12. Analytics Dashboard Improvements
src/pages/dashboard/AnalyticsPage.tsx should add:
Real-time attendee metrics
Revenue forecasting
Comparison between events
Export to PDF/Excel 13. AI Agent Enhancements
Your 13 tools are great. Add:
Natural language event editing: "Move my event to next Friday"
Budget optimization: AI suggestions to reduce costs
Vendor matching AI: Better recommendations based on past success
Attendee insights: Predict turnout based on registration patterns
🟢 PERFORMANCE OPTIMIZATIONS 14. Add Database Indexes for Common Queries
Review convex/schema.ts - add compound indexes:

// For dashboard queries
events: defineTable({...})
.index('by_organizer_status_date', ['organizerId', 'status', 'startDate'])

// For admin queries
users: defineTable({...})
.index('by_role_status', ['role', 'status']) 15. Implement Caching Strategy
Cache vendor/sponsor searches (they don't change often)
Cache public event listings
Use Convex's built-in caching + TTL 16. Lazy Load Heavy Components
Already doing this for TLDraw/Charts. Extend to:
Rich text editor
File upload components
Complex modals
📊 INFRASTRUCTURE FOR SCALE 17. Add Monitoring & Alerting
Sentry (already integrated) - add performance monitoring
Uptime monitoring (Better Uptime, UptimeRobot)
Convex dashboard - watch function execution times
OpenAI usage alerts - prevent surprise bills 18. CDN for Static Assets
Ensure images/assets are served from CDN:
Cloudflare or Vercel Edge
Optimized image formats (WebP, AVIF)
Proper cache headers 19. Database Backup Strategy
Convex handles this but document:
Recovery procedures
Data export for compliance
Disaster recovery plan
📋 TESTING PRIORITIES
Immediate (This Week)
Enable account lockout and test it
Add E2E test for event creation flow
Test payment webhook handling
Test admin user management
Short-term (This Month)
Convex backend unit tests for CRUD operations
Auth flow integration tests
AI agent tool tests
Component tests for critical UI (forms, modals)
Long-term
Achieve 60%+ code coverage
Load testing for 1000+ concurrent users
Accessibility (a11y) testing
Security penetration testing
🔧 QUICK WINS
Task Impact Effort
Enable account lockout High 1 hour
Add request logging High 2 hours
Environment-based CORS Medium 1 hour
Add 404 page Low 30 min
Add loading skeletons Medium 2 hours
Improve error messages Medium 1 hour
Summary: Top 5 Focus Areas
Security hardening - Enable lockout, add rate limiting, audit logging
Test coverage - Focus on Convex backend and critical paths
Organization/team support - Multi-tenancy for enterprise users
Notifications system - Push, email, in-app
Mobile experience - Better PWA or native app
Your codebase is solid. These improvements will prepare you for thousands of users. Start with the critical security fixes, then work through the list systematically.
