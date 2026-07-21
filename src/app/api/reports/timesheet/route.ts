import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendTimesheetReport,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/reportResponseMappers";
import { timesheetReportQuerySchema } from "@/lib/validators/report.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageReports } from "@/lib/constants/report.constants";
import { DEFAULT_TIMESHEET_REPORT_PAGE_SIZE } from "@/lib/constants/report.constants";

/**
 * GET /api/reports/timesheet
 * [Auth] Generates a paginated timesheet report via `Report/GenerateTimesheetReport`.
 * `startDate`/`endDate` are required; `projectId`/`userId`/`isApproved`/`page`/`pageSize`
 * are optional, per `docs/HR_System_BE.postman_collection.json`.
 *
 * The documented contract only tags this endpoint `[Auth]` (no explicit role
 * requirement), but its rows carry other employees' names/hours/task
 * descriptions — the same personally-identifying shape as
 * `TimesheetEntry/GetAllTimesheetEntries`. This Route Handler applies the same
 * defense-in-depth self-scoping used by `app/api/timesheet-entries/route.ts`
 * (OWASP A01: Broken Access Control): a plain `User` may only ever request
 * their own rows — any `userId` they supply is ignored/overridden with their
 * own id. SystemAdmin/ProjectAdmin may query any user (or omit the filter to
 * see everyone).
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view the timesheet report." },
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
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid filter parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const canManageAny = canManageReports(currentUser.role);
  const requestedUserId = parsedQuery.data.userId;

  if (requestedUserId && requestedUserId !== currentUser.id && !canManageAny) {
    return NextResponse.json(
      { message: "You do not have permission to view other users' timesheet report data." },
      { status: 403 }
    );
  }

  // Self-scope by default for non-privileged roles so a plain `User` can never
  // enumerate every employee's timesheet data by simply omitting the filter.
  const effectiveUserId = requestedUserId ?? (canManageAny ? undefined : currentUser.id);

  try {
    const response = await backendApiClient.get("/Report/GenerateTimesheetReport", {
      params: {
        ...parsedQuery.data,
        userId: effectiveUserId,
        pageSize: parsedQuery.data.pageSize ?? DEFAULT_TIMESHEET_REPORT_PAGE_SIZE,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to generate the timesheet report.",
        502
      );
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json({ data: mapBackendTimesheetReport(envelope.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to generate the timesheet report. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
