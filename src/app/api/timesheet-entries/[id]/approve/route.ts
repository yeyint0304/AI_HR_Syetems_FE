import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendTimesheetEntry,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/timesheetEntryResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageAnyTimesheetEntry } from "@/lib/constants/timesheetEntry.constants";
import type { TimesheetEntry } from "@/types/timesheetEntry.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type EntryLookupResult =
  | { ok: true; entry: TimesheetEntry }
  | { ok: false; response: NextResponse };

/**
 * Fetches the entry being approved so it can be validated *before* calling
 * the backend's approve endpoint — mirroring the `fetchOwnedEntry` pattern in
 * the sibling `app/api/timesheet-entries/[id]/route.ts` (`PUT`/`DELETE`).
 *
 * Unlike that sibling helper, this deliberately does **not** reject the
 * request when `entry.userId !== currentUser.id`: a SystemAdmin/ProjectAdmin
 * (the only roles that reach this point — see the role check in `PUT` below)
 * is intentionally allowed to approve *any* user's entry, including their
 * own. See the "Self-approval is intentionally permitted" note in
 * `components/timesheets/TimesheetHistoryView.tsx` for the full rationale.
 * This fetch's job is narrower: confirm the entry actually exists and surface
 * a clean 404/409 instead of forwarding a raw backend error for an id that
 * was never valid to begin with.
 */
async function fetchEntryForApproval(id: string, accessToken: string): Promise<EntryLookupResult> {
  const response = await backendApiClient.get(`/TimesheetEntry/GetTimesheetEntryById/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const envelope = readBackendEnvelope(response.data);
  if (!envelope.isSuccess) {
    const { status, message } = resolveEnvelopeFailure(envelope, "Timesheet entry not found.", 404);
    return { ok: false, response: NextResponse.json({ message }, { status }) };
  }

  const entry = mapBackendTimesheetEntry(envelope.data);
  if (!entry) {
    return { ok: false, response: NextResponse.json({ message: "Timesheet entry not found." }, { status: 404 }) };
  }

  return { ok: true, entry };
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
 * Before calling the backend, `fetchEntryForApproval` confirms the entry
 * exists and is still pending (see that function's doc comment for why this
 * deliberately does not add an ownership restriction — a manager approving
 * their *own* pending entry is an intentional, explicitly requested
 * capability, not a gap): this gives a clean 404 for an unknown id and a 409
 * for a double-approve attempt without relying on the backend's raw error
 * shape for either case.
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
    const lookup = await fetchEntryForApproval(id, accessToken);
    if (!lookup.ok) return lookup.response;

    if (lookup.entry.isApproved) {
      return NextResponse.json(
        { message: "This timesheet entry has already been approved." },
        { status: 409 }
      );
    }

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
