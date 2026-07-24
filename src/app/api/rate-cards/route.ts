import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendCreateRateCardPayload } from "@/lib/server/backendPayloadMappers";
import { mapBackendRateCard, mapBackendRateCardList } from "@/lib/server/rateCardResponseMappers";
import { createRateCardSchema, rateCardListQuerySchema } from "@/lib/validators/rateCard.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageRateCards } from "@/lib/constants/rateCard.constants";

/**
 * GET /api/rate-cards?countryId=&resourceRoleTypeId=&currencyId=&isActive=
 * [Auth][SystemAdmin] Lists rate cards via `RateCard/GetAllRateCards`, per
 * `docs/HR_System_BE.postman_collection.json`'s "Rate Card" folder.
 * Restricted to SystemAdmin — matching the `/admin/rate-cards` sidebar
 * entry's `requiredRole` (`lib/constants/navigation.constants.ts`), same as
 * `/api/exchange-rates`.
 *
 * `RateCard/GetAllRateCards` is paginated (see the saved Postman example); a
 * generously large `pageSize` is requested since this admin table has no
 * pagination UI of its own (matching `/api/exchange-rates`'s convention).
 * All filters are optional and forwarded as-is when present.
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view rate cards." },
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
      { message: "You do not have permission to view rate cards." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = rateCardListQuerySchema.safeParse({
    countryId: searchParams.get("countryId") ?? undefined,
    resourceRoleTypeId: searchParams.get("resourceRoleTypeId") ?? undefined,
    currencyId: searchParams.get("currencyId") ?? undefined,
    isActive: searchParams.get("isActive") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid query parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { countryId, resourceRoleTypeId, currencyId, isActive } = parsedQuery.data;

  try {
    const response = await backendApiClient.get("/RateCard/GetAllRateCards", {
      params: {
        page: 1,
        pageSize: 100,
        ...(countryId ? { countryId } : {}),
        ...(resourceRoleTypeId ? { resourceRoleTypeId } : {}),
        ...(currencyId ? { currencyId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return NextResponse.json({ data: mapBackendRateCardList(response.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load rate cards. Please try again.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/rate-cards
 * [Auth][SystemAdmin] Creates a new rate card via `RateCard/CreateRateCard`.
 * The role check is enforced here (server-side, based on the decoded access
 * token) in addition to the page-level check — the backend remains the
 * ultimate authorization boundary and re-validates the role independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a rate card." },
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
      { message: "You do not have permission to create rate cards." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createRateCardSchema.safeParse(body);
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
      "/RateCard/CreateRateCard",
      toBackendCreateRateCardPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json(
      { data: mapBackendRateCard(response.data) ?? response.data },
      { status: 201 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the rate card. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
