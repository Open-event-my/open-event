import { v } from 'convex/values'
import { action } from './_generated/server'
import { enhancePlaygroundData, type EnhancedPlaygroundData } from './lib/ai/enhancePlaygroundData'
import { internal } from './_generated/api'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

/**
 * Main action to finalize playground canvas data.
 * This orchestrates the entire finalization flow:
 * 1. Validates user authentication
 * 2. Optionally enhances data with AI
 * 3. Returns preview data for user confirmation
 *
 * Note: This action only prepares the data - actual database creation
 * happens in a separate action after user confirms the preview.
 */
export const finalizePlayground = action({
  args: {
    accessToken: v.optional(v.string()),
    canvasData: v.object({
      eventCards: v.array(v.any()),
      taskCards: v.array(v.any()),
      budgetCards: v.array(v.any()),
      noteCards: v.array(v.any()),
    }),
    enhanceWithAI: v.boolean(),
  },
  handler: async (ctx, args): Promise<EnhancedPlaygroundData> => {
    // 1. Validate authentication
    const user = await ctx.runQuery(internal.lib.auth.getCurrentUserInternal, {
      accessToken: args.accessToken,
    })
    if (!user) {
      throw new Error('Authentication required to finalize playground')
    }

    // 2. Basic validation - must have at least one event card
    if (args.canvasData.eventCards.length === 0) {
      throw new Error('At least one event card is required to finalize')
    }

    // 3. Check rate limit if AI enhancement is requested
    if (args.enhanceWithAI) {
      const rateLimitCheck = await ctx.runQuery(api.aiUsage.checkRateLimit, {
        userId: user._id,
      })

      if (!rateLimitCheck.allowed) {
        throw new Error(
          rateLimitCheck.reason || 'Rate limit exceeded. AI enhancement is temporarily unavailable.'
        )
      }
    }

    // 4. Enhance with AI if requested
    let enhancedData: EnhancedPlaygroundData

    if (args.enhanceWithAI) {
      // Get Anthropic API key from environment
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        throw new Error(
          'Anthropic API key not configured. Please set ANTHROPIC_API_KEY in Convex dashboard.'
        )
      }

      try {
        enhancedData = await enhancePlaygroundData(args.canvasData, apiKey)

        // Increment usage counter after successful AI call
        await ctx.runMutation(internal.aiUsage.incrementUsageInternal, {
          userId: user._id,
        })
      } catch (error) {
        console.error('AI enhancement failed:', error)
        // Fall back to original data with warning
        enhancedData = {
          eventCards: args.canvasData.eventCards,
          taskCards: args.canvasData.taskCards,
          budgetCards: args.canvasData.budgetCards,
          noteCards: args.canvasData.noteCards,
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
    } else {
      // No AI enhancement - use original data
      enhancedData = {
        eventCards: args.canvasData.eventCards,
        taskCards: args.canvasData.taskCards,
        budgetCards: args.canvasData.budgetCards,
        noteCards: args.canvasData.noteCards,
        warnings: [],
        suggestions: [],
      }
    }

    // 5. Return preview data (database creation happens in separate action)
    return enhancedData
  },
})

/**
 * Creates all database entries from finalized playground data.
 * This is called after user confirms the preview.
 *
 * Returns the IDs of created items for navigation.
 */
export const createFromPlayground = action({
  args: {
    accessToken: v.optional(v.string()),
    eventCards: v.array(v.any()),
    taskCards: v.array(v.any()),
    budgetCards: v.array(v.any()),
    noteCards: v.array(v.any()),
    proximityLinks: v.object({
      taskToEvent: v.any(), // Map serialized as object
      budgetToEvent: v.any(),
      noteToEvent: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await ctx.runQuery(internal.lib.auth.getCurrentUserInternal, {
      accessToken: args.accessToken,
    })
    if (!user) {
      throw new Error('Authentication required')
    }
    const eventIds: string[] = []
    const taskIds: string[] = []
    const budgetIds: string[] = []
    const noteIds: string[] = []

    // Map to track canvas card ID -> database event ID
    const cardIdToEventId = new Map<string, string>()

    try {
      // 1. Create all events first
      for (const eventCard of args.eventCards) {
        const eventId = await ctx.runMutation(internal.playgroundCreate.createEvent, {
          userId: user._id,
          data: eventCard,
        })
        eventIds.push(eventId)
        cardIdToEventId.set(eventCard.id, eventId)
      }

      // 2. Create tasks linked to events
      for (const taskCard of args.taskCards) {
        const linkedEventCardId = args.proximityLinks.taskToEvent[taskCard.id]
        const linkedEventId = linkedEventCardId ? cardIdToEventId.get(linkedEventCardId) : undefined

        if (!linkedEventId) {
          throw new Error(`Task "${taskCard.title || 'Untitled'}" must be linked to an event`)
        }

        const taskId = await ctx.runMutation(internal.playgroundCreate.createTask, {
          userId: user._id,
          eventId: linkedEventId as Id<'events'>,
          data: taskCard,
        })
        taskIds.push(taskId)
      }

      // 3. Create budgets linked to events
      for (const budgetCard of args.budgetCards) {
        const linkedEventCardId = args.proximityLinks.budgetToEvent[budgetCard.id]
        const linkedEventId = linkedEventCardId ? cardIdToEventId.get(linkedEventCardId) : undefined

        if (!linkedEventId) {
          throw new Error(
            `Budget item "${budgetCard.title || 'Untitled'}" must be linked to an event`
          )
        }

        const budgetId = await ctx.runMutation(internal.playgroundCreate.createBudget, {
          userId: user._id,
          eventId: linkedEventId as Id<'events'>,
          data: budgetCard,
        })
        budgetIds.push(budgetId)
      }

      // 4. Create notes (optionally linked to events)
      for (const noteCard of args.noteCards) {
        const linkedEventCardId = args.proximityLinks.noteToEvent[noteCard.id]
        const linkedEventId = linkedEventCardId ? cardIdToEventId.get(linkedEventCardId) : undefined

        const noteId = await ctx.runMutation(internal.playgroundCreate.createNote, {
          userId: user._id,
          eventId: linkedEventId as Id<'events'> | undefined,
          data: noteCard,
        })
        noteIds.push(noteId)
      }

      return {
        success: true,
        eventIds,
        taskIds,
        budgetIds,
        noteIds,
        summary: {
          eventsCreated: eventIds.length,
          tasksCreated: taskIds.length,
          budgetsCreated: budgetIds.length,
          notesCreated: noteIds.length,
        },
      }
    } catch (error) {
      console.error('Database creation failed:', error)
      // TODO: Implement rollback logic if needed
      throw new Error(`Failed to create database entries: ${error}`)
    }
  },
})
