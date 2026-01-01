import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw'
import type { TLResizeInfo } from '@tldraw/editor'
import type { EventCardShape, EventCardProps } from '@/lib/playground/types'
import { CalendarBlank, MapPin, Users, CurrencyDollar } from '@phosphor-icons/react'

// ============================================================================
// Default Props
// ============================================================================

const defaultProps: EventCardProps = {
  title: 'New Event',
  w: 280,
  h: 220,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  description: '',
  eventType: 'conference',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  locationType: 'in-person',
  venueName: '',
  venueAddress: '',
  expectedAttendees: 0,
  budget: 0,
  image: '',
}

// ============================================================================
// Shape Util
// ============================================================================

export class EventCardShapeUtil extends ShapeUtil<EventCardShape> {
  static override type = 'event-card' as const

  getDefaultProps(): EventCardProps {
    return { ...defaultProps, createdAt: Date.now(), updatedAt: Date.now() }
  }

  getGeometry(shape: EventCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override canResize() {
    return true
  }

  override onResize = (_shape: EventCardShape, info: TLResizeInfo<EventCardShape>) => {
    return {
      props: {
        w: Math.max(240, info.initialBounds.width * info.scaleX),
        h: Math.max(180, info.initialBounds.height * info.scaleY),
      },
    }
  }

  component(shape: EventCardShape) {
    const { title, eventType, startDate, venueName, expectedAttendees, budget, locationType } =
      shape.props

    return (
      <HTMLContainer>
        <div
          className="w-full h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col select-none"
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-purple/5 border-b border-border">
            <CalendarBlank size={16} weight="duotone" className="text-purple" />
            <span className="text-xs font-semibold text-purple uppercase tracking-wide">
              {eventType}
            </span>
            <span
              className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${
                locationType === 'virtual'
                  ? 'bg-blue-500/10 text-blue-500'
                  : locationType === 'hybrid'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-green-500/10 text-green-500'
              }`}
            >
              {locationType}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-3">
            <h3 className="font-semibold text-foreground text-base leading-tight line-clamp-2">
              {title}
            </h3>

            <div className="space-y-2 text-sm">
              {startDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarBlank size={14} weight="duotone" />
                  <span>{startDate}</span>
                </div>
              )}

              {venueName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} weight="duotone" />
                  <span className="truncate">{venueName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/30 text-xs text-muted-foreground">
            {expectedAttendees > 0 && (
              <div className="flex items-center gap-1">
                <Users size={12} weight="duotone" />
                <span>{expectedAttendees}</span>
              </div>
            )}
            {budget > 0 && (
              <div className="flex items-center gap-1">
                <CurrencyDollar size={12} weight="duotone" />
                <span>${budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: EventCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }
}
