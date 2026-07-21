import { NextResponse } from "next/server";
import axios from "axios";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendUnassignedUserList } from "@/lib/server/authResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";

/**
 * GET /api/auth/unassigned-users
 * [Auth][SystemAdmin|ProjectAdmin] Read-only reference data backing the
 * "User" select box on the Project Assignments screen
 * (`Project/AssignResource` requires a `UserId`), sourced from
 * `Auth/GetUnassignedUsers` per `docs/HR_System_BE.postman_collection.json`.
 * Gated to the same `canManageProjects` roles as
 * `GET /api/projects/[id]/assignments` — regular users can't reach the
 * Assignments screen at all, so there's no reason to expose this list to
 * them either.
 *
 * Note: `Auth/GetUnassignedUsers` has no per-project parameter — it returns
 * users with *no* project assignment at all, backend-wide. A user already
 * assigned to a *different* project won't appear here even though they
 * could validly be added to this one too. This is a limitation of the
 * documented backend contract, not a bug in this Route Handler.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view unassigned users." },
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

  if (!canManageProjects(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to view unassigned users." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.get("/Auth/GetUnassignedUsers", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json(
      { data: mapBackendUnassignedUserList(response.data) },
      { status: 200 }
    );
  } catch (error) {
    // Some backend deployments respond 404 Not Found (rather than 200 with an
    // empty array) from `Auth/GetUnassignedUsers` when every user is already
    // assigned to a project — a valid "no results" outcome, not a real error.
    // Without this, the Project Assignments "Add User to Project" section
    // surfaced a scary "Unable to load users available to assign" error alert
    // instead of the friendly "no unassigned users available" empty state
    // that `ProjectAssignmentsView` already handles for a genuinely empty list.
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { status, message } = normalizeBackendError(error, "Unable to load unassigned users.");
    return NextResponse.json({ message }, { status });
  }
}
