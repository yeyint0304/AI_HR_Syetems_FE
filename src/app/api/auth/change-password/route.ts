import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendChangePasswordPayload } from "@/lib/server/backendPayloadMappers";
import { changePasswordSchema } from "@/lib/validators/auth.validators";

/**
 * PUT /api/auth/change-password
 * Requires a valid access-token cookie. Forwards the (re-validated) payload
 * to `Auth/ChangePassword` with the Bearer token attached server-side.
 */
export async function PUT(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to change your password." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
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
    await backendApiClient.put(
      "/Auth/ChangePassword",
      toBackendChangePasswordPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return NextResponse.json(
      { message: "Your password has been updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to change your password. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
