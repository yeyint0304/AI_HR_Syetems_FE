import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendUpdateRateCardPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendRateCard } from "@/lib/server/rateCardResponseMappers";
import { updateRateCardSchema } from "@/lib/validators/rateCard.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageRateCards } from "@/lib/constants/rateCard.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/rate-cards/[id]
 * [Auth][SystemAdmin] Updates HourlyRate/BillingRate/EffectiveDate/IsActive
 * via `RateCard/UpdateRateCard` (country/role/currency are immutable once
 * created — see `docs/HR_System_BE.postman_collection.json`).
 *
 * `RateCard/UpdateRateCard` wraps its payload in the standard backend
 * envelope (`{ StatusCode, IsSuccess, Message, Data }`) and, like
 * `ExchangeRate/UpdateExchangeRate`, may signal a logical failure with
 * `IsSuccess: false` at HTTP 200 — the envelope is inspected explicitly so
 * that case surfaces as a proper error response instead of a false-positive
 * 200 (see `lib/server/exchangeRateResponseMappers.ts`'s sibling Route
 * Handler for the same pattern).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update this rate card." },
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

  if (!canManageRateCards(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to update rate cards." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateRateCardSchema.safeParse(body);
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
      `/RateCard/UpdateRateCard/${id}`,
      toBackendUpdateRateCardPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the rate card. Please try again.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const rateCard = mapBackendRateCard(envelope.data);
    if (!rateCard) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (matches `app/api/exchange-rates/[id]/route.ts`).
      logger.error("Unable to map backend rate card response after update", { id });
      return NextResponse.json(
        { message: "Unable to update the rate card. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: rateCard }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the rate card. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/rate-cards/[id]
 * [Auth][SystemAdmin] Soft-deletes a rate card via `RateCard/DeleteRateCard`.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this rate card." },
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

  if (!canManageRateCards(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to delete rate cards." },
      { status: 403 }
    );
  }

  try {
    await backendApiClient.delete(`/RateCard/DeleteRateCard/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the rate card. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
