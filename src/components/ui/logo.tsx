import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showDomain?: boolean
}

/**
 * Pixel-style dev logo - openevent.my
 * Retro 8-bit vibes
 */
export function Logo({ size = 'md', className, showDomain = true }: LogoProps) {
  const sizes = {
    sm: {
      text: 'text-base',
      domain: 'text-xs',
      icon: 'w-5 h-5',
      gap: 'gap-1.5',
    },
    md: {
      text: 'text-lg',
      domain: 'text-sm',
      icon: 'w-6 h-6',
      gap: 'gap-2',
    },
    lg: {
      text: 'text-2xl',
      domain: 'text-base',
      icon: 'w-8 h-8',
      gap: 'gap-2.5',
    },
  }

  const s = sizes[size]

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {/* Pixel icon - calendar/event block */}
      <div className={cn('relative flex-shrink-0', s.icon)}>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-full h-full"
          aria-hidden="true"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Outer frame - pixel perfect */}
          <rect x="1" y="3" width="14" height="12" className="fill-foreground" />
          {/* Inner cutout */}
          <rect x="2" y="4" width="12" height="10" className="fill-background" />
          {/* Top bar */}
          <rect x="1" y="3" width="14" height="3" className="fill-foreground" />
          {/* Calendar pins */}
          <rect x="4" y="1" width="2" height="4" className="fill-foreground" />
          <rect x="10" y="1" width="2" height="4" className="fill-foreground" />
          {/* Event dot - the pixel moment */}
          <rect x="6" y="9" width="4" height="4" className="fill-foreground" />
        </svg>
      </div>

      {/* Wordmark - monospace dev style */}
      <div className="flex items-baseline">
        <span className={cn('font-mono font-bold tracking-tight text-foreground', s.text)}>
          openevent
        </span>
        {showDomain && (
          <span className={cn('font-mono font-medium text-muted-foreground', s.domain)}>.my</span>
        )}
      </div>
    </div>
  )
}

/**
 * Animated logo variant with hover effect
 */
export function LogoAnimated({ size = 'md', className, showDomain = true }: LogoProps) {
  const sizes = {
    sm: {
      text: 'text-base',
      domain: 'text-xs',
      icon: 'w-5 h-5',
      gap: 'gap-1.5',
    },
    md: {
      text: 'text-lg',
      domain: 'text-sm',
      icon: 'w-6 h-6',
      gap: 'gap-2',
    },
    lg: {
      text: 'text-2xl',
      domain: 'text-base',
      icon: 'w-8 h-8',
      gap: 'gap-2.5',
    },
  }

  const s = sizes[size]

  return (
    <div className={cn('flex items-center group cursor-pointer', s.gap, className)}>
      {/* Pixel icon with bounce animation */}
      <div
        className={cn(
          'relative flex-shrink-0 transition-transform duration-150 group-hover:-translate-y-0.5',
          s.icon
        )}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-full h-full"
          aria-hidden="true"
          style={{ imageRendering: 'pixelated' }}
        >
          <rect x="1" y="3" width="14" height="12" className="fill-foreground" />
          <rect x="2" y="4" width="12" height="10" className="fill-background" />
          <rect x="1" y="3" width="14" height="3" className="fill-foreground" />
          <rect x="4" y="1" width="2" height="4" className="fill-foreground" />
          <rect x="10" y="1" width="2" height="4" className="fill-foreground" />
          <rect
            x="6"
            y="9"
            width="4"
            height="4"
            className="fill-foreground transition-colors group-hover:fill-foreground"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="flex items-baseline">
        <span className={cn('font-mono font-bold tracking-tight text-foreground', s.text)}>
          openevent
        </span>
        {showDomain && (
          <span
            className={cn(
              'font-mono font-medium text-muted-foreground transition-colors group-hover:text-foreground',
              s.domain
            )}
          >
            .my
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Icon only - pixel style
 */
export function LogoIcon({
  className,
  size = 'md',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return (
    <div className={cn('relative flex-shrink-0', sizes[size], className)}>
      <svg
        viewBox="0 0 16 16"
        fill="none"
        className="w-full h-full"
        aria-hidden="true"
        style={{ imageRendering: 'pixelated' }}
      >
        <rect x="1" y="3" width="14" height="12" className="fill-foreground" />
        <rect x="2" y="4" width="12" height="10" className="fill-background" />
        <rect x="1" y="3" width="14" height="3" className="fill-foreground" />
        <rect x="4" y="1" width="2" height="4" className="fill-foreground" />
        <rect x="10" y="1" width="2" height="4" className="fill-foreground" />
        <rect x="6" y="9" width="4" height="4" className="fill-foreground" />
      </svg>
    </div>
  )
}

/**
 * Minimal text-only version - terminal style
 */
export function LogoMini({ className }: { className?: string }) {
  return (
    <span className={cn('font-mono font-bold text-sm text-foreground', className)}>
      oe<span className="text-muted-foreground">.my</span>
    </span>
  )
}

/**
 * Full logo with tagline - dev style
 */
export function LogoFull({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      <Logo size="lg" />
      <span className="font-mono text-[10px] text-muted-foreground tracking-wide mt-1 ml-10">
        // event management, reimagined
      </span>
    </div>
  )
}

/**
 * ASCII art style for fun
 */
export function LogoAscii({ className }: { className?: string }) {
  return (
    <pre className={cn('font-mono text-[8px] leading-none text-foreground select-none', className)}>
      {`┌──────────┐
│ ▀▀ ▀▀   │
│  ████   │
│ openevent│
└──────────┘`}
    </pre>
  )
}
