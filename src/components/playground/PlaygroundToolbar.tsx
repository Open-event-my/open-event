import { useCallback } from 'react'
import type { Editor } from 'tldraw'
import {
  CalendarBlank,
  CheckSquare,
  CurrencyDollar,
  Note,
  Sparkle,
  Plus,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PlaygroundToolbarProps {
  editor: Editor | null
  onFinalize: () => void
}

const cardTools = [
  {
    id: 'event',
    icon: CalendarBlank,
    label: 'Event',
    shapeType: 'event-card',
    color: 'text-purple',
  },
  { id: 'task', icon: CheckSquare, label: 'Task', shapeType: 'task-card', color: 'text-blue-500' },
  {
    id: 'budget',
    icon: CurrencyDollar,
    label: 'Budget',
    shapeType: 'budget-card',
    color: 'text-green-600',
  },
  { id: 'note', icon: Note, label: 'Note', shapeType: 'note-card', color: 'text-amber-500' },
]

export function PlaygroundToolbar({ editor, onFinalize }: PlaygroundToolbarProps) {
  const createCard = useCallback(
    (shapeType: string) => {
      if (!editor) return

      const { x, y } = editor.getViewportScreenCenter()
      const point = editor.screenToPage({ x, y })

      editor.createShape({
        type: shapeType,
        x: point.x - 140,
        y: point.y - 100,
      })
    },
    [editor]
  )

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
      {/* Left: Add Card Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'bg-foreground text-background hover:opacity-90 transition-all'
            )}
          >
            <Plus size={16} weight="bold" />
            <span>Add Card</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {cardTools.map((tool) => {
            const Icon = tool.icon
            return (
              <DropdownMenuItem
                key={tool.id}
                onClick={() => createCard(tool.shapeType)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <Icon size={18} weight="duotone" className={tool.color} />
                <span>{tool.label}</span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Center: Empty for clean look */}
      <div className="flex-1" />

      {/* Right: Finalize Button */}
      <button
        onClick={onFinalize}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
          'bg-purple text-white hover:bg-purple/90 transition-all'
        )}
      >
        <Sparkle size={16} weight="fill" />
        <span>Finalize</span>
      </button>
    </div>
  )
}
