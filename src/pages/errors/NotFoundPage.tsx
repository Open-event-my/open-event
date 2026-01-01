import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, House, ArrowLeft, Compass } from '@phosphor-icons/react'

/**
 * 404 Not Found Page
 *
 * Displayed when a user navigates to a route that doesn't exist.
 * Provides helpful navigation options to get back to the app.
 *
 * Requirements: 11.4 - Custom 404 and 500 error pages
 */
export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-muted">
            <MagnifyingGlass size={40} weight="duotone" className="text-muted-foreground" />
          </div>

          {/* Error Code */}
          <h1 className="font-mono text-6xl font-bold text-foreground mb-2">404</h1>

          {/* Title */}
          <h2 className="text-xl font-semibold text-foreground mb-3">Page Not Found</h2>

          {/* Message */}
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved. Let's get you back on
            track.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Button asChild>
              <Link to="/">
                <House size={16} weight="bold" />
                Go Home
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/dashboard">
                <Compass size={16} weight="bold" />
                Dashboard
              </Link>
            </Button>

            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft size={16} weight="bold" />
              Go Back
            </Button>
          </div>

          {/* Helpful Links */}
          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Looking for something specific?</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <Link to="/events" className="text-primary hover:underline">
                Browse Events
              </Link>
              <Link to="/docs" className="text-primary hover:underline">
                Documentation
              </Link>
              <Link to="/apply/vendor" className="text-primary hover:underline">
                Become a Vendor
              </Link>
              <Link to="/apply/sponsor" className="text-primary hover:underline">
                Become a Sponsor
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="px-6 py-6 max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} openevent.my — All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
