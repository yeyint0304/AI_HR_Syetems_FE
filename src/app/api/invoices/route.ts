import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { normalizeBackendError } from "@/lib/server/normalizeBackendError";
import { toBackendGenerateInvoicePayload } from "@/lib/server/backendPayloadMappers";
import {
  mapBackendGenerateInvoiceResult,
  mapBackendInvoiceList,
  readBackendEnvelope,
  resolveEnvelopeFailure,
} from "@/lib/server/invoiceResponseMappers";
import { generateInvoiceSchema, invoiceListQuerySchema } from "@/lib/validators/invoice.validators";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageInvoices } from "@/lib/constants/invoice.constants";

/**
 * GET /api/invoices
 * [Auth][SystemAdmin|ProjectAdmin] Lists invoices via `Invoice/GetAllInvoices`.
 * Restricted to `INVOICE_MANAGER_ROLES` — see `lib/constants/invoice.constants.ts`
 * for the rationale (invoices expose client billing details and per-resource
 * rate amounts, the same class of sensitive financial data the Cost & Revenue
 * report is restricted to).
 */
export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to view invoices." },
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
      { message: "You do not have permission to view invoices." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsedQuery = invoiceListQuerySchema.safeParse({
    projectId: searchParams.get("projectId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    currencyId: searchParams.get("currencyId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsedQuery.success) {
    return NextResponse.json(
      { message: "Invalid filter parameters.", errors: parsedQuery.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const response = await backendApiClient.get("/Invoice/GetAllInvoices", {
      params: parsedQuery.data,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(envelope, "Unable to load invoices.", 502);
      return NextResponse.json({ message }, { status });
    }

    return NextResponse.json({ data: mapBackendInvoiceList(envelope.data) }, { status: 200 });
  } catch (error) {
    const { status, message } = normalizeBackendError(error, "Unable to load invoices. Please try again.");
    return NextResponse.json({ message }, { status });
  }
}

/**
 * POST /api/invoices
 * [Auth][SystemAdmin|ProjectAdmin] Generates a new Draft invoice from
 * approved timesheet entries via `Invoice/GenerateInvoice`. The role check is
 * enforced here (server-side, based on the decoded access token) in addition
 * to the page-level check — the backend remains the ultimate authorization
 * boundary and re-validates independently.
 */
export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to generate an invoice." },
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
      { message: "You do not have permission to generate invoices." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = generateInvoiceSchema.safeParse(body);
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
      "/Invoice/GenerateInvoice",
      toBackendGenerateInvoicePayload(parsed.data),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const envelope = readBackendEnvelope(response.data);
    if (!envelope.isSuccess) {
      const { status, message } = resolveEnvelopeFailure(
        envelope,
        "Unable to generate the invoice. Please check that the project has approved timesheet entries for this billing period.",
        400
      );
      return NextResponse.json({ message }, { status });
    }

    const invoice = mapBackendGenerateInvoiceResult(envelope.data);
    if (!invoice) {
      return NextResponse.json(
        { message: "Unable to generate the invoice. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    const { status, message } = normalizeBackendError(
      error,
      "Unable to generate the invoice. Please try again."
    );
    return NextResponse.json({ message }, { status });
  }
}
