# ESLint Error Fixes

## Overview

Fix ~260 ESLint errors across the codebase to restore pre-commit hook functionality.

## Error Categories

### 1. `@typescript-eslint/no-explicit-any` (~200 errors)

Replace `any` types with proper TypeScript types.

### 2. `@typescript-eslint/no-unused-vars` (~50 errors)

Remove or use unused variables/imports.

### 3. `no-useless-escape` (~5 errors)

Remove unnecessary escape characters in regex patterns.

### 4. `no-control-regex` (~1 error)

Fix control characters in regex.

---

## Tasks

### Convex Backend Files

- [x] `convex/auth.ts` - 2 errors (no-explicit-any)
- [x] `convex/lib/ai/providers/anthropic.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/compliance/analyticsAnonymization.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/compliance/auditLog.ts` - 4 errors (no-explicit-any)
- [x] `convex/lib/compliance/auditLogMiddleware.ts` - 16 errors (no-explicit-any)
- [x] `convex/lib/compliance/auditLog.property.test.ts` - 11 errors (mixed)
- [x] `convex/lib/compliance/dataDeletion.property.test.ts` - 39 errors (no-explicit-any)
- [x] `convex/lib/compliance/dataExport.property.test.ts` - 14 errors (mixed)
- [x] `convex/lib/compliance/dataRetention.ts` - 26 errors (no-explicit-any)
- [x] `convex/lib/compliance/dataRetention.property.test.ts` - 15 errors (mixed)
- [x] `convex/lib/compliance/termsAcceptance.property.test.ts` - 12 errors (mixed)
- [x] `convex/lib/errorFormatter.ts` - 3 errors (no-explicit-any)
- [x] `convex/lib/monitoring/alerts.property.test.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/monitoring/authEventLogging.property.test.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/monitoring/errorHandling.ts` - 2 errors (no-explicit-any)
- [x] `convex/lib/monitoring/logger.property.test.ts` - 1 error (no-explicit-any)
- [x] `convex/lib/monitoring/serverErrorLogging.ts` - 2 errors (no-explicit-any)
- [x] `convex/lib/monitoring/serverErrorLogging.property.test.ts` - 6 errors (mixed)
- [x] `convex/lib/payment/paymentAuditLog.property.test.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/payment/paymentSecurity.ts` - 2 errors (no-useless-escape)
- [x] `convex/lib/payment/paymentSecurity.property.test.ts` - 2 errors (no-unused-vars)
- [x] `convex/lib/performance/cache.property.test.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/resilience/aiResilience.ts` - 2 errors (no-explicit-any)
- [x] `convex/lib/resilience/aiResilience.property.test.ts` - 24 errors (mixed)
- [x] `convex/lib/resilience/backup.ts` - 3 errors (mixed)
- [x] `convex/lib/resilience/backup.property.test.ts` - 2 errors (no-unused-vars)
- [x] `convex/lib/resilience/circuitBreaker.ts` - 1 error (no-explicit-any)
- [x] `convex/lib/resilience/circuitBreaker.property.test.ts` - 21 errors (mixed)
- [x] `convex/lib/resilience/retry.property.test.ts` - 4 errors (no-unused-vars)
- [x] `convex/lib/security/config.ts` - 2 errors (no-useless-escape)
- [x] `convex/lib/security/csrf.ts` - 5 errors (no-explicit-any)
- [x] `convex/lib/security/csrf.property.test.ts` - 3 errors (mixed)
- [x] `convex/lib/security/encryption.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/security/rateLimitMiddleware.ts` - 8 errors (no-explicit-any)
- [x] `convex/lib/security/rateLimiter.ts` - 6 errors (no-explicit-any)
- [x] `convex/lib/security/rateLimiter.property.test.ts` - 1 error (no-unused-vars)
- [x] `convex/lib/security/sanitizer.ts` - 2 errors (mixed)
- [x] `convex/lib/security/sanitizer.test.ts` - 4 errors (no-explicit-any)
- [x] `convex/lib/security/sanitizer.property.test.ts` - 3 errors (no-unused-vars)
- [x] `convex/lib/sentry.ts` - 2 errors (no-unused-vars)

### Additional Convex Files

- [x] `convex/migrations/clearAuthData.ts` - 7 errors (no-unused-vars)
- [x] `convex/testJWKS.ts` - 4 errors (mixed)
- [x] `convex/testKeyFormat.ts` - 1 error (no-unused-vars)

### E2E Test Files

- [x] `e2e/attendee-management.spec.ts` - 2 errors (no-unused-vars)
- [x] `e2e/check-in-system.spec.ts` - 1 error (no-unused-vars)
- [x] `e2e/event-applications.spec.ts` - 4 errors (mixed)
- [x] `e2e/organizer-dashboard.spec.ts` - 3 errors (no-unused-vars)
- [x] `e2e/sponsor-management.spec.ts` - 1 error (no-unused-vars)
- [x] `e2e/vendor-management.spec.ts` - 1 error (no-unused-vars)

### Scripts

- [x] `scripts/testResilience.ts` - 11 errors (mixed)
- [x] `scripts/verifyCompliance.ts` - 3 errors (mixed)

### Frontend Components

- [x] `src/components/app/TopBar.tsx` - 1 error (no-unused-vars)
- [x] `src/components/compliance/CookieConsentBanner.tsx` - 1 error (react-hooks)
- [x] `src/components/compliance/TermsAcceptanceDialog.tsx` - 1 error (no-unused-vars)
- [x] `src/components/compliance/TermsAcceptanceGuard.tsx` - 1 error (react-hooks)
- [x] `src/components/security/SessionTimeoutWarning.tsx` - 1 error (react-hooks)
- [x] `src/components/ui/async-boundary.tsx` - 1 error (react-refresh)
- [x] `src/components/ui/optimized-image.property.test.tsx` - 1 error (no-unused-vars)
- [x] `src/components/ui/optimized-image.tsx` - 3 errors (react-refresh)
- [x] `src/contexts/CSRFContext.tsx` - 2 errors (react-refresh)
- [x] `src/hooks/useOptimisticState.ts` - 2 warnings (react-hooks)
- [x] `src/pages/admin/AdminAuditLogs.tsx` - 1 error (react-hooks)
- [x] `src/pages/admin/AdminOrganizations.tsx` - 1 error (react-hooks)

---

## Progress Tracking

**Total Files**: 64
**Completed**: 64
**Remaining**: 0

✅ All ESLint errors have been fixed!

---

## Notes

- Property test files (`.property.test.ts`) have the most errors due to mock type definitions
- Consider creating shared type definitions for test mocks
- Some `any` types may be intentional for flexibility - use `unknown` or proper generics instead
