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
 * Roles as defined by the backend (see docs/HR_System_User_Stories_Backlog +
 * Technical_Requirements_NextJS_Frontend). Kept as a const object (rather than
 * a TS `enum`) so the values can be safely used for both type-checking and
 * runtime comparisons against decoded JWT claims.
 */
export const USER_ROLES = {
  SYSTEM_ADMIN: "SystemAdmin",
  PROJECT_ADMIN: "ProjectAdmin",
  USER: "User",
  GUEST: "Guest",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Fallback lifetime (in seconds) used when a token's expiry can't be derived. */
export const DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes
export const DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Public (unauthenticated) routes the proxy must never guard. */
export const PUBLIC_ROUTES = ["/login"];

/** Route prefix reserved for SystemAdmin-only screens. */
export const ADMIN_ROUTE_PREFIX = "/admin";
