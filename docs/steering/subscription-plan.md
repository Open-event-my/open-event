# Subscription & Team Management Implementation Plan

## 1. Plan Definitions (The "Hook" Strategy)

We will implement a tiered subscription model designed to let users start for free ("The Hook") and upgrade as they grow.

| Feature           | **Free Plan** ("Solo") | **Pro Plan** ("Growth") | **Business Plan** ("Scale") |
| :---------------- | :--------------------- | :---------------------- | :-------------------------- |
| **Active Events** | 1 Event                | Unlimited               | Unlimited                   |
| **Team Size**     | **1 Person** (You)     | **Up to 5 People**      | **Up to 20 People**         |
| **AI Usage**      | Limited (10/day)       | Unlimited               | Unlimited                   |
| **Support**       | Community              | Email                   | Priority                    |

---

## 2. Backend Implementation (Convex)

### A. Configuration

- [ ] Create `convex/config/plans.ts` to store plan limits as constants.
  - This allows us to easily tweak limits (e.g., change Free team size to 2) without hunting through code.

### B. Enforcement Logic

- [x] **Team Size Enforcement** (`convex/organizations.ts`):
  - Modify `inviteMember` mutation.
  - Check current count (Active Members + Pending Invites).
  - Throw error if `count >= planLimit`.
- [x] **Event Limit Enforcement** (`convex/events.ts`):
  - Modify `createEvent` mutation.
  - Count "Active" (non-cancelled, non-completed) events.
  - Throw error if `activeEvents >= planLimit`.
- [x] **AI Usage Enforcement** (`convex/aiUsage.ts`):
  - Track daily prompts per user/org.
  - Block request if `todayCount >= planLimit`.
  - _Note: Updated to respect Organization Plan limits._

### C. Subscription Handling

- [ ] Create `convex/subscriptions.ts`:
  - `createCheckoutSession`: Initialize Stripe checkout for Pro/Business.
  - `createPortalSession`: Allow users to manage billing.
- [ ] Update `convex/stripe.ts`:
  - Handle webhooks: `customer.subscription.created`, `updated`, `deleted`.
  - Update organization `plan` field in database based on Stripe status.

---

## 3. Frontend Implementation (React)

### A. Organization Settings

- [x] **Billing Tab**:
  - Show current plan.
  - Show usage (e.g., "Events: 1/1", "Team: 1/1").
  - "Upgrade" buttons for Pro/Business.
- [x] **Team Management UI**:
  - Add "Seats Used" counter.
  - Disable "Invite" button if limit reached.
  - Add tooltip: _"Upgrade to Pro to invite more members."_

### B. Upgrade Prompts (The "Upsell")

- [x] **Create Event Modal**:
  - If limit reached, replace form with "Upgrade to create more events" message.
- [ ] **AI Chat**:
  - If limit reached, show "You've used your daily free AI credits. Upgrade for unlimited."

---

## 4. Role-Based Access Control (RBAC) Improvements

To make the "Team" feature valuable, roles must be meaningful.

- [x] **Viewer Role**: Ensure they can _only_ read data (hide "Edit" buttons).
- [x] **Manager Role**: Can edit events but _cannot_ delete the org or change billing.
- [x] **Admin/Owner**: Full access.

---

## 5. Next Steps

1.  **Define Plans in Code**: Create the config file.
2.  **Enforce Team Limits**: Update the `inviteMember` function.
3.  **Update UI**: Show the limits to the user.
