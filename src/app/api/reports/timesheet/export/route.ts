import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/server/authCookies";
import { fetchReportExport } from "@/lib/server/reportExport";
import {
  reportExportFormatSchema,
  timesheetReportQuerySchema,
} from "@/lib/validators/report.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageReports, isProjectScopedReportManager } from "@/lib/constants/report.constants";

/**
 * GET /api/reports/timesheet/export
 * [Auth] Exports the timesheet report as a file (`format=xlsx|csv`, default
 * `xlsx`). Applies the exact same required filters and self-scoping rules as
 * `GET /api/reports/timesheet` — see that Route Handler's docblock for the
 * OWASP A01 rationale and the `ProjectAdmin`/`SystemAdmin` backend-endpoint
 * split (`Report/ExportMyTimesheetReport` vs `Report/ExportTimesheetReport`).
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to export the timesheet report." },
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

  const { searchParams } = new URL(request.url);
  const parsedQuery = timesheetReportQuerySchema.safeParse({
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    isApproved: searchParams.get("isApproved") ?? undefined,
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

  const canManageAny = canManageReports(currentUser.role);
  const requestedUserId = parsedQuery.data.userId;

  if (requestedUserId && requestedUserId !== currentUser.id && !canManageAny) {
    return NextResponse.json(
      { message: "You do not have permission to export other users' timesheet report data." },
      { status: 403 }
    );
  }

  const effectiveUserId = requestedUserId ?? (canManageAny ? undefined : currentUser.id);
  const format = parsedFormat.data;
  const isProjectAdmin = isProjectScopedReportManager(currentUser.role);

  return fetchReportExport({
    backendPath: isProjectAdmin ? "/Report/ExportMyTimesheetReport" : "/Report/ExportTimesheetReport",
    params: {
      ...parsedQuery.data,
      // See `app/api/reports/timesheet/route.ts` — `ExportMyTimesheetReport`
      // is self/team-scoped and documents no `userId` param.
      userId: isProjectAdmin ? undefined : effectiveUserId,
      format,
    },
    accessToken,
    format,
    filename: `timesheet-report_${parsedQuery.data.startDate}_to_${parsedQuery.data.endDate}.${format}`,
    fallbackMessage: "Unable to export the timesheet report. Please try again.",
  });
}
