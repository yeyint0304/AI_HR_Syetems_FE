import "server-only";
import axios from "axios";
import { DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS, USER_ROLES } from "@/lib/constants/auth.constants";
import type { LoginRequest } from "@/types/auth.types";

/**
 * Local-development-only mock login fallback.
 *
 * The real .NET backend (`https://localhost:7195/api/v1`, see
 * `docs/HR_System_BE.postman_collection.json`) is out of scope for this
 * frontend work and isn't reachable in every environment. So that the
 * "no token -> redirect to /login, valid token -> reach the dashboard" flow
 * can still be exercised end-to-end (by QA, local dev, Playwright, etc.)
 * without a live backend, `POST /api/auth/login` falls back to this module
 * — but ONLY when both of the following hold (see `route.ts`):
 *   1. `process.env.NODE_ENV !== "production"` (never compiled into a
 *      production build's behavior path).
 *   2. The real backend call failed because it's *unreachable* (connection
 *      refused/timeout — no `error.response` at all), never for a real 401
 *      from a reachable backend, so genuine wrong-password cases still show
 *      the real error and never fall through to this mock.
 *
 * This still goes through the exact same secure cookie plumbing as a real
 * login (`setAuthCookies` — httpOnly / Secure-in-prod / SameSite=Strict): no
 * token or credential is ever written to localStorage/sessionStorage, and no
 * plaintext password is persisted anywhere (unlike the earlier
 * localStorage-based mock-auth prototype called out in `CLAUDE.md` as
 * explicitly NOT the target pattern).
 */

interface MockUser {
  id: string;
  usernameOrEmail: string;
  password: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  countryId: string | null;
}

/** Fixed, non-persisted demo accounts. Never seeded into any real datastore. */
const MOCK_USERS: readonly MockUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    usernameOrEmail: "admin",
    password: "Password123!",
    email: "admin@hrsystem.local",
    username: "admin",
    firstName: "System",
    lastName: "Admin",
    role: USER_ROLES.SYSTEM_ADMIN,
    countryId: null,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    usernameOrEmail: "jane",
    password: "Password123!",
    email: "jane@hrsystem.local",
    username: "jane",
    firstName: "Jane",
    lastName: "Doe",
    role: USER_ROLES.EMPLOYEE,
    countryId: null,
  },
] as const;

/** Non-secret list surfaced to the (dev-only) login page hint. Never render this in production. */
export const MOCK_LOGIN_HINT = MOCK_USERS.map((user) => ({
  usernameOrEmail: user.usernameOrEmail,
  password: user.password,
}));

function base64UrlEncode(value: string): string {
  const base64 =
    typeof globalThis.btoa === "function"
      ? globalThis.btoa(value)
      : Buffer.from(value, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function findMockUser({ usernameOrEmail, password }: LoginRequest): MockUser | null {
  const normalized = usernameOrEmail.trim().toLowerCase();
  const match = MOCK_USERS.find(
    (candidate) =>
      (candidate.usernameOrEmail.toLowerCase() === normalized ||
        candidate.email.toLowerCase() === normalized) &&
      candidate.password === password
  );
  return match ?? null;
}

/**
 * Builds a JWT-*shaped* (header.payload.signature) but unsigned access token
 * carrying the same claim keys `lib/utils/jwt.ts` already knows how to
 * decode, plus an opaque refresh token. Returns `null` if the credentials
 * don't match a known mock account (mirrors a real 401 in that case).
 */
export function createMockAuthTokens(
  payload: LoginRequest
): { accessToken: string; refreshToken: string } | null {
  const user = findMockUser(payload);
  if (!user) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "none", typ: "JWT" };
  const claims = {
    sub: user.id,
    email: user.email,
    unique_name: user.username,
    given_name: user.firstName,
    family_name: user.lastName,
    role: user.role,
    countryId: user.countryId,
    iat: nowSeconds,
    exp: nowSeconds + DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS,
  };

  const accessToken = [
    base64UrlEncode(JSON.stringify(header)),
    base64UrlEncode(JSON.stringify(claims)),
    "mock-signature",
  ].join(".");

  const refreshToken = `mock-refresh-${user.id}-${nowSeconds}`;

  return { accessToken, refreshToken };
}

/**
 * Narrow guard for "the backend couldn't be reached at all" (vs. a real HTTP
 * error response such as a genuine 401/500). Only this case is eligible for
 * the mock fallback.
 */
export function isBackendUnreachableError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

/** Single switch controlling whether the mock-login fallback can ever run. */
export function isMockAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
