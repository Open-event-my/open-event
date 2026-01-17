import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Integrations Page
 *
 * Tests cover:
 * - Display of integration cards
 * - Coming Soon status for all integrations
 * - Disabled connect buttons
 * - Notify Me functionality
 */

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Integrations Page', () => {
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

    // Navigate to integration (singular in route)
    await page.goto('/dashboard/integration')
    await page.waitForTimeout(2000)
  })

  test.describe('Page Display', () => {
    test('should display integrations page with header', async ({ page }) => {
      const header = page.locator('h1').filter({ hasText: /integrations/i })
      await expect(header).toBeVisible({ timeout: 10000 })
    })

    test('should display Coming Soon badge', async ({ page }) => {
      const comingSoonBadge = page.getByText(/coming soon/i)
      await expect(comingSoonBadge.first()).toBeVisible({ timeout: 10000 })
    })

    test('should display page description', async ({ page }) => {
      const description = page.getByText(/connect.*with your favorite tools/i)
      await expect(description).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Integration Cards', () => {
    test('should display all integration cards', async ({ page }) => {
      // Should show all 4 integrations (use heading role to avoid strict mode)
      const zapierCard = page.getByRole('heading', { name: /zapier/i })
      const slackCard = page.getByRole('heading', { name: /slack/i })
      const googleCalendarCard = page.getByRole('heading', { name: /google calendar/i })
      const stripeCard = page.getByRole('heading', { name: /stripe/i })

      await expect(zapierCard).toBeVisible({ timeout: 10000 })
      await expect(slackCard).toBeVisible({ timeout: 5000 })
      await expect(googleCalendarCard).toBeVisible({ timeout: 5000 })
      await expect(stripeCard).toBeVisible({ timeout: 5000 })
    })

    test('should display Zapier integration description', async ({ page }) => {
      const zapierDesc = page.getByText(/connect to 5,000\+ apps/i)
      await expect(zapierDesc).toBeVisible({ timeout: 10000 })
    })

    test('should display Slack integration description', async ({ page }) => {
      const slackDesc = page.getByText(/notifications.*slack channels/i)
      await expect(slackDesc).toBeVisible({ timeout: 10000 })
    })

    test('should display Google Calendar integration description', async ({ page }) => {
      const calendarDesc = page.getByText(/sync events with your google calendar/i)
      await expect(calendarDesc).toBeVisible({ timeout: 10000 })
    })

    test('should display Stripe integration description', async ({ page }) => {
      const stripeDesc = page.getByText(/accept payments.*ticketing/i)
      await expect(stripeDesc).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Connect Buttons', () => {
    test('should have disabled connect buttons', async ({ page }) => {
      // All connect buttons should be disabled
      const connectButtons = page.locator('button').filter({ hasText: /connect/i })
      const buttonCount = await connectButtons.count()

      expect(buttonCount).toBeGreaterThanOrEqual(4)

      // Check that buttons are disabled
      for (let i = 0; i < Math.min(buttonCount, 4); i++) {
        const isDisabled = await connectButtons
          .nth(i)
          .isDisabled()
          .catch(() => false)
        expect(isDisabled).toBeTruthy()
      }
    })
  })

  test.describe('Notify Me Section', () => {
    test('should display notify me section', async ({ page }) => {
      const notifySection = page.getByText(/want to be notified when integrations launch/i)
      await expect(notifySection).toBeVisible({ timeout: 10000 })
    })

    test('should display notify me button', async ({ page }) => {
      const notifyButton = page.getByRole('button', { name: /notify me/i })
      await expect(notifyButton).toBeVisible({ timeout: 10000 })
    })

    test('should have clickable notify me button', async ({ page }) => {
      const notifyButton = page.getByRole('button', { name: /notify me/i })

      if (await notifyButton.isVisible().catch(() => false)) {
        // Button should be enabled and clickable
        const isDisabled = await notifyButton.isDisabled().catch(() => true)
        expect(isDisabled).toBeFalsy()
      }
    })
  })
})
