import type { Editor } from 'tldraw'
import type {
  PlaygroundCanvasData,
  ExtractedEventCard,
  ExtractedTaskCard,
  ExtractedBudgetCard,
  ExtractedNoteCard,
  EventCardShape,
  TaskCardShape,
  BudgetCardShape,
  NoteCardShape,
} from './types'

/**
 * Extracts all card data from the tldraw canvas editor.
 * Includes card properties and canvas position for proximity linking.
 *
 * @param editor - The tldraw editor instance
 * @returns Structured canvas data with all card types
 */
export function extractCanvasData(editor: Editor): PlaygroundCanvasData {
  const shapes = editor.getCurrentPageShapes()

  // Filter shapes by type
  const eventCards = shapes.filter((s) => s.type === 'event-card') as EventCardShape[]
  const taskCards = shapes.filter((s) => s.type === 'task-card') as TaskCardShape[]
  const budgetCards = shapes.filter((s) => s.type === 'budget-card') as BudgetCardShape[]
  const noteCards = shapes.filter((s) => s.type === 'note-card') as NoteCardShape[]

  return {
    eventCards: eventCards.map(extractEventCard),
    taskCards: taskCards.map(extractTaskCard),
    budgetCards: budgetCards.map(extractBudgetCard),
    noteCards: noteCards.map(extractNoteCard),
  }
}

/**
 * Extracts event card data with position
 */
function extractEventCard(shape: EventCardShape): ExtractedEventCard {
  return {
    id: shape.id,
    ...shape.props,
    position: { x: shape.x, y: shape.y },
  }
}

/**
 * Extracts task card data with position
 */
function extractTaskCard(shape: TaskCardShape): ExtractedTaskCard {
  return {
    id: shape.id,
    ...shape.props,
    position: { x: shape.x, y: shape.y },
  }
}

/**
 * Extracts budget card data with position
 */
function extractBudgetCard(shape: BudgetCardShape): ExtractedBudgetCard {
  return {
    id: shape.id,
    ...shape.props,
    position: { x: shape.x, y: shape.y },
  }
}

/**
 * Extracts note card data with position
 */
function extractNoteCard(shape: NoteCardShape): ExtractedNoteCard {
  return {
    id: shape.id,
    ...shape.props,
    position: { x: shape.x, y: shape.y },
  }
}

/**
 * Validates extracted canvas data before finalization
 *
 * @param data - The extracted canvas data
 * @returns Validation result with errors if any
 */
export function validateCanvasData(data: PlaygroundCanvasData): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Must have at least one event card
  if (data.eventCards.length === 0) {
    errors.push('At least one event card is required')
  }

  // Validate event cards
  data.eventCards.forEach((event, index) => {
    if (!event.title || event.title.trim() === '' || event.title === 'New Event') {
      errors.push(`Event card ${index + 1}: Title is required`)
    }
    if (!event.eventType) {
      errors.push(`Event card ${index + 1}: Event type is required`)
    }
    if (!event.locationType) {
      errors.push(`Event card ${index + 1}: Location type is required`)
    }
  })

  // Validate task cards
  data.taskCards.forEach((task, index) => {
    if (!task.title || task.title.trim() === '' || task.title === 'New Task') {
      errors.push(`Task card ${index + 1}: Title is required`)
    }
  })

  // Validate budget cards
  data.budgetCards.forEach((budget, index) => {
    if (!budget.title || budget.title.trim() === '' || budget.title === 'Budget Item') {
      errors.push(`Budget card ${index + 1}: Title is required`)
    }
    if (budget.estimatedAmount < 0) {
      errors.push(`Budget card ${index + 1}: Estimated amount cannot be negative`)
    }
    if (budget.actualAmount < 0) {
      errors.push(`Budget card ${index + 1}: Actual amount cannot be negative`)
    }
  })

  // Validate note cards
  data.noteCards.forEach((note, index) => {
    if (!note.title || note.title.trim() === '' || note.title === 'Note') {
      errors.push(`Note card ${index + 1}: Title is required`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Gets summary statistics for canvas data
 *
 * @param data - The extracted canvas data
 * @returns Summary statistics
 */
export function getCanvasDataSummary(data: PlaygroundCanvasData) {
  const totalBudget = data.eventCards.reduce((sum, event) => sum + (event.budget || 0), 0)
  const totalExpectedAttendees = data.eventCards.reduce(
    (sum, event) => sum + (event.expectedAttendees || 0),
    0
  )
  const totalTasks = data.taskCards.length
  const completedTasks = data.taskCards.filter((task) => task.status === 'done').length
  const totalBudgetItems = data.budgetCards.length
  const estimatedBudgetTotal = data.budgetCards.reduce((sum, b) => sum + b.estimatedAmount, 0)
  const actualBudgetTotal = data.budgetCards.reduce((sum, b) => sum + b.actualAmount, 0)

  return {
    totalEvents: data.eventCards.length,
    totalTasks,
    completedTasks,
    totalBudgetItems,
    totalNotes: data.noteCards.length,
    totalBudget,
    totalExpectedAttendees,
    estimatedBudgetTotal,
    actualBudgetTotal,
    budgetVariance: actualBudgetTotal - estimatedBudgetTotal,
  }
}
