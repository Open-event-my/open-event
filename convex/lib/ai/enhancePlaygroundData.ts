/**
 * Playground card types (backend representation)
 */
export interface CardPosition {
  x: number
  y: number
}

export interface ExtractedEventCard {
  id: string
  title: string
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
  position: CardPosition
  createdAt: number
  updatedAt: number
  w: number
  h: number
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface ExtractedTaskCard {
  id: string
  title: string
  checklist: ChecklistItem[]
  dueDate: string
  assignees: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in-progress' | 'done'
  position: CardPosition
  createdAt: number
  updatedAt: number
  w: number
  h: number
}

export interface ExtractedBudgetCard {
  id: string
  title: string
  category: 'venue' | 'catering' | 'marketing' | 'equipment' | 'staff' | 'other'
  estimatedAmount: number
  actualAmount: number
  currency: string
  status: 'planned' | 'committed' | 'paid'
  notes: string
  position: CardPosition
  createdAt: number
  updatedAt: number
  w: number
  h: number
}

export interface ExtractedNoteCard {
  id: string
  title: string
  content: string
  color: 'yellow' | 'purple' | 'green' | 'blue' | 'pink'
  position: CardPosition
  createdAt: number
  updatedAt: number
  w: number
  h: number
}

/**
 * Enhanced playground data returned by AI
 */
export interface EnhancedPlaygroundData {
  eventCards: ExtractedEventCard[]
  taskCards: ExtractedTaskCard[]
  budgetCards: ExtractedBudgetCard[]
  noteCards: ExtractedNoteCard[]
  warnings: AIWarning[]
  suggestions: string[]
}

export interface AIWarning {
  type: 'missing_field' | 'invalid_data' | 'suggestion'
  cardType: 'event' | 'task' | 'budget' | 'note'
  cardId: string
  message: string
}

/**
 * Enhances playground canvas data using Claude AI.
 * Validates, fills missing fields, and improves descriptions.
 *
 * @param data - Raw canvas data
 * @param apiKey - Anthropic API key
 * @returns Enhanced data with warnings and suggestions
 */
export async function enhancePlaygroundData(
  data: {
    eventCards: ExtractedEventCard[]
    taskCards: ExtractedTaskCard[]
    budgetCards: ExtractedBudgetCard[]
    noteCards: ExtractedNoteCard[]
  },
  apiKey: string
): Promise<EnhancedPlaygroundData> {
  const prompt = buildEnhancementPrompt(data)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for more consistent output
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const content = result.content[0].text

    // Parse the JSON response from Claude
    const enhanced = parseEnhancedData(content, data)
    return enhanced
  } catch (error) {
    console.error('AI enhancement failed:', error)
    // Return original data with error warning
    return {
      eventCards: data.eventCards,
      taskCards: data.taskCards,
      budgetCards: data.budgetCards,
      noteCards: data.noteCards,
      warnings: [
        {
          type: 'invalid_data',
          cardType: 'event',
          cardId: '',
          message: `AI enhancement failed: ${error}. Using original data.`,
        },
      ],
      suggestions: [],
    }
  }
}

/**
 * Builds the enhancement prompt for Claude
 */
function buildEnhancementPrompt(data: {
  eventCards: ExtractedEventCard[]
  taskCards: ExtractedTaskCard[]
  budgetCards: ExtractedBudgetCard[]
  noteCards: ExtractedNoteCard[]
}): string {
  return `You are an expert event planner helping to finalize event planning cards from a visual canvas.

Given a set of event, task, budget, and note cards, your job is to:
1. Validate all data fields
2. Fill in missing required fields with sensible defaults
3. Enhance descriptions to be professional and detailed
4. Suggest realistic budget amounts if missing or zero
5. Ensure dates are logical (future dates, end after start)
6. Provide warnings for any validation issues
7. Suggest improvements

**IMPORTANT**: You must respond with ONLY valid JSON matching this exact structure:

\`\`\`json
{
  "eventCards": [...],
  "taskCards": [...],
  "budgetCards": [...],
  "noteCards": [...],
  "warnings": [
    {
      "type": "missing_field" | "invalid_data" | "suggestion",
      "cardType": "event" | "task" | "budget" | "note",
      "cardId": "card-id",
      "message": "Description of the issue"
    }
  ],
  "suggestions": ["Overall suggestion 1", "Overall suggestion 2"]
}
\`\`\`

Current data:

${JSON.stringify(data, null, 2)}

Enhancement guidelines:
- For events: Ensure title, eventType, startDate, locationType are filled
- For events with missing budgets: Suggest realistic amounts based on expectedAttendees (e.g., $50-100 per attendee)
- For events with missing dates: Use reasonable future dates (e.g., 2-3 months from now)
- For tasks: Ensure title is descriptive, add due dates if missing
- For budgets: Ensure positive amounts, suggest realistic values based on category
- For notes: Enhance content to be more detailed and professional
- Flag any default values (like "New Event", "New Task") as needing attention

Respond with ONLY the JSON object, no markdown code blocks, no explanations.`
}

/**
 * Parses enhanced data from Claude's response
 */
function parseEnhancedData(
  content: string,
  originalData: {
    eventCards: ExtractedEventCard[]
    taskCards: ExtractedTaskCard[]
    budgetCards: ExtractedBudgetCard[]
    noteCards: ExtractedNoteCard[]
  }
): EnhancedPlaygroundData {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : content

    const parsed = JSON.parse(jsonStr)

    // Validate structure
    if (!parsed.eventCards || !parsed.taskCards || !parsed.budgetCards || !parsed.noteCards) {
      throw new Error('Invalid enhanced data structure')
    }

    return {
      eventCards: parsed.eventCards,
      taskCards: parsed.taskCards,
      budgetCards: parsed.budgetCards,
      noteCards: parsed.noteCards,
      warnings: parsed.warnings || [],
      suggestions: parsed.suggestions || [],
    }
  } catch (error) {
    console.error('Failed to parse enhanced data:', error)
    // Return original data if parsing fails
    return {
      eventCards: originalData.eventCards,
      taskCards: originalData.taskCards,
      budgetCards: originalData.budgetCards,
      noteCards: originalData.noteCards,
      warnings: [
        {
          type: 'invalid_data',
          cardType: 'event',
          cardId: '',
          message: `Failed to parse AI response. Using original data.`,
        },
      ],
      suggestions: [],
    }
  }
}

/**
 * Validates enhanced data to ensure no data loss
 */
export function validateEnhancedData(
  original: {
    eventCards: ExtractedEventCard[]
    taskCards: ExtractedTaskCard[]
    budgetCards: ExtractedBudgetCard[]
    noteCards: ExtractedNoteCard[]
  },
  enhanced: EnhancedPlaygroundData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check card counts match
  if (original.eventCards.length !== enhanced.eventCards.length) {
    errors.push(
      `Event card count mismatch: ${original.eventCards.length} -> ${enhanced.eventCards.length}`
    )
  }
  if (original.taskCards.length !== enhanced.taskCards.length) {
    errors.push(
      `Task card count mismatch: ${original.taskCards.length} -> ${enhanced.taskCards.length}`
    )
  }
  if (original.budgetCards.length !== enhanced.budgetCards.length) {
    errors.push(
      `Budget card count mismatch: ${original.budgetCards.length} -> ${enhanced.budgetCards.length}`
    )
  }
  if (original.noteCards.length !== enhanced.noteCards.length) {
    errors.push(
      `Note card count mismatch: ${original.noteCards.length} -> ${enhanced.noteCards.length}`
    )
  }

  // Check IDs are preserved
  const originalEventIds = new Set(original.eventCards.map((e) => e.id))
  const enhancedEventIds = new Set(enhanced.eventCards.map((e) => e.id))
  if (!setsEqual(originalEventIds, enhancedEventIds)) {
    errors.push('Event card IDs were modified or lost')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Helper to check if two sets are equal
 */
function setsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
  if (set1.size !== set2.size) return false
  for (const item of set1) {
    if (!set2.has(item)) return false
  }
  return true
}
