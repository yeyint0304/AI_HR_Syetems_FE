import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendTimesheetPeriod,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/timesheetPeriodResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageTimesheetPeriods } from "@/lib/constants/timesheetPeriod.constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/timesheet-periods/[id] — any authenticated user may view a single
 * timesheet period (see `GET /api/timesheet-periods`).
 *
 * `TimesheetPeriod/GetTimesheetPeriodById`'s saved "not found" example
 * returns HTTP 200 with `{ IsSuccess: false, StatusCode: 404 }` in the body,
 * so the envelope is inspected explicitly rather than relying on axios to
 * throw on a non-2xx status.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view this timesheet period." },
      { status: 401 }
    );
  }

  try {
    const response = await backendApiClient.get(`/TimesheetPeriod/GetTimesheetPeriodById/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Timesheet period not found.",
        404
      );
      return NextResponse.json({ message }, { status });
    }

    const period = mapBackendTimesheetPeriod(envelope.data);
    if (!period) {
      return NextResponse.json({ message: "Timesheet period not found." }, { status: 404 });
    }

    return NextResponse.json({ data: period }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load this timesheet period.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/timesheet-periods/[id]
 * [Auth][SystemAdmin|ProjectAdmin] Deletes a timesheet period via
 * `TimesheetPeriod/DeleteTimesheetPeriod`.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this timesheet period." },
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
      { message: "You do not have permission to delete timesheet periods." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.delete(`/TimesheetPeriod/DeleteTimesheetPeriod/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to delete the timesheet period.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the timesheet period. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
