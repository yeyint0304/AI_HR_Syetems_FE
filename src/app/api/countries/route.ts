import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendCountryList } from "@/lib/server/countryResponseMappers";

/**
 * GET /api/countries
 * Read-only reference data backing the "Country" dropdown on the Create User
 * (`Auth/CreateUser`) and Update Profile (`Auth/UpdateProfile`) forms, both of
 * which accept an optional `CountryId`. Any authenticated user may read this
 * reference data, mirroring `GET /api/currencies` and
 * `GET /api/resource-role-types` — only user-management mutations are
 * role-gated (enforced by the backend and, for Create User, by
 * `(dashboard)/admin/users/new/page.tsx`'s SystemAdmin redirect).
 *
 * `Country/GetAllCountries` is paginated per
 * `docs/HR_System_BE.postman_collection.json` (`?page=1&pageSize=20`); a
 * generously large `pageSize` is requested since this dropdown has no
 * pagination UI of its own.
 */
export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view countries." },
      { status: 401 }
    );
  }

  try {
    const response = await backendApiClient.get("/Country/GetAllCountries", {
      params: { page: 1, pageSize: 100 },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendCountryList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load countries.");
    return NextResponse.json({ message }, { status });
  }
}
