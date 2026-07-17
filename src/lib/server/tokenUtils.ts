import "server-only";
import { DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS } from "@/lib/constants/auth.constants";
import { type JwtClaims } from "@/lib/utils/jwt";

interface RawTokenResponse {
  AccessToken?: string;
  RefreshToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Extracts the access/refresh token pair from the backend's Login /
 * RefreshToken response, tolerating both the documented PascalCase
 * (`AccessToken`/`RefreshToken`) and camelCase variants.
 */
export function extractTokens(
  data: unknown
): { accessToken: string; refreshToken: string } | null {
  if (typeof data !== "object" || data === null) return null;
  const raw = data as RawTokenResponse;
  const accessToken = raw.AccessToken ?? raw.accessToken;
  const refreshToken = raw.RefreshToken ?? raw.refreshToken;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

/** Derives a cookie `maxAge` (seconds) from the access token's `exp` claim. */
export function computeAccessTokenMaxAge(claims: JwtClaims | null): number {
  if (!claims?.exp) return DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS;
  const secondsLeft = Math.floor(claims.exp - Date.now() / 1000);
  return secondsLeft > 0 ? secondsLeft : DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS;
}
