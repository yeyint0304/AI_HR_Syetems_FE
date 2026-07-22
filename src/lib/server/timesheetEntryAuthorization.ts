import { backendApiClient } from "@/lib/server/backendApiClient";
import { mapBackendAssignmentList } from "@/lib/server/projectResponseMappers";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import { isProjectScopedTimesheetManager } from "@/lib/constants/timesheetEntry.constants";
import type { AuthUser } from "@/types/auth.types";

/**
 * Server-side counterpart of `components/timesheets/TimesheetHistoryView.tsx`'s
 * "own project (assigned user)" gate on Approve/Reject/Edit-of-another's-entry
 * (see that component's doc comment for the full rationale, added for the
 * `bugs/timesheet-history` feature request: "if not his own project (not
 * assign user) then don't add any action for it").
 *
 * This is a defense-in-depth check per `CLAUDE.md`'s three-layer auth model —
 * the UI hides Approve/Reject/Edit for a `ProjectAdmin` who isn't assigned to
 * an entry's project, but `docs/HR_System_BE.postman_collection.json`'s
 * `TimesheetEntry/ApproveTimesheetEntry`/`UpdateTimesheetEntry`/`DeleteTimesheetEntry`
 * are documented only as `[Auth]` with no project-membership check of their
 * own, so nothing stops a `ProjectAdmin` from calling this app's API directly
 * for a project they don't manage unless a Route Handler closes the gap.
 *
 * Only ever consulted for entries that are **not** the caller's own (callers
 * always retain the ability to act on their own entries) and only restricts
 * `ProjectAdmin` — `SystemAdmin` is exempt, consistent with its unrestricted
 * authority everywhere else in this app (e.g. `ADMIN_ROUTE_PREFIX`).
 */
export async function canManagerActOnProjectEntry(
  currentUser: AuthUser,
  projectId: string,
  accessToken: string
): Promise<boolean> {
  if (currentUser.role === USER_ROLES.SYSTEM_ADMIN) return true;
  if (!isProjectScopedTimesheetManager(currentUser.role)) return false;

  const response = await backendApiClient.get(`/Project/GetProjectAssignments/${projectId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const assignments = mapBackendAssignmentList(response.data);
  return assignments.some((assignment) => assignment.userId === currentUser.id);
}
