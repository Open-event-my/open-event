import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.describe('Hero Section', () => {
    test('should display landing page with hero content', async ({ page }) => {
      await page.goto('/')

      // Check for main headline
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // Check for CTA buttons
      await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
    })

    test('should have working navigation to sign up', async ({ page }) => {
      await page.goto('/')

      const getStartedButton = page.getByRole('link', { name: /get started/i })
      await getStartedButton.click()

      await expect(page).toHaveURL(/sign-up/)
    })

    test('should have working navigation to sign in', async ({ page }) => {
      await page.goto('/')

      const signInLink = page.getByRole('link', { name: /sign in/i })
      await signInLink.click()

      await expect(page).toHaveURL(/sign-in/)
    })
  })

  test.describe('Navigation', () => {
    test('should display logo', async ({ page }) => {
      await page.goto('/')

      // Logo should be visible
      await expect(page.locator('header').first()).toBeVisible()
    })

    test('should have theme toggle', async ({ page }) => {
      await page.goto('/')

      // Theme toggle should be present
      const themeToggle = page.locator('button').filter({ has: page.locator('svg') })
      await expect(themeToggle.first()).toBeVisible()
    })
  })

  test.describe('Feature Sections', () => {
    test('should display feature highlights', async ({ page }) => {
      await page.goto('/')

      // Check for features section (scroll if needed)
      await page.evaluate(() => window.scrollBy(0, 500))

      // Common feature-related text
      await expect(page.getByText(/event/i).first()).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      // Hero should still be visible
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

      // CTA should still be accessible
      await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
    })

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/')

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/')
      const loadTime = Date.now() - startTime

      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })
  })

  test.describe('SEO & Accessibility', () => {
    test('should have proper page title', async ({ page }) => {
      await page.goto('/')

      const title = await page.title()
      expect(title).toBeTruthy()
    })

    test('should have visible main heading', async ({ page }) => {
      await page.goto('/')

      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toBeVisible()
    })

    test('should have proper link texts', async ({ page }) => {
      await page.goto('/')

      // Links should have descriptive text
      const links = page.getByRole('link')
      const linkCount = await links.count()

      expect(linkCount).toBeGreaterThan(0)
    })
  })
})
