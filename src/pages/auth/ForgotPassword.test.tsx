import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ForgotPassword } from './ForgotPassword'

// Mock Convex
const mockUseAction = vi.fn()
vi.mock('convex/react', () => ({
  useAction: () => mockUseAction,
}))

// Mock Phosphor icons
vi.mock('@phosphor-icons/react', () => ({
  EnvelopeSimple: () => <span data-testid="envelope-icon">Envelope</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeft</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  CircleNotch: () => <span data-testid="circle-notch-icon">CircleNotch</span>,
}))

// Mock toast - use vi.hoisted() to hoist mock functions before vi.mock
const { mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}))

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAction.mockReset()
    mockToastError.mockClear()
    mockToastSuccess.mockClear()
    // Set default mock response to prevent hanging
    mockUseAction.mockResolvedValue({ success: false, message: 'Mock not configured' })
  })

  describe('Initial Render', () => {
    it('should render all form elements', () => {
      renderWithRouter(<ForgotPassword />)

      expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
      expect(screen.getByText(/back to sign in/i)).toBeInTheDocument()
    })

    it('should render envelope icon', () => {
      renderWithRouter(<ForgotPassword />)
      expect(screen.getAllByTestId('envelope-icon').length).toBeGreaterThan(0)
    })

    it('should have email input with placeholder', () => {
      renderWithRouter(<ForgotPassword />)
      const emailInput = screen.getByPlaceholderText(/you@example.com/i)
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('type', 'email')
    })
  })

  describe('Form Validation', () => {
    it('should not submit form with empty email (HTML5 validation)', async () => {
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })

      // HTML5 validation prevents form submission on empty required field
      await user.click(submitButton)

      expect(mockUseAction).not.toHaveBeenCalled()
      expect(emailInput).toBeInvalid() // HTML5 validation marks it invalid
    })

    it('should not submit form with invalid email (HTML5 validation)', async () => {
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      // HTML5 type="email" validation prevents form submission
      expect(mockUseAction).not.toHaveBeenCalled()
    })

    it('should accept valid email format', async () => {
      mockUseAction.mockResolvedValue({ success: true })
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockUseAction).toHaveBeenCalledWith({ email: 'test@example.com' })
      })
    })

    it('should convert email to lowercase', async () => {
      mockUseAction.mockResolvedValue({ success: true })
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'TEST@EXAMPLE.COM')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockUseAction).toHaveBeenCalledWith({ email: 'test@example.com' })
      })
    })
  })

  describe('Form Submission', () => {
    it('should show loading state during submission', async () => {
      mockUseAction.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      )
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/sending\.\.\./i)).toBeInTheDocument()
      expect(screen.getByTestId('circle-notch-icon')).toBeInTheDocument()

      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      })
    })

    it('should disable form during submission', async () => {
      mockUseAction.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      )
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      // Form should be disabled
      expect(emailInput).toBeDisabled()
      expect(submitButton).toBeDisabled()

      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      })
    })

    it('should show success state after successful submission', async () => {
      mockUseAction.mockResolvedValue({ success: true })
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
        expect(mockToastSuccess).toHaveBeenCalledWith('Password reset email sent!')
      })
    })

    it('should show error message on submission failure', async () => {
      mockUseAction.mockResolvedValue({ success: false, message: 'User not found' })
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('User not found')
      })
    })

    it('should handle network errors', async () => {
      mockUseAction.mockRejectedValue(new Error('Network error'))
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Network error')
      })
    })
  })

  describe('Success State', () => {
    beforeEach(async () => {
      mockUseAction.mockResolvedValue({ success: true })
    })

    it('should display success message with email', async () => {
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
        expect(screen.getByText(/we've sent password reset instructions to/i)).toBeInTheDocument()
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
      })
    })

    it('should show what to do next instructions', async () => {
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/what to do next:/i)).toBeInTheDocument()
        expect(screen.getByText(/check your email inbox/i)).toBeInTheDocument()
        expect(screen.getByText(/click the reset link/i)).toBeInTheDocument()
        expect(screen.getByText(/create a new password/i)).toBeInTheDocument()
      })
    })

    it('should have try different email button', async () => {
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try different email/i })).toBeInTheDocument()
      })
    })

    it('should return to form when clicking try different email', async () => {
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument()
      })

      const tryDifferentButton = screen.getByRole('button', { name: /try different email/i })
      await user.click(tryDifferentButton)

      // Should return to form
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    })

    it('should have back to sign in link', async () => {
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')

      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      await user.click(submitButton)

      await waitFor(() => {
        const backToSignInLinks = screen.getAllByText(/back to sign in/i)
        expect(backToSignInLinks.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Navigation', () => {
    it('should have back to sign in link', () => {
      renderWithRouter(<ForgotPassword />)
      const backLink = screen.getByText(/back to sign in/i)
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/sign-in')
    })

    it('should have arrow left icon on back link', () => {
      renderWithRouter(<ForgotPassword />)
      const arrowIcons = screen.getAllByTestId('arrow-left-icon')
      expect(arrowIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Keyboard Interactions', () => {
    it('should submit form on Enter key', async () => {
      mockUseAction.mockResolvedValue({ success: true })
      renderWithRouter(<ForgotPassword />)
      const user = userEvent.setup()

      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com{Enter}')

      await waitFor(() => {
        expect(mockUseAction).toHaveBeenCalledWith({ email: 'test@example.com' })
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper label for email input', () => {
      renderWithRouter(<ForgotPassword />)
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('id', 'email')
    })

    it('should have required attribute on email input', () => {
      renderWithRouter(<ForgotPassword />)
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toBeRequired()
    })

    it('should have button with descriptive text', () => {
      renderWithRouter(<ForgotPassword />)
      const submitButton = screen.getByRole('button', { name: /send reset link/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })
})
