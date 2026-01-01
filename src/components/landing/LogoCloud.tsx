import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sparkle, RocketLaunch } from '@phosphor-icons/react'

// Future dream clients - with a wink
const dreamLogos = [
  { name: 'Your Company?', emoji: '👀' },
  { name: 'Acme Corp', emoji: '🏢' },
  { name: 'TechStart', emoji: '🚀' },
  { name: 'EventPro', emoji: '🎪' },
  { name: 'VenueMax', emoji: '🏟️' },
  { name: 'CrowdFlow', emoji: '🌊' },
  { name: 'Maybe You?', emoji: '🤞' },
  { name: 'Future Partner', emoji: '🤝' },
]

export function LogoCloud() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="py-8 sm:py-12 lg:py-16 border-t border-border/50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Fun header with honest messaging */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 mb-3 sm:mb-4">
            <RocketLaunch
              size={12}
              className="sm:hidden text-amber-600 dark:text-amber-400"
              weight="fill"
            />
            <RocketLaunch
              size={14}
              className="hidden sm:block text-amber-600 dark:text-amber-400"
              weight="fill"
            />
            <span className="text-[10px] sm:text-xs font-medium text-amber-700 dark:text-amber-300">
              just launched
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            trusted by... well, we just launched.
            <span className="text-muted-foreground/60"> you could be first.</span>
          </p>
        </div>

        {/* Animated logo slider */}
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Gradient masks - smaller on mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 md:w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 md:w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* Scrolling container */}
          <div className="flex overflow-hidden">
            <div
              className={cn(
                'flex gap-4 sm:gap-8 md:gap-12 animate-scroll',
                isHovered && 'pause-animation'
              )}
              style={{
                animation: 'scroll 25s linear infinite',
              }}
            >
              {/* Double the logos for seamless loop */}
              {[...dreamLogos, ...dreamLogos].map((logo, i) => (
                <div
                  key={`${logo.name}-${i}`}
                  className="flex items-center gap-1.5 sm:gap-2 shrink-0 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-default group touch-manipulation"
                >
                  <span className="text-sm sm:text-lg group-hover:scale-110 transition-transform">
                    {logo.emoji}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground/70 group-hover:text-muted-foreground transition-colors whitespace-nowrap">
                    {logo.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Playful CTA */}
        <p className="text-center mt-4 sm:mt-6 text-[10px] sm:text-xs text-muted-foreground/60">
          <Sparkle size={10} className="sm:hidden inline mr-0.5 text-amber-500" weight="fill" />
          <Sparkle size={12} className="hidden sm:inline mr-1 text-amber-500" weight="fill" />
          Want to be first? We'd love that.
        </p>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .pause-animation {
          animation-play-state: paused !important;
        }
      `}</style>
    </section>
  )
}
