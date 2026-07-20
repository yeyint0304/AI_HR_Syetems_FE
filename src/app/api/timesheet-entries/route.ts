import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendCreateTimesheetEntryPayload } from "@/lib/server/backendPayloadMappers";
import {
  mapBackendTimesheetEntry,
  mapBackendTimesheetEntryList,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/timesheetEntryResponseMappers";
import {
  createTimesheetEntrySchema,
  timesheetEntryListQuerySchema,
} from "@/lib/validators/timesheetEntry.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageAnyTimesheetEntry } from "@/lib/constants/timesheetEntry.constants";

/**
 * GET /api/timesheet-entries
 * Any authenticated user may list timesheet entries, but — unlike
 * `Project`/`TimesheetPeriod` reference-data reads — this endpoint returns
 * personally-identifying work-log data. `docs/HR_System_BE.postman_collection.json`
 * only tags `TimesheetEntry/GetAllTimesheetEntries` `[Auth]` (no documented
 * per-user scoping), so this Route Handler enforces ownership itself as a
 * defense-in-depth measure (OWASP A01: Broken Access Control):
 *   - A plain `User` may only ever query their own entries — any `userId`
 *     filter they supply is ignored/overridden with their own id.
 *   - SystemAdmin/ProjectAdmin may query any user's entries (or omit the
 *     filter entirely to see everyone's), matching `canManageAnyTimesheetEntry`.
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view timesheet entries." },
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
  const parsedQuery = timesheetEntryListQuerySchema.safeParse({
    userId: searchParams.get("userId") ?? undefined,
    projectId: searchParams.get("projectId") ?? undefined,
    timesheetPeriodId: searchParams.get("timesheetPeriodId") ?? undefined,
    isApproved: searchParams.get("isApproved") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid filter parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const canManageAny = canManageAnyTimesheetEntry(currentUser.role);
  const requestedUserId = parsedQuery.data.userId;

  if (requestedUserId && requestedUserId !== currentUser.id && !canManageAny) {
    return NextResponse.json(
      { message: "You do not have permission to view other users' timesheet entries." },
      { status: 403 }
    );
  }

  // Self-scope by default for non-privileged roles so a plain `User` can never
  // enumerate every employee's timesheet entries by simply omitting the filter.
  const effectiveUserId = requestedUserId ?? (canManageAny ? undefined : currentUser.id);

  try {
    const response = await backendApiClient.get("/TimesheetEntry/GetAllTimesheetEntries", {
      params: { ...parsedQuery.data, userId: effectiveUserId },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to load timesheet entries.",
        502
      );
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json(
      { data: mapBackendTimesheetEntryList(envelope.data) },
      { status: 200 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to load timesheet entries. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/timesheet-entries
 * [Auth] Any authenticated user may log time against a project via
 * `TimesheetEntry/CreateTimesheetEntry`. The backend infers the owning user
 * from the bearer token — the request body never carries a `UserId`, so a
 * user can never create an entry on someone else's behalf.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to log time." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createTimesheetEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Please correct the highlighted fields.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.post(
      "/TimesheetEntry/CreateTimesheetEntry",
      toBackendCreateTimesheetEntryPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to log time for this entry.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const entry = mapBackendTimesheetEntry(envelope.data);
    return NextResponse.json({ data: entry ?? envelope.data }, { status: 201 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to log time for this entry. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
