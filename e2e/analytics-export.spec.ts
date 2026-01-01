import { test, expect } from '@playwright/test'

test.describe('Analytics Export Feature', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect to sign-in when accessing analytics without auth', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Should be redirected to sign-in
      await expect(page).toHaveURL(/\/sign-in/)
    })
  })

  test.describe('Analytics Page UI', () => {
    // Skip these tests if no auth is available - they require authentication
    test.skip('should display Real-Time Dashboard title', async ({ page }) => {
      // This would need authentication setup
      await page.goto('/dashboard/analytics')

      await expect(page.getByRole('heading', { name: /real-time dashboard/i })).toBeVisible()
    })

    test.skip('should display Export button in header', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      const exportButton = page.getByRole('button', { name: /export/i })
      await expect(exportButton).toBeVisible()
    })

    test.skip('should open export modal when clicking Export button', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Click export button
      await page.getByRole('button', { name: /export/i }).click()

      // Modal should be visible
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/export analytics/i)).toBeVisible()
    })

    test.skip('should display section checkboxes in export modal', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Open modal
      await page.getByRole('button', { name: /export/i }).click()

      // Check for section labels
      await expect(page.getByText('Overview')).toBeVisible()
      await expect(page.getByText('Trends')).toBeVisible()
      await expect(page.getByText('Performance')).toBeVisible()
      await expect(page.getByText('Budget')).toBeVisible()
      await expect(page.getByText('Engagement')).toBeVisible()
    })

    test.skip('should have CSV and PDF export buttons in modal', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Open modal
      await page.getByRole('button', { name: /export/i }).click()

      // Check for export format buttons
      await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /export pdf/i })).toBeVisible()
    })

    test.skip('should toggle section selection', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Open modal
      await page.getByRole('button', { name: /export/i }).click()

      // Find Overview checkbox and toggle it
      const overviewSection = page.getByText('Overview').locator('..')
      await overviewSection.click()

      // The section should be toggled (visual state change)
      // This tests the interaction works
    })

    test.skip('should have Select all / Deselect all links', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Open modal
      await page.getByRole('button', { name: /export/i }).click()

      await expect(page.getByText(/select all/i)).toBeVisible()
      await expect(page.getByText(/deselect all/i)).toBeVisible()
    })

    test.skip('should close modal when clicking close button', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Open modal
      await page.getByRole('button', { name: /export/i }).click()
      await expect(page.getByRole('dialog')).toBeVisible()

      // Close modal
      await page.getByRole('button', { name: /close/i }).click()

      // Modal should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible()
    })
  })

  test.describe('Export File Download', () => {
    test.skip('should download CSV file when clicking Export CSV', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Open modal
      await page.getByRole('button', { name: /export/i }).click()

      // Wait for download
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: /export csv/i }).click()
      const download = await downloadPromise

      // Verify filename pattern
      expect(download.suggestedFilename()).toMatch(/analytics.*\.csv$/)
    })

    test.skip('should download PDF file when clicking Export PDF', async ({ page }) => {
      await page.goto('/dashboard/analytics')

      // Open modal
      await page.getByRole('button', { name: /export/i }).click()

      // Wait for download
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: /export pdf/i }).click()
      const download = await downloadPromise

      // Verify filename pattern
      expect(download.suggestedFilename()).toMatch(/analytics.*\.pdf$/)
    })
  })
})

// Smoke test that doesn't require authentication
test.describe('Analytics Route Smoke Test', () => {
  test('analytics route exists and responds', async ({ page }) => {
    const response = await page.goto('/dashboard/analytics')

    // Should get a response (even if redirected to sign-in)
    expect(response?.status()).toBeLessThan(500)
  })
})
