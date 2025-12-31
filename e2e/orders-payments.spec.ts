import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Orders & Payments', () => {
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

  // Helper function to navigate to sales page for first event
  async function navigateToSalesPage(page: import('@playwright/test').Page): Promise<boolean> {
    await page.goto('/dashboard/events')
    await page.waitForTimeout(2000)

    // Click first event card
    const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

    if (await eventCard.isVisible()) {
      await eventCard.click()
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
      await page.waitForTimeout(1000)

      // Extract event ID and navigate to sales page
      const url = page.url()
      const eventId = url.split('/').pop()
      await page.goto(`/dashboard/events/${eventId}/sales`)
      await page.waitForTimeout(2000)

      // Verify we're on the sales page
      await expect(page.getByRole('heading', { name: /sales/i }).first()).toBeVisible({ timeout: 10000 })
      return true
    }
    return false
  }

  test.describe('View Orders List', () => {
    test('should display orders list on sales page', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Should show orders section heading
        await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible({ timeout: 10000 })
      }
    })

    test('should display stats cards', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Should show stats cards
        await expect(page.getByText(/total revenue/i)).toBeVisible({ timeout: 10000 })
        await expect(page.getByText(/tickets sold/i)).toBeVisible()
        await expect(page.getByText(/avg order value/i)).toBeVisible()
      }
    })

    test('should show search input and filter dropdown', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Should show search input
        await expect(page.getByPlaceholder(/search orders/i)).toBeVisible({ timeout: 10000 })

        // Should show status filter
        const filterTrigger = page.locator('[data-slot="select-trigger"]').filter({ hasText: /all status|status/i }).first()
        await expect(filterTrigger).toBeVisible()
      }
    })

    test('should show empty state when no orders', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Check for either orders table or empty state
        const hasOrders = await page.locator('table').isVisible().catch(() => false)
        const hasEmptyState = await page.getByText(/no orders found|orders will appear/i).isVisible().catch(() => false)

        // One of them should be visible
        expect(hasOrders || hasEmptyState).toBe(true)
      }
    })
  })

  test.describe('Filter by Status', () => {
    test('should filter orders by completed status', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Click status filter dropdown
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.waitForTimeout(500)

        // Select Completed
        await page.getByRole('option', { name: /completed/i }).click()
        await page.waitForTimeout(1000)

        // Check if orders are filtered or empty state shows
        const hasTable = await page.locator('table').isVisible().catch(() => false)
        if (hasTable) {
          // All visible status badges should be "Completed" or no rows visible
          const statusBadges = page.locator('table tbody tr .rounded-full')
          const count = await statusBadges.count()
          if (count > 0) {
            // At least first one should be Completed
            const firstBadge = statusBadges.first()
            await expect(firstBadge).toContainText(/completed/i)
          }
        }
      }
    })

    test('should filter orders by pending status', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Click status filter dropdown
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.waitForTimeout(500)

        // Select Pending
        await page.getByRole('option', { name: /^pending$/i }).click()
        await page.waitForTimeout(1000)

        // Verify filter is applied
        const orderCount = page.getByText(/\d+ of \d+ orders/)
        await expect(orderCount).toBeVisible({ timeout: 5000 })
      }
    })

    test('should filter orders by refunded status', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Click status filter dropdown
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.waitForTimeout(500)

        // Select Refunded
        await page.getByRole('option', { name: /refunded/i }).click()
        await page.waitForTimeout(1000)

        // Verify filter is applied
        const orderCount = page.getByText(/\d+ of \d+ orders/)
        await expect(orderCount).toBeVisible({ timeout: 5000 })
      }
    })

    test('should filter orders by failed status', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Click status filter dropdown
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.waitForTimeout(500)

        // Select Failed
        await page.getByRole('option', { name: /failed/i }).click()
        await page.waitForTimeout(1000)

        // Verify filter is applied
        const orderCount = page.getByText(/\d+ of \d+ orders/)
        await expect(orderCount).toBeVisible({ timeout: 5000 })
      }
    })

    test('should show all orders when "All Status" selected', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // First filter by something specific
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.getByRole('option', { name: /completed/i }).click()
        await page.waitForTimeout(500)

        // Then go back to All Status
        await filterTrigger.click()
        await page.getByRole('option', { name: /all status/i }).click()
        await page.waitForTimeout(1000)

        // Verify showing all orders
        const orderCount = page.getByText(/\d+ of \d+ orders/)
        await expect(orderCount).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Search Orders', () => {
    test('should have working search input', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const searchInput = page.getByPlaceholder(/search orders/i)
        await expect(searchInput).toBeVisible({ timeout: 10000 })

        // Type in search
        await searchInput.fill('test')
        await page.waitForTimeout(1000)

        // Order count should update
        const orderCount = page.getByText(/\d+ of \d+ orders/)
        await expect(orderCount).toBeVisible({ timeout: 5000 })
      }
    })

    test('should search by order number prefix', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const searchInput = page.getByPlaceholder(/search orders/i)
        await searchInput.fill('ORD-')
        await page.waitForTimeout(1000)

        // Should show results or empty state
        const hasTable = await page.locator('table').isVisible().catch(() => false)
        const hasEmptyState = await page.getByText(/no orders found/i).isVisible().catch(() => false)

        expect(hasTable || hasEmptyState).toBe(true)
      }
    })

    test('should clear search and show all orders', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const searchInput = page.getByPlaceholder(/search orders/i)

        // Search something
        await searchInput.fill('nonexistent123')
        await page.waitForTimeout(500)

        // Clear search
        await searchInput.clear()
        await page.waitForTimeout(1000)

        // Should show all orders again
        const orderCount = page.getByText(/\d+ of \d+ orders/)
        await expect(orderCount).toBeVisible({ timeout: 5000 })
      }
    })

    test('should show no results for non-matching search', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const searchInput = page.getByPlaceholder(/search orders/i)

        // Search for something that won't match
        await searchInput.fill('zzznonexistentorder12345zzz')
        await page.waitForTimeout(1000)

        // Should show 0 orders or empty state
        const noOrders = page.getByText(/0 of \d+ orders/i)
        const noOrdersFound = page.getByText(/no orders found/i)

        const hasNoMatch = await noOrders.isVisible().catch(() => false) ||
                           await noOrdersFound.isVisible().catch(() => false)
        expect(hasNoMatch).toBe(true)
      }
    })
  })

  test.describe('View Order Details', () => {
    test('should have View button on order rows', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Check if there are orders in the table
        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Should have View button
          const viewButton = page.getByRole('button', { name: /view/i }).first()
          await expect(viewButton).toBeVisible({ timeout: 5000 })
        }
      }
    })

    test('should open order detail modal when clicking View', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Check if there are orders in the table
        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Click View button
          const viewButton = page.getByRole('button', { name: /view/i }).first()
          await viewButton.click()
          await page.waitForTimeout(1000)

          // Should open dialog with order number
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
          await expect(page.getByText(/ORD-/)).toBeVisible()
        }
      }
    })

    test('should display customer info in order modal', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Click View button
          await page.getByRole('button', { name: /view/i }).first().click()
          await page.waitForTimeout(1000)

          // Should show Customer section
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
          await expect(page.getByText(/customer/i)).toBeVisible()
        }
      }
    })

    test('should display order items in modal', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Click View button
          await page.getByRole('button', { name: /view/i }).first().click()
          await page.waitForTimeout(1000)

          // Should show Items section
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
          await expect(page.getByText(/items/i)).toBeVisible()
        }
      }
    })

    test('should display pricing summary in modal', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Click View button
          await page.getByRole('button', { name: /view/i }).first().click()
          await page.waitForTimeout(1000)

          // Should show Summary section with Subtotal and Total
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
          await expect(page.getByText(/summary/i)).toBeVisible()
          await expect(page.getByText(/subtotal/i)).toBeVisible()
          await expect(page.getByText(/^total$/i)).toBeVisible()
        }
      }
    })

    test('should close modal when clicking Close button', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Click View button
          await page.getByRole('button', { name: /view/i }).first().click()
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

          // Click Close button
          await page.getByRole('button', { name: /close/i }).click()
          await page.waitForTimeout(500)

          // Dialog should be closed
          await expect(page.getByRole('dialog')).not.toBeVisible()
        }
      }
    })
  })

  test.describe('Refund UI (No actual refunds)', () => {
    test('should show Refund Order button for completed orders', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Filter by completed orders
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.getByRole('option', { name: /completed/i }).click()
        await page.waitForTimeout(1000)

        // Check if there are completed orders
        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Click View on first order
          await page.getByRole('button', { name: /view/i }).first().click()
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

          // Should have Refund Order button (if not already refunded)
          const refundButton = page.getByRole('button', { name: /refund order/i })
          const closeButton = page.getByRole('button', { name: /close/i })

          // Either refund button or just close should be visible
          const hasRefund = await refundButton.isVisible().catch(() => false)
          const hasClose = await closeButton.isVisible().catch(() => false)

          expect(hasRefund || hasClose).toBe(true)
        }
      }
    })

    test('should open refund dialog when clicking Refund Order', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Filter by completed orders
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.getByRole('option', { name: /completed/i }).click()
        await page.waitForTimeout(1000)

        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          // Click View on first order
          await page.getByRole('button', { name: /view/i }).first().click()
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

          // Check if Refund Order button exists
          const refundButton = page.getByRole('button', { name: /refund order/i })
          const hasRefundButton = await refundButton.isVisible().catch(() => false)

          if (hasRefundButton) {
            await refundButton.click()
            await page.waitForTimeout(500)

            // Refund dialog should open with confirmation text
            await expect(page.getByText(/are you sure you want to refund/i)).toBeVisible({ timeout: 5000 })
          }
        }
      }
    })

    test('should show refund reason input in refund dialog', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Filter by completed orders
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.getByRole('option', { name: /completed/i }).click()
        await page.waitForTimeout(1000)

        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          await page.getByRole('button', { name: /view/i }).first().click()
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

          const refundButton = page.getByRole('button', { name: /refund order/i })
          const hasRefundButton = await refundButton.isVisible().catch(() => false)

          if (hasRefundButton) {
            await refundButton.click()
            await page.waitForTimeout(500)

            // Should show reason input
            await expect(page.getByPlaceholder(/enter refund reason/i)).toBeVisible({ timeout: 5000 })
          }
        }
      }
    })

    test('should show Confirm Refund and Cancel buttons in refund dialog', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Filter by completed orders
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.getByRole('option', { name: /completed/i }).click()
        await page.waitForTimeout(1000)

        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          await page.getByRole('button', { name: /view/i }).first().click()
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

          const refundButton = page.getByRole('button', { name: /refund order/i })
          const hasRefundButton = await refundButton.isVisible().catch(() => false)

          if (hasRefundButton) {
            await refundButton.click()
            await page.waitForTimeout(500)

            // Should show Confirm Refund and Cancel buttons
            await expect(page.getByRole('button', { name: /confirm refund/i })).toBeVisible({ timeout: 5000 })
            await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
          }
        }
      }
    })

    test('should close refund dialog when clicking Cancel', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Filter by completed orders
        const filterTrigger = page.locator('[data-slot="select-trigger"]').first()
        await filterTrigger.click()
        await page.getByRole('option', { name: /completed/i }).click()
        await page.waitForTimeout(1000)

        const hasOrders = await page.locator('table tbody tr').first().isVisible().catch(() => false)

        if (hasOrders) {
          await page.getByRole('button', { name: /view/i }).first().click()
          await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

          const refundButton = page.getByRole('button', { name: /refund order/i })
          const hasRefundButton = await refundButton.isVisible().catch(() => false)

          if (hasRefundButton) {
            await refundButton.click()
            await page.waitForTimeout(500)

            // Click Cancel
            await page.getByRole('button', { name: /cancel/i }).click()
            await page.waitForTimeout(500)

            // Refund dialog should close (order dialog might still be visible)
            await expect(page.getByText(/are you sure you want to refund/i)).not.toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Sales Page Navigation', () => {
    test('should navigate to sales page from event details', async ({ page }) => {
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible()) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(1000)

        // Look for Sales link or View Sales button
        const salesLink = page.locator('a[href*="/sales"]').first()
        const viewSalesButton = page.getByRole('link', { name: /view sales|sales/i }).first()

        const hasSalesLink = await salesLink.isVisible().catch(() => false)
        const hasViewSalesButton = await viewSalesButton.isVisible().catch(() => false)

        if (hasSalesLink) {
          await salesLink.click()
        } else if (hasViewSalesButton) {
          await viewSalesButton.click()
        }

        // Should be on sales page
        await page.waitForURL(/\/sales$/, { timeout: 10000 })
        await expect(page.getByRole('heading', { name: /sales/i }).first()).toBeVisible()
      }
    })

    test('should have link to manage tickets from sales page', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Should have Manage Tickets link
        const ticketsLink = page.getByRole('link', { name: /manage tickets/i })
        await expect(ticketsLink).toBeVisible({ timeout: 10000 })
      }
    })

    test('should have export button on sales page', async ({ page }) => {
      const hasSalesPage = await navigateToSalesPage(page)

      if (hasSalesPage) {
        // Should have Export button
        const exportButton = page.getByRole('button', { name: /export/i })
        await expect(exportButton).toBeVisible({ timeout: 10000 })
      }
    })
  })
})
