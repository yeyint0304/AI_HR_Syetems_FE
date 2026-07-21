import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendRoleList } from "@/lib/server/authResponseMappers";

/**
 * GET /api/auth/roles
 * Read-only reference data backing the "Role" select box on the Create User
 * screen (`Auth/CreateUser` requires a `RoleId`). Sourced from
 * `Auth/GetRoles` per `docs/HR_System_BE.postman_collection.json`.
 *
 * Any authenticated user may read this reference data — only the
 * user-creation mutation itself is SystemAdmin-gated (see
 * `POST /api/auth/users`), mirroring the same "reference data is open,
 * mutations are role-gated" convention already used for
 * `GET /api/resource-role-types`.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view roles." },
      { status: 401 }
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
