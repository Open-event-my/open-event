I will refactor the codebase to implement a robust, centralized organization creation flow that fixes the issue while adhering to clean architecture principles.

### **The Core Issue**

The previous fix duplicated logic (slug generation, organization creation) into `organizerProfiles.ts`. This violates the **Single Responsibility Principle** and creates two "sources of truth" for how an organization is created. If the logic in `organizations.ts` changes (e.g., new default settings, different plan limits), `organizerProfiles.ts` would become outdated/buggy.

### **The "Excellent" Solution**

I will extract the organization creation logic into a reusable domain helper. This ensures that whether a user creates an organization via the "Create" button or via "Onboarding", the exact same rigorous logic (slug uniqueness, validation, member initialization) is executed.

### **Plan of Action**

1. **Refactor** **`convex/organizations.ts`**
   - Extract the core creation logic (slug generation, uniqueness checks, DB inserts) into a reusable exported async function `createOrganizationInternal`.

   - Update the existing public `create` mutation to use this new helper.

   - This centralizes the business logic for "What makes a valid Organization".

2. **Update** **`convex/organizerProfiles.ts`**
   - Remove the duplicated logic I previously added.

   - Import and call `createOrganizationInternal` directly.

   - Implement a smart check: Only create a new organization if the user doesn't already own one.

3. **Benefits**
   - **Robustness**: Slug generation and unique checks are consistent system-wide.

   - **Maintainability**: Any future changes to organization structure only need to happen in one place.

   - **UX**: Users seamlessly get their organization and "Owner" role assigned during onboarding without friction.

### **Verification**

- I will verify that `saveProfile` successfully creates both the profile and the organization.

- I will ensure the public `createOrganization` mutation still works as expected.
