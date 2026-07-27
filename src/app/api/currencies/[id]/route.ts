import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendUpdateCurrencyPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendCurrency } from "@/lib/server/currencyResponseMappers";
import { updateCurrencySchema } from "@/lib/validators/currency.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageCurrencies } from "@/lib/constants/currency.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/currencies/[id]
 * [Auth][SystemAdmin] Updates Name/Symbol/IsActive via
 * `Currency/UpdateCurrency` (the code and base-currency flag are immutable
 * once created — see `docs/HR_System_BE.postman_collection.json`).
 *
 * `Currency/UpdateCurrency` wraps its payload in the standard backend
 * envelope (`{ StatusCode, IsSuccess, Message, Data }`) and, like
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
      { message: "You must be signed in to update this currency." },
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

  if (!canManageCurrencies(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to update currencies." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateCurrencySchema.safeParse(body);
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
      `/Currency/UpdateCurrency/${id}`,
      toBackendUpdateCurrencyPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the currency. Please try again.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const currency = mapBackendCurrency(envelope.data);
    if (!currency) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (matches `app/api/exchange-rates/[id]/route.ts`).
      logger.error("Unable to map backend currency response after update", { id });
      return NextResponse.json(
        { message: "Unable to update the currency. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: currency }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the currency. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/currencies/[id]
 * [Auth][SystemAdmin] Soft-deletes a currency via `Currency/DeleteCurrency`.
 * The backend is expected to reject deleting the base currency or a currency
 * still referenced by exchange rates/rate cards/invoices with a 4xx + message
 * — `normalizeBackendError` forwards that message as-is so it surfaces via
 * `CurrenciesListView`'s inline `Alert` (there is no toast system in this
 * codebase; see the module docblock there for the wireframe's "blocked with
 * warning toast" note). The base currency itself has no Delete action at all
 * in the UI (`CurrenciesListView` hides it client-side, per the wireframe's
 * "SGD has no Delete button (protected)" note) — this is defense-in-depth
 * for a request bypassing the UI.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this currency." },
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

  if (!canManageCurrencies(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to delete currencies." },
      { status: 403 }
    );
  }

  try {
    await backendApiClient.delete(`/Currency/DeleteCurrency/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the currency. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
