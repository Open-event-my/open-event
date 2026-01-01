import { cn } from '@/lib/utils'
import { getToolConfig } from '@/lib/agent-tools'
import { Check, X, CircleNotch } from '@phosphor-icons/react'

interface ToolResult {
  toolCallId: string
  name: string
  success: boolean
  data?: unknown
  error?: string
  summary: string
}

interface ToolExecutionCardProps {
  toolName: string
  status: 'pending' | 'executing' | 'success' | 'error'
  result?: ToolResult
  className?: string
}

export function ToolExecutionCard({ toolName, status, result, className }: ToolExecutionCardProps) {
  const config = getToolConfig(toolName)
  const Icon = config.icon
  const label = config.executingLabel

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        status === 'executing' && 'border-primary/30 bg-primary/5',
        status === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
        status === 'error' && 'border-red-500/30 bg-red-500/5',
        status === 'pending' && 'border-border bg-muted/50',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          status === 'executing' && 'bg-primary/10',
          status === 'success' && 'bg-emerald-500/10',
          status === 'error' && 'bg-red-500/10',
          status === 'pending' && 'bg-muted'
        )}
      >
        {status === 'executing' ? (
          <CircleNotch size={16} className="animate-spin text-primary" />
        ) : (
          <Icon
            size={16}
            weight="duotone"
            className={cn(
              status === 'success' && 'text-emerald-500',
              status === 'error' && 'text-red-500',
              status === 'pending' && 'text-muted-foreground'
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {status === 'success' && <Check size={14} weight="bold" className="text-emerald-500" />}
          {status === 'error' && <X size={14} weight="bold" className="text-red-500" />}
        </div>
        {result && (
          <p
            className={cn(
              'text-xs mt-0.5',
              result.success ? 'text-muted-foreground' : 'text-red-500'
            )}
          >
            {result.summary}
          </p>
        )}
      </div>
    </div>
  )
}
