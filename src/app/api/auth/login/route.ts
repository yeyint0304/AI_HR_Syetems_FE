import { NextResponse } from "next/server";
import axios from "axios";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { setAuthCookies, setUsernameCookie } from "@/lib/server/authCookies";
import { toBackendLoginPayload } from "@/lib/server/backendPayloadMappers";
import { extractTokens, extractUsername, computeAccessTokenMaxAge } from "@/lib/server/tokenUtils";
import { loginSchema } from "@/lib/validators/auth.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { logger } from "@/lib/utils/logger";
import { createMockAuthTokens, isBackendUnreachableError, isMockAuthEnabled } from "@/lib/server/mockAuth";

/**
 * Decodes tokens, derives the safe `AuthUser` DTO, sets cookies, and
 * responds. `username` is the `Auth/Login` response body's `Username` field
 * (see `extractUsername`) when the caller has it — the real backend's JWT
 * never carries a `username` claim, so `mapClaimsToAuthUser` alone can't
 * resolve it there; the mock-auth fallback's JWT does carry one, so this
 * falls back to whatever `mapClaimsToAuthUser` already resolved in that case.
 */
async function issueSession(
  tokens: { accessToken: string; refreshToken: string },
  username?: string
) {
  const claims = decodeJwt(tokens.accessToken);
  const baseUser = claims ? mapClaimsToAuthUser(claims) : null;
  if (!baseUser) {
    logger.error("Unable to derive user profile from access token claims");
    return NextResponse.json({ message: "Unable to sign in. Please try again." }, { status: 502 });
  }

  const resolvedUsername = username ?? baseUser.username;
  const user = resolvedUsername ? { ...baseUser, username: resolvedUsername } : baseUser;

  await setAuthCookies(tokens.accessToken, tokens.refreshToken, computeAccessTokenMaxAge(claims));
  if (resolvedUsername) {
    await setUsernameCookie(resolvedUsername);
  }
  return NextResponse.json({ user }, { status: 200 });
}

/**
 * POST /api/auth/login
 * Public endpoint. Validates credentials, exchanges them with the .NET
 * backend's `Auth/Login`, and — on success — stores the returned
 * AccessToken/RefreshToken pair as httpOnly cookies. The raw tokens never
 * reach the browser's JavaScript context; only a safe `AuthUser` DTO is
 * returned in the JSON body.
 *
 * Local-dev fallback: if the real backend is unreachable (not merely a 401 —
 * see `lib/server/mockAuth.ts`) and this isn't a production build, credentials
 * are checked against a small fixed set of mock accounts so the rest of the
 * app (root-route redirect, dashboard, RBAC) can still be exercised without a
 * live .NET backend. Never active in production.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please enter your username/email and password.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.post(
      "/Auth/Login",
      toBackendLoginPayload(parsed.data)
    );

    const tokens = extractTokens(response.data);
    if (!tokens) {
      logger.error("Login response from backend did not contain the expected tokens");
      return NextResponse.json(
        { message: "Unable to sign in. Please try again." },
        { status: 502 }
      );
    }

    return await issueSession(tokens, extractUsername(response.data));
  } catch (error) {
    // Deliberately generic on auth failure: avoid user-enumeration by not
    // forwarding backend-specific details ("user not found" vs "wrong password").
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return NextResponse.json(
        { message: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    if (isMockAuthEnabled() && isBackendUnreachableError(error)) {
      logger.warn("Backend unreachable; falling back to mock login for local development", {
        code: (error as { code?: string }).code,
      });
      const mockTokens = createMockAuthTokens(parsed.data);
      if (mockTokens) {
        return await issueSession(mockTokens);
      }
      return NextResponse.json(
        { message: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    logger.error("Login request failed", error);
    return NextResponse.json(
      { message: "Unable to sign in right now. Please try again later." },
      { status: 502 }
    );
  }
}
