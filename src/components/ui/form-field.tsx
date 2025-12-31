/**
 * Form Field Component
 *
 * A wrapper component that provides consistent form field styling with:
 * - Label support
 * - Error message display
 * - Required field indicator
 * - Accessibility attributes
 *
 * Validates: Requirements 11.9, 11.10
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'
import { WarningCircle } from '@phosphor-icons/react'

export interface FormFieldProps {
  /** Field name for accessibility */
  name: string
  /** Label text */
  label?: string
  /** Error message to display */
  error?: string
  /** Whether the field is required */
  required?: boolean
  /** Help text to display below the field */
  helpText?: string
  /** Additional class names for the container */
  className?: string
  /** Children (the actual input element) */
  children: React.ReactNode
  /** Whether to show the error icon */
  showErrorIcon?: boolean
}

/**
 * FormField component for consistent form field layout and error display
 *
 * @example
 * ```tsx
 * <FormField
 *   name="email"
 *   label="Email Address"
 *   error={validation.getFieldError('email')}
 *   required
 * >
 *   <Input
 *     id="email"
 *     type="email"
 *     value={email}
 *     onChange={(e) => setEmail(e.target.value)}
 *     aria-invalid={validation.hasFieldError('email')}
 *   />
 * </FormField>
 * ```
 */
export function FormField({
  name,
  label,
  error,
  required,
  helpText,
  className,
  children,
  showErrorIcon = true,
}: FormFieldProps) {
  const errorId = `${name}-error`
  const helpTextId = `${name}-help`
  const hasError = !!error

  // Clone children to add aria attributes
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const additionalProps: Record<string, unknown> = {
        'aria-invalid': hasError || undefined,
        'aria-describedby':
          [hasError ? errorId : null, helpText ? helpTextId : null].filter(Boolean).join(' ') ||
          undefined,
      }

      // Add error styling class if the child accepts className
      if (hasError && 'className' in (child.props as object)) {
        additionalProps.className = cn(
          (child.props as { className?: string }).className,
          'border-destructive focus-visible:ring-destructive'
        )
      }

      return React.cloneElement(child, additionalProps)
    }
    return child
  })

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className="flex items-center gap-1">
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}

      {enhancedChildren}

      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-sm text-destructive"
        >
          {showErrorIcon && (
            <WarningCircle
              size={16}
              weight="fill"
              className="mt-0.5 flex-shrink-0"
              aria-hidden="true"
            />
          )}
          <span>{error}</span>
        </div>
      )}

      {helpText && !error && (
        <p id={helpTextId} className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  )
}

/**
 * FormFieldGroup component for grouping related form fields
 */
export interface FormFieldGroupProps {
  /** Group title */
  title?: string
  /** Group description */
  description?: string
  /** Children (form fields) */
  children: React.ReactNode
  /** Additional class names */
  className?: string
}

export function FormFieldGroup({ title, description, children, className }: FormFieldGroupProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <legend className="text-sm font-medium leading-none">{title}</legend>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </fieldset>
  )
}

/**
 * FormError component for displaying form-level errors
 */
export interface FormErrorProps {
  /** Error message */
  error?: string | null
  /** Additional class names */
  className?: string
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive',
        className
      )}
    >
      <WarningCircle size={18} weight="fill" className="flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}

/**
 * FormSuccess component for displaying success messages
 */
export interface FormSuccessProps {
  /** Success message */
  message?: string | null
  /** Additional class names */
  className?: string
}

export function FormSuccess({ message, className }: FormSuccessProps) {
  if (!message) return null

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400',
        className
      )}
    >
      <span>{message}</span>
    </div>
  )
}

export default FormField
