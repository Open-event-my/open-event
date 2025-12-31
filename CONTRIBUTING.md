# Contributing to Open Event

First off, thank you for considering contributing to Open Event! It's people like you that make Open Event such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **npm** 9 or higher (or pnpm)
- **Git**
- A [Convex](https://convex.dev) account (free tier available)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/open-event.git
cd open-event
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/hazlijohar95/open-event.git
```

---

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Convex deployment URL.

### 3. Start Development Servers

```bash
# Start both frontend and backend
npm run dev:all

# Or separately:
npm run dev          # Frontend (Vite)
npm run dev:backend  # Backend (Convex)
```

### 4. Verify Setup

- Frontend: http://localhost:5173
- Convex Dashboard: https://dashboard.convex.dev

---

## Project Structure

```
open-event/
├── convex/              # Backend (Convex functions)
│   ├── schema.ts        # Database schema
│   ├── *.ts             # Queries & mutations
│   └── lib/             # Shared utilities
│
├── src/
│   ├── components/      # React components
│   │   ├── ui/          # ShadCN components
│   │   ├── dashboard/   # Dashboard-specific
│   │   └── ...
│   ├── pages/           # Page components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
│
├── e2e/                 # Playwright tests
└── public/              # Static assets
```

---

## Making Changes

### 1. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

| Type     | Format                 | Example                     |
| -------- | ---------------------- | --------------------------- |
| Feature  | `feature/description`  | `feature/add-calendar-view` |
| Bug fix  | `fix/description`      | `fix/event-date-picker`     |
| Docs     | `docs/description`     | `docs/update-readme`        |
| Refactor | `refactor/description` | `refactor/auth-flow`        |

### 2. Make Your Changes

- Write clean, readable code
- Add tests for new functionality
- Update documentation as needed
- Follow the coding standards below

### 3. Run Tests

```bash
# Unit tests
npm run test:run

# Linting
npm run lint

# Type checking
npm run build
```

### 4. Commit Your Changes

See [Commit Guidelines](#commit-guidelines) below.

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` - use `unknown` and type guards
- Define types in `src/types/` for reusable types
- Use strict mode (already configured)

```typescript
// Good
function processEvent(event: Event): ProcessedEvent {
  return { ...event, processed: true }
}

// Avoid
function processEvent(event: any): any {
  return { ...event, processed: true }
}
```

### React

- Use functional components with hooks
- Follow the patterns in `CLAUDE.md`
- Avoid unnecessary `useEffect` - calculate during render when possible
- Use `useMemo` for expensive computations

```tsx
// Good - calculate during render
const fullName = firstName + ' ' + lastName

// Avoid - unnecessary effect
const [fullName, setFullName] = useState('')
useEffect(() => {
  setFullName(firstName + ' ' + lastName)
}, [firstName, lastName])
```

### Styling

- Use TailwindCSS for styling
- Use the `cn()` utility for conditional classes
- Follow the design system in `CLAUDE.md`
- Use Phosphor Icons with `duotone` weight

```tsx
import { cn } from '@/lib/utils'
import { Calendar } from '@phosphor-icons/react'
;<div className={cn('p-4 rounded-lg', isActive && 'bg-primary')}>
  <Calendar size={24} weight="duotone" />
</div>
```

### Convex

- Use typed validators from `convex/values`
- Always define argument schemas
- Use indexes for filtered queries
- Handle authorization in every mutation/query

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error('Authentication required')

    return await ctx.db.insert('events', {
      ...args,
      organizerId: user._id,
    })
  },
})
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                         |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `docs`     | Documentation changes               |
| `style`    | Code style (formatting, semicolons) |
| `refactor` | Code refactoring                    |
| `perf`     | Performance improvements            |
| `test`     | Adding or updating tests            |
| `chore`    | Maintenance tasks                   |

### Examples

```bash
# Feature
git commit -m "feat(events): add calendar view for event scheduling"

# Bug fix
git commit -m "fix(auth): resolve token refresh issue on page reload"

# Documentation
git commit -m "docs: update API documentation for vendor endpoints"

# Refactor
git commit -m "refactor(dashboard): extract stats component for reuse"
```

### Commit Best Practices

- Keep commits focused and atomic
- Write clear, descriptive messages
- Reference issues when applicable: `fix(events): resolve date bug (#123)`

---

## Pull Request Process

### Before Submitting

1. **Sync with upstream:**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks:**

   ```bash
   npm run test:run
   npm run lint
   npm run build
   ```

3. **Update documentation** if needed

### Submitting

1. Push your branch:

   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes
   - Testing instructions

### PR Review

- At least one maintainer review is required
- Address all review comments
- Keep the PR focused - split large changes into smaller PRs
- Be patient and respectful during the review process

### After Merge

- Delete your feature branch
- Sync your fork with upstream

---

## Reporting Bugs

### Before Reporting

1. Check [existing issues](https://github.com/hazlijohar95/open-event/issues) to avoid duplicates
2. Try to reproduce the bug in the latest version

### Bug Report Template

When creating a bug report, include:

- **Summary**: Clear, concise description
- **Steps to Reproduce**: Numbered steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, browser, Node version
- **Screenshots**: If applicable
- **Console Errors**: If applicable

---

## Suggesting Features

### Before Suggesting

1. Check [existing issues](https://github.com/hazlijohar95/open-event/issues) and [discussions](https://github.com/hazlijohar95/open-event/discussions)
2. Consider if it fits the project scope

### Feature Request Template

- **Problem**: What problem does this solve?
- **Solution**: Your proposed solution
- **Alternatives**: Other solutions you've considered
- **Context**: Any additional context

---

## Questions?

- Open a [Discussion](https://github.com/hazlijohar95/open-event/discussions) for general questions
- Check our [documentation](README.md) for setup help
- Review `CLAUDE.md` for coding guidelines

---

Thank you for contributing to Open Event! Your efforts help make event management better for everyone.
