import type { AuthUser } from "@/types/auth.types";

/**
 * Shared "how do we show this signed-in user" helpers, used by every
 * identity-bearing UI element (`components/layout/Sidebar.tsx`,
 * `components/layout/Topbar.tsx`, `components/layout/UserMenu.tsx`,
 * `components/auth/ProfileView.tsx`) so the name shown is always resolved
 * the same way instead of each component re-implementing its own fallback
 * chain.
 *
 * Per the wireframe (`docs/HR_System_FE_wireframe.pdf`: the sidebar/header
 * footer card shows "System Admin"/"Sarah Chen" — a person's name, not their
 * login username or email), the *full name* is preferred over `username`/
 * `email`. `firstName`/`lastName` are usually present (either straight from
 * the backend's `Auth/Login`/`Auth/UpdateProfile` response, or derived from
 * the JWT's `name` claim — see `lib/utils/jwt.ts#mapClaimsToAuthUser`), but
 * `username` then `email` remain as defensive fallbacks for the rare case
 * neither is available.
 */
type DisplayableUser =
  | Partial<Pick<AuthUser, "firstName" | "lastName" | "username" | "email">>
  | null
  | undefined;

/** Full "First Last" name, falling back to `username`, then `email`, then `""`. */
export function getFullName(user: DisplayableUser): string {
  if (!user) return "";
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.username || user.email || "";
}

/** Two-letter (or one-letter) initials derived from the same name resolved by {@link getFullName}. */
export function getUserInitials(user: DisplayableUser): string {
  if (!user) return "?";
  const first = user.firstName?.[0] ?? user.username?.[0] ?? user.email?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  return initials ? initials.toUpperCase() : "U";
}
