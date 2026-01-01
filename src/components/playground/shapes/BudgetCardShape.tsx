import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw'
import type { TLResizeInfo } from '@tldraw/editor'
import type { BudgetCardShape, BudgetCardProps } from '@/lib/playground/types'
import { CurrencyDollar, TrendUp, TrendDown } from '@phosphor-icons/react'

// ============================================================================
// Default Props
// ============================================================================

const defaultProps: BudgetCardProps = {
  title: 'Budget Item',
  w: 240,
  h: 160,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  category: 'other',
  estimatedAmount: 0,
  actualAmount: 0,
  currency: 'USD',
  status: 'planned',
  notes: '',
}

// ============================================================================
// Shape Util
// ============================================================================

export class BudgetCardShapeUtil extends ShapeUtil<BudgetCardShape> {
  static override type = 'budget-card' as const

  getDefaultProps(): BudgetCardProps {
    return { ...defaultProps, createdAt: Date.now(), updatedAt: Date.now() }
  }

  getGeometry(shape: BudgetCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override canResize() {
    return true
  }

  override onResize = (_shape: BudgetCardShape, info: TLResizeInfo<BudgetCardShape>) => {
    return {
      props: {
        w: Math.max(200, info.initialBounds.width * info.scaleX),
        h: Math.max(120, info.initialBounds.height * info.scaleY),
      },
    }
  }

  component(shape: BudgetCardShape) {
    const { title, category, estimatedAmount, actualAmount, currency, status } = shape.props

    const variance = actualAmount - estimatedAmount
    const variancePercent = estimatedAmount > 0 ? (variance / estimatedAmount) * 100 : 0

    const statusColors = {
      planned: 'bg-gray-500/10 text-gray-500',
      committed: 'bg-amber-500/10 text-amber-500',
      paid: 'bg-green-500/10 text-green-500',
    }

    const categoryLabels: Record<string, string> = {
      venue: 'Venue',
      catering: 'Catering',
      marketing: 'Marketing',
      equipment: 'Equipment',
      staff: 'Staff',
      other: 'Other',
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }

    return (
      <HTMLContainer>
        <div
          className="w-full h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col select-none"
          style={{ pointerEvents: 'all' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-green-500/5 border-b border-border">
            <CurrencyDollar size={16} weight="duotone" className="text-green-600" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
              {categoryLabels[category]}
            </span>
            <span
              className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[status]}`}
            >
              {status}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1">
              {title}
            </h3>

            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(estimatedAmount)}
            </div>

            {actualAmount > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  Actual: {formatCurrency(actualAmount)}
                </span>
                {variance !== 0 && (
                  <span
                    className={`flex items-center gap-0.5 ${variance > 0 ? 'text-red-500' : 'text-green-500'}`}
                  >
                    {variance > 0 ? <TrendUp size={12} /> : <TrendDown size={12} />}
                    {Math.abs(variancePercent).toFixed(0)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: BudgetCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />
  }
}
