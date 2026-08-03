import { backendApiClient } from "@/lib/server/backendApiClient";
import { mapBackendAssignmentList } from "@/lib/server/projectResponseMappers";
import { getUserRoleName } from "@/lib/server/userRoleDirectory";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import { isProjectScopedTimesheetManager } from "@/lib/constants/timesheetEntry.constants";
import type { AuthUser } from "@/types/auth.types";

/** Minimal shape this module needs from a `TimesheetEntry` — avoids a hard dependency on the full DTO. */
interface ReviewableEntry {
  userId: string;
  projectId: string;
}

/**
 * Server-side counterpart of `components/timesheets/TimesheetHistoryView.tsx`'s
 * Approve/Reject gating rules (see that component's doc comment, "Manager
 * approval workflow" and "Project-assignment scope for Approve/Reject",
 * for the full rationale). This is a defense-in-depth check per
 * `CLAUDE.md`'s three-layer auth model — the UI hides Approve/Reject for
 * anything this function would reject, but
 * `docs/HR_System_BE.postman_collection.json`'s
 * `TimesheetEntry/ApproveTimesheetEntry`/`DeleteTimesheetEntry` are
 * documented only as `[Auth]` with no ownership/role check of their own, so
 * nothing stops a manager from calling this app's API directly for an entry
 * the UI never let them act on, unless a Route Handler closes the gap.
 *
 * Enforces, in order, three independent rules from the `feature/user-deactivate`
 * request "System Admin and Project Admin cannot approve or reject their own
 * timesheet... For Project Admin, their timesheet can only be approved by
 * other Project Admins or System Admins. For System Admin, their timesheet
 * can only be approved by other System Admins":
 *
 *   1. **Never your own entry.** A manager may never approve/reject an entry
 *      they own themselves — self-review is no longer permitted (this
 *      reverses the previous "self-approval is intentionally permitted"
 *      behavior).
 *   2. **A `SystemAdmin`'s entry can only be approved by another `SystemAdmin`.**
 *      A `ProjectAdmin` is blocked here even for a project they manage — this
 *      is the one case where `ProjectAdmin`'s otherwise project-scoped
 *      authority isn't enough. Resolved via `getUserRoleName`
 *      (`lib/server/userRoleDirectory.ts`), since none of the Timesheet Entry
 *      endpoints return the owner's *system* role (only their name).
 *   3. **`ProjectAdmin`'s existing "own project (assigned user)" scope.**
 *      Unchanged from before: a `ProjectAdmin` may act on any other
 *      non-`SystemAdmin` entry only for a project they are an assigned
 *      resource on; `SystemAdmin` is exempt from this (and rule 2, being
 *      itself the only role rule 2 ever allows through for a `SystemAdmin`-owned
 *      entry).
 */
export async function canApproverActOnEntry(
  currentUser: AuthUser,
  entry: ReviewableEntry,
  accessToken: string
): Promise<boolean> {
  // Rule 1: never your own entry, regardless of role.
  if (entry.userId === currentUser.id) return false;

  if (currentUser.role === USER_ROLES.SYSTEM_ADMIN) return true;
  if (!isProjectScopedTimesheetManager(currentUser.role)) return false;

  // Rule 2: a ProjectAdmin may never act on a SystemAdmin's entry.
  const ownerRoleName = await getUserRoleName(entry.userId, accessToken);
  if (ownerRoleName === USER_ROLES.SYSTEM_ADMIN) return false;

  // Rule 3: the pre-existing "own project (assigned user)" scope.
  const response = await backendApiClient.get(`/Project/GetProjectAssignments/${entry.projectId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const assignments = mapBackendAssignmentList(response.data);
  return assignments.some((assignment) => assignment.userId === currentUser.id);
}
