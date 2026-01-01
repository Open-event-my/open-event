import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock Sentry
vi.mock('@/lib/sentry', () => ({
  setUser: vi.fn(),
}))

// Global fetch mock
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: auth check returns no user
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Not authenticated' }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper component to access auth context
  function TestConsumer() {
    const auth = useAuth()
    return (
      <div>
        <span data-testid="loading">{auth.isLoading.toString()}</span>
        <span data-testid="authenticated">{auth.isAuthenticated.toString()}</span>
        <span data-testid="user">{auth.user?.email || 'none'}</span>
        <span data-testid="token">{auth.accessToken || 'none'}</span>
      </div>
    )
  }

  // Helper for tests that need auth context reference
  function AuthConsumerWithRef({
    authRef,
  }: {
    authRef: { current: ReturnType<typeof useAuth> | null }
  }) {
    const auth = useAuth()
    useEffect(() => {
      authRef.current = auth
    }, [authRef, auth])
    return (
      <div>
        <span data-testid="loading">{auth.isLoading.toString()}</span>
        <span data-testid="authenticated">{auth.isAuthenticated.toString()}</span>
        <span data-testid="user">{auth.user?.email || 'none'}</span>
        <span data-testid="token">{auth.accessToken || 'none'}</span>
      </div>
    )
  }

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<TestConsumer />)
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('initial auth check (checkAuth)', () => {
    it('should start with loading true', async () => {
      // Make fetch hang to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Initial render should show loading
      expect(screen.getByTestId('loading').textContent).toBe('true')
    })

    it('should set user when auth check succeeds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com', role: 'organizer' },
          accessToken: 'access-token-123',
        }),
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('true')
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
      expect(screen.getByTestId('token').textContent).toBe('access-token-123')
    })

    it('should set user to null when auth check fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Not authenticated' }),
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(screen.getByTestId('user').textContent).toBe('none')
    })

    it('should handle network errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(screen.getByTestId('user').textContent).toBe('none')
      consoleSpy.mockRestore()
    })

    it('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      )
    })
  })

  describe('signIn', () => {
    it('should set user and token on successful sign in', async () => {
      // Initial auth check fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      // Mock successful login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'new-token',
        }),
      })

      await act(async () => {
        await authRef.current!.signIn('test@example.com', 'password123')
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('true')
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
      expect(screen.getByTestId('token').textContent).toBe('new-token')
    })

    it('should throw error on failed sign in', async () => {
      // Initial auth check fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      // Mock failed login
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
      })

      await expect(
        act(async () => {
          await authRef.current!.signIn('test@example.com', 'wrong-password')
        })
      ).rejects.toThrow('Invalid credentials')

      expect(screen.getByTestId('authenticated').textContent).toBe('false')
    })

    it('should call login endpoint with correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { _id: 'user123' } }),
      })

      await act(async () => {
        await authRef.current!.signIn('test@example.com', 'password123')
      })

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      )
    })
  })

  describe('signUp', () => {
    it('should set user and token on successful sign up', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'new@example.com', name: 'New User' },
          accessToken: 'signup-token',
        }),
      })

      await act(async () => {
        await authRef.current!.signUp('new@example.com', 'password123', 'New User')
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('true')
      expect(screen.getByTestId('user').textContent).toBe('new@example.com')
    })

    it('should throw error on failed sign up', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
      })

      await expect(
        act(async () => {
          await authRef.current!.signUp('existing@example.com', 'password123')
        })
      ).rejects.toThrow('Email already exists')
    })

    it('should call signup endpoint with correct payload including name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false')
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { _id: 'user123' } }),
      })

      await act(async () => {
        await authRef.current!.signUp('test@example.com', 'password123', 'Test User')
      })

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/auth/signup'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
          }),
        })
      )
    })
  })

  describe('signOut', () => {
    it('should clear user and token on sign out', async () => {
      // Start authenticated
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'token',
        }),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true')
      })

      // Mock logout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      await act(async () => {
        await authRef.current!.signOut()
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      expect(screen.getByTestId('user').textContent).toBe('none')
      expect(screen.getByTestId('token').textContent).toBe('none')
    })

    it('should clear state even if logout API fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'token',
        }),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true')
      })

      // Mock logout failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        await authRef.current!.signOut()
      })

      // User should still be cleared locally
      expect(screen.getByTestId('authenticated').textContent).toBe('false')
      consoleSpy.mockRestore()
    })
  })

  describe('refreshAuth', () => {
    it('should update user and token on successful refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'old-token',
        }),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true')
      })

      // Mock refresh
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'new-token',
        }),
      })

      await act(async () => {
        await authRef.current!.refreshAuth()
      })

      expect(screen.getByTestId('token').textContent).toBe('new-token')
    })

    it('should clear user on refresh failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'token',
        }),
      })

      const authRef: { current: ReturnType<typeof useAuth> | null } = { current: null }

      render(
        <AuthProvider>
          <AuthConsumerWithRef authRef={authRef} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('authenticated').textContent).toBe('true')
      })

      // Mock refresh failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Refresh token expired' }),
      })

      await act(async () => {
        await authRef.current!.refreshAuth()
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('false')
    })
  })

  describe('auto-refresh timer', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set up refresh timer when user is authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'token',
        }),
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Wait for initial auth check to complete
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(screen.getByTestId('authenticated').textContent).toBe('true')

      // Mock refresh call
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { _id: 'user123', email: 'test@example.com' },
          accessToken: 'refreshed-token',
        }),
      })

      // Advance timer by 14 minutes
      await act(async () => {
        await vi.advanceTimersByTimeAsync(14 * 60 * 1000)
      })

      // Should have called refresh endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
    })

    it('should not set up refresh timer when user is not authenticated', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )

      // Wait for initial auth check to complete
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      const initialCallCount = mockFetch.mock.calls.length

      // Advance timer by 14 minutes
      await act(async () => {
        await vi.advanceTimersByTimeAsync(14 * 60 * 1000)
      })

      // No additional calls should be made
      expect(mockFetch.mock.calls.length).toBe(initialCallCount)
    })
  })
})
