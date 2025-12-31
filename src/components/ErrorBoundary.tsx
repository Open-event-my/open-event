import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { WarningCircle, ArrowClockwise, House, Bug } from '@phosphor-icons/react'
import { captureError } from '@/lib/sentry'
import { formatErrorMessage } from '@/lib/errorFormatter'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Show a minimal error UI (useful for smaller components) */
  minimal?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

/**
 * Error Boundary component that catches JavaScript errors in child components.
 * Integrates with Sentry for error tracking.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * // Minimal mode for smaller components
 * <ErrorBoundary minimal>
 *   <SmallWidget />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorId: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}`,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorId: null })
  }

  handleGoHome = (): void => {
    window.location.href = '/'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Format the error for user-friendly display
      const formatted = this.state.error ? formatErrorMessage(this.state.error) : null

      // Minimal error UI for smaller components
      if (this.props.minimal) {
        return (
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <Bug size={16} className="mr-2" />
            <span className="text-sm">{formatted?.message || 'Something went wrong'}</span>
            <button
              onClick={this.handleReset}
              className="ml-2 text-primary hover:underline text-sm"
            >
              Retry
            </button>
          </div>
        )
      }

      // Full error UI with user-friendly message and suggestions
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10">
            <WarningCircle size={32} weight="duotone" className="text-destructive" />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            {formatted?.message || 'Something went wrong'}
          </h2>

          {formatted?.suggestions && formatted.suggestions.length > 0 && (
            <div className="text-muted-foreground mb-6 max-w-md">
              <p className="mb-2">Here's what you can try:</p>
              <ul className="text-sm space-y-1 text-left">
                {formatted.suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!formatted?.suggestions && (
            <p className="text-muted-foreground mb-6 max-w-md">
              We encountered an unexpected error. Our team has been notified and is working on a
              fix.
            </p>
          )}

          {import.meta.env.DEV && this.state.error && (
            <details className="mb-6 text-left w-full max-w-lg">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Error details (development only)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-48">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={this.handleReset} variant="default">
              <ArrowClockwise size={16} weight="bold" className="mr-2" />
              {formatted?.actionText || 'Try again'}
            </Button>
            <Button onClick={this.handleGoHome} variant="outline">
              <House size={16} weight="bold" className="mr-2" />
              Go Home
            </Button>
          </div>

          {/* Error ID for support reference */}
          {this.state.errorId && (
            <p className="mt-6 text-xs text-muted-foreground">Error ID: {this.state.errorId}</p>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}
