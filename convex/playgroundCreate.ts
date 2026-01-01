import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

/**
 * Internal mutations for creating database entries from playground cards.
 * These are called by the main finalization action.
 */

/**
 * Creates an event from playground event card data
 */
export const createEvent = internalMutation({
  args: {
    userId: v.id('users'),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<string> => {
    const eventCard = args.data

    // Parse dates (canvas stores as strings, DB needs timestamps)
    const startDate = eventCard.startDate
      ? new Date(`${eventCard.startDate} ${eventCard.startTime || '00:00'}`).getTime()
      : Date.now() + 30 * 24 * 60 * 60 * 1000 // Default: 30 days from now

    const endDate = eventCard.endDate
      ? new Date(`${eventCard.endDate} ${eventCard.endTime || '23:59'}`).getTime()
      : startDate + 24 * 60 * 60 * 1000 // Default: 1 day after start

    const eventId = await ctx.db.insert('events', {
      organizerId: args.userId,
      title: eventCard.title || 'Untitled Event',
      description: eventCard.description || '',
      eventType: eventCard.eventType || 'other',
      status: 'draft',

      // Dates
      startDate,
      endDate,
      timezone: 'UTC',

      // Location
      locationType: eventCard.locationType || 'in-person',
      venueName: eventCard.venueName || '',
      venueAddress: eventCard.venueAddress || '',
      virtualPlatform: '',

      // Budget & Scale
      expectedAttendees: eventCard.expectedAttendees || 0,
      budget: eventCard.budget || 0,
      budgetCurrency: 'USD',

      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return eventId as string
  },
})

/**
 * Creates a task from playground task card data
 */
export const createTask = internalMutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<string> => {
    const taskCard = args.data

    // Parse due date
    const dueDate = taskCard.dueDate
      ? new Date(taskCard.dueDate).getTime()
      : Date.now() + 7 * 24 * 60 * 60 * 1000 // Default: 7 days from now

    const taskId = await ctx.db.insert('eventTasks', {
      eventId: args.eventId,
      title: taskCard.title || 'Untitled Task',
      description: taskCard.description || '', // Task cards don't have description field
      status: taskCard.status || 'todo',
      priority: taskCard.priority || 'medium',
      dueDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: taskCard.status === 'done' ? Date.now() : undefined,
    })

    return taskId as string
  },
})

/**
 * Creates a budget item from playground budget card data
 */
export const createBudget = internalMutation({
  args: {
    userId: v.id('users'),
    eventId: v.id('events'),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<string> => {
    const budgetCard = args.data

    const budgetId = await ctx.db.insert('budgetItems', {
      eventId: args.eventId,
      category: budgetCard.category || 'misc',
      name: budgetCard.title || 'Budget Item',
      estimatedAmount: budgetCard.estimatedAmount || 0,
      actualAmount: budgetCard.actualAmount || 0,
      status: budgetCard.status || 'planned',
      notes: budgetCard.notes || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      paidAt: budgetCard.status === 'paid' ? Date.now() : undefined,
    })

    return budgetId as string
  },
})

/**
 * Creates a note from playground note card data
 */
export const createNote = internalMutation({
  args: {
    userId: v.id('users'),
    eventId: v.optional(v.id('events')),
    data: v.any(),
  },
  handler: async (ctx, args): Promise<string> => {
    const noteCard = args.data

    const noteId = await ctx.db.insert('notes', {
      eventId: args.eventId,
      organizerId: args.userId,
      title: noteCard.title || 'Note',
      content: noteCard.content || '',
      color: noteCard.color || 'yellow',
      tags: [], // Notes don't have tags in canvas
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return noteId as string
  },
})
