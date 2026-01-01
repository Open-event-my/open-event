# Notifications System - E2E Testing Guide

> **Created**: 2025-12-21
> **Test Framework**: Playwright
> **Test File**: `e2e/notifications.spec.ts`

---

## 📋 Overview

This guide covers end-to-end testing for the Notifications System. The tests verify all user-facing functionality including the notification bell, dropdown, list, and interactions.

---

## 🧪 Test Coverage

### Core Functionality Tests (22 tests)

#### 1. **Notification Bell Display**

- ✅ Bell icon is visible in top bar
- ✅ Bell is clickable button
- ✅ Bell has proper accessibility attributes

#### 2. **Unread Count Badge**

- ✅ Badge hidden when no unread notifications
- ✅ Badge shows correct count (1-9)
- ✅ Badge shows "9+" when more than 9 unread
- ✅ Badge updates in real-time

#### 3. **Notification Dropdown**

- ✅ Opens when bell is clicked
- ✅ Closes when clicking outside
- ✅ Shows "Notifications" title
- ✅ Shows "Mark all as read" when unread exist

#### 4. **Empty State**

- ✅ Shows "No notifications yet" message
- ✅ Shows helper text when empty

#### 5. **Notification List**

- ✅ Displays notifications (max 20)
- ✅ Shows notification title and message
- ✅ Shows notification icon based on type
- ✅ Shows time ago formatting
- ✅ Scrollable when many notifications

#### 6. **Read/Unread Status**

- ✅ Unread notifications have blue background
- ✅ Unread dot indicator visible
- ✅ Read indicator shows on read notifications
- ✅ Marking as read removes unread styling

#### 7. **Mark as Read**

- ✅ Single notification marked on click
- ✅ "Mark all as read" clears all unread
- ✅ Badge disappears after marking all read
- ✅ Read status persists

#### 8. **Delete Notifications**

- ✅ Delete button appears on hover
- ✅ Individual notification can be deleted
- ✅ Count updates after deletion

#### 9. **Navigation**

- ✅ Clicking notification navigates to action URL
- ✅ Dropdown closes after navigation
- ✅ Action button shows when actionLabel exists

#### 10. **Real-time Updates**

- ✅ New notifications appear automatically
- ✅ Unread count updates without refresh

#### 11. **Persistence**

- ✅ Notifications persist across page reloads
- ✅ Read status persists

---

## 🏗️ Test Structure

### Test Organization

```typescript
describe('Notifications System', () => {
  // Basic UI tests
  test('should display notification bell')
  test('should show unread badge')
  test('should open dropdown')

  // Functionality tests
  test('should mark as read')
  test('should delete notification')
  test('should navigate on click')

  // ...
})

describe('Notifications - Integration Tests', () => {
  // Real-time and persistence tests
  test('should update in real-time')
  test('should persist across reloads')
})
```

---

## 🔧 Test IDs (data-testid)

### Component Test IDs

| Element              | Test ID                    | Description                         |
| -------------------- | -------------------------- | ----------------------------------- |
| Bell Button          | `notification-bell`        | Main notification bell button       |
| Unread Badge         | `notification-badge`       | Red badge with unread count         |
| Dropdown             | `notification-dropdown`    | Notification list dropdown          |
| Mark All Button      | `mark-all-read`            | Button to mark all as read          |
| Scroll Area          | `notification-scroll-area` | Scrollable list container           |
| Notification Item    | `notification-item`        | Individual notification             |
| Unread Indicator     | `unread-indicator`         | Blue dot on unread items            |
| Notification Icon    | `notification-icon`        | Emoji/icon for notification type    |
| Notification Title   | `notification-title`       | Notification title text             |
| Notification Message | `notification-message`     | Notification message text           |
| Notification Time    | `notification-time`        | Time ago display                    |
| Notification Action  | `notification-action`      | Action button/link                  |
| Delete Button        | `delete-notification`      | Delete notification button          |
| Test Helper Button   | `create-test-notification` | Create test notification (dev only) |

### Data Attributes

Notification items also have these data attributes for testing:

```typescript
data-read="true|false"          // Read status
data-action-url="/path"         // Action URL if exists
data-action-label="View Event"  // Action label if exists
data-notification-type="vendor_application" // Type
```

---

## 🚀 Running Tests

### Run All Notification Tests

```bash
npx playwright test e2e/notifications.spec.ts
```

### Run in UI Mode (Recommended for Development)

```bash
npx playwright test e2e/notifications.spec.ts --ui
```

### Run Specific Test

```bash
npx playwright test e2e/notifications.spec.ts -g "should display notification bell"
```

### Run in Debug Mode

```bash
npx playwright test e2e/notifications.spec.ts --debug
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test e2e/notifications.spec.ts --headed
```

---

## 🎯 Test Prerequisites

### Environment Setup

1. **Start Development Server**

   ```bash
   npm run dev
   ```

2. **Start Convex Backend**

   ```bash
   npx convex dev
   ```

3. **Environment Variables**
   - Set `ENABLE_NOTIFICATION_TESTS=true` to run tests that require notification creation
   - Otherwise, those tests will be skipped

### Test Data

Tests create their own test users with unique emails:

```typescript
const testEmail = `test-notifications-${Date.now()}@example.com`
```

This ensures tests don't conflict with existing data.

---

## 🧩 Test Helper Component

### NotificationTestHelper

A floating button appears in the bottom-right corner of the dashboard (development only) to manually create test notifications.

**Features:**

- ✅ Only visible in development/localhost
- ✅ Creates random test notification on click
- ✅ Shows toast feedback
- ✅ Has test ID for E2E tests

**Usage in Tests:**

```typescript
// Click the test helper to create a notification
await page.click('[data-testid="create-test-notification"]')

// Wait for notification to appear
await page.waitForSelector('[data-testid="notification-item"]')
```

**Manual Testing:**

1. Navigate to `/dashboard`
2. Look for floating button in bottom-right
3. Click to create test notification
4. Check notification bell for new notification

---

## 📝 Writing New Tests

### Test Template

```typescript
test('should do something with notifications', async ({ page }) => {
  // 1. Setup - Sign in
  await signIn(page, testEmail, testPassword)
  await page.goto('/dashboard')

  // 2. Create test data (if needed)
  await page.click('[data-testid="create-test-notification"]')

  // 3. Perform action
  await page.click('[data-testid="notification-bell"]')

  // 4. Assert expectations
  const notification = page.locator('[data-testid="notification-item"]').first()
  await expect(notification).toBeVisible()
})
```

### Best Practices

1. **Use Test IDs** - Always use `data-testid` for selectors
2. **Wait for Elements** - Use `waitForSelector` or `expect().toBeVisible()`
3. **Isolate Tests** - Each test should create its own data
4. **Clean Up** - Tests auto-clean up with unique test users
5. **Descriptive Names** - Use clear, descriptive test names
6. **Test One Thing** - Each test should verify one specific behavior

---

## 🐛 Debugging Tests

### Common Issues

#### 1. **Notification Bell Not Found**

```
Error: Locator '[data-testid="notification-bell"]' not found
```

**Solution**: Ensure you're signed in and on the dashboard

```typescript
await signIn(page, testEmail, testPassword)
await page.waitForSelector('[data-testid="notification-bell"]')
```

#### 2. **No Notifications in List**

```
Error: expected element to be visible
```

**Solution**: Create test notification first

```typescript
await page.click('[data-testid="create-test-notification"]')
await page.waitForTimeout(1000) // Wait for creation
```

#### 3. **Tests Skipped**

```
Skip reason: Notification creation not available
```

**Solution**: Set environment variable

```bash
ENABLE_NOTIFICATION_TESTS=true npx playwright test
```

### Debug Mode

Run with `--debug` to step through tests:

```bash
npx playwright test e2e/notifications.spec.ts --debug
```

### Screenshots on Failure

Playwright automatically captures screenshots on test failure:

```
test-results/
  notifications-should-display-notification-bell/
    test-failed-1.png
```

### Trace Viewer

View detailed trace of test execution:

```bash
npx playwright show-trace trace.zip
```

---

## 📊 Test Metrics

### Expected Results

- **Total Tests**: 22 core + 2 integration = 24 tests
- **Test Duration**: ~30-45 seconds (with test data creation)
- **Pass Rate Target**: 100%
- **Coverage**: Core user flows and edge cases

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Notification E2E Tests
  run: |
    npm run dev &
    npx convex dev &
    sleep 10 # Wait for servers to start
    ENABLE_NOTIFICATION_TESTS=true npx playwright test e2e/notifications.spec.ts
```

---

## 🔄 Test Maintenance

### When to Update Tests

Update tests when:

- ✅ UI changes (new components, styling)
- ✅ New notification types added
- ✅ Behavior changes (e.g., limit changed from 20 to 50)
- ✅ New features added (e.g., notification preferences)

### Test Hygiene

- 🧹 Remove obsolete tests
- 📝 Keep test names descriptive
- 🔧 Refactor helper functions
- 📊 Monitor test performance
- 🐛 Fix flaky tests immediately

---

## 🎓 Example Test Scenarios

### Scenario 1: New User Experience

```typescript
test('new user should see empty state', async ({ page }) => {
  // Sign up new user
  await signUpTestUser(page, email, password, name)

  // Navigate to dashboard
  await page.goto('/dashboard')

  // Open notifications
  await page.click('[data-testid="notification-bell"]')

  // Should see empty state
  await expect(page.locator('text=No notifications yet')).toBeVisible()
})
```

### Scenario 2: Vendor Application Notification

```typescript
test('organizer receives notification for vendor application', async ({ page }) => {
  // This would require triggering a vendor application
  // which creates a notification via the backend trigger

  // For now, use test helper
  await page.click('[data-testid="create-test-notification"]')

  // Verify notification appears
  const badge = page.locator('[data-testid="notification-badge"]')
  await expect(badge).toBeVisible()
})
```

### Scenario 3: Mark All as Read Flow

```typescript
test('user can mark all notifications as read', async ({ page }) => {
  // Create multiple test notifications
  for (let i = 0; i < 3; i++) {
    await page.click('[data-testid="create-test-notification"]')
    await page.waitForTimeout(500)
  }

  // Open dropdown
  await page.click('[data-testid="notification-bell"]')

  // Click mark all as read
  await page.click('[data-testid="mark-all-read"]')

  // Badge should disappear
  const badge = page.locator('[data-testid="notification-badge"]')
  await expect(badge).not.toBeVisible()
})
```

---

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Selectors](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

## ✅ Checklist for New Notification Features

When adding a new notification feature:

- [ ] Add appropriate test IDs to components
- [ ] Write E2E test for the new feature
- [ ] Update this documentation
- [ ] Test in both light and dark mode
- [ ] Test on mobile viewport
- [ ] Verify accessibility (screen reader, keyboard nav)
- [ ] Check real-time updates work
- [ ] Verify persistence across reloads

---

**Last Updated**: 2025-12-21
**Maintainer**: Development Team
**Test Framework**: Playwright 1.40+
