import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw'
import type { TLResizeInfo } from '@tldraw/editor'
import type { TaskCardShape, TaskCardProps } from '@/lib/playground/types'
import { CheckSquare, Calendar, Flag } from '@phosphor-icons/react'

// ============================================================================
// Default Props
// ============================================================================

const defaultProps: TaskCardProps = {
  title: 'New Task',
  w: 260,
  h: 180,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  checklist: [],
  dueDate: '',
  assignees: [],
  priority: 'medium',
  status: 'todo',
}

// ============================================================================
// Shape Util
// ============================================================================

export class TaskCardShapeUtil extends ShapeUtil<TaskCardShape> {
  static override type = 'task-card' as const

  getDefaultProps(): TaskCardProps {
    return { ...defaultProps, createdAt: Date.now(), updatedAt: Date.now() }
  }

  getGeometry(shape: TaskCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override canResize() {
    return true
  }

  override onResize = (_shape: TaskCardShape, info: TLResizeInfo<TaskCardShape>) => {
    return {
      props: {
        w: Math.max(200, info.initialBounds.width * info.scaleX),
        h: Math.max(140, info.initialBounds.height * info.scaleY),
      },
    }
  }

  component(shape: TaskCardShape) {
    const { title, checklist, dueDate, priority, status } = shape.props

    const completedCount = checklist.filter((item) => item.completed).length
    const totalCount = checklist.length

    const priorityColors = {
      low: 'bg-gray-500/10 text-gray-500',
      medium: 'bg-blue-500/10 text-blue-500',
      high: 'bg-amber-500/10 text-amber-500',
      urgent: 'bg-red-500/10 text-red-500',
    }

    const statusColors = {
      todo: 'bg-gray-500/10 text-gray-500',
      'in-progress': 'bg-blue-500/10 text-blue-500',
      done: 'bg-green-500/10 text-green-500',
    }

    return (
      <HTMLContainer>
        <div
          className="w-full h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col select-none"
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/5 border-b border-border">
            <CheckSquare size={16} weight="duotone" className="text-blue-500" />
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
              Task
            </span>
            <span
              className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}
            >
              {status.replace('-', ' ')}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-3">
            <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2">
              {title}
            </h3>

            {/* Checklist Preview */}
            {totalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {dueDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar size={12} weight="duotone" />
                  <span>{dueDate}</span>
                </div>
              )}
              <div
                className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityColors[priority]}`}
              >
                <Flag size={10} weight="duotone" />
                <span className="capitalize">{priority}</span>
              </div>
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: TaskCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }
}
