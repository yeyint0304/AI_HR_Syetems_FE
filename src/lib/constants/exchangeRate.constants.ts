import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to view/manage exchange rates. Per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`), `/admin/exchange-rates` lives under
 * the Administration sidebar section, which is restricted to SystemAdmin
 * only (`lib/constants/navigation.constants.ts`'s `requiredRole`) — unlike
 * Projects (`lib/constants/project.constants.ts`), there is no ProjectAdmin
 * carve-out here: exchange rates are global financial configuration, not
 * scoped to a single project.
 */
export const EXCHANGE_RATE_MANAGER_ROLES: readonly UserRole[] = [USER_ROLES.SYSTEM_ADMIN];

/** Returns true if the given role may view/create/update/delete exchange rates. */
export function canManageExchangeRates(role: string | null | undefined): boolean {
  if (!role) return false;
  return (EXCHANGE_RATE_MANAGER_ROLES as readonly string[]).includes(role);
}
