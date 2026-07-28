import "server-only";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS,
  DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  USERNAME_COOKIE,
} from "@/lib/constants/auth.constants";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import type { AuthUser } from "@/types/auth.types";

/**
 * Centralizes all httpOnly auth-cookie reads/writes so every Route Handler
 * uses identical, secure options:
 *  - httpOnly: never readable by client-side JavaScript (mitigates XSS token theft).
 *  - secure: HTTPS only in production (allows local `http://localhost` dev).
 *  - sameSite: 'strict' to mitigate CSRF.
 * Tokens are NEVER written to localStorage/sessionStorage.
 */
const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/",
};

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
  accessTokenMaxAgeSeconds: number = DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS,
  refreshTokenMaxAgeSeconds: number = DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions,
    maxAge: accessTokenMaxAgeSeconds,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: refreshTokenMaxAgeSeconds,
  });
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

/**
 * Caches the signed-in user's `username` for display purposes (see
 * `USERNAME_COOKIE`'s doc comment) — called from `Auth/Login` and
 * `Auth/UpdateProfile` Route Handlers, whose backend responses both include
 * `Username` directly in the body. Not security-sensitive (a username is not
 * a secret), but kept httpOnly/Secure/SameSite=Strict for defense-in-depth
 * consistency with the token cookies above.
 */
export async function setUsernameCookie(
  username: string,
  maxAgeSeconds: number = DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(USERNAME_COOKIE, username, {
    ...baseCookieOptions,
    maxAge: maxAgeSeconds,
  });
}

export async function getUsernameCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(USERNAME_COOKIE)?.value ?? null;
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  cookieStore.delete(USERNAME_COOKIE);
}

/**
 * Resolves the current request's {@link AuthUser} the way every protected
 * layout/page needs it: decode the `AuthUser` DTO from the httpOnly
 * access-token cookie, then — since the real backend's JWT carries no
 * `username` claim (see `USERNAME_COOKIE`'s doc comment) — overlay the cached
 * `USERNAME_COOKIE` value whenever the JWT-derived `username` is missing.
 * Returns `null` when there is no valid session, exactly like calling
 * `decodeJwt` + `mapClaimsToAuthUser` directly.
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const claims = decodeJwt(accessToken);
  const user = claims ? mapClaimsToAuthUser(claims) : null;
  if (!user) return null;
  if (user.username) return user;

  const cachedUsername = await getUsernameCookie();
  return cachedUsername ? { ...user, username: cachedUsername } : user;
}
