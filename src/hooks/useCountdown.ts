/**
 * Countdown Timer Hook
 *
 * Provides countdown functionality for rate limit errors and timed actions.
 * Requirements: 2.6
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * State returned by the useCountdown hook
 */
export interface CountdownState {
  /** Remaining seconds in the countdown */
  remainingSeconds: number
  /** Whether the countdown is currently active */
  isActive: boolean
  /** Whether the countdown has completed (reached 0) */
  isComplete: boolean
  /** Formatted time string (MM:SS or SS) */
  formattedTime: string
  /** Progress percentage (0-100, where 100 is complete) */
  progress: number
}

/**
 * Options for the useCountdown hook
 */
export interface UseCountdownOptions {
  /** Initial countdown duration in seconds */
  initialSeconds: number
  /** Whether to start the countdown automatically */
  autoStart?: boolean
  /** Callback when countdown completes */
  onComplete?: () => void
  /** Callback on each tick (every second) */
  onTick?: (remainingSeconds: number) => void
}

/**
 * Return type for the useCountdown hook
 */
export interface UseCountdownReturn extends CountdownState {
  /** Start or restart the countdown */
  start: (seconds?: number) => void
  /** Pause the countdown */
  pause: () => void
  /** Resume a paused countdown */
  resume: () => void
  /** Reset the countdown to initial state */
  reset: () => void
  /** Stop and reset the countdown */
  stop: () => void
}

/**
 * Format seconds into a readable time string
 * @param seconds - Number of seconds
 * @returns Formatted string (MM:SS for >= 60s, SS for < 60s)
 */
export function formatCountdownTime(seconds: number): string {
  if (seconds < 0) return '0'

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return secs.toString()
}

/**
 * Calculate progress percentage
 * @param remaining - Remaining seconds
 * @param total - Total seconds
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(remaining: number, total: number): number {
  if (total <= 0) return 100
  if (remaining <= 0) return 100
  return Math.round(((total - remaining) / total) * 100)
}

/**
 * Hook for managing countdown timers.
 *
 * Features:
 * - Countdown from specified seconds to 0
 * - Start, pause, resume, reset, and stop controls
 * - Formatted time display
 * - Progress tracking
 * - Callbacks for completion and ticks
 *
 * Requirements: 2.6
 *
 * @example
 * ```tsx
 * function RateLimitBanner() {
 *   const { remainingSeconds, isComplete, formattedTime, start } = useCountdown({
 *     initialSeconds: 60,
 *     autoStart: true,
 *     onComplete: () => console.log('Ready to retry!')
 *   })
 *
 *   return (
 *     <div>
 *       {isComplete ? (
 *         <Button onClick={handleRetry}>Retry Now</Button>
 *       ) : (
 *         <span>Please wait {formattedTime} before retrying</span>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCountdown(options: UseCountdownOptions): UseCountdownReturn {
  const { initialSeconds, autoStart = false, onComplete, onTick } = options

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds)
  const [isActive, setIsActive] = useState(autoStart)
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onCompleteRef = useRef(onComplete)
  const onTickRef = useRef(onTick)

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete
    onTickRef.current = onTick
  }, [onComplete, onTick])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Main countdown effect
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1

        // Call onTick callback
        onTickRef.current?.(newValue)

        if (newValue <= 0) {
          // Countdown complete
          setIsActive(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          // Call onComplete callback
          onCompleteRef.current?.()
          return 0
        }

        return newValue
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive])

  const start = useCallback(
    (seconds?: number) => {
      const duration = seconds ?? initialSeconds
      setTotalSeconds(duration)
      setRemainingSeconds(duration)
      setIsActive(true)
    },
    [initialSeconds]
  )

  const pause = useCallback(() => {
    setIsActive(false)
  }, [])

  const resume = useCallback(() => {
    if (remainingSeconds > 0) {
      setIsActive(true)
    }
  }, [remainingSeconds])

  const reset = useCallback(() => {
    setRemainingSeconds(initialSeconds)
    setTotalSeconds(initialSeconds)
    setIsActive(false)
  }, [initialSeconds])

  const stop = useCallback(() => {
    setRemainingSeconds(0)
    setIsActive(false)
  }, [])

  const isComplete = remainingSeconds <= 0
  const formattedTime = formatCountdownTime(remainingSeconds)
  const progress = calculateProgress(remainingSeconds, totalSeconds)

  return {
    remainingSeconds,
    isActive,
    isComplete,
    formattedTime,
    progress,
    start,
    pause,
    resume,
    reset,
    stop,
  }
}

/**
 * Hook for managing a countdown that syncs with a rate limit retry-after time.
 *
 * @example
 * ```tsx
 * function RateLimitError({ retryAfter }: { retryAfter: number }) {
 *   const countdown = useRateLimitCountdown(retryAfter, handleRetry)
 *
 *   return (
 *     <Button disabled={!countdown.isComplete} onClick={handleRetry}>
 *       {countdown.isComplete ? 'Retry' : `Wait ${countdown.formattedTime}`}
 *     </Button>
 *   )
 * }
 * ```
 */
export function useRateLimitCountdown(
  retryAfterSeconds: number,
  onReady?: () => void
): UseCountdownReturn {
  return useCountdown({
    initialSeconds: retryAfterSeconds,
    autoStart: true,
    onComplete: onReady,
  })
}

export default useCountdown
