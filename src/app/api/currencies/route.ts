import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendCurrency, mapBackendCurrencyList } from "@/lib/server/currencyResponseMappers";
import { toBackendCreateCurrencyPayload } from "@/lib/server/backendPayloadMappers";
import { createCurrencySchema } from "@/lib/validators/currency.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageCurrencies } from "@/lib/constants/currency.constants";

/**
 * GET /api/currencies
 * Read-only reference data backing the "Invoice Currency" dropdown on the
 * Generate Invoice form (`Invoice/GenerateInvoice` requires a `CurrencyId`)
 * as well as the full Administration > Currencies CRUD screen
 * (`/admin/currencies`, `components/currencies/CurrenciesListView.tsx`). Any
 * authenticated user may read this reference data, mirroring
 * `GET /api/resource-role-types` — only currency mutations below (and other
 * financial data) are role-gated.
 *
 * `Currency/GetAllCurrencies` is paginated per
 * `docs/HR_System_BE.postman_collection.json` (`?page=1&pageSize=20`); a
 * generously large `pageSize` is requested since neither consumer has
 * pagination UI of its own. Unlike the invoice-only version of this
 * endpoint, `isActive` is intentionally left unfiltered here so the
 * Administration screen can show (and re-activate) inactive currencies too —
 * per the wireframe's `/admin/currencies` table, which has a STATUS column.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view currencies." },
      { status: 401 }
    );
  }

  try {
    const response = await backendApiClient.get("/Currency/GetAllCurrencies", {
      params: { page: 1, pageSize: 100 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendCurrencyList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load currencies.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/currencies
 * [Auth][SystemAdmin] Creates a new currency via `Currency/CreateCurrency`.
 * The role check is enforced here (server-side, based on the decoded access
 * token) in addition to the page-level check — the backend remains the
 * ultimate authorization boundary and re-validates the role independently
 * (e.g. rejecting a second `IsBaseCurrency: true` currency).
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a currency." },
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
      { message: "You do not have permission to create currencies." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createCurrencySchema.safeParse(body);
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
      "/Currency/CreateCurrency",
      toBackendCreateCurrencyPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json(
      { data: mapBackendCurrency(response.data) ?? response.data },
      { status: 201 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the currency. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
