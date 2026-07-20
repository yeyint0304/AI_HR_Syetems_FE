import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendUserRolesSummary,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/reportResponseMappers";
import { userRolesSummaryQuerySchema } from "@/lib/validators/report.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageReports } from "@/lib/constants/report.constants";

/**
 * GET /api/reports/roles-summary
 * [Auth] Generates the "User Roles Summary" report via
 * `Report/GenerateUserRolesSummary` (`startDate`/`endDate` required,
 * `projectId` optional).
 *
 * Restricted to `REPORT_MANAGER_ROLES` (SystemAdmin/ProjectAdmin) — see
 * `lib/constants/report.constants.ts` for the rationale (this report exposes
 * aggregate headcount/utilization data across the whole organization, not
 * just the signed-in user's own work).
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view the user roles summary." },
      { status: 401 }
    );
  }

  const claims = decodeJwt(accessToken);
  const currentUser = claims ? mapClaimsToAuthUser(claims) : null;
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  if (!canManageReports(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to view the user roles summary." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = userRolesSummaryQuerySchema.safeParse({
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid filter parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.get("/Report/GenerateUserRolesSummary", {
      params: parsedQuery.data,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to generate the user roles summary.",
        502
      );
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json({ data: mapBackendUserRolesSummary(envelope.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to generate the user roles summary. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
