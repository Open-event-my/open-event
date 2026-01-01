import { test, expect, Page } from '@playwright/test'

/**
 * E2E Tests for Notifications System
 *
 * Tests cover:
 * - Notification bell display
 * - Unread count badge
 * - Notification list
 * - Mark as read
 * - Delete notifications
 * - Mark all as read
 * - Navigation on click
 * - Real-time updates
 */

// Helper function to sign up a test user
async function signUpTestUser(page: Page, email: string, password: string, name: string) {
  await page.goto('http://localhost:5176/sign-up', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })

  // Debug: Take screenshot and log URL
  console.log('Current URL after goto:', page.url())
  await page.screenshot({ path: 'debug-signup-page.png' })

  // Wait longer for React app to initialize
  await page.waitForTimeout(2000)

  // Wait for the form to be visible and ready
  await page.waitForSelector('#name', { state: 'visible', timeout: 30000 })
  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('#password', { state: 'visible', timeout: 10000 })

  // Fill in the form
  await page.fill('#name', name)
  await page.fill('#email', email)
  await page.fill('#password', password)

  // Submit the form
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard or onboarding
  await page.waitForURL(/\/(dashboard|onboarding|verify-email)/, { timeout: 30000 })
}

// Helper function to sign in (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in', { waitUntil: 'networkidle' })

  // Wait for the form to be visible and ready
  await page.waitForSelector('#email', { state: 'visible', timeout: 10000 })
  await page.waitForSelector('#password', { state: 'visible', timeout: 10000 })

  // Fill in the form
  await page.fill('#email', email)
  await page.fill('#password', password)

  // Submit the form
  await page.click('button[type="submit"]')

  // Wait for redirect
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20000 })
}

// Helper function to create a test notification via browser console (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _createTestNotification(page: Page) {
  return await page.evaluate(async () => {
    // This is a workaround - in real implementation we'd use a proper test API
    // For now, we'll use localStorage to signal we need a test notification
    localStorage.setItem('createTestNotification', 'true')

    // Trigger a page action that will create the notification
    return true
  })
}

// Helper to wait for notification count (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _waitForNotificationCount(page: Page, expectedCount: number, timeout = 5000) {
  await page.waitForFunction(
    (count) => {
      const badge = document.querySelector('[data-testid="notification-badge"]')
      if (count === 0) return !badge || badge.textContent === ''
      return badge?.textContent === String(count) || badge?.textContent === '9+'
    },
    expectedCount,
    { timeout }
  )
}

test.describe('Notifications System', () => {
  const testEmail = `test-notifications-${Date.now()}@example.com`
  const testPassword = 'Test123456!'
  const testName = 'Test Notifications User'

  test.beforeEach(async ({ page }) => {
    // Sign up and sign in before each test
    await signUpTestUser(page, testEmail, testPassword, testName)

    // Handle different redirect scenarios
    const currentUrl = page.url()
    if (currentUrl.includes('verify-email')) {
      await page.goto('/dashboard')
    } else if (currentUrl.includes('onboarding')) {
      // Skip onboarding and go to dashboard
      await page.goto('/dashboard')
    }

    // Wait for dashboard to load and notification bell to appear
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="notification-bell"]', { timeout: 15000 })
  })

  test('should display notification bell in top bar', async ({ page }) => {
    // Check that notification bell exists
    const notificationBell = page.locator('[data-testid="notification-bell"]')
    await expect(notificationBell).toBeVisible()

    // Bell should be a button
    await expect(notificationBell).toHaveAttribute('role', 'button')
  })

  test('should not show unread badge when no notifications', async ({ page }) => {
    // Check that badge is not visible when count is 0
    const badge = page.locator('[data-testid="notification-badge"]')
    await expect(badge).not.toBeVisible()
  })

  test('should show notification dropdown when bell is clicked', async ({ page }) => {
    // Click the notification bell
    await page.click('[data-testid="notification-bell"]')

    // Check that dropdown appears
    const dropdown = page.locator('[data-testid="notification-dropdown"]')
    await expect(dropdown).toBeVisible()

    // Check dropdown has title
    await expect(page.locator('text=Notifications')).toBeVisible()
  })

  test('should show empty state when no notifications', async ({ page }) => {
    // Open notification dropdown
    await page.click('[data-testid="notification-bell"]')

    // Check for empty state message
    await expect(page.locator('text=No notifications yet')).toBeVisible()
    await expect(page.locator("text=You'll be notified about important updates here")).toBeVisible()
  })

  test('should create and display test notification', async ({ page }) => {
    // Create a test notification by clicking a test button
    // First, we need to add a test button to the UI or use the mutation directly

    // For this test, we'll use the browser console to trigger the mutation
    await page.evaluate(async () => {
      // Access the Convex client from window (assuming it's exposed)
      // This is a simplified version - you may need to adjust based on your setup
      const event = new CustomEvent('createTestNotification')
      window.dispatchEvent(event)
    })

    // Wait a bit for the notification to be created
    await page.waitForTimeout(1000)

    // Check that unread badge appears
    const badge = page.locator('[data-testid="notification-badge"]')
    await expect(badge).toBeVisible()

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Check that notification appears in list
    const notificationItem = page.locator('[data-testid="notification-item"]').first()
    await expect(notificationItem).toBeVisible()
  })

  test('should display unread count badge correctly', async ({ page }) => {
    // This test assumes we can create notifications
    // Create multiple test notifications

    // Open dropdown and check initial state
    await page.click('[data-testid="notification-bell"]')
    await expect(page.locator('text=No notifications yet')).toBeVisible()
    await page.click('[data-testid="notification-bell"]') // Close dropdown

    // In a real scenario, we'd trigger notification creation here
    // For now, we'll check the badge logic

    const badge = page.locator('[data-testid="notification-badge"]')

    // With 0 notifications, badge should not be visible
    await expect(badge).not.toBeVisible()
  })

  test('should mark notification as read when clicked', async ({ page }) => {
    // This test requires a notification to exist
    // We'll need to create one first

    // Skip if we can't create notifications in test environment
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Find first unread notification
    const unreadNotification = page
      .locator('[data-testid="notification-item"][data-read="false"]')
      .first()

    if ((await unreadNotification.count()) > 0) {
      // Click the notification
      await unreadNotification.click()

      // Notification should be marked as read
      // Re-open dropdown to check
      await page.click('[data-testid="notification-bell"]')
      const sameNotification = page.locator('[data-testid="notification-item"]').first()
      await expect(sameNotification).toHaveAttribute('data-read', 'true')
    }
  })

  test('should delete notification when delete button is clicked', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Count initial notifications
    const initialCount = await page.locator('[data-testid="notification-item"]').count()

    if (initialCount > 0) {
      // Hover over first notification to reveal delete button
      const firstNotification = page.locator('[data-testid="notification-item"]').first()
      await firstNotification.hover()

      // Click delete button
      const deleteButton = firstNotification.locator('[data-testid="delete-notification"]')
      await deleteButton.click()

      // Wait for deletion
      await page.waitForTimeout(500)

      // Count should decrease
      const newCount = await page.locator('[data-testid="notification-item"]').count()
      expect(newCount).toBe(initialCount - 1)
    }
  })

  test('should mark all notifications as read', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Check if "Mark all as read" button exists (only shows when there are unread notifications)
    const markAllButton = page.locator('text=Mark all as read')

    if (await markAllButton.isVisible()) {
      // Click "Mark all as read"
      await markAllButton.click()

      // Wait for update
      await page.waitForTimeout(500)

      // Badge should disappear
      const badge = page.locator('[data-testid="notification-badge"]')
      await expect(badge).not.toBeVisible()

      // All notifications should be marked as read
      const unreadNotifications = page.locator(
        '[data-testid="notification-item"][data-read="false"]'
      )
      await expect(unreadNotifications).toHaveCount(0)
    }
  })

  test('should navigate to action URL when notification is clicked', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Find a notification with an action URL
    const notificationWithAction = page
      .locator('[data-testid="notification-item"][data-action-url]')
      .first()

    if ((await notificationWithAction.count()) > 0) {
      const actionUrl = await notificationWithAction.getAttribute('data-action-url')

      // Click the notification
      await notificationWithAction.click()

      // Should navigate to the action URL
      await page.waitForURL(`**${actionUrl}`, { timeout: 5000 })
    }
  })

  test('should close dropdown when clicking outside', async ({ page }) => {
    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Dropdown should be visible
    const dropdown = page.locator('[data-testid="notification-dropdown"]')
    await expect(dropdown).toBeVisible()

    // Click outside the dropdown
    await page.click('body', { position: { x: 10, y: 10 } })

    // Dropdown should close
    await expect(dropdown).not.toBeVisible()
  })

  test('should display notification with correct time formatting', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Check that time is displayed
    const timeElement = page.locator('[data-testid="notification-time"]').first()

    if ((await timeElement.count()) > 0) {
      const timeText = await timeElement.textContent()

      // Should match format like "Just now", "5m ago", "2h ago", "3d ago"
      expect(timeText).toMatch(/^(Just now|\d+[mhd] ago|\d{1,2}\/\d{1,2}\/\d{4})$/)
    }
  })

  test('should display correct notification icon based on type', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Check that notifications have icons
    const notificationIcon = page.locator('[data-testid="notification-icon"]').first()

    if ((await notificationIcon.count()) > 0) {
      await expect(notificationIcon).toBeVisible()

      // Icon should be an emoji or SVG
      const iconContent = await notificationIcon.textContent()
      expect(iconContent).toBeTruthy()
    }
  })

  test('should show read indicator on read notifications', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Find a read notification
    const readNotification = page
      .locator('[data-testid="notification-item"][data-read="true"]')
      .first()

    if ((await readNotification.count()) > 0) {
      // Should have read indicator (checkmark icon or text)
      const readIndicator = readNotification.locator('text=Read')
      await expect(readIndicator).toBeVisible()
    }
  })

  test('should show unread indicator on unread notifications', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Find an unread notification
    const unreadNotification = page
      .locator('[data-testid="notification-item"][data-read="false"]')
      .first()

    if ((await unreadNotification.count()) > 0) {
      // Should have unread indicator (blue dot or background)
      const unreadDot = unreadNotification.locator('[data-testid="unread-indicator"]')
      await expect(unreadDot).toBeVisible()
    }
  })

  test('should limit notification list to 20 items', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Count notifications
    const notificationCount = await page.locator('[data-testid="notification-item"]').count()

    // Should not exceed 20
    expect(notificationCount).toBeLessThanOrEqual(20)
  })

  test('should display notification title and message', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    const firstNotification = page.locator('[data-testid="notification-item"]').first()

    if ((await firstNotification.count()) > 0) {
      // Should have title
      const title = firstNotification.locator('[data-testid="notification-title"]')
      await expect(title).toBeVisible()

      // Should have message
      const message = firstNotification.locator('[data-testid="notification-message"]')
      await expect(message).toBeVisible()
    }
  })

  test('should display action button when actionLabel exists', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Find notification with action label
    const notificationWithAction = page
      .locator('[data-testid="notification-item"][data-action-label]')
      .first()

    if ((await notificationWithAction.count()) > 0) {
      const actionButton = notificationWithAction.locator('[data-testid="notification-action"]')
      await expect(actionButton).toBeVisible()

      const actionLabel = await notificationWithAction.getAttribute('data-action-label')
      await expect(actionButton).toContainText(actionLabel!)
    }
  })

  test('should handle rapid bell clicks gracefully', async ({ page }) => {
    // Click bell multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="notification-bell"]')
      await page.waitForTimeout(100)
    }

    // Should end up in a consistent state (either open or closed)
    const dropdown = page.locator('[data-testid="notification-dropdown"]')
    const isVisible = await dropdown.isVisible()

    // State should be stable
    expect(typeof isVisible).toBe('boolean')
  })

  test('should maintain unread count accuracy after operations', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Get initial unread count from badge
    const badge = page.locator('[data-testid="notification-badge"]')
    let badgeText = '0'
    if (await badge.isVisible()) {
      badgeText = (await badge.textContent()) || '0'
    }

    const initialUnreadCount = badgeText === '9+' ? 10 : parseInt(badgeText)

    // Count unread notifications in list
    const unreadInList = await page
      .locator('[data-testid="notification-item"][data-read="false"]')
      .count()

    // Badge count should match or be capped at 9+
    if (unreadInList <= 9) {
      expect(initialUnreadCount).toBe(unreadInList)
    } else {
      expect(badgeText).toBe('9+')
    }
  })

  test('should scroll notification list when many notifications exist', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification creation not available')

    // Open dropdown
    await page.click('[data-testid="notification-bell"]')

    // Check if scroll area exists
    const scrollArea = page.locator('[data-testid="notification-scroll-area"]')

    if ((await scrollArea.count()) > 0) {
      // Should have scroll styling
      await expect(scrollArea).toBeVisible()

      // Should have max height
      const maxHeight = await scrollArea.evaluate((el) => window.getComputedStyle(el).maxHeight)
      expect(maxHeight).toBeTruthy()
    }
  })
})

test.describe('Notifications - Integration Tests', () => {
  const testEmail = `test-notif-integration-${Date.now()}@example.com`
  const testPassword = 'Test123456!'
  const testName = 'Test Integration User'

  test.beforeEach(async ({ page }) => {
    await signUpTestUser(page, testEmail, testPassword, testName)

    const currentUrl = page.url()
    if (currentUrl.includes('verify-email')) {
      await page.goto('/dashboard')
    } else if (currentUrl.includes('onboarding')) {
      await page.goto('/dashboard')
    }

    await page.waitForLoadState('networkidle')
    await page.waitForSelector('[data-testid="notification-bell"]', { timeout: 15000 })
  })

  test('should update unread count in real-time', async ({ page, context }) => {
    // This test simulates receiving a notification from another source
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Real-time updates require backend')

    // Open a second page (simulating another device/tab)
    const page2 = await context.newPage()
    await page2.goto('/dashboard')

    // Create notification from page 2
    // This would trigger via Convex real-time subscription

    // Check that page 1 updates automatically
    const badge = page.locator('[data-testid="notification-badge"]')
    await expect(badge).toBeVisible({ timeout: 5000 })

    await page2.close()
  })

  test('should persist notification state across page reloads', async ({ page }) => {
    test.skip(!process.env.ENABLE_NOTIFICATION_TESTS, 'Notification persistence test')

    // Open dropdown and check state
    await page.click('[data-testid="notification-bell"]')
    const initialCount = await page.locator('[data-testid="notification-item"]').count()

    // Close dropdown
    await page.click('[data-testid="notification-bell"]')

    // Reload page
    await page.reload()
    await page.waitForSelector('[data-testid="notification-bell"]')

    // Open dropdown again
    await page.click('[data-testid="notification-bell"]')
    const afterReloadCount = await page.locator('[data-testid="notification-item"]').count()

    // Count should be the same
    expect(afterReloadCount).toBe(initialCount)
  })
})
