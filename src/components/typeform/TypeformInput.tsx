import {
  forwardRef,
  useId,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { CaretDown, Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// TypeformInput - Large text input with underline style
// ============================================================================

export interface TypeformInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
}

export const TypeformInput = forwardRef<HTMLInputElement, TypeformInputProps>(
  ({ className, label, error, id: providedId, ...props }, ref) => {
    const generatedId = useId()
    const inputId = providedId ?? generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'typeform-input',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive mt-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)
TypeformInput.displayName = 'TypeformInput'

// ============================================================================
// TypeformTextarea - Auto-resizing textarea with minimal chrome
// ============================================================================

export interface TypeformTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  minRows?: number
  maxRows?: number
}

export const TypeformTextarea = forwardRef<HTMLTextAreaElement, TypeformTextareaProps>(
  (
    { className, label, error, id: providedId, minRows = 3, maxRows = 10, value, ...props },
    ref
  ) => {
    const generatedId = useId()
    const textareaId = providedId ?? generatedId
    const errorId = `${textareaId}-error`
    const internalRef = useRef<HTMLTextAreaElement>(null)

    // Expose the internal ref to parent components
    useImperativeHandle(ref, () => internalRef.current!, [])

    // Auto-resize based on content
    const adjustHeight = useCallback(() => {
      const textarea = internalRef.current
      if (!textarea) return

      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto'

      // Calculate bounds based on line height (approximate 24px per line)
      const lineHeight = 24
      const minHeight = minRows * lineHeight
      const maxHeight = maxRows * lineHeight

      // Set height within bounds
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }, [minRows, maxRows])

    // Adjust height when value changes
    useEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={internalRef}
          id={textareaId}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'typeform-input resize-none overflow-hidden',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm text-destructive mt-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)
TypeformTextarea.displayName = 'TypeformTextarea'

// ============================================================================
// TypeformSelect - Custom select with Radix UI for dark mode support
// ============================================================================

export interface TypeformSelectProps {
  label?: string
  error?: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: ReactNode
  className?: string
}

export function TypeformSelect({
  label,
  error,
  placeholder,
  value,
  onValueChange,
  disabled,
  children,
  className,
}: TypeformSelectProps) {
  const generatedId = useId()
  const errorId = `${generatedId}-error`

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'flex w-full items-center justify-between',
            'typeform-input',
            'focus:outline-none focus:border-primary',
            'data-[placeholder]:text-muted-foreground/70',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:border-destructive',
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <CaretDown className="size-5 text-muted-foreground" weight="bold" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'bg-popover text-popover-foreground',
              'relative z-50 min-w-[8rem] overflow-hidden rounded-md border shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
            )}
            position="popper"
            sideOffset={8}
          >
            <SelectPrimitive.Viewport className="p-1 max-h-[300px] overflow-y-auto">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
TypeformSelect.displayName = 'TypeformSelect'

// ============================================================================
// TypeformSelectItem - Individual option for TypeformSelect
// ============================================================================

export interface TypeformSelectItemProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function TypeformSelectItem({
  value,
  children,
  disabled,
  className,
}: TypeformSelectItemProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center',
        'rounded-sm py-2 pl-2 pr-8 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" weight="bold" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}
TypeformSelectItem.displayName = 'TypeformSelectItem'
