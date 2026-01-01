/**
 * E2E Tests for Promo Codes Management
 *
 * Tests cover:
 * - Create percentage discount
 * - Create fixed amount discount
 * - Set usage limits
 * - Set validity period
 * - Activate/deactivate code
 */

import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

// Store event ID for test reuse
let testEventId: string | null = null

test.describe('Promo Codes Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/sign-in')
    await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
    await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/dashboard|onboarding/, { timeout: 10000 })

    // Handle onboarding if needed
    if (page.url().includes('onboarding')) {
      await page.goto('/dashboard/events')
    }
  })

  // Helper to navigate to an event's promo codes page
  async function navigateToPromoCodesPage(page: import('@playwright/test').Page): Promise<boolean> {
    await page.goto('/dashboard/events')
    await page.waitForTimeout(2000)

    const eventCard = page
      .locator('.rounded-lg.border')
      .filter({ has: page.locator('h3') })
      .first()

    if (await eventCard.isVisible()) {
      await eventCard.click()
      await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })

      // Extract event ID
      const url = page.url()
      testEventId = url.split('/').pop() || null

      // Navigate to promo codes page
      await page.goto(`/dashboard/events/${testEventId}/promo-codes`)
      await page.waitForTimeout(2000)

      // Verify we're on the promo codes page - use exact match for main heading
      await expect(page.getByRole('heading', { name: 'Promo Codes', exact: true })).toBeVisible({
        timeout: 10000,
      })
      return true
    }
    return false
  }

  // Helper to create a test event and navigate to promo codes
  async function createEventAndGoToPromoCodes(page: import('@playwright/test').Page) {
    await page.goto('/dashboard/events/new')
    await page.waitForTimeout(2000)

    const manualButton = page
      .locator('button')
      .filter({ hasText: /manual form/i })
      .first()
    await expect(manualButton).toBeVisible({ timeout: 15000 })
    await manualButton.click()
    await page.waitForTimeout(1000)

    const testTitle = `Promo Test Event ${Date.now()}`
    await page.getByLabel(/event title/i).fill(testTitle)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await page.getByLabel(/start date/i).fill(tomorrow.toISOString().split('T')[0])

    const createButton = page
      .locator('button')
      .filter({ hasText: /create event/i })
      .first()
    await createButton.click()
    await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 20000 })

    // Wait for page to load and extract event ID
    await page.waitForTimeout(3000)
    const url = page.url()
    testEventId = url.split('/').pop() || null

    // Navigate to promo codes page
    await page.goto(`/dashboard/events/${testEventId}/promo-codes`)
    await page.waitForTimeout(2000)

    // Verify we're on the promo codes page - use exact match for main heading
    await expect(page.getByRole('heading', { name: 'Promo Codes', exact: true })).toBeVisible({
      timeout: 10000,
    })
  }

  test.describe('Create Percentage Discount', () => {
    test.setTimeout(60000)

    test('should create percentage discount code', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // Click Create Promo Code button
      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await expect(createButton).toBeVisible({ timeout: 10000 })
      await createButton.click()

      // Wait for modal
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill form for percentage discount
      const promoCode = `PERCENT${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#description').fill('20% discount test')

      // Discount type should default to Percentage, verify and select
      await page.locator('[data-slot="select-trigger"]').first().click()
      await page.getByRole('option', { name: /percentage/i }).click()

      await page.locator('#discountValue').fill('20')

      // Submit
      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()

      // Wait for modal to close and verify code appears
      await page.waitForTimeout(2000)
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('20% off')).toBeVisible()
    })

    test('should validate percentage between 1-100', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill form with invalid percentage (150%)
      await page.locator('#code').fill('INVALID150')
      await page.locator('#discountValue').fill('150')

      // Submit
      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()

      // Should show error toast
      await page.waitForTimeout(1000)
      // The error may be shown as a toast or prevent submission
      // Check if modal is still open (validation failed)
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
    })

    test('should show percentage discount in list', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // Create a percentage discount code
      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `SHOW${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('15')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify the percentage is displayed correctly
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('15% off')).toBeVisible()
    })
  })

  test.describe('Create Fixed Amount Discount', () => {
    test.setTimeout(60000)

    test('should create fixed amount discount code', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `FIXED${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#description').fill('$25 fixed discount')

      // Select Fixed Amount discount type
      await page.locator('[data-slot="select-trigger"]').first().click()
      await page.getByRole('option', { name: /fixed amount/i }).click()

      await page.locator('#discountValue').fill('25')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('$25.00 off')).toBeVisible()
    })

    test('should display fixed amount with currency symbol', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `DOLLAR${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)

      // Select Fixed Amount
      await page.locator('[data-slot="select-trigger"]').first().click()
      await page.getByRole('option', { name: /fixed amount/i }).click()

      await page.locator('#discountValue').fill('50')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify currency display
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/\$50\.00 off/)).toBeVisible()
    })

    test('should validate amount is greater than 0', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      await page.locator('#code').fill('ZERO')
      await page.locator('#discountValue').fill('0')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()

      // Should stay on dialog (validation failed)
      await page.waitForTimeout(1000)
      await expect(page.getByRole('dialog')).toBeVisible()
    })
  })

  test.describe('Set Usage Limits', () => {
    test.setTimeout(60000)

    test('should set max total uses', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `LIMIT${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')
      await page.locator('#maxUses').fill('100')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify code appears with usage limit
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('0 / 100 used')).toBeVisible()
    })

    test('should set max uses per customer', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `PERCUST${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('15')
      await page.locator('#maxUsesPerEmail').fill('2')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify code created (max per email is stored but may not be shown in list)
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
    })

    test('should display usage count in list', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `USAGE${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('5')
      await page.locator('#maxUses').fill('50')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify usage display format
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/0 \/ 50 used/)).toBeVisible()
    })
  })

  test.describe('Set Validity Period', () => {
    test.setTimeout(60000)

    test('should set valid from date', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `VFROM${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      // Set valid from to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().slice(0, 16)
      await page.locator('#validFrom').fill(tomorrowStr)

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Should show Scheduled status
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Scheduled')).toBeVisible()
    })

    test('should set valid until date', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `VUNTIL${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      // Set valid until to next week
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekStr = nextWeek.toISOString().slice(0, 16)
      await page.locator('#validUntil').fill(nextWeekStr)

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Should show Active status (end date is in future)
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Active').first()).toBeVisible()
    })

    test('should show Scheduled status for future start date', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `SCHED${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      // Set valid from to next month
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      const nextMonthStr = nextMonth.toISOString().slice(0, 16)
      await page.locator('#validFrom').fill(nextMonthStr)

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Scheduled')).toBeVisible()
    })

    test('should show Expired status for past end date', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `EXPD${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      // Set valid until to yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().slice(0, 16)
      await page.locator('#validUntil').fill(yesterdayStr)

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Expired')).toBeVisible()
    })
  })

  test.describe('Activate/Deactivate Code', () => {
    test.setTimeout(60000)

    test('should create inactive code initially', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `INACT${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      // Toggle Active switch off
      const activeSwitch = page.locator('[role="switch"]')
      await activeSwitch.click()

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Inactive')).toBeVisible()
    })

    test('should deactivate promo code via menu', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // First create an active promo code
      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `DEACT${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })

      // Find the row with our promo code and click the dropdown menu
      const promoRow = page.locator('.divide-y > div').filter({ hasText: promoCode }).first()
      const menuButton = promoRow
        .locator('button')
        .filter({ has: page.locator('svg') })
        .last()
      await menuButton.click()

      // Click Deactivate
      await page.getByRole('menuitem', { name: /deactivate/i }).click()
      await page.waitForTimeout(1000)

      // Verify status changed
      await expect(page.getByText('Inactive')).toBeVisible()
    })

    test('should show Inactive status when deactivated', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // Create an inactive code directly
      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `STATUS${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      // Turn off active switch
      const activeSwitch = page.locator('[role="switch"]')
      await activeSwitch.click()

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Check Inactive badge
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      const inactiveBadge = page.getByText('Inactive', { exact: true })
      await expect(inactiveBadge).toBeVisible()
    })

    test('should reactivate promo code', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // Create an inactive promo code first
      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `REACT${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      // Turn off active switch
      const activeSwitch = page.locator('[role="switch"]')
      await activeSwitch.click()

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      // Verify inactive
      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('Inactive')).toBeVisible()

      // Open menu and activate
      const promoRow = page.locator('.divide-y > div').filter({ hasText: promoCode }).first()
      const menuButton = promoRow
        .locator('button')
        .filter({ has: page.locator('svg') })
        .last()
      await menuButton.click()

      await page.getByRole('menuitem', { name: /activate/i }).click()
      await page.waitForTimeout(1000)

      // Verify now active
      await expect(page.getByText('Active').first()).toBeVisible()
    })
  })

  test.describe('Promo Code Page Navigation', () => {
    test.setTimeout(60000)

    test('should navigate to promo codes page from event detail', async ({ page }) => {
      const hasEvent = await navigateToPromoCodesPage(page)

      if (hasEvent) {
        // Verify page elements
        await expect(page.getByRole('heading', { name: /promo codes/i })).toBeVisible()
        await expect(page.getByText(/total codes/i)).toBeVisible()
        await expect(page.getByText(/active codes/i)).toBeVisible()
        await expect(page.getByText(/total uses/i)).toBeVisible()
      }
    })

    test('should display stats cards', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // Verify stats cards are visible
      await expect(page.getByText(/total codes/i)).toBeVisible()
      await expect(page.getByText(/active codes/i)).toBeVisible()
      await expect(page.getByText(/total uses/i)).toBeVisible()
    })

    test('should show empty state when no promo codes', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // For a new event, should show empty state
      await expect(page.getByText(/no promo codes yet/i)).toBeVisible()
      await expect(page.getByText(/create discount codes to offer special pricing/i)).toBeVisible()
    })

    test('should use Generate button to create random code', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Click Generate button
      const generateButton = page.getByRole('button', { name: /generate/i })
      await generateButton.click()

      // Code field should now have a value
      const codeInput = page.locator('#code')
      const codeValue = await codeInput.inputValue()
      expect(codeValue.length).toBeGreaterThan(0)
      expect(codeValue).toMatch(/^[A-Z0-9]+$/)
    })
  })

  test.describe('Delete Promo Code', () => {
    test.setTimeout(60000)

    test('should delete promo code with no uses', async ({ page }) => {
      await createEventAndGoToPromoCodes(page)

      // Create a promo code
      const createButton = page.getByRole('button', { name: /create promo code/i }).first()
      await createButton.click()
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      const promoCode = `DEL${Date.now().toString().slice(-6)}`
      await page.locator('#code').fill(promoCode)
      await page.locator('#discountValue').fill('10')

      const submitButton = page
        .locator('button')
        .filter({ hasText: /create code/i })
        .first()
      await submitButton.click()
      await page.waitForTimeout(2000)

      await expect(page.getByText(promoCode)).toBeVisible({ timeout: 10000 })

      // Set up dialog handler for confirm
      page.once('dialog', async (dialog) => {
        expect(dialog.type()).toBe('confirm')
        await dialog.accept()
      })

      // Open menu and delete
      const promoRow = page.locator('.divide-y > div').filter({ hasText: promoCode }).first()
      const menuButton = promoRow
        .locator('button')
        .filter({ has: page.locator('svg') })
        .last()
      await menuButton.click()

      const deleteItem = page.getByRole('menuitem', { name: /delete/i })
      await deleteItem.click()
      await page.waitForTimeout(2000)

      // Verify code is gone
      await expect(page.getByText(promoCode)).not.toBeVisible()
    })
  })
})
