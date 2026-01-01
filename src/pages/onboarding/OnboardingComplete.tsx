import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CheckCircle, Confetti, ArrowRight, House } from '@phosphor-icons/react'

export function OnboardingComplete() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <Link
          to="/"
          className="font-mono text-lg font-semibold hover:opacity-80 transition-opacity"
        >
          open-event
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Success Icon */}
          <div className="relative inline-flex">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle size={56} weight="duotone" className="text-primary" />
            </div>
            <Confetti
              size={32}
              weight="duotone"
              className="absolute -top-2 -right-2 text-primary animate-bounce"
            />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">
              You're all set!
            </h1>
            <p className="text-lg text-muted-foreground">
              We've personalized your dashboard based on your preferences.
            </p>
          </div>

          {/* Features Preview */}
          <div className="bg-card border border-border rounded-xl p-6 text-left space-y-4">
            <h3 className="font-medium">What's next:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Explore your personalized dashboard
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Create your first event or browse opportunities
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Connect with sponsors, vendors, and organizers
                </span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <Button size="lg" className="w-full" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
            <ArrowRight size={18} weight="duotone" className="ml-2" />
          </Button>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <House size={16} weight="duotone" />
            Back to home
          </Link>
        </div>
      </main>

      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
