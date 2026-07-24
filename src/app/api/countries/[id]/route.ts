import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendUpdateCountryPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendCountry } from "@/lib/server/countryResponseMappers";
import { updateCountrySchema } from "@/lib/validators/country.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageCountries } from "@/lib/constants/country.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/countries/[id]
 * [Auth][SystemAdmin] Updates the `Name` of an existing country via
 * `Country/UpdateCountry` (the code is immutable once created — see
 * `docs/HR_System_BE.postman_collection.json`).
 *
 * `Country/UpdateCountry` wraps its payload in the standard backend envelope
 * (`{ StatusCode, IsSuccess, Message, Data }`) and, like
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
      { message: "You must be signed in to update this country." },
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

  if (!canManageCountries(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to update countries." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateCountrySchema.safeParse(body);
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
      `/Country/UpdateCountry/${id}`,
      toBackendUpdateCountryPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the country. Please try again.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const country = mapBackendCountry(envelope.data);
    if (!country) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (matches `app/api/exchange-rates/[id]/route.ts`).
      logger.error("Unable to map backend country response after update", { id });
      return NextResponse.json(
        { message: "Unable to update the country. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: country }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the country. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/countries/[id]
 * [Auth][SystemAdmin] Soft-deletes a country via `Country/DeleteCountry`.
 * Per the wireframe (`docs/HR_System_FE_wireframe.pdf`: "Delete Singapore ->
 * blocked with warning toast" / "Delete country with rate cards -> modal
 * explains why"), the backend is expected to reject deleting a country still
 * referenced by rate cards or users with a 4xx + message —
 * `normalizeBackendError` forwards that message as-is. `CountriesListView`
 * additionally pre-checks the client-side rate-card count (derived from
 * `useRateCardList`) and shows a blocking explanatory dialog *before* even
 * attempting the request when it already knows the country is in use — this
 * route remains the defense-in-depth backstop for any request that bypasses
 * that client-side check (there is no toast system in this codebase; both
 * paths surface their message via an inline `Alert`/`Modal`, matching every
 * other admin screen).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this country." },
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

  if (!canManageCountries(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to delete countries." },
      { status: 403 }
    );
  }

  try {
    await backendApiClient.delete(`/Country/DeleteCountry/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the country. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
