# Claude Code Guidelines for Open-Event

This file contains project-specific guidelines and best practices that Claude should follow when working on this codebase.

---

## React Best Practices

### You Might Not Need an Effect

Reference: https://react.dev/learn/you-might-not-need-an-effect

#### When NOT to use `useEffect`:

1. **Deriving state from props/state** - Calculate during render instead
2. **Handling user events** - Use event handlers, not Effects
3. **Transforming data for rendering** - Compute in render or use `useMemo`
4. **Resetting state when props change** - Use `key` prop instead
5. **Notifying parent of state changes** - Update in the same event handler
6. **Chaining state updates** - Calculate all updates in the event handler

#### When TO use `useEffect`:

1. **Subscribing to external systems** (browser APIs, third-party libraries)
2. **Synchronizing with external stores** (consider `useSyncExternalStore`)
3. **Setting up event listeners** on window/document
4. **Intersection Observer, ResizeObserver, etc.**
5. **WebSocket connections**
6. **Analytics/logging that depends on rendered state**

#### Code Patterns

```tsx
// ❌ BAD: Deriving state with Effect
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])

// ✅ GOOD: Calculate during render
const fullName = firstName + ' ' + lastName
```

```tsx
// ❌ BAD: Filtering with Effect
const [filteredList, setFilteredList] = useState(items)
useEffect(() => {
  setFilteredList(items.filter((item) => item.active))
}, [items])

// ✅ GOOD: Use useMemo for expensive computations
const filteredList = useMemo(() => items.filter((item) => item.active), [items])

// ✅ BETTER: Calculate during render if not expensive
const filteredList = items.filter((item) => item.active)
```

```tsx
// ❌ BAD: Resetting state with Effect
useEffect(() => {
  setComment('')
}, [userId])

// ✅ GOOD: Use key to force remount
;<CommentForm key={userId} userId={userId} />
```

```tsx
// ❌ BAD: Notifying parent in Effect
useEffect(() => {
  onChange(selectedItem)
}, [selectedItem, onChange])

// ✅ GOOD: Call in event handler
function handleSelect(item) {
  setSelectedItem(item)
  onChange(item)
}
```

```tsx
// ❌ BAD: Chained Effects
useEffect(() => {
  setGoldCount((c) => c + 1)
}, [card])
useEffect(() => {
  setRound((r) => r + 1)
}, [goldCount])

// ✅ GOOD: Calculate all in event handler
function handlePlaceCard(nextCard) {
  const newGoldCount = nextCard.gold ? goldCount + 1 : goldCount
  setCard(nextCard)
  setGoldCount(newGoldCount)
  if (newGoldCount >= 3) setRound(round + 1)
}
```

#### Checklist Before Using `useEffect`:

- [ ] Can this be calculated during render?
- [ ] Is this responding to a user event? (Use event handler instead)
- [ ] Am I syncing with an external system? (Valid use case)
- [ ] Am I creating a chain of state updates? (Refactor to event handler)
- [ ] Could I use `useMemo` or `useCallback` instead?
- [ ] Should I reset state? (Use `key` prop instead)

---

## Project Architecture

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS v4 + ShadCN UI
- **Backend**: Convex (database, queries, mutations, realtime)
- **AI**: OpenAI, Anthropic, Groq (planned)

### Folder Structure

```
src/
├── components/
│   ├── agentic-v2/  # AI chat interface components
│   ├── landing/     # Landing page sections
│   ├── playground/  # Tldraw-based event canvas (Beta)
│   └── ui/          # ShadCN UI components
├── hooks/           # Custom React hooks
│   ├── useAsyncAction.ts  # Reusable async action with toast handling
│   └── use-pwa.ts         # PWA installation hooks
├── lib/             # Utility functions
├── pages/           # Page components
│   ├── admin/       # Admin panel pages
│   └── dashboard/   # User dashboard pages
├── services/        # API services
└── types/           # TypeScript types

convex/
├── schema.ts        # Database schema
├── events.ts        # Event queries/mutations
├── aiUsage.ts       # AI rate limiting & usage tracking
├── organizerProfiles.ts  # User profile management
├── http.ts          # HTTP actions (AI streaming)
├── lib/
│   └── ai/          # AI Provider Adapter pattern
│       ├── types.ts
│       ├── factory.ts
│       ├── providers/openai.ts
│       └── index.ts
└── queries/         # Reusable query helpers
```

### Import Aliases

- `@/` maps to `./src/`
- Example: `import { Button } from '@/components/ui/button'`

---

## Styling Guidelines

### Design System

- **Style**: Minimal & clean with generous whitespace
- **Typography**: Geist font family (see below)
- **Theme**: System preference with dark/light toggle
- **Animations**: Moderate - scroll animations, hover effects

### Typography: Geist Fonts

We use [Geist](https://vercel.com/font) - Vercel's modern font family.

- **Geist Sans** (`font-sans`): Body text, UI elements
- **Geist Mono** (`font-mono`): Headlines, code, technical text

```tsx
// Headlines use monospace for technical feel
<h1 className="font-mono text-4xl font-bold">Headline</h1>

// Body uses sans-serif
<p className="font-sans text-lg">Body text</p>
```

Fonts are loaded via CDN with `font-display: swap` for performance.

### Icons: Phosphor Icons

We use [Phosphor Icons](https://phosphoricons.com/) with the **duotone** weight for consistent styling.

```tsx
import { House, User, Gear } from '@phosphor-icons/react'

// Standard usage with duotone weight
;<House size={24} weight="duotone" className="text-primary" />

// Available weights: thin, light, regular, bold, fill, duotone
// Always prefer "duotone" unless there's a specific design need
```

#### Icon Naming Conventions

- Phosphor uses PascalCase: `House`, `UserCircle`, `GearSix`
- No "Icon" suffix (unlike Lucide)
- Check https://phosphoricons.com/ for available icons

#### Common Icon Mappings (from Lucide)

| Use Case | Phosphor Icon                           |
| -------- | --------------------------------------- |
| Close/X  | `X`                                     |
| Check    | `Check`, `CheckCircle`                  |
| Warning  | `Warning`, `WarningCircle`              |
| Error    | `XCircle`                               |
| Info     | `Info`                                  |
| Loading  | `CircleNotch` (with `animate-spin`)     |
| Menu     | `List`                                  |
| Settings | `Gear`, `GearSix`                       |
| User     | `User`, `UserCircle`                    |
| Search   | `MagnifyingGlass`                       |
| Arrow    | `ArrowRight`, `ArrowLeft`, `CaretRight` |

### Logo Components

Use the built-in logo components from `@/components/ui/logo`:

```tsx
import { Logo, LogoIcon, LogoAnimated, LogoMini } from '@/components/ui/logo'

<Logo size="md" />           // Full logo with wordmark
<LogoIcon size="sm" />       // Icon only (pixel calendar)
<LogoAnimated size="md" />   // With hover animation
<LogoMini />                 // Minimal "oe.my" text
```

### Component Patterns

```tsx
// Use cn() for conditional classes
import { cn } from '@/lib/utils'
;<div
  className={cn(
    'base-classes',
    isActive && 'active-classes',
    variant === 'primary' && 'primary-classes'
  )}
/>
```

### Animation Classes

- `animate-float-slow` - 4s floating animation
- `animate-float-medium` - 3s floating animation
- `animate-float-fast` - 3.5s floating animation

---

## Convex Guidelines

### Queries & Mutations

- Use typed validators from `convex/values`
- Always define argument schemas
- Use indexes for filtered queries

```tsx
// Query example
export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.query('events').collect()
  },
})
```

### React Integration

```tsx
import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

// In component
const events = useQuery(api.events.list)
const createEvent = useMutation(api.events.create)
```

### AI Provider Pattern

The AI system uses an Adapter pattern for provider flexibility:

```ts
import { createAIProvider, DEFAULT_CONFIGS } from './lib/ai'

// Create provider instance
const provider = createAIProvider('openai', {
  openai: process.env.OPENAI_API_KEY,
})

// Use with streaming
const stream = await provider.createStreamingChat(messages, tools, DEFAULT_CONFIGS.openai)
```

Supported providers:

- **OpenAI** - Fully implemented with tool calling
- **Anthropic** - Planned
- **Groq** - Planned

---

## Custom Hooks

### useAsyncAction Hook

Eliminates repetitive try-catch-toast patterns for async operations.

```tsx
import { useAsyncAction } from '@/hooks/useAsyncAction'

function MyComponent() {
  const { isLoading, execute } = useAsyncAction()

  const handleSave = async () => {
    await execute(() => saveMutation({ data }), {
      successMessage: 'Saved successfully',
      errorMessage: 'Failed to save',
      onSuccess: () => console.log('Done!'),
    })
  }
}
```

### useAsyncActions Hook (Multiple Actions)

For components with multiple async operations:

```tsx
const actions = useAsyncActions<'save' | 'delete' | 'publish'>()

// Check individual loading states
actions.isLoading('save')

// Execute with specific key
actions.execute('delete', () => deleteMutation({ id }), { ... })
```

---

## Code Quality

### TypeScript

- Strict mode enabled
- Define types in `src/types/`
- Avoid `any` - use `unknown` and narrow

### React Compiler Compliance

The project uses React Compiler with strict linting. Key rules:

1. **No impure functions during render** - Don't call `Date.now()`, `Math.random()` directly

   ```tsx
   // ❌ BAD
   const now = Date.now()

   // ✅ GOOD - Use useState lazy initializer
   const [now] = useState(() => Date.now())
   ```

2. **No ref access during render** - Don't read `.current` in render logic

   ```tsx
   // ❌ BAD
   if (myRef.current.value) { ... }

   // ✅ GOOD - Use state for render-time values
   const [value, setValue] = useState('')
   ```

3. **Destructure hooks returning refs** - Helps compiler track ref vs state

   ```tsx
   // ❌ BAD - chat object contains both refs and state
   {chat.hasMessages && <div ref={chat.myRef}>}

   // ✅ GOOD - Destructure to separate refs from state
   const { hasMessages, myRef } = useMyHook()
   {hasMessages && <div ref={myRef}>}
   ```

### Performance

- Use `useMemo` for expensive computations
- Use `useCallback` for stable function references passed to children
- Avoid creating objects/arrays in render (move to constants or useMemo)

### Accessibility

- Use semantic HTML
- Include `aria-` attributes where needed
- Ensure keyboard navigation works
- Test with screen readers

---

## Git Workflow

- Commit messages should explain "why" not "what"
- Keep commits focused and atomic
- Run `npm run build` before committing to catch type errors

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including

## 1. `byterover-store-knowledge`

You `MUST` always use this tool when:

- Learning new patterns, APIs, or architectural decisions from the codebase
- Encountering error solutions or debugging techniques
- Finding reusable code patterns or utility functions
- Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`

You `MUST` always use this tool when:

- Starting any new task or implementation to gather relevant context
- Before making architectural decisions to understand existing patterns
- When debugging issues to check for previous solutions
- Working with unfamiliar parts of the codebase
