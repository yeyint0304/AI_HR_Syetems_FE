import { NextResponse } from "next/server";
import axios from "axios";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { clearAuthCookies, getRefreshToken, setAuthCookies } from "@/lib/server/authCookies";
import { toBackendRefreshTokenPayload } from "@/lib/server/backendPayloadMappers";
import { extractTokens, computeAccessTokenMaxAge } from "@/lib/server/tokenUtils";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/auth/refresh
 * Exchanges the httpOnly refresh-token cookie for a new access/refresh token
 * pair. Called transparently by the client Axios interceptor
 * (`lib/api/axiosInstance.ts`) whenever an authenticated request gets a 401.
 */
export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ message: "No active session." }, { status: 401 });
  }

  try {
    const response = await backendApiClient.post(
      "/Auth/RefreshToken",
      toBackendRefreshTokenPayload(refreshToken)
    );

    const tokens = extractTokens(response.data);
    if (!tokens) {
      await clearAuthCookies();
      return NextResponse.json(
        { message: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const claims = decodeJwt(tokens.accessToken);
    const user = claims ? mapClaimsToAuthUser(claims) : null;
    if (!user) {
      await clearAuthCookies();
      return NextResponse.json(
        { message: "Session expired. Please sign in again." },
        { status: 401 }
      );
    }

    await setAuthCookies(tokens.accessToken, tokens.refreshToken, computeAccessTokenMaxAge(claims));
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.warn("Refresh token request rejected by backend", { status: error.response?.status });
    } else {
      logger.error("Unexpected error refreshing token", error);
    }
    await clearAuthCookies();
    return NextResponse.json(
      { message: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }
}
