/**
 * Minimal, dependency-free JWT payload decoding.
 *
 * IMPORTANT: this only *parses* the base64url-encoded payload — it never
 * verifies the signature. JWT payloads are not encrypted (anyone holding the
 * token can already read them), so parsing alone is safe for UX purposes
 * (pre-filling forms, showing the user's name/role, optimistic route
 * gating in `proxy.ts`). The backend remains the single source of truth for
 * authorization; every mutating request is re-validated there.
 */

export interface JwtClaims {
  sub?: string;
  exp?: number;
  iat?: number;
  [claim: string]: unknown;
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(paddingNeeded);

  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }

  // Node.js fallback (Buffer is always available server-side).
  return Buffer.from(padded, "base64").toString("utf-8");
}

/** Decodes a JWT's payload. Returns `null` if the token is malformed. */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const segments = token.split(".");
    if (segments.length !== 3) return null;
    const payload = base64UrlDecode(segments[1]);
    return JSON.parse(payload) as JwtClaims;
  } catch {
    return null;
  }
}

/** Returns true if the token is missing an `exp` claim or has already expired. */
export function isTokenExpired(claims: JwtClaims | null, skewSeconds = 10): boolean {
  if (!claims?.exp) return true;
  const nowInSeconds = Date.now() / 1000;
  return claims.exp <= nowInSeconds + skewSeconds;
}

/**
 * Common ASP.NET Core JWT claim key variants. The exact claim names issued by
 * the HR System backend haven't been verified against a live token in this
 * environment, so both the short (JWT-standard-ish) and the long
 * Microsoft/XML-SOAP schema URI forms are checked defensively. Adjust
 * `CLAIM_KEYS` below once a real access token from the .NET backend is
 * available.
 */
const CLAIM_KEYS = {
  id: ["sub", "nameid", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"],
  username: ["unique_name", "username", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
  email: ["email", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
  firstName: ["given_name", "firstName", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"],
  lastName: ["family_name", "lastName", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"],
  /**
   * The real backend's access token carries the user's display name as a
   * single `name` claim (e.g. `"System Admin"`, `"Lin Thit Htoo"` — see the
   * saved `Auth/Login` example in `docs/HR_System_BE.postman_collection.json`)
   * rather than separate `given_name`/`family_name` claims. `mapClaimsToAuthUser`
   * only falls back to splitting this when neither `firstName` nor `lastName`
   * claims are present, so mock-auth tokens (`lib/server/mockAuth.ts`, which do
   * carry `given_name`/`family_name`) are unaffected.
   */
  fullName: ["name"],
  role: ["role", "roles", "Role", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
  countryId: ["countryId", "CountryId"],
} as const;

function firstClaimValue(claims: JwtClaims, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = claims[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return undefined;
}

/**
 * Best-effort split of a single "full name" claim value (e.g. `"System
 * Admin"`, `"Lin Thit Htoo"`) into `firstName`/`lastName` — the first
 * whitespace-separated word becomes `firstName`, everything after it becomes
 * `lastName` (so multi-word last names like "Htoo edited" stay together).
 * Only ever used as a fallback (see {@link CLAIM_KEYS.fullName}'s doc
 * comment) when the token has no dedicated given/family name claims, so this
 * is purely a display-name heuristic — never relied on for anything
 * security-sensitive.
 */
function splitFullName(fullName: string): { firstName?: string; lastName?: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName, lastName: rest.length > 0 ? rest.join(" ") : undefined };
}

/**
 * Maps decoded JWT claims to the {@link AuthUser} DTO used across the app.
 * Returns `null` when the mandatory identity claims (id/email/role) can't be
 * resolved, treating the token as unusable.
 */
export function mapClaimsToAuthUser(
  claims: JwtClaims
): import("@/types/auth.types").AuthUser | null {
  const id = firstClaimValue(claims, CLAIM_KEYS.id);
  const email = firstClaimValue(claims, CLAIM_KEYS.email);
  const role = firstClaimValue(claims, CLAIM_KEYS.role);

  if (!id || !email || !role) return null;

  let firstName = firstClaimValue(claims, CLAIM_KEYS.firstName);
  let lastName = firstClaimValue(claims, CLAIM_KEYS.lastName);
  if (!firstName && !lastName) {
    const fullName = firstClaimValue(claims, CLAIM_KEYS.fullName);
    if (fullName) {
      const split = splitFullName(fullName);
      firstName = split.firstName;
      lastName = split.lastName;
    }
  }

  return {
    id,
    email,
    username: firstClaimValue(claims, CLAIM_KEYS.username),
    firstName,
    lastName,
    role,
    countryId: firstClaimValue(claims, CLAIM_KEYS.countryId) ?? null,
  };
}
