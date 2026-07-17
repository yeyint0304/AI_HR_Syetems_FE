import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendCreateUserPayload } from "@/lib/server/backendPayloadMappers";
import { createUserSchema } from "@/lib/validators/auth.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";

/**
 * POST /api/auth/users
 * [Auth][SystemAdmin] Creates a new user via `Auth/CreateUser`. The
 * SystemAdmin role check is enforced here (server-side, based on the
 * decoded access token) in addition to the `proxy.ts` route-level gate and
 * the page-level check — the backend remains the ultimate authorization
 * boundary and re-validates the role independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to create a user." },
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

  if (currentUser.role !== USER_ROLES.SYSTEM_ADMIN) {
    return NextResponse.json(
      { message: "You do not have permission to create users." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
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
      "/Auth/CreateUser",
      toBackendCreateUserPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json({ data: response.data }, { status: 201 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to create the user. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
