import { Check, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface OptionCardProps {
  label: string
  description?: string
  icon?: Icon
  isSelected: boolean
  onClick: () => void
  delay?: number
  /** Compact mode for grid layouts */
  compact?: boolean
}

export function OptionCard({
  label,
  description,
  icon: IconComponent,
  isSelected,
  onClick,
  delay = 0,
  compact = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-full text-left transition-all duration-200 cursor-pointer',
        'rounded-xl border-2 outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'hover:scale-[1.01] active:scale-[0.99]',
        'animate-in fade-in slide-in-from-bottom-2',
        compact ? 'p-3 sm:p-4' : 'p-3.5 sm:p-4',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card'
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
    >
      <div className={cn('flex items-center', compact ? 'gap-2.5 sm:gap-3' : 'gap-3')}>
        {IconComponent && (
          <div
            className={cn(
              'shrink-0 rounded-lg flex items-center justify-center transition-all duration-200',
              compact ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-11 sm:h-11',
              isSelected
                ? 'bg-primary/15 text-primary'
                : 'bg-muted/80 text-muted-foreground group-hover:bg-muted group-hover:text-foreground'
            )}
          >
            <IconComponent
              size={compact ? 18 : 20}
              weight="duotone"
              className="transition-colors"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'font-medium transition-colors',
              compact ? 'text-sm sm:text-base' : 'text-sm sm:text-base',
              isSelected ? 'text-primary' : 'text-foreground'
            )}
          >
            {label}
          </p>
          {description && (
            <p
              className={cn(
                'text-muted-foreground mt-0.5 leading-snug',
                compact ? 'text-xs sm:text-sm' : 'text-xs sm:text-sm'
              )}
            >
              {description}
            </p>
          )}
        </div>
        <div
          className={cn(
            'shrink-0 rounded-full flex items-center justify-center transition-all duration-200',
            compact ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-6 h-6',
            isSelected
              ? 'bg-primary scale-100'
              : 'bg-muted/50 scale-90 opacity-0 group-hover:opacity-50'
          )}
        >
          <Check
            size={compact ? 12 : 14}
            weight="bold"
            className={cn(
              'transition-colors',
              isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          />
        </div>
      </div>
    </button>
  )
}
