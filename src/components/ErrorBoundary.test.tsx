import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, withErrorBoundary } from './ErrorBoundary'

// Mock Sentry
const mockCaptureError = vi.fn()
vi.mock('@/lib/sentry', () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}))

// Mock ErrorLogger
const mockLogErrorBoundaryError = vi.fn()
vi.mock('@/lib/errorLogger', () => ({
  logErrorBoundaryError: (...args: unknown[]) => mockLogErrorBoundaryError(...args),
}))

// Mock Phosphor icons
vi.mock('@phosphor-icons/react', () => ({
  WarningCircle: ({ className }: { className?: string }) => (
    <span data-testid="warning-icon" className={className}>
      ⚠️
    </span>
  ),
  ArrowClockwise: ({ className }: { className?: string }) => (
    <span data-testid="retry-icon" className={className}>
      ↻
    </span>
  ),
  House: ({ className }: { className?: string }) => (
    <span data-testid="home-icon" className={className}>
      🏠
    </span>
  ),
  Bug: ({ className }: { className?: string }) => (
    <span data-testid="bug-icon" className={className}>
      🐛
    </span>
  ),
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
  }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}))

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div data-testid="success">Success</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('Error Catching', () => {
    it('should catch errors and display error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // The error boundary now displays the formatted error message
      expect(screen.getAllByText(/Test error/).length).toBeGreaterThan(0)
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
    })

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('success')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should log error via errorLogger', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(mockLogErrorBoundaryError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })
  })

  describe('Error UI', () => {
    it('should display user-friendly error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // The error boundary displays the formatted error message
      expect(screen.getAllByText(/Test error/).length).toBeGreaterThan(0)
      expect(screen.getByText(/Here's what you can try/i)).toBeInTheDocument()
    })

    it('should display Try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Use getAllByText since "Try again" appears in both suggestions and button
      const tryAgainElements = screen.getAllByText(/Try again/i)
      expect(tryAgainElements.length).toBeGreaterThan(0)
      expect(screen.getByTestId('retry-icon')).toBeInTheDocument()
    })

    it('should display Go Home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText(/Go Home/i)).toBeInTheDocument()
      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    })

    it('should display error ID', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByText(/Error ID:/i)).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('should reset error state when Try again is clicked', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // The error boundary displays the formatted error message
      expect(screen.getAllByText(/Test error/).length).toBeGreaterThan(0)

      // Find the Try Again button (not the suggestion text)
      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i })
      fireEvent.click(tryAgainButton)

      // After reset, the component should try to render children again
      // Since ThrowError still throws, it will show error again
      expect(screen.getAllByText(/Test error/).length).toBeGreaterThan(0)
    })

    it('should navigate to home when Go Home is clicked', () => {
      // Mock window.location.href
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      const goHomeButton = screen.getByText(/Go Home/i)
      fireEvent.click(goHomeButton)

      expect(window.location.href).toBe('/')
    })
  })

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Minimal Mode', () => {
    it('should render minimal error UI when minimal prop is true', () => {
      render(
        <ErrorBoundary minimal>
          <ThrowError />
        </ErrorBoundary>
      )

      // In minimal mode, it shows the formatted error message
      expect(screen.getAllByText(/Test error/).length).toBeGreaterThan(0)
      expect(screen.getByTestId('bug-icon')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
      // Should not show full error UI
      expect(screen.queryByTestId('warning-icon')).not.toBeInTheDocument()
      expect(screen.queryByText(/Go Home/i)).not.toBeInTheDocument()
    })

    it('should reset error when Retry is clicked in minimal mode', () => {
      render(
        <ErrorBoundary minimal>
          <ThrowError />
        </ErrorBoundary>
      )

      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      // After reset, the component should try to render children again
      expect(screen.getAllByText(/Test error/).length).toBeGreaterThan(0)
    })
  })

  describe('Custom Error Handler', () => {
    it('should call custom onError handler when error is caught', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      )
    })
  })

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const TestComponent = () => <div data-testid="test-component">Test</div>
      const WrappedComponent = withErrorBoundary(TestComponent)

      render(<WrappedComponent />)

      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    it('should catch errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowError)

      render(<WrappedComponent />)

      // The error boundary displays the formatted error message
      expect(screen.getAllByText(/Test error/).length).toBeGreaterThan(0)
    })

    it('should pass error boundary props to HOC', () => {
      const customFallback = <div data-testid="hoc-fallback">HOC Error</div>
      const WrappedComponent = withErrorBoundary(ThrowError, {
        fallback: customFallback,
      })

      render(<WrappedComponent />)

      expect(screen.getByTestId('hoc-fallback')).toBeInTheDocument()
    })

    it('should pass props to wrapped component', () => {
      const TestComponent = ({ message }: { message: string }) => (
        <div data-testid="test-component">{message}</div>
      )
      const WrappedComponent = withErrorBoundary(TestComponent)

      render(<WrappedComponent message="Hello World" />)

      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })
  })

  describe('Development Mode', () => {
    it('should show error details in development mode', () => {
      // Mock development mode
      const originalEnv = import.meta.env.DEV
      import.meta.env.DEV = true

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )

      // Should show details element
      const details = screen.getByText(/Error details/i)
      expect(details).toBeInTheDocument()

      // Restore
      import.meta.env.DEV = originalEnv
    })
  })
})
