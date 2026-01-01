import { Question, Plus, Trash, Gear, ArrowClockwise } from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'

// ============================================================================
// Types
// ============================================================================

export interface SlashCommand {
  id: string
  name: string
  description: string
  icon: ComponentType<IconProps>
  shortcut?: string
  action: () => void
}

// ============================================================================
// Default Commands Factory
// ============================================================================

export const createDefaultCommands = (handlers: {
  onNewChat?: () => void
  onClearChat?: () => void
  onShowHelp?: () => void
  onShowSettings?: () => void
  onRetry?: () => void
}): SlashCommand[] => [
  {
    id: 'help',
    name: 'Help',
    description: 'View help & shortcuts',
    icon: Question,
    shortcut: '?',
    action: handlers.onShowHelp || (() => {}),
  },
  {
    id: 'new',
    name: 'New Chat',
    description: 'Start a new conversation',
    icon: Plus,
    shortcut: 'N',
    action: handlers.onNewChat || (() => {}),
  },
  {
    id: 'clear',
    name: 'Clear',
    description: 'Clear current conversation',
    icon: Trash,
    action: handlers.onClearChat || (() => {}),
  },
  {
    id: 'retry',
    name: 'Retry',
    description: 'Retry last message',
    icon: ArrowClockwise,
    shortcut: 'R',
    action: handlers.onRetry || (() => {}),
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Open settings',
    icon: Gear,
    action: handlers.onShowSettings || (() => {}),
  },
]
