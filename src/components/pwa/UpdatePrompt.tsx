import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { ArrowsClockwise, X } from '@phosphor-icons/react'

interface UpdatePromptProps {
  onUpdate: () => void
}

export function UpdatePrompt({ onUpdate }: UpdatePromptProps) {
  const [show, setShow] = useState(true)
  const [countdown, setCountdown] = useState(10)

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!show) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setShow(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [show])

  if (!show) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl',
          'bg-card/95 backdrop-blur-xl',
          'border border-border/50',
          'shadow-xl shadow-black/10',
          'min-w-[280px]'
        )}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <ArrowsClockwise size={20} weight="duotone" className="text-indigo-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Update available</p>
          <p className="text-xs text-muted-foreground">A new version is ready</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShow(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
          <button
            onClick={onUpdate}
            className={cn(
              'px-3 py-1.5 rounded-lg',
              'bg-indigo-600 hover:bg-indigo-700 text-white',
              'text-xs font-medium transition-all'
            )}
          >
            Update
          </button>
        </div>

        {/* Countdown indicator */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-indigo-500/50 rounded-full transition-all duration-1000"
          style={{ width: `${(countdown / 10) * 100}%` }}
        />
      </div>
    </div>
  )
}
