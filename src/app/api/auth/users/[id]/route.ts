import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendUpdateUserPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendUserListItem } from "@/lib/server/authResponseMappers";
import { updateUserSchema } from "@/lib/validators/auth.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/auth/users/[id]
 * [Auth][SystemAdmin] Updates an existing user via `Auth/UpdateUser/{id}`,
 * backing the "Edit" action on the `/admin/users` "User Management" table
 * (`docs/HR_System_FE_wireframe.pdf`: "table shows all... users with role
 * badges... Actions: Edit"). Restricted to SystemAdmin, matching
 * `GET /api/auth/users` and the `Administration` sidebar section's
 * `requiredRole` (`lib/constants/navigation.constants.ts`) — enforced here
 * (server-side, from the decoded access token) in addition to the
 * `proxy.ts` route-level gate and the page-level check; the backend remains
 * the ultimate authorization boundary and re-validates the role
 * independently.
 *
 * `Auth/UpdateUser` wraps its payload in the standard backend envelope
 * (`{ StatusCode, IsSuccess, Message, Data }`) and, like
 * `Country/UpdateCountry`, may signal a logical failure with
 * `IsSuccess: false` at HTTP 200 — the envelope is inspected explicitly so
 * that case surfaces as a proper error response instead of a false-positive
 * 200 (see `app/api/countries/[id]/route.ts`'s sibling handler for the same
 * pattern). The response's `Data` shape (`UserId`/`Username`/`Email`/
 * `FirstName`/`LastName`/`EmployeeId`/`CountryId`/`IsActive`/`RoleName`) is a
 * subset of `Auth/GetUserList`'s per-item shape, so `mapBackendUserListItem`
 * is reused rather than duplicating a near-identical mapper.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update this user." },
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
      { message: "You do not have permission to update users." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
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
      `/Auth/UpdateUser/${id}`,
      toBackendUpdateUserPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the user. Please try again.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const user = mapBackendUserListItem(envelope.data);
    if (!user) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (matches `app/api/countries/[id]/route.ts`).
      logger.error("Unable to map backend user response after update", { id });
      return NextResponse.json(
        { message: "Unable to update the user. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: user }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the user. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
