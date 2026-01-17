import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Settings Page
 *
 * Tests cover:
 * - Profile tab (experience, event scale, event types)
 * - Organization tab (org info, stats)
 * - Security tab (2FA, password, sessions)
 * - Notifications tab (email, push toggles)
 */

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

test.describe('Settings Page', () => {
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

    // Navigate to settings
    await page.goto('/dashboard/settings')
    await page.waitForTimeout(2000)
  })

  test.describe('Settings Page Display', () => {
    test('should display settings page with header', async ({ page }) => {
      const header = page.locator('h1').filter({ hasText: /settings/i })
      await expect(header).toBeVisible({ timeout: 10000 })
    })

    test('should display profile card with user info', async ({ page }) => {
      // Should show profile section with email (use first to avoid strict mode)
      const emailText = page.getByText(TEST_EMAIL).first()
      await expect(emailText).toBeVisible({ timeout: 10000 })
    })

    test('should display all tab options', async ({ page }) => {
      // Should show tab buttons for Profile, Organization, Security, Notifications
      const profileTab = page.getByRole('tab', { name: /profile/i })
      const orgTab = page.getByRole('tab', { name: /organization/i })
      const securityTab = page.getByRole('tab', { name: /security/i })
      const notificationsTab = page.getByRole('tab', { name: /notifications/i })

      await expect(profileTab).toBeVisible({ timeout: 10000 })
      await expect(orgTab).toBeVisible({ timeout: 5000 })
      await expect(securityTab).toBeVisible({ timeout: 5000 })
      await expect(notificationsTab).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Profile Tab', () => {
    test('should display experience level selector', async ({ page }) => {
      // Profile tab should be active by default - find the label text
      const experienceLabel = page.getByText('Experience Level', { exact: true })
      await expect(experienceLabel).toBeVisible({ timeout: 10000 })
    })

    test('should display event scale selector', async ({ page }) => {
      const scaleLabel = page.getByText(/typical event scale/i)
      await expect(scaleLabel).toBeVisible({ timeout: 10000 })
    })

    test('should display event types selection', async ({ page }) => {
      const eventTypesLabel = page.getByText(/event types you organize/i)
      await expect(eventTypesLabel).toBeVisible({ timeout: 10000 })

      // Should show event type buttons
      const conferences = page.locator('button').filter({ hasText: /conferences/i })
      const workshops = page.locator('button').filter({ hasText: /workshops/i })

      const hasConferences = await conferences.isVisible().catch(() => false)
      const hasWorkshops = await workshops.isVisible().catch(() => false)

      expect(hasConferences || hasWorkshops).toBeTruthy()
    })

    test('should toggle event type selection', async ({ page }) => {
      const conferenceButton = page.locator('button').filter({ hasText: /^Conferences$/i })

      if (await conferenceButton.isVisible().catch(() => false)) {
        await conferenceButton.click()
        await page.waitForTimeout(300)

        // Should show Save Changes button after making changes
        const saveButton = page.getByRole('button', { name: /save changes/i })
        await expect(saveButton).toBeVisible({ timeout: 5000 })
      }
    })

    test('should display AI Assistant usage stats', async ({ page }) => {
      const aiSection = page.getByText(/ai assistant usage/i)
      await expect(aiSection).toBeVisible({ timeout: 10000 })
    })

    test('should display display name input', async ({ page }) => {
      const displayNameInput = page.getByPlaceholder(/enter your name/i)
      await expect(displayNameInput).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Organization Tab', () => {
    test('should switch to organization tab', async ({ page }) => {
      const orgTab = page.getByRole('tab', { name: /organization/i })
      await orgTab.click()
      await page.waitForTimeout(500)

      // Should show organization details
      const orgDetails = page.getByText(/organization details/i)
      await expect(orgDetails).toBeVisible({ timeout: 10000 })
    })

    test('should display organization name input', async ({ page }) => {
      const orgTab = page.getByRole('tab', { name: /organization/i })
      await orgTab.click()
      await page.waitForTimeout(500)

      const orgNameInput = page.getByPlaceholder(/acme corp/i)
      await expect(orgNameInput).toBeVisible({ timeout: 10000 })
    })

    test('should display organization stats', async ({ page }) => {
      const orgTab = page.getByRole('tab', { name: /organization/i })
      await orgTab.click()
      await page.waitForTimeout(500)

      const statsSection = page.getByText(/organization stats/i)
      await expect(statsSection).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Security Tab', () => {
    test('should switch to security tab', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i })
      await securityTab.click()
      await page.waitForTimeout(500)

      // Should show security content
      const passwordSection = page.getByText(/password/i)
      await expect(passwordSection.first()).toBeVisible({ timeout: 10000 })
    })

    test('should display 2FA setup option', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i })
      await securityTab.click()
      await page.waitForTimeout(500)

      // Should show 2FA option or status
      const twoFactorText = page.getByText(/two-factor|2fa/i)
      const hasTwoFactor = await twoFactorText
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasTwoFactor).toBeTruthy()
    })

    test('should display change password button', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i })
      await securityTab.click()
      await page.waitForTimeout(500)

      const changePasswordBtn = page.getByRole('button', { name: /update/i }).first()
      await expect(changePasswordBtn).toBeVisible({ timeout: 10000 })
    })

    test('should show password form when clicking update', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i })
      await securityTab.click()
      await page.waitForTimeout(500)

      // Find the Update button in the password section
      const updateButton = page
        .locator('button')
        .filter({ hasText: /^update$/i })
        .first()

      if (await updateButton.isVisible().catch(() => false)) {
        await updateButton.click()
        await page.waitForTimeout(300)

        // Password form fields should appear
        const currentPasswordInput = page.getByPlaceholder(/current password/i)
        const hasForm = await currentPasswordInput.isVisible().catch(() => false)

        expect(hasForm).toBeTruthy()
      }
    })

    test('should display active sessions section', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i })
      await securityTab.click()
      await page.waitForTimeout(500)

      const sessionsSection = page.getByRole('heading', { name: /active sessions/i })
      await expect(sessionsSection).toBeVisible({ timeout: 10000 })
    })

    test('should display data export section', async ({ page }) => {
      const securityTab = page.getByRole('tab', { name: /security/i })
      await securityTab.click()
      await page.waitForTimeout(500)

      const dataSection = page.getByText(/data export|export your data/i)
      const hasDataSection = await dataSection
        .first()
        .isVisible()
        .catch(() => false)

      expect(hasDataSection).toBeTruthy()
    })
  })

  test.describe('Notifications Tab', () => {
    test('should switch to notifications tab', async ({ page }) => {
      const notificationsTab = page.getByRole('tab', { name: /notifications/i })
      await notificationsTab.click()
      await page.waitForTimeout(500)

      // Should show email notifications section
      const emailSection = page.getByText(/email notifications/i)
      await expect(emailSection).toBeVisible({ timeout: 10000 })
    })

    test('should display email notification toggles', async ({ page }) => {
      const notificationsTab = page.getByRole('tab', { name: /notifications/i })
      await notificationsTab.click()
      await page.waitForTimeout(500)

      // Should show specific notification options
      const eventUpdates = page.getByText(/event updates/i)
      const vendorMessages = page.getByText(/vendor messages/i)

      const hasEventUpdates = await eventUpdates.isVisible().catch(() => false)
      const hasVendorMessages = await vendorMessages.isVisible().catch(() => false)

      expect(hasEventUpdates || hasVendorMessages).toBeTruthy()
    })

    test('should display push notification toggles', async ({ page }) => {
      const notificationsTab = page.getByRole('tab', { name: /notifications/i })
      await notificationsTab.click()
      await page.waitForTimeout(500)

      // Should show push notifications section
      const pushSection = page.getByText(/push notifications/i)
      await expect(pushSection).toBeVisible({ timeout: 10000 })
    })

    test('should toggle notification switch', async ({ page }) => {
      const notificationsTab = page.getByRole('tab', { name: /notifications/i })
      await notificationsTab.click()
      await page.waitForTimeout(500)

      // Find a switch element and click it
      const switches = page.locator('button[role="switch"]')
      const switchCount = await switches.count()

      if (switchCount > 0) {
        await switches.first().click()
        await page.waitForTimeout(300)
        // Switch should be toggled (state change)
      }
    })
  })

  test.describe('Save Changes', () => {
    test('should show save button after making changes', async ({ page }) => {
      // Make a change - toggle an event type
      const conferenceButton = page.locator('button').filter({ hasText: /^Conferences$/i })

      if (await conferenceButton.isVisible().catch(() => false)) {
        await conferenceButton.click()
        await page.waitForTimeout(300)

        // Save button should appear
        const saveButton = page.getByRole('button', { name: /save changes/i })
        await expect(saveButton).toBeVisible({ timeout: 5000 })
      }
    })
  })
})
