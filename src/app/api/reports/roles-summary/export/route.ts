import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/server/authCookies";
import { fetchReportExport } from "@/lib/server/reportExport";
import {
  reportExportFormatSchema,
  userRolesSummaryQuerySchema,
} from "@/lib/validators/report.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageReports, isProjectScopedReportManager } from "@/lib/constants/report.constants";

/**
 * GET /api/reports/roles-summary/export
 * [Auth] Exports the "User Roles Summary" report as a file
 * (`format=xlsx|csv`, default `xlsx`). Same `REPORT_MANAGER_ROLES`
 * restriction, and the same `ProjectAdmin`/`SystemAdmin` backend-endpoint
 * split (`Report/ExportMyUserRolesSummary` vs `Report/ExportUserRolesSummary`),
 * as `GET /api/reports/roles-summary`.
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to export the user roles summary." },
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
      { message: "You do not have permission to export the user roles summary." },
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

  const parsedFormat = reportExportFormatSchema.safeParse(searchParams.get("format") ?? "xlsx");
  if (!parsedFormat.success) {
    return NextResponse.json({ message: "format must be 'xlsx' or 'csv'." }, { status: 400 });
  }

  const format = parsedFormat.data;
  const backendPath = isProjectScopedReportManager(currentUser.role)
    ? "/Report/ExportMyUserRolesSummary"
    : "/Report/ExportUserRolesSummary";

  return fetchReportExport({
    backendPath,
    params: { ...parsedQuery.data, format },
    accessToken,
    format,
    filename: `user-roles-summary_${parsedQuery.data.startDate}_to_${parsedQuery.data.endDate}.${format}`,
    fallbackMessage: "Unable to export the user roles summary. Please try again.",
  });
}
