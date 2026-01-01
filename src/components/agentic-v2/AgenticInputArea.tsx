import React, { memo, useCallback, forwardRef, useState, useEffect, useRef } from 'react'
import { PaperPlaneTilt, Microphone, CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AgenticInputAreaProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  placeholder: string
  isLoading: boolean
  showKeyboardHint?: boolean
}

// Optimized mobile detection with ResizeObserver
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const handleResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < 640)
      })
    }

    // Use ResizeObserver if available for better performance
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(handleResize)
      ro.observe(document.documentElement)
      return () => {
        ro.disconnect()
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return isMobile
}

export const AgenticInputArea = memo(
  forwardRef<HTMLTextAreaElement, AgenticInputAreaProps>(function AgenticInputArea(
    { value, onChange, onSubmit, disabled, placeholder, isLoading, showKeyboardHint = false },
    ref
  ) {
    const isMobile = useIsMobile()

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          if (value.trim() && !disabled) {
            onSubmit()
          }
        }
      },
      [value, disabled, onSubmit]
    )

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value)
      },
      [onChange]
    )

    const handleSubmitClick = useCallback(() => {
      if (value.trim() && !disabled) {
        onSubmit()
      }
    }, [value, disabled, onSubmit])

    const isReady = value.trim() && !isLoading && !disabled

    return (
      <div className="agentic-input-area-fixed">
        <div className="agentic-input-v2">
          <div className="agentic-input-v2-wrapper">
            <div className="agentic-input-v2-inner">
              <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="agentic-input-v2-textarea"
                rows={1}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                spellCheck="true"
              />
              <div className="agentic-input-v2-footer">
                <div className="agentic-input-v2-actions">
                  <button
                    className="agentic-input-v2-btn"
                    title="Voice input (coming soon)"
                    disabled
                    type="button"
                  >
                    <Microphone size={isMobile ? 20 : 18} weight="duotone" />
                  </button>
                </div>
                <button
                  onClick={handleSubmitClick}
                  disabled={!value.trim() || disabled}
                  type="button"
                  className={cn('agentic-input-v2-send', isReady && 'is-ready')}
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <CircleNotch size={isMobile ? 20 : 18} weight="bold" className="animate-spin" />
                  ) : (
                    <PaperPlaneTilt size={isMobile ? 20 : 18} weight="fill" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard hint - only on desktop when empty */}
        {showKeyboardHint && !isMobile && (
          <p className="text-center text-xs text-muted-foreground/40 mt-3">
            <kbd className="px-1.5 py-0.5 rounded bg-muted/30 font-mono text-[10px]">Enter</kbd> to
            send
          </p>
        )}
      </div>
    )
  })
)
