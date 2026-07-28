import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken, getCurrentAuthUser, setUsernameCookie } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendUpdateProfilePayload } from "@/lib/server/backendPayloadMappers";
import { extractUsername } from "@/lib/server/tokenUtils";
import { updateProfileSchema } from "@/lib/validators/auth.validators";

/**
 * PUT /api/auth/profile
 * Requires a valid access-token cookie. Forwards the (re-validated) payload
 * to `Auth/UpdateProfile` with the Bearer token attached server-side.
 *
 * Note: the backend does not reissue a JWT on profile update, so the
 * name/email shown in the JWT-derived header will only refresh on the next
 * sign-in/token refresh. We merge the submitted values into the current
 * claims to return an immediately-accurate DTO to the calling form.
 */
export async function PUT(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update your profile." },
      { status: 401 }
    );
  }

  const currentUser = await getCurrentAuthUser();
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(body);
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
      "/Auth/UpdateProfile",
      toBackendUpdateProfilePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // `Auth/UpdateProfile`'s response body re-confirms `Username` (it never
    // changes here — the form has no username field — but re-caching keeps
    // the cookie fresh); fall back to the already-resolved `currentUser`
    // value if the backend response is ever missing it.
    const resolvedUsername = extractUsername(response.data) ?? currentUser.username;
    if (resolvedUsername) {
      await setUsernameCookie(resolvedUsername);
    }

    const updatedUser = {
      ...currentUser,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      countryId: parsed.data.countryId || null,
      username: resolvedUsername,
    };

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update your profile. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
