import "server-only";
import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import {
  mapBackendInvoiceStatusChangeResult,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/invoiceResponseMappers";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageInvoices } from "@/lib/constants/invoice.constants";

/**
 * Shared handler for the four no-request-body `PUT /api/invoices/[id]/*`
 * status-transition Route Handlers (`send`, `mark-paid`, `void`, `cancel`),
 * each of which maps 1:1 to a backend `Invoice/*` endpoint documented in
 * `docs/HR_System_BE.postman_collection.json`. Factored out to avoid
 * duplicating the auth/role-check/envelope-handling boilerplate four times
 * (mirrors `lib/server/reportExport.ts`'s shared-helper pattern for the three
 * `Report/*\/export` Route Handlers).
 */
export async function handleInvoiceStatusTransition(
  invoiceId: string,
  backendPath: string,
  unauthenticatedMessage: string,
  forbiddenMessage: string,
  fallbackMessage: string
): Promise<NextResponse> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: unauthenticatedMessage }, { status: 401 });
  }

  const claims = decodeJwt(accessToken);
  const currentUser = claims ? mapClaimsToAuthUser(claims) : null;
  if (!currentUser) {
    return NextResponse.json(
      { message: "Your session is invalid. Please sign in again." },
      { status: 401 }
    );
  }

  if (!canManageInvoices(currentUser.role)) {
    return NextResponse.json({ message: forbiddenMessage }, { status: 403 });
  }

  try {
    const response = await backendApiClient.put(`${backendPath}/${invoiceId}`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(envelope, fallbackMessage, 400);
      return NextResponse.json({ message }, { status });
    }

    const result = mapBackendInvoiceStatusChangeResult(envelope.data);
    if (!result) {
      return NextResponse.json({ message: fallbackMessage }, { status: 502 });
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, fallbackMessage);
    return NextResponse.json({ message }, { status });
  }
}
