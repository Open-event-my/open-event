# Open Event - Skills Directory

This directory contains comprehensive skill documentation for working on the Open Event project. Each file covers a specific domain of knowledge required to contribute effectively to the codebase.

## 📚 Available Skills

### [Frontend Development](./frontend-development.md)

React 19, TypeScript, Vite 7, TailwindCSS 4, React Router v7

- Component patterns and organization
- State management strategies
- Routing and navigation
- TypeScript patterns

### [Backend (Convex)](./backend-convex.md)

Convex serverless backend, real-time database, serverless functions

- Schema design and validators
- Query and mutation patterns
- Action functions for external APIs
- Authentication and authorization

### [Testing](./testing.md)

Vitest, Playwright, React Testing Library

- Unit testing patterns
- E2E testing strategies
- Test organization and helpers
- Error handling in tests

### [UI/UX Development](./ui-ux.md)

ShadCN UI, Radix UI, Dark Mode, Responsive Design

- Component library usage
- Dark mode implementation
- Responsive design patterns
- Form handling and validation

### [AI Integration](./ai-integration.md)

OpenAI Function Calling, Agent Systems

- Tool definitions and handlers
- Confirmation dialogs
- Rate limiting
- AI provider patterns

### [Architecture Patterns](./architecture.md)

Component organization, state management, routing, error handling

- Code organization principles
- State management strategies
- Routing patterns
- Error boundary architecture

### [Build & Deployment](./build-deployment.md)

Vite configuration, PWA setup, security headers, deployment

- Build optimization
- Service worker configuration
- Security headers
- Deployment strategies

## 🎯 Quick Reference

### Tech Stack Summary

- **Frontend**: React 19 + TypeScript + Vite 7 + TailwindCSS 4
- **Backend**: Convex (serverless database + functions)
- **Auth**: Convex Auth (Google OAuth, Email/Password)
- **AI**: OpenAI GPT-4o-mini with function calling
- **UI**: ShadCN UI + Radix UI + Phosphor Icons
- **Testing**: Vitest + Playwright
- **PWA**: vite-plugin-pwa
- **Deployment**: Cloudflare Pages

### Key Patterns

#### Component Pattern

```typescript
export function ComponentName({ prop }: Props) {
  const query = useQuery(api.example.get, args)
  const mutation = useMutation(api.example.create)

  if (query === undefined) return <Loading />
  if (query === null) return <Empty />

  return <Content data={query} />
}
```

#### Convex Function Pattern

```typescript
export const functionName = query({
  args: { id: v.id('table') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    return await ctx.db.get(args.id)
  },
})
```

#### Error Boundary Pattern

```typescript
<QueryErrorBoundary fallback={({ error, retry }) => <ErrorFallback error={error} onRetry={retry} />}>
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
</QueryErrorBoundary>
```

## 🚀 Getting Started

1. **Read Frontend Development**: Understand React, TypeScript, and component patterns
2. **Read Backend (Convex)**: Learn Convex schema, queries, and mutations
3. **Read Testing**: Learn how to write tests effectively
4. **Read Architecture**: Understand code organization and patterns
5. **Reference Others**: Use other skills as needed for specific features

## 📝 Adding New Skills

When adding new technologies or patterns:

1. Create a new markdown file in `.cursor/skills/`
2. Document key patterns with code examples from the codebase
3. Include best practices and common pitfalls
4. Update this README with a link to the new skill

## 🔗 Related Documentation

- [Project README](../README.md)
- [Architecture Docs](../docs/ARCHITECTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [Tech Stack](../docs/steering/tech.md)
