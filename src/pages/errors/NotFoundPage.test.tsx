import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { NotFoundPage } from './NotFoundPage'

// Mock Phosphor icons
vi.mock('@phosphor-icons/react', () => ({
  MagnifyingGlass: ({ className }: { className?: string }) => (
    <span data-testid="search-icon" className={className}>
      🔍
    </span>
  ),
  House: ({ className }: { className?: string }) => (
    <span data-testid="home-icon" className={className}>
      🏠
    </span>
  ),
  ArrowLeft: ({ className }: { className?: string }) => (
    <span data-testid="back-icon" className={className}>
      ←
    </span>
  ),
  Compass: ({ className }: { className?: string }) => (
    <span data-testid="compass-icon" className={className}>
      🧭
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

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the 404 error code', () => {
      renderWithRouter(<NotFoundPage />)
      expect(screen.getByText('404')).toBeInTheDocument()
    })

    it('should render the page title', () => {
      renderWithRouter(<NotFoundPage />)
      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    })

    it('should render a user-friendly message', () => {
      renderWithRouter(<NotFoundPage />)
      expect(
        screen.getByText(/The page you're looking for doesn't exist or has been moved/i)
      ).toBeInTheDocument()
    })

    it('should render the search icon', () => {
      renderWithRouter(<NotFoundPage />)
      expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    })

    it('should render the logo in header', () => {
      renderWithRouter(<NotFoundPage />)
      expect(screen.getByTestId('logo')).toBeInTheDocument()
    })

    it('should render the theme toggle', () => {
      renderWithRouter(<NotFoundPage />)
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
    })
  })

  describe('Navigation Actions', () => {
    it('should render Go Home button with link to home', () => {
      renderWithRouter(<NotFoundPage />)
      const homeLink = screen.getByRole('link', { name: /Go Home/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('should render Dashboard button with link to dashboard', () => {
      renderWithRouter(<NotFoundPage />)
      const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
      expect(dashboardLink).toBeInTheDocument()
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    })

    it('should render Go Back button', () => {
      renderWithRouter(<NotFoundPage />)
      expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument()
    })

    it('should call window.history.back when Go Back is clicked', () => {
      const mockBack = vi.fn()
      vi.spyOn(window.history, 'back').mockImplementation(mockBack)

      renderWithRouter(<NotFoundPage />)
      const backButton = screen.getByRole('button', { name: /Go Back/i })
      fireEvent.click(backButton)

      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('Helpful Links', () => {
    it('should render Browse Events link', () => {
      renderWithRouter(<NotFoundPage />)
      const eventsLink = screen.getByRole('link', { name: /Browse Events/i })
      expect(eventsLink).toBeInTheDocument()
      expect(eventsLink).toHaveAttribute('href', '/events')
    })

    it('should render Documentation link', () => {
      renderWithRouter(<NotFoundPage />)
      const docsLink = screen.getByRole('link', { name: /Documentation/i })
      expect(docsLink).toBeInTheDocument()
      expect(docsLink).toHaveAttribute('href', '/docs')
    })

    it('should render Become a Vendor link', () => {
      renderWithRouter(<NotFoundPage />)
      const vendorLink = screen.getByRole('link', { name: /Become a Vendor/i })
      expect(vendorLink).toBeInTheDocument()
      expect(vendorLink).toHaveAttribute('href', '/apply/vendor')
    })

    it('should render Become a Sponsor link', () => {
      renderWithRouter(<NotFoundPage />)
      const sponsorLink = screen.getByRole('link', { name: /Become a Sponsor/i })
      expect(sponsorLink).toBeInTheDocument()
      expect(sponsorLink).toHaveAttribute('href', '/apply/sponsor')
    })
  })

  describe('Footer', () => {
    it('should render copyright notice', () => {
      renderWithRouter(<NotFoundPage />)
      const currentYear = new Date().getFullYear()
      expect(screen.getByText(new RegExp(`${currentYear}`))).toBeInTheDocument()
      expect(screen.getByText(/openevent.my/i)).toBeInTheDocument()
    })
  })
})
