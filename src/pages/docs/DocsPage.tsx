import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  ArrowLeft,
  ArrowUpRight,
  GithubLogo,
  Rocket,
  Calendar,
  Handshake,
  Storefront,
  Sparkle,
  Plugs,
  CloudArrowUp,
  Code,
  GitPullRequest,
  MapTrifold,
  MagnifyingGlass,
  List,
  X,
  DeviceMobile,
} from '@phosphor-icons/react'

const sections = [
  { id: 'getting-started', title: 'Getting Started', icon: Rocket },
  { id: 'for-organizers', title: 'For Organizers', icon: Calendar },
  { id: 'for-sponsors', title: 'For Sponsors', icon: Handshake },
  { id: 'for-vendors', title: 'For Vendors', icon: Storefront },
  { id: 'ai-features', title: 'AI Features', icon: Sparkle },
  { id: 'integrations', title: 'Integrations', icon: Plugs },
  { id: 'install-app', title: 'Install App', icon: DeviceMobile },
  { id: 'self-hosting', title: 'Self-Hosting', icon: CloudArrowUp },
  { id: 'api-reference', title: 'API Reference', icon: Code },
  { id: 'contributing', title: 'Contributing', icon: GitPullRequest },
  { id: 'roadmap', title: 'Roadmap', icon: MapTrifold },
]

export function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -70% 0px' }
    )

    sections.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setMobileNavOpen(false)
    }
  }

  const filteredSections = sections.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo />
            </Link>
            <span className="hidden sm:block text-muted-foreground/30">|</span>
            <span className="hidden sm:block text-sm text-muted-foreground">Documentation</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile nav toggle */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {mobileNavOpen ? <X size={20} /> : <List size={20} />}
            </button>
            <a
              href="https://github.com/hazlijohar95/open-event"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <GithubLogo size={16} weight="fill" />
              GitHub
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[57px] left-0 z-40
            w-64 h-[calc(100vh-57px)]
            bg-background lg:bg-transparent
            border-r border-border/40 lg:border-0
            transform transition-transform duration-200 lg:transform-none
            ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto
          `}
        >
          <nav className="p-4 lg:py-8 lg:pr-6 lg:pl-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft size={14} />
              Back
            </Link>

            {/* Search */}
            <div className="relative mb-6">
              <MagnifyingGlass
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-border/40 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-700 transition-all"
              />
            </div>

            {/* Nav items */}
            <div className="space-y-1">
              {filteredSections.map(({ id, title, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all text-left
                    ${
                      activeSection === id
                        ? 'bg-muted text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  <Icon size={16} weight={activeSection === id ? 'duotone' : 'regular'} />
                  {title}
                </button>
              ))}
            </div>

            {/* Quick links */}
            <div className="mt-8 pt-6 border-t border-border/40">
              <p className="text-xs font-medium text-muted-foreground mb-3">Quick links</p>
              <div className="space-y-1">
                <Link
                  to="/opensource"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                >
                  Open Source
                  <ArrowUpRight size={12} />
                </Link>
                <a
                  href="https://github.com/hazlijohar95/open-event/issues/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                >
                  Report Issue
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          </nav>
        </aside>

        {/* Mobile overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Hero */}
          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
              Documentation
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Everything you need to know about running events with Open Event.
            </p>
          </div>

          {/* Quick start cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
            <button
              onClick={() => scrollToSection('getting-started')}
              className="group p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/20 transition-all text-left"
            >
              <Rocket size={20} className="text-indigo-500 mb-2" weight="duotone" />
              <p className="text-sm font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Quick Start
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Get up and running in 5 min</p>
            </button>
            <button
              onClick={() => scrollToSection('ai-features')}
              className="group p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/20 transition-all text-left"
            >
              <Sparkle size={20} className="text-violet-500 mb-2" weight="duotone" />
              <p className="text-sm font-medium group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                AI Features
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Smart automation tools</p>
            </button>
            <button
              onClick={() => scrollToSection('api-reference')}
              className="group p-4 rounded-xl border border-border/40 hover:border-border hover:bg-muted/20 transition-all text-left"
            >
              <Code size={20} className="text-emerald-500 mb-2" weight="duotone" />
              <p className="text-sm font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                API Reference
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Build integrations</p>
            </button>
          </div>

          {/* Sections */}
          <div className="space-y-16">
            {/* Section 1: Getting Started */}
            <section id="getting-started" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Rocket
                    size={16}
                    className="text-indigo-600 dark:text-indigo-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">Getting Started</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: 'Sign up for free',
                    desc: 'No credit card required. Unlimited events forever.',
                  },
                  {
                    title: 'Choose your role',
                    desc: 'Organizer, sponsor, or vendor — each has a tailored dashboard.',
                  },
                  {
                    title: 'Create your first event',
                    desc: 'AI assistant helps you set up in minutes.',
                  },
                  { title: 'Invite your team', desc: 'Collaborate with unlimited team members.' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-lg border border-border/40 hover:border-border transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2: For Organizers */}
            <section id="for-organizers" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Calendar
                    size={16}
                    className="text-blue-600 dark:text-blue-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">For Organizers</h2>
              </div>
              <div className="space-y-2">
                {[
                  {
                    title: 'Centralized dashboard',
                    desc: 'Manage all events, sponsors, and vendors from one place.',
                  },
                  {
                    title: 'AI-powered matching',
                    desc: 'Get recommendations for sponsors and vendors that fit your audience.',
                  },
                  {
                    title: 'Automated communications',
                    desc: 'Send updates, contracts, and reminders automatically.',
                  },
                  {
                    title: 'Real-time analytics',
                    desc: 'Track RSVPs, engagement, and sponsor ROI as it happens.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: For Sponsors */}
            <section id="for-sponsors" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Handshake
                    size={16}
                    className="text-amber-600 dark:text-amber-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">For Sponsors</h2>
              </div>
              <div className="space-y-2">
                {[
                  {
                    title: 'Discover events',
                    desc: 'Browse a marketplace of events looking for sponsors.',
                  },
                  {
                    title: 'Audience match scoring',
                    desc: 'See how well an event aligns with your target market.',
                  },
                  {
                    title: 'Track ROI',
                    desc: 'Get detailed analytics on booth visits and lead captures.',
                  },
                  {
                    title: 'Manage packages',
                    desc: 'Compare sponsorship tiers, benefits, and pricing.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 4: For Vendors */}
            <section id="for-vendors" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Storefront
                    size={16}
                    className="text-emerald-600 dark:text-emerald-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">For Vendors</h2>
              </div>
              <div className="space-y-2">
                {[
                  {
                    title: 'Inbound opportunities',
                    desc: 'Get discovered by organizers looking for your services.',
                  },
                  {
                    title: 'Build your reputation',
                    desc: 'Collect reviews and ratings from past events.',
                  },
                  {
                    title: 'Transparent pricing',
                    desc: 'Set your rates clearly. No bidding wars.',
                  },
                  {
                    title: 'Secure payments',
                    desc: 'Contracts and payments handled with protection.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 5: AI Features */}
            <section id="ai-features" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Sparkle
                    size={16}
                    className="text-violet-600 dark:text-violet-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">AI Features</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {[
                  {
                    title: 'Smart event setup',
                    desc: 'Describe your event and let AI generate timelines and checklists.',
                  },
                  {
                    title: 'Sponsor matching',
                    desc: 'AI analyzes your audience and suggests best-fit sponsors.',
                  },
                  {
                    title: 'Vendor recommendations',
                    desc: 'Suggestions based on budget, event type, and performance.',
                  },
                  {
                    title: 'Automated reports',
                    desc: 'AI generates post-event summaries and ROI insights.',
                  },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-lg border border-border/40">
                    <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> AI features use OpenAI and
                  Anthropic. Your data is never used to train models.{' '}
                  <Link
                    to="/privacy"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Privacy policy
                  </Link>
                </p>
              </div>
            </section>

            {/* Section 6: Integrations */}
            <section id="integrations" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Plugs size={16} className="text-pink-600 dark:text-pink-400" weight="duotone" />
                </div>
                <h2 className="text-lg font-semibold">Integrations</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  'Google Calendar',
                  'Slack',
                  'Discord',
                  'Stripe',
                  'Outlook',
                  'iCal',
                  'Webhooks',
                  'API',
                ].map((name) => (
                  <div key={name} className="p-3 rounded-lg border border-border/40 text-center">
                    <p className="text-sm text-foreground">{name}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-amber-700 dark:text-amber-400">Coming soon:</strong>{' '}
                  Zapier, Make, and n8n integrations.
                </p>
              </div>
            </section>

            {/* Section 7: Install App (PWA) */}
            <section id="install-app" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <DeviceMobile
                    size={16}
                    className="text-emerald-600 dark:text-emerald-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">Install App</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Open Event is a Progressive Web App (PWA). Install it on your device for a native
                app experience with offline support.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[
                  {
                    title: 'Desktop',
                    desc: 'Click the install icon in Chrome/Edge address bar, or use the install banner.',
                  },
                  {
                    title: 'Android',
                    desc: 'Tap the install banner or use Chrome menu → "Add to Home Screen".',
                  },
                  { title: 'iOS', desc: 'In Safari, tap Share → "Add to Home Screen".' },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-lg border border-border/40">
                    <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {['Works offline', 'Auto-updates', 'Native feel', 'Fast loading'].map((feature) => (
                  <div
                    key={feature}
                    className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-center"
                  >
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">{feature}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> You can also install from
                  Dashboard → Settings → App section.
                </p>
              </div>
            </section>

            {/* Section 8: Self-Hosting */}
            <section id="self-hosting" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <CloudArrowUp
                    size={16}
                    className="text-cyan-600 dark:text-cyan-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">Self-Hosting</h2>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  {
                    title: 'Open source',
                    desc: 'MIT licensed. Fork it, modify it, make it yours.',
                  },
                  {
                    title: 'Docker deployment',
                    desc: 'Spin up your own instance with docker-compose.',
                  },
                  { title: 'Convex backend', desc: 'Real-time sync database out of the box.' },
                  {
                    title: 'Environment variables',
                    desc: 'Configure AI providers and auth via env vars.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a
                href="https://github.com/hazlijohar95/open-event"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <GithubLogo size={16} weight="fill" />
                View on GitHub
                <ArrowUpRight size={12} />
              </a>
            </section>

            {/* Section 8: API Reference */}
            <section id="api-reference" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Code size={16} className="text-slate-600 dark:text-slate-400" weight="duotone" />
                </div>
                <h2 className="text-lg font-semibold">API Reference</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Build integrations, automate workflows, and connect Open Event with your tools using
                our RESTful API.
              </p>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  {
                    title: 'RESTful endpoints',
                    desc: 'Standard REST API for all CRUD operations.',
                  },
                  {
                    title: 'API key authentication',
                    desc: 'Secure, scoped access with permission-based keys.',
                  },
                  { title: 'Rate limiting', desc: '1,000 requests/hour per key for stability.' },
                  { title: 'Webhooks support', desc: 'Real-time notifications for event changes.' },
                ].map((item) => (
                  <div key={item.title} className="p-4 rounded-lg border border-border/40">
                    <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Quick Start */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border/40 mb-6">
                <p className="text-sm font-medium text-foreground mb-3">Quick Start</p>
                <div className="space-y-2 text-xs font-mono text-muted-foreground bg-background/50 p-3 rounded border border-border/40 overflow-x-auto">
                  <div>
                    <span className="text-muted-foreground/70">
                      # Get your API key from Settings → API Keys
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70">curl</span>{' '}
                    <span className="text-blue-500">-H</span>{' '}
                    <span className="text-green-500">"X-API-Key: oe_live_your_key"</span>{' '}
                    <span className="text-purple-500">
                      https://your-project.convex.site/api/v1/events
                    </span>
                  </div>
                </div>
              </div>

              {/* Endpoints Overview */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground mb-3">Available Endpoints</p>
                <div className="space-y-2">
                  {[
                    { method: 'GET', path: '/api/v1/events', desc: 'List your events' },
                    { method: 'POST', path: '/api/v1/events', desc: 'Create a new event' },
                    { method: 'GET', path: '/api/v1/events/:id', desc: 'Get event details' },
                    { method: 'PATCH', path: '/api/v1/events/:id', desc: 'Update an event' },
                    { method: 'DELETE', path: '/api/v1/events/:id', desc: 'Delete an event' },
                    {
                      method: 'GET',
                      path: '/api/v1/public/events',
                      desc: 'List public events (no auth)',
                    },
                    { method: 'GET', path: '/api/v1/vendors', desc: 'Browse vendor directory' },
                    { method: 'GET', path: '/api/v1/sponsors', desc: 'Browse sponsor directory' },
                    { method: 'GET', path: '/api/v1/webhooks', desc: 'Manage webhooks' },
                  ].map((endpoint) => (
                    <div
                      key={`${endpoint.method}-${endpoint.path}`}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border border-border/40"
                    >
                      <span
                        className={`
                          px-2 py-0.5 text-xs font-semibold rounded shrink-0
                          ${
                            endpoint.method === 'GET'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : endpoint.method === 'POST'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : endpoint.method === 'PATCH'
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }
                        `}
                      >
                        {endpoint.method}
                      </span>
                      <div className="flex-1 min-w-0">
                        <code className="text-xs font-mono text-foreground break-all">
                          {endpoint.path}
                        </code>
                        <p className="text-xs text-muted-foreground mt-0.5">{endpoint.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Authentication */}
              <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 mb-6">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Authentication
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                  All protected endpoints require an API key. Include it in the{' '}
                  <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                    X-API-Key
                  </code>{' '}
                  header or{' '}
                  <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                    Authorization: Bearer
                  </code>{' '}
                  header.
                </p>
                <div className="text-xs font-mono text-blue-900 dark:text-blue-100 bg-blue-100/50 dark:bg-blue-900/20 p-2 rounded border border-blue-200/50 dark:border-blue-800/30">
                  <div>X-API-Key: oe_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx</div>
                </div>
              </div>

              {/* Documentation Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://github.com/hazlijohar95/open-event/blob/main/docs/API.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/20 transition-all group"
                >
                  <Code size={20} className="text-slate-600 dark:text-slate-400" weight="duotone" />
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Full API Documentation
                    </p>
                    <p className="text-xs text-muted-foreground">Complete endpoint reference</p>
                  </div>
                  <ArrowUpRight size={14} className="ml-auto text-muted-foreground" />
                </a>
                <a
                  href="https://github.com/hazlijohar95/open-event/blob/main/docs/API_TESTING_GUIDE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/20 transition-all group"
                >
                  <Rocket
                    size={20}
                    className="text-indigo-600 dark:text-indigo-400"
                    weight="duotone"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Testing Guide
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Step-by-step testing instructions
                    </p>
                  </div>
                  <ArrowUpRight size={14} className="ml-auto text-muted-foreground" />
                </a>
              </div>

              {/* Note */}
              <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border/40">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Base URL:</strong> Your API base URL is your
                  Convex deployment URL +{' '}
                  <code className="px-1 py-0.5 bg-background/50 rounded text-xs">/api/v1</code>.
                  Find it in your{' '}
                  <code className="px-1 py-0.5 bg-background/50 rounded text-xs">.env</code> file or
                  Convex Dashboard.
                </p>
              </div>
            </section>

            {/* Section 9: Contributing */}
            <section id="contributing" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <GitPullRequest
                    size={16}
                    className="text-orange-600 dark:text-orange-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">Contributing</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { title: 'Report bugs', desc: 'Open an issue' },
                  { title: 'Suggest features', desc: 'Start a discussion' },
                  { title: 'Submit PRs', desc: 'Code contributions' },
                  { title: 'Improve docs', desc: 'Typos & examples' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-3 rounded-lg border border-border/40 hover:border-border transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 10: Roadmap */}
            <section id="roadmap" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <MapTrifold
                    size={16}
                    className="text-rose-600 dark:text-rose-400"
                    weight="duotone"
                  />
                </div>
                <h2 className="text-lg font-semibold">Roadmap</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border/40">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-muted-foreground">Now</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Core event management</li>
                    <li>Sponsor & vendor marketplace</li>
                    <li>AI-powered assistant</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border border-border/40">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">Next</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Mobile app (iOS & Android)</li>
                    <li>Advanced analytics</li>
                    <li>Ticketing integration</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border border-border/40">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                    <span className="text-xs font-medium text-muted-foreground">Later</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground/70">
                    <li>White-label solution</li>
                    <li>Enterprise SSO</li>
                    <li>Multi-language support</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* CTA */}
          <div className="mt-16 p-6 rounded-xl border border-border/40 bg-muted/20 text-center">
            <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your free account and start managing events today.
            </p>
            <Link
              to="/sign-up"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-all rounded-lg"
            >
              Get Started Free
              <ArrowUpRight size={14} weight="bold" />
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
