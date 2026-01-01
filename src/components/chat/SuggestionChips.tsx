import {
  CalendarPlus,
  Storefront,
  HandCoins,
  MagnifyingGlass,
  Question,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

// ============================================================================
// Types
// ============================================================================

export interface SuggestionChip {
  id: string
  label: string
  prompt: string
  icon: ComponentType<IconProps>
}

export interface SuggestionChipsProps {
  chips?: SuggestionChip[]
  onSelect: (prompt: string) => void
  className?: string
}

// ============================================================================
// Default Chips
// ============================================================================

const defaultChips: SuggestionChip[] = [
  {
    id: 'create-event',
    label: 'Create an event',
    prompt: 'Help me create a new event',
    icon: CalendarPlus,
  },
  {
    id: 'find-vendors',
    label: 'Find vendors',
    prompt: 'Search for vendors in my area',
    icon: Storefront,
  },
  {
    id: 'add-sponsors',
    label: 'Add sponsors',
    prompt: 'I need to add sponsors to my event',
    icon: HandCoins,
  },
  {
    id: 'search',
    label: 'Search events',
    prompt: 'Help me search for events',
    icon: MagnifyingGlass,
  },
  {
    id: 'help',
    label: 'How it works',
    prompt: 'How do I use this platform?',
    icon: Question,
  },
]

// ============================================================================
// Component
// ============================================================================

export function SuggestionChips({
  chips = defaultChips,
  onSelect,
  className,
}: SuggestionChipsProps) {
  return (
    <div className={cn('suggestion-chips-container', className)}>
      <p className="text-sm text-muted-foreground mb-3 text-center">What would you like to do?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map((chip, index) => {
          const Icon = chip.icon
          return (
            <button
              key={chip.id}
              onClick={() => onSelect(chip.prompt)}
              className="chip-entrance"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="chip-hover group">
                <Icon
                  size={16}
                  weight="duotone"
                  className="text-muted-foreground group-hover:text-foreground transition-colors duration-[var(--duration-fast)]"
                />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-[var(--duration-fast)]">
                  {chip.label}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Compact Variant (for sidebar or smaller spaces)
// ============================================================================

export interface CompactSuggestionChipsProps {
  chips?: SuggestionChip[]
  onSelect: (prompt: string) => void
  className?: string
}

export function CompactSuggestionChips({
  chips = defaultChips.slice(0, 3),
  onSelect,
  className,
}: CompactSuggestionChipsProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {chips.map((chip, index) => {
        const Icon = chip.icon
        return (
          <button
            key={chip.id}
            onClick={() => onSelect(chip.prompt)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-left',
              'bg-transparent hover:bg-muted/50',
              'transition-all duration-[var(--duration-fast)]',
              'chip-entrance spring-press'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Icon size={16} weight="duotone" className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{chip.label}</span>
          </button>
        )
      })}
    </div>
  )
}
