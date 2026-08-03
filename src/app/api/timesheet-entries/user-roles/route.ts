import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { fetchUserRoleDirectory } from "@/lib/server/userRoleDirectory";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageAnyTimesheetEntry } from "@/lib/constants/timesheetEntry.constants";

/**
 * GET /api/timesheet-entries/user-roles
 * [Auth][SystemAdmin|ProjectAdmin] Read-only `{ userId, roleName }[]` lookup
 * of every user's *system* role, backing
 * `components/timesheets/TimesheetHistoryView.tsx`'s client-side Approve/Reject
 * button gating for the `feature/user-deactivate` rule "a System Admin's
 * timesheet can only be approved by other System Admins" — a `ProjectAdmin`
 * needs to know whether a given entry's owner is a `SystemAdmin` before
 * showing those buttons, and none of the Timesheet Entry endpoints return
 * that (see `lib/server/userRoleDirectory.ts` for the full rationale and the
 * authoritative server-side enforcement of the same rule, in
 * `lib/server/timesheetEntryAuthorization.ts#canApproverActOnEntry`, which
 * this route's data merely mirrors for the UI).
 *
 * Restricted to `canManageAnyTimesheetEntry` roles (defense-in-depth,
 * OWASP A01) — a plain Employee never sees Approve/Reject at all, so has no
 * legitimate use for this data. A `SystemAdmin` viewer doesn't strictly need
 * it either (their own Approve/Reject authority is otherwise unrestricted),
 * but the route stays open to both manager roles for simplicity.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "You must be signed in to view this data." }, { status: 401 });
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
      { message: "You do not have permission to view this data." },
      { status: 403 }
    );
  }

  try {
    const directory = await fetchUserRoleDirectory(accessToken);
    return NextResponse.json({ data: directory }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load user roles.");
    return NextResponse.json({ message }, { status });
  }
}
