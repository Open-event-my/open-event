import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { WarningOctagon, House, ArrowClockwise, EnvelopeSimple } from '@phosphor-icons/react'

interface ServerErrorPageProps {
  /**
   * Optional error ID for support reference
   */
  errorId?: string
  /**
   * Optional custom message
   */
  message?: string
}

/**
 * 500 Internal Server Error Page
 *
 * Displayed when a server error occurs.
 * Provides recovery options and support contact.
 *
 * Requirements: 11.4 - Custom 404 and 500 error pages
 */
export function ServerErrorPage({ errorId, message }: ServerErrorPageProps) {
  const handleRefresh = () => {
    window.location.reload()
  }

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
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10">
            <WarningOctagon size={40} weight="duotone" className="text-destructive" />
          </div>

          {/* Error Code */}
          <h1 className="font-mono text-6xl font-bold text-foreground mb-2">500</h1>

          {/* Title */}
          <h2 className="text-xl font-semibold text-foreground mb-3">Something Went Wrong</h2>

          {/* Message */}
          <p className="text-muted-foreground mb-4">
            {message ||
              "We're experiencing technical difficulties. Our team has been notified and is working on a fix."}
          </p>

          {/* Recovery Suggestions */}
          <div className="text-sm text-muted-foreground mb-8 p-4 bg-muted/50 rounded-lg text-left">
            <p className="font-medium text-foreground mb-2">Here's what you can try:</p>
            <ul className="space-y-1">
              <li>• Refresh the page</li>
              <li>• Clear your browser cache</li>
              <li>• Try again in a few minutes</li>
              <li>• Contact support if the issue persists</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Button onClick={handleRefresh}>
              <ArrowClockwise size={16} weight="bold" />
              Refresh Page
            </Button>

            <Button variant="outline" asChild>
              <Link to="/">
                <House size={16} weight="bold" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Error ID */}
          {errorId && (
            <p className="text-xs text-muted-foreground mb-6">Error ID: {errorId}</p>
          )}

          {/* Support Contact */}
          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">Need help?</p>
            <a
              href="mailto:support@openevent.my"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <EnvelopeSimple size={16} />
              Contact Support
            </a>
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
