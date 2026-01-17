# FORME - Project Structure Guide

## What This Project Does

**Open Event** is an open-source event management platform that connects three key players:

- **Organizers**: Create and manage events with AI assistance, track budgets, coordinate vendors, and find sponsors
- **Vendors**: Showcase services, discover event opportunities, and get hired
- **Sponsors**: Find events to support, manage sponsorship tiers, and track investments

The platform includes an AI-powered event assistant, real-time dashboards, task management, budget tracking, and a public API with webhooks.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS 4
- **Backend**: Convex (real-time database + serverless functions)
- **AI**: OpenAI GPT-4o-mini with function calling
- **Auth**: Convex Auth (Google OAuth, Email/Password)
- **UI**: ShadCN UI components + Phosphor Icons
- **Testing**: Vitest (unit tests), React Testing Library, Playwright (E2E tests)

## Project Organization

### `/convex` - Backend (Convex Functions)

The backend is organized by domain:

- **`schema.ts`** - Database schema definitions (users, events, vendors, sponsors, etc.)
- **`auth.ts`** - Authentication configuration
- **`events.ts`** - Event CRUD operations
- **`vendors.ts`** - Vendor management
- **`sponsors.ts`** - Sponsor management
- **`eventTasks.ts`** - Task management for events
- **`budgetItems.ts`** - Budget tracking
- **`eventVendors.ts`** - Event-vendor relationships
- **`eventSponsors.ts`** - Event-sponsor relationships
- **`eventApplications.ts`** - Vendor/sponsor applications to events
- **`publicApplications.ts`** - Public vendor/sponsor application forms
- **`inquiries.ts`** - Messaging between organizers and vendors/sponsors
- **`users.ts`** - User management
- **`organizerProfiles.ts`** - User onboarding/profile data
- **`apiKeys.ts`** - API key management for public API
- **`webhooks.ts`** - Webhook delivery system
- **`aiUsage.ts`** - AI rate limiting and usage tracking
- **`moderation.ts`** - Admin moderation actions
- **`analytics.ts`** - Analytics queries
- **`admin.ts`** - Admin-only operations
- **`aiTools.ts`** - AI tool definitions and handlers
- **`customAuth.ts`** - Custom authentication implementation
- **`metrics.ts`** - Metrics collection and reporting
- **`organizations.ts`** - Multi-tenant organization/team management
- **`accountLockout.ts`** - Brute force protection (account lockout after failed attempts)
- **`globalRateLimit.ts`** - IP-based rate limiting with sliding windows
- **`auditLog.ts`** - Security audit trail logging
- **`twoFactorAuth.ts`** - TOTP-based two-factor authentication
- **`adminNotifications.ts`** - Admin notification system
- **`adminAnalytics.ts`** - Admin analytics queries
- **`exports.ts`** - Bulk data export (CSV/JSON)
- **`notifications.ts`** - User notification system
- **`notificationPreferences.ts`** - User notification preferences
- **`emailVerification.ts`** - Email verification flow
- **`passwordReset.ts`** - Password reset functionality
- **`attendees.ts`** - Event attendee management
- **`orders.ts`** - Order/purchase management
- **`promoCodes.ts`** - Promo code management
- **`stripe.ts`** - Stripe payment integration
- **`ticketTypes.ts`** - Ticket type definitions
- **`platformSettings.ts`** - Platform-wide settings
- **`playground.ts`** - Playground feature core
- **`playgroundCreate.ts`** - Playground creation
- **`crons.ts`** - Scheduled cron jobs
- **`paymentLedger.ts`** - Universal payment ledger (tracks all money IN/OUT)
- **`settlements.ts`** - Event settlement calculations and payouts
- **`sponsorLeads.ts`** - Sponsor lead capture system
- **`sponsorReports.ts`** - Sponsor ROI reports and analytics
- **`http.ts`** - HTTP endpoints (AI streaming, public API routes)
- **`auth.config.ts`** - Auth configuration
- **`paymentIdempotency.ts`** - Payment idempotency tracking
- **`testJWKS.ts`** - Test JWKS utilities
- **`testKeyFormat.ts`** - Test key format utilities

**Subdirectories:**

- **`lib/agent/`** - AI agent system (tools, handlers, types)
- **`lib/ai/`** - AI provider abstraction (OpenAI, Anthropic, Groq adapters)
- **`lib/compliance/`** - GDPR and data retention utilities
- **`lib/monitoring/`** - Logging, metrics, and alerts
- **`lib/security/`** - Security utilities (rate limiting, encryption)
- **`lib/resilience/`** - Resilience and recovery patterns
- **`lib/performance/`** - Performance optimization utilities
- **`lib/emailValidation.ts`** - Email validation utilities
- **`lib/errorLogging.ts`** - Error logging utilities
- **`lib/notificationEmails.ts`** - Email notification templates
- **`lib/notificationTriggers.ts`** - Notification trigger logic
- **`lib/passwordValidation.ts`** - Password validation rules
- **`api/`** - Public API endpoints and helpers
- **`queries/`** - Reusable query helpers
- **`mutations/`** - Reusable mutation helpers
- **`migrations/`** - Database migration scripts

### `/src` - Frontend (React Application)

#### `/src/components` - Reusable UI Components

- **`ui/`** - ShadCN UI primitives (Button, Dialog, Input, Table, error-state, form-field, loading-error-wrapper, offline-banner, page-loader, scroll-area, aria-live-region, error-banner, error-toast, form-error-summary, enhanced-offline-banner, etc.)
- **`app/`** - App shell components (Sidebar, TopBar, AppShell)
- **`auth/`** - Authentication components (SignIn, SignUp, ProtectedRoute, SignInForm, SignUpForm)
- **`landing/`** - Landing page sections (Hero, Features, FAQ, etc.)
- **`agentic-v2/`** - AI chat interface components (main AI assistant UI)
- **`agentic/`** - Legacy AI chat components
- **`agent/`** - AI tool execution UI (confirmations, results)
- **`admin/`** - Admin panel components (AdminLayout, AdminSidebar, AdminNotifications, ExportModal)
- **`dashboard/`** - Dashboard-specific components (ExportModal, RealTimeDashboard)
- **`security/`** - Security components (TwoFactorSetup, TwoFactorStatus, TwoFactorVerifyModal)
- **`organizations/`** - Organization management (CreateOrganizationModal, TeamMembersList, InviteMemberModal)
- **`sponsors/`** - Sponsor feature components
  - `AudienceMatchBadge.tsx` - Audience match indicator badge
  - `LeadCaptureModal.tsx` - Lead capture modal for sponsors
  - `ROIReportView.tsx` - ROI report visualization component
  - `index.ts` - Barrel export file
- **`attendees/`** - Attendee management (AddAttendeeModal, ImportCSVModal)
- **`calendar/`** - Calendar integration (AddToCalendar)
- **`events/`** - Event forms (ManualEventForm, AddSponsorDialog)
- **`notifications/`** - Notification UI (NotificationBell, NotificationItem, NotificationList)
- **`tickets/`** - Ticket purchase components (TicketPurchase)
- **`chat/`** - Chat UI components (messages, streaming text)
- **`onboarding/`** - User onboarding flow components
- **`playground/`** - Tldraw-based event canvas (Beta feature)
- **`pwa/`** - PWA installation and update prompts
- **`typeform/`** - Multi-step form components
- **`compliance/`** - GDPR components (CookieConsentBanner, TermsAcceptanceDialog, DataExportSection)
- **`demo/`** - Demo mode components (DemoControls, DemoModal, scenes/)

#### `/src/pages` - Page Components (Route Handlers)

- **`dashboard/`** - Main app pages (Events, Vendors, Sponsors, Analytics, Settings, EventAttendeesPage, EventTicketsPage, EventPromoCodesPage, EventSalesPage, EventCheckInPage, EventSponsorsReportPage)
- **`admin/`** - Admin panel pages (Users, Vendors, Sponsors, Moderation, AuditLogs, RateLimits, AdminOrganizations, AdminManagement, AdminEventModeration)
- **`auth/`** - Authentication pages (SignIn, SignUp, ForgotPassword, ResetPassword, VerifyEmail)
- **`tickets/`** - Ticket purchase pages (PaymentSuccess, PaymentCancel)
- **`onboarding/`** - User onboarding flow
- **`public/`** - Public pages (Event directory, event details)
- **`apply/`** - Public application forms (vendor/sponsor applications)
- **`legal/`** - Legal pages (Privacy, Terms, Cookies)
- **`docs/`** - Documentation pages
- **`opensource/`** - Open source contributors page
- **`errors/`** - Error pages (NotFoundPage, ServerErrorPage)

#### `/src/hooks` - Custom React Hooks

- **`useAsyncAction.ts`** - Reusable async action with toast handling
- **`use-pwa.ts`** - PWA installation hooks
- **`use-onboarding.ts`** - Onboarding state management
- **`use-github-data.ts`** - GitHub API integration
- **`use-demo-player.ts`** - Demo playback controls
- **`use-scroll-animation.ts`** - Scroll-based animations
- **`use-audience-toggle.ts`** - Audience visibility toggle
- **`use-analytics-export.ts`** - Analytics export functionality
- **`useHybridAuth.ts`** - Hybrid authentication hook
- **`useModalState.ts`** - Modal state management
- **`useNetworkStatus.ts`** - Network status detection
- **`useOptimisticMutation.ts`** - Optimistic mutation handling
- **`useRetryMutation.ts`** - Mutation retry logic
- **`useToggleArray.ts`** - Array toggle utility
- **`useAriaLive.ts`** - ARIA live region management
- **`useConnectivityMonitor.ts`** - Network connectivity monitoring
- **`useCountdown.ts`** - Countdown timer functionality
- **`useErrorState.ts`** - Error state management
- **`useFieldValidation.ts`** - Field-level form validation
- **`useFormErrorSummary.ts`** - Form error summary handling
- **`useFormFocusManagement.ts`** - Keyboard navigation for forms
- **`useSessionTimeout.ts`** - Session timeout handling
- **`useTermsAcceptance.ts`** - Terms acceptance tracking

**Note:** Unit tests for hooks are co-located (e.g., `use-audience-toggle.test.ts`).

#### `/src/lib` - Utility Functions

- **`utils.ts`** - General utilities (cn, formatters)
- **`constants.ts`** - App-wide constants
- **`validation.ts`** - Form validation helpers
- **`errors.ts`** - Error handling utilities
- **`agent-tools.ts`** - Client-side AI tool definitions
- **`formatters.ts`** - Date/number formatters
- **`sentry.ts`** - Error tracking integration (Sentry)
- **`statusConfigs.ts`** - Status configurations
- **`playground/`** - Playground-specific utilities (extractor, proximity)
- **`calendar/`** - Calendar utilities (ICS generation, calendar URLs)
- **`export/`** - Export utilities (CSV, PDF generation)
- **`compliance/`** - Cookie consent utilities
- **`config/`** - Environment validation and health checks
- **`performance/`** - Lazy loading utilities
- **`security/`** - Security utilities
- **`connectivityMonitor.ts`** - Network status monitoring
- **`errorFormatter.ts`** - Error message formatting with HTML escaping
- **`errorLogger.ts`** - Error logging utilities
- **`errorReporter.ts`** - Error reporting to external services
- **`recoveryActions.ts`** - Error recovery action suggestions

**Note:** Unit tests for utilities are co-located (e.g., `utils.test.ts`, `validation.test.ts`).

#### `/src/contexts` - React Context Providers

- **`AuthContext.tsx`** - Authentication context provider
- **`CSRFContext.tsx`** - CSRF protection context
- **`ErrorStateContext.tsx`** - Error state management context

#### `/src/types` - TypeScript Type Definitions

- **`index.ts`** - Shared types
- **`onboarding.ts`** - Onboarding-specific types

### `/docs` - Documentation

- **`API.md`** - Public API reference
- **`AGENT_SYSTEM.md`** - AI agent system documentation
- **`OPEN_SOURCE_API_GUIDE.md`** - Complete API integration guide
- **`API_TESTING_GUIDE.md`** - How to test the public API
- **`ANALYTICS_FRONTEND_GUIDE.md`** - Analytics implementation guide
- **`DESIGN_SYSTEM.md`** - Design system documentation
- **`PWA_GUIDE.md`** - Progressive Web App guide
- **`FORME.md`** - Project structure guide
- **`MEME.md`** - Project structure documentation instructions
- **`operations/`** - Runbooks (DEPLOYMENT.md, DISASTER_RECOVERY.md, INCIDENT_RESPONSE.md, etc.)
- **`convex/compliance/`** - Compliance guides
- **`convex/monitoring/`** - Monitoring integration guides
- **`convex/security/`** - Security implementation docs
- **`specs/`** - Feature specifications (production-readiness, real-time-collaboration, etc.)

### `/.cursor` - Cursor IDE Configuration

- **`rules/`** - Cursor IDE rules and instructions
  - **`byterover-rules.mdc`** - Byterover MCP server rules
- **`skills/`** - Project skills documentation
  - **`README.md`** - Skills directory overview
  - **`frontend-development.md`** - React, TypeScript, Vite, TailwindCSS skills
  - **`backend-convex.md`** - Convex backend development skills
  - **`testing.md`** - Vitest and Playwright testing skills
  - **`ui-ux.md`** - ShadCN UI, Radix UI, dark mode skills
  - **`ai-integration.md`** - OpenAI function calling and agent systems
  - **`architecture.md`** - Architecture patterns and best practices
  - **`build-deployment.md`** - Build optimization and deployment skills

### `/e2e` - End-to-End Tests

- **`auth.spec.ts`** - Authentication flow tests
- **`landing.spec.ts`** - Landing page tests
- **`auth-flow.spec.ts`** - Full auth flow E2E tests
- **`email-verification.spec.ts`** - Email verification E2E tests
- **`landing-page.spec.ts`** - Landing page E2E tests
- **`analytics-export.spec.ts`** - Analytics export E2E tests
- **`notifications.spec.ts`** - Notifications E2E tests
- **`event-applications.spec.ts`** - Event applications management E2E tests
- **`sponsor-management.spec.ts`** - Sponsor management E2E tests
- **`advanced-sponsor-features.spec.ts`** - Advanced sponsor features E2E tests (lead capture, audience match, ROI)
- **`vendor-management.spec.ts`** - Vendor management E2E tests
- **`organizer-dashboard.spec.ts`** - Organizer dashboard E2E tests
- **`event-details.spec.ts`** - Event details page E2E tests
- **`check-in-system.spec.ts`** - Check-in system E2E tests
- **`attendee-management.spec.ts`** - Attendee management E2E tests
- **`ticketing-system.spec.ts`** - Ticketing system E2E tests
- **`promo-codes.spec.ts`** - Promo codes E2E tests
- **`orders-payments.spec.ts`** - Orders and payments E2E tests
- **`analytics.spec.ts`** - Analytics dashboard E2E tests
- **`dashboard-overview.spec.ts`** - Dashboard overview E2E tests
- **`event-budget.spec.ts`** - Event budget management E2E tests
- **`event-sales.spec.ts`** - Event sales tracking E2E tests
- **`event-tasks.spec.ts`** - Event task management E2E tests
- **`integrations.spec.ts`** - Integrations E2E tests
- **`settings.spec.ts`** - Settings page E2E tests

**Note:** Unit tests are co-located with their components/utilities (e.g., `SignUpForm.test.tsx` next to `SignUpForm.tsx`). Security module tests are in `src/lib/` (accountLockout.test.ts, globalRateLimit.test.ts, auditLog.test.ts). Test setup is in `src/test/setup.ts`.

### `/scripts` - Utility Scripts

- **`generateKeys.mjs`** - API key generation utility
- **`test-api.ps1`** - API testing script
- **`check-auth.mjs`** - Authentication verification
- **`generate-jwks.mjs`** - JWKS key generation
- **`verifyAuthConfig.mjs`** - Auth configuration verification
- **`verifyCompliance.ts`** - Compliance verification
- **`verifyMonitoring.ts`** - Monitoring verification

### `/public` - Static Assets

- PWA manifest and icons
- Offline fallback page
- Auth background images
- Favicons and OG images

### CI/CD Configuration

- **`.github/workflows/`** - GitHub Actions (CI, release, security workflows)
- **`.husky/`** - Git hooks (pre-commit, commit-msg)
- **`.prettierrc`** - Prettier configuration
- **`.lintstagedrc`** - Lint-staged configuration
- **`commitlint.config.js`** - Commit message linting

## Key Architecture Patterns

1. **Convex Backend**: All data operations go through Convex queries/mutations. Real-time subscriptions are automatic.
2. **AI Agent System**: Uses OpenAI function calling with 13 tools for event management operations.
3. **Component Organization**: Pages compose components from `/components`, which use UI primitives from `/components/ui`.
4. **Type Safety**: Full TypeScript coverage with Convex-generated types from `_generated/api`.
5. **Public API**: RESTful API with API key authentication, rate limiting, and webhook support.
6. **Security Layer**: Account lockout, global rate limiting, audit logging, and optional 2FA for enterprise users.
7. **Error Handling System**: Comprehensive error formatting, logging, and recovery with ARIA accessibility support.
8. **Compliance & GDPR**: Cookie consent, terms acceptance, data export/deletion capabilities.

## Entry Points

- **`src/main.tsx`** - React app entry point
- **`src/App.tsx`** - Main router and route definitions
- **`convex/http.ts`** - HTTP endpoints (AI streaming, public API)
- **`index.html`** - HTML entry point

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                         (React 19 + TypeScript)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Landing    │  │    Auth      │  │  Dashboard   │  │    Admin     │   │
│  │    Pages     │  │    Pages     │  │    Pages     │  │    Pages     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                 │                 │             │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                         │
│                           ┌────────▼────────┐                                │
│                           │   App Router    │                                │
│                           │  (React Router) │                                │
│                           └────────┬────────┘                                │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐              │
│         │                          │                          │              │
│  ┌──────▼──────┐         ┌─────────▼─────────┐      ┌───────▼──────┐       │
│  │   UI        │         │   Agentic Chat     │      │   Admin      │       │
│  │ Components  │         │   Components       │      │  Components  │       │
│  │ (ShadCN)    │         │  (agentic-v2/)     │      │              │       │
│  └──────┬──────┘         └─────────┬─────────┘      └───────┬──────┘       │
│         │                          │                          │              │
│  ┌──────▼──────┐         ┌─────────▼─────────┐              │              │
│  │   Hooks     │         │  useStreamingChat  │              │              │
│  │  (Custom)   │         │  (AI SDK React)    │              │              │
│  └──────┬──────┘         └─────────┬─────────┘              │              │
│         │                          │                          │              │
└─────────┼──────────────────────────┼──────────────────────────┼──────────────┘
          │                          │                          │
          │                          │                          │
          │         HTTP/SSE          │      Convex Client       │
          │         (AI Chat)         │   (Queries/Mutations)    │
          │                          │                          │
          └──────────┬───────────────┼──────────────────────────┘
                     │               │
                     │               │
┌────────────────────▼───────────────▼─────────────────────────────────────────┐
│                         CONVEX BACKEND LAYER                                  │
│                    (Serverless Functions + Database)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        HTTP Endpoints                                │   │
│  │                         (convex/http.ts)                             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  POST /api/chat/stream    → AI streaming chat                        │   │
│  │  POST /api/v1/events     → Public API (events)                      │   │
│  │  POST /api/v1/vendors    → Public API (vendors)                      │   │
│  │  POST /api/v1/sponsors   → Public API (sponsors)                     │   │
│  │  POST /api/v1/webhooks   → Webhook management                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│         ┌───────────────────────────┼───────────────────────────┐            │
│         │                           │                           │            │
│  ┌──────▼──────┐          ┌────────▼────────┐        ┌────────▼────────┐   │
│  │   AI Agent  │          │   Public API    │        │   Webhooks      │   │
│  │   System    │          │   Handlers      │        │   Delivery      │   │
│  │             │          │                 │        │                 │   │
│  │ lib/agent/  │          │ api/helpers.ts   │        │ webhooks.ts     │   │
│  │  - tools.ts │          │ api/mutations.ts │        │                 │   │
│  │  - handlers │          │                 │        │                 │   │
│  └──────┬──────┘          └─────────────────┘        └────────┬────────┘   │
│         │                                                    │              │
│         │                    ┌───────────────────────────────┘              │
│         │                    │                                               │
│  ┌──────▼────────────────────▼───────────────────────────────────────────┐  │
│  │                    Domain Functions                                   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  events.ts │ vendors.ts │ sponsors.ts │ eventTasks.ts │ budgetItems.ts│  │
│  │  users.ts  │ inquiries.ts │ apiKeys.ts │ aiUsage.ts │ moderation.ts  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                    Convex Database (Real-time)                        │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │  Tables: users, events, vendors, sponsors, eventTasks, budgetItems,   │  │
│  │          eventVendors, eventSponsors, eventApplications, inquiries,   │  │
│  │          apiKeys, webhooks, webhookDeliveries, aiUsage, organizations,│  │
│  │          organizationMembers, organizationInvitations, auditLogs,     │  │
│  │          rateLimitRecords, accountLockouts, paymentLedger,            │  │
│  │          eventSettlements, commissionConfig, sponsorLeads, etc.       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐  │
│  │                    Real-time Subscriptions                              │  │
│  │              (Automatic updates to connected clients)                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         │                          │                          │
┌────────▼────────┐      ┌───────────▼──────────┐    ┌─────────▼─────────┐
│   OpenAI API    │      │   Google OAuth      │    │  External Apps    │
│  (GPT-4o-mini)  │      │   (Convex Auth)     │    │  (Webhook URLs)   │
│                 │      │                     │    │                   │
│ - Function      │      │ - Authentication    │    │ - Event updates   │
│   Calling       │      │ - User sessions     │    │ - Notifications   │
│ - Streaming     │      │                     │    │                   │
│   Responses     │      │                     │    │                   │
└─────────────────┘      └─────────────────────┘    └───────────────────┘
```

### Data Flow Architecture

#### 1. AI Chat Flow (Streaming)

```
User Input
    │
    ▼
┌─────────────────┐
│ AgenticChatV2   │  (Frontend Component)
│ useStreamingChat │  (Custom Hook)
└────────┬────────┘
         │ POST /api/chat/stream
         │ (Server-Sent Events)
         ▼
┌─────────────────┐
│ convex/http.ts  │  (HTTP Action)
│ /api/chat/stream│
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ OpenAI API   │  │ AI Agent     │
│ streamText() │  │ Tools (13)   │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │ tool_call       │ executeToolHandler()
       │                 │
       └────────┬────────┘
                │
                ▼
┌─────────────────────────┐
│ Convex Mutations        │
│ - events.create         │
│ - vendors.search        │
│ - sponsors.search       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Convex Database         │
│ (Real-time update)      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Frontend Subscription   │
│ (Automatic UI update)   │
└─────────────────────────┘
```

#### 2. Standard CRUD Flow (Real-time)

```
User Action (Frontend)
    │
    ▼
┌─────────────────┐
│ Page Component  │
│ (e.g., Events)  │
└────────┬────────┘
         │ useMutation(api.events.create)
         ▼
┌─────────────────┐
│ Convex Mutation │
│ events.create() │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Convex Database │
│ (Write)         │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌──────────────┐  ┌──────────────────┐
│ Real-time    │  │ Other Clients    │
│ Subscription │  │ (Auto-update)    │
│ (Same Client)│  │                  │
└──────────────┘  └──────────────────┘
```

#### 3. Public API Flow

```
External Application
    │
    │ API Key Authentication
    ▼
┌─────────────────┐
│ POST /api/v1/*  │
│ (convex/http.ts)│
└────────┬────────┘
         │
         ├─ Validate API Key
         ├─ Check Rate Limits
         ├─ Verify Permissions
         │
         ▼
┌─────────────────┐
│ API Handlers    │
│ api/helpers.ts  │
│ api/mutations.ts │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Convex Database │
│ (Read/Write)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Webhook Trigger │
│ (if configured) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ External URL    │
│ (POST payload)  │
└─────────────────┘
```

### Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Pages                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │  Dashboard   │    │    Events    │    │    Admin     │     │
│  │   Overview   │    │     Page     │    │    Panel     │     │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│         │                   │                   │              │
│         └───────────────────┴───────────────────┘              │
│                            │                                    │
│                   ┌────────▼────────┐                           │
│                   │   AppShell      │                           │
│                   │  (Layout)       │                           │
│                   └────────┬────────┘                           │
│                            │                                    │
│         ┌──────────────────┼──────────────────┐                │
│         │                  │                  │                │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌──────▼──────┐        │
│  │   Sidebar   │  │    TopBar       │  │  Agentic    │        │
│  │             │  │                 │  │  Chat V2    │        │
│  │ - Events    │  │ - User Menu     │  │             │        │
│  │ - Vendors   │  │ - Notifications │  │ - AI Input │        │
│  │ - Sponsors  │  │ - Theme Toggle  │  │ - Streaming│        │
│  │ - Analytics │  │                 │  │ - Tools    │        │
│  └─────────────┘  └──────────────────┘  └──────┬─────┘        │
│                                                 │              │
│                                                 ▼              │
│                                        ┌─────────────────┐     │
│                                        │ useStreamingChat│     │
│                                        │ (AI SDK Hook)   │     │
│                                        └────────┬────────┘     │
│                                                 │              │
└─────────────────────────────────────────────────┼──────────────┘
                                                  │
                                                  │ HTTP/SSE
                                                  │
┌─────────────────────────────────────────────────▼──────────────┐
│                      Convex Backend                            │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              HTTP Action Handlers                        │  │
│  │  - /api/chat/stream → AI streaming                      │  │
│  │  - /api/v1/* → Public API                               │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                      │
│         ┌───────────────┼───────────────┐                      │
│         │               │               │                      │
│  ┌──────▼──────┐  ┌────▼────┐  ┌──────▼──────┐              │
│  │ AI Agent    │  │  Public  │  │  Webhooks   │              │
│  │ System      │  │   API    │  │  System     │              │
│  │             │  │          │  │            │              │
│  │ - Tools     │  │ - Auth   │  │ - Delivery │              │
│  │ - Handlers  │  │ - Rate   │  │ - Retry    │              │
│  │ - OpenAI    │  │   Limit  │  │ - Logging  │              │
│  └──────┬──────┘  └────┬─────┘  └──────┬─────┘              │
│         │              │                │                     │
│         └──────────────┼────────────────┘                     │
│                        │                                      │
│              ┌─────────▼─────────┐                           │
│              │  Domain Functions │                           │
│              │  (Queries/Mutations)                           │
│              └─────────┬─────────┘                           │
│                        │                                      │
│              ┌─────────▼─────────┐                           │
│              │  Convex Database  │                           │
│              │  (Real-time)      │                           │
│              └───────────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architecture Patterns

1. **Real-time Data Flow**: Convex automatically syncs database changes to all subscribed clients
2. **AI Streaming**: Server-Sent Events (SSE) for streaming AI responses
3. **Function Calling**: OpenAI tools map to Convex mutations for data operations
4. **API Gateway**: Single HTTP endpoint (`convex/http.ts`) routes to different handlers
5. **Type Safety**: Convex generates TypeScript types from schema automatically
6. **Component Composition**: Pages → Components → UI Primitives hierarchy

### Technology Integration Points

- **Frontend ↔ Backend**: Convex React hooks (`useQuery`, `useMutation`)
- **AI Chat ↔ OpenAI**: HTTP streaming via AI SDK
- **Public API ↔ External Apps**: RESTful endpoints with API key auth
- **Webhooks ↔ External Services**: HTTP POST with retry logic
- **Auth ↔ Google OAuth**: Convex Auth handles OAuth flow
