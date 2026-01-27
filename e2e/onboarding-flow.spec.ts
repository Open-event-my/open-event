import { test, expect } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  test.setTimeout(60000)

  test('should complete full onboarding flow for new organizer', async ({ page }) => {
    // 1. Sign Up
    await page.goto('/sign-up')
    
    // Dismiss cookie banner
    const acceptCookies = page.getByRole('button', { name: /accept all/i })
    if (await acceptCookies.isVisible()) {
      await acceptCookies.click()
    }

    const uniqueId = Date.now()
    const email = `test-organizer-${uniqueId}@example.com`
    const password = 'StrongPassword123!'
    const name = 'Organizer Test User'

    await page.getByLabel(/name/i).fill(name)
    await page.getByLabel(/email/i).fill(email)
    await page.locator('#password').fill(password)
    
    await page.getByRole('button', { name: /create account/i }).click()

    // 2. Verify redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 })
    
    // Step 0: Welcome
    await expect(page.getByRole('heading', { name: /welcome to open event/i })).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 1: Role
    await expect(page.getByText(/tell us about your role/i)).toBeVisible()
    await page.getByRole('button', { name: /event organizer/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 2: Organization
    await expect(page.getByText(/tell us about your organization/i)).toBeVisible()
    await page.getByPlaceholder(/your organization name/i).fill('Test Organization')
    await page.getByText('Company').click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 3: Event Types
    await expect(page.getByText(/what type of events/i)).toBeVisible()
    await page.getByText('Conferences').click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 4: Event Scale
    await expect(page.getByText(/how big are your typical events/i)).toBeVisible()
    await page.getByText('Small').click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 5: Goals
    await expect(page.getByText(/what are you hoping to achieve/i)).toBeVisible()
    await page.getByText('Find sponsors').click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 6: Experience
    await expect(page.getByText(/how experienced are you/i)).toBeVisible()
    await page.getByText('First-time organizer').click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 7: Referral
    await expect(page.getByText(/how did you discover/i)).toBeVisible()
    await page.getByText('Search engine').click()
    
    // Complete
    await page.getByRole('button', { name: /complete/i }).click()

    // 3. Verify final redirect
    await expect(page).toHaveURL(/\/onboarding\/complete/, { timeout: 10000 })
    await expect(page.getByText(/all set/i)).toBeVisible()
  })

  test('should have shorter flow for sponsor', async ({ page }) => {
    // 1. Sign Up
    await page.goto('/sign-up')
    
    // Dismiss cookie banner
    const acceptCookies = page.getByRole('button', { name: /accept all/i })
    if (await acceptCookies.isVisible()) {
      await acceptCookies.click()
    }

    const uniqueId = Date.now()
    const email = `test-sponsor-${uniqueId}@example.com`
    const password = 'StrongPassword123!'
    const name = 'Sponsor Test User'

    await page.getByLabel(/name/i).fill(name)
    await page.getByLabel(/email/i).fill(email)
    await page.locator('#password').fill(password)
    
    await page.getByRole('button', { name: /create account/i }).click()

    // 2. Verify redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 })
    
    // Step 0: Welcome
    await expect(page.getByRole('heading', { name: /welcome to open event/i })).toBeVisible()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 1: Role
    await expect(page.getByText(/tell us about your role/i)).toBeVisible()
    await page.getByRole('button', { name: /sponsor/i }).click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 2: Organization
    await expect(page.getByText(/tell us about your organization/i)).toBeVisible()
    await page.getByPlaceholder(/your organization name/i).fill('Sponsor Co')
    await page.getByText('Company').click()
    await page.getByRole('button', { name: /continue/i }).click()

    // Should SKIP Event Types, Scale, Experience
    // Go straight to Goals
    await expect(page.getByText(/what are you hoping to achieve/i)).toBeVisible()
    await page.getByText('Find sponsors').click() // Reusing existing option
    await page.getByRole('button', { name: /continue/i }).click()

    // Referral
    await expect(page.getByText(/how did you discover/i)).toBeVisible()
    await page.getByText('Search engine').click()
    
    // Complete
    await page.getByRole('button', { name: /complete/i }).click()

    await expect(page).toHaveURL(/\/onboarding\/complete/, { timeout: 10000 })
  })
})
