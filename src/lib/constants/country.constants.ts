import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to create/update/delete countries. Per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`), `/admin/countries` lives under the
 * Administration sidebar section, which is restricted to SystemAdmin only
 * (`lib/constants/navigation.constants.ts`'s `requiredRole`) — same
 * SystemAdmin-only scope as `lib/constants/currency.constants.ts`.
 *
 * Note this only gates *mutations* — `GET /api/countries` intentionally
 * stays open to any authenticated user (see `app/api/countries/route.ts`),
 * since it also backs the read-only "Country" dropdown on the Create User /
 * Update Profile / Rate Card forms.
 */
export const COUNTRY_MANAGER_ROLES: readonly UserRole[] = [USER_ROLES.SYSTEM_ADMIN];

/** Returns true if the given role may create/update/delete countries. */
export function canManageCountries(role: string | null | undefined): boolean {
  if (!role) return false;
  return (COUNTRY_MANAGER_ROLES as readonly string[]).includes(role);
}
