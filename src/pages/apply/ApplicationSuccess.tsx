import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  Storefront,
  Handshake,
  Clock,
  EnvelopeSimple,
  ArrowRight,
} from '@phosphor-icons/react'

export function ApplicationSuccess() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') as 'vendor' | 'sponsor' | null

  const isVendor = type === 'vendor'
  const Icon = isVendor ? Storefront : Handshake
  const colorClass = isVendor ? 'text-orange-500' : 'text-purple-500'
  const bgColorClass = isVendor ? 'bg-orange-500/10' : 'bg-purple-500/10'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="font-mono text-lg font-bold">
              <span className="text-foreground">open</span>
              <span className="text-primary">-</span>
              <span className="text-foreground">event</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* Success Icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className={cn('w-20 h-20 rounded-full', bgColorClass)} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Icon size={40} weight="duotone" className={colorClass} />
                <CheckCircle
                  size={20}
                  weight="fill"
                  className="absolute -bottom-1 -right-1 text-green-500"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-3">Application Submitted!</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
            Thank you for your interest in becoming a{' '}
            {isVendor ? 'vendor partner' : 'sponsor partner'}. We&apos;ve received your application.
          </p>

          {/* What's Next Card */}
          <div className="bg-card rounded-xl border border-border p-6 max-w-lg mx-auto text-left mb-8">
            <h2 className="font-semibold mb-4">What happens next?</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock size={16} weight="duotone" className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Review Period</p>
                  <p className="text-sm text-muted-foreground">
                    Our team will review your application within 2-3 business days.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <EnvelopeSimple size={16} weight="duotone" className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Email Notification</p>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ll receive an email once your application has been reviewed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    bgColorClass
                  )}
                >
                  <Icon size={16} weight="duotone" className={colorClass} />
                </div>
                <div>
                  <p className="font-medium text-sm">Get Started</p>
                  <p className="text-sm text-muted-foreground">
                    {isVendor
                      ? 'Once approved, you can browse events and submit proposals.'
                      : 'Once approved, you can explore sponsorship opportunities.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/events"
              className={cn(
                'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              Browse Events
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link
              to="/"
              className={cn(
                'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg',
                'border border-border text-sm font-medium',
                'hover:bg-muted transition-colors'
              )}
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@open-event.com" className="text-primary hover:underline">
              support@open-event.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
