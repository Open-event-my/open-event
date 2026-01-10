# Testing Skills

## Test Stack

- **Vitest**: Unit and integration tests
- **React Testing Library**: Component testing
- **Playwright**: End-to-end (E2E) testing
- **fast-check**: Property-based testing

## Unit Testing with Vitest

### Test Setup

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  cleanup()
})
```

### Component Testing Pattern

```typescript
// Component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Testing Hooks

```typescript
// useEventData.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useEventData } from './useEventData'

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}))

describe('useEventData', () => {
  it('returns loading state when query is undefined', () => {
    const { useQuery } = await import('convex/react')
    vi.mocked(useQuery).mockReturnValue(undefined)

    const { result } = renderHook(() => useEventData('event-id'))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.event).toBeUndefined()
  })
})
```

### Testing with Convex Mocks

```typescript
// Mock Convex API
import { api } from '@/convex/_generated/api'
import { vi } from 'vitest'

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
}))

// In tests
const { useQuery, useMutation } = await import('convex/react')
vi.mocked(useQuery).mockReturnValue(mockEvent)
vi.mocked(useMutation).mockReturnValue(mockCreateEvent)
```

## E2E Testing with Playwright

### Test Structure

```typescript
// e2e/event-applications.spec.ts
import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Event Applications', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display applications page with title', async ({ page }) => {
    await navigateToEventApplications(page)
    await page.waitForTimeout(3000)

    // Check for error state first
    const errorHeading = page.getByRole('heading', { name: /something went wrong/i })
    const errorCount = await errorHeading.count()
    if (errorCount > 0) {
      throw new Error('Page is showing an error state')
    }

    // Assert expected content
    const applicationsHeading = page.getByRole('heading', { name: /applications/i })
    await expect(applicationsHeading).toBeVisible({ timeout: 10000 })
  })
})
```

### Helper Functions Pattern

```typescript
// Helper for navigation
async function navigateToEventApplications(page: Page) {
  await page.goto('/dashboard/events')
  await page.waitForTimeout(2000)

  const eventCard = page.locator('.rounded-lg.border').first()
  if (await eventCard.isVisible()) {
    await eventCard.click()
    await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })

    const url = page.url()
    const eventId = url.split('/').pop()

    // Validate eventId
    if (!eventId || eventId === 'new' || !/^[a-z0-9]+$/.test(eventId)) {
      throw new Error(`Invalid eventId: ${eventId}`)
    }

    await page.goto(`/dashboard/events/${eventId}/applications`)
    await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+\/applications/, { timeout: 10000 })
    return eventId
  }
}
```

### Best Practices

1. **Wait Strategies**: Always use `waitForURL`, `waitForLoadState`, `waitForTimeout`
2. **Error Detection**: Check for error states before asserting content
3. **Validation**: Validate extracted data (like eventId) before using
4. **Timeouts**: Set appropriate timeouts for network operations
5. **Retry Logic**: Handle network failures gracefully
6. **Isolation**: Each test should be independent

### Common Patterns

#### Navigation with Validation

```typescript
// Navigate and validate URL
await page.goto('/dashboard/events/new')
await page.waitForURL(/\/dashboard\/events\/new/, { timeout: 10000 })

// Wait for page to stabilize
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
await page.waitForTimeout(500)
```

#### Form Interaction

```typescript
// Fill form with fallback selectors
let emailInput = page.getByPlaceholder('you@example.com')
try {
  await emailInput.waitFor({ state: 'visible', timeout: 5000 })
} catch {
  emailInput = page.getByLabel(/email/i)
  await emailInput.waitFor({ state: 'visible', timeout: 5000 })
}
await emailInput.fill(TEST_EMAIL)
```

#### Error State Detection

```typescript
// Check for error states before asserting
const errorHeading = page.getByRole('heading', { name: /something went wrong/i })
const errorText = page.getByText(/something went wrong|encountered an error/i)

const errorHeadingCount = await errorHeading.count()
const errorTextCount = await errorText.count()

if (errorHeadingCount > 0 || errorTextCount > 0) {
  // Extract actual error message
  let errorMessage = 'Unknown error'
  try {
    const errorDetails = page.locator('details').filter({ hasText: /error details/i })
    if ((await errorDetails.count()) > 0) {
      await errorDetails.first().click()
      const errorPre = errorDetails.locator('pre').first()
      if ((await errorPre.count()) > 0) {
        errorMessage = (await errorPre.textContent()) || 'Unknown error'
      }
    }
  } catch {}

  throw new Error(`Page error: ${errorMessage}`)
}
```

## Property-Based Testing

```typescript
// Using fast-check for property-based testing
import fc from 'fast-check'

describe('Event validation', () => {
  it('should accept valid event titles', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (title) => {
        const result = validateEvent({ title })
        expect(result.isValid).toBe(true)
      })
    )
  })
})
```

## Test Organization

### File Structure

```
e2e/
├── event-applications.spec.ts
├── event-management.spec.ts
├── sponsor-management.spec.ts
└── vendor-management.spec.ts

src/components/
├── Button.tsx
├── Button.test.tsx    # Co-located unit tests
└── ...
```

### Test Categories

1. **Unit Tests**: Individual components, hooks, utilities
2. **Integration Tests**: Component interactions, API integration
3. **E2E Tests**: Full user flows, critical paths

## Key Skills to Master

1. **React Testing Library**: Queries, assertions, user events
2. **Vitest Configuration**: Setup, mocking, coverage
3. **Playwright Patterns**: Navigation, form filling, assertions
4. **Error Handling**: Detecting and handling errors in tests
5. **Test Organization**: Structure, helpers, fixtures
6. **Mocking Strategies**: Convex, API calls, external services
7. **Async Testing**: Handling promises, waiting for state changes
8. **Accessibility Testing**: Testing with screen readers, keyboard navigation
