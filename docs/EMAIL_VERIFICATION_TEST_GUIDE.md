# Email Verification & Password Reset - Testing Guide

**Status**: Implementation Complete ✅
**Email Sending**: ⚠️ Disabled (AUTH_RESEND_KEY not configured)
**Dev Server**: http://localhost:5175

---

## Test Overview

This guide covers testing the email verification and password reset features **without actual email sending**. We'll focus on:

- UI/UX functionality
- Form validation
- Password strength indicator
- Error handling
- Navigation flows
- Token validation logic

---

## 1. Forgot Password Flow

### Test 1.1: Navigate to Forgot Password Page

**Steps:**

1. Open http://localhost:5175/forgot-password
2. Check if page loads correctly

**Expected Result:**

- ✅ Page displays "Forgot Password?" header
- ✅ Email input field is visible
- ✅ "Send Reset Link" button is present
- ✅ "Back to Sign In" link is visible
- ✅ Purple gradient branding matches app theme

**Screenshot Areas:**

- Header with envelope icon
- Email input field
- Submit button
- Back to sign in link

---

### Test 1.2: Email Validation

**Steps:**

1. Leave email field empty and click "Send Reset Link"
2. Enter invalid email: `notanemail`
3. Enter invalid email: `test@`
4. Enter invalid email: `@example.com`
5. Enter valid email: `test@example.com`

**Expected Results:**

- ✅ Empty field: Toast error "Please enter your email address"
- ✅ Invalid formats: Toast error "Please enter a valid email address"
- ✅ Valid email: Form submits (will show success state)

**Known Limitation:**

- Backend will try to send email and fail silently (error logged in console)
- Success message will still show (this is intentional for security)

---

### Test 1.3: Success State

**Steps:**

1. Enter valid email: `test@example.com`
2. Click "Send Reset Link"
3. Observe success state

**Expected Result:**

- ✅ Success checkmark (green) displayed
- ✅ Header changes to "Check Your Email"
- ✅ Shows "We've sent password reset instructions to test@example.com"
- ✅ "What to do next" instructions box visible
- ✅ "Try Different Email" button present
- ✅ "Back to Sign In" button present
- ✅ "Resend" link in footer

**Test Actions:**

- Click "Try Different Email" → Should return to form
- Click "Resend" → Should attempt to resend (shows toast)

---

## 2. Reset Password Flow

### Test 2.1: Navigate to Reset Password Page (No Token)

**Steps:**

1. Open http://localhost:5175/reset-password
2. Observe the page state

**Expected Result:**

- ✅ Page displays "Invalid Reset Link" error
- ✅ Red X icon shown
- ✅ Error message: "No reset token provided"
- ✅ "Request New Reset Link" button visible
- ✅ "Remember your password? Sign in" link present

---

### Test 2.2: Password Form UI

**Steps:**

1. Open http://localhost:5175/reset-password?token=test-token-123
2. Page will show "validating" then "invalid" (expected - token doesn't exist)

**To test the form properly, we need to manually create a valid token:**

> **Note**: For now, focus on visual inspection. We'll test validation logic separately.

**Expected UI Elements:**

- ✅ Lock key icon
- ✅ "Reset Your Password" header
- ✅ "New Password" input field with show/hide toggle
- ✅ Password strength indicator (4 bars)
- ✅ "Confirm Password" input field with show/hide toggle
- ✅ "Passwords do not match" error (when applicable)
- ✅ "Reset Password" submit button

---

### Test 2.3: Password Strength Indicator

**Steps:**

1. Type passwords of different lengths and observe the strength indicator

**Test Cases:**
| Password Length | Expected Strength | Color |
|----------------|-------------------|--------|
| Less than 8 | Weak (1/4) | Red |
| 8-11 chars | Fair (2/4) | Yellow |
| 12-15 chars | Good (3/4) | Blue |
| 16+ chars | Strong (4/4) | Green |

**Expected Behavior:**

- ✅ Strength bars update in real-time
- ✅ Color changes based on strength
- ✅ Label shows correct strength text
- ✅ All 4 bars visible (only filled ones are colored)

---

### Test 2.4: Password Validation

**Steps:**

1. In password field, type: `short`
2. In confirm field, type: `short`
3. Submit form

**Expected Result:**

- ✅ Toast error: "Password must be at least 8 characters"

**Steps:**

1. In password field, type: `password123`
2. In confirm field, type: `password456`
3. Submit form

**Expected Result:**

- ✅ Toast error: "Passwords do not match"
- ✅ Red error text under confirm field

---

### Test 2.5: Show/Hide Password Toggle

**Steps:**

1. Type password in "New Password" field
2. Click eye icon button
3. Observe password visibility
4. Click eye icon again

**Expected Result:**

- ✅ First click: Password becomes visible (text)
- ✅ Icon changes to "eye slash"
- ✅ Second click: Password becomes hidden (dots)
- ✅ Icon changes back to "eye"
- ✅ Same behavior for "Confirm Password" field

---

## 3. Email Verification Flow

### Test 3.1: Navigate to Verify Email Page (No Token)

**Steps:**

1. Open http://localhost:5175/verify-email
2. Observe error state

**Expected Result:**

- ✅ Red X icon displayed
- ✅ Header: "Verification Failed"
- ✅ Error message: "No verification token provided"
- ✅ Info box: "Need a new verification link?"
- ✅ "Go to Sign In to resend verification email" link
- ✅ "Back to Home" button
- ✅ Footer: "Having trouble? Contact support" link

---

### Test 3.2: Verify Email Page (Invalid Token)

**Steps:**

1. Open http://localhost:5175/verify-email?token=invalid-token-123
2. Page shows "verifying" loading state, then error

**Expected Result:**

- ✅ Initial state: Purple spinning icon with "Verifying your email..."
- ✅ After verification attempt: Error state with "Verification Failed"
- ✅ Error message explains the token is invalid

---

## 4. Integration with Sign Up Flow

### Test 4.1: Sign Up Triggers Email (Without Sending)

**Steps:**

1. Go to http://localhost:5175/sign-up
2. Fill in sign up form with valid data
3. Submit form
4. Check browser console (F12)

**Expected Result:**

- ✅ Sign up succeeds (user created)
- ✅ Session token received
- ✅ User redirected to onboarding/dashboard
- ✅ Console shows error about email sending (expected - no API key)
- ✅ Error is non-blocking (signup still works)

**Console Expected Error:**

```
Failed to send verification email: [error details]
```

---

## 5. Responsive Design Testing

### Test 5.1: Mobile Responsiveness

**Steps:**

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test at different viewport sizes:
   - Mobile: 375px × 667px (iPhone SE)
   - Tablet: 768px × 1024px (iPad)
   - Desktop: 1920px × 1080px

**Pages to Test:**

- /forgot-password
- /reset-password
- /verify-email

**Expected Result:**

- ✅ All pages are fully responsive
- ✅ Forms remain centered
- ✅ Text is readable at all sizes
- ✅ Buttons are tap-friendly on mobile (min 44px height)
- ✅ No horizontal scrolling

---

## 6. Dark Mode Testing

### Test 6.1: Dark Mode Toggle

**Steps:**

1. Open any of the auth pages
2. Toggle dark mode (system theme or manually)
3. Observe color changes

**Expected Result:**

- ✅ Background changes from light to dark
- ✅ Text remains readable (sufficient contrast)
- ✅ Input fields adapt to dark theme
- ✅ Icons remain visible
- ✅ Gradient headers look good in both modes
- ✅ No white flashes or broken styling

---

## 7. Navigation Testing

### Test 7.1: Internal Navigation Links

**Test all navigation links:**

**From Forgot Password:**

- ✅ "Back to Sign In" → /sign-in
- ✅ "Request New Reset Link" → /forgot-password (error state)
- ✅ "Back to Sign In" → /sign-in (success state)

**From Reset Password:**

- ✅ "Request New Reset Link" → /forgot-password (invalid token)
- ✅ "Sign in" → /sign-in (footer link)
- ✅ "Go to Sign In" → /sign-in (success state)

**From Verify Email:**

- ✅ "Go to Sign In" → /sign-in (error state)
- ✅ "Back to Home" → / (error state)
- ✅ "Sign In" → /sign-in (already verified state)
- ✅ "Go to Dashboard" → /dashboard (success state)

---

## 8. Accessibility Testing

### Test 8.1: Keyboard Navigation

**Steps:**

1. Open /forgot-password
2. Use Tab key to navigate through elements
3. Use Enter to submit form
4. Use Escape (if applicable)

**Expected Result:**

- ✅ All interactive elements are focusable
- ✅ Focus indicator is visible
- ✅ Tab order is logical (top to bottom)
- ✅ Enter submits forms
- ✅ Buttons can be activated with Space or Enter

---

### Test 8.2: Screen Reader Labels

**Steps:**

1. Inspect form elements in DevTools
2. Check for proper labels and ARIA attributes

**Expected Result:**

- ✅ All input fields have `<label>` elements
- ✅ Labels have `htmlFor` attribute matching input `id`
- ✅ Buttons have descriptive text
- ✅ Error messages are associated with inputs
- ✅ Loading states have `aria-busy` or similar

---

## 9. Error Handling Testing

### Test 9.1: Rate Limiting (Backend)

**Note:** This requires Convex to be running with the backend functions deployed.

**Steps:**

1. Request password reset for same email 4 times quickly
2. Observe response

**Expected Result:**

- ✅ First 3 requests succeed
- ✅ 4th request fails with "Too many password reset requests. Please try again later."
- ✅ Toast error displayed

---

### Test 9.2: Network Error Simulation

**Steps:**

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to submit forgot password form

**Expected Result:**

- ✅ Request fails
- ✅ Toast error shown with network error message
- ✅ Form re-enables (not stuck in loading state)
- ✅ User can retry

---

## 10. Manual Backend Testing (with Convex Console)

### Test 10.1: Token Creation

**Steps:**

1. Open Convex Dashboard: https://giddy-reindeer-109.convex.cloud
2. Go to "Data" tab
3. Select "verificationTokens" table
4. Manually insert a test token:

```json
{
  "userId": "[existing-user-id]",
  "token": "test-reset-token-123",
  "type": "password_reset",
  "expiresAt": [timestamp 1 hour from now],
  "used": false,
  "createdAt": [current timestamp]
}
```

5. Navigate to: http://localhost:5175/reset-password?token=test-reset-token-123
6. Should show password reset form

**Expected Result:**

- ✅ Token validates successfully
- ✅ Form displays
- ✅ Can submit new password
- ✅ Token marked as "used" after submission

---

## Known Limitations (Email Sending Disabled)

1. ❌ **No actual emails sent** - AUTH_RESEND_KEY not configured
2. ⚠️ **Success messages shown anyway** - This is intentional (security best practice)
3. ⚠️ **Console errors about email** - Expected, non-blocking
4. ⚠️ **Can't test full flow** - Need to manually create tokens in database

---

## Test Results Summary

Use this checklist to track your testing progress:

### UI Components

- [ ] Forgot Password page renders correctly
- [ ] Reset Password page renders correctly
- [ ] Verify Email page renders correctly
- [ ] All icons display properly
- [ ] Gradients and styling match design

### Form Validation

- [ ] Email validation works
- [ ] Password length validation works
- [ ] Password match validation works
- [ ] Empty field validation works
- [ ] Form shows loading states

### Password Strength

- [ ] Indicator updates in real-time
- [ ] Correct colors for each level
- [ ] Correct labels (Weak/Fair/Good/Strong)

### Navigation

- [ ] All links navigate correctly
- [ ] Back buttons work
- [ ] Success redirects work (after delay)

### Responsive Design

- [ ] Mobile layout works
- [ ] Tablet layout works
- [ ] Desktop layout works

### Dark Mode

- [ ] All pages work in dark mode
- [ ] Colors have sufficient contrast
- [ ] No visual glitches

### Accessibility

- [ ] Keyboard navigation works
- [ ] Form labels are proper
- [ ] Focus indicators visible

---

## Next Steps

After completing these tests:

1. **Configure Resend API Key** to enable actual email sending
2. **Test full email flow** end-to-end
3. **Set up email templates** customization
4. **Add email tracking** (opened, clicked, etc.)
5. **Implement email verification badge** in user profile
6. **Add "resend verification email"** functionality in settings

---

## Questions or Issues?

If you encounter any issues during testing, check:

1. Browser console for errors (F12)
2. Convex logs for backend errors
3. Network tab for failed requests

**Report issues with:**

- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser and OS version
