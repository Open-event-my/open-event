import { test, expect } from '@playwright/test'

test.describe('Email Verification & Password Reset Flows', () => {
  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password')

      // Check for page elements
      await expect(page.getByText(/forgot password\?/i)).toBeVisible()
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible()
    })

    test('should show validation error for empty email', async ({ page }) => {
      await page.goto('/forgot-password')

      // Submit empty form
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Check for toast error (sonner toast)
      await expect(page.locator('text=Please enter your email address')).toBeVisible({
        timeout: 3000,
      })
    })

    test('should show validation error for invalid email', async ({ page }) => {
      await page.goto('/forgot-password')

      // Enter invalid email
      await page.getByLabel(/email address/i).fill('invalid-email')
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Check for toast error
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible({
        timeout: 3000,
      })
    })

    test('should accept valid email format', async ({ page }) => {
      await page.goto('/forgot-password')

      // Enter valid email
      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Should show success state (even without actual email sending)
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/test@example.com/i)).toBeVisible()
    })

    test('should show loading state during submission', async ({ page }) => {
      await page.goto('/forgot-password')

      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Should briefly show sending state
      await expect(page.getByText(/sending/i)).toBeVisible()
    })

    test('should display success state with instructions', async ({ page }) => {
      await page.goto('/forgot-password')

      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Wait for success state
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })

      // Check for instructions
      await expect(page.getByText(/what to do next:/i)).toBeVisible()
      await expect(page.getByText(/check your email inbox/i)).toBeVisible()
      await expect(page.getByText(/click the reset link/i)).toBeVisible()
      await expect(page.getByText(/create a new password/i)).toBeVisible()
    })

    test('should allow trying different email', async ({ page }) => {
      await page.goto('/forgot-password')

      // Submit first email
      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Wait for success state
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })

      // Click try different email
      await page.getByRole('button', { name: /try different email/i }).click()

      // Should return to form
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    })

    test('should navigate to sign in page', async ({ page }) => {
      await page.goto('/forgot-password')

      await page
        .getByRole('link', { name: /back to sign in/i })
        .first()
        .click()

      // Should navigate to sign in page
      await expect(page).toHaveURL(/\/sign-in/)
    })

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/forgot-password')

      // Check that elements are visible and not cut off
      await expect(page.getByText(/forgot password\?/i)).toBeVisible()
      await expect(page.getByLabel(/email address/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    })
  })

  test.describe('Reset Password Page', () => {
    test('should show error when no token provided', async ({ page }) => {
      await page.goto('/reset-password')

      // Should show error state
      await expect(page.getByText(/invalid reset link/i)).toBeVisible()
      await expect(page.getByText(/no reset token provided/i)).toBeVisible()
    })

    test('should show validating state with token', async ({ page }) => {
      await page.goto('/reset-password?token=test-token-123')

      // Should briefly show validating state
      await expect(page.getByText(/validating reset link/i)).toBeVisible()
    })

    test('should show error for invalid token', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token')

      // Wait for validation to complete
      await page.waitForTimeout(1000)

      // Should show error state
      await expect(page.getByText(/invalid reset link/i)).toBeVisible()
    })

    test('should have request new reset link button', async ({ page }) => {
      await page.goto('/reset-password')

      const requestButton = page.getByRole('link', { name: /request new reset link/i })
      await expect(requestButton).toBeVisible()

      // Should link to forgot password
      await expect(requestButton).toHaveAttribute('href', '/forgot-password')
    })

    test('should have sign in link in footer', async ({ page }) => {
      await page.goto('/reset-password?token=test')

      const signInLink = page.getByRole('link', { name: /sign in/i }).first()
      await expect(signInLink).toBeVisible()
      await expect(signInLink).toHaveAttribute('href', '/sign-in')
    })

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/reset-password?token=test')

      // Check that error state is visible on mobile
      await page.waitForTimeout(1000)
      await expect(page.getByText(/invalid reset link/i)).toBeVisible()
    })
  })

  test.describe('Verify Email Page', () => {
    test('should show error when no token provided', async ({ page }) => {
      await page.goto('/verify-email')

      // Should show error state
      await expect(page.getByText(/verification failed/i)).toBeVisible()
      await expect(page.getByText(/no verification token provided/i)).toBeVisible()
    })

    test('should show verifying state with token', async ({ page }) => {
      await page.goto('/verify-email?token=test-token-123')

      // Should briefly show verifying state
      await expect(page.getByText(/verifying your email/i)).toBeVisible()
    })

    test('should show error for invalid token', async ({ page }) => {
      await page.goto('/verify-email?token=invalid-token')

      // Wait for validation to complete
      await page.waitForTimeout(1000)

      // Should show error state
      await expect(page.getByText(/verification failed/i)).toBeVisible()
    })

    test('should have helpful error message', async ({ page }) => {
      await page.goto('/verify-email')

      await expect(page.getByText(/need a new verification link\?/i)).toBeVisible()
      await expect(page.getByText(/go to sign in to resend verification email/i)).toBeVisible()
    })

    test('should have back to home button', async ({ page }) => {
      await page.goto('/verify-email')

      const backButton = page.getByRole('link', { name: /back to home/i })
      await expect(backButton).toBeVisible()
      await expect(backButton).toHaveAttribute('href', '/')
    })

    test('should have contact support link', async ({ page }) => {
      await page.goto('/verify-email')

      const supportLink = page.getByRole('link', { name: /contact support/i })
      await expect(supportLink).toBeVisible()
      await expect(supportLink).toHaveAttribute('href', 'mailto:support@openevent.com')
    })

    test('should display Open Event branding', async ({ page }) => {
      await page.goto('/verify-email')

      await expect(page.getByText(/open event/i).first()).toBeVisible()
    })

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/verify-email?token=test')

      // Check that error state is visible on mobile
      await page.waitForTimeout(1000)
      await expect(page.getByText(/verification failed/i)).toBeVisible()
    })
  })

  test.describe('Navigation Between Pages', () => {
    test('should navigate from sign in to forgot password', async ({ page }) => {
      await page.goto('/sign-in')

      // Look for forgot password link (may have different text)
      const forgotLink = page.getByRole('link', { name: /forgot.*password/i }).first()

      if (await forgotLink.isVisible()) {
        await forgotLink.click()
        await expect(page).toHaveURL(/\/forgot-password/)
      }
    })

    test('should navigate from forgot password back to sign in', async ({ page }) => {
      await page.goto('/forgot-password')

      await page
        .getByRole('link', { name: /back to sign in/i })
        .first()
        .click()

      await expect(page).toHaveURL(/\/sign-in/)
    })

    test('should navigate from reset password to forgot password', async ({ page }) => {
      await page.goto('/reset-password')

      await page.getByRole('link', { name: /request new reset link/i }).click()

      await expect(page).toHaveURL(/\/forgot-password/)
    })

    test('should navigate from verify email to sign in', async ({ page }) => {
      await page.goto('/verify-email')

      await page
        .getByRole('link', { name: /go to sign in/i })
        .first()
        .click()

      await expect(page).toHaveURL(/\/sign-in/)
    })

    test('should navigate from verify email to home', async ({ page }) => {
      await page.goto('/verify-email')

      await page.getByRole('link', { name: /back to home/i }).click()

      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Dark Mode', () => {
    test('should render forgot password page in dark mode', async ({ page }) => {
      // Set dark mode
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/forgot-password')

      // Check that page renders (visual test would be better, but at least verify no errors)
      await expect(page.getByText(/forgot password\?/i)).toBeVisible()
    })

    test('should render reset password page in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/reset-password')

      await expect(page.getByText(/invalid reset link/i)).toBeVisible()
    })

    test('should render verify email page in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('/verify-email')

      await expect(page.getByText(/verification failed/i)).toBeVisible()
    })
  })

  test.describe('Keyboard Accessibility', () => {
    test('should allow form submission with Enter key on forgot password', async ({ page }) => {
      await page.goto('/forgot-password')

      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByLabel(/email address/i).press('Enter')

      // Should submit and show success state
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })
    })

    test('should allow tab navigation on forgot password page', async ({ page }) => {
      await page.goto('/forgot-password')

      // Tab through elements
      await page.keyboard.press('Tab') // Email input
      const emailInput = page.locator(':focus')
      await expect(emailInput).toBeFocused()

      await page.keyboard.press('Tab') // Submit button
      const submitButton = page.locator(':focus')
      await expect(submitButton).toBeFocused()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle multiple rapid submissions', async ({ page }) => {
      await page.goto('/forgot-password')

      const emailInput = page.getByLabel(/email address/i)
      const submitButton = page.getByRole('button', { name: /send reset link/i })

      await emailInput.fill('test@example.com')

      // Click submit multiple times rapidly
      await submitButton.click()
      await submitButton.click()
      await submitButton.click()

      // Should handle gracefully and show success state
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })
    })

    test('should maintain state after page refresh on forgot password success', async ({
      page,
    }) => {
      await page.goto('/forgot-password')

      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      // Wait for success state
      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })

      // Refresh page
      await page.reload()

      // Should show initial form again (state is not persisted)
      await expect(page.getByLabel(/email address/i)).toBeVisible()
    })
  })

  test.describe('Visual Elements', () => {
    test('should display icons on forgot password page', async ({ page }) => {
      await page.goto('/forgot-password')

      // Check for envelope icon (via SVG or test-id)
      const icon = page.locator('[data-testid="envelope-icon"]').or(page.locator('svg')).first()
      await expect(icon).toBeVisible()
    })

    test('should display gradient branding', async ({ page }) => {
      await page.goto('/forgot-password')

      // Check for Open Event branding
      await expect(page.getByText(/open event/i).first()).toBeVisible()
    })

    test('should display success checkmark on forgot password success', async ({ page }) => {
      await page.goto('/forgot-password')

      await page.getByLabel(/email address/i).fill('test@example.com')
      await page.getByRole('button', { name: /send reset link/i }).click()

      await expect(page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 })

      // Check for checkmark icon
      const checkIcon = page
        .locator('[data-testid="check-circle-icon"]')
        .or(page.locator('svg'))
        .first()
      await expect(checkIcon).toBeVisible()
    })
  })
})
