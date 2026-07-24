import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendUpdateTimesheetEntryPayload } from "@/lib/server/backendPayloadMappers";
import {
  mapBackendTimesheetEntry,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/timesheetEntryResponseMappers";
import { updateTimesheetEntrySchema } from "@/lib/validators/timesheetEntry.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageAnyTimesheetEntry } from "@/lib/constants/timesheetEntry.constants";
import { canManagerActOnProjectEntry } from "@/lib/server/timesheetEntryAuthorization";
import type { AuthUser } from "@/types/auth.types";
import type { TimesheetEntry } from "@/types/timesheetEntry.types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type OwnedEntryResult =
  | { ok: true; entry: TimesheetEntry }
  | { ok: false; response: NextResponse };

/**
 * Fetches a timesheet entry by id and verifies the current user is either its
 * owner or a SystemAdmin/ProjectAdmin (see `lib/constants/timesheetEntry.constants.ts`
 * for why this ownership check exists — the documented backend contract does
 * not itself scope Timesheet Entry reads/writes to the owning user). Shared by
 * `GET`/`PUT`/`DELETE` below so ownership is enforced consistently.
 */
async function fetchOwnedEntry(
  id: string,
  accessToken: string,
  currentUser: AuthUser
): Promise<OwnedEntryResult> {
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
    return {
      ok: false,
      response: NextResponse.json({ message: "Timesheet entry not found." }, { status: 404 }),
    };
  }

  if (entry.userId !== currentUser.id && !canManageAnyTimesheetEntry(currentUser.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "You do not have permission to access this timesheet entry." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, entry };
}

async function resolveCurrentUser(accessToken: string): Promise<AuthUser | null> {
  const claims = decodeJwt(accessToken);
  return claims ? mapClaimsToAuthUser(claims) : null;
}

/**
 * GET /api/timesheet-entries/[id] — the owning user, or a SystemAdmin/ProjectAdmin,
 * may view a single timesheet entry (see `fetchOwnedEntry` above).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view this timesheet entry." },
      { status: 401 }
    );
  }

  const currentUser = await resolveCurrentUser(accessToken);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  try {
    const result = await fetchOwnedEntry(id, accessToken, currentUser);
    if (!result.ok) return result.response;

    return NextResponse.json({ data: result.entry }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load this timesheet entry.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * PUT /api/timesheet-entries/[id]
 * [Auth] Updates `Hours`/`TaskDescription` via `TimesheetEntry/UpdateTimesheetEntry`.
 * Only the owning user (or a SystemAdmin/ProjectAdmin) may edit an entry.
 *
 * Per the `bugs/exchange-rate` feature request ("if he updates it again then
 * re-approval required from PA"), an already-approved entry is *not*
 * rejected here — the backend's own documented contract for this endpoint
 * ("Timesheet entry updated successfully. Re-approval required." — see the
 * saved example in `docs/HR_System_BE.postman_collection.json`) already
 * resets the entry to pending as a result of this same call, so this Route
 * Handler simply forwards the update and lets that happen; the client-side
 * "only today's entries stay editable once approved" rule
 * (`components/timesheets/MyTimesheetView.tsx#isCellLocked`,
 * `components/timesheets/TimesheetHistoryView.tsx#canEditOwnEntry`) is a UX
 * constraint, not a server-enforced one.
 *
 * A manager editing *someone else's* entry (not their own) is additionally
 * scoped to projects they're assigned to, per `canManagerActOnProjectEntry`
 * (`lib/server/timesheetEntryAuthorization.ts`) — the `bugs/timesheet-history`
 * "own project (assigned user)" rule. `SystemAdmin` is exempt.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update this timesheet entry." },
      { status: 401 }
    );
  }

  const currentUser = await resolveCurrentUser(accessToken);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateTimesheetEntrySchema.safeParse(body);
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
    const result = await fetchOwnedEntry(id, accessToken, currentUser);
    if (!result.ok) return result.response;

    // "Own project (assigned user)" gate: a ProjectAdmin editing *someone
    // else's* entry must be an assigned resource on that entry's project
    // (see `lib/server/timesheetEntryAuthorization.ts`). Editing your own
    // entry is always allowed regardless.
    if (
      result.entry.userId !== currentUser.id &&
      !(await canManagerActOnProjectEntry(currentUser, result.entry.projectId, accessToken))
    ) {
      return NextResponse.json(
        { message: "You do not have permission to update this timesheet entry." },
        { status: 403 }
      );
    }

    const response = await backendApiClient.put(
      `/TimesheetEntry/UpdateTimesheetEntry/${id}`,
      toBackendUpdateTimesheetEntryPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the timesheet entry.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    // `TimesheetEntry/UpdateTimesheetEntry`'s saved example returns `Data: null`
    // (see docs/HR_System_BE.postman_collection.json), so there is no updated
    // record to forward — the client refetches the list instead.
    return NextResponse.json({ message: "Timesheet entry updated successfully." }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the timesheet entry. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/timesheet-entries/[id]
 * [Auth] Deletes a timesheet entry via `TimesheetEntry/DeleteTimesheetEntry`.
 * Same ownership rules as `PUT` above, but — unlike `PUT` — deleting an
 * already-approved entry is still rejected (409) below: the
 * `bugs/exchange-rate` feature request only asks for *editing* an approved
 * entry to trigger re-approval, not for approved entries to become
 * deletable. Note that `MyTimesheetView`'s "clear an entry's hours" action
 * calls this same endpoint, so clearing today's already-approved entry down
 * to empty hours still fails here with the 409 below (surfaced to the user
 * as a save error), even though editing its hours to a new non-empty value
 * is allowed.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this timesheet entry." },
      { status: 401 }
    );
  }

  const currentUser = await resolveCurrentUser(accessToken);
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  try {
    const result = await fetchOwnedEntry(id, accessToken, currentUser);
    if (!result.ok) return result.response;

    // "Own project (assigned user)" gate: a ProjectAdmin rejecting (deleting)
    // *someone else's* entry must be an assigned resource on that entry's
    // project (see `lib/server/timesheetEntryAuthorization.ts`). Deleting
    // your own entry is always allowed regardless.
    if (
      result.entry.userId !== currentUser.id &&
      !(await canManagerActOnProjectEntry(currentUser, result.entry.projectId, accessToken))
    ) {
      return NextResponse.json(
        { message: "You do not have permission to delete this timesheet entry." },
        { status: 403 }
      );
    }

    if (result.entry.isApproved) {
      return NextResponse.json(
        { message: "Approved timesheet entries cannot be deleted." },
        { status: 409 }
      );
    }

    const response = await backendApiClient.delete(`/TimesheetEntry/DeleteTimesheetEntry/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to delete the timesheet entry.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the timesheet entry. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
