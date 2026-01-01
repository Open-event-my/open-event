import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { getCurrentUser } from './lib/auth'

// Task categories for event planning
export const TASK_CATEGORIES = [
  { value: 'venue', label: 'Venue & Location' },
  { value: 'vendors', label: 'Vendors & Suppliers' },
  { value: 'sponsors', label: 'Sponsorship' },
  { value: 'marketing', label: 'Marketing & Promotion' },
  { value: 'logistics', label: 'Logistics & Operations' },
  { value: 'registration', label: 'Registration & Ticketing' },
  { value: 'content', label: 'Content & Speakers' },
  { value: 'legal', label: 'Legal & Permits' },
  { value: 'budget', label: 'Budget & Finance' },
  { value: 'other', label: 'Other' },
] as const

// Get all tasks for an event
export const listByEvent = query({
  args: {
    eventId: v.id('events'),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== user._id) return []

    const tasksQuery = ctx.db
      .query('eventTasks')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))

    const tasks = await tasksQuery.collect()

    // Filter by status if provided
    const filtered = args.status ? tasks.filter((t) => t.status === args.status) : tasks

    // Sort by sortOrder, then by priority (urgent first), then by dueDate
    return filtered.sort((a, b) => {
      // First by sortOrder if both have it
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder
      }
      // Then by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      // Then by due date (tasks without due date go last)
      if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
  },
})

// Get task summary/stats for an event
export const getSummary = query({
  args: { eventId: v.id('events') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== user._id) return null

    const tasks = await ctx.db
      .query('eventTasks')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()

    const now = Date.now()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTs = today.getTime()
    const weekFromNow = todayTs + 7 * 24 * 60 * 60 * 1000

    const byStatus = {
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    }

    const overdue = tasks.filter(
      (t) => t.dueDate && t.dueDate < now && t.status !== 'completed'
    ).length

    const dueThisWeek = tasks.filter(
      (t) =>
        t.dueDate && t.dueDate >= todayTs && t.dueDate <= weekFromNow && t.status !== 'completed'
    ).length

    const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length

    const completionRate =
      tasks.length > 0 ? Math.round((byStatus.completed / tasks.length) * 100) : 0

    return {
      total: tasks.length,
      byStatus,
      overdue,
      dueThisWeek,
      urgent,
      completionRate,
    }
  },
})

// Create a task
export const create = mutation({
  args: {
    eventId: v.id('events'),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('urgent'))
    ),
    status: v.optional(
      v.union(
        v.literal('todo'),
        v.literal('in_progress'),
        v.literal('blocked'),
        v.literal('completed')
      )
    ),
    dueDate: v.optional(v.number()),
    linkedVendorId: v.optional(v.id('vendors')),
    linkedSponsorId: v.optional(v.id('sponsors')),
    linkedBudgetItemId: v.optional(v.id('budgetItems')),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or access denied')
    }

    // Get max sortOrder
    const existingTasks = await ctx.db
      .query('eventTasks')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect()
    const maxOrder = existingTasks.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0)

    return await ctx.db.insert('eventTasks', {
      eventId: args.eventId,
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority || 'medium',
      status: args.status || 'todo',
      dueDate: args.dueDate,
      linkedVendorId: args.linkedVendorId,
      linkedSponsorId: args.linkedSponsorId,
      linkedBudgetItemId: args.linkedBudgetItemId,
      notes: args.notes,
      sortOrder: maxOrder + 1,
      createdAt: Date.now(),
    })
  },
})

// Update a task
export const update = mutation({
  args: {
    id: v.id('eventTasks'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high'), v.literal('urgent'))
    ),
    status: v.optional(
      v.union(
        v.literal('todo'),
        v.literal('in_progress'),
        v.literal('blocked'),
        v.literal('completed')
      )
    ),
    dueDate: v.optional(v.number()),
    linkedVendorId: v.optional(v.id('vendors')),
    linkedSponsorId: v.optional(v.id('sponsors')),
    linkedBudgetItemId: v.optional(v.id('budgetItems')),
    sortOrder: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const task = await ctx.db.get(args.id)
    if (!task) throw new Error('Task not found')

    // Verify user owns the event
    const event = await ctx.db.get(task.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Access denied')
    }

    const { id, ...updates } = args
    const cleanUpdates: Record<string, unknown> = {}

    // Copy over defined values
    if (updates.title !== undefined) cleanUpdates.title = updates.title
    if (updates.description !== undefined) cleanUpdates.description = updates.description
    if (updates.category !== undefined) cleanUpdates.category = updates.category
    if (updates.priority !== undefined) cleanUpdates.priority = updates.priority
    if (updates.status !== undefined) cleanUpdates.status = updates.status
    if (updates.dueDate !== undefined) cleanUpdates.dueDate = updates.dueDate
    if (updates.linkedVendorId !== undefined) cleanUpdates.linkedVendorId = updates.linkedVendorId
    if (updates.linkedSponsorId !== undefined)
      cleanUpdates.linkedSponsorId = updates.linkedSponsorId
    if (updates.linkedBudgetItemId !== undefined)
      cleanUpdates.linkedBudgetItemId = updates.linkedBudgetItemId
    if (updates.sortOrder !== undefined) cleanUpdates.sortOrder = updates.sortOrder
    if (updates.notes !== undefined) cleanUpdates.notes = updates.notes

    // If marking as completed and not already completed, set completedAt
    if (updates.status === 'completed' && task.status !== 'completed') {
      cleanUpdates.completedAt = Date.now()
    }

    cleanUpdates.updatedAt = Date.now()

    await ctx.db.patch(id, cleanUpdates)

    // If unmarking completed, clear completedAt separately
    if (updates.status && updates.status !== 'completed' && task.status === 'completed') {
      await ctx.db.patch(id, { completedAt: undefined })
    }

    return id
  },
})

// Toggle task completion (quick action)
export const toggleComplete = mutation({
  args: { id: v.id('eventTasks') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const task = await ctx.db.get(args.id)
    if (!task) throw new Error('Task not found')

    // Verify user owns the event
    const event = await ctx.db.get(task.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Access denied')
    }

    const isCompleted = task.status === 'completed'
    await ctx.db.patch(args.id, {
      status: isCompleted ? 'todo' : 'completed',
      completedAt: isCompleted ? undefined : Date.now(),
      updatedAt: Date.now(),
    })

    return !isCompleted
  },
})

// Delete a task
export const remove = mutation({
  args: { id: v.id('eventTasks') },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    const task = await ctx.db.get(args.id)
    if (!task) throw new Error('Task not found')

    // Verify user owns the event
    const event = await ctx.db.get(task.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Access denied')
    }

    await ctx.db.delete(args.id)
  },
})

// Bulk create tasks from templates
export const createFromTemplate = mutation({
  args: {
    eventId: v.id('events'),
    template: v.string(), // 'conference', 'workshop', 'hackathon', etc.
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify user owns the event
    const event = await ctx.db.get(args.eventId)
    if (!event || event.organizerId !== user._id) {
      throw new Error('Event not found or access denied')
    }

    // Template tasks based on event type
    const templates: Record<
      string,
      Array<{ title: string; category: string; priority: 'low' | 'medium' | 'high' | 'urgent' }>
    > = {
      conference: [
        { title: 'Secure venue and sign contract', category: 'venue', priority: 'urgent' },
        { title: 'Create event budget breakdown', category: 'budget', priority: 'high' },
        {
          title: 'Research and contact potential sponsors',
          category: 'sponsors',
          priority: 'high',
        },
        { title: 'Book catering vendor', category: 'vendors', priority: 'high' },
        { title: 'Hire AV equipment provider', category: 'vendors', priority: 'medium' },
        { title: 'Set up registration platform', category: 'registration', priority: 'high' },
        { title: 'Design marketing materials', category: 'marketing', priority: 'medium' },
        { title: 'Launch social media campaign', category: 'marketing', priority: 'medium' },
        { title: 'Confirm speaker lineup', category: 'content', priority: 'high' },
        { title: 'Arrange transportation for VIPs', category: 'logistics', priority: 'low' },
        { title: 'Obtain necessary permits', category: 'legal', priority: 'medium' },
        { title: 'Hire event photographer', category: 'vendors', priority: 'low' },
      ],
      workshop: [
        { title: 'Book workshop venue', category: 'venue', priority: 'urgent' },
        { title: 'Finalize workshop curriculum', category: 'content', priority: 'high' },
        { title: 'Prepare workshop materials', category: 'content', priority: 'high' },
        { title: 'Set up registration', category: 'registration', priority: 'medium' },
        { title: 'Arrange catering for breaks', category: 'vendors', priority: 'medium' },
        { title: 'Promote workshop on social media', category: 'marketing', priority: 'medium' },
        { title: 'Test all equipment and tech', category: 'logistics', priority: 'high' },
      ],
      hackathon: [
        { title: 'Secure hackathon venue', category: 'venue', priority: 'urgent' },
        { title: 'Reach out to tech sponsors', category: 'sponsors', priority: 'high' },
        { title: 'Define hackathon challenges/tracks', category: 'content', priority: 'high' },
        { title: 'Set up judging criteria and panel', category: 'content', priority: 'high' },
        { title: 'Arrange prizes and swag', category: 'sponsors', priority: 'medium' },
        { title: 'Organize food and refreshments', category: 'vendors', priority: 'high' },
        { title: 'Set up WiFi and power stations', category: 'logistics', priority: 'urgent' },
        { title: 'Create participant registration', category: 'registration', priority: 'high' },
        { title: 'Plan mentorship program', category: 'content', priority: 'medium' },
        { title: 'Prepare demo/presentation setup', category: 'logistics', priority: 'medium' },
      ],
      networking: [
        { title: 'Book networking event venue', category: 'venue', priority: 'urgent' },
        { title: 'Arrange food and drinks', category: 'vendors', priority: 'high' },
        { title: 'Create guest list and invitations', category: 'registration', priority: 'high' },
        { title: 'Design name badges', category: 'marketing', priority: 'medium' },
        { title: 'Plan icebreaker activities', category: 'content', priority: 'medium' },
        { title: 'Hire DJ or background music', category: 'vendors', priority: 'low' },
      ],
    }

    const templateTasks = templates[args.template] || templates.conference
    const createdIds: string[] = []

    for (let i = 0; i < templateTasks.length; i++) {
      const task = templateTasks[i]
      const id = await ctx.db.insert('eventTasks', {
        eventId: args.eventId,
        title: task.title,
        category: task.category,
        priority: task.priority,
        status: 'todo',
        sortOrder: i + 1,
        createdAt: Date.now(),
      })
      createdIds.push(id)
    }

    return createdIds
  },
})

// Reorder tasks (for drag-and-drop)
export const reorder = mutation({
  args: {
    taskIds: v.array(v.id('eventTasks')),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Not authenticated')

    // Verify ownership of all tasks
    for (let i = 0; i < args.taskIds.length; i++) {
      const task = await ctx.db.get(args.taskIds[i])
      if (!task) continue

      const event = await ctx.db.get(task.eventId)
      if (!event || event.organizerId !== user._id) {
        throw new Error('Access denied')
      }

      await ctx.db.patch(args.taskIds[i], {
        sortOrder: i + 1,
        updatedAt: Date.now(),
      })
    }
  },
})
