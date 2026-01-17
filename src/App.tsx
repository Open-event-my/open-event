import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { QueryErrorBoundary } from '@/components/QueryErrorBoundary'
import { RouteErrorFallback } from '@/components/RouteErrorFallback'
import { InstallPrompt, UpdatePrompt } from '@/components/pwa'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { PageLoader, DashboardLoader } from '@/components/ui/page-loader'
import { AuthProvider } from '@/contexts/AuthContext'
import { SessionTimeoutWarning } from '@/components/security'
import { CookieConsentBanner } from '@/components/compliance'

// ============================================================================
// LANDING PAGE COMPONENTS (loaded immediately - critical for first paint)
// ============================================================================
import {
  Hero,
  LogoCloud,
  CoreConcept,
  FeaturesByUser,
  AIAgent,
  WhyOpenSource,
  FAQ,
  CallToAction,
  Footer,
} from '@/components/landing'

// ============================================================================
// AUTH PAGES (small, loaded immediately for fast auth flow)
// ============================================================================
import { SignIn, SignUp, VerifyEmail, ForgotPassword, ResetPassword } from '@/pages/auth'
import { AuthRedirect } from '@/components/auth/AuthRedirect'
import { Onboarding, OnboardingComplete } from '@/pages/onboarding'
import { PaymentSuccess, PaymentCancel } from '@/pages/tickets'

// ============================================================================
// LAZY-LOADED: DASHBOARD PAGES (~600KB savings)
// These are loaded on-demand when user navigates to /dashboard
// ============================================================================
const AppShell = lazy(() => import('@/components/app').then((m) => ({ default: m.AppShell })))
const DashboardOverview = lazy(() =>
  import('@/pages/dashboard/DashboardOverview').then((m) => ({ default: m.DashboardOverview }))
)
const EventsPage = lazy(() =>
  import('@/pages/dashboard/EventsPage').then((m) => ({ default: m.EventsPage }))
)
const EventCreatePage = lazy(() =>
  import('@/pages/dashboard/EventCreatePage').then((m) => ({ default: m.EventCreatePage }))
)
const EventDetailPage = lazy(() =>
  import('@/pages/dashboard/EventDetailPage').then((m) => ({ default: m.EventDetailPage }))
)
const EventEditPage = lazy(() =>
  import('@/pages/dashboard/EventEditPage').then((m) => ({ default: m.EventEditPage }))
)
const EventApplicationsPage = lazy(() =>
  import('@/pages/dashboard/EventApplicationsPage').then((m) => ({
    default: m.EventApplicationsPage,
  }))
)
const EventBudgetPage = lazy(() =>
  import('@/pages/dashboard/EventBudgetPage').then((m) => ({ default: m.EventBudgetPage }))
)
const EventTasksPage = lazy(() =>
  import('@/pages/dashboard/EventTasksPage').then((m) => ({ default: m.EventTasksPage }))
)
const EventAttendeesPage = lazy(() =>
  import('@/pages/dashboard/EventAttendeesPage').then((m) => ({ default: m.EventAttendeesPage }))
)
const EventCheckInPage = lazy(() =>
  import('@/pages/dashboard/EventCheckInPage').then((m) => ({ default: m.EventCheckInPage }))
)
const EventTicketsPage = lazy(() =>
  import('@/pages/dashboard/EventTicketsPage').then((m) => ({ default: m.EventTicketsPage }))
)
const EventSalesPage = lazy(() =>
  import('@/pages/dashboard/EventSalesPage').then((m) => ({ default: m.EventSalesPage }))
)
const EventPromoCodesPage = lazy(() =>
  import('@/pages/dashboard/EventPromoCodesPage').then((m) => ({ default: m.EventPromoCodesPage }))
)
const EventSponsorsReportPage = lazy(() =>
  import('@/pages/dashboard/EventSponsorsReportPage').then((m) => ({
    default: m.EventSponsorsReportPage,
  }))
)
const VendorsPage = lazy(() =>
  import('@/pages/dashboard/VendorsPage').then((m) => ({ default: m.VendorsPage }))
)
const SponsorsPage = lazy(() =>
  import('@/pages/dashboard/SponsorsPage').then((m) => ({ default: m.SponsorsPage }))
)
const AnalyticsPage = lazy(() =>
  import('@/pages/dashboard/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/dashboard/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)
const IntegrationPage = lazy(() =>
  import('@/pages/dashboard/IntegrationPage').then((m) => ({ default: m.IntegrationPage }))
)

// Playground DISABLED - tldraw has React 18 compatibility issues
// TODO: Re-enable when tldraw is fixed
// const PlaygroundPage = lazy(() =>
//   import('@/pages/dashboard/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage }))
// )

// ============================================================================
// LAZY-LOADED: ADMIN PAGES (~600KB savings)
// ============================================================================
const AdminLayout = lazy(() =>
  import('@/components/admin').then((m) => ({ default: m.AdminLayout }))
)
const AdminDashboard = lazy(() =>
  import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
)
const AdminUsers = lazy(() =>
  import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers }))
)
const AdminVendors = lazy(() =>
  import('@/pages/admin/AdminVendors').then((m) => ({ default: m.AdminVendors }))
)
const AdminSponsors = lazy(() =>
  import('@/pages/admin/AdminSponsors').then((m) => ({ default: m.AdminSponsors }))
)
const AdminPublicApplications = lazy(() =>
  import('@/pages/admin/AdminPublicApplications').then((m) => ({
    default: m.AdminPublicApplications,
  }))
)
const AdminModeration = lazy(() =>
  import('@/pages/admin/AdminModeration').then((m) => ({ default: m.AdminModeration }))
)
const AdminAIUsage = lazy(() =>
  import('@/pages/admin/AdminAIUsage').then((m) => ({ default: m.AdminAIUsage }))
)
const AdminSettings = lazy(() =>
  import('@/pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings }))
)
const AdminAuditLogs = lazy(() =>
  import('@/pages/admin/AdminAuditLogs').then((m) => ({ default: m.AdminAuditLogs }))
)
const AdminRateLimits = lazy(() =>
  import('@/pages/admin/AdminRateLimits').then((m) => ({ default: m.AdminRateLimits }))
)
const AdminManagement = lazy(() =>
  import('@/pages/admin/AdminManagement').then((m) => ({ default: m.AdminManagement }))
)
const AdminEventModeration = lazy(() =>
  import('@/pages/admin/AdminEventModeration').then((m) => ({ default: m.AdminEventModeration }))
)
const AdminOrganizations = lazy(() =>
  import('@/pages/admin/AdminOrganizations').then((m) => ({ default: m.AdminOrganizations }))
)

// ============================================================================
// LAZY-LOADED: PUBLIC/DOCS PAGES (~200KB savings)
// ============================================================================
const DocsPage = lazy(() => import('@/pages/docs/DocsPage').then((m) => ({ default: m.DocsPage })))
const OpenSourcePage = lazy(() =>
  import('@/pages/opensource/OpenSourcePage').then((m) => ({ default: m.OpenSourcePage }))
)
const EventDirectory = lazy(() =>
  import('@/pages/public/EventDirectory').then((m) => ({ default: m.EventDirectory }))
)
const EventDetailPublic = lazy(() =>
  import('@/pages/public/EventDetailPublic').then((m) => ({ default: m.EventDetailPublic }))
)

// ============================================================================
// LAZY-LOADED: LEGAL PAGES (~50KB savings)
// ============================================================================
const PrivacyPolicy = lazy(() =>
  import('@/pages/legal/PrivacyPolicy').then((m) => ({ default: m.PrivacyPolicy }))
)
const TermsOfService = lazy(() =>
  import('@/pages/legal/TermsOfService').then((m) => ({ default: m.TermsOfService }))
)
const CookiePolicy = lazy(() =>
  import('@/pages/legal/CookiePolicy').then((m) => ({ default: m.CookiePolicy }))
)

// ============================================================================
// LAZY-LOADED: APPLICATION PAGES (~80KB savings)
// ============================================================================
const VendorApplicationPage = lazy(() =>
  import('@/pages/apply/VendorApplicationPage').then((m) => ({ default: m.VendorApplicationPage }))
)
const SponsorApplicationPage = lazy(() =>
  import('@/pages/apply/SponsorApplicationPage').then((m) => ({
    default: m.SponsorApplicationPage,
  }))
)
const ApplicationSuccess = lazy(() =>
  import('@/pages/apply/ApplicationSuccess').then((m) => ({ default: m.ApplicationSuccess }))
)

// ============================================================================
// LAZY-LOADED: ERROR PAGES
// ============================================================================
const NotFoundPage = lazy(() => import('@/pages/errors').then((m) => ({ default: m.NotFoundPage })))
const ServerErrorPage = lazy(() =>
  import('@/pages/errors').then((m) => ({ default: m.ServerErrorPage }))
)

// ============================================================================
// LANDING PAGE (not lazy - first paint)
// ============================================================================
function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <Hero />
        <LogoCloud />
        <FeaturesByUser />
        <CoreConcept />
        <AIAgent />
        <WhyOpenSource />
        <FAQ />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
function App() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)

  // Listen for service worker update events
  useEffect(() => {
    const handleSwUpdate = () => {
      setShowUpdatePrompt(true)
    }

    window.addEventListener('sw-update-available', handleSwUpdate)
    return () => window.removeEventListener('sw-update-available', handleSwUpdate)
  }, [])

  const handleUpdate = useCallback(() => {
    if (window.__updateSW) {
      window.__updateSW(true)
    } else {
      window.location.reload()
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Landing & Auth - Not lazy loaded for fast initial experience */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/redirect" element={<AuthRedirect />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/onboarding/complete" element={<OnboardingComplete />} />

              {/* Ticket Payment Pages */}
              <Route path="/tickets/success" element={<PaymentSuccess />} />
              <Route path="/tickets/cancel" element={<PaymentCancel />} />

              {/* Dashboard - Lazy loaded with skeleton and error boundary */}
              <Route
                path="/dashboard"
                element={
                  <QueryErrorBoundary
                    fallback={({ error, retry }) => (
                      <RouteErrorFallback error={error} onRetry={retry} />
                    )}
                  >
                    <Suspense fallback={<DashboardLoader />}>
                      <AppShell />
                    </Suspense>
                  </QueryErrorBoundary>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<PageLoader message="Loading dashboard..." />}>
                      <DashboardOverview />
                    </Suspense>
                  }
                />
                {/* Playground DISABLED - tldraw has React 18 compatibility issues
                <Route
                  path="playground"
                  element={
                    <Suspense fallback={<PageLoader message="Loading playground..." />}>
                      <PlaygroundPage />
                    </Suspense>
                  }
                />
                */}
                <Route
                  path="integration"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <IntegrationPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events"
                  element={
                    <Suspense fallback={<PageLoader message="Loading events..." />}>
                      <EventsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/new"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <EventCreatePage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/create"
                  element={<Navigate to="/dashboard/events/new" replace />}
                />
                <Route
                  path="events/:eventId"
                  element={
                    <Suspense fallback={<PageLoader message="Loading event..." />}>
                      <EventDetailPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/edit"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <EventEditPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/applications"
                  element={
                    <QueryErrorBoundary
                      fallback={({ error, retry }) => (
                        <RouteErrorFallback error={error} onRetry={retry} />
                      )}
                    >
                      <Suspense fallback={<PageLoader message="Loading..." />}>
                        <EventApplicationsPage />
                      </Suspense>
                    </QueryErrorBoundary>
                  }
                />
                <Route
                  path="events/:eventId/budget"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <EventBudgetPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/tasks"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <EventTasksPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/attendees"
                  element={
                    <Suspense fallback={<PageLoader message="Loading attendees..." />}>
                      <EventAttendeesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/attendees/check-in"
                  element={
                    <Suspense fallback={<PageLoader message="Loading check-in..." />}>
                      <EventCheckInPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/tickets"
                  element={
                    <Suspense fallback={<PageLoader message="Loading tickets..." />}>
                      <EventTicketsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/sales"
                  element={
                    <Suspense fallback={<PageLoader message="Loading sales..." />}>
                      <EventSalesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/promo-codes"
                  element={
                    <Suspense fallback={<PageLoader message="Loading promo codes..." />}>
                      <EventPromoCodesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="events/:eventId/sponsors/:sponsorshipId/report"
                  element={
                    <Suspense fallback={<PageLoader message="Loading sponsor report..." />}>
                      <EventSponsorsReportPage />
                    </Suspense>
                  }
                />
                <Route
                  path="vendors"
                  element={
                    <Suspense fallback={<PageLoader message="Loading vendors..." />}>
                      <VendorsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="sponsors"
                  element={
                    <Suspense fallback={<PageLoader message="Loading sponsors..." />}>
                      <SponsorsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <Suspense fallback={<PageLoader message="Loading analytics..." />}>
                      <AnalyticsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<PageLoader message="Loading settings..." />}>
                      <SettingsPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Admin - Lazy loaded with error boundary */}
              <Route
                path="/admin"
                element={
                  <QueryErrorBoundary
                    fallback={({ error, retry }) => (
                      <RouteErrorFallback error={error} onRetry={retry} />
                    )}
                  >
                    <Suspense fallback={<DashboardLoader />}>
                      <AdminLayout />
                    </Suspense>
                  </QueryErrorBoundary>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<PageLoader message="Loading admin..." />}>
                      <AdminDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path="users"
                  element={
                    <Suspense fallback={<PageLoader message="Loading users..." />}>
                      <AdminUsers />
                    </Suspense>
                  }
                />
                <Route
                  path="vendors"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <AdminVendors />
                    </Suspense>
                  }
                />
                <Route
                  path="sponsors"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <AdminSponsors />
                    </Suspense>
                  }
                />
                <Route
                  path="applications"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <AdminPublicApplications />
                    </Suspense>
                  }
                />
                <Route
                  path="moderation"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <AdminModeration />
                    </Suspense>
                  }
                />
                <Route
                  path="ai-usage"
                  element={
                    <Suspense fallback={<PageLoader message="Loading AI usage..." />}>
                      <AdminAIUsage />
                    </Suspense>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <Suspense fallback={<PageLoader message="Loading audit logs..." />}>
                      <AdminAuditLogs />
                    </Suspense>
                  }
                />
                <Route
                  path="rate-limits"
                  element={
                    <Suspense fallback={<PageLoader message="Loading rate limits..." />}>
                      <AdminRateLimits />
                    </Suspense>
                  }
                />
                <Route
                  path="admins"
                  element={
                    <Suspense fallback={<PageLoader message="Loading admin management..." />}>
                      <AdminManagement />
                    </Suspense>
                  }
                />
                <Route
                  path="event-moderation"
                  element={
                    <Suspense fallback={<PageLoader message="Loading event moderation..." />}>
                      <AdminEventModeration />
                    </Suspense>
                  }
                />
                <Route
                  path="organizations"
                  element={
                    <Suspense fallback={<PageLoader message="Loading organizations..." />}>
                      <AdminOrganizations />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<PageLoader message="Loading..." />}>
                      <AdminSettings />
                    </Suspense>
                  }
                />
              </Route>

              {/* Public Routes - Lazy loaded */}
              <Route
                path="/docs"
                element={
                  <Suspense fallback={<PageLoader message="Loading documentation..." />}>
                    <DocsPage />
                  </Suspense>
                }
              />
              <Route
                path="/contributors"
                element={
                  <Suspense fallback={<PageLoader message="Loading..." />}>
                    <OpenSourcePage />
                  </Suspense>
                }
              />
              <Route
                path="/events"
                element={
                  <Suspense fallback={<PageLoader message="Loading events..." />}>
                    <EventDirectory />
                  </Suspense>
                }
              />
              <Route
                path="/events/:eventId"
                element={
                  <Suspense fallback={<PageLoader message="Loading event..." />}>
                    <EventDetailPublic />
                  </Suspense>
                }
              />

              {/* Legal Pages - Lazy loaded */}
              <Route
                path="/privacy"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PrivacyPolicy />
                  </Suspense>
                }
              />
              <Route
                path="/terms"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <TermsOfService />
                  </Suspense>
                }
              />
              <Route
                path="/cookies"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CookiePolicy />
                  </Suspense>
                }
              />

              {/* Application Pages - Lazy loaded */}
              <Route
                path="/apply/vendor"
                element={
                  <Suspense fallback={<PageLoader message="Loading application form..." />}>
                    <VendorApplicationPage />
                  </Suspense>
                }
              />
              <Route
                path="/apply/sponsor"
                element={
                  <Suspense fallback={<PageLoader message="Loading application form..." />}>
                    <SponsorApplicationPage />
                  </Suspense>
                }
              />
              <Route
                path="/apply/success"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ApplicationSuccess />
                  </Suspense>
                }
              />

              {/* Error Pages */}
              <Route
                path="/500"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ServerErrorPage />
                  </Suspense>
                }
              />

              {/* 404 Catch-all - Must be last */}
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />
            </Routes>
            <Toaster />

            {/* Session timeout warning */}
            <SessionTimeoutWarning />

            {/* Cookie consent banner */}
            <CookieConsentBanner />

            {/* Network status */}
            <OfflineBanner />

            {/* PWA Components */}
            <InstallPrompt />
            {showUpdatePrompt && <UpdatePrompt onUpdate={handleUpdate} />}
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
