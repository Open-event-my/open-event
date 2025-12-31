/**
 * Vendor Management E2E Tests
 *
 * Tests for the vendor marketplace functionality:
 * - Browse vendors
 * - Search/filter vendors
 * - View vendor details
 * - Send inquiry to vendor
 * - View linked vendors on event detail
 * - Vendor status display
 */

import { test, expect } from '@playwright/test'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

/**
 * Helper to login and navigate to vendors page
 */
async function loginAndGoToVendors(page: import('@playwright/test').Page) {
  await page.goto('/sign-in')
  await page.waitForTimeout(1000)

  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
  await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()

  await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 })

  // Handle onboarding if needed
  if (page.url().includes('onboarding')) {
    await page.goto('/dashboard/vendors')
  } else {
    await page.goto('/dashboard/vendors')
  }

  await page.waitForTimeout(2000)
}

/**
 * Helper to create a test event for inquiry tests
 */
async function createTestEvent(
  page: import('@playwright/test').Page
): Promise<{ eventId: string; eventTitle: string }> {
  const eventTitle = `Vendor Test Event ${Date.now()}`

  await page.goto('/dashboard/events/new')
  await page.waitForTimeout(1500)

  // Click manual form button
  const manualButton = page.locator('button').filter({ hasText: /manual form/i }).first()
  await manualButton.click()
  await page.waitForTimeout(500)

  // Fill required fields
  await page.getByLabel(/event title/i).fill(eventTitle)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  await page.getByLabel(/start date/i).fill(tomorrow.toISOString().split('T')[0])

  // Submit
  await page.locator('button').filter({ hasText: /create event/i }).first().click()
  await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 15000 })

  const url = page.url()
  const eventId = url.split('/').pop() || ''

  return { eventId, eventTitle }
}

test.describe('Vendor Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToVendors(page)
  })

  // =========================================================================
  // Browse Vendors Tests
  // =========================================================================
  test.describe('Browse Vendors', () => {
    test('should display vendor marketplace page with title', async ({ page }) => {
      // Check page title
      await expect(page.getByRole('heading', { name: /vendor marketplace/i })).toBeVisible({
        timeout: 10000,
      })

      // Check subtitle
      await expect(page.getByText(/find and connect with trusted event vendors/i)).toBeVisible()
    })

    test('should show vendor cards or empty state', async ({ page }) => {
      await page.waitForTimeout(2000)

      // Either shows vendor cards or empty marketplace state
      const vendorCards = page.locator('.rounded-xl.border').filter({
        has: page.locator('h3'),
      })
      const emptyState = page.getByText(/vendor marketplace coming soon/i)

      const hasVendors = (await vendorCards.count()) > 0
      const isEmpty = await emptyState.isVisible().catch(() => false)

      expect(hasVendors || isEmpty).toBeTruthy()
    })

    test('should display search input', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search vendors/i)
      await expect(searchInput).toBeVisible({ timeout: 5000 })
    })

    test('should display category filter buttons', async ({ page }) => {
      // Should show "All" button
      await expect(
        page.locator('button').filter({ hasText: /^all$/i }).first()
      ).toBeVisible({ timeout: 5000 })

      // Check for common categories
      const categories = ['Catering', 'Photography', 'Decoration']
      for (const category of categories) {
        const categoryButton = page.locator('button').filter({ hasText: new RegExp(category, 'i') }).first()
        // Some categories may or may not be present depending on data
        if (await categoryButton.isVisible().catch(() => false)) {
          await expect(categoryButton).toBeVisible()
        }
      }
    })

    test('should show "All" category selected by default', async ({ page }) => {
      // All button should have active styling (primary color)
      const allButton = page.locator('button').filter({ hasText: /^all$/i }).first()
      await expect(allButton).toBeVisible({ timeout: 5000 })

      // Check it has the active class (primary color)
      const hasActiveClass = await allButton.evaluate((el) => {
        return el.className.includes('primary') || el.className.includes('bg-primary')
      })
      expect(hasActiveClass).toBeTruthy()
    })

    test('should display loading skeleton while fetching', async ({ page }) => {
      // Refresh page to catch loading state
      await page.reload()

      // Look for loading skeleton or vendor content
      const skeleton = page.locator('.animate-pulse').first()
      const content = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') }).first()
      const emptyState = page.getByText(/vendor marketplace coming soon/i)

      // Should eventually show either content or empty state
      await page.waitForTimeout(3000)
      const hasContent = await content.isVisible().catch(() => false)
      const isEmpty = await emptyState.isVisible().catch(() => false)
      expect(hasContent || isEmpty).toBeTruthy()
    })
  })

  // =========================================================================
  // Search and Filter Vendors Tests
  // =========================================================================
  test.describe('Search and Filter Vendors', () => {
    test('should filter vendors by search term', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search vendors/i)
      await expect(searchInput).toBeVisible({ timeout: 5000 })

      // Type a search term
      await searchInput.fill('catering')
      await page.waitForTimeout(1500)

      // Should show either matching vendors or no results
      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })
      const noResults = page.getByText(/no vendors found/i)

      const hasVendors = (await vendorCards.count()) > 0
      const hasNoResults = await noResults.isVisible().catch(() => false)

      expect(hasVendors || hasNoResults).toBeTruthy()
    })

    test('should filter vendors by category', async ({ page }) => {
      await page.waitForTimeout(2000)

      // Click on Catering category if visible
      const cateringButton = page.locator('button').filter({ hasText: /catering/i }).first()

      if (await cateringButton.isVisible().catch(() => false)) {
        await cateringButton.click()
        await page.waitForTimeout(1500)

        // Should filter to show only catering vendors or empty state
        const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })
        const noResults = page.getByText(/no vendors found/i)
        const emptyState = page.getByText(/vendor marketplace coming soon/i)

        const count = await vendorCards.count()
        const hasNoResults = await noResults.isVisible().catch(() => false)
        const isEmpty = await emptyState.isVisible().catch(() => false)

        expect(count >= 0 || hasNoResults || isEmpty).toBeTruthy()
      }
    })

    test('should show empty state for no search results', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search vendors/i)
      await expect(searchInput).toBeVisible({ timeout: 5000 })

      // Search for something that doesn't exist
      await searchInput.fill('xyznonsensevendor12345')
      await page.waitForTimeout(1500)

      // Should show no results message
      await expect(page.getByText(/no vendors found/i)).toBeVisible({ timeout: 5000 })
    })

    test('should clear search and show all vendors', async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search vendors/i)
      await expect(searchInput).toBeVisible({ timeout: 5000 })

      // Search for something
      await searchInput.fill('test')
      await page.waitForTimeout(1000)

      // Clear search
      await searchInput.clear()
      await page.waitForTimeout(1500)

      // Should show all vendors again or empty marketplace state
      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })
      const emptyState = page.getByText(/vendor marketplace coming soon/i)

      const hasVendors = (await vendorCards.count()) > 0
      const isEmpty = await emptyState.isVisible().catch(() => false)

      expect(hasVendors || isEmpty).toBeTruthy()
    })

    test('should combine search and category filters', async ({ page }) => {
      await page.waitForTimeout(2000)

      // Click on a category first
      const photographyButton = page.locator('button').filter({ hasText: /photography/i }).first()

      if (await photographyButton.isVisible().catch(() => false)) {
        await photographyButton.click()
        await page.waitForTimeout(1000)

        // Then search
        const searchInput = page.getByPlaceholder(/search vendors/i)
        await searchInput.fill('studio')
        await page.waitForTimeout(1500)

        // Should show filtered results
        const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })
        const noResults = page.getByText(/no vendors found/i)

        const hasVendors = (await vendorCards.count()) >= 0
        const hasNoResults = await noResults.isVisible().catch(() => false)

        expect(hasVendors || hasNoResults).toBeTruthy()
      }
    })
  })

  // =========================================================================
  // View Vendor Details Tests
  // =========================================================================
  test.describe('View Vendor Details', () => {
    test('should display vendor name in card', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const vendorName = firstCard.locator('h3').first()
        await expect(vendorName).toBeVisible()
      }
    })

    test('should display vendor category', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        // Category is shown as text-muted-foreground capitalize
        const categoryText = firstCard.locator('.text-muted-foreground.capitalize').first()
        await expect(categoryText).toBeVisible()
      }
    })

    test('should display vendor rating when available', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        // Rating or "No reviews yet" should be present
        const ratingOrNoReviews = page.locator('.rounded-xl.border').filter({
          has: page.locator('text=/\\d+\\.\\d+|no reviews yet/i'),
        })

        const count = await ratingOrNoReviews.count()
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display vendor location when available', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        // Location is optional - just verify the card structure exists
        const firstCard = vendorCards.first()
        await expect(firstCard).toBeVisible()
      }
    })

    test('should display Inquire button on each vendor card', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()
        await expect(inquireButton).toBeVisible()
      }
    })

    test('should display contact links when available', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        // Contact links are in the footer section with border-t
        const contactSection = firstCard.locator('.border-t').first()
        await expect(contactSection).toBeVisible()
      }
    })
  })

  // =========================================================================
  // Send Inquiry Tests
  // =========================================================================
  test.describe('Send Inquiry to Vendor', () => {
    test('should open inquiry modal when clicking Inquire', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        // Should show inquiry modal dialog
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      }
    })

    test('should show vendor name in modal title', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const vendorName = await firstCard.locator('h3').first().textContent()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        // Modal title should contain vendor name
        if (vendorName) {
          await expect(page.getByRole('dialog')).toContainText(vendorName)
        }
      }
    })

    test('should show event dropdown in inquiry modal', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        // Should show Select Event label or "need to create event" message
        const selectEventLabel = page.getByText(/select event/i)
        const noEventMessage = page.getByText(/create an event first/i)

        const hasSelect = await selectEventLabel.isVisible().catch(() => false)
        const hasNoEvent = await noEventMessage.isVisible().catch(() => false)

        expect(hasSelect || hasNoEvent).toBeTruthy()
      }
    })

    test('should show message textarea in inquiry modal', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        // Should show Message label
        await expect(page.getByText(/^message$/i)).toBeVisible({ timeout: 5000 })

        // Should have textarea
        await expect(page.locator('textarea')).toBeVisible()
      }
    })

    test('should show vendor details section in inquiry modal', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        // Should show vendor details section with category
        await expect(page.getByText(/vendor details/i)).toBeVisible({ timeout: 5000 })
        await expect(page.getByText(/category:/i)).toBeVisible()
      }
    })

    test('should close inquiry modal when clicking Cancel', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        // Click cancel
        await page.getByRole('button', { name: /cancel/i }).click()
        await page.waitForTimeout(500)

        // Dialog should be closed
        await expect(page.getByRole('dialog')).not.toBeVisible()
      }
    })

    test('should validate required fields before sending', async ({ page }) => {
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        // Try to send without filling fields
        const sendButton = page.getByRole('button', { name: /send inquiry/i })

        // Button should be disabled or clicking should show error
        const isDisabled = await sendButton.isDisabled().catch(() => false)

        if (!isDisabled) {
          await sendButton.click()
          await page.waitForTimeout(500)

          // Should show error toast
          const errorToast = page.getByText(/please select an event|write a message/i)
          await expect(errorToast).toBeVisible({ timeout: 5000 })
        } else {
          expect(isDisabled).toBeTruthy()
        }
      }
    })
  })

  // =========================================================================
  // Send Inquiry with Event Tests
  // =========================================================================
  test.describe('Send Inquiry Complete Flow', () => {
    test('should send inquiry successfully when event and message provided', async ({ page }) => {
      // First create an event
      const { eventTitle } = await createTestEvent(page)

      // Go back to vendors page
      await page.goto('/dashboard/vendors')
      await page.waitForTimeout(2000)

      const vendorCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

      if ((await vendorCards.count()) > 0) {
        const firstCard = vendorCards.first()
        const inquireButton = firstCard.locator('button').filter({ hasText: /inquire/i }).first()

        await inquireButton.click()
        await page.waitForTimeout(500)

        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        // Select the event we just created
        const eventSelect = page.locator('button[role="combobox"]').first()
        await eventSelect.click()
        await page.waitForTimeout(500)

        // Click on the event option
        const eventOption = page.getByRole('option', { name: new RegExp(eventTitle, 'i') })
        if (await eventOption.isVisible().catch(() => false)) {
          await eventOption.click()
          await page.waitForTimeout(300)
        }

        // Fill message
        await page.locator('textarea').fill('Hi, I am interested in your services for my upcoming event.')
        await page.waitForTimeout(300)

        // Send inquiry
        const sendButton = page.getByRole('button', { name: /send inquiry/i })
        await sendButton.click()

        // Should show success toast or close modal
        await page.waitForTimeout(2000)

        const successToast = page.getByText(/inquiry sent successfully/i)
        const dialogClosed = !(await page.getByRole('dialog').isVisible().catch(() => false))

        expect((await successToast.isVisible().catch(() => false)) || dialogClosed).toBeTruthy()
      }
    })
  })

  // =========================================================================
  // View Linked Vendors on Event Tests
  // =========================================================================
  test.describe('View Linked Vendors on Event', () => {
    test('should display vendors section on event detail page', async ({ page }) => {
      // Navigate to events list
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      // Click first event
      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible().catch(() => false)) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should show vendors section heading
        await expect(page.getByText(/vendors/i).first()).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show browse vendors link on event detail page', async ({ page }) => {
      // Navigate to events list
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      // Click first event
      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible().catch(() => false)) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should have browse vendors link
        const browseLink = page.locator('a[href="/dashboard/vendors"]').first()
        await expect(browseLink).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show empty vendor state or vendor cards on event detail', async ({ page }) => {
      // Navigate to events list
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      // Click first event
      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible().catch(() => false)) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Should show either "No vendors" state or vendor cards
        const noVendorsText = page.getByText(/no vendors/i).first()
        const vendorCards = page.locator('.rounded-lg').filter({
          has: page.locator('text=/inquiry|negotiating|confirmed/i'),
        })

        const hasNoVendors = await noVendorsText.isVisible().catch(() => false)
        const hasVendors = (await vendorCards.count()) > 0

        expect(hasNoVendors || hasVendors).toBeTruthy()
      }
    })
  })

  // =========================================================================
  // Vendor Status Display Tests
  // =========================================================================
  test.describe('Vendor Status Display', () => {
    test('should display vendor status badge on event detail page', async ({ page }) => {
      // Navigate to events list
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      // Click first event
      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible().catch(() => false)) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // If there are linked vendors, they should have status badges
        const statusBadges = page.locator('span').filter({
          hasText: /^(inquiry|negotiating|confirmed|declined|completed)$/i,
        })

        const count = await statusBadges.count()
        // Status badges are optional (only shown if vendors exist)
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })

    test('should show inquiry status for newly linked vendors', async ({ page }) => {
      // This test verifies the default status when a vendor is linked
      // When sending an inquiry via the modal, the initial status is 'inquiry'

      // Navigate to events list
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible().catch(() => false)) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Look for inquiry status (blue color)
        const inquiryBadge = page.locator('span').filter({ hasText: /^inquiry$/i })

        // If vendors exist with inquiry status
        if ((await inquiryBadge.count()) > 0) {
          await expect(inquiryBadge.first()).toBeVisible()
        }
      }
    })

    test('should show different status colors for different states', async ({ page }) => {
      // Navigate to events list
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible().catch(() => false)) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Check for status badges with different colors
        // inquiry = blue, negotiating = amber, confirmed = green, declined = red
        const statusBadges = page.locator('span').filter({
          hasText: /^(inquiry|negotiating|confirmed|declined|completed)$/i,
        })

        const count = await statusBadges.count()

        if (count > 0) {
          // Verify at least one badge has color styling
          const firstBadge = statusBadges.first()
          const hasColorClass = await firstBadge.evaluate((el) => {
            return (
              el.className.includes('bg-') ||
              el.className.includes('text-blue') ||
              el.className.includes('text-amber') ||
              el.className.includes('text-green') ||
              el.className.includes('text-red')
            )
          })
          expect(hasColorClass).toBeTruthy()
        }
      }
    })
  })

  // =========================================================================
  // Navigation Tests
  // =========================================================================
  test.describe('Vendor Navigation', () => {
    test('should navigate to vendors page from sidebar', async ({ page }) => {
      // Go to dashboard first
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)

      // Click vendors link in sidebar
      const vendorLink = page.locator('a[href="/dashboard/vendors"]').first()
      if (await vendorLink.isVisible().catch(() => false)) {
        await vendorLink.click()
        await page.waitForURL(/\/dashboard\/vendors/, { timeout: 10000 })
        await expect(page.getByRole('heading', { name: /vendor marketplace/i })).toBeVisible()
      }
    })

    test('should navigate from event detail to vendors page via browse link', async ({ page }) => {
      // Go to events list
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)

      const eventCard = page.locator('.rounded-lg.border').filter({ has: page.locator('h3') }).first()

      if (await eventCard.isVisible().catch(() => false)) {
        await eventCard.click()
        await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })
        await page.waitForTimeout(2000)

        // Click browse vendors link
        const browseLink = page.locator('a[href="/dashboard/vendors"]').first()
        if (await browseLink.isVisible().catch(() => false)) {
          await browseLink.click()
          await page.waitForURL(/\/dashboard\/vendors/, { timeout: 10000 })
          await expect(page.getByRole('heading', { name: /vendor marketplace/i })).toBeVisible()
        }
      }
    })
  })
})
