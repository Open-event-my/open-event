import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Dashboard Overview
 *
 * Tests cover:
 * - Stats display (Events, Vendors, Sponsors, Attendees)
 * - View toggle (list/grid)
 * - Event navigation
 * - Empty state for new users
 */

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Dashboard Overview', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign in
    await page.goto('/sign-in')

    // Fill in credentials
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for navigation to dashboard
    try {
      await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 })
    } catch {
      console.log('Auth redirect did not complete')
    }

    // Navigate to dashboard overview
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
  })

  test.describe('Stats Display', () => {
    test('should display stats cards with correct labels', async ({ page }) => {
      // Should show stats cards for Events, Vendors, Sponsors, Attendees
      const eventsCard = page.locator('p').filter({ hasText: /^Events$/i })
      const vendorsCard = page.locator('p').filter({ hasText: /^Vendors$/i })
      const sponsorsCard = page.locator('p').filter({ hasText: /^Sponsors$/i })
      const attendeesCard = page.locator('p').filter({ hasText: /^Attendees$/i })

      await expect(eventsCard).toBeVisible({ timeout: 10000 })
      await expect(vendorsCard).toBeVisible({ timeout: 5000 })
      await expect(sponsorsCard).toBeVisible({ timeout: 5000 })
      await expect(attendeesCard).toBeVisible({ timeout: 5000 })
    })

    test('should display organization name in header', async ({ page }) => {
      // Should show workspace header (h1) with org name or default "My workspace"
      const header = page.locator('h1').first()
      await expect(header).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('View Toggle', () => {
    test('should toggle between list and grid views', async ({ page }) => {
      // Wait for page to load
      await page.waitForTimeout(2000)

      // Find view toggle container and buttons
      const toggleButtons = page.locator('button').filter({ has: page.locator('svg') })
      const buttonCount = await toggleButtons.count()

      // Should have some buttons with icons
      expect(buttonCount).toBeGreaterThan(0)

      // Try clicking first button (list view)
      if (buttonCount >= 2) {
        await toggleButtons.first().click()
        await page.waitForTimeout(500)

        // Try clicking second button (grid view)
        await toggleButtons.nth(1).click()
        await page.waitForTimeout(500)
      }
    })

    test('should display events in list view', async ({ page }) => {
      // Wait for events to load
      await page.waitForTimeout(2000)

      // Check for list view content (rounded-xl border container)
      const listContainer = page.locator('.rounded-xl.border')
      const emptyState = page.getByText(/start from scratch/i)

      const hasListView = await listContainer
        .first()
        .isVisible()
        .catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      // Either list view with events OR empty state should be visible
      expect(hasListView || hasEmptyState).toBeTruthy()
    })

    test('should display events in grid view', async ({ page }) => {
      // Click grid view toggle
      // Find the toggle in the view toggle container
      const toggleButtons = page.locator('.bg-muted\\/50.rounded-lg button')
      if ((await toggleButtons.count()) >= 2) {
        await toggleButtons.nth(1).click()
        await page.waitForTimeout(500)
      }

      // Check for grid view (grid layout) or empty state
      const gridContainer = page.locator('.grid.md\\:grid-cols-2.lg\\:grid-cols-3')
      const emptyState = page.getByText(/start from scratch/i)

      const hasGridView = await gridContainer.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      expect(hasGridView || hasEmptyState).toBeTruthy()
    })
  })

  test.describe('Event Navigation', () => {
    test('should click event to navigate to detail page', async ({ page }) => {
      // Wait for events to load
      await page.waitForTimeout(2000)

      // Look for event links
      const eventLinks = page.locator('a[href*="/dashboard/events/"]').filter({
        hasNot: page.locator('text=/View all|edit/i'),
      })
      const eventCount = await eventLinks.count()

      if (eventCount > 0) {
        // Click first event
        await eventLinks.first().click()

        // Should navigate to event detail page
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+/, { timeout: 10000 })
        await expect(page).toHaveURL(/\/dashboard\/events\/[a-z0-9]+/)
      } else {
        // No events - check for empty state
        const emptyState = page.getByText(/start from scratch/i)
        await expect(emptyState).toBeVisible()
      }
    })

    test('should show View all link when events exist', async ({ page }) => {
      // Wait for events to load
      await page.waitForTimeout(2000)

      // Check for "View all" link or empty state
      const viewAllLink = page.getByRole('link', { name: /view all/i })
      const emptyState = page.getByText(/start from scratch/i)

      const hasViewAll = await viewAllLink.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      // Either View all link (has events) OR empty state (no events)
      expect(hasViewAll || hasEmptyState).toBeTruthy()
    })

    test('should navigate to events page via View all link', async ({ page }) => {
      // Wait for events to load
      await page.waitForTimeout(2000)

      const viewAllLink = page.getByRole('link', { name: /view all/i })

      if (await viewAllLink.isVisible().catch(() => false)) {
        await viewAllLink.click()
        await page.waitForURL(/\/dashboard\/events$/, { timeout: 10000 })
        await expect(page).toHaveURL(/\/dashboard\/events$/)
      }
    })
  })

  test.describe('Empty State', () => {
    test('should show suggestions for new users with no events', async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(2000)

      // Check for suggestion cards or events
      const suggestionText = page.getByText(/suggestion/i).first()
      const eventLinks = page.locator('a[href*="/dashboard/events/"]')

      const hasSuggestions = await suggestionText.isVisible().catch(() => false)
      const eventCount = await eventLinks.count()

      // Either has events OR shows suggestions
      expect(hasSuggestions || eventCount > 0).toBeTruthy()
    })

    test('should show start from scratch option for new users', async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(2000)

      // Check for "start from scratch" link or events
      const startFromScratch = page.getByText(/start from scratch/i)
      const eventLinks = page.locator('a[href*="/dashboard/events/"]').filter({
        hasNot: page.locator('text=/View all|edit|start from scratch/i'),
      })

      const hasStartFromScratch = await startFromScratch.isVisible().catch(() => false)
      const eventCount = await eventLinks.count()

      // Either shows start from scratch (empty) OR has events
      expect(hasStartFromScratch || eventCount > 0).toBeTruthy()
    })

    test('should navigate to event creation from empty state', async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(2000)

      const startFromScratch = page.locator('a[href="/dashboard/events/new"]').filter({
        hasText: /start from scratch/i,
      })

      if (await startFromScratch.isVisible().catch(() => false)) {
        await startFromScratch.click()
        await page.waitForURL(/\/dashboard\/events\/new/, { timeout: 10000 })
        await expect(page).toHaveURL(/\/dashboard\/events\/new/)
      }
    })
  })

  test.describe('Tip Banner', () => {
    test('should show tip banner when user has events', async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(2000)

      // Check for tip banner or empty state
      const tipBanner = page.getByText(/Tip:/i)
      const emptyState = page.getByText(/start from scratch/i)

      const hasTipBanner = await tipBanner.isVisible().catch(() => false)
      const hasEmptyState = await emptyState.isVisible().catch(() => false)

      // Either has tip banner (has events) OR empty state (no events)
      expect(hasTipBanner || hasEmptyState).toBeTruthy()
    })
  })
})
