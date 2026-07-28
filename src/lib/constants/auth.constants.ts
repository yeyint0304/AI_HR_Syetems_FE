/**
 * Auth-related constants shared between server (Route Handlers, proxy) and
 * client code. Keeping cookie names and role identifiers centralized avoids
 * typo-driven bugs across the auth feature.
 */

/** httpOnly cookie holding the short-lived JWT access token. */
export const ACCESS_TOKEN_COOKIE = "hr_access_token";

/** httpOnly cookie holding the longer-lived opaque refresh token. */
export const REFRESH_TOKEN_COOKIE = "hr_refresh_token";

/**
 * httpOnly cookie caching the backend-issued `Username` (from the
 * `Auth/Login` / `Auth/UpdateProfile` response bodies — see
 * `docs/HR_System_BE.postman_collection.json`'s saved examples). The real
 * backend's access-token JWT never carries a username claim (only
 * `sub`/`email`/`name` — see `lib/utils/jwt.ts`'s `CLAIM_KEYS` doc comment),
 * so this is the only reliable source for `AuthUser.username` when talking to
 * the real backend. Not security-sensitive (a username is not a secret) —
 * kept httpOnly/Secure/SameSite=Strict purely for consistency with the token
 * cookies, and cleared alongside them on logout (`clearAuthCookies`).
 */
export const USERNAME_COOKIE = "hr_username";

/**
 * Roles as defined by the backend. Per `Auth/GetRoles`'s saved "200 - Success"
 * example in `docs/HR_System_BE.postman_collection.json`, the backend only
 * ever issues exactly these three role names — `SystemAdmin`, `ProjectAdmin`,
 * and `Employee` (the base, non-admin role; there is no `User` or `Guest`
 * role on the backend, despite the generic Technical Requirements doc's
 * mention of them) — and the role claim embedded in the JWT
 * (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`) uses the
 * same three values. Kept as a const object (rather than a TS `enum`) so the
 * values can be safely used for both type-checking and runtime comparisons
 * against decoded JWT claims.
 */
export const USER_ROLES = {
  SYSTEM_ADMIN: "SystemAdmin",
  PROJECT_ADMIN: "ProjectAdmin",
  EMPLOYEE: "Employee",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Fallback lifetime (in seconds) used when a token's expiry can't be derived. */
export const DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes
export const DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Public (unauthenticated) routes the proxy must never guard. */
export const PUBLIC_ROUTES = ["/login"];

/** Route prefix reserved for SystemAdmin-only screens. */
export const ADMIN_ROUTE_PREFIX = "/admin";

/**
 * Default page size requested per fetch for the scroll-paginated "User"
 * combobox on the Project Assignments screen
 * (`GET /api/auth/unassigned-users`, `hooks/useAuth.ts#useUnassignedUsersInfinite`).
 * Kept small since each additional page is only fetched on scroll-to-bottom.
 */
export const UNASSIGNED_USERS_PAGE_SIZE = 20;
