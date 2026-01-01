import { useEffect, useCallback } from 'react'
import { useDemoPlayer } from '@/hooks/use-demo-player'
import { DemoProgressBar } from './DemoProgressBar'
import { DemoControls } from './DemoControls'
import {
  SceneContainer,
  SubmitScene,
  NotificationScene,
  AIEvaluationScene,
  ApprovalScene,
  ConfirmationScene,
} from './scenes'

const SCENES = [
  { id: 'submit', title: 'Sponsor submits application', component: SubmitScene },
  { id: 'notification', title: 'Organizer receives notification', component: NotificationScene },
  { id: 'evaluation', title: 'AI evaluates sponsor fit', component: AIEvaluationScene },
  { id: 'approval', title: 'Organizer approves sponsor', component: ApprovalScene },
  { id: 'confirmation', title: 'Sponsor receives confirmation', component: ConfirmationScene },
]

interface DemoPlayerProps {
  onClose?: () => void
}

export function DemoPlayer({ onClose }: DemoPlayerProps) {
  const { currentScene, sceneProgress, isPlaying, play, pause, goToScene } = useDemoPlayer({
    sceneDuration: 7000,
    sceneCount: SCENES.length,
    autoPlay: true,
    loop: true,
  })

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        if (isPlaying) {
          pause()
        } else {
          play()
        }
      } else if (e.key === 'Escape') {
        onClose?.()
      } else if (e.key === 'ArrowRight') {
        goToScene(currentScene + 1)
      } else if (e.key === 'ArrowLeft') {
        goToScene(currentScene - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, play, pause, onClose, currentScene, goToScene])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="flex items-center justify-center px-4 pt-4">
        <DemoProgressBar
          currentScene={currentScene}
          sceneProgress={sceneProgress}
          sceneCount={SCENES.length}
          onSceneClick={goToScene}
        />
      </div>

      {/* Scene Area */}
      <div className="flex-1 relative min-h-[400px] overflow-hidden">
        {SCENES.map((scene, index) => (
          <SceneContainer key={scene.id} isActive={index === currentScene}>
            <scene.component progress={index === currentScene ? sceneProgress : 0} />
          </SceneContainer>
        ))}
      </div>

      {/* Controls */}
      <div className="px-4 pb-4">
        <DemoControls
          isPlaying={isPlaying}
          currentScene={currentScene}
          sceneCount={SCENES.length}
          sceneTitle={SCENES[currentScene].title}
          onPlayPause={handlePlayPause}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
