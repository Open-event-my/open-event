import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { cn } from '@/lib/utils'
import {
  Handshake,
  Storefront,
  Calendar,
  ChartLineUp,
  Target,
  UsersThree,
  CurrencyDollar,
  Star,
  ShieldCheck,
  Sparkle,
  Certificate,
  ClipboardText,
  ArrowRight,
} from '@phosphor-icons/react'

const stakeholders = [
  {
    title: 'For Sponsors',
    subtitle: 'Measurable ROI, not just logo placement',
    icon: Handshake,
    iconBg: 'bg-amber-100 dark:bg-amber-950/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
    benefits: [
      { icon: ChartLineUp, text: 'Real engagement metrics and booth analytics' },
      { icon: Target, text: 'Audience match scoring before commitment' },
      { icon: UsersThree, text: 'Lead capture with attribution tracking' },
      { icon: ClipboardText, text: 'Auto-generated post-event ROI reports' },
      { icon: CurrencyDollar, text: 'Multi-event discount management' },
    ],
  },
  {
    title: 'For Vendors',
    subtitle: 'Inbound opportunities, not cold outreach',
    icon: Storefront,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    benefits: [
      { icon: Calendar, text: 'Inbound opportunities in your category' },
      { icon: CurrencyDollar, text: 'Transparent pricing — no bidding wars' },
      { icon: Star, text: 'Reviews and ratings that build reputation' },
      { icon: UsersThree, text: 'Repeat client relationship management' },
      { icon: ShieldCheck, text: 'Payment protection and contracts' },
    ],
  },
  {
    title: 'For Organizers',
    subtitle: 'One dashboard to rule them all',
    icon: Calendar,
    iconBg: 'bg-indigo-100 dark:bg-indigo-950/50',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    benefits: [
      { icon: Storefront, text: 'Pre-vetted sponsor & vendor marketplace' },
      { icon: Sparkle, text: 'AI-powered matching and recommendations' },
      { icon: Handshake, text: 'Centralized logistics dashboard' },
      { icon: Certificate, text: 'Automated certificates and reports' },
      { icon: ClipboardText, text: 'Zero spreadsheet chaos' },
    ],
  },
]

export function FeaturesByUser() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="relative py-16 sm:py-24 lg:py-32 px-4 sm:px-6 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div
          ref={ref}
          className={cn(
            'text-center mb-10 sm:mb-16 transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-muted border border-border/50 mb-4 sm:mb-6">
            <UsersThree size={14} className="sm:hidden text-muted-foreground" weight="duotone" />
            <UsersThree
              size={16}
              className="hidden sm:block text-muted-foreground"
              weight="duotone"
            />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              Built for everyone
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
            Everyone wins.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mt-3 sm:mt-4 max-w-2xl mx-auto px-2">
            Practical benefits for every stakeholder — not just features.
          </p>
        </div>

        {/* Stakeholder Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {stakeholders.map((stakeholder, index) => (
            <StakeholderCard
              key={stakeholder.title}
              title={stakeholder.title}
              subtitle={stakeholder.subtitle}
              icon={stakeholder.icon}
              iconBg={stakeholder.iconBg}
              iconColor={stakeholder.iconColor}
              benefits={stakeholder.benefits}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function StakeholderCard({
  title,
  subtitle,
  icon: HeaderIcon,
  iconBg,
  iconColor,
  benefits,
  index,
}: {
  title: string
  subtitle: string
  icon: typeof Handshake
  iconBg: string
  iconColor: string
  benefits: { icon: typeof Handshake; text: string }[]
  index: number
}) {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <div
      ref={ref}
      className={cn(
        'group relative p-5 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border/40',
        'transition-all duration-500',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Clean header with soft icon */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}
        >
          <HeaderIcon size={20} className={iconColor} weight="duotone" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Clean benefits list */}
      <ul className="space-y-2.5">
        {benefits.map((benefit, i) => {
          const IconComponent = benefit.icon
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <IconComponent
                size={16}
                className="shrink-0 mt-0.5 text-muted-foreground/60"
                weight="duotone"
              />
              <span className="leading-relaxed">{benefit.text}</span>
            </li>
          )
        })}
      </ul>

      {/* Subtle CTA */}
      <div className="mt-5 pt-4 border-t border-border/30">
        <button className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors group/btn">
          Learn more
          <ArrowRight
            size={14}
            weight="bold"
            className="transition-transform group-hover/btn:translate-x-0.5"
          />
        </button>
      </div>
    </div>
  )
}
