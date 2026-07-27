import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { mapBackendCountry, mapBackendCountryList } from "@/lib/server/countryResponseMappers";
import { toBackendCreateCountryPayload } from "@/lib/server/backendPayloadMappers";
import { createCountrySchema } from "@/lib/validators/country.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageCountries } from "@/lib/constants/country.constants";

/**
 * GET /api/countries
 * Read-only reference data backing the "Country" dropdown on the Create User
 * (`Auth/CreateUser`), Update Profile (`Auth/UpdateProfile`), and Rate Card
 * forms, as well as the full Administration > Countries CRUD screen
 * (`/admin/countries`, `components/countries/CountriesListView.tsx`). Any
 * authenticated user may read this reference data, mirroring
 * `GET /api/currencies` and `GET /api/resource-role-types` — only
 * user-management mutations and the country mutations below are role-gated
 * (enforced by the backend and, for Create User, by
 * `(dashboard)/admin/users/new/page.tsx`'s SystemAdmin redirect).
 *
 * `Country/GetAllCountries` is paginated per
 * `docs/HR_System_BE.postman_collection.json` (`?page=1&pageSize=20`); a
 * generously large `pageSize` is requested since none of this endpoint's
 * consumers have pagination UI of their own.
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

/**
 * POST /api/countries
 * [Auth][SystemAdmin] Creates a new country via `Country/CreateCountry`. The
 * role check is enforced here (server-side, based on the decoded access
 * token) in addition to the page-level check — the backend remains the
 * ultimate authorization boundary and re-validates the role independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a country." },
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
      { message: "You do not have permission to create countries." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createCountrySchema.safeParse(body);
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
      "/Country/CreateCountry",
      toBackendCreateCountryPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json(
      { data: mapBackendCountry(response.data) ?? response.data },
      { status: 201 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the country. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
