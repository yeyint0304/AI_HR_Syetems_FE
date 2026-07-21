import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendCurrencyList } from "@/lib/server/currencyResponseMappers";

/**
 * GET /api/currencies
 * Read-only reference data backing the "Invoice Currency" dropdown on the
 * Generate Invoice form (`Invoice/GenerateInvoice` requires a `CurrencyId`).
 * Any authenticated user may read this reference data, mirroring
 * `GET /api/resource-role-types` — only invoice mutations (and other
 * financial data) are role-gated.
 *
 * `Currency/GetAllCurrencies` is paginated per
 * `docs/HR_System_BE.postman_collection.json` (`?page=1&pageSize=20`); a
 * generously large `pageSize` is requested since this dropdown has no
 * pagination UI of its own, and `isActive=true` filters out retired
 * currencies that shouldn't be offered for new invoices.
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
      params: { isActive: true, page: 1, pageSize: 100 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendCurrencyList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load currencies.");
    return NextResponse.json({ message }, { status });
  }
}
