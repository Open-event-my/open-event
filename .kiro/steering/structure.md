# Project Structure & Organization

## Root Structure
```
open-event/
├── convex/              # Backend (Convex serverless functions)
├── src/                 # Frontend React application
├── e2e/                 # Playwright E2E tests
├── docs/                # Project documentation
├── public/              # Static assets (PWA icons, images)
├── scripts/             # Utility scripts (auth, key management)
└── dist/                # Build output
```

## Backend Structure (`convex/`)
```
convex/
├── schema.ts            # Database schema definitions
├── auth.ts              # Authentication functions
├── events.ts            # Event management functions
├── vendors.ts           # Vendor operations
├── sponsors.ts          # Sponsor operations
├── users.ts             # User management
├── lib/
│   ├── agent/           # AI Agent system
│   │   ├── tools.ts     # 13 AI tool definitions
│   │   ├── handlers.ts  # Tool execution logic
│   │   └── types.ts     # Agent type definitions
│   └── ai/              # AI utilities and providers
├── mutations/           # Complex mutation operations
├── queries/             # Complex query operations
└── _generated/          # Auto-generated Convex files
```

## Frontend Structure (`src/`)
```
src/
├── components/
│   ├── ui/              # ShadCN UI components (button, card, etc.)
│   ├── app/             # App shell & navigation
│   ├── agentic-v2/      # AI chat interface components
│   ├── admin/           # Admin panel components
│   ├── auth/            # Authentication components
│   ├── landing/         # Marketing page components
│   └── [feature]/       # Feature-specific components
├── pages/
│   ├── dashboard/       # Main app pages
│   ├── admin/           # Admin pages
│   ├── auth/            # Auth flow pages
│   ├── public/          # Public event directory
│   └── [feature]/       # Other page categories
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and helpers
├── types/               # TypeScript type definitions
├── contexts/            # React contexts (AuthContext)
└── App.tsx              # Main app with lazy loading
```

## Key Architectural Patterns

### Component Organization
- **UI Components**: Reusable ShadCN components in `src/components/ui/`
- **Feature Components**: Grouped by domain (events, vendors, sponsors)
- **Page Components**: Route-level components with lazy loading
- **Layout Components**: App shell, admin layout, navigation

### Backend Organization
- **Schema-First**: All data models defined in `convex/schema.ts`
- **Function-Based**: Convex functions for queries, mutations, actions
- **Agent System**: AI tools and handlers in dedicated `lib/agent/` folder
- **Multi-Tenancy**: Organization support with role-based access

### Styling Conventions
- **Utility-First**: TailwindCSS with custom design tokens
- **Component Variants**: class-variance-authority for consistent variants
- **Design System**: ShadCN UI with New York style preset
- **Dark Mode**: next-themes with CSS variables

### File Naming
- **Components**: PascalCase (e.g., `EventCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useEventData.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Pages**: PascalCase with `Page` suffix (e.g., `EventsPage.tsx`)
- **Types**: camelCase interfaces/types (e.g., `eventTypes.ts`)

### Import Conventions
- **Absolute Imports**: Use `@/` alias for src imports
- **Barrel Exports**: Index files for clean imports
- **Lazy Loading**: Dynamic imports for code splitting
- **External First**: External imports before internal imports

### Testing Structure
- **Unit Tests**: Co-located with components (`.test.tsx`)
- **E2E Tests**: Playwright tests in `e2e/` folder
- **Test Utils**: Shared utilities in `src/test/`
- **Coverage**: Vitest with v8 coverage provider