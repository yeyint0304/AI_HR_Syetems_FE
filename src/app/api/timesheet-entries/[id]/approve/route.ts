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
import { canApproverActOnEntry } from "@/lib/server/timesheetEntryAuthorization";
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
 * request based on ownership itself — ownership (and every other
 * Approve/Reject authorization rule) is `canApproverActOnEntry`'s job, called
 * separately in `PUT` below once the entry is known to exist. This fetch's
 * job is narrower: confirm the entry actually exists and surface a clean
 * 404/409 instead of forwarding a raw backend error for an id that was never
 * valid to begin with.
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
 * exists and is still pending: this gives a clean 404 for an unknown id and a
 * 409 for a double-approve attempt without relying on the backend's raw
 * error shape for either case.
 *
 * The backend's saved success example only returns
 * `{ Id, IsApproved, ApprovedAt, ApprovedBy }` — not the full entry shape
 * `mapBackendTimesheetEntry` requires (`userId`/`projectId`/`timesheetPeriodId`/
 * `entryDate`), so — like `PUT /api/timesheet-entries/[id]` for
 * `UpdateTimesheetEntry` — no updated record is returned here; the client
 * refetches the list (`useApproveTimesheetEntry`'s cache invalidation
 * handles this).
 *
 * On top of the role check above, every approval additionally requires
 * `canApproverActOnEntry` (`lib/server/timesheetEntryAuthorization.ts`),
 * which enforces: never your own entry; a `SystemAdmin`'s entry may only be
 * approved by another `SystemAdmin`; and a `ProjectAdmin` must be an assigned
 * resource on that entry's project for anyone else's (`SystemAdmin` is exempt
 * from the last two). See that function's doc comment for the full rationale.
 * The self-ownership case is checked here first for a clearer, dedicated
 * error message.
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

    // Rule 1 (see `canApproverActOnEntry`'s doc comment): a manager may never
    // approve their own entry. Checked first, separately, for a clearer error
    // message than the generic project-scope 403 below.
    if (lookup.entry.userId === currentUser.id) {
      return NextResponse.json(
        { message: "You cannot approve your own timesheet entry." },
        { status: 403 }
      );
    }

    // Remaining rules — a SystemAdmin's entry may only be approved by another
    // SystemAdmin, and a ProjectAdmin must be an assigned resource on that
    // entry's project for anyone else's — see
    // `lib/server/timesheetEntryAuthorization.ts` for the full rationale.
    if (!(await canApproverActOnEntry(currentUser, lookup.entry, accessToken))) {
      return NextResponse.json(
        { message: "You do not have permission to approve this timesheet entry." },
        { status: 403 }
      );
    }

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
