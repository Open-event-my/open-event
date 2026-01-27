Based on the codebase analysis, **yes, it is true**. There is a mandatory onboarding flow for new users when they sign up for the first time.

### Current Implementation Details

1.  **Trigger on Sign Up**:
    - In `src/pages/auth/SignUp.tsx`, after a successful account creation, the user is explicitly navigated to the onboarding page:
      ```typescript
      // src/pages/auth/SignUp.tsx
      navigate('/onboarding')
      ```

2.  **Enforcement (Auth Guard)**:
    - In `src/components/auth/AuthRedirect.tsx`, the system checks if the user has an existing `organizerProfile`.
    - If the user is authenticated but **does not** have a profile (which is the case for a new user), they are automatically redirected to `/onboarding`, blocking access to the dashboard.
    - Once onboarding is complete, an `organizerProfile` is created, and they are allowed into the dashboard.

3.  **Onboarding Questions**:
    - The onboarding process is defined in `src/pages/onboarding/Onboarding.tsx` and consists of 7 steps/questions:
        1.  **Role**: User's primary role (Organizer, Sponsor, etc.)
        2.  **Organization**: Name and type of organization.
        3.  **EventTypes**: Types of events organized.
        4.  **EventScale**: Size of events.
        5.  **Goals**: Goals with the platform.
        6.  **Experience**: Experience level.
        7.  **Referral**: How they found the platform.

### Conclusion
The codebase is currently designed to force new users through these onboarding questions before they can use the application.

**Do you want to keep this flow, or would you like to modify/remove it?**