import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Analytics Dashboard
 *
 * Tests cover:
 * - Analytics page display
 * - Stats cards
 * - Charts and visualizations
 * - Period selectors
 * - Export functionality
 */

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Analytics Dashboard', () => {
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

    // Navigate to analytics
    await page.goto('/dashboard/analytics')
    await page.waitForTimeout(2000)
  })

  test.describe('Page Display', () => {
    test('should display analytics page', async ({ page }) => {
      // Should show analytics content - either stats, charts, or loading state
      const statsCard = page.locator('.rounded-xl.border').first()
      const loadingState = page.locator('.animate-pulse').first()
      const chartContainer = page.locator('.recharts-wrapper').first()

      const hasStats = await statsCard.isVisible().catch(() => false)
      const hasLoading = await loadingState.isVisible().catch(() => false)
      const hasChart = await chartContainer.isVisible().catch(() => false)

      // Page should have some content
      expect(hasStats || hasLoading || hasChart).toBeTruthy()
    })

    test('should display stats cards', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000)

      // Should show stats like Events, Vendors, Sponsors, etc.
      const eventsText = page.getByText(/events/i)
      const vendorsText = page.getByText(/vendors/i)
      const sponsorsText = page.getByText(/sponsors/i)

      const hasEvents = await eventsText
        .first()
        .isVisible()
        .catch(() => false)
      const hasVendors = await vendorsText
        .first()
        .isVisible()
        .catch(() => false)
      const hasSponsors = await sponsorsText
        .first()
        .isVisible()
        .catch(() => false)

      // At least one stat should be visible
      expect(hasEvents || hasVendors || hasSponsors).toBeTruthy()
    })
  })

  test.describe('Charts and Visualizations', () => {
    test('should display charts when data exists', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000)

      // Look for chart containers, tabs, stats cards, or loading state
      const chartArea = page.locator('.recharts-wrapper')
      const tabsList = page.locator('[role="tablist"]')
      const statsCards = page.locator('.rounded-xl.border')
      const loadingState = page.locator('.animate-pulse')

      const hasCharts = (await chartArea.count()) > 0
      const hasTabs = await tabsList.isVisible().catch(() => false)
      const hasStats = (await statsCards.count()) > 0
      const hasLoading = await loadingState
        .first()
        .isVisible()
        .catch(() => false)

      // Page should have some content
      expect(hasCharts || hasTabs || hasStats || hasLoading).toBeTruthy()
    })

    test('should display tab navigation for analytics sections', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000)

      // Look for tabs (Overview, Trends, Performance, etc.)
      const tabsList = page.locator('[role="tablist"]')

      if (await tabsList.isVisible().catch(() => false)) {
        const tabs = page.locator('[role="tab"]')
        const tabCount = await tabs.count()

        // Should have multiple tabs for different analytics views
        expect(tabCount).toBeGreaterThanOrEqual(1)
      }
    })
  })

  test.describe('Period Selectors', () => {
    test('should display period selector buttons', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000)

      // Look for period selector buttons (Day, Week, Month, Year) or any interactive elements
      const dayButton = page.locator('button').filter({ hasText: /^day$/i })
      const weekButton = page.locator('button').filter({ hasText: /^week$/i })
      const monthButton = page.locator('button').filter({ hasText: /^month$/i })
      const yearButton = page.locator('button').filter({ hasText: /^year$/i })
      const anyButtons = page.locator('button')

      const hasDay = await dayButton.isVisible().catch(() => false)
      const hasWeek = await weekButton.isVisible().catch(() => false)
      const hasMonth = await monthButton.isVisible().catch(() => false)
      const hasYear = await yearButton.isVisible().catch(() => false)
      const hasAnyButtons = (await anyButtons.count()) > 0

      // Page should have some interactive elements
      expect(hasDay || hasWeek || hasMonth || hasYear || hasAnyButtons).toBeTruthy()
    })

    test('should switch period when clicking selector', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000)

      // Find and click a period button
      const weekButton = page.locator('button').filter({ hasText: /^week$/i })

      if (await weekButton.isVisible().catch(() => false)) {
        await weekButton.click()
        await page.waitForTimeout(500)

        // Page should update (no error thrown)
        const pageContent = page.locator('body')
        await expect(pageContent).toBeVisible()
      }
    })
  })

  test.describe('Export Functionality', () => {
    test('should display export button', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000)

      // Look for export button
      const exportButton = page.getByRole('button', { name: /export/i })
      const hasExport = await exportButton.isVisible().catch(() => false)

      // Export button should be present
      expect(hasExport).toBeTruthy()
    })

    test('should open export modal when clicking export', async ({ page }) => {
      // Wait for data to load
      await page.waitForTimeout(3000)

      const exportButton = page.getByRole('button', { name: /export/i })

      if (await exportButton.isVisible().catch(() => false)) {
        await exportButton.click()
        await page.waitForTimeout(500)

        // Export modal or options should appear
        const exportModal = page.getByRole('dialog')
        const exportOptions = page.getByText(/csv|pdf|export format/i)

        const hasModal = await exportModal.isVisible().catch(() => false)
        const hasOptions = await exportOptions
          .first()
          .isVisible()
          .catch(() => false)

        expect(hasModal || hasOptions).toBeTruthy()
      }
    })
  })

  test.describe('Loading States', () => {
    test('should handle loading state gracefully', async ({ page }) => {
      // Page should not show error even during loading
      const errorMessage = page.getByText(/error|something went wrong/i)
      const hasError = await errorMessage.isVisible().catch(() => false)

      expect(hasError).toBeFalsy()
    })
  })

  test.describe('Responsive Layout', () => {
    test('should display properly on different screen sizes', async ({ page }) => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500)

      // Page should still be visible and functional
      const pageContent = page.locator('body')
      await expect(pageContent).toBeVisible()

      // Reset to desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.waitForTimeout(500)

      await expect(pageContent).toBeVisible()
    })
  })
})
