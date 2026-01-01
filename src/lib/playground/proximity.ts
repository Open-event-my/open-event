import type {
  ExtractedEventCard,
  ExtractedTaskCard,
  ExtractedBudgetCard,
  ExtractedNoteCard,
  CardPosition,
} from './types'

/**
 * Result of proximity linking algorithm
 */
export interface ProximityLinks {
  taskToEvent: Map<string, string> // taskId -> eventId
  budgetToEvent: Map<string, string> // budgetId -> eventId
  noteToEvent: Map<string, string | null> // noteId -> eventId (or null for standalone)
}

/**
 * Links tasks, budgets, and notes to their nearest event cards based on Euclidean distance.
 * If no events exist, all links will be null/empty.
 *
 * @param events - Array of extracted event cards
 * @param tasks - Array of extracted task cards
 * @param budgets - Array of extracted budget cards
 * @param notes - Array of extracted note cards
 * @returns Mapping of card IDs to their nearest event ID
 */
export function linkCardsByProximity(
  events: ExtractedEventCard[],
  tasks: ExtractedTaskCard[],
  budgets: ExtractedBudgetCard[],
  notes: ExtractedNoteCard[]
): ProximityLinks {
  const taskToEvent = new Map<string, string>()
  const budgetToEvent = new Map<string, string>()
  const noteToEvent = new Map<string, string | null>()

  // Link each task to nearest event
  tasks.forEach((task) => {
    const nearest = findNearestEvent(task.position, events)
    if (nearest) {
      taskToEvent.set(task.id, nearest.id)
    }
  })

  // Link each budget to nearest event
  budgets.forEach((budget) => {
    const nearest = findNearestEvent(budget.position, events)
    if (nearest) {
      budgetToEvent.set(budget.id, nearest.id)
    }
  })

  // Link each note to nearest event (optional linking)
  notes.forEach((note) => {
    const nearest = findNearestEvent(note.position, events)
    noteToEvent.set(note.id, nearest ? nearest.id : null)
  })

  return { taskToEvent, budgetToEvent, noteToEvent }
}

/**
 * Finds the nearest event card to a given position using Euclidean distance.
 *
 * @param position - The position to find nearest event from
 * @param events - Array of event cards to search
 * @returns The nearest event card, or null if no events exist
 */
function findNearestEvent(
  position: CardPosition,
  events: ExtractedEventCard[]
): ExtractedEventCard | null {
  if (events.length === 0) {
    return null
  }

  let nearest: ExtractedEventCard | null = null
  let minDistance = Infinity

  events.forEach((event) => {
    const distance = calculateDistance(position, event.position)

    if (distance < minDistance) {
      minDistance = distance
      nearest = event
    }
  })

  return nearest
}

/**
 * Calculates Euclidean distance between two positions.
 *
 * @param pos1 - First position
 * @param pos2 - Second position
 * @returns The Euclidean distance
 */
function calculateDistance(pos1: CardPosition, pos2: CardPosition): number {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
}

/**
 * Groups tasks by their linked event ID.
 *
 * @param tasks - Array of extracted task cards
 * @param links - Proximity links mapping
 * @returns Map of eventId -> tasks array
 */
export function groupTasksByEvent(
  tasks: ExtractedTaskCard[],
  links: ProximityLinks
): Map<string, ExtractedTaskCard[]> {
  const grouped = new Map<string, ExtractedTaskCard[]>()

  tasks.forEach((task) => {
    const eventId = links.taskToEvent.get(task.id)
    if (eventId) {
      if (!grouped.has(eventId)) {
        grouped.set(eventId, [])
      }
      grouped.get(eventId)!.push(task)
    }
  })

  return grouped
}

/**
 * Groups budgets by their linked event ID.
 *
 * @param budgets - Array of extracted budget cards
 * @param links - Proximity links mapping
 * @returns Map of eventId -> budgets array
 */
export function groupBudgetsByEvent(
  budgets: ExtractedBudgetCard[],
  links: ProximityLinks
): Map<string, ExtractedBudgetCard[]> {
  const grouped = new Map<string, ExtractedBudgetCard[]>()

  budgets.forEach((budget) => {
    const eventId = links.budgetToEvent.get(budget.id)
    if (eventId) {
      if (!grouped.has(eventId)) {
        grouped.set(eventId, [])
      }
      grouped.get(eventId)!.push(budget)
    }
  })

  return grouped
}

/**
 * Groups notes by their linked event ID (or null for standalone notes).
 *
 * @param notes - Array of extracted note cards
 * @param links - Proximity links mapping
 * @returns Map of eventId (or 'null') -> notes array
 */
export function groupNotesByEvent(
  notes: ExtractedNoteCard[],
  links: ProximityLinks
): Map<string | 'null', ExtractedNoteCard[]> {
  const grouped = new Map<string | 'null', ExtractedNoteCard[]>()

  notes.forEach((note) => {
    const eventId = links.noteToEvent.get(note.id) || 'null'
    if (!grouped.has(eventId)) {
      grouped.set(eventId, [])
    }
    grouped.get(eventId)!.push(note)
  })

  return grouped
}

/**
 * Gets statistics about proximity links.
 *
 * @param links - Proximity links mapping
 * @returns Link statistics
 */
export function getProximityStats(links: ProximityLinks) {
  const linkedTasks = links.taskToEvent.size
  const linkedBudgets = links.budgetToEvent.size
  const linkedNotes = Array.from(links.noteToEvent.values()).filter((id) => id !== null).length
  const standaloneNotes = Array.from(links.noteToEvent.values()).filter((id) => id === null).length

  return {
    linkedTasks,
    linkedBudgets,
    linkedNotes,
    standaloneNotes,
    totalLinks: linkedTasks + linkedBudgets + linkedNotes,
  }
}
