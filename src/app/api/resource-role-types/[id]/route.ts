import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendUpdateResourceRoleTypePayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendResourceRoleType } from "@/lib/server/projectResponseMappers";
import { updateResourceRoleTypeSchema } from "@/lib/validators/resourceRoleType.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageResourceRoleTypes } from "@/lib/constants/resourceRoleType.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/resource-role-types/[id]
 * [Auth][SystemAdmin] Updates Name/Description via
 * `ResourceRoleType/UpdateResourceRoleType`.
 *
 * `ResourceRoleType/UpdateResourceRoleType` wraps its payload in the standard
 * backend envelope (`{ StatusCode, IsSuccess, Message, Data }`) and, like
 * `ExchangeRate/UpdateExchangeRate`, may signal a logical failure with
 * `IsSuccess: false` at HTTP 200 — the envelope is inspected explicitly so
 * that case surfaces as a proper error response instead of a false-positive
 * 200 (see `app/api/exchange-rates/[id]/route.ts`'s sibling handler for the
 * same pattern).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update this resource role type." },
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
      { message: "You do not have permission to update resource role types." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateResourceRoleTypeSchema.safeParse(body);
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
      `/ResourceRoleType/UpdateResourceRoleType/${id}`,
      toBackendUpdateResourceRoleTypePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the resource role type. Please try again.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const resourceRoleType = mapBackendResourceRoleType(envelope.data);
    if (!resourceRoleType) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (matches `app/api/exchange-rates/[id]/route.ts`).
      logger.error("Unable to map backend resource role type response after update", { id });
      return NextResponse.json(
        { message: "Unable to update the resource role type. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: resourceRoleType }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the resource role type. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/resource-role-types/[id]
 * [Auth][SystemAdmin] Soft-deletes a resource role type via
 * `ResourceRoleType/DeleteResourceRoleType`.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this resource role type." },
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
      { message: "You do not have permission to delete resource role types." },
      { status: 403 }
    );
  }

  try {
    await backendApiClient.delete(`/ResourceRoleType/DeleteResourceRoleType/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the resource role type. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
