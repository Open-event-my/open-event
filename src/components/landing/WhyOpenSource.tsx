import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { cn } from '@/lib/utils'

export function WhyOpenSource() {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <section className="relative py-16 sm:py-24 lg:py-32 px-4 sm:px-6 section-divider overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern-subtle" />

      <div
        ref={ref}
        className={cn(
          'relative max-w-4xl mx-auto space-y-5 sm:space-y-8 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}
      >
        {/* Title */}
        <h2 className="font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
          Open by design. Controlled by the community.
        </h2>

        {/* Body */}
        <div className="space-y-4 sm:space-y-6 text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
          <p>
            Events should not be trapped inside closed ecosystems.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Vendors shouldn't fight for visibility.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Sponsors deserve transparent reporting.
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Organizers need full control with zero lock-in.
          </p>

          <p>Open-Event is fully open-source, with an open API and a public roadmap.</p>
        </div>

        {/* Action items */}
        <div className="flex flex-wrap gap-2 sm:gap-4 pt-2 sm:pt-4">
          {['Audit it', 'Fork it', 'Extend it'].map((action, index) => (
            <span
              key={action}
              className={cn(
                'font-mono text-sm sm:text-lg md:text-xl font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg',
                'bg-muted border border-border',
                'transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 touch-manipulation active:scale-[0.98]'
              )}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {action}.
            </span>
          ))}
        </div>

        {/* Closing */}
        <p className="text-lg sm:text-xl md:text-2xl font-medium pt-2 sm:pt-4">
          Build the event workflow you want.
        </p>
      </div>
    </section>
  )
}
