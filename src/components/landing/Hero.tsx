import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { DemoModal } from '@/components/demo'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Play,
  Calendar,
  Storefront,
  Handshake,
  Sparkle,
  CheckCircle,
  List,
  X,
  SignIn,
} from '@phosphor-icons/react'

export function Hero() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleGetStarted = () => {
    setMobileMenuOpen(false)
    navigate('/sign-up')
  }

  return (
    <section className="relative min-h-[100dvh] flex flex-col overflow-hidden">
      {/* Subtle, balanced gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-background to-background dark:from-slate-950/50 dark:via-background" />
        <div className="absolute top-0 right-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-gradient-to-bl from-indigo-100/40 to-transparent dark:from-indigo-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-gradient-to-tr from-amber-100/30 to-transparent dark:from-amber-900/10 rounded-full blur-3xl" />
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300 sm:hidden',
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-[280px] bg-background border-l border-border z-50 transform transition-transform duration-300 ease-out sm:hidden safe-area-top safe-area-bottom',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        )}
      >
        <div className="flex flex-col h-full p-6">
          {/* Close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="self-end p-2 -mr-2 -mt-2 touch-target rounded-lg hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X size={24} weight="bold" />
          </button>

          {/* Menu items */}
          <nav className="flex flex-col gap-2 mt-8">
            <Link
              to="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-xl transition-colors touch-target"
            >
              Docs
            </Link>
            <Link
              to="/contributors"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-xl transition-colors touch-target"
            >
              Contributors
            </Link>
            <Link
              to="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-xl transition-colors touch-target"
            >
              <SignIn size={20} weight="bold" />
              Login
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setDemoOpen(true)
              }}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium text-foreground hover:bg-muted rounded-xl transition-colors touch-target"
            >
              <Play size={20} weight="fill" />
              Watch demo
            </button>
          </nav>

          {/* CTA at bottom */}
          <div className="mt-auto">
            <button
              onClick={handleGetStarted}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 text-base font-medium bg-foreground text-background hover:bg-foreground/90 transition-all rounded-xl touch-target"
            >
              Get Started Free
              <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation - Clean, minimal, pixel-perfect */}
      <nav className="relative z-20">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-12 h-16 sm:h-[72px] max-w-7xl mx-auto w-full">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop nav */}
            <Link
              to="/docs"
              className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              Docs
            </Link>
            <Link
              to="/contributors"
              className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
            >
              Contributors
            </Link>
            <ThemeToggle />
            <Link
              to="/sign-in"
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-foreground/5 hover:bg-foreground/10 border border-border/60 hover:border-border transition-all rounded-lg"
            >
              <SignIn size={16} weight="bold" />
              Login
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="sm:hidden p-2 touch-target rounded-lg hover:bg-muted transition-colors"
              aria-label="Open menu"
            >
              <List size={24} weight="bold" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 relative z-10 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          {/* Badge - Subtle, professional */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
            <Sparkle size={14} weight="fill" className="text-indigo-500 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              AI-Powered Event Management
            </span>
          </div>

          {/* Main Headline - Responsive typography */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight leading-[1.1]">
            Event management,
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-slate-800 via-slate-600 to-slate-800 dark:from-slate-200 dark:via-slate-400 dark:to-slate-200 bg-clip-text text-transparent">
                reimagined.
              </span>
              <svg
                className="absolute -bottom-1 sm:-bottom-2 left-0 w-full"
                height="8"
                viewBox="0 0 200 10"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 8 Q50 0 100 8 T200 8"
                  stroke="url(#hero-underline)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="hero-underline" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
            Plan events with AI. Connect vendors and sponsors. All in one beautiful, open-source
            platform.
          </p>

          {/* CTA Buttons - Full width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4 px-2 sm:px-0">
            <button
              onClick={handleGetStarted}
              className="group flex items-center justify-center gap-2 px-6 sm:px-8 py-4 text-base font-medium bg-foreground text-background hover:bg-foreground/90 transition-all rounded-xl shadow-lg hover:shadow-xl sm:hover:-translate-y-0.5 touch-manipulation touch-active"
            >
              Get Started Free
              <ArrowRight
                size={18}
                weight="bold"
                className="transition-transform group-hover:translate-x-1"
              />
            </button>

            <button
              onClick={() => setDemoOpen(true)}
              className="group flex items-center justify-center gap-3 px-6 py-4 text-base font-medium text-foreground hover:bg-muted/50 transition-all rounded-xl border border-border/50 hover:border-border touch-manipulation touch-active"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700/70 transition-colors">
                <Play
                  size={14}
                  weight="fill"
                  className="text-slate-700 dark:text-slate-300 ml-0.5"
                />
              </div>
              Watch demo
            </button>
          </div>

          {/* Trust indicators - Wrap on mobile */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 pt-2 sm:pt-4 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle size={14} weight="fill" className="text-emerald-500 sm:w-4 sm:h-4" />
              Free forever
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle size={14} weight="fill" className="text-emerald-500 sm:w-4 sm:h-4" />
              No credit card
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle size={14} weight="fill" className="text-emerald-500 sm:w-4 sm:h-4" />
              Open source
            </span>
          </div>
        </div>
      </div>

      {/* Product Preview - Simplified on mobile */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-12 pb-12 sm:pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Browser mockup with glass effect */}
          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-border/50 bg-card/80 backdrop-blur-sm">
            {/* Browser chrome - Hidden on mobile for cleaner look */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1.5 rounded-lg bg-background/80 border border-border/50 text-xs text-muted-foreground font-mono flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  openevent.my/dashboard
                </div>
              </div>
            </div>

            {/* Mobile indicator bar */}
            <div className="sm:hidden flex items-center justify-center py-2 bg-muted/30 border-b border-border/50">
              <div className="w-24 h-1 rounded-full bg-border" />
            </div>

            {/* Dashboard preview - Beautiful visual */}
            <div className="p-4 sm:p-6 md:p-8 bg-background min-h-[280px] sm:min-h-[320px] md:min-h-[420px]">
              {/* Mock header with workspace name */}
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                  <div className="text-lg sm:text-xl font-semibold text-foreground">
                    My workspace
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    Manage your events
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-md bg-background shadow-sm">
                      <div className="w-4 h-0.5 bg-foreground" />
                      <div className="w-4 h-0.5 bg-foreground mt-1" />
                    </div>
                    <div className="p-2 rounded-md text-muted-foreground">
                      <div className="w-4 h-4 border border-current rounded-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock stats row - 2 cols on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
                {[
                  { label: 'Events', value: '12', icon: Calendar, color: 'violet' },
                  { label: 'Vendors', value: '48', icon: Storefront, color: 'emerald' },
                  { label: 'Sponsors', value: '24', icon: Handshake, color: 'amber' },
                  { label: 'Active', value: '3', icon: Sparkle, color: 'blue' },
                ].map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.label}
                      className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border/50 bg-card/50"
                    >
                      <Icon
                        size={16}
                        weight="duotone"
                        className={cn(
                          'sm:w-[18px] sm:h-[18px]',
                          stat.color === 'violet' && 'text-violet-500',
                          stat.color === 'emerald' && 'text-emerald-500',
                          stat.color === 'amber' && 'text-amber-500',
                          stat.color === 'blue' && 'text-blue-500'
                        )}
                      />
                      <div className="text-xl sm:text-2xl font-semibold mt-1 sm:mt-2">
                        {stat.value}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Mock event cards - Simplified on mobile */}
              <div className="space-y-2 sm:space-y-3">
                {[
                  { title: 'Tech Conference 2025', status: 'active', color: 'emerald' },
                  { title: 'Product Launch Event', status: 'planning', color: 'blue' },
                  {
                    title: 'Annual Company Meetup',
                    status: 'draft',
                    color: 'zinc',
                    hideOnMobile: true,
                  },
                ].map((event, i) => (
                  <div
                    key={event.title}
                    className={cn(
                      'flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border/50 bg-card/30 hover:bg-card/50 transition-colors',
                      event.hideOnMobile && 'hidden sm:flex'
                    )}
                    style={{ opacity: 1 - i * 0.15 }}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        event.color === 'emerald' &&
                          'bg-gradient-to-br from-emerald-500 to-green-600',
                        event.color === 'blue' && 'bg-gradient-to-br from-blue-500 to-indigo-600',
                        event.color === 'zinc' && 'bg-gradient-to-br from-zinc-400 to-zinc-500'
                      )}
                    >
                      <Calendar
                        size={16}
                        weight="fill"
                        className="text-white sm:w-[18px] sm:h-[18px]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm sm:text-base truncate">
                        {event.title}
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        Dec 2025 · 500 attendees
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium capitalize flex-shrink-0',
                        event.color === 'emerald' &&
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                        event.color === 'blue' &&
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                        event.color === 'zinc' &&
                          'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      )}
                    >
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Demo Modal */}
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  )
}
