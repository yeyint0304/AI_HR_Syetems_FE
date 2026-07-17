import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";

interface RouteParams {
  params: Promise<{ id: string; assignmentId: string }>;
}

/**
 * DELETE /api/projects/[id]/assignments/[assignmentId]
 * [Auth][SystemAdmin|ProjectAdmin] Removes a resource assignment via
 * `Project/RemoveResource`.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id, assignmentId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to remove this assignment." },
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
      { message: "You do not have permission to remove assignments." },
      { status: 403 }
    );
  }

  try {
    await backendApiClient.delete(`/Project/RemoveResource/${id}/${assignmentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to remove this assignment. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
