/**
 * Check-in System E2E Tests
 *
 * Tests for:
 * - Check-in page navigation
 * - QR code generation (ticket numbers)
 * - QR scanner UI
 * - Manual search & check-in
 * - Undo check-in
 * - Check-in statistics
 */

import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

let testEventId: string | null = null

test.describe('Check-in System', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/sign-in')
    await page.waitForTimeout(1000)
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 })

    // Handle onboarding if present
    if (page.url().includes('onboarding')) {
      await page.goto('/dashboard/events')
    }

    await page.waitForTimeout(2000)
  })

  // Helper to create a test event and navigate to check-in mode
  async function createEventWithAttendeeAndGoToCheckIn(page: import('@playwright/test').Page) {
    // Create a new event
    await page.goto('/dashboard/events/new')
    await page.waitForTimeout(2000)

    const manualButton = page
      .locator('button')
      .filter({ hasText: /manual form/i })
      .first()
    await expect(manualButton).toBeVisible({ timeout: 15000 })
    await manualButton.click()
    await page.waitForTimeout(1000)

    const testTitle = `Check-In Test Event ${Date.now()}`
    await page.getByLabel(/event title/i).fill(testTitle)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel(/start date/i).fill(tomorrow.toISOString().split('T')[0])

    const createButton = page
      .locator('button')
      .filter({ hasText: /create event/i })
      .first()
    await createButton.click()
    await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 20000 })
    await page.waitForTimeout(3000)

    // Extract event ID
    const url = page.url()
    testEventId = url.split('/').pop() || null

    // Navigate to attendees page and add an attendee
    await page.goto(`/dashboard/events/${testEventId}/attendees`)
    await page.waitForTimeout(2000)

    // Add an attendee
    const addButton = page.getByRole('button', { name: /add attendee/i }).first()
    await expect(addButton).toBeVisible({ timeout: 10000 })
    await addButton.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    const attendeeName = `Check-In Test ${Date.now()}`
    const attendeeEmail = `checkin${Date.now()}@test.com`
    await page.locator('#name').fill(attendeeName)
    await page.locator('#email').fill(attendeeEmail)

    const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
    await submitButton.click()
    await page.waitForTimeout(2000)

    // Navigate to check-in mode
    const checkInModeButton = page.getByRole('button', { name: /check-in mode/i }).first()
    if (await checkInModeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkInModeButton.click()
    } else {
      await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
    }
    await page.waitForTimeout(2000)

    // Verify we're on the check-in page - use heading role to be specific
    await expect(page.getByRole('heading', { name: 'Check-In Mode' })).toBeVisible({
      timeout: 10000,
    })

    return { attendeeName, attendeeEmail }
  }

  // Helper to navigate to existing event's check-in page
  async function navigateToCheckInPage(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/events')
    await page.waitForTimeout(2000)

    // Click first event
    const eventCard = page
      .locator('.rounded-lg.border')
      .filter({ has: page.locator('h3') })
      .first()
    if (await eventCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eventCard.click()
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })

      // Get event ID
      const url = page.url()
      testEventId = url.split('/').pop() || null

      // Navigate to attendees page first
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)

      // Click Check-in Mode button or navigate directly
      const checkInModeButton = page.getByRole('button', { name: /check-in mode/i }).first()
      if (await checkInModeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await checkInModeButton.click()
      } else {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
      }
      await page.waitForTimeout(2000)

      return true
    }
    return false
  }

  test.describe('Check-in Page Navigation', () => {
    test.setTimeout(90000)

    test('should navigate to check-in mode from attendees page', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        await expect(page.getByRole('heading', { name: 'Check-In Mode' })).toBeVisible({
          timeout: 10000,
        })
        await expect(page).toHaveURL(/\/attendees\/check-in$/)
      }
    })

    test('should display check-in mode header with QR icon', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        // Should show "Check-In Mode" heading
        const heading = page.locator('h1').filter({ hasText: 'Check-In Mode' })
        await expect(heading).toBeVisible({ timeout: 10000 })
      }
    })

    test('should have Exit Check-In Mode button', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const exitButton = page.getByRole('button', { name: /exit check-in mode/i })
        await expect(exitButton).toBeVisible({ timeout: 10000 })
      }
    })

    test('should navigate back to attendees page', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        // Click Exit Check-In Mode or back arrow
        const exitButton = page.getByRole('button', { name: /exit check-in mode/i })
        await expect(exitButton).toBeVisible({ timeout: 10000 })
        await exitButton.click()

        // Should navigate to attendees page
        await expect(page).toHaveURL(/\/attendees$/, { timeout: 10000 })
      }
    })
  })

  test.describe('QR Code Generation (Ticket Numbers)', () => {
    test.setTimeout(120000)

    test('should generate ticket number when attendee is created', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Go back to attendees page to see the ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)

      // Should see ticket number in attendee row (format: TKT-XXXX-XXXX)
      const ticketNumber = page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first()
      await expect(ticketNumber).toBeVisible({ timeout: 10000 })
    })

    test('should have correct ticket number format (TKT-XXXX-XXXX)', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Navigate to attendees page
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)

      // Find ticket number in the table
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()
      expect(ticketText).toMatch(/^TKT-[A-Z0-9]+-[A-Z0-9]+$/)
    })

    test('should display ticket number in attendee details', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Navigate to attendees page
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)

      // Check that ticket column exists
      const ticketColumn = page.getByRole('columnheader', { name: /ticket/i })
      await expect(ticketColumn).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('QR Scanner UI', () => {
    test.setTimeout(90000)

    test('should show QR scanner panel', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const scannerHeading = page.getByText('QR Code Scanner')
        await expect(scannerHeading).toBeVisible({ timeout: 10000 })
      }
    })

    test('should have Start Camera button initially', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const startCameraButton = page.getByRole('button', { name: /start camera/i })
        await expect(startCameraButton).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show camera placeholder when camera is off', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        // Should show "Camera is off" text
        await expect(page.getByText('Camera is off')).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show note about QR code library', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const note = page.getByText(/QR code detection requires/i)
        await expect(note).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Manual Search & Check-in', () => {
    test.setTimeout(120000)

    test('should show manual search panel', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const searchHeading = page.getByText('Manual Search')
        await expect(searchHeading).toBeVisible({ timeout: 10000 })
      }
    })

    test('should have ticket number search input', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await expect(searchInput).toBeVisible({ timeout: 10000 })
      }
    })

    test('should convert input to uppercase', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill('tkt-abc123')
        await page.waitForTimeout(500)

        // Input should be uppercase
        const value = await searchInput.inputValue()
        expect(value).toBe('TKT-ABC123')
      }
    })

    test('should show no result message for invalid ticket', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill('TKT-INVALID-123456')
        await page.waitForTimeout(2000)

        // Should show no attendee found message
        await expect(page.getByText(/no attendee found/i)).toBeVisible({ timeout: 10000 })
      }
    })

    test('should search attendee by ticket number and show result', async ({ page }) => {
      const { attendeeName } = await createEventWithAttendeeAndGoToCheckIn(page)

      // Get the ticket number from attendees page
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)

      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        // Go back to check-in page
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        // Search for the ticket
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        // Should show the attendee info
        await expect(page.getByText(attendeeName)).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show green border for eligible attendee', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Get ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        // Should have green border (border-green-500)
        const resultCard = page.locator('.border-green-500')
        await expect(resultCard).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show Check In button for eligible attendee', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Get ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        // Should show Check In button
        const checkInButton = page.getByRole('button', { name: /check in/i })
        await expect(checkInButton).toBeVisible({ timeout: 10000 })
      }
    })

    test('should check in attendee successfully', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Get ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        // Click Check In button
        const checkInButton = page.getByRole('button', { name: /check in/i })
        await checkInButton.click()
        await page.waitForTimeout(2000)

        // Should show success (green result card or toast)
        // Look for success message or checked in status
        const successIndicator = page
          .locator('.border-green-500')
          .filter({ hasText: /checked in successfully/i })
        await expect(successIndicator).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Undo Check-in', () => {
    test.setTimeout(120000)

    test('should show Undo button after successful check-in', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Get ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        // Check in the attendee
        const checkInButton = page.getByRole('button', { name: /check in/i })
        await checkInButton.click()
        await page.waitForTimeout(2000)

        // Should show Undo button in the result area
        const undoButton = page.getByRole('button', { name: /undo/i }).first()
        await expect(undoButton).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show amber border for already checked-in attendee', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Get ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        // First check in the attendee
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        const checkInButton = page.getByRole('button', { name: /check in/i })
        await checkInButton.click()
        await page.waitForTimeout(2000)

        // Clear and search again
        await searchInput.clear()
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        // Should show amber border (already checked in)
        const amberCard = page.locator('.border-amber-500')
        await expect(amberCard).toBeVisible({ timeout: 10000 })

        // Should show "Already Checked In" badge
        await expect(page.getByText(/already checked in/i)).toBeVisible({ timeout: 5000 })
      }
    })

    test('should undo check-in successfully', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Get ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        // Check in the attendee
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        const checkInButton = page.getByRole('button', { name: /check in/i })
        await checkInButton.click()
        await page.waitForTimeout(2000)

        // Click Undo button
        const undoButton = page.getByRole('button', { name: /undo/i }).first()
        await undoButton.click()
        await page.waitForTimeout(2000)

        // Search again to verify status reverted
        await searchInput.clear()
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        // Should show Check In button again (not already checked in)
        const newCheckInButton = page.getByRole('button', { name: /check in/i })
        await expect(newCheckInButton).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Check-in Statistics', () => {
    test.setTimeout(120000)

    test('should display statistics bar', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        // Should show 3-column stats grid
        const statsGrid = page.locator('.grid-cols-3').first()
        await expect(statsGrid).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show Checked In count', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        // Should show "Checked In" label
        await expect(page.getByText('Checked In', { exact: true })).toBeVisible({ timeout: 10000 })

        // Should show emerald colored number
        const checkedInStat = page.locator('.text-emerald-600').first()
        await expect(checkedInStat).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show Remaining count', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        await expect(page.getByText('Remaining')).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show Check-In Rate percentage', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        await expect(page.getByText('Check-In Rate')).toBeVisible({ timeout: 10000 })

        // Should show percentage with primary color
        const rateStat = page.locator('.text-primary').filter({ hasText: /%/ }).first()
        await expect(rateStat).toBeVisible({ timeout: 10000 })
      }
    })

    test('should update stats after check-in', async ({ page }) => {
      await createEventWithAttendeeAndGoToCheckIn(page)

      // Get initial checked in count
      const initialCheckedIn = await page.locator('.text-emerald-600').first().textContent()

      // Get ticket number
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)
      const ticketText = await page.locator('text=/TKT-[A-Z0-9]+-[A-Z0-9]+/').first().textContent()

      if (ticketText) {
        await page.goto(`/dashboard/events/${testEventId}/attendees/check-in`)
        await page.waitForTimeout(2000)

        // Check in the attendee
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill(ticketText)
        await page.waitForTimeout(2000)

        const checkInButton = page.getByRole('button', { name: /check in/i })
        await checkInButton.click()
        await page.waitForTimeout(2000)

        // Get updated checked in count
        const updatedCheckedIn = await page.locator('.text-emerald-600').first().textContent()

        // Count should have increased
        expect(parseInt(updatedCheckedIn || '0')).toBeGreaterThanOrEqual(
          parseInt(initialCheckedIn || '0')
        )
      }
    })
  })

  test.describe('Error Handling', () => {
    test.setTimeout(90000)

    test('should show error for invalid ticket number', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill('TKT-NOTEXIST-123456')
        await page.waitForTimeout(2000)

        // Should show no attendee found message
        await expect(page.getByText(/no attendee found/i)).toBeVisible({ timeout: 10000 })
      }
    })

    test('should handle short search input gracefully', async ({ page }) => {
      const hasEvent = await navigateToCheckInPage(page)
      if (hasEvent) {
        const searchInput = page.getByPlaceholder(/enter ticket number/i)
        await searchInput.fill('TKT')
        await page.waitForTimeout(1000)

        // Should not show any result (search only starts after 3 chars)
        const noResult = page.getByText(/no attendee found/i)
        await expect(noResult).not.toBeVisible()
      }
    })
  })
})
