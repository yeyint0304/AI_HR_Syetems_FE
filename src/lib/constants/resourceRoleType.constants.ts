import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to create/update/delete resource role types. Not depicted in
 * `docs/HR_System_FE_wireframe.pdf` as its own Administration sidebar entry
 * (only Users/Currencies/Exchange Rates/Rate Cards/Countries are), but the
 * backend fully supports CRUD for this reference-data resource (see
 * `docs/HR_System_BE.postman_collection.json`'s "Reference Data - Resource
 * Role Type" folder) and it is used to populate the "Resource role" dropdown
 * on both the Project Assignments and Rate Card screens — so it is grouped
 * under Administration and gated to SystemAdmin only, matching every other
 * global reference-data module (`currency.constants.ts`, `country.constants.ts`,
 * `rateCard.constants.ts`, `exchangeRate.constants.ts`).
 *
 * Note this only gates *mutations* — `GET /api/resource-role-types`
 * intentionally stays open to any authenticated user (see
 * `app/api/resource-role-types/route.ts`), since it also backs the read-only
 * "Resource role" dropdown on the Project Assignments screen.
 */
export const RESOURCE_ROLE_TYPE_MANAGER_ROLES: readonly UserRole[] = [USER_ROLES.SYSTEM_ADMIN];

/** Returns true if the given role may create/update/delete resource role types. */
export function canManageResourceRoleTypes(role: string | null | undefined): boolean {
  if (!role) return false;
  return (RESOURCE_ROLE_TYPE_MANAGER_ROLES as readonly string[]).includes(role);
}
