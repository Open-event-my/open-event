import { useState, useEffect, useRef, useMemo } from 'react'
import { Command } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { SlashCommand } from './slashCommands'

// ============================================================================
// Types
// ============================================================================

export interface SlashCommandMenuProps {
  isOpen: boolean
  searchQuery: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  commands?: SlashCommand[]
  className?: string
}

// ============================================================================
// Inner Component with key-based reset
// ============================================================================

function SlashCommandMenuInner({
  isOpen,
  filteredCommands,
  onSelect,
  onClose,
  className,
}: {
  isOpen: boolean
  filteredCommands: SlashCommand[]
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  className?: string
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Derive safe selected index
  const safeSelectedIndex = selectedIndex >= filteredCommands.length ? 0 : selectedIndex

  // Scroll selected item into view
  useEffect(() => {
    const selectedItem = itemRefs.current[safeSelectedIndex]
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest' })
    }
  }, [safeSelectedIndex])

  // Expose keyboard handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const next = prev + 1
            return next >= filteredCommands.length ? 0 : next
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const next = prev - 1
            return next < 0 ? filteredCommands.length - 1 : next
          })
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[safeSelectedIndex]) {
            onSelect(filteredCommands[safeSelectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, safeSelectedIndex, onSelect, onClose])

  if (!isOpen || filteredCommands.length === 0) return null

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute bottom-full left-0 right-0 mb-2',
        'bg-popover border border-border rounded-xl shadow-lg',
        'overflow-hidden',
        'menu-entrance',
        className
      )}
      role="listbox"
      aria-label="Slash commands"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/30">
        <Command size={14} weight="bold" className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">Commands</span>
        <span className="text-xs text-muted-foreground/50 ml-auto">
          ↑↓ to navigate · Enter to select
        </span>
      </div>

      {/* Command list */}
      <div className="max-h-[240px] overflow-y-auto py-1 custom-scrollbar">
        {filteredCommands.map((command, index) => {
          const Icon = command.icon
          const isSelected = index === safeSelectedIndex

          return (
            <button
              key={command.id}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              onClick={() => onSelect(command)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5',
                'transition-colors duration-[var(--duration-fast)]',
                'text-left',
                isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50'
              )}
              role="option"
              aria-selected={isSelected}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  isSelected ? 'bg-primary/10' : 'bg-muted'
                )}
              >
                <Icon
                  size={18}
                  weight="duotone"
                  className={cn(isSelected ? 'text-primary' : 'text-muted-foreground')}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{command.name}</span>
                  {command.shortcut && (
                    <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-muted/50 text-[10px] font-mono text-muted-foreground">
                      /{command.shortcut.toLowerCase()}
                    </kbd>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{command.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredCommands.length === 0 && (
        <div className="px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">No commands found</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Wrapper Component
// ============================================================================

export function SlashCommandMenu({
  isOpen,
  searchQuery,
  onSelect,
  onClose,
  commands = [],
  className,
}: SlashCommandMenuProps) {
  // Filter commands based on search query (remove leading slash)
  const query = searchQuery.startsWith('/') ? searchQuery.slice(1).toLowerCase() : ''
  const filteredCommands = useMemo(
    () =>
      commands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(query) || cmd.description.toLowerCase().includes(query)
      ),
    [commands, query]
  )

  // Use key to reset state when searchQuery changes (per React best practices)
  return (
    <SlashCommandMenuInner
      key={searchQuery}
      isOpen={isOpen}
      filteredCommands={filteredCommands}
      onSelect={onSelect}
      onClose={onClose}
      className={className}
    />
  )
}
