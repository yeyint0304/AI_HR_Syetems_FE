import { handleInvoiceStatusTransition } from "@/lib/server/invoiceStatusTransition";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/invoices/[id]/send
 * [Auth][SystemAdmin|ProjectAdmin] Transitions a Draft invoice to `Sent` via
 * `Invoice/SendInvoice`. No request body required.
 */
export async function PUT(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  return handleInvoiceStatusTransition(
    id,
    "/Invoice/SendInvoice",
    "You must be signed in to send this invoice.",
    "You do not have permission to send invoices.",
    "Unable to send the invoice. Please try again."
  );
}
