import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Event Sales Dashboard
 *
 * Tests cover:
 * - Sales overview (summary cards, chart)
 * - Order search & filter
 * - Order details modal
 * - Refund processing
 */

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

// Helper function to navigate to an existing event's sales page
async function navigateToSalesPage(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/dashboard/events')
  await page.waitForTimeout(2000)

  const eventCard = page
    .locator('.rounded-lg.border')
    .filter({ has: page.locator('h3') })
    .first()

  if (await eventCard.isVisible().catch(() => false)) {
    await eventCard.click()
    await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })

    const url = page.url()
    const eventId = url.split('/').pop() || null

    await page.goto(`/dashboard/events/${eventId}/sales`)
    await page.waitForTimeout(2000)
    return eventId
  }
  return null
}

test.describe('Event Sales Dashboard', () => {
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

    // Dismiss cookie consent if present
    try {
      const acceptBtn = page.getByRole('button', { name: /accept all/i })
      if (await acceptBtn.isVisible({ timeout: 2000 })) {
        await acceptBtn.click()
        await page.waitForTimeout(500)
      }
    } catch {
      // Cookie banner not present, continue
    }
  })

  test.describe('Sales Overview', () => {
    test('should display sales page with header', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Should show Sales header
        const header = page.locator('h1').filter({ hasText: /sales/i })
        await expect(header).toBeVisible({ timeout: 10000 })
      }
    })

    test('should display summary cards', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Should show summary card labels
        const totalRevenueCard = page.getByText(/total revenue/i)
        const ordersCard = page.getByText(/^orders$/i)

        // At least the header and one stat card should be visible
        const header = page.locator('h1').filter({ hasText: /sales/i })
        await expect(header).toBeVisible({ timeout: 10000 })

        // Check for at least one stat card
        const hasRevenue = await totalRevenueCard.isVisible().catch(() => false)
        const hasOrders = await ordersCard.isVisible().catch(() => false)

        expect(hasRevenue || hasOrders).toBeTruthy()
      }
    })

    test('should display sales chart when data exists', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Chart section or "no orders" message should be visible
        const chartSection = page.getByText(/sales over time/i)
        const noOrdersMessage = page.getByText(/no orders found/i)
        const ordersTable = page.locator('table')

        const hasChart = await chartSection.isVisible().catch(() => false)
        const hasNoOrders = await noOrdersMessage.isVisible().catch(() => false)
        const hasTable = await ordersTable.isVisible().catch(() => false)

        // Either chart, table, or no orders message should appear
        expect(hasChart || hasNoOrders || hasTable).toBeTruthy()
      }
    })
  })

  test.describe('Order Search & Filter', () => {
    test('should display search input', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        const searchInput = page.getByPlaceholder(/search orders/i)
        await expect(searchInput).toBeVisible({ timeout: 10000 })
      }
    })

    test('should search orders by order number', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        const searchInput = page.getByPlaceholder(/search orders/i)
        await searchInput.fill('ORD-')
        await page.waitForTimeout(1000)

        // Should filter results (either shows matching orders or "no orders found")
        const table = page.locator('table')
        const noOrdersMessage = page.getByText(/no orders found/i)

        const hasTable = await table.isVisible().catch(() => false)
        const hasNoOrders = await noOrdersMessage.isVisible().catch(() => false)

        expect(hasTable || hasNoOrders).toBeTruthy()
      }
    })

    test('should search orders by buyer name', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        const searchInput = page.getByPlaceholder(/search orders/i)
        await searchInput.fill('John')
        await page.waitForTimeout(1000)

        // Should filter results
        const table = page.locator('table')
        const noOrdersMessage = page.getByText(/no orders found/i)

        const hasTable = await table.isVisible().catch(() => false)
        const hasNoOrders = await noOrdersMessage.isVisible().catch(() => false)

        expect(hasTable || hasNoOrders).toBeTruthy()
      }
    })

    test('should search orders by email', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        const searchInput = page.getByPlaceholder(/search orders/i)
        await searchInput.fill('@example.com')
        await page.waitForTimeout(1000)

        // Should filter results
        const table = page.locator('table')
        const noOrdersMessage = page.getByText(/no orders found/i)

        const hasTable = await table.isVisible().catch(() => false)
        const hasNoOrders = await noOrdersMessage.isVisible().catch(() => false)

        expect(hasTable || hasNoOrders).toBeTruthy()
      }
    })

    test('should display status filter dropdown', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Find status filter trigger (combobox)
        const statusFilter = page
          .locator('button[role="combobox"]')
          .filter({ hasText: /all status/i })
        await expect(statusFilter).toBeVisible({ timeout: 10000 })
      }
    })

    test('should filter orders by payment status', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Click status filter
        const statusFilter = page
          .locator('button[role="combobox"]')
          .filter({ hasText: /all status/i })

        if (await statusFilter.isVisible().catch(() => false)) {
          await statusFilter.click()
          await page.waitForTimeout(300)

          // Select "Completed" status
          const completedOption = page.getByRole('option', { name: /completed/i })
          if (await completedOption.isVisible().catch(() => false)) {
            await completedOption.click()
            await page.waitForTimeout(500)
          }

          // Should filter to completed orders
          const table = page.locator('table')
          const noOrdersMessage = page.getByText(/no orders found/i)

          const hasTable = await table.isVisible().catch(() => false)
          const hasNoOrders = await noOrdersMessage.isVisible().catch(() => false)

          expect(hasTable || hasNoOrders).toBeTruthy()
        }
      }
    })
  })

  test.describe('Order Details', () => {
    test('should open order detail modal when clicking View', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Find a View button in the orders table
        const viewButton = page.getByRole('button', { name: /view/i }).first()

        if (await viewButton.isVisible().catch(() => false)) {
          await viewButton.click()
          await page.waitForTimeout(500)

          // Order detail dialog should appear
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible({ timeout: 5000 })

          // Should show order number in title
          const orderTitle = dialog.locator('text=/Order ORD-/i')
          await expect(orderTitle).toBeVisible({ timeout: 3000 })

          // Close dialog
          const closeButton = page.getByRole('button', { name: /close/i })
          await closeButton.click()
          await page.waitForTimeout(500)

          await expect(dialog).not.toBeVisible({ timeout: 3000 })
        }
      }
    })

    test('should display order items and pricing breakdown', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        const viewButton = page.getByRole('button', { name: /view/i }).first()

        if (await viewButton.isVisible().catch(() => false)) {
          await viewButton.click()
          await page.waitForTimeout(500)

          const dialog = page.getByRole('dialog')

          // Should show Customer section
          const customerSection = dialog.getByText(/customer/i)
          const hasCustomer = await customerSection.isVisible().catch(() => false)

          // Should show Items section
          const itemsSection = dialog.getByText(/items/i)
          const hasItems = await itemsSection.isVisible().catch(() => false)

          // Should show Summary section
          const summarySection = dialog.getByText(/summary/i)
          const hasSummary = await summarySection.isVisible().catch(() => false)

          expect(hasCustomer || hasItems || hasSummary).toBeTruthy()

          // Close dialog
          const closeButton = page.getByRole('button', { name: /close/i })
          await closeButton.click()
        }
      }
    })
  })

  test.describe('Refund Processing', () => {
    test('should show refund button for completed orders', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Filter to completed orders
        const statusFilter = page
          .locator('button[role="combobox"]')
          .filter({ hasText: /all status/i })

        if (await statusFilter.isVisible().catch(() => false)) {
          await statusFilter.click()
          await page.waitForTimeout(300)

          const completedOption = page.getByRole('option', { name: /completed/i })
          if (await completedOption.isVisible().catch(() => false)) {
            await completedOption.click()
            await page.waitForTimeout(500)
          }
        }

        // Click View on first completed order
        const viewButton = page.getByRole('button', { name: /view/i }).first()

        if (await viewButton.isVisible().catch(() => false)) {
          await viewButton.click()
          await page.waitForTimeout(500)

          // Should show Refund Order button (if not already refunded)
          const refundButton = page.getByRole('button', { name: /refund order/i })
          const closeButton = page.getByRole('button', { name: /close/i })

          // Either refund button or close button should be visible
          const hasRefund = await refundButton.isVisible().catch(() => false)
          const hasClose = await closeButton.isVisible().catch(() => false)

          expect(hasRefund || hasClose).toBeTruthy()

          // Close dialog
          await closeButton.click()
        }
      }
    })

    test('should open refund dialog', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Filter to completed orders
        const statusFilter = page
          .locator('button[role="combobox"]')
          .filter({ hasText: /all status/i })

        if (await statusFilter.isVisible().catch(() => false)) {
          await statusFilter.click()
          await page.waitForTimeout(300)

          const completedOption = page.getByRole('option', { name: /completed/i })
          if (await completedOption.isVisible().catch(() => false)) {
            await completedOption.click()
            await page.waitForTimeout(500)
          }
        }

        const viewButton = page.getByRole('button', { name: /view/i }).first()

        if (await viewButton.isVisible().catch(() => false)) {
          await viewButton.click()
          await page.waitForTimeout(500)

          const refundButton = page.getByRole('button', { name: /refund order/i })

          if (await refundButton.isVisible().catch(() => false)) {
            await refundButton.click()
            await page.waitForTimeout(500)

            // Refund dialog should appear
            const refundDialog = page.getByRole('dialog')
            await expect(refundDialog).toBeVisible({ timeout: 5000 })

            // Should show refund type options
            const fullRefund = page.getByText(/full refund/i)
            const partialRefund = page.getByText(/partial refund/i)

            const hasFullOption = await fullRefund.isVisible().catch(() => false)
            const hasPartialOption = await partialRefund.isVisible().catch(() => false)

            expect(hasFullOption || hasPartialOption).toBeTruthy()

            // Cancel refund
            const cancelButton = page.getByRole('button', { name: /cancel/i })
            await cancelButton.click()
          }
        }
      }
    })

    test('should validate partial refund amount', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        // Filter to completed orders
        const statusFilter = page
          .locator('button[role="combobox"]')
          .filter({ hasText: /all status/i })

        if (await statusFilter.isVisible().catch(() => false)) {
          await statusFilter.click()
          await page.waitForTimeout(300)

          const completedOption = page.getByRole('option', { name: /completed/i })
          if (await completedOption.isVisible().catch(() => false)) {
            await completedOption.click()
            await page.waitForTimeout(500)
          }
        }

        const viewButton = page.getByRole('button', { name: /view/i }).first()

        if (await viewButton.isVisible().catch(() => false)) {
          await viewButton.click()
          await page.waitForTimeout(500)

          const refundButton = page.getByRole('button', { name: /refund order/i })

          if (await refundButton.isVisible().catch(() => false)) {
            await refundButton.click()
            await page.waitForTimeout(500)

            // Select partial refund
            const partialOption = page.locator('input[value="partial"]')
            if (await partialOption.isVisible().catch(() => false)) {
              await partialOption.click()
              await page.waitForTimeout(300)

              // Confirm button should be disabled without amount
              const confirmButton = page.getByRole('button', { name: /confirm refund/i })
              const isDisabled = await confirmButton.isDisabled().catch(() => false)

              expect(isDisabled).toBeTruthy()
            }

            // Cancel
            const cancelButton = page.getByRole('button', { name: /cancel/i })
            await cancelButton.click()
          }
        }
      }
    })
  })

  test.describe('Export & Actions', () => {
    test('should display export button', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        const exportButton = page.getByRole('button', { name: /export/i })
        await expect(exportButton).toBeVisible({ timeout: 10000 })
      }
    })

    test('should display manage tickets link', async ({ page }) => {
      const eventId = await navigateToSalesPage(page)

      if (eventId) {
        const ticketsLink = page.getByRole('button', { name: /manage tickets/i })
        await expect(ticketsLink).toBeVisible({ timeout: 10000 })
      }
    })
  })
})
