import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to view/manage rate cards. Per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`), `/admin/rate-cards` lives under the
 * Administration sidebar section, which is restricted to SystemAdmin only
 * (`lib/constants/navigation.constants.ts`'s `requiredRole`) — same
 * SystemAdmin-only scope as `lib/constants/exchangeRate.constants.ts`: rate
 * cards are global financial configuration (used in cost/invoice
 * calculations), not scoped to a single project like `PROJECT_MANAGER_ROLES`.
 */
export const RATE_CARD_MANAGER_ROLES: readonly UserRole[] = [USER_ROLES.SYSTEM_ADMIN];

/** Returns true if the given role may view/create/update/delete rate cards. */
export function canManageRateCards(role: string | null | undefined): boolean {
  if (!role) return false;
  return (RATE_CARD_MANAGER_ROLES as readonly string[]).includes(role);
}
