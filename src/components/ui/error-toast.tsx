/**
 * Error Toast Component and Utilities
 *
 * Provides toast notifications for errors with persistence logic based on error type.
 * Integrates with sonner toast library and supports recovery actions.
 *
 * Requirements: 6.6
 */

import { toast, type ExternalToast } from 'sonner'
import type { EnhancedFormattedError, ErrorCategory } from '@/lib/errorFormatter'
import { executeRecoveryAction, type RecoveryActionContext } from '@/lib/recoveryActions'

/**
 * Toast duration configuration by error category
 * Requirements: 6.6 - Determine duration based on error type
 */
export interface ToastDurationConfig {
  /** Duration in milliseconds (0 for persistent/no auto-dismiss) */
  duration: number
  /** Whether the toast should persist until dismissed */
  persistent: boolean
}

/**
 * Get toast duration configuration based on error
 * Requirements: 6.6 - Prevent auto-dismiss for acknowledgment-required errors
 *
 * @param error - The error to get duration for
 * @returns Toast duration configuration
 */
export function getToastDuration(error: EnhancedFormattedError): ToastDurationConfig {
  // Errors requiring acknowledgment don't auto-dismiss
  if (error.requiresAcknowledgment) {
    return { duration: Infinity, persistent: true }
  }

  // Rate limit errors show countdown and don't auto-dismiss
  if (error.category === 'rateLimit') {
    return { duration: Infinity, persistent: true }
  }

  // Auth and permission errors persist
  if (error.category === 'auth' || error.category === 'permission') {
    return { duration: Infinity, persistent: true }
  }

  // Payment errors persist
  if (error.category === 'payment') {
    return { duration: Infinity, persistent: true }
  }

  // Server errors get longer duration
  if (error.category === 'server') {
    return { duration: 8000, persistent: false }
  }

  // Network errors get medium duration
  if (error.category === 'network') {
    return { duration: 6000, persistent: false }
  }

  // Validation errors get shorter duration
  if (error.category === 'validation') {
    return { duration: 5000, persistent: false }
  }

  // Default duration for other errors
  return { duration: 5000, persistent: false }
}

/**
 * Get toast duration by error category (simplified version)
 * Requirements: 6.6
 *
 * @param category - The error category
 * @param requiresAcknowledgment - Whether the error requires acknowledgment
 * @returns Duration in milliseconds (Infinity for persistent)
 */
export function getToastDurationByCategory(
  category: ErrorCategory,
  requiresAcknowledgment: boolean = false
): number {
  // Errors requiring acknowledgment don't auto-dismiss
  if (requiresAcknowledgment) {
    return Infinity
  }

  switch (category) {
    case 'auth':
    case 'permission':
    case 'payment':
    case 'rateLimit':
      return Infinity // Persistent
    case 'server':
      return 8000
    case 'network':
      return 6000
    case 'validation':
    case 'notFound':
      return 5000
    case 'unknown':
    default:
      return 5000
  }
}

/**
 * Check if an error should show recovery actions in toast
 * Requirements: 6.6 - Show recovery actions in toast when appropriate
 *
 * @param error - The error to check
 * @returns Whether to show recovery actions
 */
export function shouldShowRecoveryActions(error: EnhancedFormattedError): boolean {
  // Show recovery actions for persistent errors
  if (error.requiresAcknowledgment || error.persistent) {
    return true
  }

  // Show recovery actions for certain categories
  const categoriesWithActions: ErrorCategory[] = [
    'auth',
    'network',
    'permission',
    'rateLimit',
    'payment',
  ]

  return categoriesWithActions.includes(error.category)
}

/**
 * Options for showing an error toast
 */
export interface ErrorToastOptions {
  /** Recovery action context for executing actions */
  actionContext?: RecoveryActionContext
  /** Called when the toast is dismissed */
  onDismiss?: () => void
  /** Called when a recovery action completes successfully */
  onRecoveryComplete?: () => void
  /** Override the default duration */
  duration?: number
  /** Custom toast ID (for deduplication) */
  id?: string
}

/**
 * Show an error toast with appropriate persistence and recovery actions
 * Requirements: 6.6
 *
 * @param error - The error to display
 * @param options - Toast options
 * @returns Toast ID
 *
 * @example
 * ```typescript
 * const formatted = formatErrorWithContext(error, { action: 'save event' })
 * showErrorToast(formatted, {
 *   actionContext: { retryOperation: () => saveEvent(data) },
 *   onRecoveryComplete: () => console.log('Saved!')
 * })
 * ```
 */
export function showErrorToast(
  error: EnhancedFormattedError,
  options: ErrorToastOptions = {}
): string | number {
  const { actionContext, onDismiss, onRecoveryComplete, duration: customDuration, id } = options

  const durationConfig = getToastDuration(error)
  const duration = customDuration ?? durationConfig.duration
  const showActions = shouldShowRecoveryActions(error)

  // Build description with suggestions
  let description: string | undefined
  if (error.suggestions && error.suggestions.length > 0) {
    description = error.suggestions.slice(0, 2).join('. ')
  }

  // Build toast options
  const toastOptions: ExternalToast = {
    id: id || error.id,
    duration,
    description,
    onDismiss: () => onDismiss?.(),
  }

  // Add action button if we should show recovery actions
  if (showActions && error.recoveryActions.length > 0) {
    const primaryAction = error.recoveryActions[0]

    toastOptions.action = {
      label: primaryAction.label,
      onClick: async () => {
        try {
          const result = await executeRecoveryAction(primaryAction, actionContext)
          if (result.success) {
            toast.dismiss(id || error.id)
            onRecoveryComplete?.()
          }
        } catch (err) {
          console.error('Recovery action failed:', err)
        }
      },
    }

    // Add cancel button for persistent toasts
    if (durationConfig.persistent) {
      toastOptions.cancel = {
        label: 'Dismiss',
        onClick: () => {
          toast.dismiss(id || error.id)
          onDismiss?.()
        },
      }
    }
  }

  // Show the toast based on category
  return toast.error(error.message, toastOptions)
}

/**
 * Show a network error toast with retry action
 *
 * @param message - Error message
 * @param retryOperation - Function to retry
 * @param onSuccess - Called when retry succeeds
 */
export function showNetworkErrorToast(
  message: string,
  retryOperation?: () => Promise<unknown>,
  onSuccess?: () => void
): string | number {
  return toast.error(message, {
    duration: 6000,
    description: 'Check your internet connection and try again.',
    action: retryOperation
      ? {
          label: 'Retry',
          onClick: async () => {
            try {
              await retryOperation()
              toast.success('Action completed successfully')
              onSuccess?.()
            } catch {
              toast.error('Retry failed. Please try again.')
            }
          },
        }
      : undefined,
  })
}

/**
 * Show an auth error toast with sign-in action
 *
 * @param message - Error message
 * @param navigate - Navigation function
 */
export function showAuthErrorToast(
  message: string,
  navigate?: (path: string) => void
): string | number {
  return toast.error(message, {
    duration: Infinity,
    description: 'Please sign in to continue.',
    action: navigate
      ? {
          label: 'Sign In',
          onClick: () => navigate('/auth/signin'),
        }
      : undefined,
    cancel: {
      label: 'Dismiss',
      onClick: () => {},
    },
  })
}

/**
 * Show a validation error toast
 *
 * @param message - Error message
 * @param fieldSelector - Optional selector for the invalid field
 */
export function showValidationErrorToast(message: string, fieldSelector?: string): string | number {
  return toast.error(message, {
    duration: 5000,
    description: 'Please review your input and try again.',
    action: fieldSelector
      ? {
          label: 'Review',
          onClick: () => {
            const element = document.querySelector<HTMLElement>(fieldSelector)
            if (element) {
              element.focus()
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          },
        }
      : undefined,
  })
}

/**
 * Show a rate limit error toast with countdown
 *
 * @param message - Error message
 * @param retryAfterSeconds - Seconds until retry is allowed
 * @param onReady - Called when countdown completes
 */
export function showRateLimitErrorToast(
  message: string,
  retryAfterSeconds: number,
  onReady?: () => void
): string | number {
  const toastId = toast.error(message, {
    duration: Infinity,
    description: `Please wait ${retryAfterSeconds} seconds before trying again.`,
    cancel: {
      label: 'Dismiss',
      onClick: () => {},
    },
  })

  // Update the toast when countdown completes
  if (onReady) {
    setTimeout(() => {
      toast.dismiss(toastId)
      toast.success('You can now retry your action', {
        duration: 3000,
      })
      onReady()
    }, retryAfterSeconds * 1000)
  }

  return toastId
}

/**
 * Dismiss an error toast by ID
 *
 * @param id - Toast ID to dismiss
 */
export function dismissErrorToast(id: string | number): void {
  toast.dismiss(id)
}

/**
 * Dismiss all error toasts
 */
export function dismissAllErrorToasts(): void {
  toast.dismiss()
}

export default showErrorToast
