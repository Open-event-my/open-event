import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { OptimizedImage } from '@/components/ui/optimized-image'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  footerText: string
  footerLinkText: string
  footerLinkTo: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Image Background (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background Image */}
        <OptimizedImage
          src="/auth-bg.jpg"
          webpSrc="/auth-bg.webp"
          alt=""
          priority
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60" />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link
            to="/"
            className="font-mono text-2xl font-bold text-white hover:opacity-80 transition-opacity"
          >
            open-event
          </Link>

          {/* Tagline */}
          <div className="max-w-md">
            <h2 className="font-mono text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Manage events with the right partners.
            </h2>
            <p className="text-white/70 text-lg">
              Connect with sponsors, vendors, and volunteers. Powered by AI for seamless event
              operations.
            </p>
          </div>

          {/* Bottom decoration */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 backdrop-blur-sm"
                />
              ))}
            </div>
            <p className="text-white/60 text-sm">Early adopters welcome</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col bg-background relative">
        {/* Mobile Background Image */}
        <div className="lg:hidden absolute inset-0 -z-10">
          <OptimizedImage
            src="/auth-bg.jpg"
            webpSrc="/auth-bg.webp"
            alt=""
            lazy
            className="absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-10"
          />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 lg:px-12">
          <Link
            to="/"
            className="font-mono text-lg font-semibold hover:opacity-80 transition-opacity lg:opacity-0 lg:pointer-events-none"
          >
            open-event
          </Link>
          <ThemeToggle />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12">
          <div className="w-full max-w-md space-y-8">
            {/* Title Section */}
            <div className="space-y-2">
              <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>

            {/* Form Card */}
            <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 sm:p-8 shadow-xl">
              {children}
            </div>

            {/* Footer Link */}
            <p className="text-center text-sm text-muted-foreground">
              {footerText}{' '}
              <Link to={footerLinkTo} className="text-primary hover:underline font-medium">
                {footerLinkText}
              </Link>
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 lg:px-12 text-center lg:text-left">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-foreground">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
