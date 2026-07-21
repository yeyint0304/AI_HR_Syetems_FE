import { handleInvoiceStatusTransition } from "@/lib/server/invoiceStatusTransition";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/invoices/[id]/void
 * [Auth][SystemAdmin|ProjectAdmin] Voids an invoice regardless of its current
 * status via `Invoice/VoidInvoice`. No request body required.
 */
export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  return handleInvoiceStatusTransition(
    id,
    "/Invoice/VoidInvoice",
    "You must be signed in to void this invoice.",
    "You do not have permission to void invoices.",
    "Unable to void the invoice. Please try again."
  );
}
