import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendAssignResourcePayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendAssignment, mapBackendAssignmentList } from "@/lib/server/projectResponseMappers";
import { assignResourceSchema } from "@/lib/validators/project.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageProjects } from "@/lib/constants/project.constants";
import { logger } from "@/lib/utils/logger";

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
 *
 * Like `Project/GetProject` and `TimesheetPeriod/GetTimesheetPeriodById`,
 * this endpoint can signal a *logical* failure — e.g. the target user is
 * already assigned to a project — via the standard envelope
 * (`{ StatusCode: 409, IsSuccess: false, Message: "User is already
 * assigned to a project." }`) at HTTP 200, which axios does not treat as a
 * thrown error. Previously this handler skipped the envelope check
 * entirely: `mapBackendAssignment` already returned `null` for that
 * `IsSuccess: false` shape, but the code silently fell back to the *raw*
 * envelope (`?? response.data`) and still replied with `201 Created` — so
 * the "user already assigned" conflict was swallowed and the UI reported a
 * false success. The envelope is now inspected explicitly (mirroring
 * `app/api/projects/[id]/route.ts`'s PUT handler) so this surfaces as a
 * proper 409 with the backend's message instead.
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

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to assign the user. Please try again.",
        409
      );
      return NextResponse.json({ message }, { status });
    }

    const assignment = mapBackendAssignment(envelope.data);
    if (!assignment) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (same discipline as
      // `app/api/projects/[id]/route.ts`'s PUT handler).
      logger.error("Unable to map backend assignment response after AssignResource", { projectId: id });
      return NextResponse.json(
        { message: "Unable to assign the user. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to assign the user. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
