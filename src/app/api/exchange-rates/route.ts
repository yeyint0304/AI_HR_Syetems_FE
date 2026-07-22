import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendCreateExchangeRatePayload } from "@/lib/server/backendPayloadMappers";
import {
  mapBackendExchangeRate,
  mapBackendExchangeRateList,
} from "@/lib/server/exchangeRateResponseMappers";
import { createExchangeRateSchema } from "@/lib/validators/exchangeRate.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageExchangeRates } from "@/lib/constants/exchangeRate.constants";

/**
 * GET /api/exchange-rates
 * [Auth][SystemAdmin] Lists active exchange rates via
 * `ExchangeRate/GetAllExchangeRates`, per
 * `docs/HR_System_BE.postman_collection.json`'s "Exchange Rate" folder.
 * Restricted to SystemAdmin — matching the `/admin/exchange-rates` sidebar
 * entry's `requiredRole` (`lib/constants/navigation.constants.ts`) — unlike
 * `/api/currencies` or `/api/resource-role-types`, which are general
 * reference data readable by any authenticated user.
 *
 * `ExchangeRate/GetAllExchangeRates` is paginated (see the saved Postman
 * example); a generously large `pageSize` is requested since this admin
 * table has no pagination UI of its own, and `isActive=true` hides
 * soft-deleted rates (`DELETE /api/exchange-rates/[id]` soft-deletes).
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view exchange rates." },
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
      { message: "You do not have permission to view exchange rates." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.get("/ExchangeRate/GetAllExchangeRates", {
      params: { isActive: true, page: 1, pageSize: 100 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendExchangeRateList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to load exchange rates. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/exchange-rates
 * [Auth][SystemAdmin] Creates a new exchange rate via
 * `ExchangeRate/CreateExchangeRate`. The role check is enforced here
 * (server-side, based on the decoded access token) in addition to the
 * page-level check — the backend remains the ultimate authorization
 * boundary and re-validates the role independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create an exchange rate." },
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
      { message: "You do not have permission to create exchange rates." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createExchangeRateSchema.safeParse(body);
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
      "/ExchangeRate/CreateExchangeRate",
      toBackendCreateExchangeRatePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json(
      { data: mapBackendExchangeRate(response.data) ?? response.data },
      { status: 201 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the exchange rate. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
