import { useState, useEffect } from 'react'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { cn } from '@/lib/utils'
import {
  Sparkle,
  TrendUp,
  CalendarCheck,
  FileText,
  Certificate,
  Robot,
  Lightning,
  ChatCircle,
  PaperPlaneTilt,
  type Icon,
} from '@phosphor-icons/react'

const capabilities = [
  {
    icon: Sparkle,
    title: 'Sponsor Intelligence',
    description: 'AI recommends sponsors based on your event type, audience, and budget.',
    example: 'Find fintech sponsors with $50k+ budgets for a 500-person tech conference',
    color: 'amber',
  },
  {
    icon: TrendUp,
    title: 'Vendor Comparison',
    description: 'Compare pricing, reviews, and availability across vendors in seconds.',
    example: 'Compare catering vendors for 300 pax under $15k in KL',
    color: 'blue',
  },
  {
    icon: CalendarCheck,
    title: 'Logistics Planner',
    description: 'Auto-generate task lists, dependencies, and realistic timelines.',
    example: 'Create a 3-day conference setup checklist with deadlines',
    color: 'violet',
  },
  {
    icon: FileText,
    title: 'Sponsor Reports',
    description: 'Generate post-event reports with real engagement metrics.',
    example: 'Generate ROI report for Gold sponsors with booth traffic',
    color: 'emerald',
  },
  {
    icon: Certificate,
    title: 'Certificate Engine',
    description: 'Issue beautiful certificates for volunteers, speakers, and attendees.',
    example: 'Generate volunteer certificates with hours logged',
    color: 'orange',
  },
]

export function AIAgent() {
  const { ref, isVisible } = useScrollAnimation()
  const [activeCard, setActiveCard] = useState(0)
  const [typingText, setTypingText] = useState('')
  const [showResponse, setShowResponse] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  // Rotate through cards
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % capabilities.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Typing animation for demo
  useEffect(() => {
    const query = capabilities[activeCard].example
    setTypingText('')
    setShowResponse(false)
    setIsTyping(true)

    let i = 0
    const typeInterval = setInterval(() => {
      if (i < query.length) {
        setTypingText(query.slice(0, i + 1))
        i++
      } else {
        clearInterval(typeInterval)
        setTimeout(() => {
          setIsTyping(false)
          setShowResponse(true)
        }, 500)
      }
    }, 30)

    return () => clearInterval(typeInterval)
  }, [activeCard])

  return (
    <section className="relative py-14 sm:py-20 lg:py-28 px-4 sm:px-6 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/30 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/10" />
        {/* Floating orbs - smaller on mobile */}
        <div className="absolute top-1/4 right-[10%] sm:right-[20%] w-48 sm:w-72 h-48 sm:h-72 bg-gradient-to-br from-emerald-300/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 left-[5%] sm:left-[10%] w-40 sm:w-64 h-40 sm:h-64 bg-gradient-to-br from-teal-300/15 to-transparent rounded-full blur-3xl"
          style={{ animation: 'pulse 4s ease-in-out infinite' }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div
          ref={ref}
          className={cn(
            'text-center mb-8 sm:mb-14 transition-all duration-700',
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          {/* Fun badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 mb-4 sm:mb-6">
            <Robot
              size={14}
              className="sm:hidden text-emerald-600 dark:text-emerald-400"
              weight="fill"
            />
            <Robot
              size={16}
              className="hidden sm:block text-emerald-600 dark:text-emerald-400"
              weight="fill"
            />
            <span className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Actually useful AI
            </span>
            <span className="text-xs sm:text-sm">🤖</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 sm:mb-4">
            AI that actually{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                helps
              </span>
              <Lightning
                size={18}
                className="sm:hidden absolute -top-1 -right-5 text-amber-400 animate-pulse"
                weight="fill"
              />
              <Lightning
                size={24}
                className="hidden sm:block absolute -top-2 -right-6 text-amber-400 animate-pulse"
                weight="fill"
              />
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
            Not just chatbot fluff. Real answers to real event problems.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-10 items-start">
          {/* Interactive Demo Panel */}
          <div className="order-2 lg:order-1">
            <div className="relative rounded-xl sm:rounded-2xl border border-border/50 bg-card overflow-hidden shadow-xl">
              {/* Terminal header */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-muted/50 border-b border-border/50">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-400/80" />
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-400/80" />
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[10px] sm:text-xs font-mono text-muted-foreground flex items-center justify-center gap-1 sm:gap-2">
                    <ChatCircle size={10} className="sm:hidden text-emerald-500" weight="fill" />
                    <ChatCircle
                      size={12}
                      className="hidden sm:block text-emerald-500"
                      weight="fill"
                    />
                    <span className="hidden xs:inline">open-event</span> AI assistant
                  </span>
                </div>
              </div>

              {/* Chat area */}
              <div className="p-3 sm:p-5 min-h-[200px] sm:min-h-[280px] space-y-3 sm:space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[90%] sm:max-w-[85%] px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-tr-sm bg-emerald-500 text-white text-xs sm:text-sm">
                    <p className="font-mono break-words">
                      {typingText}
                      {isTyping && (
                        <span className="inline-block w-0.5 h-3 sm:h-4 bg-white ml-0.5 animate-pulse" />
                      )}
                    </p>
                  </div>
                </div>

                {/* AI Response */}
                {showResponse && (
                  <div className="flex gap-2 sm:gap-3 animate-in slide-in-from-bottom-2 duration-500">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg">
                      <Robot size={14} className="sm:hidden text-white" weight="fill" />
                      <Robot size={16} className="hidden sm:block text-white" weight="fill" />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-tl-sm bg-muted/80 text-xs sm:text-sm">
                        <p className="text-foreground leading-relaxed">
                          Found {Math.floor(Math.random() * 10) + 5} matches for your query. Here
                          are the top recommendations based on your criteria:
                        </p>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-[10px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          View results →
                        </span>
                        <span className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-muted text-[10px] sm:text-xs font-medium text-muted-foreground">
                          Refine search
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Thinking indicator */}
                {isTyping && typingText.length > 10 && (
                  <div className="flex gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg avatar-streaming">
                      <Robot size={14} className="sm:hidden text-white" weight="fill" />
                      <Robot size={16} className="hidden sm:block text-white" weight="fill" />
                    </div>
                    <div className="flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl rounded-tl-sm bg-muted/50">
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-muted/30 border-t border-border/50">
                <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-background border border-border/50">
                  <input
                    type="text"
                    placeholder="Ask anything about your event..."
                    className="flex-1 bg-transparent text-xs sm:text-sm outline-none placeholder:text-muted-foreground/50 min-w-0"
                    disabled
                  />
                  <button className="w-8 h-8 sm:w-8 sm:h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-600 transition-colors shrink-0 touch-manipulation">
                    <PaperPlaneTilt size={14} className="sm:hidden" weight="fill" />
                    <PaperPlaneTilt size={16} className="hidden sm:block" weight="fill" />
                  </button>
                </div>
              </div>
            </div>

            {/* Playful note */}
            <p className="text-center mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5 sm:gap-2">
              <Sparkle size={10} className="sm:hidden text-emerald-500" weight="fill" />
              <Sparkle size={12} className="hidden sm:block text-emerald-500" weight="fill" />
              Live demo. No pre-recorded magic tricks.
            </p>
          </div>

          {/* Capability Cards */}
          <div className="order-1 lg:order-2 space-y-3 sm:space-y-4">
            {capabilities.map((capability, index) => (
              <CapabilityCard
                key={capability.title}
                {...capability}
                index={index}
                isActive={activeCard === index}
                onClick={() => setActiveCard(index)}
              />
            ))}

            {/* Coming soon teaser */}
            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-dashed border-border/50 bg-muted/10 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                more superpowers coming. we're not done yet.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </section>
  )
}

function CapabilityCard({
  icon: IconComponent,
  title,
  description,
  color,
  index,
  isActive,
  onClick,
}: {
  icon: Icon
  title: string
  description: string
  example: string
  color: string
  index: number
  isActive: boolean
  onClick: () => void
}) {
  const { ref, isVisible } = useScrollAnimation()

  const colorClasses = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/25',
    blue: 'from-blue-500 to-indigo-600 shadow-blue-500/25',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/25',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    orange: 'from-orange-500 to-red-600 shadow-orange-500/25',
  }

  const bgClasses = {
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
    violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50',
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'w-full text-left p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 cursor-pointer touch-manipulation active:scale-[0.99]',
        isActive
          ? bgClasses[color as keyof typeof bgClasses]
          : 'border-border/50 hover:border-border bg-card hover:bg-muted/30',
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      )}
      style={{ transitionDelay: `${index * 75}ms` }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Icon */}
        <div
          className={cn(
            'w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
            isActive
              ? `bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} shadow-lg`
              : 'bg-muted'
          )}
        >
          <IconComponent
            size={18}
            className={cn('sm:hidden', isActive ? 'text-white' : 'text-muted-foreground')}
            weight={isActive ? 'fill' : 'duotone'}
          />
          <IconComponent
            size={22}
            className={cn('hidden sm:block', isActive ? 'text-white' : 'text-muted-foreground')}
            weight={isActive ? 'fill' : 'duotone'}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
          <p
            className={cn(
              'text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors duration-300 line-clamp-2',
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {description}
          </p>
        </div>

        {/* Active indicator */}
        {isActive && (
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 mt-1.5 sm:mt-2" />
        )}
      </div>
    </div>
  )
}
