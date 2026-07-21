import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendRoleList } from "@/lib/server/authResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";

/**
 * GET /api/auth/roles
 * [Auth][SystemAdmin] Read-only reference data backing the "Role" select box
 * on the Create User screen (`Auth/CreateUser` requires a `RoleId`). Sourced
 * from `Auth/GetRoles` per `docs/HR_System_BE.postman_collection.json`.
 *
 * Gated to `SystemAdmin` — its only consumer, `CreateUserForm`, is itself
 * rendered on the SystemAdmin-only `/admin/users/new` screen, and the role
 * `description` field describes privilege scope (e.g. "Full system access
 * including configuration and user management"), so it shouldn't be
 * enumerable by non-admin authenticated users even though they have no
 * legitimate UI path to this endpoint. Unlike genuinely operationally-neutral
 * reference data (`/api/currencies`, `/api/resource-role-types`), this list
 * maps directly to the app's privilege-escalation surface.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view roles." },
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

  if (currentUser.role !== USER_ROLES.SYSTEM_ADMIN) {
    return NextResponse.json(
      { message: "You do not have permission to view roles." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.get("/Auth/GetRoles", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendRoleList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load roles.");
    return NextResponse.json({ message }, { status });
  }
}
