# AI Agent System Documentation

> Complete documentation for Open Event's AI-powered event planning assistant.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [HTTP API Endpoints](#http-api-endpoints)
4. [Available Tools](#available-tools)
5. [Data Flow](#data-flow)
6. [Database Schema](#database-schema)
7. [Frontend Components](#frontend-components)
8. [Configuration](#configuration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The AI Agent System enables natural language event creation through an intelligent assistant powered by **OpenAI GPT-4o-mini** with **AI SDK** for streaming responses.

### Capabilities

| Capability               | Description                                         |
| ------------------------ | --------------------------------------------------- |
| **Event Creation**       | Parse natural language into structured event data   |
| **Vendor Search**        | Find catering, AV, photography, and other providers |
| **Sponsor Discovery**    | Connect with companies interested in sponsoring     |
| **Event Management**     | Update details, view information, manage attendees  |
| **Contextual Awareness** | Remembers user preferences and past events          |

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Interface                                 │
│                                                                          │
│  "I want to create a tech conference for 200 people next month"         │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Convex HTTP Endpoint                              │
│                                                                          │
│   POST /api/chat                                                         │
│   ├── Authenticate user via Convex Auth                                 │
│   ├── Load user profile for context                                     │
│   └── Stream response with AI SDK                                       │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           OpenAI GPT-4o-mini                             │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  System Prompt:                                              │       │
│   │  "You are an expert AI event planning assistant..."         │       │
│   │                                                              │       │
│   │  + User Context:                                             │       │
│   │  - Organization: Acme Corp                                   │       │
│   │  - Event Types: conferences, meetups                         │       │
│   │  - Experience: experienced                                   │       │
│   └─────────────────────────────────────────────────────────────┘       │
│                                                                          │
│   Available Tools: createEvent, searchVendors, addVendorToEvent, etc.   │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Tool Execution                                   │
│                                                                          │
│   Tool: createEvent                                                      │
│   ├── Requires Confirmation? ✅ Yes                                      │
│   └── Returns: pending_confirmation                                      │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Confirmation Dialog                                 │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │  🔧 Create Event                                             │       │
│   │                                                              │       │
│   │  Title: Tech Conference 2024                                 │       │
│   │  Date: January 15, 2024                                      │       │
│   │  Attendees: 200                                              │       │
│   │  Type: Conference                                            │       │
│   │                                                              │       │
│   │                        [Cancel]  [Confirm]                   │       │
│   └─────────────────────────────────────────────────────────────┘       │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      POST /api/chat/confirm                              │
│                                                                          │
│   Execute confirmed tool → Create event in database                      │
│   Return: { success: true, eventId: "abc123" }                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### File Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND                                     │
│                            (Convex)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   convex/                                                                │
│   │                                                                      │
│   ├── http.ts                      # HTTP streaming endpoints            │
│   │   ├── POST /api/chat           # Main chat endpoint                  │
│   │   ├── POST /api/chat/tool      # Tool execution                      │
│   │   └── POST /api/chat/confirm   # Confirmed execution                 │
│   │                                                                      │
│   ├── lib/agent/                   # Agent library                       │
│   │   ├── types.ts                 # TypeScript definitions              │
│   │   ├── tools.ts                 # 13 tool schemas                     │
│   │   └── handlers.ts              # Execution handlers                  │
│   │                                                                      │
│   ├── events.ts                    # Event mutations                     │
│   ├── vendors.ts                   # Vendor queries                      │
│   ├── sponsors.ts                  # Sponsor queries                     │
│   ├── eventVendors.ts              # Event-vendor relationships          │
│   ├── eventSponsors.ts             # Event-sponsor relationships         │
│   └── organizerProfiles.ts         # User profiles                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                              (React)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   src/                                                                   │
│   │                                                                      │
│   ├── pages/dashboard/                                                   │
│   │   ├── EventCreatePage.tsx      # AI chat interface                   │
│   │   └── EventDetailPage.tsx      # Event detail view                   │
│   │                                                                      │
│   ├── components/agent/                                                  │
│   │   ├── ToolExecutionCard.tsx    # Tool status display                 │
│   │   ├── ToolConfirmationDialog.tsx  # Action confirmation              │
│   │   └── SearchResultsCard.tsx    # Search results                      │
│   │                                                                      │
│   └── lib/                                                               │
│       └── agent-tools.ts           # Tool config & helpers               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          AI & Streaming                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  OpenAI GPT-4o-mini    │  Language model for natural language           │
│  AI SDK                │  Streaming responses & tool handling           │
│  @ai-sdk/openai        │  OpenAI provider for AI SDK                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            Backend                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Convex                │  Real-time database & serverless functions     │
│  HTTP Actions          │  Streaming endpoints for chat                  │
│  Mutations/Queries     │  Database operations                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            Frontend                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  React 19              │  UI framework                                  │
│  useChat hook          │  AI SDK React integration                      │
│  ShadCN UI             │  Component library                             │
│  Phosphor Icons        │  Consistent iconography                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## HTTP API Endpoints

### POST /api/chat

Main chat endpoint with streaming responses.

**Request:**

```typescript
{
  messages: CoreMessage[]  // Conversation history
}

// CoreMessage format:
{
  role: 'user' | 'assistant' | 'system'
  content: string
}
```

**Response:** Server-Sent Events (SSE) stream

```
data: {"type":"text-delta","textDelta":"Great! "}
data: {"type":"text-delta","textDelta":"Let me create that event..."}
data: {"type":"tool-call","toolCallId":"call_abc","toolName":"createEvent","args":{...}}
data: {"type":"finish","finishReason":"tool-calls"}
```

**Headers:**

```
Content-Type: text/event-stream
Access-Control-Allow-Origin: *
```

---

### POST /api/chat/tool

Execute a tool (auto-execute tools only).

**Request:**

```typescript
{
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}
```

**Response:**

```typescript
// For tools requiring confirmation:
{
  status: 'pending_confirmation'
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
}

// For auto-execute tools:
{
  toolCallId: string
  name: string
  success: boolean
  data?: unknown
  error?: string
  summary: string
}
```

---

### POST /api/chat/confirm

Execute a user-confirmed tool.

**Request:**

```typescript
{
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  conversationId?: string  // Optional: to link event to conversation
}
```

**Response:**

```typescript
{
  toolCallId: string
  name: string
  success: boolean
  data?: {
    eventId?: string
    vendorId?: string
    sponsorId?: string
  }
  summary: string
}
```

---

## Available Tools (13 Total)

### Tool Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONFIRMATION REQUIRED (4)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Tool              │  Description                    │  Icon            │
├────────────────────┼─────────────────────────────────┼──────────────────┤
│  createEvent       │  Create a new event             │  CalendarPlus    │
│  updateEvent       │  Update event details           │  PencilSimple    │
│  addVendorToEvent  │  Add vendor to event (persist)  │  Buildings       │
│  addSponsorToEvent │  Add sponsor to event (persist) │  Handshake       │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          AUTO-EXECUTE (9)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Tool                  │  Description                    │  Category    │
├────────────────────────┼─────────────────────────────────┼──────────────┤
│  getEventDetails       │  Get event information          │  Events      │
│  getUpcomingEvents     │  List upcoming events           │  Events      │
│  searchVendors         │  Search vendors by category     │  Vendors     │
│  getRecommendedVendors │  AI-matched vendor suggestions  │  Vendors     │
│  getEventVendors       │  List vendors linked to event   │  Vendors     │
│  searchSponsors        │  Search sponsors by industry    │  Sponsors    │
│  getRecommendedSponsors│  AI-matched sponsor suggestions │  Sponsors    │
│  getEventSponsors      │  List sponsors linked to event  │  Sponsors    │
│  getUserProfile        │  Get organizer profile          │  Profile     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Intelligent Matching Tools

The recommendation tools use scoring algorithms to find the best matches:

**getRecommendedVendors** scores based on:

- Vendor rating (0-50 points)
- Verified status (+20 points)
- Price range alignment with event budget (+15 points)

**getRecommendedSponsors** scores based on:

- Verified status (+20 points)
- Target event type match (+30 points)
- Budget alignment with event size (+10-20 points)
- Requested tier availability (+25 points)

### Tool Schemas

#### createEvent

```typescript
{
  name: 'createEvent',
  description: 'Create a new event with the provided details',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Event title' },
      description: { type: 'string', description: 'Event description' },
      eventType: {
        type: 'string',
        enum: ['conference', 'workshop', 'meetup', 'seminar',
               'networking', 'launch', 'celebration', 'other']
      },
      startDate: { type: 'string', description: 'ISO 8601 date string' },
      endDate: { type: 'string', description: 'ISO 8601 date string' },
      locationType: {
        type: 'string',
        enum: ['in-person', 'virtual', 'hybrid']
      },
      venueName: { type: 'string' },
      venueAddress: { type: 'string' },
      virtualPlatform: { type: 'string' },
      expectedAttendees: { type: 'number' },
      budget: { type: 'number' },
      budgetCurrency: { type: 'string', default: 'USD' },
      requirements: {
        type: 'object',
        properties: {
          catering: { type: 'boolean' },
          av: { type: 'boolean' },
          photography: { type: 'boolean' },
          security: { type: 'boolean' },
          transportation: { type: 'boolean' },
          decoration: { type: 'boolean' }
        }
      }
    },
    required: ['title', 'startDate']
  }
}
```

#### searchVendors

```typescript
{
  name: 'searchVendors',
  description: 'Search for vendors by category and location',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['catering', 'av', 'photography', 'videography',
               'decoration', 'security', 'transportation', 'venue']
      },
      location: { type: 'string' },
      minRating: { type: 'number', minimum: 1, maximum: 5 },
      maxBudget: { type: 'number' }
    }
  }
}
```

#### searchSponsors

```typescript
{
  name: 'searchSponsors',
  description: 'Search for sponsors by industry and tier',
  parameters: {
    type: 'object',
    properties: {
      industry: {
        type: 'string',
        enum: ['technology', 'finance', 'healthcare', 'retail',
               'education', 'entertainment', 'food', 'other']
      },
      tier: {
        type: 'string',
        enum: ['platinum', 'gold', 'silver', 'bronze']
      },
      minBudget: { type: 'number' }
    }
  }
}
```

#### getRecommendedVendors

```typescript
{
  name: 'getRecommendedVendors',
  description: 'Get AI-matched vendor recommendations for an event',
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'Event ID to match vendors for' },
      category: {
        type: 'string',
        enum: ['catering', 'av', 'photography', 'decoration',
               'security', 'transportation', 'entertainment', 'staffing']
      },
      limit: { type: 'number', description: 'Max results (default: 5)' }
    },
    required: ['eventId']
  }
}
```

#### getRecommendedSponsors

```typescript
{
  name: 'getRecommendedSponsors',
  description: 'Get AI-matched sponsor recommendations for an event',
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'Event ID to match sponsors for' },
      tier: {
        type: 'string',
        enum: ['platinum', 'gold', 'silver', 'bronze']
      },
      limit: { type: 'number', description: 'Max results (default: 5)' }
    },
    required: ['eventId']
  }
}
```

#### getEventVendors / getEventSponsors

```typescript
{
  name: 'getEventVendors', // or 'getEventSponsors'
  description: 'Get all vendors/sponsors linked to an event with status',
  parameters: {
    type: 'object',
    properties: {
      eventId: { type: 'string', description: 'Event ID' }
    },
    required: ['eventId']
  }
}
```

---

## Data Flow

### Event Creation Flow

```
┌─────────┐      ┌──────────────┐      ┌────────────┐      ┌──────────┐
│  User   │      │   Frontend   │      │   Convex   │      │  OpenAI  │
└────┬────┘      └──────┬───────┘      └─────┬──────┘      └────┬─────┘
     │                  │                    │                   │
     │ "Create a tech   │                    │                   │
     │  conference"     │                    │                   │
     │─────────────────>│                    │                   │
     │                  │                    │                   │
     │                  │ POST /api/chat     │                   │
     │                  │───────────────────>│                   │
     │                  │                    │                   │
     │                  │                    │ streamText()      │
     │                  │                    │──────────────────>│
     │                  │                    │                   │
     │                  │                    │<──────────────────│
     │                  │                    │ tool_call:        │
     │                  │                    │ createEvent       │
     │                  │                    │                   │
     │                  │<───────────────────│                   │
     │                  │ pending_confirmation                   │
     │                  │                    │                   │
     │<─────────────────│                    │                   │
     │ Show confirmation│                    │                   │
     │ dialog           │                    │                   │
     │                  │                    │                   │
     │ [Confirm]        │                    │                   │
     │─────────────────>│                    │                   │
     │                  │                    │                   │
     │                  │ POST /api/chat/confirm                 │
     │                  │───────────────────>│                   │
     │                  │                    │                   │
     │                  │                    │ ctx.db.insert()   │
     │                  │                    │───────┐           │
     │                  │                    │<──────┘           │
     │                  │                    │                   │
     │                  │<───────────────────│                   │
     │                  │ { success: true,   │                   │
     │                  │   eventId: "..." } │                   │
     │                  │                    │                   │
     │<─────────────────│                    │                   │
     │ Navigate to      │                    │                   │
     │ event detail     │                    │                   │
     │                  │                    │                   │
```

### Search Flow (Auto-Execute)

```
┌─────────┐      ┌──────────────┐      ┌────────────┐      ┌──────────┐
│  User   │      │   Frontend   │      │   Convex   │      │  OpenAI  │
└────┬────┘      └──────┬───────┘      └─────┬──────┘      └────┬─────┘
     │                  │                    │                   │
     │ "Find caterers   │                    │                   │
     │  in NYC"         │                    │                   │
     │─────────────────>│                    │                   │
     │                  │                    │                   │
     │                  │ POST /api/chat     │                   │
     │                  │───────────────────>│                   │
     │                  │                    │                   │
     │                  │                    │ streamText()      │
     │                  │                    │──────────────────>│
     │                  │                    │                   │
     │                  │                    │<──────────────────│
     │                  │                    │ tool_call:        │
     │                  │                    │ searchVendors     │
     │                  │                    │                   │
     │                  │                    │ executeHandler()  │
     │                  │                    │───────┐           │
     │                  │                    │<──────┘           │
     │                  │                    │ vendors: [...]    │
     │                  │                    │                   │
     │                  │<───────────────────│                   │
     │                  │ Stream: tool result│                   │
     │                  │ + AI response      │                   │
     │                  │                    │                   │
     │<─────────────────│                    │                   │
     │ Display search   │                    │                   │
     │ results          │                    │                   │
```

---

## Database Schema

### Core Tables

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              users                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  _id           │  Id<'users'>                                           │
│  clerkId       │  string           │  Auth provider user ID             │
│  email         │  string           │  User email                        │
│  name          │  string           │  Display name                      │
│  imageUrl      │  string?          │  Profile image                     │
│  role          │  'superadmin' | 'organizer'                            │
│  createdAt     │  number           │  Timestamp                         │
│  updatedAt     │  number?          │  Timestamp                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              events                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  _id               │  Id<'events'>                                      │
│  organizerId       │  Id<'users'>     │  Event owner                    │
│  title             │  string          │  Event title                    │
│  description       │  string?         │  Description                    │
│  eventType         │  string?         │  conference, meetup, etc.       │
│  startDate         │  number          │  Unix timestamp                 │
│  endDate           │  number?         │  Unix timestamp                 │
│  timezone          │  string?         │  e.g. "America/New_York"        │
│  locationType      │  'in-person' | 'virtual' | 'hybrid'                │
│  venueName         │  string?         │  Venue name                     │
│  venueAddress      │  string?         │  Full address                   │
│  virtualPlatform   │  string?         │  Zoom, Meet, etc.               │
│  expectedAttendees │  number?         │  Attendee count                 │
│  budget            │  number?         │  Budget amount                  │
│  budgetCurrency    │  string?         │  USD, EUR, etc.                 │
│  requirements      │  object?         │  Catering, AV, etc.             │
│  status            │  'draft' | 'planning' | 'active' | 'completed'     │
│  createdAt         │  number          │  Timestamp                      │
│  updatedAt         │  number?         │  Timestamp                      │
└─────────────────────────────────────────────────────────────────────────┘

```

> **Note:** Agent conversations are ephemeral and stored in the browser's localStorage.
> This keeps the database lean since agent conversations are task-oriented rather than
> persistent chat history.

### Indexes

```typescript
// users
by_email: ['email'] // Fast lookup by email

// events
by_organizer: ['organizerId'] // User's events
by_status: ['status'] // Filter by status
```

---

## Frontend Components

### EventCreatePage

Main chat interface for AI interaction.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← AI Event Assistant                                    ⚡ Agentic     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🤖  Hi! I'm your AI event planning assistant.                     │  │
│  │     I can help you:                                               │  │
│  │     • Create events - describe and I'll set it up                 │  │
│  │     • Find vendors - catering, AV, photography                    │  │
│  │     • Discover sponsors - find interested companies               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│                        ┌─────────────────────────────────────────────┐  │
│                        │ I want to create a tech conference          │  │
│                        │ for 200 people next month              👤   │  │
│                        └─────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 🤖  Great! Let me create that for you...                          │  │
│  │                                                                    │  │
│  │     ┌─────────────────────────────────────────────────────────┐   │  │
│  │     │ 🔧 createEvent                              [Pending]   │   │  │
│  │     │                                                         │   │  │
│  │     │ Title: Tech Conference 2024                             │   │  │
│  │     │ Type: conference                                        │   │  │
│  │     │ Attendees: 200                                          │   │  │
│  │     │ Date: January 15, 2024                                  │   │  │
│  │     │                                                         │   │  │
│  │     │                          [Cancel]  [✓ Confirm]          │   │  │
│  │     └─────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Tell me about your event...]                                   [Send] │
└─────────────────────────────────────────────────────────────────────────┘
```

### ToolExecutionCard

Displays tool execution status.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  States:                                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐   │
│  │ 🔧 createEvent      [Pending]   │  │ 🔧 createEvent   [Running]  │   │
│  │                                 │  │                    ⏳       │   │
│  │ Waiting for confirmation...     │  │ Creating event...           │   │
│  └─────────────────────────────────┘  └─────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐   │
│  │ ✓ createEvent      [Success]   │  │ ✕ createEvent     [Failed]  │   │
│  │                                 │  │                             │   │
│  │ Event created successfully!     │  │ Failed to create event      │   │
│  └─────────────────────────────────┘  └─────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### ToolConfirmationDialog

Modal for confirming sensitive actions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│     ┌─────────────────────────────────────────────────────────────┐     │
│     │                                                             │     │
│     │   📅 Create Event                                           │     │
│     │                                                             │     │
│     │   ─────────────────────────────────────────────────────     │     │
│     │                                                             │     │
│     │   Title           Tech Conference 2024                      │     │
│     │   Type            Conference                                │     │
│     │   Date            January 15, 2024                          │     │
│     │   Location        In-Person                                 │     │
│     │   Venue           Convention Center                         │     │
│     │   Attendees       200                                       │     │
│     │   Budget          $10,000 USD                               │     │
│     │                                                             │     │
│     │   Requirements                                              │     │
│     │   🍽️ Catering  🎤 AV  📸 Photography                        │     │
│     │                                                             │     │
│     │   ─────────────────────────────────────────────────────     │     │
│     │                                                             │     │
│     │                           [Cancel]    [✓ Confirm]           │     │
│     │                                                             │     │
│     └─────────────────────────────────────────────────────────────┘     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Environment Variables

```bash
# Required - Convex
VITE_CONVEX_URL=https://your-project.convex.cloud

# Authentication is handled by Convex Auth
# No additional auth keys required for basic setup

# Required - OpenAI (set in Convex Dashboard → Settings → Environment Variables)
OPENAI_API_KEY=sk-...
```

### System Prompt

The AI agent uses a carefully crafted system prompt:

```
You are an expert AI event planning assistant for open-event...

## How to help users:
1. Understand their needs - Ask clarifying questions
2. Take action - Use your tools to create events, search, etc.
3. Be proactive - Suggest relevant vendors/sponsors
4. Confirm before acting - For important actions, confirm first

## Guidelines:
- Be conversational and helpful
- When you have enough information, USE YOUR TOOLS
- Always confirm before creating events or adding vendors
- Keep responses concise but informative

## User Context:
- Organization: {profile.organizationName}
- Event Types: {profile.eventTypes}
- Experience: {profile.experienceLevel}
```

---

## Testing

### Test Coverage

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Test Summary                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Component                    │  Tests  │  Coverage                     │
├───────────────────────────────┼─────────┼───────────────────────────────┤
│  agent-tools.ts               │  18     │  Tool config & helpers        │
│  ToolExecutionCard.tsx        │  11     │  All states & interactions    │
│  ToolConfirmationDialog.tsx   │  19     │  Confirmation flows           │
│  SearchResultsCard.tsx        │  21     │  Search result display        │
├───────────────────────────────┼─────────┼───────────────────────────────┤
│  TOTAL                        │  69     │                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Running Tests

```bash
# Watch mode (development)
npm run test

# Single run (CI)
npm run test:run

# With coverage report
npm run test:coverage
```

---

## Security

All agent tool executions are protected with multiple layers of security:

### Authentication

- All mutations require a valid authenticated user via `getCurrentUser(ctx)`
- Unauthenticated requests are rejected with "Not authenticated" error
- User identity is derived from the session, never from client input

### Authorization

- **Event ownership**: Only the event organizer can modify their events
- **Resource verification**: Before adding vendors/sponsors, the system verifies:
  - The event exists and belongs to the current user
  - The vendor/sponsor exists in the database
- **Duplicate prevention**: Attempts to add the same vendor/sponsor twice are handled gracefully

### Input Validation

- All inputs are validated using Convex validators (`v.id()`, `v.string()`, `v.number()`, etc.)
- Status values are whitelisted: only valid statuses like `'inquiry'`, `'negotiating'`, `'confirmed'`, `'declined'` are accepted
- Invalid status transitions are rejected with clear error messages

### Audit Trail

- All database records include `createdAt` timestamps
- Updates include `updatedAt` timestamps
- Relationships track status history through status field changes

---

## Troubleshooting

### Common Issues

| Issue                 | Cause                 | Solution                                 |
| --------------------- | --------------------- | ---------------------------------------- |
| "Unauthorized" error  | Missing auth          | Ensure user is signed in                 |
| "No OpenAI API key"   | Missing env var       | Set `OPENAI_API_KEY` in Convex Dashboard |
| Tool not executing    | Requires confirmation | Check if tool needs user confirmation    |
| Empty search results  | No data               | Seed database with test vendors/sponsors |
| Streaming not working | CORS issues           | Check HTTP headers in `http.ts`          |

### Debug Logging

The HTTP endpoint includes debug logging:

```typescript
onStepFinish: async ({ toolCalls, toolResults }) => {
  if (toolCalls && toolCalls.length > 0) {
    console.log(
      'Tool calls:',
      toolCalls.map((tc) => tc.toolName)
    )
  }
  if (toolResults && toolResults.length > 0) {
    console.log('Tool results:', toolResults.length)
  }
}
```

View logs in the Convex Dashboard → Logs tab.

### Rate Limiting

Currently, there's no rate limiting implemented. Consider adding:

```typescript
// Future enhancement
const RATE_LIMIT = 10 // requests per minute
const rateLimiter = new RateLimiter(RATE_LIMIT)
```

---

## Future Enhancements

- [ ] Token usage tracking & cost monitoring
- [ ] Rate limiting per user
- [ ] Multi-day and recurring event support
- [ ] Email notifications for confirmations
- [ ] Voice input for event creation
- [ ] Calendar integration (Google, Outlook)
- [x] Vendor/sponsor recommendation engine (implemented via `getRecommendedVendors` and `getRecommendedSponsors`)
- [x] Event-vendor/sponsor relationship persistence (implemented via `eventVendors` and `eventSponsors` tables)
