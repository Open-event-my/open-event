import * as React from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { Button, buttonVariants } from './button'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'

export interface LoadingButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Whether the button is in loading state */
  isLoading?: boolean
  /** Text to show while loading (defaults to children) */
  loadingText?: string
  /** Custom loading spinner size */
  spinnerSize?: number
  /** Position of the spinner relative to text */
  spinnerPosition?: 'left' | 'right'
  /** Whether to use Slot for composition */
  asChild?: boolean
}

/**
 * Button component with built-in loading state support.
 * 
 * Features:
 * - Shows spinner when loading
 * - Disables button during loading
 * - Optional loading text
 * - Configurable spinner position
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingButton isLoading={isSubmitting} onClick={handleSubmit}>
 *   Submit
 * </LoadingButton>
 * 
 * // With loading text
 * <LoadingButton 
 *   isLoading={isSaving} 
 *   loadingText="Saving..."
 *   onClick={handleSave}
 * >
 *   Save Changes
 * </LoadingButton>
 * ```
 * 
 * **Validates: Requirements 11.7** - Show loading states for all async operations
 */
export function LoadingButton({
  children,
  isLoading = false,
  loadingText,
  spinnerSize = 16,
  spinnerPosition = 'left',
  disabled,
  className,
  variant,
  size,
  asChild,
  ...props
}: LoadingButtonProps) {
  const spinner = (
    <CircleNotch
      size={spinnerSize}
      weight="bold"
      className="animate-spin"
      aria-hidden="true"
    />
  )

  const content = isLoading ? (
    <>
      {spinnerPosition === 'left' && spinner}
      <span>{loadingText ?? children}</span>
      {spinnerPosition === 'right' && spinner}
    </>
  ) : (
    children
  )

  return (
    <Button
      className={cn(className)}
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      asChild={asChild}
      {...props}
    >
      {content}
    </Button>
  )
}

/**
 * Icon button with loading state support.
 * Shows spinner in place of icon when loading.
 */
export function LoadingIconButton({
  children,
  isLoading = false,
  spinnerSize = 16,
  disabled,
  className,
  variant = 'ghost',
  size = 'icon',
  ...props
}: Omit<LoadingButtonProps, 'loadingText' | 'spinnerPosition'>) {
  return (
    <Button
      className={cn(className)}
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <CircleNotch
          size={spinnerSize}
          weight="bold"
          className="animate-spin"
          aria-hidden="true"
        />
      ) : (
        children
      )}
    </Button>
  )
}
