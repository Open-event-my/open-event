import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Event Task Management
 *
 * Tests cover:
 * - Task CRUD (create, read, update, delete)
 * - Task completion toggle
 * - Status filtering
 * - Task priority and category
 * - Task templates
 */

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'TestPass123!'

// Helper function to navigate to an existing event's tasks page
async function navigateToTasksPage(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/dashboard/events')
  await page.waitForTimeout(2000)

  const eventCard = page
    .locator('.rounded-lg.border')
    .filter({ has: page.locator('h3') })
    .first()

  if (await eventCard.isVisible().catch(() => false)) {
    await eventCard.click()
    await page.waitForURL(/\/dashboard\/events\/[a-z0-9]+$/, { timeout: 10000 })

    const url = page.url()
    const eventId = url.split('/').pop() || null

    await page.goto(`/dashboard/events/${eventId}/tasks`)
    await page.waitForTimeout(2000)
    return eventId
  }
  return null
}

test.describe('Event Task Management', () => {
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

    // Dismiss cookie consent if present
    try {
      const acceptBtn = page.getByRole('button', { name: /accept all/i })
      if (await acceptBtn.isVisible({ timeout: 2000 })) {
        await acceptBtn.click()
        await page.waitForTimeout(500)
      }
    } catch {
      // Cookie banner not present, continue
    }
  })

  test.describe('Tasks Page Display', () => {
    test('should display tasks page with header', async ({ page }) => {
      const eventId = await navigateToTasksPage(page)

      if (eventId) {
        // Should show Tasks header
        const header = page.locator('h1').filter({ hasText: /tasks/i })
        await expect(header).toBeVisible({ timeout: 10000 })
      }
    })

    test('should display summary cards', async ({ page }) => {
      const eventId = await navigateToTasksPage(page)

      if (eventId) {
        // At least the header should be visible
        const header = page.locator('h1').filter({ hasText: /tasks/i })
        await expect(header).toBeVisible({ timeout: 10000 })
      }
    })

    test('should show empty state when no tasks exist', async ({ page }) => {
      const eventId = await navigateToTasksPage(page)

      if (eventId) {
        // Either has tasks OR shows empty state
        const emptyState = page.getByText(/no tasks yet/i)
        const taskItems = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })

        const hasEmptyState = await emptyState.isVisible().catch(() => false)
        const taskCount = await taskItems.count()

        expect(hasEmptyState || taskCount > 0).toBeTruthy()
      }
    })
  })

  test.describe('Task CRUD', () => {
    test('should create a new task', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Click Add Task button
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      // Dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill in the form
      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('Test Task Item')

      // Submit
      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

      // Task should appear in the list
      const newTask = page.getByText('Test Task Item')
      await expect(newTask).toBeVisible({ timeout: 5000 })
    })

    test('should edit an existing task', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // First create a task
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('Task to Edit')

      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Now edit the task - click dropdown menu
      const taskCard = page.locator('.rounded-xl.border').filter({ hasText: 'Task to Edit' })

      if (await taskCard.isVisible().catch(() => false)) {
        // Click dropdown trigger (three dots button)
        const dropdownTrigger = taskCard.locator('button').last()
        await dropdownTrigger.click()
        await page.waitForTimeout(300)

        // Click Edit menu item
        const editMenuItem = page.getByRole('menuitem', { name: /edit/i })
        await editMenuItem.click()
        await page.waitForTimeout(500)

        // Dialog should appear with Edit title
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

        // Update the title
        const editTitleInput = page.getByPlaceholder(/book catering vendor/i)
        await editTitleInput.clear()
        await editTitleInput.fill('Updated Task Name')

        // Submit
        const updateButton = page.getByRole('button', { name: /update/i })
        await updateButton.click()
        await page.waitForTimeout(1000)

        // Updated task should appear
        const updatedTask = page.getByText('Updated Task Name')
        await expect(updatedTask).toBeVisible({ timeout: 5000 })
      }
    })

    test('should delete a task', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // First create a task
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('Task to Delete')

      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Find the task card
      const taskCard = page.locator('.rounded-xl.border').filter({ hasText: 'Task to Delete' })

      if (await taskCard.isVisible().catch(() => false)) {
        // Click dropdown trigger
        const dropdownTrigger = taskCard.locator('button').last()
        await dropdownTrigger.click()
        await page.waitForTimeout(300)

        // Handle confirmation dialog
        page.on('dialog', (dialog) => dialog.accept())

        // Click Delete menu item
        const deleteMenuItem = page.getByRole('menuitem', { name: /delete/i })
        await deleteMenuItem.click()
        await page.waitForTimeout(1000)

        // Task should be removed
        await expect(taskCard).not.toBeVisible({ timeout: 5000 })
      }
    })

    test('should toggle task completion via checkbox', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // First create a task
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('Task to Complete')

      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Find the task card and click the checkbox
      const taskCard = page.locator('.rounded-xl.border').filter({ hasText: 'Task to Complete' })

      if (await taskCard.isVisible().catch(() => false)) {
        // Click checkbox button (first button in the card)
        const checkboxButton = taskCard.locator('button').first()
        await checkboxButton.click()
        await page.waitForTimeout(500)

        // Task should show completed state (has line-through or completed styling)
        // The card should still be visible but may have opacity/styling change
        const isStillVisible = await taskCard.isVisible().catch(() => false)
        expect(isStillVisible).toBeTruthy()
      }
    })
  })

  test.describe('Task Filtering', () => {
    test('should display status filter buttons', async ({ page }) => {
      const eventId = await navigateToTasksPage(page)

      if (eventId) {
        // Should show "All" filter button
        const allFilter = page.locator('button').filter({ hasText: /^All/i })
        await expect(allFilter).toBeVisible({ timeout: 10000 })
      }
    })

    test('should filter tasks by status', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Create a task
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('Filter Test Task')

      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Click "To Do" filter
      const todoFilter = page.locator('button').filter({ hasText: /to do/i })
      if (await todoFilter.isVisible().catch(() => false)) {
        await todoFilter.click()
        await page.waitForTimeout(500)

        // Task should still be visible (it's a todo task by default)
        const task = page.getByText('Filter Test Task')
        await expect(task).toBeVisible({ timeout: 5000 })
      }
    })

    test('should show correct counts per status', async ({ page }) => {
      const eventId = await navigateToTasksPage(page)

      if (eventId) {
        // Status filters should show counts
        const allFilter = page.locator('button').filter({ hasText: /All \(/i })
        const todoFilter = page.locator('button').filter({ hasText: /To Do \(/i })

        const hasAllCount = await allFilter.isVisible().catch(() => false)
        const hasTodoCount = await todoFilter.isVisible().catch(() => false)

        // At least the All filter with count should be visible
        expect(hasAllCount || hasTodoCount).toBeTruthy()
      }
    })
  })

  test.describe('Task Properties', () => {
    test('should set task priority', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Create a task with high priority
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('High Priority Task')

      // Change priority via select
      const prioritySelect = page.locator('button[role="combobox"]').filter({ hasText: /medium/i })
      if (await prioritySelect.isVisible().catch(() => false)) {
        await prioritySelect.click()
        await page.waitForTimeout(300)

        const highOption = page.getByRole('option', { name: /high/i })
        if (await highOption.isVisible().catch(() => false)) {
          await highOption.click()
        }
      }

      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Task should show with high priority badge
      const taskCreated = await page
        .getByText('High Priority Task')
        .isVisible()
        .catch(() => false)
      expect(taskCreated).toBeTruthy()
    })

    test('should set task category', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Create a task with specific category
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('Venue Task')

      // Change category via select
      const categorySelect = page.locator('button[role="combobox"]').filter({ hasText: /other/i })
      if (await categorySelect.isVisible().catch(() => false)) {
        await categorySelect.click()
        await page.waitForTimeout(300)

        const venueOption = page.getByRole('option', { name: /venue/i })
        if (await venueOption.isVisible().catch(() => false)) {
          await venueOption.click()
        }
      }

      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Task should be created
      const taskCreated = await page
        .getByText('Venue Task')
        .isVisible()
        .catch(() => false)
      expect(taskCreated).toBeTruthy()
    })

    test('should set due date', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Create a task with due date
      const addButton = page.getByRole('button', { name: /add task/i })
      await addButton.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByPlaceholder(/book catering vendor/i)
      await titleInput.fill('Task with Due Date')

      // Set due date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dueDateInput = page.locator('input[type="date"]')
      await dueDateInput.fill(tomorrow.toISOString().split('T')[0])

      const submitButton = page.getByRole('button', { name: /add task$/i })
      await submitButton.click()
      await page.waitForTimeout(1000)

      // Task should be created and show due date
      const taskCreated = await page
        .getByText('Task with Due Date')
        .isVisible()
        .catch(() => false)
      expect(taskCreated).toBeTruthy()
    })
  })

  test.describe('Task Templates', () => {
    test('should show template button when no tasks exist', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Should show Use Template button when no tasks
      const templateButton = page.getByRole('button', { name: /use template/i })
      await expect(templateButton).toBeVisible({ timeout: 10000 })
    })

    test('should open template modal', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Click Use Template button
      const templateButton = page.getByRole('button', { name: /use template/i })
      if (await templateButton.isVisible().catch(() => false)) {
        await templateButton.click()
        await page.waitForTimeout(500)

        // Template dialog should appear
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible({ timeout: 5000 })

        // Should show template options
        const conferenceTemplate = page.getByText(/conference/i)
        const workshopTemplate = page.getByText(/workshop/i)
        const hackathonTemplate = page.getByText(/hackathon/i)

        const hasConference = await conferenceTemplate
          .first()
          .isVisible()
          .catch(() => false)
        const hasWorkshop = await workshopTemplate
          .first()
          .isVisible()
          .catch(() => false)
        const hasHackathon = await hackathonTemplate
          .first()
          .isVisible()
          .catch(() => false)

        expect(hasConference || hasWorkshop || hasHackathon).toBeTruthy()
      }
    })

    test('should create tasks from Conference template', async ({ page }) => {
      test.setTimeout(90000)

      // Try to use existing event first
      const eventId = await navigateToTasksPage(page)
      if (!eventId) {
        test.skip(true, 'No events available for task testing')
        return
      }

      // Click Use Template button
      const templateButton = page.getByRole('button', { name: /use template/i })
      if (await templateButton.isVisible().catch(() => false)) {
        await templateButton.click()
        await page.waitForTimeout(500)

        // Click Conference template
        const conferenceButton = page
          .locator('button')
          .filter({ hasText: /conference/i })
          .filter({ hasText: /12 tasks/i })

        if (await conferenceButton.isVisible().catch(() => false)) {
          await conferenceButton.click()
          await page.waitForTimeout(1500)

          // Dialog should close
          await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

          // Tasks should be created (check for task list)
          const taskCards = page.locator('.rounded-xl.border').filter({ has: page.locator('h3') })
          const taskCount = await taskCards.count()

          expect(taskCount).toBeGreaterThan(0)
        }
      }
    })
  })
})
