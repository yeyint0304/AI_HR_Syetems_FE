import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendProjectAdminTimesheetSummary,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/timesheetEntryResponseMappers";
import { projectAdminTimesheetSummaryQuerySchema } from "@/lib/validators/timesheetEntry.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { isProjectScopedTimesheetManager } from "@/lib/constants/timesheetEntry.constants";
import type { ProjectAdminTimesheetSummary } from "@/types/timesheetEntry.types";

const EMPTY_SUMMARY: ProjectAdminTimesheetSummary = {
  totalHours: 0,
  approvedHours: 0,
  pendingHours: 0,
  projectSummaries: [],
  entries: [],
};

/**
 * GET /api/timesheet-entries/project-admin-summary
 *
 * Backs the `ProjectAdmin`-facing branch of
 * `components/timesheets/TimesheetHistoryView.tsx`, calling the backend's
 * dedicated `TimesheetEntry/GetProjectAdminTimesheetSummary` rather than
 * `TimesheetEntry/GetAllTimesheetEntries` (which the sibling
 * `app/api/timesheet-entries/route.ts` uses for `SystemAdmin`/a plain
 * `User`). Per this app's API-integration requirement, a `ProjectAdmin`
 * reviewing timesheets should be powered by this manager-facing
 * summary/entry-list endpoint, not the org-wide list.
 *
 * Restricted server-side to `ProjectAdmin` (defense-in-depth, OWASP A01:
 * Broken Access Control) — `SystemAdmin` has its own unrestricted
 * `GetAllTimesheetEntries` route, and a plain `User` has no legitimate use
 * for a manager-only project summary, so both are rejected with 403 here
 * even though the UI never renders this branch for them.
 *
 * `projectId` is optional (see `ProjectAdminTimesheetSummaryFilters`,
 * `types/timesheetEntry.types.ts`, for the reasoning) — omitted, the backend
 * is expected to scope the summary to every project this `ProjectAdmin`
 * manages, matching the "All Projects" option already offered by this
 * screen's existing Project filter.
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view this timesheet summary." },
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

  if (!isProjectScopedTimesheetManager(currentUser.role)) {
    return NextResponse.json(
      { message: "Only Project Admins can view this timesheet summary." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = projectAdminTimesheetSummaryQuerySchema.safeParse({
    projectId: searchParams.get("projectId") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid filter parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.get(
      "/TimesheetEntry/GetProjectAdminTimesheetSummary",
      {
        params: { projectId: parsedQuery.data.projectId },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to load this project's timesheet summary.",
        502
      );
      return NextResponse.json({ message }, { status });
    }

    const summary = mapBackendProjectAdminTimesheetSummary(envelope.data);
    return NextResponse.json({ data: summary ?? EMPTY_SUMMARY }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to load this project's timesheet summary. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
