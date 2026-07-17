import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendCreateTimesheetPeriodPayload } from "@/lib/server/backendPayloadMappers";
import {
  mapBackendTimesheetPeriod,
  mapBackendTimesheetPeriodList,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/timesheetPeriodResponseMappers";
import {
  createTimesheetPeriodSchema,
  timesheetPeriodListQuerySchema,
} from "@/lib/validators/timesheetPeriod.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageTimesheetPeriods } from "@/lib/constants/timesheetPeriod.constants";

/**
 * GET /api/timesheet-periods
 * Any authenticated user may list timesheet periods — unlike the
 * Administration-only reference-data screens, employees also need to see
 * whether the period they're logging time against is locked (mirrors
 * `GET /api/projects`'s "any authenticated user may read" rationale).
 *
 * Forwards the optional `isLocked`/`year`/`month` filters documented on
 * `TimesheetPeriod/GetAllTimesheetPeriods` if present in the query string.
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view timesheet periods." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = timesheetPeriodListQuerySchema.safeParse({
    isLocked: searchParams.get("isLocked") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    month: searchParams.get("month") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid filter parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.get("/TimesheetPeriod/GetAllTimesheetPeriods", {
      params: parsedQuery.data,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to load timesheet periods.",
        502
      );
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json(
      { data: mapBackendTimesheetPeriodList(envelope.data) },
      { status: 200 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to load timesheet periods. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/timesheet-periods
 * [Auth][SystemAdmin|ProjectAdmin] Creates a new timesheet period via
 * `TimesheetPeriod/CreateTimesheetPeriod`. The role check is enforced here
 * (server-side, based on the decoded access token) in addition to the
 * page-level check — the backend remains the ultimate authorization
 * boundary and re-validates independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a timesheet period." },
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

  if (!canManageTimesheetPeriods(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to create timesheet periods." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createTimesheetPeriodSchema.safeParse(body);
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
      "/TimesheetPeriod/CreateTimesheetPeriod",
      toBackendCreateTimesheetPeriodPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to create the timesheet period.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const period = mapBackendTimesheetPeriod(envelope.data);
    return NextResponse.json({ data: period ?? envelope.data }, { status: 201 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the timesheet period. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
