import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendUpdateInvoicePayload } from "@/lib/server/backendPayloadMappers";
import {
  mapBackendInvoiceDetail,
  mapBackendUpdateInvoiceResult,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/invoiceResponseMappers";
import { updateInvoiceSchema } from "@/lib/validators/invoice.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageInvoices } from "@/lib/constants/invoice.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]
 * [Auth][SystemAdmin|ProjectAdmin] Gets full invoice details (including line
 * items) via `Invoice/GetInvoiceById`. Same role restriction as
 * `GET /api/invoices` — see `lib/constants/invoice.constants.ts`.
 *
 * Per the same pattern as `TimesheetPeriod/GetTimesheetPeriodById`
 * (`app/api/timesheet-periods/[id]/route.ts`), the envelope is inspected
 * explicitly since a logical failure (e.g. "not found") can be signaled with
 * `IsSuccess: false` at HTTP 200, which axios would not treat as a thrown error.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view this invoice." },
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

  if (!canManageInvoices(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to view this invoice." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.get(`/Invoice/GetInvoiceById/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(envelope, "Invoice not found.", 404);
      return NextResponse.json({ message }, { status });
    }

    const invoice = mapBackendInvoiceDetail(envelope.data);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found." }, { status: 404 });
    }

    return NextResponse.json({ data: invoice }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load this invoice.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * PUT /api/invoices/[id]
 * [Auth][SystemAdmin|ProjectAdmin] Updates editable fields on a Draft invoice
 * via `Invoice/UpdateInvoice` (backend rejects updates to non-Draft invoices).
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to update this invoice." },
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

  if (!canManageInvoices(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to update invoices." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateInvoiceSchema.safeParse(body);
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
      `/Invoice/UpdateInvoice/${id}`,
      toBackendUpdateInvoicePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to update the invoice. Only Draft invoices can be updated.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const invoice = mapBackendUpdateInvoiceResult(envelope.data);
    if (!invoice) {
      // Never forward the raw (potentially PascalCase/internal-shaped)
      // backend payload to the client when mapping fails — return a safe,
      // generic error instead (mirrors `app/api/projects/[id]/route.ts`).
      logger.error("Unable to map backend invoice response after update", { id });
      return NextResponse.json(
        { message: "Unable to update the invoice. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: invoice }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to update the invoice. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}

/**
 * DELETE /api/invoices/[id]
 * [Auth][SystemAdmin|ProjectAdmin] Soft-deletes a Draft invoice via
 * `Invoice/DeleteInvoice` (backend rejects deletes of non-Draft invoices).
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to delete this invoice." },
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

  if (!canManageInvoices(currentUser.role)) {
    return NextResponse.json(
      { message: "You do not have permission to delete invoices." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.delete(`/Invoice/DeleteInvoice/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to delete the invoice. Only Draft invoices can be deleted.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to delete the invoice. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
