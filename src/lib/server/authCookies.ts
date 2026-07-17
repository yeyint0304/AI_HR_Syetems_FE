import "server-only";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS,
  DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/constants/auth.constants";

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

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
