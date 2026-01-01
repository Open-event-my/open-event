import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

// Mock useAuth from custom AuthContext
const mockUseAuth = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock Phosphor icons
vi.mock('@phosphor-icons/react', () => ({
  CircleNotch: ({ className }: { className?: string }) => (
    <span data-testid="loading-spinner" className={className}>
      Loading...
    </span>
  ),
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderWithRouter = (_ui: React.ReactNode, initialRoute = '/protected') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<div data-testid="sign-in-page">Sign In Page</div>} />
          <Route
            path="/custom-login"
            element={<div data-testid="custom-login">Custom Login</div>}
          />
        </Routes>
      </MemoryRouter>
    )
  }

  it('should show loading spinner while authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    renderWithRouter(null)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    // There are multiple "Loading" texts, so use getAllByText
    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0)
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sign-in-page')).not.toBeInTheDocument()
  })

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { _id: 'user123', email: 'test@example.com', role: 'organizer' },
      accessToken: 'test-token',
      isLoading: false,
      isAuthenticated: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    renderWithRouter(null)

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })

  it('should redirect to /sign-in when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    renderWithRouter(null)

    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })

  it('should redirect to custom path when specified', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute redirectTo="/custom-login">
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/custom-login"
            element={<div data-testid="custom-login">Custom Login</div>}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('custom-login')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should handle transition from loading to authenticated', () => {
    // Start loading
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    const { rerender } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<div data-testid="sign-in-page">Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    // Finish loading, user is authenticated
    mockUseAuth.mockReturnValue({
      user: { _id: 'user123', email: 'test@example.com', role: 'organizer' },
      accessToken: 'test-token',
      isLoading: false,
      isAuthenticated: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    rerender(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<div data-testid="sign-in-page">Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
  })

  it('should handle transition from loading to unauthenticated', () => {
    // Start loading
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: true,
      isAuthenticated: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    const { rerender } = render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<div data-testid="sign-in-page">Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()

    // Finish loading, user is NOT authenticated
    mockUseAuth.mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    rerender(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<div data-testid="sign-in-page">Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument()
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should render complex children correctly', () => {
    mockUseAuth.mockReturnValue({
      user: { _id: 'user123', email: 'test@example.com', role: 'organizer' },
      accessToken: 'test-token',
      isLoading: false,
      isAuthenticated: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshAuth: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="parent">
                  <h1>Dashboard</h1>
                  <nav>
                    <ul>
                      <li>Home</li>
                      <li>Settings</li>
                    </ul>
                  </nav>
                  <main data-testid="main-content">Main Content</main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('parent')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
  })
})
