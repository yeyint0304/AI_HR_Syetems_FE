import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendCreateProjectPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendProject, mapBackendProjectList } from "@/lib/server/projectResponseMappers";
import { createProjectSchema } from "@/lib/validators/project.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";

/**
 * GET /api/projects
 * Any authenticated user may list projects — unlike `/api/auth/users`, the
 * `Projects` sidebar entry (`lib/constants/navigation.constants.ts`) is not
 * restricted to a single role, since regular Users also need to see projects
 * they're assigned to (e.g. to log timesheets against them).
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view projects." },
      { status: 401 }
    );
  }

  try {
    const response = await backendApiClient.get("/Project/GetProjectList", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendProjectList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load projects. Please try again.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/projects
 * [Auth][SystemAdmin|ProjectAdmin] Creates a new project via
 * `Project/CreateProject`. The role check is enforced here (server-side,
 * based on the decoded access token) in addition to the page-level check —
 * the backend remains the ultimate authorization boundary and re-validates
 * the role independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a project." },
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
      { message: "You do not have permission to create projects." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(body);
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
      "/Project/CreateProject",
      toBackendCreateProjectPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json({ data: mapBackendProject(response.data) ?? response.data }, { status: 201 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the project. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
