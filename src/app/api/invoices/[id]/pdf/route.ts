import axios from "axios";
import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { getAccessToken } from "@/lib/server/authCookies";
import { decodeJwt, mapClaimsToAuthUser } from "@/lib/utils/jwt";
import { canManageInvoices } from "@/lib/constants/invoice.constants";
import { logger } from "@/lib/utils/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/pdf
 * [Auth][SystemAdmin|ProjectAdmin] Downloads the invoice as a PDF via
 * `Invoice/GetInvoicePdf` (`application/pdf`, per
 * `docs/HR_System_BE.postman_collection.json`). Like the `Report/Export*`
 * endpoints (`lib/server/reportExport.ts`), this returns a raw binary body
 * rather than the usual JSON envelope, so it is streamed back to the browser
 * as-is with the correct `Content-Type`/`Content-Disposition` headers.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { message: "You must be signed in to download this invoice." },
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
      { message: "You do not have permission to download this invoice." },
      { status: 403 }
    );
  }

  try {
    const response = await backendApiClient.get<ArrayBuffer>(`/Invoice/GetInvoicePdf/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "arraybuffer",
    });

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${id}.pdf"`,
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 502;
      if (status >= 400 && status < 500) {
        return NextResponse.json({ message: "Invoice PDF not found." }, { status });
      }
      logger.error("Backend invoice PDF request failed", { status, id });
      return NextResponse.json(
        { message: "Unable to download the invoice PDF. Please try again." },
        { status: 502 }
      );
    }

    logger.error("Unexpected error calling backend invoice PDF endpoint", error);
    return NextResponse.json(
      { message: "Unable to download the invoice PDF. Please try again." },
      { status: 500 }
    );
  }
}
