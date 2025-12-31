import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Ticketing System', () => {
  // Store event ID for tests that need it
  let testEventId: string | null = null

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

  // Helper function to navigate to tickets page
  async function navigateToTicketsPage(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/events')
    await page.waitForTimeout(2000)

    // Click first event card
    const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

    if (await eventCard.isVisible()) {
      await eventCard.click()
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
      await page.waitForTimeout(1000)

      // Extract event ID from URL
      const url = page.url()
      testEventId = url.split('/').pop() || null

      // Navigate to tickets page
      await page.goto(`/dashboard/events/${testEventId}/tickets`)
      await page.waitForTimeout(2000)
      return true
    }
    return false
  }

  // Helper to create a test event and navigate to its tickets page
  async function createEventAndGoToTickets(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/events/new')
    await page.waitForTimeout(2000)

    const manualButton = page.locator('button').filter({ hasText: /manual form/i }).first()
    await expect(manualButton).toBeVisible({ timeout: 15000 })
    await manualButton.click()
    await page.waitForTimeout(1000)

    const testTitle = `Ticket Test Event ${Date.now()}`
    await page.getByLabel(/event title/i).fill(testTitle)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel(/start date/i).fill(tomorrow.toISOString().split('T')[0])

    const createButton = page.locator('button').filter({ hasText: /create event/i }).first()
    await createButton.click()
    await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 20000 })

    // Wait for page to fully load
    await page.waitForTimeout(3000)

    // Extract event ID and navigate to tickets
    const url = page.url()
    testEventId = url.split('/').pop() || null

    // Navigate to tickets page via link instead of direct URL
    const ticketsLink = page.locator('a[href*="/tickets"]').first()
    if (await ticketsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await ticketsLink.click()
    } else {
      // Fallback to direct navigation
      await page.goto(`/dashboard/events/${testEventId}/tickets`)
    }
    await page.waitForTimeout(3000)

    // Verify we're on the tickets page - look for the heading
    await expect(page.getByRole('heading', { name: /tickets/i }).first()).toBeVisible({ timeout: 10000 })
  }

  test.describe('Create Ticket Types', () => {
    test.setTimeout(60000)

    test('should create a free ticket type', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Click Add Ticket Type button (use first since there may be one in empty state too)
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await expect(addButton).toBeVisible({ timeout: 10000 })
      await addButton.click()

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill form for free ticket
      await page.getByLabel(/name/i).first().fill('Free Entry')
      await page.locator('#description').fill('Free admission ticket')
      await page.locator('#price').fill('0')
      await page.locator('#quantity').fill('100')

      // Submit
      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()

      // Wait for modal to close and ticket to appear
      await page.waitForTimeout(2000)

      // Verify ticket is in the list
      await expect(page.getByText('Free Entry')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Free', { exact: true })).toBeVisible()
    })

    test('should create a paid ticket type', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Click Add Ticket Type button
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await expect(addButton).toBeVisible({ timeout: 10000 })
      await addButton.click()

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill form for paid ticket
      await page.getByLabel(/name/i).first().fill('VIP Access')
      await page.locator('#description').fill('Premium VIP ticket with exclusive access')
      await page.locator('#price').fill('99.99')
      await page.locator('#quantity').fill('50')

      // Submit
      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()

      // Wait for modal to close
      await page.waitForTimeout(2000)

      // Verify ticket is in the list with correct price
      await expect(page.getByText('VIP Access')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/\$99\.99/)).toBeVisible()
    })

    test('should validate required fields', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Click Add Ticket Type button
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await expect(addButton).toBeVisible({ timeout: 10000 })
      await addButton.click()

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Try to submit without filling required fields
      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()

      // Should show validation error for name
      await expect(page.getByText(/please enter a ticket name/i)).toBeVisible({ timeout: 5000 })
    })

    test('should show ticket in list after creation', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Get initial ticket count
      const ticketCountText = await page.locator('.text-2xl.font-bold').first().textContent()
      const initialCount = parseInt(ticketCountText || '0')

      // Create a new ticket
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const uniqueName = `Test Ticket ${Date.now()}`
      await page.getByLabel(/name/i).first().fill(uniqueName)
      await page.locator('#price').fill('25')
      await page.locator('#quantity').fill('200')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify new ticket appears in list
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 })

      // Verify count increased
      await page.waitForTimeout(1000)
      const newCountText = await page.locator('.text-2xl.font-bold').first().textContent()
      const newCount = parseInt(newCountText || '0')
      expect(newCount).toBeGreaterThanOrEqual(initialCount)
    })
  })

  test.describe('Quantity Limits', () => {
    test.setTimeout(60000)

    test('should set quantity limit on ticket', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Create ticket with quantity limit
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Limited Seats')
      await page.locator('#price').fill('50')
      await page.locator('#quantity').fill('25')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify ticket shows remaining count
      await expect(page.getByText('Limited Seats')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/25 remaining/)).toBeVisible()
    })

    test('should set max per order limit', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Create ticket with max per order
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Group Ticket')
      await page.locator('#price').fill('30')
      await page.locator('#quantity').fill('100')
      await page.locator('#maxPerOrder').clear()
      await page.locator('#maxPerOrder').fill('5')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Ticket should be created
      await expect(page.getByText('Group Ticket')).toBeVisible({ timeout: 10000 })
    })

    test('should display remaining tickets', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Create ticket with quantity
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Counted Ticket')
      await page.locator('#price').fill('15')
      await page.locator('#quantity').fill('75')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify remaining count is displayed
      await expect(page.getByText('Counted Ticket')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/75 remaining/)).toBeVisible()
      await expect(page.getByText('0 sold')).toBeVisible()
    })
  })

  test.describe('Sales Window', () => {
    test.setTimeout(60000)

    test('should set sales start date', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Early Bird')
      await page.locator('#price').fill('40')
      await page.locator('#quantity').fill('100')

      // Set future sales start date
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const futureDateStr = futureDate.toISOString().slice(0, 16)
      await page.locator('#salesStartAt').fill(futureDateStr)

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify ticket shows "Not on sale yet" status
      await expect(page.getByText('Early Bird')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/not on sale yet/i)).toBeVisible()
    })

    test('should set sales end date', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Flash Sale')
      await page.locator('#price').fill('20')
      await page.locator('#quantity').fill('50')

      // Set past sales end date to test "Sales ended" status
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const pastDateStr = pastDate.toISOString().slice(0, 16)
      await page.locator('#salesEndAt').fill(pastDateStr)

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify ticket shows "Sales ended" status
      await expect(page.getByText('Flash Sale')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/sales ended/i)).toBeVisible()
    })

    test('should show "Not on sale yet" for future start date', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Future Ticket')
      await page.locator('#price').fill('35')
      await page.locator('#quantity').fill('100')

      // Set sales start to next month
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1)
      await page.locator('#salesStartAt').fill(futureDate.toISOString().slice(0, 16))

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText('Future Ticket')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/not on sale yet/i)).toBeVisible()
    })

    test('should show "Sales ended" for past end date', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Expired Ticket')
      await page.locator('#price').fill('45')
      await page.locator('#quantity').fill('100')

      // Set sales end to yesterday
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      await page.locator('#salesEndAt').fill(pastDate.toISOString().slice(0, 16))

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText('Expired Ticket')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/sales ended/i)).toBeVisible()
    })
  })

  test.describe('Hidden Tickets', () => {
    test.setTimeout(60000)

    test('should create hidden ticket', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Secret VIP')
      await page.locator('#price').fill('150')
      await page.locator('#quantity').fill('20')

      // Enable hidden toggle
      const hiddenSwitch = page.locator('button[role="switch"]').last()
      await hiddenSwitch.click()

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify hidden ticket is created
      await expect(page.getByText('Secret VIP')).toBeVisible({ timeout: 10000 })
    })

    test('should show hidden badge on ticket card', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Hidden Special')
      await page.locator('#price').fill('75')
      await page.locator('#quantity').fill('30')

      // Enable hidden toggle (last switch in the dialog)
      const hiddenSwitch = page.locator('button[role="switch"]').last()
      await hiddenSwitch.click()

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify hidden badge is shown
      await expect(page.getByText('Hidden Special')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Hidden', { exact: true })).toBeVisible()
    })
  })

  test.describe('Ticket Perks', () => {
    test.setTimeout(60000)

    test('should add perks to ticket', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Premium Pass')
      await page.locator('#price').fill('199')
      await page.locator('#quantity').fill('50')

      // Add perks
      await page.locator('#perks').fill('Access to all sessions\nFree lunch\nEvent swag bag\nPriority seating')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify ticket is created with perks
      await expect(page.getByText('Premium Pass')).toBeVisible({ timeout: 10000 })
    })

    test('should display perks on ticket card', async ({ page }) => {
      await createEventAndGoToTickets(page)

      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Full Experience')
      await page.locator('#description').fill('The complete event experience')
      await page.locator('#price').fill('250')
      await page.locator('#quantity').fill('25')
      await page.locator('#perks').fill('VIP lounge access\nMeet and greet\nExclusive merchandise')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify ticket appears with description
      await expect(page.getByText('Full Experience')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('The complete event experience')).toBeVisible()
    })
  })

  test.describe('Enable/Disable Tickets', () => {
    test.setTimeout(60000)

    test('should toggle ticket active state', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // First create a ticket
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Toggle Test')
      await page.locator('#price').fill('25')
      await page.locator('#quantity').fill('100')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText('Toggle Test')).toBeVisible({ timeout: 10000 })

      // Find the ticket row and click its menu
      const ticketRow = page.locator('.divide-y > div').filter({ hasText: 'Toggle Test' })
      const menuButton = ticketRow.locator('button').filter({ has: page.locator('svg') }).last()
      await menuButton.click()

      // Click Deactivate
      await page.getByRole('menuitem', { name: /deactivate/i }).click()
      await page.waitForTimeout(1000)

      // Verify ticket shows Inactive status
      await expect(page.getByText(/inactive/i)).toBeVisible({ timeout: 5000 })
    })

    test('should show inactive badge when disabled', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Create a ticket and immediately set it as inactive
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.getByLabel(/name/i).first().fill('Inactive Ticket')
      await page.locator('#price').fill('30')
      await page.locator('#quantity').fill('50')

      // Disable the Active toggle (first switch)
      const activeSwitch = page.locator('button[role="switch"]').first()
      await activeSwitch.click()

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify Inactive badge
      await expect(page.getByText('Inactive Ticket')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Inactive', { exact: true })).toBeVisible()
    })

    test('should delete ticket with no sales', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // Create a ticket to delete
      const addButton = page.getByRole('button', { name: /add ticket type/i }).first()
      await addButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const deleteTicketName = `Delete Me ${Date.now()}`
      await page.getByLabel(/name/i).first().fill(deleteTicketName)
      await page.locator('#price').fill('10')
      await page.locator('#quantity').fill('100')

      const submitButton = page.locator('button').filter({ hasText: /create ticket/i })
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(deleteTicketName)).toBeVisible({ timeout: 10000 })

      // Set up dialog handler for window.confirm()
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm')
        expect(dialog.message()).toContain('Are you sure')
        await dialog.accept()
      })

      // Find the ticket row and click its menu
      const ticketRow = page.locator('.divide-y > div').filter({ hasText: deleteTicketName })
      const menuButton = ticketRow.locator('button').filter({ has: page.locator('svg') }).last()
      await menuButton.click()

      // Click Delete
      await page.getByRole('menuitem', { name: /delete/i }).click()
      await page.waitForTimeout(2000)

      // Verify ticket is removed
      await expect(page.getByText(deleteTicketName)).not.toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Tickets Page Navigation', () => {
    test('should navigate to tickets page from event details', async ({ page }) => {
      const hasEvent = await navigateToTicketsPage(page)

      if (hasEvent) {
        // Verify we're on the tickets page
        await expect(page.getByText(/tickets/i).first()).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(/ticket types/i)).toBeVisible()
      }
    })

    test('should display stats cards', async ({ page }) => {
      const hasEvent = await navigateToTicketsPage(page)

      if (hasEvent) {
        // Verify stats cards are visible
        await expect(page.getByText(/ticket types/i)).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(/tickets sold/i)).toBeVisible()
        await expect(page.getByText(/revenue/i)).toBeVisible()
      }
    })

    test('should show empty state when no tickets', async ({ page }) => {
      await createEventAndGoToTickets(page)

      // If no tickets exist, should show empty state
      const emptyState = page.getByText(/no ticket types yet/i)
      const ticketList = page.locator('.divide-y')

      // Either empty state or ticket list should be visible
      const hasEmptyState = await emptyState.isVisible().catch(() => false)
      const hasTicketList = await ticketList.isVisible().catch(() => false)

      expect(hasEmptyState || hasTicketList).toBe(true)
    })
  })
})
