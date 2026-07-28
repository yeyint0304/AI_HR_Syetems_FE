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
 * Caches the backend-issued `Username` (see `USERNAME_COOKIE`'s doc comment
 * for why this is needed) with the same lifetime as the refresh token, since
 * it's meant to survive an access-token refresh.
 */
export async function setUsernameCookie(username: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(USERNAME_COOKIE, username, {
    ...baseCookieOptions,
    maxAge: DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS,
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
 * Resolves the currently signed-in {@link AuthUser} from the access-token
 * cookie, overlaying the cached {@link USERNAME_COOKIE} only when the JWT
 * itself doesn't carry a username claim (mock-auth tokens already embed one
 * — see `lib/server/mockAuth.ts`). Protected layouts/pages should call this
 * instead of manually decoding the JWT, so `username` renders consistently
 * everywhere `AuthUser` is displayed (Sidebar/Topbar footer identity,
 * `/profile`).
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
