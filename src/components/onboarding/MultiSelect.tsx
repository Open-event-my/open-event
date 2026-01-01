import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  columns?: 2 | 3
}

export function MultiSelect({ options, selected, onChange, columns = 2 }: MultiSelectProps) {
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div
      className={cn(
        'grid gap-2 sm:gap-2.5',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
      )}
    >
      {options.map((option, index) => {
        const isSelected = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleOption(option.value)}
            className={cn(
              'group relative px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
              'hover:scale-[1.01] active:scale-[0.99]',
              'animate-in fade-in slide-in-from-bottom-2',
              'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card'
            )}
            style={{
              animationDelay: `${index * 40}ms`,
              animationFillMode: 'backwards',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'text-sm sm:text-base font-medium transition-colors',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {option.label}
              </span>
              <div
                className={cn(
                  'w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0',
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'
                )}
              >
                {isSelected && (
                  <Check
                    size={12}
                    weight="bold"
                    className="text-primary-foreground animate-in zoom-in duration-150"
                  />
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
