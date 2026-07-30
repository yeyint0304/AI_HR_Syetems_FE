import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { readBackendEnvelope, resolveEnvelopeFailure } from "@/lib/server/backendEnvelope";
import { toBackendResetPasswordPayload } from "@/lib/server/backendPayloadMappers";
import { resetPasswordSchema } from "@/lib/validators/auth.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { USER_ROLES } from "@/lib/constants/auth.constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/auth/users/[id]/reset-password
 * [Auth][SystemAdmin] Resets another user's password via
 * `Auth/ResetPassword/{id}`, backing the "Reset password" action on the
 * `/admin/users` "User Management" table
 * (`components/auth/ResetUserPasswordForm.tsx`). Restricted to SystemAdmin —
 * the same gate `PUT /api/auth/users/[id]` (the sibling "Edit" action) uses
 * — since setting another account's password without knowing its current
 * one is a privileged, admin-only escalation path (unlike self-service
 * `PUT /api/auth/change-password`, which requires the caller's own current
 * password).
 *
 * Like `Auth/UpdateUser`, `Auth/ResetPassword` wraps its response in the
 * standard backend envelope and may signal a logical failure with
 * `IsSuccess: false` at HTTP 200 — inspected explicitly here, matching
 * `app/api/auth/users/[id]/route.ts`'s sibling handler.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to reset this user's password." },
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
      { message: "You do not have permission to reset this user's password." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
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
      `/Auth/ResetPassword/${id}`,
      toBackendResetPasswordPayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to reset this user's password. Please try again.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json(
      { message: envelope.message ?? "Password reset successfully." },
      { status: 200 }
    );
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to reset this user's password. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
