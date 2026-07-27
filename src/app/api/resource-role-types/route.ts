import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendResourceRoleType,
  mapBackendResourceRoleTypeList,
} from "@/lib/server/projectResponseMappers";
import { toBackendCreateResourceRoleTypePayload } from "@/lib/server/backendPayloadMappers";
import { createResourceRoleTypeSchema } from "@/lib/validators/resourceRoleType.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageResourceRoleTypes } from "@/lib/constants/resourceRoleType.constants";

/**
 * GET /api/resource-role-types
 * Read-only reference data backing the "Resource role" dropdown on the
 * Project Assignments and Rate Card screens (`Project/AssignResource` /
 * `RateCard/CreateRateCard` both require a `ResourceRoleTypeId`), as well as
 * the full Administration > Resource Role Types CRUD screen
 * (`/admin/resource-role-types`,
 * `components/resourceRoleTypes/ResourceRoleTypesListView.tsx`). Any
 * authenticated user may read reference data — only the mutations below are
 * role-gated.
 *
 * `ResourceRoleType/GetAllResourceRoleTypes` is paginated per
 * `docs/HR_System_BE.postman_collection.json` (`?page=1&pageSize=20`); a
 * generously large `pageSize` is requested since none of this endpoint's
 * consumers have pagination UI of their own.
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

/**
 * POST /api/resource-role-types
 * [Auth][SystemAdmin] Creates a new resource role type via
 * `ResourceRoleType/CreateResourceRoleType`. The role check is enforced here
 * (server-side, based on the decoded access token) in addition to the
 * page-level check — the backend remains the ultimate authorization boundary
 * and re-validates the role independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a resource role type." },
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

  if (!canManageResourceRoleTypes(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to create resource role types." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createResourceRoleTypeSchema.safeParse(body);
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
    const response = await backendApiClient.post(
      "/ResourceRoleType/CreateResourceRoleType",
      toBackendCreateResourceRoleTypePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json(
      { data: mapBackendResourceRoleType(response.data) ?? response.data },
      { status: 201 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the resource role type. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
