import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendAssignResourcePayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendAssignment, mapBackendAssignmentList } from "@/lib/server/projectResponseMappers";
import { assignResourceSchema } from "@/lib/validators/project.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/assignments
 * [Auth][SystemAdmin|ProjectAdmin] Lists resource assignments via
 * `Project/GetProjectAssignments`.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view assignments." },
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
      { message: "You do not have permission to view assignments." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.get(`/Project/GetProjectAssignments/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendAssignmentList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load assignments.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/projects/[id]/assignments
 * [Auth][SystemAdmin|ProjectAdmin] Assigns a user to the project via
 * `Project/AssignResource`.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to assign a user." },
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
      { message: "You do not have permission to assign users." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = assignResourceSchema.safeParse(body);
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
      `/Project/AssignResource/${id}`,
      toBackendAssignResourcePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json(
      { data: mapBackendAssignment(response.data) ?? response.data },
      { status: 201 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to assign the user. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
