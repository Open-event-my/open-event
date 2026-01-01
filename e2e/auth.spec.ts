import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.describe('Sign In Page', () => {
    test('should display sign in form', async ({ page }) => {
      await page.goto('/sign-in')

      // Check for form elements
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.goto('/sign-in')

      // Submit empty form
      await page.getByRole('button', { name: /sign in/i }).click()

      // Check for validation messages
      await expect(page.getByText(/email is required/i)).toBeVisible()
      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('should show error for invalid email format', async ({ page }) => {
      await page.goto('/sign-in')

      await page.getByLabel(/email/i).fill('invalid-email')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      await expect(page.getByText(/please enter a valid email/i)).toBeVisible()
    })

    test('should have link to sign up page', async ({ page }) => {
      await page.goto('/sign-in')

      const signUpLink = page.getByRole('link', { name: /sign up|create account|register/i })
      await expect(signUpLink).toBeVisible()
    })

    test('should have Google sign in button', async ({ page }) => {
      await page.goto('/sign-in')

      const googleButton = page.getByRole('button', { name: /google/i })
      await expect(googleButton).toBeVisible()
    })
  })

  test.describe('Sign Up Page', () => {
    test('should display sign up form', async ({ page }) => {
      await page.goto('/sign-up')

      // Check for form elements
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i).first()).toBeVisible()
      await expect(
        page.getByRole('button', { name: /sign up|create account|register/i })
      ).toBeVisible()
    })

    test('should have link to sign in page', async ({ page }) => {
      await page.goto('/sign-up')

      const signInLink = page.getByRole('link', { name: /sign in|log in|login/i })
      await expect(signInLink).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to sign-in when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard')

      // Should be redirected to sign-in
      await expect(page).toHaveURL(/\/sign-in/)
    })

    test('should redirect to sign-in when accessing events page without auth', async ({ page }) => {
      await page.goto('/dashboard/events')

      // Should be redirected to sign-in
      await expect(page).toHaveURL(/\/sign-in/)
    })

    test('should redirect to sign-in when accessing admin page without auth', async ({ page }) => {
      await page.goto('/admin')

      // Should be redirected to sign-in (or show unauthorized)
      await expect(page).toHaveURL(/\/(sign-in|admin)/)
    })
  })

  test.describe('Navigation', () => {
    test('should navigate between sign-in and sign-up', async ({ page }) => {
      // Start at sign-in
      await page.goto('/sign-in')
      await expect(page).toHaveURL(/\/sign-in/)

      // Go to sign-up
      const signUpLink = page.getByRole('link', { name: /sign up|create account|register/i })
      if (await signUpLink.isVisible()) {
        await signUpLink.click()
        await expect(page).toHaveURL(/\/sign-up/)

        // Go back to sign-in
        const signInLink = page.getByRole('link', { name: /sign in|log in|login/i })
        await signInLink.click()
        await expect(page).toHaveURL(/\/sign-in/)
      }
    })
  })
})

test.describe('Landing to Auth Flow', () => {
  test('should navigate from landing to sign-in', async ({ page }) => {
    await page.goto('/')

    const signInLink = page.getByRole('link', { name: /sign in/i })
    await signInLink.click()

    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('should navigate from landing to sign-up via Get Started', async ({ page }) => {
    await page.goto('/')

    // Look for a "Get Started" or "Sign Up" CTA button
    const ctaButton = page.getByRole('link', { name: /get started|sign up|try free/i }).first()
    if (await ctaButton.isVisible()) {
      await ctaButton.click()
      await expect(page).toHaveURL(/\/(sign-up|sign-in)/)
    }
  })
})
