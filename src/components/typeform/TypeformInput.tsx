import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// TypeformInput - Large text input with underline style
// ============================================================================

export interface TypeformInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
}

export const TypeformInput = forwardRef<HTMLInputElement, TypeformInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5 sm:space-y-2">
        {label && (
          <label className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-transparent',
            'text-base sm:text-lg lg:text-xl',
            'py-2.5 sm:py-3 px-0',
            'border-b-2 border-border/60 rounded-none',
            'placeholder:text-muted-foreground/40',
            'focus:outline-none focus:border-primary',
            'transition-colors duration-200',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs sm:text-sm text-destructive mt-1">{error}</p>}
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
}

export const TypeformTextarea = forwardRef<HTMLTextAreaElement, TypeformTextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
        <textarea
          ref={ref}
          className={cn(
            'typeform-input w-full resize-none',
            'placeholder:text-muted-foreground/50',
            'focus:outline-none',
            'min-h-[100px]',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
TypeformTextarea.displayName = 'TypeformTextarea'

// ============================================================================
// TypeformSelect - Custom select with large touch targets
// ============================================================================

export interface TypeformSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export const TypeformSelect = forwardRef<HTMLSelectElement, TypeformSelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
        <select
          ref={ref}
          className={cn(
            'typeform-input w-full cursor-pointer',
            'focus:outline-none',
            'appearance-none',
            'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.5rem]',
            error && 'border-destructive focus:border-destructive',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
TypeformSelect.displayName = 'TypeformSelect'
