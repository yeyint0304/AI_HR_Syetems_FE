import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendResourceRoleTypeList } from "@/lib/server/projectResponseMappers";

/**
 * GET /api/resource-role-types
 * Read-only reference data backing the "Resource role" dropdown on the
 * Project Assignments screen (`Project/AssignResource` requires a
 * `ResourceRoleTypeId`). Any authenticated user may read reference data —
 * only project/assignment mutations are role-gated.
 *
 * `ResourceRoleType/GetAllResourceRoleTypes` is paginated per
 * `docs/HR_System_BE.postman_collection.json` (`?page=1&pageSize=20`); a
 * generously large `pageSize` is requested since this dropdown has no
 * pagination UI of its own.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view resource role types." },
      { status: 401 }
    );
  }

  try {
    const response = await backendApiClient.get("/ResourceRoleType/GetAllResourceRoleTypes", {
      params: { page: 1, pageSize: 100 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendResourceRoleTypeList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load resource role types.");
    return NextResponse.json({ message }, { status });
  }
}
