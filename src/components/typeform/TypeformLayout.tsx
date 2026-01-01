import { type ReactNode, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { TypeformProgress } from './TypeformProgress'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

export interface TypeformLayoutProps {
  children: ReactNode
  /** Current step number (1-indexed) */
  currentStep: number
  /** Total number of steps */
  totalSteps: number
  /** Handler for going to previous step */
  onPrevious?: () => void
  /** Handler for going to next step */
  onNext?: () => void
  /** Whether the user can proceed to next step */
  canGoNext?: boolean
  /** Whether the user can go back (reserved for future use) */
  canGoPrevious?: boolean
  /** Link for the brand logo */
  brandLink?: string
  /** Additional class names */
  className?: string
  /** Whether to show the header */
  showHeader?: boolean
  /** Whether to enable Enter key to advance */
  enableKeyboardNav?: boolean
}

export function TypeformLayout({
  children,
  currentStep,
  totalSteps,
  onNext,
  canGoNext = true,
  brandLink = '/',
  className,
  showHeader = true,
  enableKeyboardNav = true,
}: TypeformLayoutProps) {
  // Handle Enter key to advance
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture if user is in a textarea or contenteditable
      const target = e.target as HTMLElement
      const isTextarea = target.tagName === 'TEXTAREA'
      const isContentEditable = target.isContentEditable

      if (e.key === 'Enter' && !e.shiftKey && canGoNext && onNext) {
        // For textareas, require Shift+Enter to submit
        if (isTextarea || isContentEditable) {
          return
        }
        e.preventDefault()
        onNext()
      }
    },
    [canGoNext, onNext]
  )

  useEffect(() => {
    if (!enableKeyboardNav) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardNav, handleKeyDown])

  return (
    <div className={cn('min-h-dvh flex flex-col bg-background', 'typeform-layout', className)}>
      {/* Fixed progress bar at top */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <TypeformProgress current={currentStep} total={totalSteps} />
      </div>

      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 pt-5 bg-background/80 backdrop-blur-sm">
          <Link to={brandLink} className="hover:opacity-80 transition-opacity">
            <Logo size="sm" showDomain={false} />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium tabular-nums">
              {currentStep}/{totalSteps}
            </span>
            <ThemeToggle />
          </div>
        </header>
      )}

      {/* Main content - centered vertically and horizontally */}
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="w-full max-w-xl lg:max-w-2xl typeform-content">{children}</div>
      </main>

      {/* Decorative Background - subtle gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-linear-to-t from-muted/10 to-transparent" />
      </div>
    </div>
  )
}
