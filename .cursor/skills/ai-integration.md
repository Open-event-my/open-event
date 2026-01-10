# AI Integration Skills

## OpenAI Function Calling

### Agent System Architecture

The project uses OpenAI GPT-4o-mini with function calling for an AI-powered event assistant.

**Key Components**:

- **13 AI Tools**: Event management, vendor/sponsor discovery
- **Confirmation Dialogs**: User confirmation before actions
- **Tool Execution**: Server-side tool execution
- **Rate Limiting**: AI usage tracking and limits

### Tool Definition Pattern

```typescript
// convex/lib/agent/tools.ts
import { z } from 'zod'

export const createEventTool = {
  name: 'createEvent',
  description: 'Create a new event with the specified details',
  parameters: z.object({
    title: z.string().describe('The event title'),
    description: z.string().optional().describe('Event description'),
    startDate: z.string().describe('ISO 8601 formatted start date'),
    endDate: z.string().describe('ISO 8601 formatted end date'),
    expectedAttendees: z.number().optional().describe('Expected number of attendees'),
  }),
}
```

### Tool Handler Pattern

```typescript
// convex/lib/agent/handlers.ts
import { action } from '../_generated/server'
import { createEventTool } from './tools'
import { api } from '../_generated/api'

export async function handleCreateEvent(
  ctx: ActionCtx,
  args: z.infer<typeof createEventTool.parameters>
) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error('Not authenticated')

  // Validate inputs
  const validation = createEventTool.parameters.safeParse(args)
  if (!validation.success) {
    throw new Error(`Invalid parameters: ${validation.error.message}`)
  }

  // Create event
  const eventId = await ctx.runMutation(api.events.create, {
    ...validation.data,
    organizerId: identity.subject as Id<'users'>,
  })

  return { eventId, message: 'Event created successfully' }
}
```

### AI Agent Chat Interface

```typescript
// src/components/agentic-v2/AgenticChatV2.tsx
import { useChat } from '@ai-sdk/react'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function AgenticChatV2() {
  const sendMessage = useAction(api.aiTools.sendMessage)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat', // Proxy to Convex action
    body: {
      tools: availableTools,
    },
    onToolCall: async ({ toolCall }) => {
      // Show confirmation dialog
      const confirmed = await showToolConfirmation(toolCall)
      if (!confirmed) return

      // Execute tool
      const result = await executeTool(toolCall)
      return result
    },
  })

  return (
    <div className="chat-container">
      {messages.map((message) => (
        <AgenticMessage key={message.id} message={message} />
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  )
}
```

### Tool Execution Flow

```
User Input → AI Agent → Tool Selection → Confirmation Dialog → Tool Execution → Result
```

## Available AI Tools

### Event Management Tools

1. **createEvent**: Create new events
2. **updateEvent**: Update existing events
3. **getEventDetails**: Get event information
4. **getUpcomingEvents**: List upcoming events

### Vendor Discovery Tools

5. **searchVendors**: Search for vendors
6. **addVendorToEvent**: Add vendor to event
7. **getRecommendedVendors**: Get AI recommendations
8. **getEventVendors**: List event vendors

### Sponsor Discovery Tools

9. **searchSponsors**: Search for sponsors
10. **addSponsorToEvent**: Add sponsor to event
11. **getRecommendedSponsors**: Get AI recommendations
12. **getEventSponsors**: List event sponsors

### Profile Tools

13. **getUserProfile**: Get user profile information

## Tool Confirmation Pattern

### Confirmation Dialog

```typescript
// src/components/agent/ToolConfirmationDialog.tsx
export function ToolConfirmationDialog({ toolCall, onConfirm, onCancel }) {
  const toolName = toolCall.name
  const args = toolCall.arguments

  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
        </DialogHeader>
        <div>
          <p>AI wants to execute: <strong>{toolName}</strong></p>
          <pre>{JSON.stringify(args, null, 2)}</pre>
        </div>
        <div className="flex gap-2">
          <Button onClick={onConfirm}>Confirm</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

## Rate Limiting

### AI Usage Tracking

```typescript
// convex/aiUsage.ts
export const trackAIUsage = internalMutation({
  args: {
    userId: v.id('users'),
    tokensUsed: v.number(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    // Track usage
    await ctx.db.insert('aiUsage', {
      userId: args.userId,
      tokensUsed: args.tokensUsed,
      model: args.model,
      timestamp: Date.now(),
    })

    // Check rate limits
    const usage = await ctx.db
      .query('aiUsage')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    const todayUsage = usage.filter((u) => {
      const date = new Date(u.timestamp)
      const today = new Date()
      return date.toDateString() === today.toDateString()
    })

    const totalTokens = todayUsage.reduce((sum, u) => sum + u.tokensUsed, 0)
    if (totalTokens > RATE_LIMIT) {
      throw new Error('Rate limit exceeded')
    }
  },
})
```

## AI Provider Pattern

### Provider Factory

```typescript
// convex/lib/ai/provider.ts
import { openai } from '@ai-sdk/openai'

export function getAIProvider() {
  return openai('gpt-4o-mini')
}

export async function generateResponse(prompt: string, tools: Tool[]) {
  const provider = getAIProvider()

  const response = await provider.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    tools: tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
  })

  return response
}
```

## Key Skills to Master

1. **OpenAI Function Calling**: Tool definitions, parameter schemas, execution
2. **Agent Architecture**: Chat interface, tool selection, execution flow
3. **Confirmation Dialogs**: User confirmation before actions
4. **Rate Limiting**: Usage tracking, limits, error handling
5. **Error Handling**: AI errors, tool execution errors, user feedback
6. **Type Safety**: Zod schemas, TypeScript types for tools
7. **Streaming Responses**: Real-time AI responses (if implemented)
8. **Tool Organization**: Tool categorization, documentation
