import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseDemoPlayerOptions {
  /** Duration per scene in milliseconds */
  sceneDuration?: number
  /** Total number of scenes */
  sceneCount?: number
  /** Start playing automatically */
  autoPlay?: boolean
  /** Loop back to beginning when finished */
  loop?: boolean
}

export interface UseDemoPlayerReturn {
  /** Current scene index (0-based) */
  currentScene: number
  /** Progress within current scene (0-1) */
  sceneProgress: number
  /** Overall progress (0-1) */
  totalProgress: number
  /** Whether animation is currently playing */
  isPlaying: boolean
  /** Start or resume playback */
  play: () => void
  /** Pause playback */
  pause: () => void
  /** Reset to beginning */
  reset: () => void
  /** Jump to specific scene */
  goToScene: (scene: number) => void
}

/**
 * Hook for controlling a multi-scene demo animation.
 * Uses requestAnimationFrame for smooth, performant animations.
 * Automatically pauses on tab blur and respects reduced motion preferences.
 *
 * @param options - Configuration options
 * @returns Demo player state and controls
 *
 * @example
 * ```tsx
 * const { currentScene, isPlaying, play, pause } = useDemoPlayer({
 *   sceneDuration: 5000,
 *   sceneCount: 5,
 *   autoPlay: true,
 *   loop: true,
 * })
 * ```
 */
export function useDemoPlayer(options: UseDemoPlayerOptions = {}): UseDemoPlayerReturn {
  const { sceneDuration = 7000, sceneCount = 5, autoPlay = true, loop = true } = options

  // Initialize playing state respecting reduced motion preference
  const [isPlaying, setIsPlaying] = useState(() => {
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      return autoPlay && !prefersReducedMotion
    }
    return autoPlay
  })
  const [elapsed, setElapsed] = useState(0)
  const lastTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  const totalDuration = sceneDuration * sceneCount

  // Calculate derived values
  const totalProgress = elapsed / totalDuration
  const currentScene = Math.min(Math.floor(elapsed / sceneDuration), sceneCount - 1)
  const sceneProgress = (elapsed % sceneDuration) / sceneDuration

  // Start/stop animation loop
  useEffect(() => {
    if (!isPlaying) {
      return
    }

    lastTimeRef.current = null

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp
      }

      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      setElapsed((prev) => {
        const next = prev + delta
        if (next >= totalDuration) {
          if (loop) {
            return next % totalDuration
          } else {
            setIsPlaying(false)
            return totalDuration
          }
        }
        return next
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [isPlaying, totalDuration, loop])

  // Pause when tab loses focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        setIsPlaying(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isPlaying])

  const play = useCallback(() => setIsPlaying(true), [])
  const pause = useCallback(() => setIsPlaying(false), [])
  const reset = useCallback(() => {
    setElapsed(0)
    lastTimeRef.current = null
  }, [])
  const goToScene = useCallback(
    (scene: number) => {
      const clampedScene = Math.max(0, Math.min(scene, sceneCount - 1))
      setElapsed(clampedScene * sceneDuration)
      lastTimeRef.current = null
    },
    [sceneDuration, sceneCount]
  )

  return {
    currentScene,
    sceneProgress,
    totalProgress,
    isPlaying,
    play,
    pause,
    reset,
    goToScene,
  }
}
