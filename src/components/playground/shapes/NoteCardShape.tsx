import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw'
import type { TLResizeInfo } from '@tldraw/editor'
import type { NoteCardShape, NoteCardProps } from '@/lib/playground/types'
import { Note } from '@phosphor-icons/react'

// ============================================================================
// Default Props
// ============================================================================

const defaultProps: NoteCardProps = {
  title: 'Note',
  w: 220,
  h: 160,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  content: '',
  color: 'yellow',
}

// ============================================================================
// Shape Util
// ============================================================================

export class NoteCardShapeUtil extends ShapeUtil<NoteCardShape> {
  static override type = 'note-card' as const

  getDefaultProps(): NoteCardProps {
    return { ...defaultProps, createdAt: Date.now(), updatedAt: Date.now() }
  }

  getGeometry(shape: NoteCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override canResize() {
    return true
  }

  override onResize = (_shape: NoteCardShape, info: TLResizeInfo<NoteCardShape>) => {
    return {
      props: {
        w: Math.max(160, info.initialBounds.width * info.scaleX),
        h: Math.max(100, info.initialBounds.height * info.scaleY),
      },
    }
  }

  component(shape: NoteCardShape) {
    const { title, content, color } = shape.props

    const colorStyles = {
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
      purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
      green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
      blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
      pink: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
    }

    const iconColors = {
      yellow: 'text-yellow-600 dark:text-yellow-400',
      purple: 'text-purple-600 dark:text-purple-400',
      green: 'text-green-600 dark:text-green-400',
      blue: 'text-blue-600 dark:text-blue-400',
      pink: 'text-pink-600 dark:text-pink-400',
    }

    return (
      <HTMLContainer>
        <div
          className={`w-full h-full rounded-xl border shadow-sm overflow-hidden flex flex-col select-none ${colorStyles[color]}`}
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Note size={14} weight="duotone" className={iconColors[color]} />
            <span className={`text-xs font-semibold uppercase tracking-wide ${iconColors[color]}`}>
              Note
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 px-3 pb-3 overflow-hidden">
            <h3 className="font-medium text-foreground text-sm leading-tight mb-1">{title}</h3>
            {content && (
              <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                {content}
              </p>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: NoteCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }
}
