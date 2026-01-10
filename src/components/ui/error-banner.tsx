/**
 * Enhanced Error Banner Component
 *
 * Displays error messages with category-appropriate styling, recovery action buttons,
 * duplicate count badges, focus management, and "Report Issue" functionality.
 *
 * Requirements: 2.1, 2.7, 6.2, 6.3, 6.4, 6.7, 7.2
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  WarningCircle,
  WifiSlash,
  LockKey,
  MagnifyingGlass,
  CreditCard,
  Clock,
  ShieldWarning,
  X,
  ArrowClockwise,
  Bug,
  CircleNotch,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { EnhancedFormattedError, ErrorCategory, RecoveryAction } from '@/lib/errorFormatter'
import { executeRecoveryAction, type RecoveryActionContext } from '@/lib/recoveryActions'
import { useCountdown } from '@/hooks/useCountdown'
import { useNavigate } from 'react-router-dom'

/**
 * Props for the ErrorBanner component
 */
export interface ErrorBannerProps {
  /** Error to display */
  error: EnhancedFormattedError
  /** Duplicate count if applicable */
  duplicateCount?: number
  /** Called when error is dismissed */
  onDismiss?: () => void
  /** Called when recovery action completes */
  onRecoveryComplete?: () => void
  /** Whether to auto-focus the banner */
  autoFocus?: boolean
  /** Element to return focus to on dismiss */
  returnFocusTo?: HTMLElement | null
  /** Called when "Report Issue" is clicked */
  onReportIssue?: (error: EnhancedFormattedError) => void
  /** Additional class name */
  className?: string
  /** Retry operation for retry actions */
  retryOperation?: () => Promise<unknown>
}

/**
 * Get icon component for error category
 * Requirements: 6.7 - Use icons to convey error state
 */
function getCategoryIcon(category: ErrorCategory) {
  switch (category) {
    case 'auth':
      return LockKey
    case 'network':
      return WifiSlash
    case 'validation':
      return WarningCircle
    case 'permission':
      return ShieldWarning
    case 'notFound':
      return MagnifyingGlass
    case 'rateLimit':
      return Clock
    case 'payment':
      return CreditCard
    case 'server':
      return WarningCircle
    case 'unknown':
    default:
      return WarningCircle
  }
}

/**
 * Get styling classes for error category
 * Requirements: 6.7 - Use color AND icons/text to convey error state
 */
function getCategoryStyles(category: ErrorCategory) {
  switch (category) {
    case 'auth':
      return {
        container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-900 dark:text-amber-100',
      }
    case 'network':
      return {
        container: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
        icon: 'text-orange-600 dark:text-orange-400',
        text: 'text-orange-900 dark:text-orange-100',
      }
    case 'validation':
      return {
        container: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-900 dark:text-red-100',
      }
    case 'permission':
      return {
        container: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
        icon: 'text-purple-600 dark:text-purple-400',
        text: 'text-purple-900 dark:text-purple-100',
      }
    case 'notFound':
      return {
        container: 'bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800',
        icon: 'text-slate-600 dark:text-slate-400',
        text: 'text-slate-900 dark:text-slate-100',
      }
    case 'rateLimit':
      return {
        container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
        icon: 'text-yellow-600 dark:text-yellow-400',
        text: 'text-yellow-900 dark:text-yellow-100',
      }
    case 'payment':
      return {
        container: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
        icon: 'text-rose-600 dark:text-rose-400',
        text: 'text-rose-900 dark:text-rose-100',
      }
    case 'server':
      return {
        container: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-900 dark:text-red-100',
      }
    case 'unknown':
    default:
      return {
        container: 'bg-gray-50 border-gray-200 dark:bg-gray-950/30 dark:border-gray-800',
        icon: 'text-gray-600 dark:text-gray-400',
        text: 'text-gray-900 dark:text-gray-100',
      }
  }
}

/**
 * Recovery Action Button Component
 * Requirements: 2.1, 2.7 - Show recovery actions with loading states
 */
interface RecoveryActionButtonProps {
  action: RecoveryAction
  onExecute: (action: RecoveryAction) => Promise<void>
  isLoading: boolean
  loadingActionType: string | null
  category: ErrorCategory
}

function RecoveryActionButton({
  action,
  onExecute,
  isLoading,
  loadingActionType,
  category,
}: RecoveryActionButtonProps) {
  const isThisLoading = isLoading && loadingActionType === action.type

  // For countdown actions, use the countdown hook
  const countdown = useCountdown({
    initialSeconds: action.countdownSeconds || 0,
    autoStart: action.type === 'countdown' && (action.countdownSeconds || 0) > 0,
  })

  const handleClick = useCallback(async () => {
    if (action.type === 'countdown' && !countdown.isComplete) {
      return // Don't execute until countdown is complete
    }
    await onExecute(action)
  }, [action, onExecute, countdown.isComplete])

  // Determine button label
  let label = action.label
  if (action.type === 'countdown' && !countdown.isComplete) {
    label = `${action.label} (${countdown.formattedTime})`
  }

  const isDisabled = isLoading || (action.type === 'countdown' && !countdown.isComplete)

  return (
    <Button
      size="sm"
      variant={category === 'validation' ? 'destructive' : 'secondary'}
      onClick={handleClick}
      disabled={isDisabled}
      className="gap-1.5"
      aria-busy={isThisLoading}
    >
      {isThisLoading ? (
        <CircleNotch size={14} className="animate-spin" aria-hidden="true" />
      ) : action.type === 'retry' ? (
        <ArrowClockwise size={14} aria-hidden="true" />
      ) : null}
      {label}
    </Button>
  )
}

/**
 * Enhanced Error Banner Component
 *
 * Features:
 * - Category-appropriate styling with icons
 * - Recovery action buttons with loading states
 * - Duplicate count badge
 * - Focus management (auto-focus, return focus on dismiss)
 * - "Report Issue" button
 * - Keyboard accessible
 *
 * Requirements: 2.1, 2.7, 6.2, 6.3, 6.4, 6.7, 7.2
 */
export function ErrorBanner({
  error,
  duplicateCount,
  onDismiss,
  onRecoveryComplete,
  autoFocus = true,
  returnFocusTo,
  onReportIssue,
  className,
  retryOperation,
}: ErrorBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const navigate = useNavigate()

  const Icon = getCategoryIcon(error.category)
  const styles = getCategoryStyles(error.category)

  // Auto-focus the banner when it mounts
  // Requirements: 6.2 - Error banner SHALL be focusable and receive focus automatically
  useEffect(() => {
    if (autoFocus && bannerRef.current) {
      bannerRef.current.focus()
    }
  }, [autoFocus])

  // Return focus to the triggering element on dismiss
  // Requirements: 6.4 - Return focus to the element that triggered the error
  const handleDismiss = useCallback(() => {
    if (returnFocusTo) {
      returnFocusTo.focus()
    }
    onDismiss?.()
  }, [returnFocusTo, onDismiss])

  // Execute a recovery action
  // Requirements: 2.7 - Show loading state until action completes
  const handleRecoveryAction = useCallback(
    async (action: RecoveryAction) => {
      setLoadingAction(action.type)

      try {
        const context: RecoveryActionContext = {
          navigate: (path: string) => navigate(path),
          retryOperation,
        }

        const result = await executeRecoveryAction(action, context)

        if (result.success) {
          onRecoveryComplete?.()
        }
      } catch (err) {
        console.error('Recovery action failed:', err)
      } finally {
        setLoadingAction(null)
      }
    },
    [navigate, retryOperation, onRecoveryComplete]
  )

  // Handle "Report Issue" click
  const handleReportIssue = useCallback(() => {
    onReportIssue?.(error)
  }, [error, onReportIssue])

  // Handle keyboard events for accessibility
  // Requirements: 6.3 - All actions SHALL be keyboard accessible
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && onDismiss) {
        handleDismiss()
      }
    },
    [handleDismiss, onDismiss]
  )

  const showDuplicateBadge = duplicateCount && duplicateCount > 1

  return (
    <div
      ref={bannerRef}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative rounded-lg border p-4 shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        styles.container,
        className
      )}
    >
      <div className="flex gap-3">
        {/* Icon with aria-label for accessibility */}
        {/* Requirements: 6.7 - Include appropriate alt text or aria-labels */}
        <div className={cn('shrink-0 mt-0.5', styles.icon)}>
          <Icon size={20} weight="duotone" aria-label={`${error.category} error`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Error message */}
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-medium', styles.text)}>
              {error.message}
              {/* Duplicate count badge */}
              {/* Requirements: 7.2 - Show duplicate count */}
              {showDuplicateBadge && (
                <span
                  className={cn(
                    'ml-2 inline-flex items-center justify-center',
                    'px-1.5 py-0.5 text-xs font-medium rounded-full',
                    'bg-current/10'
                  )}
                  aria-label={`This error occurred ${duplicateCount} times`}
                >
                  ×{duplicateCount}
                </span>
              )}
            </p>

            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className={cn(
                  'shrink-0 p-1 rounded-md transition-colors',
                  'hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-current',
                  styles.text
                )}
                aria-label="Dismiss error"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>

          {/* Suggestions */}
          {error.suggestions && error.suggestions.length > 0 && (
            <ul className={cn('mt-2 text-sm space-y-1', styles.text, 'opacity-80')}>
              {error.suggestions.slice(0, 3).map((suggestion, index) => (
                <li key={index} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Recovery actions and Report Issue button */}
          {/* Requirements: 2.1 - Include at least one actionable recovery button */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {error.recoveryActions.map((action, index) => (
              <RecoveryActionButton
                key={`${action.type}-${index}`}
                action={action}
                onExecute={handleRecoveryAction}
                isLoading={loadingAction !== null}
                loadingActionType={loadingAction}
                category={error.category}
              />
            ))}

            {/* Report Issue button */}
            {onReportIssue && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReportIssue}
                className="gap-1.5 text-muted-foreground"
              >
                <Bug size={14} aria-hidden="true" />
                Report Issue
              </Button>
            )}
          </div>

          {/* Error ID for reference */}
          <p className={cn('mt-2 text-xs', styles.text, 'opacity-60')}>Error ID: {error.id}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact inline error banner for smaller spaces
 *
 * Note: We render the icon directly based on category rather than storing
 * the component in a variable to avoid the "static-components" lint error.
 */
export function InlineErrorBanner({
  error,
  onDismiss,
  className,
}: Pick<ErrorBannerProps, 'error' | 'onDismiss' | 'className'>) {
  const styles = getCategoryStyles(error.category)

  // Render icon based on category
  const renderIcon = () => {
    const iconProps = {
      size: 16,
      weight: 'duotone' as const,
      className: styles.icon,
      'aria-hidden': true as const,
    }
    switch (error.category) {
      case 'auth':
        return <LockKey {...iconProps} />
      case 'network':
        return <WifiSlash {...iconProps} />
      case 'validation':
        return <WarningCircle {...iconProps} />
      case 'permission':
        return <ShieldWarning {...iconProps} />
      case 'notFound':
        return <MagnifyingGlass {...iconProps} />
      case 'rateLimit':
        return <Clock {...iconProps} />
      case 'payment':
        return <CreditCard {...iconProps} />
      case 'server':
        return <WarningCircle {...iconProps} />
      case 'unknown':
      default:
        return <WarningCircle {...iconProps} />
    }
  }

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
        styles.container,
        styles.text,
        className
      )}
    >
      {renderIcon()}
      <span className="flex-1 truncate">{error.message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-current/10"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default ErrorBanner
