# Open Event Architecture

This document provides an overview of the Open Event platform architecture, technology stack, and key design decisions.

## Tech Stack

| Layer      | Technology                | Purpose                           |
| ---------- | ------------------------- | --------------------------------- |
| Frontend   | React 19 + TypeScript     | UI framework                      |
| Build Tool | Vite 7                    | Fast dev server and bundler       |
| Styling    | Tailwind CSS 4            | Utility-first CSS                 |
| Backend    | Convex                    | Serverless database and functions |
| Auth       | Custom + @convex-dev/auth | Authentication system             |
| Testing    | Vitest + Playwright       | Unit and E2E tests                |
| PWA        | vite-plugin-pwa           | Offline support                   |

## Project Structure

```
open-event/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   │   ├── admin/          # Admin-only components
│   │   ├── agentic/        # AI chat components (V2)
│   │   ├── agentic-v2/     # Modular AI chat system
│   │   ├── agent/          # Agent tool components
│   │   ├── app/            # App-level components (TopBar, etc.)
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── events/         # Event management
│   │   ├── notifications/  # Notification system
│   │   ├── playground/     # Interactive playground
│   │   ├── sponsors/       # Sponsor management
│   │   ├── ui/             # Base UI primitives
│   │   └── vendors/        # Vendor management
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and helpers
│   │   ├── constants.ts    # Centralized constants
│   │   ├── validation.ts   # Form validation
│   │   ├── export/         # Data export utilities
│   │   └── playground/     # Playground utilities
│   ├── pages/              # Page components
│   │   ├── auth/           # Auth pages (SignIn, SignUp, etc.)
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── landing/        # Public landing pages
│   │   └── onboarding/     # User onboarding
│   ├── test/               # Test setup and utilities
│   └── types/              # TypeScript type definitions
├── convex/                 # Backend (Convex)
│   ├── _generated/         # Auto-generated Convex code
│   ├── api/                # API helpers
│   ├── lib/                # Backend utilities
│   │   ├── agent/          # AI agent system
│   │   ├── ai/             # AI provider integrations
│   │   └── auth.ts         # Auth utilities
│   ├── migrations/         # Data migrations
│   ├── mutations/          # Write operations
│   └── queries/            # Read operations
├── e2e/                    # End-to-end tests
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Authentication System

Open Event uses a custom authentication system with the following security features:

1. **Short-lived access tokens** (15 minutes)
2. **Long-lived refresh tokens** (7 days) with rotation
3. **Strong password requirements** (12+ characters with complexity)
4. **httpOnly cookies** for XSS protection

### Auth Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │────▶│  HTTP Layer  │────▶│  Convex DB   │
│          │     │  (Cookies)   │     │  (Sessions)  │
└──────────┘     └──────────────┘     └──────────────┘
     │                   │                    │
     │   Access Token    │   Validate Token   │
     │◀──────────────────│──────────────────▶│
     │                   │                    │
     │   Refresh Token   │   Rotate Tokens    │
     │◀──────────────────│──────────────────▶│
```

### Key Files

- `convex/customAuth.ts` - Auth actions and mutations
- `convex/lib/passwordValidation.ts` - Password validation
- `src/contexts/AuthContext.tsx` - Frontend auth state
- `src/components/auth/` - Auth UI components

## Database Schema

The Convex schema (`convex/schema.ts`) defines the following core tables:

| Table               | Purpose                              |
| ------------------- | ------------------------------------ |
| `users`             | User accounts with role-based access |
| `sessions`          | Active sessions with token rotation  |
| `events`            | Event records                        |
| `eventVendors`      | Vendor assignments to events         |
| `eventSponsors`     | Sponsor assignments to events        |
| `vendors`           | Vendor directory                     |
| `sponsors`          | Sponsor directory                    |
| `notifications`     | User notifications                   |
| `organizerProfiles` | Organizer onboarding data            |

### Key Indexes

- `users.email` - Email lookup
- `sessions.by_access_token` - Token validation
- `sessions.by_refresh_token` - Token refresh
- `events.by_organizer` - User's events

## Frontend Architecture

### State Management

- **React Context** for auth and global state
- **Convex hooks** (`useQuery`, `useMutation`) for server state
- **Local state** for UI state

### Component Patterns

1. **Pages** - Full page components in `src/pages/`
2. **Features** - Domain-specific components in `src/components/{domain}/`
3. **UI Primitives** - Base components in `src/components/ui/`

### Routing

React Router v7 with protected routes:

- `/` - Landing page
- `/sign-in`, `/sign-up` - Authentication
- `/dashboard/*` - Protected dashboard routes
- `/onboarding` - Post-signup onboarding

## AI Agent System

The agentic chat system (`src/components/agentic-v2/`) provides an AI-powered assistant:

### Components

- `AgenticChatV2` - Main chat interface
- `AgenticMessage` - Message rendering
- `AgenticThinking` - Thinking indicator
- `AgenticTool` - Tool execution display

### Backend

- `convex/lib/agent/` - Agent handlers and tools
- `convex/aiTools.ts` - Available AI tools
- `convex/lib/ai/` - AI provider factory

## Testing Strategy

### Unit Tests (Vitest)

- Located alongside source files (`*.test.ts(x)`)
- Run: `npm run test:run`
- Coverage: `npm run test:coverage`

### E2E Tests (Playwright)

- Located in `e2e/` directory
- Run: `npm run test:e2e`
- UI: `npm run test:e2e:ui`

### Test Focus Areas

1. Auth flows (sign in, sign up, token refresh)
2. Form validation
3. Event CRUD operations
4. Vendor/Sponsor applications

## Key Design Decisions

### 1. Custom Auth vs Convex Auth

We use a custom auth system alongside @convex-dev/auth for:

- Full control over token lifecycle
- httpOnly cookie security
- Custom password requirements

### 2. Convex as Backend

Chosen for:

- Real-time sync out of the box
- TypeScript end-to-end
- Simple deployment
- Built-in file storage

### 3. Component-First Architecture

Components are organized by domain (events, vendors, sponsors) rather than by type (containers, presentational) for better cohesion.

### 4. Validation Duplication

Password and form validation is duplicated between frontend and backend:

- Frontend: `src/lib/validation.ts` for UX
- Backend: `convex/lib/passwordValidation.ts` for security

Both must stay in sync.

## Performance Considerations

1. **Lazy Loading** - Routes are lazy-loaded
2. **PWA** - Offline support via service worker
3. **Optimistic Updates** - Convex mutations are optimistic
4. **Indexed Queries** - All frequent queries use indexes

## Security Measures

1. **XSS Protection** - httpOnly cookies, no dangerouslySetInnerHTML
2. **CSRF Protection** - SameSite cookies
3. **Input Validation** - Zod schemas on backend
4. **Rate Limiting** - Implemented for auth endpoints
5. **Password Security** - bcrypt hashing, 12+ char requirement
