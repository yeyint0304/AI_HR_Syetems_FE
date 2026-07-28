import "server-only";
import { DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS } from "@/lib/constants/auth.constants";
import { type JwtClaims } from "@/lib/utils/jwt";
import { readBackendEnvelope } from "@/lib/server/backendEnvelope";

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
 *
 * Per the saved "200 - Success" example for `Auth/Login` in
 * `docs/HR_System_BE.postman_collection.json`, the real backend wraps the
 * token pair in the standard envelope (`{ StatusCode, IsSuccess, Message,
 * Data: { AccessToken, RefreshToken, ... } }`) rather than returning the
 * tokens at the top level. `readBackendEnvelope` unwraps that `Data` layer
 * first (falling back to the raw payload for bare/non-enveloped shapes, e.g.
 * in tests or the local mock-auth fallback) so the tokens are found either
 * way — previously this envelope was not unwrapped, so `extractTokens`
 * always returned `null` for real backend responses, causing `POST
 * /api/auth/login` and `POST /api/auth/refresh` to fail with a 502.
 * Returns `null` (no tokens) when the backend reports a logical failure via
 * `IsSuccess: false`.
 */
export function extractTokens(
  data: unknown
): { accessToken: string; refreshToken: string } | null {
  const envelope = readBackendEnvelope(data);
  if (!envelope.isSuccess) return null;

  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;

  const raw = unwrapped as RawTokenResponse;
  const accessToken = raw.AccessToken ?? raw.accessToken;
  const refreshToken = raw.RefreshToken ?? raw.refreshToken;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

interface RawUserResponse {
  Username?: string;
  username?: string;
}

/**
 * Extracts the backend-issued `Username` from a `Auth/Login` /
 * `Auth/UpdateProfile` response body (enveloped or bare), tolerant of
 * PascalCase/camelCase — mirrors `extractTokens`'s envelope-unwrapping. The
 * real backend's access-token JWT never carries a username claim (see
 * `lib/utils/jwt.ts`'s `CLAIM_KEYS` doc comment), so this is the only
 * reliable source for `AuthUser.username` when talking to the real backend
 * (`lib/server/authCookies.ts#setUsernameCookie`/`getCurrentAuthUser`).
 * Returns `undefined` for a logical failure (`IsSuccess: false`), a
 * non-object payload, or a missing/blank `Username` field.
 */
export function extractUsername(data: unknown): string | undefined {
  const envelope = readBackendEnvelope(data);
  if (!envelope.isSuccess) return undefined;

  const unwrapped = envelope.data;
  if (typeof unwrapped !== "object" || unwrapped === null) return undefined;

  const raw = unwrapped as RawUserResponse;
  const username = raw.Username ?? raw.username;
  return typeof username === "string" && username.length > 0 ? username : undefined;
}

/** Derives a cookie `maxAge` (seconds) from the access token's `exp` claim. */
export function computeAccessTokenMaxAge(claims: JwtClaims | null): number {
  if (!claims?.exp) return DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS;
  const secondsLeft = Math.floor(claims.exp - Date.now() / 1000);
  return secondsLeft > 0 ? secondsLeft : DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS;
}
