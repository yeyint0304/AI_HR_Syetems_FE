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
 * httpOnly cookie holding the signed-in user's `username`.
 *
 * The real backend's access-token JWT (see the saved `Auth/Login` example in
 * `docs/HR_System_BE.postman_collection.json`) carries no `username` claim at
 * all — only `sub`/`email`/a combined `name` (display name) claim — so
 * `lib/utils/jwt.ts#mapClaimsToAuthUser` can never recover a `username` from
 * the JWT alone on the real backend. `Auth/Login` and `Auth/UpdateProfile`
 * responses *do* include `Username` directly in their body, though, so this
 * cookie caches that value (set at login/profile-update) purely for display
 * purposes (Sidebar/Topbar "who am I" card, the Profile page's read-only
 * Username field) — it plays no role in authentication/authorization, which
 * remains entirely driven by the JWT access token.
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
