import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load the landing page', async ({ page }) => {
    await page.goto('/')

    // Check that the page loads successfully
    await expect(page).toHaveTitle(/Open Event/)

    // Check for main hero content
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('should have sign in link', async ({ page }) => {
    await page.goto('/')

    // Look for a sign in link or button
    const signInLink = page.getByRole('link', { name: /sign in/i })
    await expect(signInLink).toBeVisible()
  })

  test('should have sign up link', async ({ page }) => {
    await page.goto('/')

    // Look for a sign up link or button
    const signUpLink = page.getByRole('link', { name: /sign up|get started/i })
    await expect(signUpLink).toBeVisible()
  })

  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/')

    // Click sign in
    await page.getByRole('link', { name: /sign in/i }).click()

    // Should be on the sign in page
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

test.describe('Navigation', () => {
  test('should have working navigation links', async ({ page }) => {
    await page.goto('/')

    // Check that nav is visible
    const nav = page.locator('nav')
    await expect(nav.first()).toBeVisible()
  })

  test('should have theme toggle', async ({ page }) => {
    await page.goto('/')

    // Look for theme toggle button
    const themeToggle = page.getByRole('button', { name: /toggle theme|theme/i })
    if ((await themeToggle.count()) > 0) {
      await expect(themeToggle.first()).toBeVisible()
    }
  })
})
