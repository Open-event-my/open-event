import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { WarningCircle, ArrowClockwise, House, EnvelopeSimple, Bug } from '@phosphor-icons/react'
import type { EnhancedFormattedError } from '@/lib/errorFormatter'

interface RouteErrorFallbackProps {
  /**
   * The error that occurred.
   */
  error?: Error
  /**
   * The formatted error (if available).
   */
  formattedError?: EnhancedFormattedError
  /**
   * Called when user clicks retry.
   */
  onRetry?: () => void
  /**
   * Called when "Report Issue" is clicked.
   */
  onReportIssue?: (error: EnhancedFormattedError) => void
  /**
   * Custom title.
   */
  title?: string
  /**
   * Custom message.
   */
  message?: string
}

/**
 * Full-page error fallback for route-level errors.
 *
 * Features:
 * - Retry button
 * - Navigate to dashboard
 * - Go home
 * - Report issue link
 *
 * @example
 * ```tsx
 * <QueryErrorBoundary fallback={<RouteErrorFallback />}>
 *   <Suspense fallback={<PageLoader />}>
 *     <DashboardPage />
 *   </Suspense>
 * </QueryErrorBoundary>
 * ```
 */
export function RouteErrorFallback({
  error,
  formattedError,
  onRetry,
  onReportIssue,
  title = 'Something went wrong',
  message = 'We encountered an error loading this page. Please try again.',
}: RouteErrorFallbackProps) {
  const navigate = useNavigate()

  // Use formatted error message if available
  const displayTitle = formattedError?.message ? title : title
  const displayMessage = formattedError?.suggestions?.[0] || message

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      // Reload the current page
      window.location.reload()
    }
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  const handleReportIssue = () => {
    if (formattedError && onReportIssue) {
      onReportIssue(formattedError)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10">
          <WarningCircle size={32} weight="duotone" className="text-destructive" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-foreground mb-2">{displayTitle}</h1>

        {/* Message */}
        <p className="text-muted-foreground mb-8">{displayMessage}</p>

        {/* Suggestions from formatted error */}
        {formattedError?.suggestions && formattedError.suggestions.length > 1 && (
          <div className="text-left mb-6 max-w-sm mx-auto">
            <p className="text-sm text-muted-foreground mb-2">Here's what you can try:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {formattedError.suggestions.slice(0, 3).map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error details in development */}
        {import.meta.env.DEV && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Error details (development only)
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-48">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={handleRetry}>
            <ArrowClockwise size={16} weight="bold" className="mr-2" />
            Try Again
          </Button>

          <Button variant="outline" onClick={handleGoBack}>
            Go Back
          </Button>

          <Button variant="ghost" asChild>
            <Link to="/">
              <House size={16} weight="bold" className="mr-2" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Report Issue button */}
        {formattedError && onReportIssue && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={handleReportIssue}>
              <Bug size={16} className="mr-2" />
              Report Issue
            </Button>
          </div>
        )}

        {/* Error ID for reference */}
        {formattedError?.id && (
          <p className="mt-4 text-xs text-muted-foreground">Error ID: {formattedError.id}</p>
        )}

        {/* Dashboard link */}
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Support link */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Need help?</p>
          <a
            href="mailto:support@openevent.com"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <EnvelopeSimple size={16} className="mr-2" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * Minimal error fallback for smaller sections.
 */
export function SectionErrorFallback({
  onRetry,
  message = 'Failed to load this section.',
}: {
  onRetry?: () => void
  message?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <WarningCircle size={24} className="text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <ArrowClockwise size={14} className="mr-2" />
        Retry
      </Button>
    </div>
  )
}
