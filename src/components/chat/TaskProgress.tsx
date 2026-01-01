import { CheckCircle, Circle, CircleNotch, XCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'error'

export interface Task {
  id: string
  label: string
  status: TaskStatus
  description?: string
}

export interface TaskProgressProps {
  tasks: Task[]
  title?: string
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function TaskProgress({ tasks, title, className }: TaskProgressProps) {
  const completedCount = tasks.filter((t) => t.status === 'completed').length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className={cn('rounded-lg border border-border bg-card/50 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="font-medium text-sm">{title || 'Progress'}</h3>
        <span className="text-xs text-muted-foreground">
          {completedCount} / {totalCount} completed
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-muted/30">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              progressPercent === 100 ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="divide-y divide-border/50">
        {tasks.map((task, index) => (
          <TaskItem key={task.id} task={task} index={index} />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Task Item
// ============================================================================

interface TaskItemProps {
  task: Task
  index: number
}

function TaskItem({ task }: TaskItemProps) {
  const statusIcon = (() => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle size={18} weight="fill" className="text-green-500" />
      case 'in_progress':
        return <CircleNotch size={18} weight="bold" className="animate-spin text-primary" />
      case 'error':
        return <XCircle size={18} weight="fill" className="text-destructive" />
      default:
        return <Circle size={18} weight="duotone" className="text-muted-foreground" />
    }
  })()

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        task.status === 'in_progress' && 'bg-primary/5'
      )}
    >
      {statusIcon}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'text-sm',
            task.status === 'completed' && 'text-muted-foreground line-through',
            task.status === 'error' && 'text-destructive'
          )}
        >
          {task.label}
        </span>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Compact Task Progress (inline variant)
// ============================================================================

export interface CompactTaskProgressProps {
  current: number
  total: number
  label?: string
  className?: string
}

export function CompactTaskProgress({
  current,
  total,
  label,
  className,
}: CompactTaskProgressProps) {
  const progressPercent = total > 0 ? (current / total) * 100 : 0
  const isComplete = current === total

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {isComplete ? (
        <CheckCircle size={16} weight="fill" className="text-green-500" />
      ) : (
        <CircleNotch size={16} weight="bold" className="animate-spin text-primary" />
      )}

      <div className="flex-1">
        {label && <span className="text-xs text-muted-foreground block mb-1">{label}</span>}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              isComplete ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <span className="text-xs text-muted-foreground tabular-nums">
        {current}/{total}
      </span>
    </div>
  )
}

// ============================================================================
// Step Progress (numbered steps)
// ============================================================================

export interface Step {
  id: string
  label: string
  status: TaskStatus
}

export interface StepProgressProps {
  steps: Step[]
  className?: string
}

export function StepProgress({ steps, className }: StepProgressProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* Step indicator */}
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
              step.status === 'completed' && 'bg-green-500 text-white',
              step.status === 'in_progress' && 'bg-primary text-primary-foreground',
              step.status === 'error' && 'bg-destructive text-destructive-foreground',
              step.status === 'pending' && 'bg-muted text-muted-foreground'
            )}
          >
            {step.status === 'completed' ? (
              <CheckCircle size={14} weight="fill" />
            ) : step.status === 'in_progress' ? (
              <CircleNotch size={14} weight="bold" className="animate-spin" />
            ) : step.status === 'error' ? (
              <XCircle size={14} weight="fill" />
            ) : (
              index + 1
            )}
          </div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5 mx-1',
                step.status === 'completed' ? 'bg-green-500' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
