import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useOrganization } from "@/contexts/OrganizationContext";

export type OrganizationRole = "owner" | "admin" | "manager" | "member" | "viewer";

// Role hierarchy values match backend (convex/organizations.ts)
const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

export function useOrganizationRole() {
  const { organization } = useOrganization();
  
  // Fetch the current user's role in the organization from our backend
  // We use the backend source of truth to ensure consistency
  // with our internal permission logic
  const userRoleData = useQuery(api.organizations.getMyRole, 
    organization?.id ? { orgId: organization.id } : "skip"
  );

  const role = (userRoleData?.role || "viewer") as OrganizationRole;
  const roleValue = ROLE_HIERARCHY[role] || 0;

  return {
    role,
    isLoading: userRoleData === undefined,
    // Helper checks
    isOwner: role === "owner",
    isAdmin: roleValue >= ROLE_HIERARCHY.admin,     // Admin or Owner
    isManager: roleValue >= ROLE_HIERARCHY.manager, // Manager, Admin, or Owner
    isMember: roleValue >= ROLE_HIERARCHY.member,   // Member or higher
    // Specific capability checks
    canManageEvents: roleValue >= ROLE_HIERARCHY.manager,
    canManageMembers: roleValue >= ROLE_HIERARCHY.admin,
    canManageBilling: roleValue >= ROLE_HIERARCHY.owner,
  };
}
