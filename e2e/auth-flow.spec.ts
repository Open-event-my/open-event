import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.describe('Sign Up Page', () => {
    test('should display sign up form with all elements', async ({ page }) => {
      await page.goto('/sign-up')

      // Check for page elements
      await expect(page.getByText(/create account/i).first()).toBeVisible()
      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    })

    test('should show password strength indicator when typing', async ({ page }) => {
      await page.goto('/sign-up')

      const passwordInput = page.getByLabel(/password/i)
      await passwordInput.focus()

      // Start typing a weak password
      await passwordInput.fill('weak')

      // Should show requirements
      await expect(page.getByText(/12\+ characters/i)).toBeVisible()
      await expect(page.getByText(/uppercase letter/i)).toBeVisible()
      await expect(page.getByText(/lowercase letter/i)).toBeVisible()
      await expect(page.getByText(/number/i)).toBeVisible()
      await expect(page.getByText(/special character/i)).toBeVisible()
    })

    test('should show weak strength for short passwords', async ({ page }) => {
      await page.goto('/sign-up')

      const passwordInput = page.getByLabel(/password/i)
      await passwordInput.fill('abc')

      await expect(page.getByText(/weak/i)).toBeVisible()
    })

    test('should show strong strength for valid passwords', async ({ page }) => {
      await page.goto('/sign-up')

      const passwordInput = page.getByLabel(/password/i)
      await passwordInput.fill('MyStr0ng!Pass123')

      await expect(page.getByText(/strong/i)).toBeVisible()
    })

    test('should validate email and password before submission', async ({ page }) => {
      await page.goto('/sign-up')

      // Submit empty form
      await page.getByRole('button', { name: /create account/i }).click()

      // Should show error toast
      await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 3000 })
    })

    test('should reject weak passwords on submission', async ({ page }) => {
      await page.goto('/sign-up')

      await page.getByLabel(/name/i).fill('Test User')
      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByLabel(/password/i).fill('weak')

      await page.getByRole('button', { name: /create account/i }).click()

      // Should show password requirements error
      await expect(page.locator('text=Password does not meet requirements')).toBeVisible({
        timeout: 3000,
      })
    })

    test('should navigate to sign in page', async ({ page }) => {
      await page.goto('/sign-up')

      await page.getByRole('link', { name: /sign in/i }).click()

      await expect(page).toHaveURL(/sign-in/)
    })

    test('should display trust indicators', async ({ page }) => {
      await page.goto('/sign-up')

      await expect(page.getByText(/free forever/i)).toBeVisible()
      await expect(page.getByText(/no credit card/i)).toBeVisible()
      await expect(page.getByText(/open source/i)).toBeVisible()
    })
  })

  test.describe('Sign In Page', () => {
    test('should display sign in form with all elements', async ({ page }) => {
      await page.goto('/sign-in')

      await expect(page.getByText(/sign in/i).first()).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible()
    })

    test('should show validation error for empty form', async ({ page }) => {
      await page.goto('/sign-in')

      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show error toast
      await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 3000 })
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/sign-in')

      await page.getByLabel(/email/i).fill('nonexistent@example.com')
      await page.getByLabel(/password/i).fill('wrongpassword')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should show error message
      await expect(page.locator('text=Invalid email or password')).toBeVisible({
        timeout: 5000,
      })
    })

    test('should navigate to sign up page', async ({ page }) => {
      await page.goto('/sign-in')

      await page.getByRole('link', { name: /sign up/i }).click()

      await expect(page).toHaveURL(/sign-up/)
    })

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/sign-in')

      await page.getByRole('link', { name: /forgot password/i }).click()

      await expect(page).toHaveURL(/forgot-password/)
    })

    test('should show loading state during sign in', async ({ page }) => {
      await page.goto('/sign-in')

      await page.getByLabel(/email/i).fill('test@example.com')
      await page.getByLabel(/password/i).fill('password123')
      await page.getByRole('button', { name: /sign in/i }).click()

      // Should briefly show signing in state
      await expect(page.getByText(/signing in/i)).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to sign in', async ({ page }) => {
      await page.goto('/dashboard')

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/, { timeout: 5000 })
    })

    test('should redirect from onboarding when not authenticated', async ({ page }) => {
      await page.goto('/onboarding')

      // Should redirect to sign-in
      await expect(page).toHaveURL(/sign-in/, { timeout: 5000 })
    })
  })

  test.describe('Navigation', () => {
    test('should have theme toggle on auth pages', async ({ page }) => {
      await page.goto('/sign-in')

      // Theme toggle should be visible
      const themeToggle = page.locator(
        '[aria-label*="theme"], [data-testid="theme-toggle"], button:has(svg)'
      )
      await expect(themeToggle.first()).toBeVisible()
    })

    test('should have logo linking to home', async ({ page }) => {
      await page.goto('/sign-in')

      // Click logo to go home
      const logo = page.locator('a:has-text("Open Event"), a:has(svg)')
      await logo.first().click()

      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Accessibility', () => {
    test('sign up form should have proper labels', async ({ page }) => {
      await page.goto('/sign-up')

      // All inputs should have associated labels
      const nameInput = page.getByLabel(/name/i)
      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/password/i)

      await expect(nameInput).toBeVisible()
      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()
    })

    test('sign in form should have proper labels', async ({ page }) => {
      await page.goto('/sign-in')

      const emailInput = page.getByLabel(/email/i)
      const passwordInput = page.getByLabel(/password/i)

      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()
    })

    test('submit buttons should be properly labeled', async ({ page }) => {
      await page.goto('/sign-up')

      const submitButton = page.getByRole('button', { name: /create account/i })
      await expect(submitButton).toBeVisible()
      await expect(submitButton).toBeEnabled()
    })
  })
})
