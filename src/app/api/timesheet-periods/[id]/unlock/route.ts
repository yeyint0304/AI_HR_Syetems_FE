import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope } from "@/lib/server/timesheetPeriodResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageTimesheetPeriods } from "@/lib/constants/timesheetPeriod.constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/timesheet-periods/[id]/unlock
 * [Auth][SystemAdmin|ProjectAdmin] Unlocks a timesheet period via
 * `TimesheetPeriod/UnlockTimesheetPeriod`, allowing timesheet entries to be
 * submitted against it again.
 */
export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to unlock this timesheet period." },
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
      { message: "You do not have permission to unlock timesheet periods." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.put(
      `/TimesheetPeriod/UnlockTimesheetPeriod/${id}`,
      null,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      return NextResponse.json(
        { message: envelope.message ?? "Unable to unlock the timesheet period." },
        { status: envelope.statusCode >= 400 ? envelope.statusCode : 400 }
      );
    }

    return NextResponse.json({ message: envelope.message ?? "Period unlocked." }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to unlock the timesheet period. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
