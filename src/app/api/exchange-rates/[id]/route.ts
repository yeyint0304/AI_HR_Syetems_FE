import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendUpdateExchangeRatePayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendExchangeRate } from "@/lib/server/exchangeRateResponseMappers";
import { updateExchangeRateSchema } from "@/lib/validators/exchangeRate.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageExchangeRates } from "@/lib/constants/exchangeRate.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/exchange-rates/[id]
 * [Auth][SystemAdmin] Updates Rate/EffectiveDate/IsActive via
 * `ExchangeRate/UpdateExchangeRate` (the currency pair is immutable once
 * created — see `docs/HR_System_BE.postman_collection.json`).
 *
 * `ExchangeRate/UpdateExchangeRate` wraps its payload in the standard
 * backend envelope (`{ StatusCode, IsSuccess, Message, Data }`) and, like
 * `Project/UpdateProject`, may signal a logical failure with
 * `IsSuccess: false` at HTTP 200 — the envelope is inspected explicitly so
 * that case surfaces as a proper error response instead of a false-positive
 * 200 (see `lib/server/projectResponseMappers.ts`'s sibling Route Handler
 * for the same pattern).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update this exchange rate." },
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

  if (!canManageExchangeRates(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to update exchange rates." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateExchangeRateSchema.safeParse(body);
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
      `/ExchangeRate/UpdateExchangeRate/${id}`,
      toBackendUpdateExchangeRatePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the exchange rate. Please try again.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const exchangeRate = mapBackendExchangeRate(envelope.data);
    if (!exchangeRate) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (matches `app/api/projects/[id]/route.ts`).
      logger.error("Unable to map backend exchange rate response after update", { id });
      return NextResponse.json(
        { message: "Unable to update the exchange rate. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: exchangeRate }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the exchange rate. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/exchange-rates/[id]
 * [Auth][SystemAdmin] Soft-deletes an exchange rate via
 * `ExchangeRate/DeleteExchangeRate`.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this exchange rate." },
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

  if (!canManageExchangeRates(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to delete exchange rates." },
      { status: 403 }
    );
  }

  try {
    await backendApiClient.delete(`/ExchangeRate/DeleteExchangeRate/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the exchange rate. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
