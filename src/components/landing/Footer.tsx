import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { GithubLogo, ChatCircle, XLogo, EnvelopeSimple, ArrowRight } from '@phosphor-icons/react'

const socialLinks = [
  { icon: GithubLogo, label: 'GitHub', href: 'https://github.com/hazlijohar95/open-event' },
  { icon: XLogo, label: 'X', href: '#', inactive: true },
  { icon: ChatCircle, label: 'Discord', href: '#', inactive: true },
]

const productLinks = [
  { label: 'Pricing', href: '#', badge: "it's free lol" },
  { label: 'Documentation', href: '/docs' },
  { label: 'Contributors', href: '/contributors' },
  { label: 'API', href: '#', badge: 'soon™' },
]

const companyLinks = [
  { label: 'Browse Events', href: '/events' },
  { label: 'Become a Vendor', href: '/apply/vendor' },
  { label: 'Become a Sponsor', href: '/apply/sponsor' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative border-t border-border/50 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Newsletter Section - Typeform style */}
        <div className="mb-10 sm:mb-16 p-4 sm:p-8 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-50/80 to-amber-50/50 dark:from-indigo-950/25 dark:to-amber-950/15 border border-border/50">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
            <div className="max-w-md">
              <h4 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2">Stay in the loop</h4>
              <p className="text-sm sm:text-base text-muted-foreground">
                Get notified about new features, updates, and tips for running better events.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72">
                <EnvelopeSimple
                  size={16}
                  className="sm:hidden absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  weight="duotone"
                />
                <EnvelopeSimple
                  size={18}
                  className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  weight="duotone"
                />
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full h-11 sm:h-12 pl-9 sm:pl-11 pr-3 sm:pr-4 rounded-lg sm:rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-700 transition-all"
                />
              </div>
              <button className="h-11 sm:h-12 px-5 sm:px-6 rounded-lg sm:rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group cursor-pointer touch-manipulation active:scale-[0.98]">
                Subscribe
                <ArrowRight
                  size={14}
                  weight="bold"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-2">
            <Logo size="lg" className="mb-3 sm:mb-4" />
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mb-4 sm:mb-6 leading-relaxed">
              The open-source event operations platform. Connect with sponsors, manage vendors, and
              run seamless events.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map(({ icon: Icon, label, href, inactive }) =>
                inactive ? (
                  <div key={label} className="relative group">
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground/40 cursor-not-allowed"
                      aria-label={`${label} - coming soon`}
                    >
                      <Icon size={16} className="sm:hidden" weight="fill" />
                      <Icon size={18} className="hidden sm:block" weight="fill" />
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Working on it
                    </div>
                  </div>
                ) : (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all sm:hover:-translate-y-0.5 touch-manipulation active:scale-95"
                    aria-label={label}
                  >
                    <Icon size={16} className="sm:hidden" weight="fill" />
                    <Icon size={18} className="hidden sm:block" weight="fill" />
                  </a>
                )
              )}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-xs sm:text-sm mb-3 sm:mb-4">Product</h4>
            <ul className="space-y-2 sm:space-y-3">
              {productLinks.map(({ label, href, badge }) => (
                <li key={label}>
                  {href.startsWith('/') ? (
                    <Link
                      to={href}
                      className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 group py-0.5"
                    >
                      {label}
                      {badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium bg-muted rounded-full text-muted-foreground whitespace-nowrap">
                          {badge}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <a
                      href={href}
                      className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 group py-0.5"
                    >
                      {label}
                      {badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium bg-muted rounded-full text-muted-foreground whitespace-nowrap">
                          {badge}
                        </span>
                      )}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Get Started Links */}
          <div>
            <h4 className="font-semibold text-xs sm:text-sm mb-3 sm:mb-4">Get Started</h4>
            <ul className="space-y-2 sm:space-y-3">
              {companyLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    to={href}
                    className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-xs sm:text-sm mb-3 sm:mb-4">Legal</h4>
            <ul className="space-y-2 sm:space-y-3">
              {legalLinks.map(({ label, href }) => (
                <li key={label}>
                  {href.startsWith('/') ? (
                    <Link
                      to={href}
                      className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    >
                      {label}
                    </Link>
                  ) : (
                    <a
                      href={href}
                      className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    >
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 sm:mt-16 pt-6 sm:pt-8 border-t border-border/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              &copy; {currentYear} openevent.my — All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-start">
                Researched & designed by
                <a
                  href="https://github.com/hazlijohar95"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <OptimizedImage
                    src="https://github.com/hazlijohar95.png"
                    alt="Hazli"
                    lazy
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                  />
                  Hazli
                </a>
                <span className="text-border/50">·</span>
                Built by
                <a
                  href="https://github.com/azmir32"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <OptimizedImage
                    src="https://github.com/azmir32.png"
                    alt="Azmir"
                    lazy
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                  />
                  Azmir
                </a>
              </span>
              <span className="text-border/50 hidden sm:inline">·</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-muted/50 text-[10px] sm:text-xs font-medium">
                MIT License
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
