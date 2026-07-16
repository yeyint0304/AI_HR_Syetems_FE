import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { clearAuthCookies, getAccessToken, getRefreshToken } from "@/lib/server/authCookies";
import { toBackendLogoutPayload } from "@/lib/server/backendPayloadMappers";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/auth/logout
 * Invalidates the refresh token on the backend (best-effort) and always
 * clears the local httpOnly cookies, so the user is logged out client-side
 * even if the backend call fails (e.g. token already expired).
 */
export async function POST() {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();

  if (accessToken && refreshToken) {
    try {
      await backendApiClient.post("/Auth/Logout", toBackendLogoutPayload(refreshToken), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      logger.warn("Failed to invalidate refresh token on backend during logout", error);
    }
  }

  await clearAuthCookies();
  return NextResponse.json({ success: true }, { status: 200 });
}
