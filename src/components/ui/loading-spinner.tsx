import { CircleNotch } from '@phosphor-icons/react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
}

export function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <div className="text-center">
      <CircleNotch
        size={sizeMap[size]}
        weight="bold"
        className="animate-spin text-primary mx-auto mb-4"
      />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">{content}</div>
    )
  }

  return <div className="flex items-center justify-center p-8">{content}</div>
}
