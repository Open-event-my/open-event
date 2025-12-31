/**
 * CSRF Token Management Hook
 * 
 * Provides CSRF token generation and management for the frontend.
 * 
 * NOTE: This is a stub implementation. The backend CSRF module (convex/lib/security/csrf.ts)
 * exists but is not yet integrated into the Convex API. To enable full CSRF protection:
 * 1. Ensure the csrfTokens table is defined in convex/schema.ts
 * 2. Run `npx convex dev` to regenerate the API
 * 3. Update this hook to use the actual API endpoint
 */

import { useEffect, useState, useCallback, type ComponentType } from 'react';

interface UseCSRFReturn {
  csrfToken: string | null;
  isLoading: boolean;
  error: Error | null;
  refreshToken: () => Promise<void>;
}

/**
 * Generate a client-side CSRF token (temporary implementation)
 */
function generateClientToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 32; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}

/**
 * Hook to manage CSRF tokens
 * 
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { csrfToken, isLoading, refreshToken } = useCSRF();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   const handleSubmit = async () => {
 *     await myMutation({ csrfToken, ...data });
 *   };
 * }
 * ```
 */
export function useCSRF(): UseCSRFReturn {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate client-side token (stub implementation)
      const token = generateClientToken();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      
      setCSRFToken(token);
      sessionStorage.setItem('csrf_token', token);
      sessionStorage.setItem('csrf_expires_at', expiresAt.toString());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate CSRF token'));
      console.error('Failed to generate CSRF token:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize token on mount
  useEffect(() => {
    const initToken = async () => {
      const storedToken = sessionStorage.getItem('csrf_token');
      const storedExpiry = sessionStorage.getItem('csrf_expires_at');
      
      if (storedToken && storedExpiry) {
        const expiresAt = parseInt(storedExpiry, 10);
        if (expiresAt > Date.now() + 5 * 60 * 1000) {
          setCSRFToken(storedToken);
          setIsLoading(false);
          return;
        }
      }
      
      await refreshToken();
    };

    initToken();
  }, [refreshToken]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!csrfToken) return;

    const storedExpiry = sessionStorage.getItem('csrf_expires_at');
    if (!storedExpiry) return;

    const expiresAt = parseInt(storedExpiry, 10);
    const timeUntilExpiry = expiresAt - Date.now();
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000;
    
    if (refreshTime > 0) {
      const timeoutId = setTimeout(() => {
        refreshToken();
      }, refreshTime);

      return () => clearTimeout(timeoutId);
    }
  }, [csrfToken, refreshToken]);

  return {
    csrfToken,
    isLoading,
    error,
    refreshToken,
  };
}

/**
 * Higher-order component to provide CSRF token to wrapped component
 */
export function withCSRF<P extends object>(
  Component: ComponentType<P & { csrfToken: string | null }>
): ComponentType<P> {
  return function WithCSRFComponent(props: P) {
    const { csrfToken } = useCSRF();
    return <Component {...props} csrfToken={csrfToken} />;
  };
}
