import type { TLBaseShape } from 'tldraw'

// ============================================================================
// Base Card Properties
// ============================================================================

export interface BaseCardProps {
  title: string
  w: number
  h: number
  createdAt: number
  updatedAt: number
}

// ============================================================================
// Event Card
// ============================================================================

export interface EventCardProps extends BaseCardProps {
  description: string
  eventType: 'conference' | 'workshop' | 'meetup' | 'webinar' | 'other'
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  locationType: 'in-person' | 'virtual' | 'hybrid'
  venueName: string
  venueAddress: string
  expectedAttendees: number
  budget: number
  image: string
}

export type EventCardShape = TLBaseShape<'event-card', EventCardProps>

// ============================================================================
// Task Card
// ============================================================================

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface TaskCardProps extends BaseCardProps {
  checklist: ChecklistItem[]
  dueDate: string
  assignees: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in-progress' | 'done'
}

export type TaskCardShape = TLBaseShape<'task-card', TaskCardProps>

// ============================================================================
// Budget Card
// ============================================================================

export interface BudgetCardProps extends BaseCardProps {
  category: 'venue' | 'catering' | 'marketing' | 'equipment' | 'staff' | 'other'
  estimatedAmount: number
  actualAmount: number
  currency: string
  status: 'planned' | 'committed' | 'paid'
  notes: string
}

export type BudgetCardShape = TLBaseShape<'budget-card', BudgetCardProps>

// ============================================================================
// Note Card
// ============================================================================

export interface NoteCardProps extends BaseCardProps {
  content: string // Markdown content
  color: 'yellow' | 'purple' | 'green' | 'blue' | 'pink'
}

export type NoteCardShape = TLBaseShape<'note-card', NoteCardProps>

// ============================================================================
// Union Types
// ============================================================================

export type PlaygroundCardShape = EventCardShape | TaskCardShape | BudgetCardShape | NoteCardShape

export type CardType = 'event-card' | 'task-card' | 'budget-card' | 'note-card'

// ============================================================================
// Constants
// ============================================================================

export const CARD_COLORS = {
  'event-card': 'purple',
  'task-card': 'blue',
  'budget-card': 'green',
  'note-card': 'yellow',
} as const

export const CARD_LABELS = {
  'event-card': 'Event',
  'task-card': 'Task',
  'budget-card': 'Budget',
  'note-card': 'Note',
} as const

export const DEFAULT_CARD_SIZE = {
  w: 280,
  h: 200,
} as const

// ============================================================================
// Extracted Card Data (with position for proximity linking)
// ============================================================================

export interface CardPosition {
  x: number
  y: number
}

export interface ExtractedEventCard extends EventCardProps {
  id: string
  position: CardPosition
}

export interface ExtractedTaskCard extends TaskCardProps {
  id: string
  position: CardPosition
}

export interface ExtractedBudgetCard extends BudgetCardProps {
  id: string
  position: CardPosition
}

export interface ExtractedNoteCard extends NoteCardProps {
  id: string
  position: CardPosition
}

export interface PlaygroundCanvasData {
  eventCards: ExtractedEventCard[]
  taskCards: ExtractedTaskCard[]
  budgetCards: ExtractedBudgetCard[]
  noteCards: ExtractedNoteCard[]
}
