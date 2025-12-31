# Tech Stack & Development

## Core Technologies
- **Frontend**: React 19, TypeScript 5.9, Vite 7
- **Backend**: Convex (real-time database + serverless functions)
- **Styling**: TailwindCSS 4, ShadCN UI components, Radix UI primitives
- **Auth**: Convex Auth with Google OAuth and email/password
- **AI**: OpenAI GPT-4o-mini with function calling (13 agent tools)
- **Icons**: Phosphor Icons (duotone style)
- **Fonts**: Geist Sans & Geist Mono

## Build System & Commands

### Development
```bash
npm run dev              # Start frontend dev server (Vite)
npm run dev:backend      # Start Convex backend
npm run dev:all          # Start both frontend and backend (recommended)
```

### Build & Deploy
```bash
npm run build           # Production build (TypeScript + Vite)
npm run preview         # Preview production build
```

### Code Quality
```bash
npm run lint            # ESLint with TypeScript rules
npm run format          # Prettier formatting
npm run format:check    # Check formatting without changes
```

### Testing
```bash
npm run test            # Vitest unit tests (watch mode)
npm run test:run        # Run tests once
npm run test:coverage   # Generate coverage report
npm run test:e2e        # Playwright E2E tests
npm run test:e2e:ui     # E2E tests with UI
```

## Key Dependencies
- **UI Components**: Radix UI primitives, class-variance-authority for variants
- **Utilities**: clsx + tailwind-merge (cn utility), next-themes for dark mode
- **Charts**: Recharts for analytics dashboards
- **PDF**: jsPDF + jsPDF-autotable for exports
- **Playground**: tldraw for visual event planning
- **Error Tracking**: Sentry for production monitoring
- **Payments**: Stripe integration

## Development Requirements
- Node.js 20.18.0+
- npm 10.0.0+
- Convex account (free tier available)

## Configuration Files
- `vite.config.ts`: Build configuration with PWA support and code splitting
- `convex.json`: Backend configuration with external packages
- `components.json`: ShadCN UI configuration (New York style)
- `eslint.config.js`: Flat config with TypeScript and React rules
- `tsconfig.json`: TypeScript project references setup