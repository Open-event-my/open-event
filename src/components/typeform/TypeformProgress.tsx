import { cn } from '@/lib/utils'

export interface TypeformProgressProps {
  current: number
  total: number
  showPercentage?: boolean
  className?: string
}

export function TypeformProgress({ current, total, className }: TypeformProgressProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className={cn('w-full bg-background/80 backdrop-blur-sm', className)}>
      {/* Progress bar container - sleek and minimal */}
      <div className="h-[3px] bg-muted/30 w-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-700 ease-out',
            'bg-linear-to-r from-primary via-primary to-primary/80'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
