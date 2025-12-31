import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ServerErrorPage } from './ServerErrorPage'

// Mock Phosphor icons
vi.mock('@phosphor-icons/react', () => ({
  WarningOctagon: ({ className }: { className?: string }) => (
    <span data-testid="warning-icon" className={className}>
      ⚠️
    </span>
  ),
  House: ({ className }: { className?: string }) => (
    <span data-testid="home-icon" className={className}>
      🏠
    </span>
  ),
  ArrowClockwise: ({ className }: { className?: string }) => (
    <span data-testid="refresh-icon" className={className}>
      ↻
    </span>
  ),
  EnvelopeSimple: ({ className }: { className?: string }) => (
    <span data-testid="email-icon" className={className}>
      ✉️
    </span>
  ),
}))

// Mock Logo component
vi.mock('@/components/ui/logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}))

// Mock ThemeToggle component
vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}))

// Wrapper component with router
const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('ServerErrorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the 500 error code', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText('500')).toBeInTheDocument()
    })

    it('should render the page title', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText('Something Went Wrong')).toBeInTheDocument()
    })

    it('should render the default error message', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(
        screen.getByText(/We're experiencing technical difficulties/i)
      ).toBeInTheDocument()
    })

    it('should render custom message when provided', () => {
      const customMessage = 'Custom error message for testing'
      renderWithRouter(<ServerErrorPage message={customMessage} />)
      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('should render the warning icon', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
    })

    it('should render the logo in header', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByTestId('logo')).toBeInTheDocument()
    })

    it('should render the theme toggle', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    })
  })

  describe('Recovery Suggestions', () => {
    it('should render recovery suggestions section', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText(/Here's what you can try/i)).toBeInTheDocument()
    })

    it('should render refresh suggestion', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText(/Refresh the page/i)).toBeInTheDocument()
    })

    it('should render clear cache suggestion', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText(/Clear your browser cache/i)).toBeInTheDocument()
    })

    it('should render try again suggestion', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText(/Try again in a few minutes/i)).toBeInTheDocument()
    })

    it('should render contact support suggestion', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText(/Contact support if the issue persists/i)).toBeInTheDocument()
    })
  })

  describe('Navigation Actions', () => {
    it('should render Refresh Page button', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByRole('button', { name: /Refresh Page/i })).toBeInTheDocument()
    })

    it('should call window.location.reload when Refresh Page is clicked', () => {
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      renderWithRouter(<ServerErrorPage />)
      const refreshButton = screen.getByRole('button', { name: /Refresh Page/i })
      fireEvent.click(refreshButton)

      expect(mockReload).toHaveBeenCalled()
    })

    it('should render Go Home button with link to home', () => {
      renderWithRouter(<ServerErrorPage />)
      const homeLink = screen.getByRole('link', { name: /Go Home/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })

  describe('Error ID', () => {
    it('should not render error ID when not provided', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument()
    })

    it('should render error ID when provided', () => {
      const errorId = 'test-error-123'
      renderWithRouter(<ServerErrorPage errorId={errorId} />)
      expect(screen.getByText(`Error ID: ${errorId}`)).toBeInTheDocument()
    })
  })

  describe('Support Contact', () => {
    it('should render support contact section', () => {
      renderWithRouter(<ServerErrorPage />)
      expect(screen.getByText(/Need help\?/i)).toBeInTheDocument()
    })

    it('should render Contact Support link', () => {
      renderWithRouter(<ServerErrorPage />)
      const supportLink = screen.getByRole('link', { name: /Contact Support/i })
      expect(supportLink).toBeInTheDocument()
      expect(supportLink).toHaveAttribute('href', 'mailto:support@openevent.my')
    })
  })

  describe('Footer', () => {
    it('should render copyright notice', () => {
      renderWithRouter(<ServerErrorPage />)
      const currentYear = new Date().getFullYear()
      expect(screen.getByText(new RegExp(`${currentYear}`))).toBeInTheDocument()
      expect(screen.getByText(/openevent.my/i)).toBeInTheDocument()
    })
  })
})
