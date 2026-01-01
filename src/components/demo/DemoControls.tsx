import { Play, Pause, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface DemoControlsProps {
  isPlaying: boolean
  currentScene: number
  sceneCount: number
  sceneTitle: string
  onPlayPause: () => void
  onClose?: () => void
}

export function DemoControls({
  isPlaying,
  currentScene,
  sceneCount,
  sceneTitle,
  onPlayPause,
  onClose,
}: DemoControlsProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {currentScene + 1} / {sceneCount}
        </span>
        <span className="text-sm font-medium truncate">{sceneTitle}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause demo' : 'Play demo'}
        >
          {isPlaying ? <Pause size={18} weight="duotone" /> : <Play size={18} weight="duotone" />}
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close demo"
            className="sm:hidden"
          >
            <X size={18} weight="bold" />
          </Button>
        )}
      </div>
    </div>
  )
}
