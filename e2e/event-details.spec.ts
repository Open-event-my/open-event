import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Event Details Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/sign-in')
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 })

    // Handle potential onboarding redirect
    if (page.url().includes('onboarding')) {
      await page.goto('/dashboard/events')
    }
  })

  test.describe('Event Details View', () => {
    test('should display event details page with title and status', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      // Click first event card
      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })

        // Wait for page to load
        await page.waitForTimeout(2000)

        // Should show event title (h1)
        const title = page.locator('h1').first()
        await expect(title).toBeVisible({ timeout: 10000 })

        // Should show status badge
        const statusBadge = page
          .locator('span')
          .filter({
            hasText: /(draft|planning|active|completed|cancelled)/i,
          })
          .first()
        await expect(statusBadge).toBeVisible({ timeout: 5000 })
      }
    })

    test('should display date and time section', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should show date & time heading
        await expect(page.getByText(/date & time/i)).toBeVisible({ timeout: 10000 })
      }
    })

    test('should display location section', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should show location heading
        await expect(page.getByText(/location/i).first()).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show error for invalid event ID', async ({ page }) => {
      await page.goto('/dashboard/events/invalid-event-id-12345')
      await page.waitForTimeout(3000)

      // Should show error page (either "Event not found" or "Something went wrong")
      const errorHeading = page.locator('h1').filter({
        hasText: /(event not found|something went wrong)/i,
      })
      await expect(errorHeading).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Edit Event Navigation', () => {
    test('should navigate to edit page when clicking edit button', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Click edit button
        const editButton = page.locator('a').filter({ hasText: /edit/i }).first()
        await expect(editButton).toBeVisible({ timeout: 10000 })
        await editButton.click()

        // Should navigate to edit page
        await expect(page).toHaveURL(/\/dashboard\/events\/[a-z0-9]+\/edit$/, { timeout: 10000 })
      }
    })
  })

  test.describe('Vendors and Sponsors', () => {
    test('should display vendors section', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should show vendors heading
        await expect(page.getByText(/vendors/i).first()).toBeVisible({ timeout: 10000 })
      }
    })

    test('should display sponsors section', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should show sponsors heading
        await expect(page.getByText(/sponsors/i).first()).toBeVisible({ timeout: 10000 })
      }
    })

    test('should have browse vendors link', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should have browse link
        const browseLink = page.locator('a[href="/dashboard/vendors"]').first()
        await expect(browseLink).toBeVisible({ timeout: 10000 })
      }
    })

    test('should have browse sponsors link', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should have browse sponsors link
        const browseLink = page.locator('a[href="/dashboard/sponsors"]').first()
        await expect(browseLink).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Event Details Card', () => {
    // Increase timeout for this test that creates an event
    test.setTimeout(60000)

    test('should display budget and attendees count', async ({ page }) => {
      // Create event with budget and attendees first
      await page.goto('/dashboard/events/new')
      await page.waitForTimeout(1000)

      const manualButton = page
        .locator('button')
        .filter({ hasText: /manual form/i })
        .first()
      await expect(manualButton).toBeVisible({ timeout: 10000 })
      await manualButton.click()
      await page.waitForTimeout(500)

      const testTitle = `Details Test ${Date.now()}`
      await page.getByLabel(/event title/i).fill(testTitle)
      await page.getByLabel(/expected attendees/i).fill('150')
      await page.getByLabel(/budget/i).fill('5000')

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await page.getByLabel(/start date/i).fill(tomorrow.toISOString().split('T')[0])

      const createButton = page
        .locator('button')
        .filter({ hasText: /create event/i })
        .first()
      await createButton.click()
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 15000 })

      // Wait for page to load
      await page.waitForTimeout(2000)

      // Should display expected attendees
      await expect(page.getByText(/150/)).toBeVisible({ timeout: 10000 })

      // Should display budget (may be formatted with comma)
      await expect(page.getByText(/5,000|5000/)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Delete Event from Details Page', () => {
    // Increase timeout for this test that creates then deletes an event
    test.setTimeout(60000)

    test('should show delete confirmation dialog and delete event', async ({ page }) => {
      // Create event to delete
      await page.goto('/dashboard/events/new')
      await page.waitForTimeout(1000)

      const manualButton = page
        .locator('button')
        .filter({ hasText: /manual form/i })
        .first()
      await expect(manualButton).toBeVisible({ timeout: 10000 })
      await manualButton.click()
      await page.waitForTimeout(500)

      const deleteTestTitle = `Delete From Details ${Date.now()}`
      await page.getByLabel(/event title/i).fill(deleteTestTitle)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await page.getByLabel(/start date/i).fill(tomorrow.toISOString().split('T')[0])

      const createButton = page
        .locator('button')
        .filter({ hasText: /create event/i })
        .first()
      await createButton.click()
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 15000 })

      // Wait for page to load
      await page.waitForTimeout(3000)

      // Set up dialog handler for window.confirm() - auto-accept the dialog
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm')
        expect(dialog.message()).toContain('Are you sure')
        await dialog.accept()
      })

      // Click delete button
      const deleteButton = page
        .locator('button')
        .filter({ hasText: /delete/i })
        .first()
      await expect(deleteButton).toBeVisible({ timeout: 10000 })
      await deleteButton.click()

      // Should redirect to events list after deletion
      await expect(page).toHaveURL(/\/dashboard\/events$/, { timeout: 10000 })
    })

    test('should cancel delete when clicking cancel in confirmation', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page
        .locator('.rounded-lg.border')
        .filter({ has: page.locator('h3') })
        .first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Get current URL
        const currentUrl = page.url()

        // Set up dialog handler for window.confirm() - dismiss (cancel) the dialog
        page.once('dialog', async (dialog) => {
          expect(dialog.type()).toBe('confirm')
          await dialog.dismiss() // Click "Cancel" on the confirm dialog
        })

        // Click delete button
        const deleteButton = page
          .locator('button')
          .filter({ hasText: /delete/i })
          .first()
        await expect(deleteButton).toBeVisible({ timeout: 10000 })
        await deleteButton.click()

        // Wait a moment
        await page.waitForTimeout(1000)

        // We should still be on the same page (delete was cancelled)
        expect(page.url()).toBe(currentUrl)
      }
    })
  })
})
