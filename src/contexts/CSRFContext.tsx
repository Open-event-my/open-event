/* eslint-disable react-refresh/only-export-components */
/**
 * CSRF Context Provider
 *
 * Provides CSRF token management across the application.
 * Wrap your app with this provider to enable CSRF protection.
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useCSRF } from '../hooks/useCSRF'

interface CSRFContextValue {
  csrfToken: string | null
  isLoading: boolean
  error: Error | null
  refreshToken: () => Promise<void>
}

const CSRFContext = createContext<CSRFContextValue | undefined>(undefined)

interface CSRFProviderProps {
  children: ReactNode
}

/**
 * CSRF Provider Component
 *
 * Wrap your application with this provider to enable CSRF protection:
 *
 * ```tsx
 * function App() {
 *   return (
 *     <ConvexProvider client={convex}>
 *       <CSRFProvider>
 *         <YourApp />
 *       </CSRFProvider>
 *     </ConvexProvider>
 *   );
 * }
 * ```
 */
export function CSRFProvider({ children }: CSRFProviderProps) {
  const csrf = useCSRF()

  return <CSRFContext.Provider value={csrf}>{children}</CSRFContext.Provider>
}

/**
 * Hook to access CSRF context
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { csrfToken, isLoading, refreshToken } = useCSRFContext();
 *
 *   const handleSubmit = async (data) => {
 *     if (!csrfToken) {
 *       console.error('CSRF token not available');
 *       return;
 *     }
 *
 *     await myMutation({
 *       csrfToken,
 *       ...data
 *     });
 *   };
 * }
 * ```
 */
export function useCSRFContext(): CSRFContextValue {
  const context = useContext(CSRFContext)

  if (context === undefined) {
    throw new Error('useCSRFContext must be used within a CSRFProvider')
  }

  return context
}

/**
 * Hook to get just the CSRF token (convenience wrapper)
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const csrfToken = useCSRFToken();
 *
 *   const handleSubmit = async (data) => {
 *     await myMutation({ csrfToken, ...data });
 *   };
 * }
 * ```
 */
export function useCSRFToken(): string | null {
  const { csrfToken } = useCSRFContext()
  return csrfToken
}

/**
 * Component to display CSRF loading state
 *
 * Usage:
 * ```tsx
 * function MyForm() {
 *   return (
 *     <CSRFGuard fallback={<LoadingSpinner />}>
 *       <FormContent />
 *     </CSRFGuard>
 *   );
 * }
 * ```
 */
interface CSRFGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function CSRFGuard({ children, fallback = null }: CSRFGuardProps) {
  const { csrfToken, isLoading, error } = useCSRFContext()

  if (isLoading) {
    return <>{fallback}</>
  }

  if (error) {
    return (
      <div className="text-red-500">
        Failed to initialize CSRF protection. Please refresh the page.
      </div>
    )
  }

  if (!csrfToken) {
    return (
      <div className="text-yellow-500">CSRF token not available. Some features may not work.</div>
    )
  }

  return <>{children}</>
}
