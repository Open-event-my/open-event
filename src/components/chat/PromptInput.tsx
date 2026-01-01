import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { PaperPlaneTilt, Stop, CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { SlashCommandMenu } from './SlashCommandMenu'
import { createDefaultCommands, type SlashCommand } from './slashCommands'

// ============================================================================
// Types
// ============================================================================

export interface PromptInputProps {
  onSubmit: (message: string) => void
  onAbort?: () => void
  isLoading?: boolean
  isStreaming?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
  maxLength?: number
  minRows?: number
  maxRows?: number
  // Slash command handlers
  onNewChat?: () => void
  onClearChat?: () => void
  onShowHelp?: () => void
  onShowSettings?: () => void
  onRetry?: () => void
}

// ============================================================================
// Component
// ============================================================================

export function PromptInput({
  onSubmit,
  onAbort,
  isLoading = false,
  isStreaming = false,
  placeholder = 'What would you like to do?',
  disabled = false,
  className,
  maxLength = 4000,
  minRows = 1,
  maxRows = 6,
  // Slash command handlers
  onNewChat,
  onClearChat,
  onShowHelp,
  onShowSettings,
  onRetry,
}: PromptInputProps) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Create slash commands with handlers
  const slashCommands = useMemo(
    () =>
      createDefaultCommands({
        onNewChat,
        onClearChat,
        onShowHelp,
        onShowSettings,
        onRetry,
      }),
    [onNewChat, onClearChat, onShowHelp, onShowSettings, onRetry]
  )

  // Derive slash menu visibility from value (no effect needed)
  const showSlashMenu = value.startsWith('/') && value.length < 20 && !value.includes(' ')

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'

    // Calculate line height (approximate)
    const lineHeight = 24
    const minHeight = minRows * lineHeight
    const maxHeight = maxRows * lineHeight

    // Set new height within bounds
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [minRows, maxRows])

  // Adjust height when value changes
  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // Handle input change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (maxLength && newValue.length > maxLength) return
      setValue(newValue)
    },
    [maxLength]
  )

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim()
    if (!trimmedValue || isLoading || disabled) return

    onSubmit(trimmedValue)
    setValue('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, disabled, onSubmit])

  // Handle key down
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // If slash menu is open, let it handle navigation
      if (showSlashMenu && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
        // SlashCommandMenu handles these via window event listener
        return
      }

      // Enter without shift submits
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit, showSlashMenu]
  )

  // Handle abort
  const handleAbort = useCallback(() => {
    onAbort?.()
  }, [onAbort])

  // Handle slash command selection
  const handleSlashCommandSelect = useCallback((command: SlashCommand) => {
    setValue('')
    command.action()
  }, [])

  // Handle slash menu close (clear the slash to hide menu)
  const handleSlashMenuClose = useCallback(() => {
    setValue('')
  }, [])

  const canSubmit = value.trim().length > 0 && !isLoading && !disabled && !showSlashMenu
  const showAbort = isStreaming && onAbort
  const charactersRemaining = maxLength - value.length
  const showCharacterCount = value.length > maxLength * 0.8

  return (
    <div className={cn('relative', className)}>
      {/* Slash Command Menu */}
      <SlashCommandMenu
        isOpen={showSlashMenu}
        searchQuery={value}
        commands={slashCommands}
        onSelect={handleSlashCommandSelect}
        onClose={handleSlashMenuClose}
      />

      {/* Input container with premium focus glow */}
      <div
        className={cn(
          'flex items-end gap-2 p-2 sm:p-3 rounded-2xl',
          'bg-muted/50 border border-border/50',
          'transition-all duration-[var(--duration-normal)]',
          'input-glow', // Premium focus glow effect
          isFocused && 'bg-background border-border',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={minRows}
          className={cn(
            'flex-1 resize-none bg-transparent border-0 outline-none',
            'text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70',
            'disabled:cursor-not-allowed',
            'py-1 px-1'
          )}
          style={{ minHeight: `${minRows * 24}px` }}
          aria-label="Message input"
          aria-describedby="keyboard-hint"
        />

        {/* Action button */}
        <div className="flex items-center gap-2 pb-0.5">
          {showAbort ? (
            <button
              onClick={handleAbort}
              className={cn(
                'p-2.5 rounded-xl',
                'bg-destructive text-destructive-foreground',
                'hover:bg-destructive/90',
                'transition-all duration-[var(--duration-normal)] spring-press',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              aria-label="Stop generating"
            >
              <Stop size={18} weight="fill" />
            </button>
          ) : isLoading ? (
            <div
              className={cn('p-2.5 rounded-xl', 'bg-foreground/10 text-foreground/50')}
              role="status"
              aria-label="Loading"
            >
              <CircleNotch size={18} weight="bold" className="animate-spin" aria-hidden="true" />
              <span className="sr-only">Processing your message...</span>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'p-2.5 rounded-xl',
                'transition-all duration-[var(--duration-normal)]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                canSubmit
                  ? 'bg-foreground text-background hover:bg-foreground/90 shadow-sm spring-press'
                  : 'bg-foreground/10 text-foreground/30 cursor-not-allowed'
              )}
              aria-label="Send message"
            >
              <PaperPlaneTilt size={18} weight="fill" />
            </button>
          )}
        </div>
      </div>

      {/* Character count */}
      {showCharacterCount && (
        <div
          className={cn(
            'absolute -bottom-5 right-0 text-xs',
            charactersRemaining < 100 ? 'text-destructive' : 'text-muted-foreground'
          )}
          aria-live="polite"
        >
          {charactersRemaining} characters remaining
        </div>
      )}

      {/* Keyboard hint - hidden on mobile */}
      <div
        id="keyboard-hint"
        className="mt-2 hidden sm:flex items-center justify-center text-xs text-muted-foreground/60"
      >
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Enter</kbd> to
          send ·{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">
            Shift + Enter
          </kbd>{' '}
          for new line ·{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">/</kbd> for
          commands
        </span>
      </div>
    </div>
  )
}
