import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  WarningCircle,
  ArrowClockwise,
  WifiSlash,
  LockKey,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import { logQueryError } from '@/lib/errorLogger'
import {
  formatErrorWithContext,
  type EnhancedFormattedError,
  type ErrorCategory,
} from '@/lib/errorFormatter'

/**
 * Error types for better UX
 * @deprecated Use ErrorCategory from errorFormatter instead
 */
type ErrorType = 'network' | 'permission' | 'notFound' | 'generic'

interface Props {
  children: ReactNode
  /**
   * Custom fallback component. Receives error, errorType, and retry function.
   */
  fallback?: (props: {
    error: Error
    formattedError: EnhancedFormattedError
    errorType: ErrorType
    retry: () => void
    reset: () => void
  }) => ReactNode
  /**
   * Called when an error is caught.
   */
  onError?: (error: Error, formattedError: EnhancedFormattedError) => void
  /**
   * Called when user clicks retry.
   */
  onRetry?: () => void
  /**
   * Title to display in error state.
   */
  title?: string
  /**
   * Whether to show a compact error UI.
   */
  compact?: boolean
  /**
   * Query key for logging purposes
   */
  queryKey?: string | unknown[]
}

interface State {
  hasError: boolean
  error: Error | null
  formattedError: EnhancedFormattedError | null
  errorType: ErrorType
}

/**
 * Map ErrorCategory to legacy ErrorType
 */
function categoryToErrorType(category: ErrorCategory): ErrorType {
  switch (category) {
    case 'network':
      return 'network'
    case 'permission':
    case 'auth':
      return 'permission'
    case 'notFound':
      return 'notFound'
    default:
      return 'generic'
  }
}

/**
 * Determine the type of error for better UX
 */
function getErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase()

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('timeout')
  ) {
    return 'network'
  }

  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('access denied')
  ) {
    return 'permission'
  }

  if (message.includes('not found') || message.includes('404')) {
    return 'notFound'
  }

  return 'generic'
}

/**
 * Get display info for error type
 */
function getErrorDisplay(errorType: ErrorType): {
  icon: typeof WarningCircle
  title: string
  message: string
  retryLabel: string
} {
  switch (errorType) {
    case 'network':
      return {
        icon: WifiSlash,
        title: 'Connection Issue',
        message:
          'Unable to connect to the server. Please check your internet connection and try again.',
        retryLabel: 'Retry Connection',
      }
    case 'permission':
      return {
        icon: LockKey,
        title: 'Access Denied',
        message:
          "You don't have permission to view this content. Please sign in or contact support.",
        retryLabel: 'Try Again',
      }
    case 'notFound':
      return {
        icon: MagnifyingGlass,
        title: 'Not Found',
        message: 'The requested content could not be found. It may have been moved or deleted.',
        retryLabel: 'Refresh',
      }
    default:
      return {
        icon: WarningCircle,
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again.',
        retryLabel: 'Try Again',
      }
  }
}

/**
 * Error boundary specifically designed for data-fetching components.
 *
 * Features:
 * - Catches both sync and async errors
 * - Provides contextual error messages (network, permission, not found)
 * - Retry functionality
 * - Sentry integration
 *
 * @example
 * ```tsx
 * <QueryErrorBoundary onRetry={refetch}>
 *   <EventsList />
 * </QueryErrorBoundary>
 *
 * // With custom fallback
 * <QueryErrorBoundary
 *   fallback={({ error, retry }) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={retry}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <EventsList />
 * </QueryErrorBoundary>
 * ```
 */
export class QueryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, formattedError: null, errorType: 'generic' }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const formattedError = formatErrorWithContext(error, {
      action: 'fetch data',
      component: 'QueryErrorBoundary',
    })

    return {
      hasError: true,
      error,
      formattedError,
      errorType: categoryToErrorType(formattedError.category),
    }
  }

  componentDidCatch(error: Error): void {
    // Log with enhanced error logging
    const formattedError = logQueryError(error, this.props.queryKey || 'unknown')

    // Call custom error handler
    this.props.onError?.(error, formattedError)
  }

  handleRetry = (): void => {
    this.props.onRetry?.()
    this.setState({ hasError: false, error: null, formattedError: null, errorType: 'generic' })
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, formattedError: null, errorType: 'generic' })
  }

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error || !this.state.formattedError) {
      return this.props.children
    }

    // Custom fallback
    if (this.props.fallback) {
      return this.props.fallback({
        error: this.state.error,
        formattedError: this.state.formattedError,
        errorType: this.state.errorType,
        retry: this.handleRetry,
        reset: this.handleReset,
      })
    }

    const { errorType } = this.state
    const display = getErrorDisplay(errorType)
    const Icon = display.icon
    const title = this.props.title || display.title

    // Compact mode
    if (this.props.compact) {
      return (
        <div className="flex items-center justify-center p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <Icon size={24} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{this.state.formattedError.message}</p>
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              <ArrowClockwise size={14} className="mr-2" />
              {display.retryLabel}
            </Button>
          </div>
        </div>
      )
    }

    // Full error UI
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-muted">
          <Icon size={24} weight="duotone" className="text-muted-foreground" />
        </div>

        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>

        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{display.message}</p>

        {import.meta.env.DEV && this.state.error && (
          <details className="mb-6 text-left w-full max-w-md">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Debug info
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          </details>
        )}

        <Button onClick={this.handleRetry}>
          <ArrowClockwise size={16} className="mr-2" />
          {display.retryLabel}
        </Button>
      </div>
    )
  }
}

export { getErrorType, getErrorDisplay }
export type { ErrorType }
