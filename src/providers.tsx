import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'

// Convex URL
const convexUrl = import.meta.env.VITE_CONVEX_URL

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export function Providers({ children }: { children: React.ReactNode }) {
  if (!convex) {
    return <>{children}</>
  }

  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>
}
