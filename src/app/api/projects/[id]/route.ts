import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendUpdateProjectPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendProject } from "@/lib/server/projectResponseMappers";
import { updateProjectSchema } from "@/lib/validators/project.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/projects/[id] — any authenticated user may view a single project (see `GET /api/projects`). */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view this project." },
      { status: 401 }
    );
  }

  try {
    const response = await backendApiClient.get(`/Project/GetProject/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const project = mapBackendProject(response.data);
    if (!project) {
      return NextResponse.json({ message: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ data: project }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load this project.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * PUT /api/projects/[id]
 * [Auth][SystemAdmin|ProjectAdmin] Updates a project via `Project/UpdateProject`
 * (also used for "Deactivate project", which submits `isActive: false`).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update this project." },
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
      { message: "You do not have permission to update projects." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateProjectSchema.safeParse(body);
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
    const response = await backendApiClient.put(
      `/Project/UpdateProject/${id}`,
      toBackendUpdateProjectPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json({ data: mapBackendProject(response.data) ?? response.data }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the project. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/projects/[id]
 * [Auth][SystemAdmin|ProjectAdmin] Hard-deletes a project via `Project/DeleteProject`.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this project." },
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
      { message: "You do not have permission to delete projects." },
      { status: 403 }
    );
  }

  try {
    await backendApiClient.delete(`/Project/DeleteProject/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the project. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
