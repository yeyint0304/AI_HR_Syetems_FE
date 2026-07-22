import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/timesheetEntryResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageAnyTimesheetEntry } from "@/lib/constants/timesheetEntry.constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/timesheet-entries/[id]/approve
 * [Auth][SystemAdmin|ProjectAdmin] Approves a timesheet entry via
 * `TimesheetEntry/ApproveTimesheetEntry` (per
 * `docs/HR_System_BE.postman_collection.json`, tagged `[Auth]`, "No request
 * body required"). Restricted to `canManageAnyTimesheetEntry` roles as a
 * defense-in-depth measure — the same review/approval workflow the ownership
 * check in `app/api/timesheet-entries/[id]/route.ts` and
 * `lib/constants/timesheetEntry.constants.ts` already anticipates ("acting
 * on any user's entries ... for review/approval workflows built on top of
 * this data later"). Approval also gates `INV-01` ("Includes approved
 * entries only") in `docs/HR_System_User_Stories_Backlog.xlsx`.
 *
 * The backend's saved success example only returns
 * `{ Id, IsApproved, ApprovedAt, ApprovedBy }` — not the full entry shape
 * `mapBackendTimesheetEntry` requires (`userId`/`projectId`/`timesheetPeriodId`/
 * `entryDate`), so — like `PUT /api/timesheet-entries/[id]` for
 * `UpdateTimesheetEntry` — no updated record is returned here; the client
 * refetches the list (`useApproveTimesheetEntry`'s cache invalidation
 * handles this).
 */
export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to approve this timesheet entry." },
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

  if (!canManageAnyTimesheetEntry(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to approve timesheet entries." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.put(
      `/TimesheetEntry/ApproveTimesheetEntry/${id}`,
      null,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to approve this timesheet entry.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json(
      { message: envelope.message ?? "Timesheet entry approved successfully." },
      { status: 200 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to approve this timesheet entry. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
