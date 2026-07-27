import { USER_ROLES, type UserRole } from "@/lib/constants/auth.constants";

/**
 * Roles allowed to create/update/delete currencies. Per the wireframe
 * (`docs/HR_System_FE_wireframe.pdf`), `/admin/currencies` lives under the
 * Administration sidebar section, which is restricted to SystemAdmin only
 * (`lib/constants/navigation.constants.ts`'s `requiredRole`) — same
 * SystemAdmin-only scope as `lib/constants/exchangeRate.constants.ts` and
 * `lib/constants/rateCard.constants.ts`: currencies are global financial
 * configuration.
 *
 * Note this only gates *mutations* — `GET /api/currencies` intentionally
 * stays open to any authenticated user (see `app/api/currencies/route.ts`),
 * since it also backs the read-only "Invoice Currency" dropdown on the
 * Generate Invoice form, which any Project Admin can reach.
 */
export const CURRENCY_MANAGER_ROLES: readonly UserRole[] = [USER_ROLES.SYSTEM_ADMIN];

/** Returns true if the given role may create/update/delete currencies. */
export function canManageCurrencies(role: string | null | undefined): boolean {
  if (!role) return false;
  return (CURRENCY_MANAGER_ROLES as readonly string[]).includes(role);
}
