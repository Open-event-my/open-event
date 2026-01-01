import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { VerifyEmail } from './VerifyEmail'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(window.location.search)],
  }
})

// Mock Convex
const mockUseMutation = vi.fn()
const mockUseAction = vi.fn()
vi.mock('convex/react', () => ({
  useMutation: () => mockUseMutation,
  useAction: () => mockUseAction,
}))

// Mock Phosphor icons
vi.mock('@phosphor-icons/react', () => ({
  CircleNotch: () => <span data-testid="circle-notch-icon">CircleNotch</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  XCircle: () => <span data-testid="x-circle-icon">XCircle</span>,
  EnvelopeSimple: () => <span data-testid="envelope-icon">Envelope</span>,
}))

// Mock toast - use vi.hoisted() to hoist mock functions before vi.mock
const { mockToastError, mockToastSuccess, mockToastInfo } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastInfo: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
    info: mockToastInfo,
  },
}))

// Helper to render with router
const renderWithRouter = (component: React.ReactElement, search = '') => {
  window.history.pushState({}, '', `?${search}`)
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockUseMutation.mockReset()
    mockUseAction.mockReset()
    mockToastError.mockClear()
    mockToastSuccess.mockClear()
    mockToastInfo.mockClear()
    // Set default mock responses to prevent hanging
    mockUseMutation.mockResolvedValue({ success: false, message: 'Mock not configured' })
    mockUseAction.mockResolvedValue({ success: false, message: 'Mock not configured' })
  })

  describe('No Token State', () => {
    it('should show error when no token provided', async () => {
      renderWithRouter(<VerifyEmail />, '')

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument()
        expect(screen.getByText(/no verification token provided/i)).toBeInTheDocument()
        expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
      })
    })

    it('should have back to home button', async () => {
      renderWithRouter(<VerifyEmail />, '')

      await waitFor(() => {
        expect(screen.getByText(/back to home/i)).toBeInTheDocument()
      })
    })

    it('should have contact support link', async () => {
      renderWithRouter(<VerifyEmail />, '')

      await waitFor(() => {
        expect(screen.getByText(/having trouble\?/i)).toBeInTheDocument()
        expect(screen.getByText(/contact support/i)).toBeInTheDocument()
      })
    })
  })

  describe('Verifying State', () => {
    it('should show verifying state initially', () => {
      mockUseMutation.mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<VerifyEmail />, 'token=valid-token-123')

      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument()
      expect(screen.getByTestId('circle-notch-icon')).toBeInTheDocument()
      expect(screen.getByText(/please wait while we verify/i)).toBeInTheDocument()
    })

    it('should call verifyEmail on mount with token', () => {
      mockUseMutation.mockImplementation(() => new Promise(() => {}))
      renderWithRouter(<VerifyEmail />, 'token=abc123')

      expect(mockUseMutation).toHaveBeenCalledWith({ token: 'abc123' })
    })
  })

  describe('Success State', () => {
    beforeEach(async () => {
      mockUseMutation.mockResolvedValue({ success: true, alreadyVerified: false })
      renderWithRouter(<VerifyEmail />, 'token=valid-token-123')

      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument()
      })
    })

    it('should show success message', () => {
      expect(screen.getByText(/email verified!/i)).toBeInTheDocument()
      expect(screen.getByText(/your email has been successfully verified/i)).toBeInTheDocument()
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    })

    it('should show toast notification', async () => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Email verified successfully!')
    })

    it('should have go to dashboard button', () => {
      expect(screen.getByText(/go to dashboard/i)).toBeInTheDocument()
    })

    it('should redirect to dashboard after 3 seconds', async () => {
      // Note: This test verifies the redirect behavior
      // The auto-redirect is set up when the component receives success state
      // We need to wait for the navigate to be called
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
        },
        { timeout: 4000 }
      )
    })
  })

  describe('Already Verified State', () => {
    beforeEach(async () => {
      mockUseMutation.mockResolvedValue({ success: true, alreadyVerified: true })
      renderWithRouter(<VerifyEmail />, 'token=valid-token-123')

      await waitFor(() => {
        expect(screen.getByText(/already verified/i)).toBeInTheDocument()
      })
    })

    it('should show already verified message', () => {
      expect(screen.getByText(/already verified/i)).toBeInTheDocument()
      expect(screen.getByText(/this email address has already been verified/i)).toBeInTheDocument()
    })

    it('should have blue check circle icon', () => {
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    })

    it('should have sign in button', () => {
      const signInLink = screen.getByRole('link', { name: /sign in/i })
      expect(signInLink).toBeInTheDocument()
    })

    it('should have go to dashboard button', () => {
      expect(screen.getByText(/go to dashboard/i)).toBeInTheDocument()
    })

    it('should not redirect automatically', async () => {
      // Already verified state should not auto-redirect
      // Wait a bit to confirm no redirect is triggered
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Error State', () => {
    it('should show error for invalid token', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Invalid token' })
      renderWithRouter(<VerifyEmail />, 'token=invalid-token')

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument()
        expect(screen.getByText(/invalid token/i)).toBeInTheDocument()
        expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
      })
    })

    it('should show error for expired token', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Token expired' })
      renderWithRouter(<VerifyEmail />, 'token=expired-token')

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument()
        expect(screen.getByText(/token expired/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      mockUseMutation.mockRejectedValue(new Error('Network error'))
      renderWithRouter(<VerifyEmail />, 'token=valid-token')

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument()
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })
    })

    it('should show generic error message when no specific message', async () => {
      mockUseMutation.mockResolvedValue({ success: false })
      renderWithRouter(<VerifyEmail />, 'token=valid-token')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /verification failed/i })).toBeInTheDocument()
        // Check for the generic error message in the paragraph
        expect(screen.getByText(/verification failed/i, { selector: 'p' })).toBeInTheDocument()
      })
    })

    it('should have info box with help text', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Invalid token' })
      renderWithRouter(<VerifyEmail />, 'token=invalid-token')

      await waitFor(() => {
        expect(screen.getByText(/need a new verification link\?/i)).toBeInTheDocument()
        expect(screen.getByText(/go to sign in to resend verification email/i)).toBeInTheDocument()
      })
    })

    it('should have back to home button', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Invalid token' })
      renderWithRouter(<VerifyEmail />, 'token=invalid-token')

      await waitFor(() => {
        const backButton = screen.getByText(/back to home/i)
        expect(backButton).toBeInTheDocument()
        expect(backButton.closest('a')).toHaveAttribute('href', '/')
      })
    })
  })

  describe('Resend Functionality', () => {
    it('should have resend option in error state', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Token expired' })
      renderWithRouter(<VerifyEmail />, 'token=expired-token')

      await waitFor(() => {
        expect(screen.getByText(/go to sign in to resend verification email/i)).toBeInTheDocument()
      })
    })

    it('should link to sign in page for resending', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Token expired' })
      renderWithRouter(<VerifyEmail />, 'token=expired-token')

      await waitFor(() => {
        const resendLink = screen.getByText(/go to sign in to resend verification email/i)
        expect(resendLink.closest('a')).toHaveAttribute('href', '/sign-in')
      })
    })
  })

  describe('Navigation Links', () => {
    it('should have contact support email link', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Error' })
      renderWithRouter(<VerifyEmail />, 'token=token')

      await waitFor(() => {
        const supportLink = screen.getByText(/contact support/i)
        expect(supportLink).toHaveAttribute('href', 'mailto:support@openevent.com')
      })
    })

    it('should have sign in link in already verified state', async () => {
      mockUseMutation.mockResolvedValue({ success: true, alreadyVerified: true })
      renderWithRouter(<VerifyEmail />, 'token=token')

      await waitFor(() => {
        const signInLink = screen.getByRole('link', { name: /sign in/i })
        expect(signInLink).toHaveAttribute('href', '/sign-in')
      })
    })

    it('should have dashboard link in already verified state', async () => {
      mockUseMutation.mockResolvedValue({ success: true, alreadyVerified: true })
      renderWithRouter(<VerifyEmail />, 'token=token')

      await waitFor(() => {
        const dashboardLinks = screen.getAllByText(/go to dashboard/i)
        expect(dashboardLinks[0].closest('a')).toHaveAttribute('href', '/dashboard')
      })
    })

    it('should have dashboard link in success state', async () => {
      mockUseMutation.mockResolvedValue({ success: true, alreadyVerified: false })
      renderWithRouter(<VerifyEmail />, 'token=token')

      await waitFor(() => {
        const dashboardLink = screen.getByText(/go to dashboard/i)
        expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard')
      })
    })
  })

  describe('Branding', () => {
    it('should display Open Event branding', () => {
      renderWithRouter(<VerifyEmail />, 'token=token')

      expect(screen.getByText(/open event/i)).toBeInTheDocument()
    })
  })

  describe('Loading and State Transitions', () => {
    it('should transition from verifying to success', async () => {
      mockUseMutation.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, alreadyVerified: false }), 50)
          )
      )
      renderWithRouter(<VerifyEmail />, 'token=token')

      // Initially verifying
      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument()

      // Then success
      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument()
      })
    })

    it('should transition from verifying to error', async () => {
      mockUseMutation.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: false, message: 'Invalid' }), 50)
          )
      )
      renderWithRouter(<VerifyEmail />, 'token=token')

      // Initially verifying
      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument()

      // Then error
      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument()
      })
    })

    it('should transition from verifying to already verified', async () => {
      mockUseMutation.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ success: true, alreadyVerified: true }), 50)
          )
      )
      renderWithRouter(<VerifyEmail />, 'token=token')

      // Initially verifying
      expect(screen.getByText(/verifying your email/i)).toBeInTheDocument()

      // Then already verified
      await waitFor(() => {
        expect(screen.getByText(/already verified/i)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have descriptive heading text', async () => {
      mockUseMutation.mockResolvedValue({ success: true, alreadyVerified: false })
      renderWithRouter(<VerifyEmail />, 'token=token')

      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument()
      })
    })

    it('should have descriptive link text', async () => {
      mockUseMutation.mockResolvedValue({ success: false, message: 'Error' })
      renderWithRouter(<VerifyEmail />, 'token=token')

      await waitFor(() => {
        const backLink = screen.getByText(/back to home/i)
        expect(backLink).toBeInTheDocument()
      })
    })
  })
})
