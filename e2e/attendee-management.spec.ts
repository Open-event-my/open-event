/**
 * E2E Tests for Attendee Management
 *
 * Tests cover:
 * - Add attendee manually
 * - Import attendees from CSV
 * - View attendee list
 * - Filter by status
 * - Search attendees
 * - Cancel registration
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

// Store event ID for test reuse
let testEventId: string | null = null

test.describe('Attendee Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/sign-in')
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 })

    // Handle onboarding if needed
    if (page.url().includes('onboarding')) {
      await page.goto('/dashboard/events')
    }
  })

  // Helper to navigate to an event's attendees page
  async function navigateToAttendeesPage(
    page: import('@playwright/test').Page
  ): Promise<boolean> {
    await page.goto('/dashboard/events')
    await page.waitForTimeout(2000)

    const eventCard = page
      .locator('.rounded-lg.border')
      .filter({ has: page.locator('h3') })
      .first()

    if (await eventCard.isVisible()) {
      await eventCard.click()
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })

      // Extract event ID
      const url = page.url()
      testEventId = url.split('/').pop() || null

      // Navigate to attendees page
      await page.goto(`/dashboard/events/${testEventId}/attendees`)
      await page.waitForTimeout(2000)

      // Verify we're on the attendees page
      await expect(
        page.getByRole('heading', { name: 'Attendees', exact: true })
      ).toBeVisible({ timeout: 10000 })
      return true
    }
    return false
  }

  // Helper to create a test event and navigate to attendees
  async function createEventAndGoToAttendees(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/events/new')
    await page.waitForTimeout(2000)

    const manualButton = page
      .locator('button')
      .filter({ hasText: /manual form/i })
      .first()
    await expect(manualButton).toBeVisible({ timeout: 15000 })
    await manualButton.click()
    await page.waitForTimeout(1000)

    const testTitle = `Attendee Test Event ${Date.now()}`
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

    // Wait for page to load and extract event ID
    await page.waitForTimeout(3000)
    const url = page.url()
    testEventId = url.split('/').pop() || null

    // Navigate to attendees page
    await page.goto(`/dashboard/events/${testEventId}/attendees`)
    await page.waitForTimeout(2000)

    // Verify we're on the attendees page
    await expect(
      page.getByRole('heading', { name: 'Attendees', exact: true })
    ).toBeVisible({ timeout: 10000 })
  }

  test.describe('Add Attendee Manually', () => {
    test.setTimeout(60000)

    test('should add attendee with required fields only', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Click Add Attendee button
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await expect(addButton).toBeVisible({ timeout: 10000 })
      await addButton.click()

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('heading', { name: 'Add Attendee' })).toBeVisible()

      // Fill required fields only
      const attendeeName = `Test Attendee ${Date.now()}`
      const attendeeEmail = `attendee${Date.now()}@test.com`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(attendeeEmail)

      // Submit
      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()

      // Wait for modal to close and verify attendee appears
      await page.waitForTimeout(2000)
      await expect(page.getByText(attendeeName)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(attendeeEmail)).toBeVisible()
    })

    test('should add attendee with all optional fields', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill all fields
      const attendeeName = `Full Attendee ${Date.now()}`
      const attendeeEmail = `full${Date.now()}@test.com`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(attendeeEmail)
      await page.locator('#phone').fill('+1234567890')
      await page.locator('#organization').fill('Test Corp')
      await page.locator('#jobTitle').fill('Software Engineer')
      await page.locator('#dietaryRestrictions').fill('Vegetarian')
      await page.locator('#accessibilityNeeds').fill('None')
      await page.locator('#specialRequests').fill('Prefer front row seating')
      await page.locator('#notes').fill('VIP guest')

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(attendeeName)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Test Corp')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill with invalid email
      await page.locator('#name').fill('Invalid Email Test')
      await page.locator('#email').fill('invalid-email')

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()

      // Browser's native HTML5 validation blocks submission for type="email" inputs
      // The modal should remain open (form not submitted)
      await page.waitForTimeout(1000)
      await expect(page.getByRole('dialog')).toBeVisible()

      // The invalid email input should have validation state
      const emailInput = page.locator('#email')
      await expect(emailInput).toBeVisible()
      // Verify form didn't close (attendee not added)
      await expect(page.getByText('Invalid Email Test')).not.toBeVisible()
    })

    test('should prevent duplicate email registration', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add first attendee
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const duplicateEmail = `duplicate${Date.now()}@test.com`
      await page.locator('#name').fill('First Attendee')
      await page.locator('#email').fill(duplicateEmail)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Try to add second attendee with same email
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.locator('#name').fill('Duplicate Attendee')
      await page.locator('#email').fill(duplicateEmail)

      const submitButton2 = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton2.click()
      await page.waitForTimeout(1000)

      // Should show error about duplicate
      await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 5000 })
    })

    test('should show new attendee in list after adding', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const uniqueName = `List Test ${Date.now()}`
      const uniqueEmail = `listtest${Date.now()}@test.com`
      await page.locator('#name').fill(uniqueName)
      await page.locator('#email').fill(uniqueEmail)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify in table
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 })
      // Verify ticket number is generated (TKT-XXXX format)
      await expect(page.getByText(/TKT-/)).toBeVisible()
    })
  })

  test.describe('Import Attendees CSV', () => {
    test.setTimeout(60000)

    test('should open import modal', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Click Import CSV button
      const importButton = page.getByRole('button', { name: /import csv/i }).first()
      await expect(importButton).toBeVisible({ timeout: 10000 })
      await importButton.click()

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('heading', { name: /import attendees/i })).toBeVisible()
    })

    test('should show download sample CSV button', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const importButton = page.getByRole('button', { name: /import csv/i }).first()
      await importButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Look for sample CSV download button
      const sampleButton = page.getByRole('button', { name: /download sample/i })
      await expect(sampleButton).toBeVisible({ timeout: 5000 })
    })

    test('should show CSV file input', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const importButton = page.getByRole('button', { name: /import csv/i }).first()
      await importButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Check for file input
      const fileInput = page.locator('input[type="file"][accept=".csv"]')
      await expect(fileInput).toBeAttached()
    })
  })

  test.describe('View Attendee List', () => {
    test.setTimeout(60000)

    test('should display attendees page with stats cards', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Verify stats cards are visible - use stat card label selectors
      const statsSection = page.locator('.grid').filter({ hasText: 'Total' }).first()
      await expect(statsSection).toBeVisible({ timeout: 10000 })
      // Check for stat card labels (they have text-muted-foreground class)
      await expect(page.locator('.text-muted-foreground').filter({ hasText: 'Total' }).first()).toBeVisible()
      await expect(page.locator('.text-muted-foreground').filter({ hasText: 'Registered' })).toBeVisible()
      await expect(page.locator('.text-muted-foreground').filter({ hasText: 'Confirmed' })).toBeVisible()
      await expect(page.locator('.text-muted-foreground').filter({ hasText: 'Checked In' })).toBeVisible()
      await expect(page.locator('.text-muted-foreground').filter({ hasText: 'Cancelled' })).toBeVisible()
      await expect(page.locator('.text-muted-foreground').filter({ hasText: 'Check-in Rate' })).toBeVisible()
    })

    test('should show attendee table headers', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // First add an attendee to see the table
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.locator('#name').fill(`Table Test ${Date.now()}`)
      await page.locator('#email').fill(`table${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify table headers
      await expect(page.getByRole('columnheader', { name: /attendee/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /contact/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /ticket/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /registered/i })).toBeVisible()
      await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible()
    })

    test('should show empty state when no attendees', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // For a new event, should show empty state
      await expect(page.getByText(/no attendees yet/i)).toBeVisible({ timeout: 10000 })
    })

    test('should display attendee details in table row', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add an attendee with organization
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Details Test ${Date.now()}`
      const attendeeEmail = `details${Date.now()}@test.com`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(attendeeEmail)
      await page.locator('#organization').fill('Details Corp')

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify details in table
      await expect(page.getByText(attendeeName)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(attendeeEmail)).toBeVisible()
      await expect(page.getByText('Details Corp')).toBeVisible()
    })

    test('should show status badge', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.locator('#name').fill(`Status Test ${Date.now()}`)
      await page.locator('#email').fill(`status${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify status badge (new attendees are "Registered")
      await expect(page.getByText('Registered', { exact: true }).first()).toBeVisible({
        timeout: 10000,
      })
    })
  })

  test.describe('Filter by Status', () => {
    test.setTimeout(60000)

    test('should show all attendees by default', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add a couple of attendees
      for (let i = 0; i < 2; i++) {
        const addButton = page.getByRole('button', { name: /add attendee/i }).first()
        await addButton.click()
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        await page.locator('#name').fill(`Filter All ${i} ${Date.now()}`)
        await page.locator('#email').fill(`filterall${i}${Date.now()}@test.com`)

        const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
        await submitButton.click()
        await page.waitForTimeout(1500)
      }

      // "All" filter should be active by default
      const allButton = page.locator('button').filter({ hasText: 'All' }).first()
      await expect(allButton).toHaveClass(/bg-primary/)
    })

    test('should filter by registered status', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add an attendee
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Registered Filter ${Date.now()}`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(`regfilter${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Click Registered filter
      const registeredButton = page.locator('button').filter({ hasText: 'Registered' })
      await registeredButton.click()
      await page.waitForTimeout(1000)

      // Attendee should still be visible
      await expect(page.getByText(attendeeName)).toBeVisible({ timeout: 5000 })
    })

    test('should filter by cancelled status', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add and cancel an attendee
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Cancel Filter ${Date.now()}`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(`cancelfilter${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Set up dialog handler for confirm
      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Open dropdown and cancel
      const row = page.locator('tr').filter({ hasText: attendeeName }).first()
      const menuButton = row.locator('button').last()
      await menuButton.click()

      const cancelItem = page.getByRole('menuitem', { name: /cancel registration/i })
      await cancelItem.click()
      await page.waitForTimeout(2000)

      // Click Cancelled filter
      const cancelledButton = page.locator('button').filter({ hasText: 'Cancelled' })
      await cancelledButton.click()
      await page.waitForTimeout(1000)

      // Cancelled attendee should be visible
      await expect(page.getByText(attendeeName)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Search Attendees', () => {
    test.setTimeout(60000)

    test('should search by attendee name', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add an attendee with unique name
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const uniqueName = `SearchName${Date.now()}`
      await page.locator('#name').fill(uniqueName)
      await page.locator('#email').fill(`searchname${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Search for the name
      const searchInput = page.getByPlaceholder(/search by name, email, or ticket/i)
      await searchInput.fill(uniqueName)
      await page.waitForTimeout(1000)

      // Attendee should be visible
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5000 })
    })

    test('should search by email', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const uniqueEmail = `searchemail${Date.now()}@unique.com`
      await page.locator('#name').fill(`Email Search ${Date.now()}`)
      await page.locator('#email').fill(uniqueEmail)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Search for the email
      const searchInput = page.getByPlaceholder(/search by name, email, or ticket/i)
      await searchInput.fill(uniqueEmail)
      await page.waitForTimeout(1000)

      // Email should be visible
      await expect(page.getByText(uniqueEmail)).toBeVisible({ timeout: 5000 })
    })

    test('should show no results for non-matching search', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add an attendee first
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.locator('#name').fill(`NoMatch Test ${Date.now()}`)
      await page.locator('#email').fill(`nomatch${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Search for non-existent term
      const searchInput = page.getByPlaceholder(/search by name, email, or ticket/i)
      await searchInput.fill('XXXXXXNOTEXISTINGXXXXXX')
      await page.waitForTimeout(1000)

      // Should show empty or no results
      // Either no attendees visible in table or empty state
      const tableBody = page.locator('tbody')
      const rows = tableBody.locator('tr')
      await expect(rows).toHaveCount(0)
    })

    test('should clear search and show all attendees', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add an attendee
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Clear Search ${Date.now()}`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(`clearsearch${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Search for something else
      const searchInput = page.getByPlaceholder(/search by name, email, or ticket/i)
      await searchInput.fill('NOMATCH')
      await page.waitForTimeout(1000)

      // Clear search
      await searchInput.fill('')
      await page.waitForTimeout(1000)

      // Attendee should be visible again
      await expect(page.getByText(attendeeName)).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Cancel Registration', () => {
    test.setTimeout(60000)

    test('should show cancel option in dropdown menu', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      // Add an attendee
      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Cancel Option ${Date.now()}`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(`canceloption${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Open dropdown
      const row = page.locator('tr').filter({ hasText: attendeeName }).first()
      const menuButton = row.locator('button').last()
      await menuButton.click()

      // Cancel option should be visible
      await expect(page.getByRole('menuitem', { name: /cancel registration/i })).toBeVisible({
        timeout: 5000,
      })
    })

    test('should cancel registration successfully', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Cancel Success ${Date.now()}`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(`cancelsuccess${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Open dropdown and cancel
      const row = page.locator('tr').filter({ hasText: attendeeName }).first()
      const menuButton = row.locator('button').last()
      await menuButton.click()

      const cancelItem = page.getByRole('menuitem', { name: /cancel registration/i })
      await cancelItem.click()
      await page.waitForTimeout(2000)

      // Status should now be Cancelled
      const cancelledBadge = row.getByText('Cancelled', { exact: true })
      await expect(cancelledBadge).toBeVisible({ timeout: 5000 })
    })

    test('should update status badge to cancelled', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Badge Update ${Date.now()}`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(`badgeupdate${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify initially Registered
      const row = page.locator('tr').filter({ hasText: attendeeName }).first()
      await expect(row.getByText('Registered', { exact: true })).toBeVisible()

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Cancel
      const menuButton = row.locator('button').last()
      await menuButton.click()
      await page.getByRole('menuitem', { name: /cancel registration/i }).click()
      await page.waitForTimeout(2000)

      // Verify Cancelled badge
      await expect(row.getByText('Cancelled', { exact: true })).toBeVisible({ timeout: 5000 })
    })

    test('should not show cancel option for already cancelled', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const addButton = page.getByRole('button', { name: /add attendee/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const attendeeName = `Already Cancelled ${Date.now()}`
      await page.locator('#name').fill(attendeeName)
      await page.locator('#email').fill(`alreadycancelled${Date.now()}@test.com`)

      const submitButton = page.getByRole('button', { name: 'Add Attendee' }).last()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Set up dialog handler
      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Cancel the attendee
      const row = page.locator('tr').filter({ hasText: attendeeName }).first()
      let menuButton = row.locator('button').last()
      await menuButton.click()
      await page.getByRole('menuitem', { name: /cancel registration/i }).click()
      await page.waitForTimeout(2000)

      // Open dropdown again
      menuButton = row.locator('button').last()
      await menuButton.click()
      await page.waitForTimeout(500)

      // Cancel option should NOT be visible for cancelled attendee
      await expect(page.getByRole('menuitem', { name: /cancel registration/i })).not.toBeVisible()
    })
  })

  test.describe('Attendee Page Navigation', () => {
    test.setTimeout(60000)

    test('should navigate to attendees page from event detail', async ({ page }) => {
      const hasEvent = await navigateToAttendeesPage(page)

      if (hasEvent) {
        // Verify page elements
        await expect(
          page.getByRole('heading', { name: 'Attendees', exact: true })
        ).toBeVisible()
        await expect(page.getByText('Total')).toBeVisible()
      }
    })

    test('should have Check-in Mode button', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const checkInButton = page.getByRole('button', { name: /check-in mode/i })
      await expect(checkInButton).toBeVisible({ timeout: 10000 })
    })

    test('should have Export button', async ({ page }) => {
      await createEventAndGoToAttendees(page)

      const exportButton = page.getByRole('button', { name: /export/i })
      await expect(exportButton).toBeVisible({ timeout: 10000 })
    })
  })
})
